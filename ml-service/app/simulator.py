"""
What-if simulator (Day 12).

Recalculates one product's demand, stockout date, stockout risk, reorder quantity, health and alert priority
for changed inputs and compares them with the current situation ("before") on the same code path.

Inputs
  demand_pct        demand change applied to the forecast and, for the risk model, to the last 28 days of sales
  extra_delay_days  additional supplier delay: stretches the effective lead time and shifts every arriving order
  stock             scenario stock on hand (default: current stock)
  order_qty         a new order placed today; it arrives after lead time + average supplier delay + extra delay

Notes
  * "before" reproduces /insights exactly (checked by `python -m app.simulator`).
  * The risk model does not see orders in transit (Day 7), so order_qty changes the projected stockout date,
    the units short and the suggested additional order, not the risk %.
  * Daily demand = mean of the 3-week forecast, held constant over the 30-day projection (no weekday effect).
  * Dates follow the /insights convention: expected stockout = as_of + whole days of cover.
"""
from datetime import date, timedelta

import numpy as np
import pandas as pd

from app.decision import smart_reorder
from app.forecasting import forecast_product, lead_time_demand
from app.health import PRIORITY_RANK, alert_priority, classify_cover_margin, health_score
from app.insights import NEUTRAL_SUPPLIER, _alerts, _open_pos, _pos_table, _tables, get_demand_rate, today
from app.risk import RFEATS, apply_calibration, load_bundle, load_series, product_features, risk_level
from app.trend import trend_for_product

HORIZON = 30
WINDOW = 28


# ---------------------------------------------------------------- pure helpers

def scale_recent_units(frame, factor, window=WINDOW):
    """Copy of the daily frame with the last `window` days of sales multiplied by `factor`."""
    f = frame.copy()
    f["units_sold"] = f["units_sold"].astype(float)
    if factor != 1.0:
        idx = f.index[-window:]
        f.loc[idx, "units_sold"] = f.loc[idx, "units_sold"] * factor
    return f


def project_stock(stock, daily, arrivals, days=HORIZON):
    """
    Day-by-day stock with constant daily demand. `arrivals` is a list of (days_from_now, qty);
    an order arriving after d days is added at the start of day d+1, which matches the margin
    used for alerts (cover - days to delivery).
    """
    s = float(stock)
    levels, short_total, first_short = [], 0.0, None
    for t in range(1, days + 1):
        s += sum(q for d, q in arrivals if max(int(round(d)), 0) == t - 1)
        if s >= daily:
            s -= daily
        else:
            short_total += daily - s
            s = 0.0
            if first_short is None:
                first_short = t
        levels.append(round(s, 1))
    return {"levels": levels, "first_shortfall_day": first_short, "units_short": round(short_total, 1)}


# ---------------------------------------------------------------- risk under a scenario

def _risk_row(frame, lt, stock, factor, extra_delay, demand_rate=None, on_order=0.0):
    f = scale_recent_units(frame, factor)
    f.loc[f.index[-1], "stock_on_hand"] = float(stock)
    row = product_features(f, lt + extra_delay, on_order=on_order, demand_rate=demand_rate).iloc[-1]   # extra delay = longer effective lead time
    if row[RFEATS].isna().any():
        raise ValueError("Not enough history (need 60+ days) to simulate this product")
    bundle = load_bundle()
    X = pd.DataFrame([row[RFEATS].astype(float).to_dict()])
    raw = bundle["model"].predict_proba(X)[:, 1]
    p = float(apply_calibration(bundle["calibrator"], raw)[0])
    return row, p, bundle["threshold"]


def _state(c, stock, on_order, new_order, factor, extra):
    lt, delay = c["lt"], c["delay"]
    delay_std = c["delay_std"]
    eff_lt = round(lt + delay + extra, 1)
    daily = c["daily"] * factor
    cover = min(stock / daily, 365.0) if daily > 0.05 else None

    arrivals = []
    is_overdue = False
    overdue_days = 0
    if on_order > 0:
        if c["po"] is not None and c["po"].get("date"):
            diff_days = (c["po"]["date"] - c["as_of"]).days
            if diff_days < 0:
                is_overdue = True
                overdue_days = abs(diff_days)
                when = delay + extra
            else:
                when = diff_days + delay + extra
        else:
            when = lt + delay + extra
        arrivals.append((when, on_order, False))
    if new_order > 0:
        arrivals.append((lt + delay + extra, new_order, True))

    days_deliv = min(w for w, _, _ in arrivals) if arrivals else eff_lt
    cover_1d = None if cover is None else (0.0 if abs(cover) < 0.05 else round(float(cover), 1))
    deliv_1d = round(float(days_deliv), 1)
    margin_info = classify_cover_margin(cover_1d, deliv_1d)
    margin = margin_info["margin_days"]

    proj = project_stock(stock, daily, [(w, q) for w, q, _ in arrivals])
    first = proj["first_shortfall_day"]

    # Risk model: sees live/scenario stock and baseline on_order; does not see new order in transit
    row, p, thr = _risk_row(c["frame"], lt, stock, factor, extra, demand_rate=daily, on_order=on_order)
    pct = round(p * 100, 1)

    ltd = round(lead_time_demand([w * factor for w in c["weekly"]], eff_lt), 1) if (factor != 1.0 or extra != 0) else c["fc"]["lead_time_demand"]
    sc = c["sc"]
    reorder = smart_reorder(ltd, lt, c["sigma"] * factor, stock, on_order + new_order,
                            sc.get("reliability_score", 100.0), avg_delay_days=delay + extra, lt_std_days=delay_std,
                            demand_rate=daily, risk_pct=pct, margin_days=margin, product_id=c["pid"])
    reorder["effective_lead_time_days"] = eff_lt
    reorder["leadTimeSource"] = c["lead_time_source"]
    reorder["lead_time_source"] = c["lead_time_source"]

    health = health_score(round(float(row["stock_ratio"]), 2), cover, pct, sc.get("reliability_score", 100.0), c["weekly_cv"])
    alerts = _alerts(cover_1d, deliv_1d, margin, reorder, c["sup_id"], sc, is_overdue, overdue_days,
                     lead_time_source=c["lead_time_source"], alt_supplier=c["alt_supplier"])
    card_prio = min(alerts, key=lambda a: PRIORITY_RANK[a["priority"]])["priority"] if alerts else "Low"

    return {
        "stock": round(float(stock), 1),
        "on_order": round(float(on_order + new_order), 1),
        "daily_demand": round(float(daily), 2),
        "lead_time_days": int(round(eff_lt)),
        "lead_time_demand": ltd,
        "days_of_cover": cover_1d,
        "days_to_delivery": deliv_1d,
        "margin_days": margin,
        "expected_stockout_date": None if first is None else (c["as_of"] + timedelta(days=first - 1)).isoformat(),
        "first_shortfall_day": first,
        "units_short_30d": proj["units_short"],
        "risk_pct": pct,
        "risk_level": risk_level(pct),
        "flagged": bool(p >= thr),
        "priority": card_prio,
        "health": health,
        "reorder": reorder,
        "projected_stock": proj["levels"],
        "arrivals": [{"day": max(int(round(w)), 0) + 1, "qty": round(float(q), 1), "is_new": is_new} for w, q, is_new in arrivals],
    }


def _summary(b, a, neutral):
    if neutral:
        return "No scenario changes applied: showing the current situation."
    parts = [f"Alert priority moves from {b['priority']} to {a['priority']}." if a["priority"] != b["priority"]
             else f"Alert priority stays {a['priority']}."]
    parts.append(f"Stockout risk goes from {b['risk_pct']:.0f}% to {a['risk_pct']:.0f}%.")
    if a["health"]["status"] != b["health"]["status"]:
        parts.append(f"Health moves from {b['health']['status']} to {a['health']['status']}.")
    if a["expected_stockout_date"] != b["expected_stockout_date"]:
        was = b["expected_stockout_date"] or "none within 30 days"
        now = a["expected_stockout_date"] or "none within 30 days"
        parts.append(f"Expected stockout moves from {was} to {now}.")
    parts.append(f"Suggested additional order: {b['reorder']['order_qty']} -> {a['reorder']['order_qty']} units.")
    return " ".join(parts)


def simulate(product_id, demand_pct=0.0, extra_delay_days=0, stock=None, order_qty=0.0,
             base_stock=None, base_on_order=None, base_expected_delivery_date=None):
    pid = str(product_id)
    stats, sup = _tables()
    row = stats.get(pid)
    series = load_series().get(pid)
    if row is None or series is None:
        raise KeyError(pid)
    factor = 1.0 + float(demand_pct) / 100.0
    if factor <= 0:
        raise ValueError("demand_pct must be greater than -100")
    extra = int(extra_delay_days)

    fc = forecast_product(pid)
    frame = series["frame"]
    sup_id = str(row["supplier_id"])
    sc = sup.get(sup_id, NEUTRAL_SUPPLIER)
    lt = int(row["lead_time_days"])
    as_of = today()

    all_pos = _pos_table()
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
    lead_time_source = "observed" if has_valid_pos else "configured"

    po = _open_pos().get(pid)
    expected_date = base_expected_delivery_date or (po["date"] if po else None)
    if isinstance(expected_date, str):
        expected_date = date.fromisoformat(expected_date)
    if expected_date:
        po = {**(po or {}), "date": expected_date}
    weekly = [w["forecast"] for w in fc["weeks"]]

    try:
        tr = trend_for_product(pid)
    except Exception:
        tr = None
    base_dr = get_demand_rate(pid, forecast=fc, avg_daily_28d=row.get("mean_daily_28"), trend=tr, as_of_date=as_of)

    # Alternate supplier resolution matching /insights
    all_sups = row.get("supplier_ids", [])
    if isinstance(all_sups, str):
        all_sups = [all_sups]
    other_sups = [s for s in all_sups if str(s) != sup_id]
    alt_supplier = None
    if other_sups:
        best_alt_id = max(other_sups, key=lambda s: sup.get(str(s), {}).get("reliability_score", 0))
        best_alt = sup.get(str(best_alt_id))
        if best_alt:
            alt_supplier = {
                "supplier_id": str(best_alt_id),
                "reliability_score": best_alt["reliability_score"],
                "risk_level": best_alt["risk_level"],
                "avg_delay_days": best_alt["avg_delay_days"],
            }

    cur = float(frame["stock_on_hand"].iloc[-1]) if base_stock is None else float(base_stock)
    qty_in = float(base_on_order) if base_on_order is not None else (po["qty"] if po else 0.0)
    ctx = {
        "pid": pid,
        "frame": frame,
        "lt": lt,
        "delay": delay,
        "delay_std": delay_std,
        "effective_lt": effective_lt,
        "lead_time_source": lead_time_source,
        "sc": sc,
        "sup_id": sup_id,
        "alt_supplier": alt_supplier,
        "sigma": float(row["sigma_daily_60"]),
        "weekly_cv": float(row["weekly_cv"]),
        "weekly": weekly,
        "daily": base_dr,
        "fc": fc,
        "po": po,
        "as_of": as_of,
    }

    scen_stock = cur if stock is None else float(stock)
    before = _state(ctx, cur, qty_in, 0.0, 1.0, 0)
    after = _state(ctx, scen_stock, qty_in, float(order_qty), factor, extra)
    neutral = demand_pct == 0 and extra == 0 and stock is None and float(order_qty) == 0

    return {
        "product_id": pid,
        "name": str(row["name"]),
        "supplier_id": sup_id,
        "as_of": ctx["as_of"].isoformat(),
        "scenario": {"demand_pct": float(demand_pct), "extra_delay_days": extra,
                     "stock": scen_stock, "order_qty": float(order_qty)},
        "before": before,
        "after": after,
        "flags": {
            "priority_changed": before["priority"] != after["priority"],
            "priority_worse": PRIORITY_RANK[after["priority"]] < PRIORITY_RANK[before["priority"]],
            "risk_level_changed": before["risk_level"] != after["risk_level"],
            "health_status_changed": before["health"]["status"] != after["health"]["status"],
        },
        "summary": _summary(before, after, neutral),
        "assumptions": [
            "Demand change applies to the forecast and to the last 28 days of sales seen by the risk model.",
            "Extra delay lengthens the effective lead time and delays every arriving order.",
            "The risk model ignores orders in transit, so order quantity does not change the risk %; "
            "it changes the stockout date, units short and the suggested additional order.",
            "The 30-day projection holds daily demand constant at the forecast mean.",
        ],
    }

def simulate_all(demand_pct=0.0, extra_delay_days=0, live=None, product_ids=None):
    """
    Same scenario applied to every product (or to `product_ids`), as compact rows, worst affected first.
    `live` maps product_id -> {"stock": .., "on_order": ..} (current values sent by Express).
    """
    live = live or {}
    ids = [str(p) for p in product_ids] if product_ids else list(load_series())
    rows = []
    for pid in ids:
        base = live.get(pid) or {}
        try:
            s = simulate(pid, demand_pct, extra_delay_days, None, 0.0, base.get("stock"), base.get("on_order"),
                         base.get("expected_delivery_date"))
        except ValueError:
            continue
        b, a = s["before"], s["after"]
        rows.append({
            "product_id": pid, "name": s["name"],
            "priority_before": b["priority"], "priority_after": a["priority"],
            "priority_worse": s["flags"]["priority_worse"],
            "risk_before": b["risk_pct"], "risk_after": a["risk_pct"],
            "days_of_cover_before": b["days_of_cover"], "days_of_cover_after": a["days_of_cover"],
            "order_qty_before": b["reorder"]["order_qty"], "order_qty_after": a["reorder"]["order_qty"],
            "expected_stockout_after": a["expected_stockout_date"],
        })
    rows.sort(key=lambda r: (not r["priority_worse"], PRIORITY_RANK[r["priority_after"]], -r["risk_after"]))
    n = max(len(rows), 1)
    return {
        "scenario": {"demand_pct": float(demand_pct), "extra_delay_days": int(extra_delay_days)},
        "summary": {
            "n_products": len(rows),
            "priority_worse": int(sum(r["priority_worse"] for r in rows)),
            "critical_before": int(sum(r["priority_before"] == "Critical" for r in rows)),
            "critical_after": int(sum(r["priority_after"] == "Critical" for r in rows)),
            "avg_risk_before": round(sum(r["risk_before"] for r in rows) / n, 1),
            "avg_risk_after": round(sum(r["risk_after"] for r in rows) / n, 1),
            "reorder_units_before": round(sum(r["order_qty_before"] for r in rows)),
            "reorder_units_after": round(sum(r["order_qty_after"] for r in rows)),
        },
        "products": rows,
    }


# ---------------------------------------------------------------- validation

SCENARIOS = {
    "demand +10%": {"demand_pct": 10},
    "demand +20%": {"demand_pct": 20},
    "delay +3d": {"extra_delay_days": 3},
    "demand +20% & delay +3d": {"demand_pct": 20, "extra_delay_days": 3},
}


def main():
    from app.insights import insights_for_product
    from app.preprocessing import DATA_DIR

    base, mismatches = [], []
    for pid in load_series():
        try:
            s = simulate(pid)
            ins = insights_for_product(pid)
        except ValueError:
            continue
        b, diffs = s["before"], []
        if b["priority"] != ins["priority"]:
            diffs.append("priority")
        if abs(b["risk_pct"] - ins["risk"]["risk_pct"]) > 0.05:
            diffs.append("risk")
        if abs(b["health"]["score"] - ins["health"]["score"]) > 0.05:
            diffs.append("health")
        if b["reorder"]["order_qty"] != ins["reorder"]["order_qty"]:
            diffs.append("order_qty")
        if diffs:
            mismatches.append((pid, ",".join(diffs)))
        base.append((pid, s))
    print(f"Baseline vs /insights: {len(base) - len(mismatches)} of {len(base)} products identical "
          f"(priority, risk, health, order qty)")
    if mismatches:
        print("  MISMATCHES (the simulator is not on the same code path):", mismatches)

    recs = []
    for pid, s in base:
        rec = {"product_id": pid, "name": s["name"], "risk": s["before"]["risk_pct"], "prio": s["before"]["priority"]}
        for label, kw in SCENARIOS.items():
            rec[label] = simulate(pid, **kw)["after"]
        recs.append(rec)

    print(f"\nEffect of each scenario on all {len(recs)} products:")
    for label in SCENARIOS:
        changed = sum(r[label]["priority"] != r["prio"] for r in recs)
        worse = sum(PRIORITY_RANK[r[label]["priority"]] < PRIORITY_RANK[r["prio"]] for r in recs)
        band = sum(r[label]["risk_level"] != risk_level(r["risk"]) for r in recs)
        fell = sum(r[label]["risk_pct"] < r["risk"] - 0.5 for r in recs)
        print(f"  {label:26s} priority changed {changed:2d} (worse {worse:2d}) | risk band changed {band:2d} "
              f"| risk fell by more than 0.5 pt: {fell}")

    lab = pd.read_csv(DATA_DIR / "scenario_labels.csv")[["product_id", "stock_scenario"]]
    near = set(lab[lab["stock_scenario"] == "near"]["product_id"])

    def cell(x):
        return f"{x['risk_pct']:.0f}% {x['priority']}"

    lines = [{"product": f"{r['product_id']} {r['name']}", "now": f"{r['risk']:.0f}% {r['prio']}",
              "demand +20%": cell(r["demand +20%"]), "delay +3d": cell(r["delay +3d"]),
              "both": cell(r["demand +20% & delay +3d"])} for r in recs if r["product_id"] in near]
    print(f"\nPlanted near-threshold products ({len(lines)}): risk % and alert priority")
    print(pd.DataFrame(lines).to_string(index=False))
    flipped = sum(r["demand +20% & delay +3d"]["priority"] != r["prio"] for r in recs if r["product_id"] in near)
    print(f"Priority changes under 'demand +20% & delay +3d': {flipped} of {len(lines)} near-threshold products")


if __name__ == "__main__":
    main()
