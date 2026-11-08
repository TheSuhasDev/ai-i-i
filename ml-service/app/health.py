"""
Inventory health score and alert priority (Day 9). Pure functions.

Health (0-100) = 0.55 cover + 0.15 (100 - stockout risk %) + 0.15 supplier reliability + 0.15 demand stability
  cover     : stock_ratio 0 -> 0, 1 -> 30, 2 -> 100 (linear between, capped at 100).
              Overstock: above 90 days of cover the score falls from 100 to 35 at 250 days.
  stability : 100 * (1 - weekly CV / 0.8), floored at 0.
  status    : < 40 Critical, 40-69 Warning, >= 70 Healthy.

Alert priority uses margin = days of cover - days until replenishment:
  < 0 Critical (stock runs out before delivery), < 5 High, < 15 Medium, else Low.
"""
import math

import numpy as np

OVERSTOCK_DAYS = 90.0
PRIORITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}

COVER_MARGIN_THRESHOLDS = {
    "high_lt": 5,
    "medium_lt": 15,
}

W_COVER, W_RISK, W_SUPPLIER, W_STABILITY = 0.55, 0.15, 0.15, 0.15
CV_CAP = 0.8
OVERSTOCK_END_DAYS, OVERSTOCK_END_SCORE = 250.0, 35.0


def classify_cover_margin(days_of_cover, days_to_replenishment):
    """
    CORRECT DEFINITION (single source of truth):
    margin_days = days_of_cover - days_to_replenishment
    - negative -> stock runs out BEFORE delivery (worse the more negative)
    - positive -> buffer remains after delivery (worse the closer to 0)
    Lower margin_days = more urgent, always.

    Returns dict:
      margin_days,      # signed, rounded to 1 decimal for display only; classify on unrounded
      shortfall_days,   # max(0, -margin_days), only meaningful for Critical
      priority, alert_type
    """
    if days_of_cover is None or days_to_replenishment is None:
        return {
            "margin_days": None,
            "shortfall_days": 0.0,
            "priority": "Low",
            "alert_type": None,
        }

    raw_margin = float(days_of_cover) - float(days_to_replenishment)
    high_lt = COVER_MARGIN_THRESHOLDS["high_lt"]
    medium_lt = COVER_MARGIN_THRESHOLDS["medium_lt"]

    # Classify on the unrounded margin_days so rounding can never move a product across a boundary
    if raw_margin < 0:
        priority = "Critical"
        alert_type = "stockout_before_delivery"
    elif raw_margin < high_lt:
        priority = "High"
        alert_type = "tight_cover_margin"
    elif raw_margin < medium_lt:
        priority = "Medium"
        alert_type = "low_cover_margin"
    else:
        priority = "Low"
        alert_type = None

    rounded_margin = round(raw_margin, 1)
    shortfall = max(0.0, round(-raw_margin, 1))

    return {
        "margin_days": rounded_margin,
        "shortfall_days": shortfall,
        "priority": priority,
        "alert_type": alert_type,
    }


def cover_score(stock_ratio, days_of_cover=None):
    if days_of_cover is not None and days_of_cover > OVERSTOCK_DAYS:
        return float(np.interp(days_of_cover, [OVERSTOCK_DAYS, OVERSTOCK_END_DAYS], [100.0, OVERSTOCK_END_SCORE]))
    return float(np.interp(stock_ratio, [0, 1, 2], [0, 30, 100]))


def stability_score(cv):
    if cv is None or math.isnan(float(cv)):
        return 50.0
    return float(100 * (1 - min(max(float(cv), 0.0) / CV_CAP, 1.0)))


def health_status(score):
    return "Critical" if score < 40 else "Warning" if score < 70 else "Healthy"


def health_score(stock_ratio, days_of_cover, risk_pct, supplier_score, weekly_cv):
    parts = {
        "cover": cover_score(stock_ratio, days_of_cover),
        "risk": 100 - min(max(float(risk_pct), 0.0), 100.0),
        "supplier": min(max(float(supplier_score), 0.0), 100.0),
        "stability": stability_score(weekly_cv),
    }
    score = round(W_COVER * parts["cover"] + W_RISK * parts["risk"]
                  + W_SUPPLIER * parts["supplier"] + W_STABILITY * parts["stability"], 1)
    return {"score": score, "status": health_status(score), "components": {k: round(v, 1) for k, v in parts.items()}}


def alert_priority(margin_days=None, cover_days=None, lead_time_days=None, return_meta=False):
    """
    Single source of truth for cover margin alert priority and metadata.
    Delegates to classify_cover_margin.
    """
    if cover_days is not None and lead_time_days is not None:
        res = classify_cover_margin(cover_days, lead_time_days)
    elif margin_days is not None:
        res = classify_cover_margin(margin_days, 0.0)
    else:
        return ("Low", None, None) if return_meta else "Low"

    phrase = "tight margin of" if res["alert_type"] == "tight_cover_margin" else ("margin" if res["alert_type"] == "low_cover_margin" else None)
    if return_meta:
        return res["priority"], res["alert_type"], phrase
    return res["priority"]
