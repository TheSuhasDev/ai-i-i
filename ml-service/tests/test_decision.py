import numpy as np
import pandas as pd
import pytest

from app.decision import (abc_classify, safety_stock, smart_reorder, supplier_scores, xyz_classify)


def test_safety_stock_matches_day7_label_definition():
    assert safety_stock(10, 4) == pytest.approx(1.65 * 10 * 2)


def test_safety_stock_zero_when_no_variability():
    assert safety_stock(0, 5, mean_daily=20, lt_std_days=0) == 0


def test_safety_stock_grows_with_lead_time_variance():
    assert safety_stock(10, 4, mean_daily=20, lt_std_days=2) > safety_stock(10, 4, mean_daily=20, lt_std_days=0)


def test_reorder_basic():
    r = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40)
    assert r["order_qty"] == 60 and r["needs_reorder"]
    assert r["reorder_point"] == 100.0


def test_reorder_covers_expected_supplier_delay():
    r = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40, avg_delay_days=5)
    assert r["order_qty"] == 160      # 20/day for 10 days = 200, minus 40


def test_reorder_buffer_grows_with_unreliable_supplier():
    r = smart_reorder(forecast_ltd=80, lead_time_days=4, sigma_daily=10, stock=50, reliability=50)
    assert r["order_qty"] == 72       # 80 + 33 * 1.25 = 121.25, minus 50, rounded up
    good = smart_reorder(forecast_ltd=80, lead_time_days=4, sigma_daily=10, stock=50, reliability=100)
    bad = smart_reorder(forecast_ltd=80, lead_time_days=4, sigma_daily=10, stock=50, reliability=0)
    assert good["order_qty"] < r["order_qty"] < bad["order_qty"]


def test_reorder_counts_open_orders():
    base = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40)
    open_po = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40, on_order=60)
    assert base["order_qty"] == 60 and open_po["order_qty"] == 0


def test_open_po_covering_need_has_zero_suggested_qty():
    # Power Bank (P010) scenario: target need ~ 422 units, stock 0, open PO 422
    r = smart_reorder(forecast_ltd=320, lead_time_days=7, sigma_daily=20, stock=0, on_order=422)
    assert r["order_qty"] == 0
    assert r["needs_reorder"] is False


def test_reorder_zero_when_stock_is_enough():
    r = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=3, stock=500)
    assert r["order_qty"] == 0 and not r["needs_reorder"]
    assert smart_reorder(0, 5, 0, 0)["order_qty"] == 0


def test_reorder_rejects_bad_lead_time():
    with pytest.raises(ValueError):
        smart_reorder(100, 0, 1, 10)


def test_abc_split():
    v = pd.Series([80, 15, 4, 1], index=list("abcd"), dtype=float)
    assert abc_classify(v).tolist() == ["A", "B", "C", "C"]
    shuffled = v[["c", "a", "d", "b"]]
    assert abc_classify(shuffled).to_dict() == {"c": "C", "a": "A", "d": "C", "b": "B"}


def test_abc_all_zero_values():
    assert abc_classify(pd.Series([0.0, 0.0])).tolist() == ["C", "C"]


def test_xyz_split():
    assert xyz_classify(pd.Series([0.1, 0.3, 0.9, np.inf])).tolist() == ["X", "Y", "Z", "Z"]


def _pos(supplier, delays, issues, status="Delivered"):
    return pd.DataFrame({"supplier_id": supplier, "status": status, "delay_days": delays, "quality_issue": issues})


def test_supplier_scores_rank_good_above_bad():
    good = _pos("S1", [0] * 40, [False] * 40)
    bad = _pos("S2", [0, 5, 10, 15] * 10, [i % 3 == 0 for i in range(40)])
    s = supplier_scores(pd.concat([good, bad], ignore_index=True))
    assert s.loc["S1", "reliability_score"] > 85 > 40 > s.loc["S2", "reliability_score"]
    assert (s["reliability_score"].between(0, 100)).all()
    assert s.loc["S2", "risk_score"] == pytest.approx(100 - s.loc["S2", "reliability_score"], abs=0.11)
    assert s.loc["S1", "risk_level"] == "Low" and s.loc["S2", "risk_level"] == "High"


def test_supplier_scores_ignore_undelivered():
    good = _pos("S1", [0] * 40, [False] * 40)
    pending = _pos("S1", [99], [True], status="Pending")
    a = supplier_scores(good)
    b = supplier_scores(pd.concat([good, pending], ignore_index=True))
    assert a.loc["S1", "reliability_score"] == b.loc["S1", "reliability_score"]


def test_moq_rounding():
    # If unrounded need is 9 units, minimum order quantity enforces at least 10 units
    r = smart_reorder(forecast_ltd=10, lead_time_days=5, sigma_daily=0, stock=1, moq=10)
    assert r["order_qty"] == 10
    assert r["needs_reorder"] is True