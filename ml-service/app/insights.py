"""
One combined result per product (Day 9): forecast, risk, trend, reorder, health and alerts.
Run `python -m app.insights` to validate against scenario_labels.csv (validation only, never used by the code).
"""
import os
from datetime import date, timedelta
from functools import lru_cache


def today():
    return date.fromisoformat(os.environ["AS_OF_DATE"]) if os.environ.get("AS_OF_DATE") else date.today()


import math
import numpy as np
import pandas as pd

from app.alert_config import (
    OVERSTOCK_DAYS,
    PRIORITY_RANK,
    evaluate_reorder_severity,
)
from app.decision import NEUTRAL_SUPPLIER, get_demand_rate, load_decision_inputs, product_stats, smart_reorder, supplier_scores
from app.forecasting import forecast_product
from app.health import alert_priority, classify_cover_margin, health_score
from app.preprocessing import DATA_DIR
from app.risk import load_series, risk_for_product
from app.trend import trend_for_product


@lru_cache(maxsize=1)
def _tables():
    products, pos, price_col = load_decision_inputs()
    stats = product_stats(load_series(), products, price_col).set_index("product_id").to_dict("index")
    return stats, supplier_scores(pos).to_dict("index")


@lru_cache(maxsize=1)
def _pos_table():
    _, pos, _ = load_decision_inputs()
    return pos


@lru_cache(maxsize=1)
def _open_pos():
    """Open (not yet delivered) purchase orders per product: total quantity and earliest expected delivery."""
    pos = pd.read_csv(DATA_DIR / "purchase_orders.csv", parse_dates=["expected_delivery_date"])
    o = pos[pos["status"].isin(["Pending", "Approved", "In Transit", "In transit", "Partially Delivered"])].copy()
    if o.empty:
        return {}
    received = o["qty_received"].fillna(0) if "qty_received" in o else 0
    o["qty_remaining"] = (o["qty_ordered"] - received).clip(lower=0)
    g = o.groupby("product_id").agg(qty=("qty_remaining", "sum"), date=("expected_delivery_date", "min"))
    return {str(pid): {"qty": float(r.qty), "date": r.date.date()} for pid, r in g.iterrows()}


def _finite(x, nd=2):
    x = float(x)
    return round(x, nd) if np.isfinite(x) else None


def _alerts(cover_1d, deliv_1d, margin_1d, reorder, sup_id, sc, is_overdue=False, overdue_days=0,
            lead_time_source="configured", alt_supplier=None):
    out = []
    margin_info = classify_cover_margin(cover_1d, deliv_1d)
    cover_prio = margin_info["priority"]
    alert_t = margin_info["alert_type"]
    margin_val = margin_info["margin_days"]
    shortfall_val = margin_info["shortfall_days"]
    if margin_val is not None:
        margin_val = 0.0 if abs(margin_val) < 1e-9 else margin_val
        margin_sign_str = f"{margin_val:+.1f}"
        margin_chip = f"{margin_val:+.1f}d"
    else:
        margin_sign_str = None
        margin_chip = None
    shortfall_str = f"{shortfall_val:.1f}"

    if is_overdue:
        out.append({
            "type": "po_overdue",
            "priority": "Critical" if (cover_1d is not None and cover_1d < 5) else "High",
            "message": f"PO overdue by {overdue_days}d, ETA unknown." + (f" Stock covers {cover_1d:.1f} days." if cover_1d is not None else ""),
            "margin_days": margin_val,
            "shortfall_days": shortfall_val,
            "margin_chip": margin_chip,
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })
        msg = f"Stock covers {cover_1d:.1f} days but replenishment is overdue by {overdue_days}d (ETA unknown)." if cover_1d is not None else f"PO overdue by {overdue_days}d, ETA unknown."
        out.append({
            "type": alert_t or "tight_cover_margin",
            "priority": cover_prio if cover_prio != "Low" else "High",
            "message": msg,
            "margin_days": margin_val,
            "shortfall_days": shortfall_val,
            "margin_chip": margin_chip,
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })
    elif alert_t == "stockout_before_delivery":
        order_qty = reorder["order_qty"]
        alt_part = f" ({alt_supplier['supplier_id']})" if alt_supplier else ""
        action_str = f"Expedite delivery, switch to alternate supplier{alt_part}, or place split emergency order of {order_qty:,} units."
        msg = (f"Stock covers {cover_1d:.1f} days but replenishment is expected in {deliv_1d:.1f} days "
               f"(margin {margin_sign_str} days, short by {shortfall_str} days). Action: {action_str}")
        out.append({
            "type": alert_t,
            "priority": cover_prio,
            "message": msg,
            "recommended_action": action_str,
            "emergency_order_qty": order_qty,
            "margin_days": margin_val,
            "shortfall_days": shortfall_val,
            "margin_chip": margin_chip,
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })
    elif alert_t == "tight_cover_margin":
        msg = f"Stock covers {cover_1d:.1f} days against {deliv_1d:.1f} days to replenishment (tight margin of {margin_sign_str} days)."
        out.append({
            "type": alert_t,
            "priority": cover_prio,
            "message": msg,
            "margin_days": margin_val,
            "shortfall_days": shortfall_val,
            "margin_chip": margin_chip,
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })
    elif alert_t == "low_cover_margin":
        msg = f"Stock covers {cover_1d:.1f} days against {deliv_1d:.1f} days to replenishment (margin {margin_sign_str} days)."
        out.append({
            "type": alert_t,
            "priority": cover_prio,
            "message": msg,
            "margin_days": margin_val,
            "shortfall_days": shortfall_val,
            "margin_chip": margin_chip,
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })

    if reorder["order_qty"] > 0:
        reorder_prio = evaluate_reorder_severity(reorder["reorder_point"], reorder["inventory_position"])
        rop_whole = math.ceil(reorder["reorder_point"])
        pos_whole = round(reorder["inventory_position"])
        out.append({
            "type": "reorder_now",
            "priority": reorder_prio,
            "message": f"Order {reorder['order_qty']:,} units (reorder point {rop_whole:,}, inventory position {pos_whole:,}).",
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })

    if cover_1d is not None and cover_1d > OVERSTOCK_DAYS:
        out.append({
            "type": "overstock",
            "priority": "Low",
            "message": f"{cover_1d:.1f} days of cover; consider pausing reorders.",
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })

    if sc.get("risk_level") == "High" and (cover_1d is None or cover_1d <= OVERSTOCK_DAYS):
        out.append({
            "type": "supplier_risk",
            "priority": "Medium",
            "message": f"Supplier {sup_id} is high risk (reliability {sc['reliability_score']}, "
                       f"average delay {sc['avg_delay_days']:.1f} days).",
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
        })

    return sorted(out, key=lambda a: PRIORITY_RANK[a["priority"]])


def insights_for_product(product_id, stock=None, on_order=None, promo_days=None, price=None,
                         expected_delivery_date=None):
    """stock / on_order optionally override the CSV snapshot (Express sends live values from MongoDB)."""
    pid = str(product_id)
    stats, sup = _tables()
    all_pos = _pos_table()
    row = stats.get(pid)
    if row is None:
        raise KeyError(pid)

    fc = forecast_product(pid, promo_days, price)
    try:
        tr = trend_for_product(pid)
    except ValueError:
        tr = None

    sup_id = str(row["supplier_id"])
    sc = sup.get(sup_id, NEUTRAL_SUPPLIER)
    lt = int(row["lead_time_days"])
    as_of = today()
    cur = float(stock) if stock is not None else float(row["stock"])
    po = _open_pos().get(pid)
    qty_in = float(on_order) if on_order is not None else (po["qty"] if po else 0.0)

    # Lead time learning: use product master lead_time unless >= 3 valid delivered POs (lt >= 1 day)
    d_pos = all_pos[(all_pos["product_id"].astype(str) == pid) & (all_pos["status"] == "Delivered")]
    if "actual_delivery_date" in d_pos.columns and "order_date" in d_pos.columns:
        act_dt = pd.to_datetime(d_pos["actual_delivery_date"], errors="coerce")
        ord_dt = pd.to_datetime(d_pos["order_date"], errors="coerce")
        lt_days = (act_dt - ord_dt).dt.total_seconds() / 86400.0
        valid_pos = d_pos[(lt_days >= 1.0) | lt_days.isna()]
    else:
        valid_pos = d_pos

    has_valid_pos = len(valid_pos) >= 3
    delay = float(sc.get("avg_delay_days", 0.0)) if has_valid_pos else 0.0
    delay_std = float(sc.get("delay_std_days", 0.0)) if has_valid_pos else 0.0
    effective_lt = round(lt + max(0.0, delay), 1)

    # 1 demand basis for all engines: max(avg_daily_28d, forecast_P90_daily) capped at 1.3 x max weekly / 7
    demand_rate = get_demand_rate(pid, forecast=fc, avg_daily_28d=row.get("mean_daily_28"), trend=tr, as_of_date=as_of)

    rk = risk_for_product(pid, stock=cur, on_order=qty_in, demand_rate=demand_rate)
    data_as_of = date.fromisoformat(rk["as_of"])

    cover = min(cur / demand_rate, 365.0) if demand_rate > 0.05 else None
    expected_date = expected_delivery_date or (po["date"] if po else None)
    if isinstance(expected_date, str):
        expected_date = date.fromisoformat(expected_date)
    is_overdue = False
    overdue_days = 0
    if qty_in > 0 and expected_date:
        diff_days = (expected_date - as_of).days
        if diff_days < 0:
            is_overdue = True
            overdue_days = abs(diff_days)
            days_deliv = delay
            basis = f"PO overdue by {overdue_days}d, ETA unknown"
        else:
            days_deliv = diff_days + delay
            basis = "open purchase order"
    else:
        days_deliv = effective_lt
        basis = "new order placed today (effective lead time)"

    # Margin calc: round cover and lead time to 1 decimal ONCE, then margin = roundedCover - roundedLead
    cover_1d = None if cover is None else (0.0 if abs(cover) < 0.05 else round(float(cover), 1))
    deliv_1d = round(float(days_deliv), 1)
    margin_info = classify_cover_margin(cover_1d, deliv_1d)
    margin_1d = margin_info["margin_days"]
    if margin_1d is not None:
        margin_1d = 0.0 if abs(margin_1d) < 1e-9 else margin_1d
        margin_chip = f"{margin_1d:+.1f}d"
    else:
        margin_chip = None
    shortfall_1d = margin_info["shortfall_days"]

    lead_time_source = "observed" if has_valid_pos else "configured"

    # Reorder uses effective lead time and order-up-to logic for all products
    reorder = smart_reorder(fc["lead_time_demand"], lt, float(row["sigma_daily_60"]), cur, qty_in,
                            sc["reliability_score"], avg_delay_days=delay, lt_std_days=delay_std,
                            demand_rate=demand_rate, risk_pct=rk["risk_pct"], margin_days=margin_1d,
                            product_id=pid)
    reorder["effective_lead_time_days"] = effective_lt
    reorder["leadTimeSource"] = lead_time_source
    reorder["lead_time_source"] = lead_time_source

    health = health_score(rk["signals"]["stock_ratio"], cover, rk["risk_pct"], sc["reliability_score"],
                          float(row["weekly_cv"]))

    # Look for best alternate supplier
    alt_supplier = None
    all_sups = row.get("supplier_ids", [])
    if isinstance(all_sups, str):
        all_sups = [all_sups]
    other_sups = [s for s in all_sups if str(s) != sup_id]
    if other_sups:
        best_alt_id = max(other_sups, key=lambda s: sup.get(str(s), {}).get("reliability_score", 0))
        best_alt = sup.get(str(best_alt_id))
        if best_alt:
            alt_supplier = {
                "supplier_id": str(best_alt_id),
                "reliability_score": best_alt["reliability_score"],
                "risk_level": best_alt["risk_level"],
                "avg_delay_days": best_alt["avg_delay_days"]
            }
    supplier_warning = None
    if sc.get("risk_level") == "High" or sc.get("reliability_score", 100) < 70:
        warning_parts = [f"Primary supplier {sup_id} is High Risk (reliability {sc['reliability_score']}%)"]
        if alt_supplier:
            warning_parts.append(f"Consider alternate supplier {alt_supplier['supplier_id']} (reliability {alt_supplier['reliability_score']}%)")
        supplier_warning = ". ".join(warning_parts) + "."

    alerts = _alerts(cover_1d, deliv_1d, margin_1d, reorder, sup_id, sc, is_overdue, overdue_days,
                     lead_time_source=lead_time_source, alt_supplier=alt_supplier)
    # Card severity = highest alert severity (lowest rank index), or Low if no alerts
    card_prio = min(alerts, key=lambda a: PRIORITY_RANK[a["priority"]])["priority"] if alerts else "Low"

    return {
        "product_id": pid,
        "name": row["name"],
        "as_of": rk["as_of"],
        "inputs": {"stock": cur, "on_order": qty_in, "lead_time_days": lt,
                   "effective_lead_time_days": effective_lt,
                   "leadTimeSource": lead_time_source,
                   "lead_time_source": lead_time_source,
                   "stock_source": "override" if stock is not None else "csv snapshot",
                   "data_as_of": data_as_of.isoformat(),
                   "data_age_days": (as_of - data_as_of).days},
        "priority": card_prio,
        "alerts": alerts,
        "health": health,
        "stockout": {
            "out_of_stock_now": cur <= 0,
            "days_of_cover": cover_1d,
            "expected_stockout_date": None if cover is None else (as_of + timedelta(days=max(cover, 0))).isoformat(),
            "days_to_delivery": deliv_1d if not is_overdue else None,
            "days_to_delivery_text": f"PO overdue by {overdue_days}d, ETA unknown" if is_overdue else f"{deliv_1d:.1f} days",
            "expected_delivery_date": None if is_overdue else (as_of + timedelta(days=round(deliv_1d))).isoformat(),
            "effective_lead_time_days": effective_lt,
            "leadTimeSource": lead_time_source,
            "lead_time_source": lead_time_source,
            "is_overdue": is_overdue,
            "overdue_days": overdue_days,
            "delivery_basis": basis,
            "margin_days": margin_1d,
            "shortfall_days": shortfall_1d,
            "margin_chip": margin_chip,
            "margin_status": "Short" if (margin_1d is not None and margin_1d < 0) else ("Tight" if (margin_1d is not None and margin_1d < 5) else "Safe"),
            "demand_rate": round(demand_rate, 2),
        },
        "forecast": fc,
        "risk": rk,
        "trend": tr,
        "reorder": {
            **reorder,
            "supplier_id": sup_id,
            "supplier_reliability": sc["reliability_score"],
            "supplier_risk_level": sc.get("risk_level", "Low"),
            "supplier_warning": supplier_warning,
            "alternate_supplier": alt_supplier,
        },
        "classification": {"abc": str(row["abc"]), "xyz": str(row["xyz"]), "abc_xyz": str(row["abc_xyz"]),
                           "weekly_cv": _finite(row["weekly_cv"])},
        "supplier": {"id": sup_id, "reliability_score": sc["reliability_score"],
                     "risk_level": sc.get("risk_level", "Low"), "avg_delay_days": _finite(delay, 1)},
    }


def insight_sort_key(item):
    prio_rank = PRIORITY_RANK.get(item["priority"], 99)
    alerts = item.get("alerts", [])
    alert_types = {a["type"] for a in alerts}
    is_overstock_only = "overstock" in alert_types and not any("margin" in t or "stockout" in t for t in alert_types)
    stockout = item.get("stockout", {})
    margin = stockout.get("margin_days")
    cover = stockout.get("days_of_cover") or 0.0

    if is_overstock_only:
        urgency = (-float(cover),)
    else:
        m_val = float(margin) if margin is not None else 999.0
        urgency = (m_val,)

    alert_count = len(alerts)
    sku = str(item.get("product_id", ""))
    return (prio_rank, is_overstock_only, urgency, -alert_count, sku)


def compute_kpi(insights_list):
    kpi = {
        "critical": {"alerts": 0, "products": 0},
        "high": {"alerts": 0, "products": 0},
        "medium": {"alerts": 0, "products": 0},
        "low": {"alerts": 0, "products": 0},
        "total_alerts": 0,
        "total_products": 0,
    }
    products_by_prio = {
        "critical": set(),
        "high": set(),
        "medium": set(),
        "low": set(),
    }
    all_alert_products = set()

    for item in insights_list:
        pid = str(item.get("product_id") or item.get("productCode") or item.get("code") or "")
        alerts = item.get("alerts", [])
        if not alerts:
            continue
        all_alert_products.add(pid)
        for a in alerts:
            prio = str(a.get("priority", "Low")).lower()
            if prio in kpi:
                kpi[prio]["alerts"] += 1
                kpi["total_alerts"] += 1
                products_by_prio[prio].add(pid)

    for p in ("critical", "high", "medium", "low"):
        kpi[p]["products"] = len(products_by_prio[p])
    kpi["total_products"] = len(all_alert_products)

    return kpi


def all_insights():
    out = []
    for pid in load_series():
        try:
            out.append(insights_for_product(pid))
        except ValueError:
            continue
    out.sort(key=insight_sort_key)
    return out

def supplier_table():
    """Supplier reliability/risk table for the Supplier Risk page. NaN/inf become null (JSON-safe)."""
    _, sup = _tables()
    out = []
    for sid, row in sup.items():
        clean = {}
        for k, v in row.items():
            if isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, bool):
                v = float(v)
                clean[k] = v if np.isfinite(v) else None
            else:
                clean[k] = None if v is None or (not isinstance(v, str) and pd.isna(v)) else v
        out.append({"supplier_id": str(sid), **clean})
    return sorted(out, key=lambda r: r.get("reliability_score") if r.get("reliability_score") is not None else 0)

def main():
    res = all_insights()
    df = pd.DataFrame([{
        "product_id": r["product_id"], "name": r["name"], "health": r["health"]["score"],
        "status": r["health"]["status"], "priority": r["priority"], "margin": r["stockout"]["margin_days"],
        "cover": r["stockout"]["days_of_cover"], "to_delivery": r["stockout"]["days_to_delivery"],
        "order_qty": r["reorder"]["order_qty"], "alerts": len(r["alerts"])} for r in res])
    lab = pd.read_csv(DATA_DIR / "scenario_labels.csv")[
        ["product_id", "expected_status", "expected_alert", "health_score", "cover_margin_days", "stock_scenario"]]
    m = df.merge(lab, on="product_id")

    print("Health status: mine (rows) vs provisional label (columns)")
    print(pd.crosstab(m["status"], m["expected_status"]).to_string())
    print(f"exact agreement {(m['status'] == m['expected_status']).mean() * 100:.0f}% | "
          f"correlation of health score with label {m['health'].corr(m['health_score']):.2f}")

    print("\nAlert priority: mine (rows) vs provisional label (columns)")
    print(pd.crosstab(m["priority"], m["expected_alert"]).to_string())
    gap = (m["priority"].map(PRIORITY_RANK) - m["expected_alert"].map(PRIORITY_RANK)).abs()
    print(f"exact agreement {(gap == 0).mean() * 100:.0f}% | within one level {(gap <= 1).mean() * 100:.0f}%")

    bad = m[(m["status"] != m["expected_status"]) | (gap > 0)]
    print("\nDisagreements:")
    print(bad[["product_id", "name", "stock_scenario", "health", "health_score", "status", "expected_status",
               "margin", "cover_margin_days", "priority", "expected_alert"]].round(1).to_string(index=False)
          if len(bad) else "  none")

    print("\nMost urgent products:")
    top = df.assign(rank=df["priority"].map(PRIORITY_RANK)).sort_values(["rank", "health"]).head(10)
    print(top[["product_id", "name", "priority", "health", "status", "cover", "to_delivery", "order_qty"]]
          .to_string(index=False))


if __name__ == "__main__":
    main()
