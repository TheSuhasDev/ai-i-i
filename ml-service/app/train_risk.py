"""
Train and evaluate the stockout-risk classifier (Day 7).
Run from ml-service/:  python -m app.train_risk
"""
import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix,
                             precision_score, recall_score, f1_score, roc_auc_score)

from app.preprocessing import DATA_DIR, TRAIN_DAYS
from app.risk import (RFEATS, RISK_MODEL_PATH, VAL_DAYS, all_risks, apply_calibration, build_risk_table,
                      fit_with_calibration, load_bundle, load_series, split_risk_rows)

METRICS_PATH = RISK_MODEL_PATH.with_name("risk_metrics.json")


def prf(y, pred):
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {"precision": round(float(precision_score(y, pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
            "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)}


def main():
    tbl = build_risk_table(load_series())
    split_date = tbl["date"].min() + pd.Timedelta(days=TRAIN_DAYS)
    labeled = tbl.dropna(subset=RFEATS + ["y"]).copy()
    labeled["y"] = labeled["y"].astype(int)
    train, test = split_risk_rows(labeled, split_date)
    y = test["y"].to_numpy()

    print(f"Split date {split_date.date()} | train rows {len(train)} (positive rate {train['y'].mean() * 100:.1f}%) "
          f"| test rows {len(test)} (positive rate {y.mean() * 100:.1f}%)\n")

    # 1) algorithm + calibration + threshold chosen on a validation fold at the end of the training period
    val_start = split_date - pd.Timedelta(days=VAL_DAYS)
    fit = fit_with_calibration(train, val_start)
    thr = fit["threshold"]
    print(f"Validation PR-AUC: { {k: round(v, 3) for k, v in fit['val_scores'].items()} } -> picked {fit['name']}, "
          f"threshold {thr:.3f}\n")

    # 2) one evaluation on the held-out test days
    p = apply_calibration(fit["calibrator"], fit["model"].predict_proba(test[RFEATS])[:, 1])
    model_at_thr = prf(y, (p >= thr).astype(int))
    model_at_half = prf(y, (p >= 0.5).astype(int))
    rule = prf(y, (test["stock_ratio"] < 1.0).astype(int))
    roc, pr_auc, brier = float(roc_auc_score(y, p)), float(average_precision_score(y, p)), float(brier_score_loss(y, p))

    table = pd.DataFrame({
        f"{fit['name']} @ {thr:.2f}": model_at_thr,
        f"{fit['name']} @ 0.50": model_at_half,
        "rule: stock_ratio < 1": rule,
    }).T[["precision", "recall", "f1", "tp", "fp", "fn", "tn"]]
    print("Test results:")
    print(table.to_string())
    print(f"\nROC-AUC {roc:.3f} | PR-AUC {pr_auc:.3f} (a random model scores {y.mean():.3f}) | Brier {brier:.3f}")

    bins = pd.cut(p, [0, .1, .3, .5, .7, .9, 1.0], include_lowest=True)
    cal = (pd.DataFrame({"bin": bins, "p": p, "y": y}).groupby("bin", observed=True)
           .agg(n=("y", "size"), predicted=("p", "mean"), actual=("y", "mean")).round(3))
    print("\nCalibration on test (predicted vs actual stockout rate):")
    print(cal.to_string())

    imp = permutation_importance(fit["model"], test[RFEATS], y, scoring="average_precision",
                                 n_repeats=3, random_state=42)
    importance = dict(sorted(((f, round(float(v), 4)) for f, v in zip(RFEATS, imp.importances_mean)),
                             key=lambda kv: -kv[1]))
    print("\nTop features (permutation importance):")
    for f, v in list(importance.items())[:6]:
        print(f"  {f:16s} {v:.4f}")

    # 3) production model: same algorithm, refit on every labeled day
    prod_val_start = labeled["date"].max() - pd.Timedelta(days=VAL_DAYS)
    prod = fit_with_calibration(labeled, prod_val_start, algo=fit["name"])
    bundle = {"model": prod["model"], "calibrator": prod["calibrator"], "threshold": prod["threshold"],
              "algorithm": fit["name"], "features": RFEATS, "split_date": str(split_date.date()),
              "data_end": str(tbl["date"].max().date()), "trained_at": datetime.now(timezone.utc).isoformat()}
    RISK_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, RISK_MODEL_PATH)

    payload = {
        "generated_at": bundle["trained_at"],
        "label": "stock < lead-time demand (next lead_time days) + 1.65 * std(60d) * sqrt(lead_time)",
        "split_date": bundle["split_date"],
        "validation_days": VAL_DAYS,
        "selected_model": fit["name"],
        "validation_pr_auc": {k: round(v, 4) for k, v in fit["val_scores"].items()},
        "threshold": round(thr, 4),
        "class_weights": "balanced; probabilities calibrated (Platt) on the validation fold",
        "train_positive_rate": round(float(train["y"].mean()), 4),
        "test": {"n": int(len(test)), "positive_rate": round(float(y.mean()), 4),
                 "at_threshold": model_at_thr, "at_0_5": model_at_half,
                 "roc_auc": round(roc, 4), "pr_auc": round(pr_auc, 4), "brier": round(brier, 4)},
        "rule_baseline_stock_ratio_lt_1": rule,
        "calibration_table": cal.reset_index().assign(bin=lambda d: d["bin"].astype(str)).to_dict("records"),
        "feature_importance": importance,
        "notes": "Daily rows of one product are autocorrelated, so the effective sample size is smaller than n.",
    }
    METRICS_PATH.write_text(json.dumps(payload, indent=2))
    print(f"\nSaved {METRICS_PATH.name} and {RISK_MODEL_PATH.name}")

    # 4) sanity check on today's stock: planted scenarios vs predicted risk (labels used for validation only)
    load_bundle.cache_clear()
    live = pd.DataFrame(all_risks())
    scen = pd.read_csv(DATA_DIR / "scenario_labels.csv")[["product_id", "stock_scenario"]]
    live = live.merge(scen, on="product_id")
    print("\nCurrent risk by planted stock scenario (expect reorder high, near mid, over low):")
    print(live.groupby("stock_scenario").agg(products=("product_id", "size"), mean_risk_pct=("risk_pct", "mean"),
                                             flagged=("flagged", "sum")).round(1).to_string())
    print("\nTop 8 current risks:")
    print(live[["product_id", "name", "stock", "risk_pct", "risk_level", "stock_scenario"]].head(8).to_string(index=False))


if __name__ == "__main__":
    main()