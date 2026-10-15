"""
Model performance report (Day 13). Reads the metric files written by the training scripts;
nothing is typed in by hand. Missing files are reported, with the command that creates them.
"""
import json
import math
from pathlib import Path

import pandas as pd

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
FILES = {
    "baseline": "baseline_metrics.json",
    "forecast": "forecast_metrics.json",
    "risk": "risk_metrics.json",
    "anomaly": "anomaly_metrics.json",
}
TRAIN_COMMANDS = {
    "baseline": "python -m app.baseline",
    "forecast": "python -m app.train_forecast",
    "risk": "python -m app.train_risk",
    "anomaly": "python -m app.anomaly",
    "trend_detection": "python -m app.trend",
}


def _clean(x):
    """NaN / inf are not valid JSON; turn them into null."""
    if isinstance(x, float):
        return x if math.isfinite(x) else None
    if isinstance(x, dict):
        return {k: _clean(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_clean(v) for v in x]
    return x


def _read(path):
    try:
        return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _trend_agreement(path):
    if not Path(path).exists():
        return None
    try:
        df = pd.read_csv(path)
        return {
            "products": int(len(df)),
            "trend_agreement_pct": round(float(df["trend_ok"].astype(bool).mean() * 100), 1),
            "seasonality_agreement_pct": round(float(df["seasonal_ok"].astype(bool).mean() * 100), 1),
            "note": "Detected trend and seasonality compared with the planted ground truth in scenario_labels.csv (validation only).",
        }
    except (KeyError, ValueError):
        return None


def load_performance(models_dir=MODELS_DIR):
    models_dir = Path(models_dir)
    out, missing = {}, []
    for key, fname in FILES.items():
        data = _read(models_dir / fname)
        out[key] = _clean(data) if data is not None else None
        if data is None:
            missing.append(key)
    trend = _trend_agreement(models_dir / "trend_report.csv")
    out["trend_detection"] = trend
    if trend is None:
        missing.append("trend_detection")
    out["missing"] = missing
    out["train_commands"] = TRAIN_COMMANDS
    return out