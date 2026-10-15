import json

from app.performance import load_performance


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