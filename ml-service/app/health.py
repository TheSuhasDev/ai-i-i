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

W_COVER, W_RISK, W_SUPPLIER, W_STABILITY = 0.55, 0.15, 0.15, 0.15
CV_CAP = 0.8
OVERSTOCK_DAYS, OVERSTOCK_END_DAYS, OVERSTOCK_END_SCORE = 90.0, 250.0, 35.0
PRIORITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


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


def alert_priority(margin_days):
    if margin_days is None:
        return "Low"
    return "Critical" if margin_days < 0 else "High" if margin_days < 5 else "Medium" if margin_days < 10 else "Low"