"""
Demand forecasting (Day 6): direct multi-horizon models on weekly data.

For an origin week o (the last week whose sales are known) and horizon h, features use ONLY
weeks <= o, plus covariates of the target week o+h that are known in advance (promo plan,
calendar, price). The target is units in week o+h divided by the mean of the last 8 weeks.
Training and live inference share make_origin_table(), so there is no train/serve skew.
"""
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor

from app.preprocessing import build_weekly_dataset, holiday_flags

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "forecast_models.joblib"
HORIZONS = (1, 2, 3, 4)
RATIO_CAP = 3.0  # clips spike-polluted ratios

FCOLS = [
    "r0", "r1", "r2", "r3", "r7",            # units at origin, o-1, o-2, o-3, o-7 divided by scale
    "mean4_ratio", "std4_ratio", "cv_8",      # level, volatility
    "log_scale", "promo_days_o",              # product volume, promo days in the origin week
    "price_ratio", "promo_days", "holiday_days",  # target week (known in advance)
    "month", "woy_sin", "woy_cos",            # target week calendar
    "lead_time_days", "category_code",
]

BASE_COLS = ["product_id", "week_start", "week_end", "units", "price", "promo_days",
             "holiday_days", "month", "woy_sin", "woy_cos", "lead_time_days", "category_code"]


def make_origin_table(weekly, h):
    """One row per (product, origin week). Rows with NaN features or target are kept; callers drop them."""
    w = weekly.sort_values(["product_id", "week_start"]).reset_index(drop=True)
    by = w.groupby("product_id")
    units = by["units"]

    mean8 = units.transform(lambda s: s.rolling(8, min_periods=8).mean())
    mean4 = units.transform(lambda s: s.rolling(4, min_periods=4).mean())
    std4 = units.transform(lambda s: s.rolling(4, min_periods=4).std())
    std8 = units.transform(lambda s: s.rolling(8, min_periods=8).std())
    price8 = by["price"].transform(lambda s: s.rolling(8, min_periods=8).mean())
    scale = mean8.clip(lower=1.0)

    out = pd.DataFrame({
        "product_id": w["product_id"],
        "origin_week_start": w["week_start"],
        "target_week_start": w["week_start"] + pd.Timedelta(weeks=h),
    })
    out["target_week_end"] = out["target_week_start"] + pd.Timedelta(days=6)
    out["scale"] = scale
    out["last"] = w["units"]          # naive baseline: last known week
    out["mean4"] = mean4              # moving-average baseline: mean of last 4 known weeks
    out["units"] = units.shift(-h)    # actual demand in the target week
    out["y_ratio"] = out["units"] / scale

    for k in (0, 1, 2, 3, 7):
        out[f"r{k}"] = (units.shift(k) / scale).clip(0, RATIO_CAP)
    out["mean4_ratio"] = (mean4 / scale).clip(0, RATIO_CAP)
    out["std4_ratio"] = (std4 / scale).clip(0, RATIO_CAP)
    out["cv_8"] = (std8 / scale).clip(0, RATIO_CAP)
    out["log_scale"] = np.log1p(scale)
    out["promo_days_o"] = w["promo_days"]

    out["price_ratio"] = by["price"].shift(-h) / price8
    for col in ("promo_days", "holiday_days", "month", "woy_sin", "woy_cos"):
        out[col] = by[col].shift(-h)
    out["lead_time_days"] = w["lead_time_days"]
    out["category_code"] = w["category_code"]
    return out


def split_rows(tbl, split_date):
    """Time-based split on the TARGET week: train targets end before the split, test targets start on/after it."""
    ok = tbl.dropna(subset=FCOLS + ["y_ratio"])
    train = ok[ok["target_week_end"] < split_date]
    test = ok[ok["target_week_start"] >= split_date]
    return train, test


def candidates():
    return {
        "rf": RandomForestRegressor(n_estimators=300, max_depth=6, min_samples_leaf=5,
                                    max_features=0.6, random_state=42, n_jobs=-1),
        "hgb": HistGradientBoostingRegressor(loss="absolute_error", max_depth=3, learning_rate=0.05,
                                             max_iter=250, min_samples_leaf=20, random_state=42),
    }


# ---------------------------------------------------------------- live inference

def extend_with_future(w, promo_days=None, price=None, weeks=max(HORIZONS)):
    """Append future weeks (units unknown) to ONE product's weekly history, with their known-in-advance covariates."""
    w = w[BASE_COLS].sort_values("week_start")
    last = w.iloc[-1]
    price = float(last["price"]) if price is None else float(price)
    promo = list(promo_days or [])
    rows = []
    for k in range(1, weeks + 1):
        start = last["week_start"] + pd.Timedelta(weeks=k)
        mid = start + pd.Timedelta(days=3)
        woy = int(mid.isocalendar()[1])
        rows.append({
            "product_id": last["product_id"], "week_start": start, "week_end": start + pd.Timedelta(days=6),
            "units": np.nan, "price": price,
            "promo_days": float(promo[k - 1]) if k - 1 < len(promo) else 0.0,
            "holiday_days": float(holiday_flags(pd.date_range(start, periods=7, freq="D")).sum()),
            "month": mid.month, "woy_sin": np.sin(2 * np.pi * woy / 52), "woy_cos": np.cos(2 * np.pi * woy / 52),
            "lead_time_days": last["lead_time_days"], "category_code": last["category_code"],
        })
    return pd.concat([w, pd.DataFrame(rows)], ignore_index=True)


def lead_time_demand(weekly_forecasts, days):
    """Demand over `days` days: weekly forecast / 7 per day. Ignores the weekend uplift (a stated limitation)."""
    total, left = 0.0, float(days)
    for f in weekly_forecasts:
        take = min(7.0, left)
        total += f / 7.0 * take
        left -= take
        if left <= 0:
            return total
    return total + left * weekly_forecasts[-1] / 7.0


@lru_cache(maxsize=1)
def load_state():
    bundle = joblib.load(MODEL_PATH)  # FileNotFoundError if the model has not been trained yet
    weekly, _ = build_weekly_dataset()
    return bundle, weekly


def forecast_product(product_id, promo_days=None, price=None, apply_seasonality=True):
    bundle, weekly = load_state()
    w = weekly[weekly["product_id"].astype(str) == str(product_id)]
    if w.empty:
        raise KeyError(product_id)

    tr = None
    if apply_seasonality:
        try:
            from app.trend import trend_for_product
            tr = trend_for_product(product_id)
        except Exception:
            tr = None

    origin = w["week_start"].max()
    peak_in_recent = False
    if apply_seasonality and tr and tr.get("seasonal", False):
        peak_m = tr.get("peak_month")
        if peak_m:
            import calendar
            recent_months = {calendar.month_abbr[(origin - pd.Timedelta(days=k)).month] for k in range(28)}
            peak_in_recent = peak_m in recent_months

    ext = extend_with_future(w, promo_days, price)
    weeks = []
    max_h = max(bundle["models"].keys())
    for h in HORIZONS:
        tbl = make_origin_table(ext, h)
        row = tbl[tbl["origin_week_start"] == origin]
        if row[FCOLS].isna().any(axis=None):
            raise ValueError("Not enough history (need 8+ weeks) to forecast this product")
        model = bundle["models"].get(h, bundle["models"][max_h])
        q10, q90 = bundle["residual_q"].get(h, bundle["residual_q"][max_h])
        ratio = float(model.predict(row[FCOLS])[0])
        scale = float(row["scale"].iloc[0])

        start = origin + pd.Timedelta(weeks=h)
        mid = start + pd.Timedelta(days=3)
        target_month = mid.month

        # Apply monthly seasonal index only when recent 28d window doesn't already cover peak
        season_mult = 1.0
        if apply_seasonality and tr and tr.get("seasonal", False) and not peak_in_recent:
            m_idx = tr.get("monthly_index", [])
            if len(m_idx) >= target_month:
                season_mult = float(m_idx[target_month - 1])

        point = max(ratio * scale * season_mult, 0.0)
        low = min(max((ratio + q10) * scale * season_mult, 0.0), point)
        high = max((ratio + q90) * scale * season_mult, point)
        weeks.append({
            "horizon_week": h,
            "week_start": start.date().isoformat(),
            "week_end": (start + pd.Timedelta(days=6)).date().isoformat(),
            "forecast": round(point, 1), "low": round(low, 1), "high": round(high, 1),
        })

    lead = int(w["lead_time_days"].iloc[0])
    return {
        "product_id": str(product_id),
        "name": str(w["name"].iloc[0]),
        "last_data_week_end": (origin + pd.Timedelta(days=6)).date().isoformat(),
        "weeks": weeks,
        "lead_time_days": lead,
        "lead_time_demand": round(lead_time_demand([x["forecast"] for x in weeks], lead), 1),
        "lead_time_demand_high": round(lead_time_demand([x["high"] for x in weeks], lead), 1),
        "assumptions": {
            "promo_days": list(promo_days or [0] * len(HORIZONS)),
            "price": price if price is not None else "last week's price",
            "seasonality_applied": bool(apply_seasonality and tr and tr.get("seasonal", False)),
        },
        "models": bundle["model_names"],
        "interval": "80% (validation residual quantiles)",
    }