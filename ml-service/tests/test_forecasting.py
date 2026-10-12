import numpy as np
import pandas as pd

from app.forecasting import FCOLS, HORIZONS, extend_with_future, lead_time_demand, make_origin_table
from app.preprocessing import add_features, aggregate_weekly, clean_sales


def make_weekly(days=420):
    frames = []
    for pid, base in (("P001", 3), ("P002", 7)):
        dates = pd.date_range("2025-01-04", periods=days, freq="D")
        frames.append(pd.DataFrame({
            "product_id": pid, "date": dates, "units_sold": (np.arange(days) % 9 + base).astype(int),
            "unit_price": 100.0, "promo_flag": 0,
        }))
    w = aggregate_weekly(clean_sales(pd.concat(frames, ignore_index=True)))
    w["lead_time_days"] = 5
    w["category_code"] = 0
    return add_features(w)


def one_product(w, pid="P001"):
    return w[w["product_id"] == pid].reset_index(drop=True)


def test_origin_features_ignore_target_and_later_weeks():
    p = one_product(make_weekly())
    h, i = 2, 30
    base = make_origin_table(p, h)
    altered = p.copy()
    altered.loc[i + 1:, "units"] = 9999.0  # everything after the origin week
    after = make_origin_table(altered, h)
    assert np.allclose(base.loc[i, FCOLS].astype(float), after.loc[i, FCOLS].astype(float))


def test_products_do_not_leak_into_each_other():
    w = make_weekly()
    both = make_origin_table(w, 1)
    single = make_origin_table(one_product(w), 1)
    a = both[both["product_id"] == "P001"][FCOLS].reset_index(drop=True).astype(float)
    b = single[FCOLS].reset_index(drop=True).astype(float)
    pd.testing.assert_frame_equal(a, b)


def test_target_is_h_weeks_ahead():
    p = one_product(make_weekly())
    i = 25
    for h in HORIZONS:
        t = make_origin_table(p, h)
        assert t.loc[i, "units"] == p.loc[i + h, "units"]
        assert t.loc[i, "target_week_start"] == p.loc[i + h, "week_start"]
        assert np.isclose(t.loc[i, "y_ratio"] * t.loc[i, "scale"], p.loc[i + h, "units"])


def test_inference_features_match_training_features():
    """The live path (history + appended future weeks) must build the same row as the training path."""
    full = one_product(make_weekly())
    n = 40
    ext = extend_with_future(full.iloc[:n])  # defaults: promo 0, last price
    for h in HORIZONS:
        live = make_origin_table(ext, h).loc[n - 1, FCOLS].astype(float)
        train = make_origin_table(full, h).loc[n - 1, FCOLS].astype(float)
        assert np.allclose(live.values, train.values), h


def test_lead_time_demand():
    assert np.isclose(lead_time_demand([70, 70, 70], 7), 70)
    assert np.isclose(lead_time_demand([70, 70, 70], 10), 100)   # 70 + 3 days of week 2
    assert np.isclose(lead_time_demand([70, 70, 70], 24), 240)   # 3 full weeks + 3 days at the last rate