import numpy as np
import pandas as pd

from app.anomaly import behaviour_features


def make_frame(n=140):
    u = np.full(n, 10.0)
    u[60] = 40.0   # spike
    u[90] = 0.0    # zero-sales day
    s = 2000.0 - np.cumsum(u)          # consistent bookkeeping: stock falls by exactly the units sold
    s[80] -= 300.0                     # one-day count error (recorded too low)
    s[100:] += 500.0                   # a real restock: stays up
    return pd.DataFrame({"date": pd.date_range("2025-01-01", periods=n), "units_sold": u, "stock_on_hand": s})


def test_sales_spike_and_zero_day():
    f = behaviour_features(make_frame())
    assert 3.9 < f.loc[60, "sales_ratio"] < 4.1
    assert f.loc[60, "sales_z"] > 3
    assert f.loc[90, "zero_surprise"] == 1.0
    assert f.loc[40, "zero_surprise"] == 0.0


def test_count_error_is_a_blip_but_a_restock_is_not():
    f = behaviour_features(make_frame())
    assert f.loc[80, "stock_blip"] > 20                     # reverses the next day
    assert f.loc[79, "stock_blip"] == 0 and f.loc[81, "stock_blip"] == 0
    assert f.loc[100, "stock_blip"] == 0                    # a restock does not reverse
    assert f.loc[100, "stock_resid"] > 40
    assert f.loc[50, "stock_resid"] == 0


def test_sales_features_do_not_look_ahead():
    frame = make_frame()
    base = behaviour_features(frame)
    altered = frame.copy()
    altered.loc[71:, "units_sold"] = 9999.0                  # everything after day 70
    after = behaviour_features(altered)
    cols = ["sales_ratio", "sales_z", "zero_surprise"]
    assert np.allclose(base.loc[70, cols].astype(float), after.loc[70, cols].astype(float))


def test_zero_sales_suppressed_when_out_of_stock():
    from app.anomaly import recent_anomalies
    res = recent_anomalies(days=730, limit=2000)
    for a in res["anomalies"]:
        if a["type"] == "zero_sales":
            assert "were in stock" in a["message"]
            assert " 0 units were in stock" not in a["message"]