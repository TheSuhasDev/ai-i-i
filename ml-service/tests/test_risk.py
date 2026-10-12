import numpy as np
import pandas as pd

from app.risk import ONTIME_PRIOR, RFEATS, product_features, split_risk_rows, stockout_labels, supplier_history


def make_frame(n=200, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({
        "date": pd.date_range("2025-01-01", periods=n, freq="D"),
        "units_sold": rng.integers(5, 25, n).astype(float),
        "stock_on_hand": rng.integers(0, 300, n).astype(float),
        "sup_ontime": 0.9, "sup_delay": 1.0,
    })


def test_label_window_looks_forward():
    units = np.arange(100, dtype=float)
    y, ltd, ss = stockout_labels(units, np.full(100, 1e6), 3)
    assert ltd[10] == 11 + 12 + 13                       # sum of the NEXT 3 days
    assert np.isnan(ltd[-3:]).all() and not np.isnan(ltd[-4])
    assert np.isnan(y[:29]).all()                        # needs 30 days of history for the std
    assert y[50] == 0                                    # huge stock is never at risk


def test_label_threshold():
    units = np.full(100, 10.0)                           # std 0 -> safety stock 0, lead-time demand 30
    y_low, _, _ = stockout_labels(units, np.full(100, 25.0), 3)
    y_ok, _, _ = stockout_labels(units, np.full(100, 35.0), 3)
    assert np.nanmin(y_low) == 1 and np.nanmax(y_ok) == 0


def test_features_do_not_look_ahead():
    f = make_frame()
    base = product_features(f, 5)
    altered = f.copy()
    altered.loc[121:, ["units_sold", "stock_on_hand"]] = 9999.0   # everything after day 120
    after = product_features(altered, 5)
    assert np.allclose(base.loc[120, RFEATS].astype(float), after.loc[120, RFEATS].astype(float))


def test_split_is_purged():
    tbl = pd.DataFrame({"date": pd.date_range("2025-01-01", periods=100), "lead_time_days": 10.0})
    split = pd.Timestamp("2025-03-01")
    train, test = split_risk_rows(tbl, split)
    assert len(train) > 0 and len(test) > 0
    assert (train["date"] + pd.Timedelta(days=10) < split).all()   # label window ends before the split
    assert (test["date"] >= split).all()


def test_supplier_history_uses_only_delivered_pos():
    pos = pd.DataFrame({
        "product_id": ["P001", "P001"], "status": ["Delivered", "Delivered"],
        "actual_delivery_date": pd.to_datetime(["2025-01-10", "2025-03-10"]), "delay_days": [3, 0],
    })
    daily = pd.DataFrame({"product_id": "P001", "date": pd.date_range("2025-01-01", "2025-04-01")})
    res = supplier_history(pos, daily)

    def at(day, col):
        return res.loc[daily["date"] == pd.Timestamp(day), col].iloc[0]

    assert at("2025-01-05", "sup_ontime") == ONTIME_PRIOR   # nothing delivered yet -> prior
    assert at("2025-02-01", "sup_ontime") == 0.0            # one late delivery so far
    assert at("2025-02-01", "sup_delay") == 3.0
    assert at("2025-03-10", "sup_ontime") == 0.5            # the second PO counts from its delivery day