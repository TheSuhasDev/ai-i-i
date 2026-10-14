"""
One combined result per product (Day 9): forecast, risk, trend, reorder, health and alerts.
Run `python -m app.insights` to validate against scenario_labels.csv (validation only, never used by the code).
"""
from datetime import date, timedelta
from functools import lru_cache

import numpy as np
import pandas as pd

from app.decision import NEUTRAL_SUPPLIER, load_decision_inputs, product_stats, smart_reorder, supplier_scores
from app.forecasting import forecast_product
from app.health import OVERSTOCK_DAYS, PRIORITY_RANK, alert_priority, health_score
from app.preprocessing import DATA_DIR
from app.risk import load_series, risk_for_product
from app.trend import trend_for_product


@lru_cache(maxsize=1)
def _tables():
    products, pos, price_col = load_decision_inputs()
    stats = product_stats(load_series(), products, price_col).set_index("product_id").to_dict("index")
    return stats, supplier_scores(pos).to_dict("index")


@lru_cache(maxsize=1)
def _open_pos():
    """Open (not yet delivered) purchase orders per product: total quantity and earliest expected delivery."""
    pos = pd.read_csv(DATA_DIR / "purchase_orders.csv", parse_dates=["expected_delivery_date"])
    o = pos[pos["status"] != "Delivered"]
    if o.empty:
        return {}
    g = o.groupby("product_id").agg(qty=("qty_ordered", "sum"), date=("expected_delivery_date", "min"))
    return {str(pid): {"qty": float(r.qty), "date": r.date.date()} for pid, r in g.iterrows()}


def _finite(x, nd=2):
    x = float(x)
    return round(x, nd) if np.isfinite(x) else None


def _alerts(prio, margin, cover, days_deliv, reorder, sup_id, sc):
    out = []
    if prio != "Low":
        if margin < 0:
            msg = (f"Stock covers about {cover:.1f} days but replenishment is expected in {days_deliv:.1f} days "
                   f"(short by {-margin:.1f} days).")
        else:
            msg = f"Stock covers {cover:.1f} days against {days_deliv:.1f} days to replenishment (margin {margin:.1f} days)."
        out.append({"type": "stockout_before_delivery" if margin < 0 else "low_cover_margin", "priority": prio,
                    "message": msg})
    if reorder["order_qty"] > 0:
        out.append({"type": "reorder_now", "priority": "High" if prio in ("Critical", "High") else "Medium",
                    "message": f"Order {reorder['order_qty']} units (reorder point {reorder['reorder_point']}, "
                               f"inventory position {reorder['inventory_position']})."})
    if cover is not None and cover > OVERSTOCK_DAYS:
        out.append({"type": "overstock", "priority": "Low",
                    "message": f"{cover:.0f} days of cover; consider pausing reorders."})
    if sc.get("risk_level") == "High" and prio != "Low":
        out.append({"type": "supplier_risk", "priority": "Medium",
                    "message": f"Supplier {sup_id} is high risk (reliability {sc['reliability_score']}, "
                               f"average delay {sc['avg_delay_days']:.1f} days)."})
    return sorted(out, key=lambda a: PRIORITY_RANK[a["priority"]])


def insights_for_product(product_id, stock=None, on_order=None, promo_days=None, price=None):
    """stock / on_order optionally override the CSV snapshot (Express sends live values from MongoDB)."""
    pid = str(product_id)
    stats, sup = _tables()
    row = stats.get(pid)
    if row is None:
        raise KeyError(pid)

    fc = forecast_product(pid, promo_days, price)
    rk = risk_for_product(pid, stock)
    try:
        tr = trend_for_product(pid)
    except ValueError:
        tr = None

    sup_id = str(row["supplier_id"])
    sc = sup.get(sup_id, NEUTRAL_SUPPLIER)
    lt = int(row["lead_time_days"])
    as_of = date.fromisoformat(rk["as_of"])
    cur = float(rk["stock"])
    po = _open_pos().get(pid)
    qty_in = float(on_order) if on_order is not None else (po["qty"] if po else 0.0)

    reorder = smart_reorder(fc["lead_time_demand"], lt, float(row["sigma_daily_60"]), cur, qty_in,
                            sc["reliability_score"], sc["avg_delay_days"], sc["delay_std_days"])

    daily = float(np.mean([w["forecast"] for w in fc["weeks"]])) / 7
    cover = min(cur / daily, 365.0) if daily > 0.05 else None
    delay = float(sc["avg_delay_days"])
    if qty_in > 0 and po:
        days_deliv = max((po["date"] - as_of).days, 0) + delay
        basis = "open purchase order"
    else:
        days_deliv = lt + delay
        basis = "new order placed today (lead time + average supplier delay)"
    margin = None if cover is None else round(cover - days_deliv, 1)
    prio = alert_priority(margin)

    health = health_score(rk["signals"]["stock_ratio"], cover, rk["risk_pct"], sc["reliability_score"],
                          float(row["weekly_cv"]))

    return {
        "product_id": pid,
        "name": row["name"],
        "as_of": rk["as_of"],
        "inputs": {"stock": cur, "on_order": qty_in, "lead_time_days": lt,
                   "stock_source": "override" if stock is not None else "csv snapshot"},
        "priority": prio,
        "alerts": _alerts(prio, margin, cover, days_deliv, reorder, sup_id, sc),
        "health": health,
        "stockout": {
            "days_of_cover": None if cover is None else round(cover, 1),
            "expected_stockout_date": None if cover is None else (as_of + timedelta(days=cover)).isoformat(),
            "days_to_delivery": round(days_deliv, 1),
            "expected_delivery_date": (as_of + timedelta(days=round(days_deliv))).isoformat(),
            "delivery_basis": basis,
            "margin_days": margin,
        },
        "forecast": fc,
        "risk": rk,
        "trend": tr,
        "reorder": {**reorder, "supplier_id": sup_id, "supplier_reliability": sc["reliability_score"]},
        "classification": {"abc": str(row["abc"]), "xyz": str(row["xyz"]), "abc_xyz": str(row["abc_xyz"]),
                           "weekly_cv": _finite(row["weekly_cv"])},
        "supplier": {"id": sup_id, "reliability_score": sc["reliability_score"],
                     "risk_level": sc.get("risk_level", "Low"), "avg_delay_days": _finite(delay, 1)},
    }


def all_insights():
    out = []
    for pid in load_series():
        try:
            out.append(insights_for_product(pid))
        except ValueError:
            continue
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