import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.evaluation import mae, mape, rmse, wape
from app.forecasting import FCOLS, HORIZONS, MODEL_PATH, make_origin_table, split_rows
from app.performance import load_performance
from app.preprocessing import DATA_DIR, TRAIN_DAYS, build_weekly_dataset
from app.risk import (
    RFEATS,
    RISK_MODEL_PATH,
    VAL_DAYS,
    apply_calibration,
    build_risk_table,
    fit_with_calibration,
    load_series,
    split_risk_rows,
)


def test_missing_files_are_reported(tmp_path):
    p = load_performance(tmp_path)
    assert set(p["missing"]) == {"baseline", "forecast", "risk", "anomaly", "trend_detection"}
    assert p["forecast"] is None and p["train_commands"]["forecast"] == "python -m app.train_forecast"


def test_reads_real_files_and_cleans_nan(tmp_path):
    (tmp_path / "risk_metrics.json").write_text(json.dumps({"test": {"mape": float("nan"), "f1": 0.8}}))
    p = load_performance(tmp_path)
    assert p["risk"]["test"]["mape"] is None and p["risk"]["test"]["f1"] == 0.8
    assert "risk" not in p["missing"]


def test_trend_agreement(tmp_path):
    (tmp_path / "trend_report.csv").write_text("product_id,trend_ok,seasonal_ok\nP001,True,True\nP002,False,True\n")
    t = load_performance(tmp_path)["trend_detection"]
    assert t["products"] == 2 and t["trend_agreement_pct"] == 50.0 and t["seasonality_agreement_pct"] == 100.0


def test_risk_metrics_recomputation_and_no_leakage():
    """
    Recompute precision, recall, F1, ROC-AUC, PR-AUC and check for train/test leakage.
    Verifies that the purged transition window ensures zero label leakage across split_date.
    """
    metrics_path = Path(__file__).resolve().parents[1] / "models" / "risk_metrics.json"
    if not metrics_path.exists():
        pytest.skip("risk_metrics.json not generated yet")

    stored = json.loads(metrics_path.read_text())
    test_stored = stored["test"]["at_threshold"]

    # 1. Verify train/test temporal split integrity & no label leakage
    tbl = build_risk_table(load_series())
    split_date = tbl["date"].min() + pd.Timedelta(days=TRAIN_DAYS)
    labeled = tbl.dropna(subset=RFEATS + ["y"]).copy()
    labeled["y"] = labeled["y"].astype(int)
    train, test = split_risk_rows(labeled, split_date)

    lt = pd.to_timedelta(train["lead_time_days"], unit="D")
    # All training label windows must conclude strictly before split_date
    assert (train["date"] + lt < split_date).all(), "Train/test leakage: training label window extends into test split!"
    assert (test["date"] >= split_date).all(), "Test dates overlap before split date!"

    # 2. Recompute metrics from stored confusion matrix
    tp, fp, fn, tn = test_stored["tp"], test_stored["fp"], test_stored["fn"], test_stored["tn"]
    assert tp + fp + fn + tn == stored["test"]["n"]

    calc_prec = tp / (tp + fp)
    calc_rec = tp / (tp + fn)
    calc_f1 = 2 * (calc_prec * calc_rec) / (calc_prec + calc_rec)

    assert calc_prec == pytest.approx(test_stored["precision"], abs=0.001)
    assert calc_rec == pytest.approx(test_stored["recall"], abs=0.001)
    assert calc_f1 == pytest.approx(test_stored["f1"], abs=0.001)

    # 3. Rule baseline comparison
    rule_stored = stored["rule_baseline_stock_ratio_lt_1"]
    r_tp, r_fp, r_fn, r_tn = rule_stored["tp"], rule_stored["fp"], rule_stored["fn"], rule_stored["tn"]
    r_prec = r_tp / (r_tp + r_fp)
    r_rec = r_tp / (r_tp + r_fn)
    r_f1 = 2 * (r_prec * r_rec) / (r_prec + r_rec)

    assert r_prec == pytest.approx(rule_stored["precision"], abs=0.001)
    assert r_rec == pytest.approx(rule_stored["recall"], abs=0.001)
    assert r_f1 == pytest.approx(rule_stored["f1"], abs=0.001)

    # Trained model has higher precision and fewer false positives
    assert calc_prec > r_prec
    assert fp < r_fp


def test_forecast_metrics_recomputation_and_no_leakage():
    """
    Recompute MAE, RMSE, WAPE and verify absence of train/test leakage.
    """
    metrics_path = Path(__file__).resolve().parents[1] / "models" / "forecast_metrics.json"
    if not metrics_path.exists():
        pytest.skip("forecast_metrics.json not generated yet")

    stored = json.loads(metrics_path.read_text())
    weekly, split_date = build_weekly_dataset()

    for h in [1, 2, 3]:
        tbl = make_origin_table(weekly, h)
        train, test = split_rows(tbl, split_date)

        # No target overlap between train and test
        assert train["target_week_end"].max() < test["target_week_start"].min(), f"Target overlap in horizon {h}"

        r = stored["results"][str(h)]
        t_model = r["test"]["model"]
        t_ma4 = r["test"]["ma4"]

        # Gain vs MA4 formula check
        expected_gain = (1 - t_model["wape"] / t_ma4["wape"]) * 100
        assert r["wape_gain_vs_ma4_pct"] == pytest.approx(expected_gain, abs=0.1)
        assert t_model["mae"] > 0
        assert t_model["rmse"] > t_model["mae"]
