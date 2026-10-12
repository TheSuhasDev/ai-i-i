import numpy as np
import pandas as pd

from app.evaluation import mae, mape, rmse, wape
from app.preprocessing import FEATURE_COLS, add_features, aggregate_weekly, clean_sales, time_split


def make_sales(start="2025-01-04", days=420, pid="P001"):
    """One product, a Saturday start so the first and last weeks are partial."""
    dates = pd.date_range(start, periods=days, freq="D")
    units = (np.arange(days) % 9 + 3).astype(int)
    return pd.DataFrame({
        "product_id": pid, "date": dates, "units_sold": units,
        "unit_price": 100.0, "promo_flag": 0,
    })


def build(sales):
    w = aggregate_weekly(clean_sales(sales))
    w["lead_time_days"] = 5
    w["category_code"] = 0
    return add_features(w)


def test_partial_weeks_are_dropped():
    w = aggregate_weekly(clean_sales(make_sales()))
    assert (w["week_start"].dt.dayofweek == 0).all()          # every week starts on Monday
    assert w["week_start"].min() == pd.Timestamp("2025-01-06")  # the partial Sat-Sun week is gone


def test_weekly_totals_match_daily_sum():
    sales = make_sales()
    w = aggregate_weekly(clean_sales(sales))
    first = w.iloc[0]
    mask = (sales["date"] >= first["week_start"]) & (sales["date"] <= first["week_end"])
    assert first["units"] == sales.loc[mask, "units_sold"].sum()


def test_lags_use_only_past_weeks():
    w = build(make_sales())
    assert (w["lag_1"].iloc[1:].values == w["units"].iloc[:-1].values).all()
    assert (w["lag_4"].iloc[4:].values == w["units"].iloc[:-4].values).all()


def test_rolling_features_exclude_current_week():
    w = build(make_sales())
    i = 10
    expected = w["units"].iloc[i - 4:i].mean()  # the 4 weeks BEFORE week i
    assert np.isclose(w["roll_mean_4"].iloc[i], expected)


def test_changing_current_week_does_not_change_its_features():
    sales = make_sales()
    base = build(sales)
    i = 20
    week = base.iloc[i]
    altered = sales.copy()
    mask = (altered["date"] >= week["week_start"]) & (altered["date"] <= week["week_end"])
    altered.loc[mask, "units_sold"] = 9999
    after = build(altered)
    cols = ["lag_1", "lag_2", "lag_4", "lag_8", "roll_mean_4", "roll_mean_8", "roll_std_4"]
    assert np.allclose(base.loc[i, cols].astype(float), after.loc[i, cols].astype(float))


def test_time_split_has_no_overlap():
    w = build(make_sales())
    split_date = pd.Timestamp("2025-10-06")  # a Monday
    train, test = time_split(w, split_date)
    assert len(train) > 0 and len(test) > 0
    assert train["week_end"].max() < split_date
    assert test["week_start"].min() >= split_date


def test_all_feature_columns_exist():
    w = build(make_sales())
    assert set(FEATURE_COLS).issubset(w.columns)


def test_metrics():
    y = np.array([10, 0, 20])
    p = np.array([12, 5, 10])
    assert np.isclose(mae(y, p), (2 + 5 + 10) / 3)
    assert np.isclose(rmse(y, p), np.sqrt((4 + 25 + 100) / 3))
    assert np.isclose(mape(y, p), np.mean([2 / 10, 10 / 20]) * 100)  # the zero-actual week is ignored
    assert np.isclose(wape(y, p), 17 / 30 * 100)