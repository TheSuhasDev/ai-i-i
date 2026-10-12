"""
Data preparation for the demand-forecasting models (Day 5).

Pipeline: load CSVs -> clean -> aggregate to weekly demand -> feature engineering -> time-based split.
Weeks run Monday-Sunday (pandas 'W-SUN'). Partial weeks are dropped.

Leakage rule: lag and rolling features use ONLY data from before the target week.
Promo days, holiday days, price and lead time describe the target week itself, which is
fine because they are known in advance (planned promotions, calendar, list price).
The is_anomaly and scenario_labels columns are never used.
"""
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
TRAIN_DAYS = 548  # first 18 months train, last 6 months test

LAGS = [1, 2, 3, 4, 8]
FEATURE_COLS = [
    "lag_1", "lag_2", "lag_3", "lag_4", "lag_8",
    "roll_mean_4", "roll_mean_8", "roll_std_4", "roll_std_8",
    "growth_4_8", "cv_8",
    "price", "promo_days", "holiday_days",
    "month", "woy_sin", "woy_cos",
    "lead_time_days", "category_code",
]
TARGET = "units"

# Approximate Indian holidays/festivals (the synthetic data only has month-level seasonality).
FIXED_HOLIDAYS = [(1, 26), (8, 15), (10, 2), (12, 25)]  # Republic Day, Independence Day, Gandhi Jayanti, Christmas
DIWALI_DATES = pd.to_datetime(["2024-11-01", "2025-10-20", "2026-11-08"])


def load_raw(data_dir=DATA_DIR):
    data_dir = Path(data_dir)
    sales = pd.read_csv(data_dir / "sales.csv", parse_dates=["date"])
    products = pd.read_csv(data_dir / "products.csv")
    return sales, products


def clean_sales(sales):
    """Drop duplicates and negatives, fill missing calendar days with zero sales.

    Spikes and zero-sales days are deliberately NOT removed: they are the planted
    anomalies Isolation Forest must find on Day 11.
    """
    df = sales[["product_id", "date", "units_sold", "unit_price", "promo_flag"]].copy()
    df = df.drop_duplicates(["product_id", "date"], keep="last")
    df["units_sold"] = df["units_sold"].clip(lower=0)

    full = pd.date_range(df["date"].min(), df["date"].max(), freq="D")
    parts = []
    for pid, g in df.groupby("product_id"):
        g = g.set_index("date").reindex(full)
        g["product_id"] = pid
        g["units_sold"] = g["units_sold"].fillna(0)
        g["unit_price"] = g["unit_price"].ffill().bfill()
        g["promo_flag"] = g["promo_flag"].fillna(0)
        parts.append(g.rename_axis("date").reset_index())
    return pd.concat(parts, ignore_index=True)


def holiday_flags(dates):
    dates = pd.DatetimeIndex(dates)
    flag = np.zeros(len(dates), dtype=bool)
    for month, day in FIXED_HOLIDAYS:
        flag |= (dates.month == month) & (dates.day == day)
    for d in DIWALI_DATES:
        flag |= (dates >= d - pd.Timedelta(days=3)) & (dates <= d + pd.Timedelta(days=2))
    return flag.astype(int)


def aggregate_weekly(clean):
    """Daily rows -> one row per product per complete Monday-Sunday week."""
    df = clean.copy()
    df["holiday"] = holiday_flags(df["date"])
    weekly = (
        df.set_index("date")
        .groupby("product_id")
        .resample("W-SUN")
        .agg(
            units=("units_sold", "sum"),
            price=("unit_price", "mean"),
            promo_days=("promo_flag", "sum"),
            holiday_days=("holiday", "sum"),
            n_days=("units_sold", "size"),
        )
        .reset_index()
        .rename(columns={"date": "week_end"})
    )
    weekly = weekly[weekly["n_days"] == 7].drop(columns="n_days")  # drop partial first/last weeks
    weekly["week_start"] = weekly["week_end"] - pd.Timedelta(days=6)
    return weekly.sort_values(["product_id", "week_start"]).reset_index(drop=True)


def add_features(weekly):
    """Lag, rolling, calendar and ratio features. Lags/rolls only look backwards."""
    w = weekly.sort_values(["product_id", "week_start"]).copy()
    g = w.groupby("product_id")["units"]

    for lag in LAGS:
        w[f"lag_{lag}"] = g.shift(lag)
    w["lag_52"] = g.shift(52)  # used only by the seasonal-naive baseline, not a model feature

    prev = g.shift(1)  # everything below is built from the previous weeks only
    by_product = w["product_id"]
    for win in (4, 8):
        w[f"roll_mean_{win}"] = prev.groupby(by_product).transform(lambda s, k=win: s.rolling(k, min_periods=k).mean())
        w[f"roll_std_{win}"] = prev.groupby(by_product).transform(lambda s, k=win: s.rolling(k, min_periods=k).std())

    w["growth_4_8"] = (w["roll_mean_4"] / w["roll_mean_8"].replace(0, np.nan)).replace([np.inf, -np.inf], np.nan).fillna(1.0)
    w["cv_8"] = (w["roll_std_8"] / w["roll_mean_8"].replace(0, np.nan)).replace([np.inf, -np.inf], np.nan).fillna(0.0)

    mid_week = w["week_start"] + pd.Timedelta(days=3)
    w["month"] = mid_week.dt.month
    woy = mid_week.dt.isocalendar().week.astype(int)
    w["woy_sin"] = np.sin(2 * np.pi * woy / 52)
    w["woy_cos"] = np.cos(2 * np.pi * woy / 52)
    return w.reset_index(drop=True)


def build_weekly_dataset(data_dir=DATA_DIR):
    """Return (weekly feature table, split_date)."""
    sales, products = load_raw(data_dir)
    first_date = sales["date"].min()

    weekly = aggregate_weekly(clean_sales(sales))
    weekly = weekly.merge(products[["product_id", "name", "category", "lead_time_days"]], on="product_id", how="left")
    weekly = add_features(weekly)
    weekly["category_code"] = weekly["category"].astype("category").cat.codes

    split_date = first_date + pd.Timedelta(days=TRAIN_DAYS)
    return weekly, split_date


def time_split(weekly, split_date):
    """Time-based split: weeks ending before split_date train, weeks starting on/after it test. Never random."""
    train = weekly[weekly["week_end"] < split_date].copy()
    test = weekly[weekly["week_start"] >= split_date].copy()
    return train, test


def model_ready(df):
    """Rows with every feature available (drops the first weeks that lack lag_8 / roll_8)."""
    return df.dropna(subset=FEATURE_COLS + [TARGET])