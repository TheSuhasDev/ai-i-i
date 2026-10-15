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
from datetime import timedelta

import numpy as np
import pandas as pd

from app.decision import smart_reorder
from app.forecasting import forecast_product, lead_time_demand
from app.health import PRIORITY_RANK, alert_priority, health_score
from app.insights import NEUTRAL_SUPPLIER, _open_pos, _tables
from app.risk import RFEATS, apply_calibration, load_bundle, load_series, product_features, risk_level

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

def _risk_row(frame, lt, stock, factor, extra_delay):
    f = scale_recent_units(frame, factor)
    f.loc[f.index[-1], "stock_on_hand"] = float(stock)
    row = product_features(f, lt + extra_delay).iloc[-1]   # extra delay = longer effective lead time
    if row[RFEATS].isna().any():
        raise ValueError("Not enough history (need 60+ days) to simulate this product")
    bundle = load_bundle()
    X = pd.DataFrame([row[RFEATS].astype(float).to_dict()])
    raw = bundle["model"].predict_proba(X)[:, 1]
    p = float(apply_calibration(bundle["calibrator"], raw)[0])
    return row, p, bundle["threshold"]


def _state(c, stock, on_order, new_order, factor, extra):
    lt, delay = c["lt"], c["delay"]
    lt_eff = lt + extra
    daily = c["daily"] * factor
    cover = min(stock / daily, 365.0) if daily > 0.05 else None

    arrivals = []
    if on_order > 0:
        if c["po"] is not None:
            when = max((c["po"]["date"] - c["as_of"]).days, 0) + delay + extra
        else:
            when = lt + delay + extra
        arrivals.append((when, on_order))
    if new_order > 0:
        arrivals.append((lt + delay + extra, new_order))
    days_deliv = min(w for w, _ in arrivals) if arrivals else lt + delay + extra
    margin = None if cover is None else round(cover - days_deliv, 1)
    prio = alert_priority(margin)

    proj = project_stock(stock, daily, arrivals)
    first = proj["first_shortfall_day"]

    row, p, thr = _risk_row(c["frame"], lt, stock, factor, extra)
    pct = round(p * 100, 1)

    ltd = round(lead_time_demand([w * factor for w in c["weekly"]], lt_eff), 1)
    sc = c["sc"]
    reorder = smart_reorder(ltd, lt_eff, c["sigma"] * factor, stock, on_order + new_order,
                            sc["reliability_score"], sc["avg_delay_days"], sc["delay_std_days"])
    health = health_score(round(float(row["stock_ratio"]), 2), cover, pct, sc["reliability_score"], c["weekly_cv"])

    return {
        "stock": round(float(stock), 1),
        "on_order": round(float(on_order + new_order), 1),
        "daily_demand": round(float(daily), 2),
        "lead_time_days": int(lt_eff),
        "lead_time_demand": ltd,
        "days_of_cover": None if cover is None else round(float(cover), 1),
        "days_to_delivery": round(float(days_deliv), 1),
        "margin_days": margin,
        "expected_stockout_date": None if first is None else (c["as_of"] + timedelta(days=first - 1)).isoformat(),
        "first_shortfall_day": first,
        "units_short_30d": proj["units_short"],
        "risk_pct": pct,
        "risk_level": risk_level(pct),
        "flagged": bool(p >= thr),
        "priority": prio,
        "health": health,
        "reorder": reorder,
        "projected_stock": proj["levels"],
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
             base_stock=None, base_on_order=None):
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
    po = _open_pos().get(pid)
    weekly = [w["forecast"] for w in fc["weeks"]]

    cur = float(frame["stock_on_hand"].iloc[-1]) if base_stock is None else float(base_stock)
    qty_in = float(base_on_order) if base_on_order is not None else (po["qty"] if po else 0.0)
    ctx = {
        "frame": frame, "lt": int(row["lead_time_days"]), "delay": float(sc["avg_delay_days"]), "sc": sc,
        "sigma": float(row["sigma_daily_60"]), "weekly_cv": float(row["weekly_cv"]), "weekly": weekly,
        "daily": float(np.mean(weekly)) / 7, "po": po, "as_of": frame["date"].iloc[-1].date(),
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