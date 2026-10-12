"""Forecast metrics shared by the baselines (Day 5) and the trained models (Day 6)."""
import numpy as np


def mae(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    return float(np.mean(np.abs(y - p)))


def rmse(y, p):
    y, p = np.asarray(y, float), np.asarray(p, float)
    return float(np.sqrt(np.mean((y - p) ** 2)))


def mape(y, p):
    """Mean absolute percentage error in %, ignoring periods with zero actual demand."""
    y, p = np.asarray(y, float), np.asarray(p, float)
    mask = y > 0
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs(y[mask] - p[mask]) / y[mask]) * 100)


def wape(y, p):
    """Weighted absolute percentage error in %: sum(|error|) / sum(actual)."""
    y, p = np.asarray(y, float), np.asarray(p, float)
    total = y.sum()
    return float(np.abs(y - p).sum() / total * 100) if total > 0 else float("nan")


def summarize(df, pred_col, target="units"):
    """Pooled metrics over all product-weeks, plus the mean of per-product MAPE."""
    per_product = [mape(g[target], g[pred_col]) for _, g in df.groupby("product_id")]
    return {
        "mae": mae(df[target], df[pred_col]),
        "rmse": rmse(df[target], df[pred_col]),
        "mape": mape(df[target], df[pred_col]),
        "wape": wape(df[target], df[pred_col]),
        "mape_by_product_mean": float(np.nanmean(per_product)),
        "n": int(len(df)),
    }