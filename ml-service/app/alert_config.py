"""
alert_config.py - Centralized configuration and rules for inventory alerts.
All thresholds, review periods, buffer ratios, and shortfall cuts are documented and maintained here.
"""

import math
from app.health import COVER_MARGIN_THRESHOLDS, alert_priority, classify_cover_margin

# Replenishment review period (in days)
REVIEW_PERIOD_DAYS = 7

# Hysteresis factor for reorder triggering (10% buffer so orders don't toggle at ±2 units)
HYSTERESIS_FACTOR = 1.10

# Overstock threshold: days of cover beyond which stock is deemed excess
OVERSTOCK_DAYS = 90.0

# Shortfall % = (ROP - position) / ROP for Reorder Now severity
# Shortfall is the fraction of reorder point that is currently missing
SHORTFALL_HIGH_CUT = 0.40  # >= 40% shortfall -> High severity
SHORTFALL_MED_CUT = 0.15   # 15% - 40% shortfall -> Medium severity
# < 15% shortfall -> Low severity

# Priority ranking for severity comparison (lower number = higher priority)
PRIORITY_RANK = {
    "Critical": 0,
    "High": 1,
    "Medium": 2,
    "Low": 3,
}


def cover_margin_priority(margin_days, cover_days=None):
    """
    Delegates to alert_priority in app.health (single source of truth).
    Returns: (priority, alert_type)
    """
    prio, alert_t, _ = alert_priority(margin_days, cover_days=cover_days, return_meta=True)
    return prio, alert_t


def evaluate_cover_margin(cover_days=None, lead_time_days=None, margin_days=None, safety_stock_days=None):
    """
    Convenience wrapper delegating to alert_priority in app.health.
    """
    if lead_time_days is not None and cover_days is not None:
        res = classify_cover_margin(cover_days, lead_time_days)
        return res["priority"], res["alert_type"]
    if lead_time_days is None and margin_days is None and cover_days is not None:
        margin_days = cover_days
    elif margin_days is None and cover_days is not None and lead_time_days is not None:
        margin_days = float(cover_days) - float(lead_time_days)

    prio, alert_t, _ = alert_priority(margin_days, return_meta=True)
    return prio, alert_t


def evaluate_reorder_severity(reorder_point, inventory_position):
    """
    Reorder Now severity scales with shortfall % = (ROP - position) / ROP:
    >= 40% -> High
    15% - 40% -> Medium
    < 15% -> Low
    """
    if reorder_point <= 0:
        return "Low"
    shortfall = reorder_point - inventory_position
    shortfall_pct = shortfall / reorder_point
    if shortfall_pct >= SHORTFALL_HIGH_CUT:
        return "High"
    elif shortfall_pct >= SHORTFALL_MED_CUT:
        return "Medium"
    else:
        return "Low"


def calculate_order_up_to_qty(daily_demand, lead_time, review_period, safety_stock, inventory_position, moq=10):
    """
    Calculates unified reorder quantity using order-up-to logic:
    orderUpTo = dailyDemand * (leadTime + reviewPeriod) + safetyStock
    raw_qty = ceil(max(0, orderUpTo - inventoryPosition))
    Rounded up to multiple of moq.
    """
    order_up_to = daily_demand * (lead_time + review_period) + safety_stock
    raw_qty = max(0, math.ceil(order_up_to - inventory_position - 1e-9))
    if raw_qty > 0 and moq > 0:
        qty = math.ceil(raw_qty / moq) * moq
    else:
        qty = raw_qty
    return int(qty), float(order_up_to)
