import math
import pytest
from app.alert_config import (
    evaluate_cover_margin,
    cover_margin_priority,
    evaluate_reorder_severity,
    calculate_order_up_to_qty,
    PRIORITY_RANK,
)
from app.health import alert_priority, classify_cover_margin
from app.insights import insights_for_product, all_insights, insight_sort_key, compute_kpi


TEST_SKUS = ["P010", "P011", "P016", "P040", "P002", "P008", "P031"]


def test_margin_consistency_for_target_skus():
    """
    Assert margin consistency across all target SKUs:
    displayed margin must equal displayed cover minus displayed lead time.
    Specifically checks known mismatches: P040, P002, P008, P031.
    """
    for sku in TEST_SKUS:
        data = insights_for_product(sku)
        stockout = data["stockout"]
        cover = stockout["days_of_cover"]
        lead_time = stockout["days_to_delivery"]
        margin = stockout["margin_days"]

        # Ensure cover and lead time are rounded to 1 decimal
        assert cover == round(cover, 1), f"Cover {cover} not rounded to 1 decimal for {sku}"
        if lead_time is not None:
            assert lead_time == round(lead_time, 1), f"Lead time {lead_time} not rounded to 1 decimal for {sku}"
            assert margin == round(cover - lead_time, 1), (
                f"Margin mismatch for {sku}: cover={cover}, lead_time={lead_time}, "
                f"margin={margin}, expected={round(cover - lead_time, 1)}"
            )

        # Check in alert messages as well
        for a in data["alerts"]:
            if a["type"] in ("stockout_before_delivery", "tight_cover_margin", "low_cover_margin"):
                assert "about" not in a["message"], f"Message for {sku} contains 'about': {a['message']}"


def test_unified_reorder_quantity_formula():
    """
    Assert all target SKUs use the unified order-up-to formula:
    target = dailyDemand * (leadTime + reviewPeriod) + safetyStock
    qty = ceil(max(0, target - inventoryPosition)), rounded up to MOQ.
    """
    for sku in TEST_SKUS:
        data = insights_for_product(sku)
        reorder = data["reorder"]

        demand_rate = data["stockout"]["demand_rate"]
        eff_lt = reorder["effective_lead_time_days"]
        ss = reorder["safety_stock"]
        pos = reorder["inventory_position"]
        target = reorder["order_up_to_target"]

        # target = demand_over_lead_time + safety_stock + review_period_demand
        expected_target = round(reorder["demand_over_lead_time"] + ss + reorder["review_period_demand"], 1)
        assert round(abs(target - expected_target), 2) <= 0.1, (
            f"Target mismatch for {sku}: {target} vs expected {expected_target}"
        )

        raw_qty = max(0, math.ceil(target - pos - 1e-9))
        expected_qty = math.ceil(raw_qty / 10) * 10 if raw_qty > 0 else 0
        if reorder["needs_reorder"]:
            assert reorder["order_qty"] == expected_qty, (
                f"Order qty mismatch for {sku}: {reorder['order_qty']} vs expected {expected_qty}"
            )
        else:
            assert reorder["order_qty"] == 0


def test_shortfall_reorder_severity():
    """
    Assert reorder severity scales with shortfall % = (ROP - position) / ROP:
    >= 40% -> High
    15% - 40% -> Medium
    < 15% -> Low
    """
    assert evaluate_reorder_severity(100.0, 50.0) == "High"     # 50% shortfall
    assert evaluate_reorder_severity(100.0, 60.0) == "High"     # 40% shortfall
    assert evaluate_reorder_severity(100.0, 70.0) == "Medium"   # 30% shortfall
    assert evaluate_reorder_severity(100.0, 85.0) == "Medium"   # 15% shortfall
    assert evaluate_reorder_severity(100.0, 90.0) == "Low"      # 10% shortfall
    assert evaluate_reorder_severity(100.0, 110.0) == "Low"     # 0% shortfall


def test_stockout_before_delivery_action():
    """
    Assert stockout_before_delivery alerts include recommended actions
    and sized emergency order quantity.
    """
    for sku in ["P010", "P011"]:
        data = insights_for_product(sku)
        sbd_alerts = [a for a in data["alerts"] if a["type"] == "stockout_before_delivery"]
        if sbd_alerts:
            a = sbd_alerts[0]
            assert a["priority"] == "Critical"
            assert "recommended_action" in a
            assert "emergency_order_qty" in a
            assert a["emergency_order_qty"] > 0
            assert "Expedite" in a["recommended_action"]


def test_sorted_order_urgency():
    """
    Assert insights are sorted:
    1. Severity tier: Critical before High before Medium before Low
    2. Urgency within tier: smallest margin / largest days-short first
    3. Overstock by days of cover descending
    """
    insights = all_insights()
    prio_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}

    for i in range(len(insights) - 1):
        item_a = insights[i]
        item_b = insights[i + 1]

        pA = prio_order[item_a["priority"]]
        pB = prio_order[item_b["priority"]]
        assert pA <= pB, f"Priority violated: {item_a['product_id']} ({item_a['priority']}) vs {item_b['product_id']} ({item_b['priority']})"

        # If same priority:
        if pA == pB:
            alerts_a = item_a.get("alerts", [])
            alerts_b = item_b.get("alerts", [])
            types_a = {a["type"] for a in alerts_a}
            types_b = {a["type"] for a in alerts_b}
            is_overstock_a = "overstock" in types_a and not any("margin" in t or "stockout" in t for t in types_a)
            is_overstock_b = "overstock" in types_b and not any("margin" in t or "stockout" in t for t in types_b)

            if is_overstock_a and is_overstock_b:
                cov_a = item_a["stockout"]["days_of_cover"] or 0
                cov_b = item_b["stockout"]["days_of_cover"] or 0
                assert cov_a >= cov_b, f"Overstock sort violated: {item_a['product_id']} ({cov_a}) < {item_b['product_id']} ({cov_b})"
            elif not is_overstock_a and not is_overstock_b:
                mar_a = item_a["stockout"]["margin_days"] if item_a["stockout"]["margin_days"] is not None else 999
                mar_b = item_b["stockout"]["margin_days"] if item_b["stockout"]["margin_days"] is not None else 999
                assert mar_a <= mar_b, f"Margin urgency violated: {item_a['product_id']} ({mar_a}) > {item_b['product_id']} ({mar_b})"


def test_cover_margin_priority_and_p034():
    """
    Assert cover margin priority function across required margins:
    -5.6 -> Critical, stockout_before_delivery
    -0.8 -> Critical, stockout_before_delivery
    0.0 -> High, tight_cover_margin
    1.96 -> High, tight_cover_margin
    2.8 -> High, tight_cover_margin
    3.2 -> High, tight_cover_margin (e.g. P005)
    4.99 -> High, tight_cover_margin
    5.0 -> Medium, low_cover_margin
    5.2 -> Medium, low_cover_margin (e.g. P024)
    6.4 -> Medium, low_cover_margin (e.g. P034)
    9.9 -> Medium, low_cover_margin (e.g. P023)
    10.6 -> Medium, low_cover_margin (e.g. P015)
    14.9 -> Medium, low_cover_margin (e.g. P017)
    15.0 -> Low, no alert
    15.6 -> Low, no alert (e.g. P021)
    28.9 -> Low, no alert (e.g. P027)
    """
    test_cases = [
        (-5.6, "Critical", "stockout_before_delivery"),
        (-0.8, "Critical", "stockout_before_delivery"),
        (0.0, "High", "tight_cover_margin"),
        (1.96, "High", "tight_cover_margin"),
        (2.8, "High", "tight_cover_margin"),
        (3.2, "High", "tight_cover_margin"),
        (4.99, "High", "tight_cover_margin"),
        (5.0, "Medium", "low_cover_margin"),
        (5.2, "Medium", "low_cover_margin"),
        (6.4, "Medium", "low_cover_margin"),
        (9.9, "Medium", "low_cover_margin"),
        (10.6, "Medium", "low_cover_margin"),
        (14.9, "Medium", "low_cover_margin"),
        (15.0, "Low", None),
        (15.6, "Low", None),
        (28.9, "Low", None),
    ]
    for margin, expected_prio, expected_type in test_cases:
        prio, alert_t, phrase = alert_priority(margin, return_meta=True)
        assert prio == expected_prio, f"Margin {margin}: got priority {prio}, expected {expected_prio}"
        assert alert_t == expected_type, f"Margin {margin}: got type {alert_t}, expected {expected_type}"
        if alert_t == "tight_cover_margin":
            assert phrase == "tight margin of"
            assert 0 <= margin < 5, f"tight_cover_margin outside [0, 5): margin={margin}"
        elif alert_t == "low_cover_margin":
            assert phrase == "margin"
            assert 5 <= margin < 15, f"low_cover_margin outside [5, 15): margin={margin}"
        elif expected_type is None:
            assert prio == "Low" and alert_t is None, f"Expected no alert for margin={margin}"

    # Verify target SKU behavior in all_insights
    insights = all_insights()
    for item in insights:
        for a in item.get("alerts", []):
            if a["type"] == "low_cover_margin":
                m = item["stockout"]["margin_days"]
                assert m is not None and 5 <= m < 15, f"{item['product_id']} low_cover_margin has invalid margin {m}"
            elif a["type"] == "tight_cover_margin":
                m = item["stockout"]["margin_days"]
                assert m is not None and 0 <= m < 5, f"{item['product_id']} tight_cover_margin has invalid margin {m}"


def test_kpi_summary_distinct_product_counts():
    """
    Assert summary counts come from distinct product_ids per priority.
    A product with both Critical and High alerts (e.g. P040) must be counted in both cards.
    Sum of alerts across 4 cards must equal total alerts.
    """
    mock_data = [
        {
            "product_id": "P040",
            "priority": "Critical",
            "alerts": [
                {"priority": "Critical", "type": "stockout_before_delivery"},
                {"priority": "High", "type": "reorder_now"},
                {"priority": "Medium", "type": "low_cover_margin"},
            ],
        },
        {
            "product_id": "P001",
            "priority": "High",
            "alerts": [
                {"priority": "High", "type": "tight_cover_margin"},
            ],
        },
        {
            "product_id": "P005",
            "priority": "Medium",
            "alerts": [
                {"priority": "Medium", "type": "low_cover_margin"},
            ],
        },
    ]
    kpi = compute_kpi(mock_data)

    # Alerts count
    assert kpi["critical"]["alerts"] == 1
    assert kpi["high"]["alerts"] == 2
    assert kpi["medium"]["alerts"] == 2
    assert kpi["low"]["alerts"] == 0
    assert kpi["total_alerts"] == 5

    # Products count: distinct product_ids per priority
    assert kpi["critical"]["products"] == 1  # P040
    assert kpi["high"]["products"] == 2      # P040 and P001
    assert kpi["medium"]["products"] == 2    # P040 and P005
    assert kpi["low"]["products"] == 0
    assert kpi["total_products"] == 3

    # Invariants
    total_alerts_sum = sum(kpi[p]["alerts"] for p in ["critical", "high", "medium", "low"])
    assert total_alerts_sum == kpi["total_alerts"]

    # Verify on live generated insights
    real_insights = all_insights()
    real_kpi = compute_kpi(real_insights)
    assert sum(real_kpi[p]["alerts"] for p in ["critical", "high", "medium", "low"]) == real_kpi["total_alerts"]

    # P040 has both Critical and High alerts in real insights
    p040 = next(x for x in real_insights if x["product_id"] == "P040")
    p040_prios = {a["priority"].lower() for a in p040["alerts"]}
    assert "critical" in p040_prios
    assert "high" in p040_prios


def test_classify_cover_margin_values_and_boundaries():
    cases = [
        (-5.6, "Critical", "stockout_before_delivery", 5.6),
        (-0.8, "Critical", "stockout_before_delivery", 0.8),
        (0.0, "High", "tight_cover_margin", 0.0),
        (1.96, "High", "tight_cover_margin", 0.0),
        (2.8, "High", "tight_cover_margin", 0.0),
        (3.2, "High", "tight_cover_margin", 0.0),
        (4.99, "High", "tight_cover_margin", 0.0),
        (5.0, "Medium", "low_cover_margin", 0.0),
        (5.2, "Medium", "low_cover_margin", 0.0),
        (6.4, "Medium", "low_cover_margin", 0.0),
        (9.9, "Medium", "low_cover_margin", 0.0),
        (10.6, "Medium", "low_cover_margin", 0.0),
        (14.9, "Medium", "low_cover_margin", 0.0),
        (15.0, "Low", None, 0.0),
        (15.6, "Low", None, 0.0),
        (28.9, "Low", None, 0.0),
    ]
    for raw_val, exp_prio, exp_type, exp_shortfall in cases:
        res = classify_cover_margin(raw_val, 0.0)
        assert res["priority"] == exp_prio, f"Failed for {raw_val}: expected {exp_prio}, got {res['priority']}"
        assert res["alert_type"] == exp_type, f"Failed for {raw_val}: expected {exp_type}, got {res['alert_type']}"
        assert res["shortfall_days"] == exp_shortfall, f"Shortfall failed for {raw_val}: expected {exp_shortfall}, got {res['shortfall_days']}"

    # Strict boundary check on unrounded margin
    # e.g. cover=10.0, delivery=10.04 -> raw diff = -0.04 -> Critical (not rounded to 0.0 High)
    res_neg_small = classify_cover_margin(10.0, 10.04)
    assert res_neg_small["priority"] == "Critical"
    assert res_neg_small["alert_type"] == "stockout_before_delivery"

    # 4.999 -> High, 5.0 -> Medium, 14.999 -> Medium, 15.0 -> Low
    assert classify_cover_margin(4.999, 0.0)["priority"] == "High"
    assert classify_cover_margin(5.0, 0.0)["priority"] == "Medium"
    assert classify_cover_margin(14.999, 0.0)["priority"] == "Medium"
    assert classify_cover_margin(15.0, 0.0)["priority"] == "Low"


def test_cover_margin_monotonicity():
    margins = [-10.0, -5.6, -0.8, -0.04, 0.0, 0.1, 1.96, 2.8, 3.2, 4.99, 5.0, 5.2, 6.4, 9.9, 10.6, 14.9, 15.0, 15.6, 28.9]
    ranks = [PRIORITY_RANK[classify_cover_margin(m, 0.0)["priority"]] for m in margins]
    # Ranks must be non-decreasing as margin increases (0=Critical, 1=High, 2=Medium, 3=Low)
    for i in range(len(ranks) - 1):
        assert ranks[i] <= ranks[i + 1], f"Monotonicity violation between {margins[i]} (rank {ranks[i]}) and {margins[i+1]} (rank {ranks[i+1]})"


def test_cover_margin_invariants_across_all_insights():
    insights = all_insights()
    for item in insights:
        stockout = item["stockout"]
        m = stockout["margin_days"]
        for a in item.get("alerts", []):
            if a["type"] == "stockout_before_delivery":
                assert m is not None and m < 0, f"{item['product_id']} stockout_before_delivery has margin {m} >= 0"
                assert a["priority"] == "Critical"
            elif a["type"] == "tight_cover_margin":
                assert m is not None and 0 <= m < 5, f"{item['product_id']} tight_cover_margin has margin {m} not in [0, 5)"
                assert a["priority"] == "High"
            elif a["type"] == "low_cover_margin":
                assert m is not None and 5 <= m < 15, f"{item['product_id']} low_cover_margin has margin {m} not in [5, 15)"
                assert a["priority"] == "Medium"

