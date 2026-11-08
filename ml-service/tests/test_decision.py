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
    r = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40, review_period_days=7)
    # daily = 20, lead_time_demand = 100, review_demand = 140, target = 240, stock = 40 => order 200
    assert r["order_qty"] == 200 and r["needs_reorder"]
    assert r["reorder_point"] == 100.0
    assert r["order_up_to_target"] == 240.0


def test_reorder_covers_expected_supplier_delay():
    r = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40, avg_delay_days=5, review_period_days=7)
    # daily = 20, eff_lt = 10 => demand = 200, review_demand = 140, target = 340, stock = 40 => order 300
    assert r["order_qty"] == 300


def test_reorder_buffer_grows_with_unreliable_supplier():
    r = smart_reorder(forecast_ltd=80, lead_time_days=4, sigma_daily=10, stock=50, reliability=50, review_period_days=7, moq=1)
    good = smart_reorder(forecast_ltd=80, lead_time_days=4, sigma_daily=10, stock=50, reliability=100, review_period_days=7, moq=1)
    bad = smart_reorder(forecast_ltd=80, lead_time_days=4, sigma_daily=10, stock=50, reliability=0, review_period_days=7, moq=1)
    assert good["order_qty"] < r["order_qty"] < bad["order_qty"]


def test_reorder_counts_open_orders():
    base = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40, review_period_days=7)
    open_po = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=40, on_order=200, review_period_days=7)
    assert base["order_qty"] == 200 and open_po["order_qty"] == 0


def test_open_po_covering_need_has_zero_suggested_qty():
    # When open PO covers the order-up-to target (e.g. position exceeds target)
    r = smart_reorder(forecast_ltd=320, lead_time_days=7, sigma_daily=20, stock=0, on_order=1000)
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
    r = smart_reorder(forecast_ltd=10, lead_time_days=5, sigma_daily=0, stock=1, moq=10, review_period_days=0)
    assert r["order_qty"] == 10
    assert r["needs_reorder"] is True
    # If unrounded need is 13 units and moq is 10, rounds up to 20
    r2 = smart_reorder(forecast_ltd=20, lead_time_days=5, sigma_daily=0, stock=7, moq=10, review_period_days=0)
    assert r2["order_qty"] == 20


def test_hysteresis_trigger():
    # ROP = 100. 10% hysteresis threshold = 110.
    # Stock 105 <= 110 -> triggers reorder
    r_trigger = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=105, review_period_days=7)
    assert r_trigger["needs_reorder"] is True
    assert r_trigger["order_qty"] > 0

    # Stock 115 > 110 -> does NOT trigger reorder
    r_no_trigger = smart_reorder(forecast_ltd=100, lead_time_days=5, sigma_daily=0, stock=115, review_period_days=7)
    assert r_no_trigger["needs_reorder"] is False
    assert r_no_trigger["order_qty"] == 0


def test_supplier_scores_ignores_short_lead_time_pos():
    # PO delivered in 0 days (e.g. instant or manual) should be ignored
    short_po = pd.DataFrame([{
        "supplier_id": "S1", "status": "Delivered", "delay_days": 10, "quality_issue": False,
        "order_date": "2026-11-01", "actual_delivery_date": "2026-11-01"  # 0 days
    }])
    normal_pos = pd.DataFrame([{
        "supplier_id": "S1", "status": "Delivered", "delay_days": 0, "quality_issue": False,
        "order_date": "2026-10-01", "actual_delivery_date": "2026-10-08"  # 7 days
    }] * 10)
    combined = pd.concat([normal_pos, short_po], ignore_index=True)
    res = supplier_scores(combined)
    # The short PO was filtered out, so delivered_pos is 10 and avg_delay_days is 0
    assert res.loc["S1", "delivered_pos"] == 10
    assert res.loc["S1", "avg_delay_days"] == 0.0


def test_p010_reorder_recommendation_positive():
    from app.decision import get_demand_rate
    # P010 under peak season demand rate without double counting (approx 80 u/day) with stock 490 and on_order 8
    # Inventory position is 498, expected order ~ 500-700 units
    d_rate = get_demand_rate("P010")
    assert 75.0 <= d_rate <= 105.0
    res = smart_reorder(forecast_ltd=d_rate * 7, lead_time_days=7, sigma_daily=17.0,
                        stock=490, on_order=8, reliability=97.0, demand_rate=d_rate)
    assert res["needs_reorder"] is True
    assert 500 <= res["order_qty"] <= 750


def test_hysteresis_and_low_margin_reorder_recommendations():
    # Products P001, P002, P037 with risk >= 30% and low margin (< 3d) must get reorder recommendations
    from app.insights import insights_for_product
    for pid in ["P001", "P002", "P037"]:
        r = insights_for_product(pid)
        assert r["reorder"]["needs_reorder"] is True
        assert r["reorder"]["order_qty"] > 0