"""
Decision engine (Day 8): rule-based, no ML. Pure functions plus a small CLI (python -m app.decision).

Safety stock   SS = z * sqrt(LT * sigma_d^2 + d^2 * sigma_LT^2)
  z = 1.65 (95% service), sigma_d = std of daily demand, d = mean daily demand, LT = lead time (days),
  sigma_LT = std of supplier delay (days). With sigma_LT = 0 this is the Day 2 / Day 7 label definition.

Smart reorder
  daily    = forecast demand over lead time / LT
  eff_LT   = LT + average supplier delay          (a habitually late supplier must be covered for the delay)
  demand   = daily * eff_LT
  buffer   = SS * (1 + 0.5 * (1 - reliability / 100))    (1.0x for a perfect supplier, 1.5x at score 0)
  target   = demand + buffer                      (this is the reorder point)
  order    = max(0, ceil(target - (stock + on_order)))

ABC: annual value share; A = products needed to reach 70%, B = up to 90%, C = rest.
XYZ: coefficient of variation of weekly demand (52 weeks); X < 0.25, Y < 0.35, Z otherwise.

Supplier reliability (0-100) = 100 * (0.40 on-time + 0.25 delay + 0.20 delay-variance + 0.15 quality),
each part scaled to 0-1. Risk score = 100 - reliability.
"""
import math

import numpy as np
import pandas as pd

from app.preprocessing import DATA_DIR
from app.risk import load_series

Z_SERVICE = 1.65
RELIABILITY_BUFFER = 0.5

ABC_A_CUT, ABC_B_CUT = 0.70, 0.90   # calibrated against scenario_labels.abc_actual (exact match)
XYZ_X_CUT, XYZ_Y_CUT = 0.25, 0.35   # calibrated against scenario_labels.xyz_actual (90% agreement)

PRIOR_N = 5               # pseudo-orders of prior when scoring a supplier
ONTIME_PRIOR = 0.85
QUALITY_PRIOR = 0.05
W_ONTIME, W_DELAY, W_VARIANCE, W_QUALITY = 0.40, 0.25, 0.20, 0.15
DELAY_CAP_DAYS = 7.0      # an average delay of 7+ days scores 0 on the delay part
STD_CAP_DAYS = 5.0        # a delay std of 5+ days scores 0 on the variance part
QUALITY_CAP = 0.20        # 20%+ of POs with quality issues scores 0 on the quality part

PRICE_COLS = ["unit_price", "selling_price", "price", "unit_cost", "cost_price", "cost"]
QUALITY_COLS = ["quality_issue", "quality_issues", "has_quality_issue", "quality_issue_flag", "defective", "defect_flag"]


# ---------------------------------------------------------------- safety stock and reorder

def safety_stock(sigma_daily, lead_time_days, mean_daily=0.0, lt_std_days=0.0, z=Z_SERVICE):
    if lead_time_days <= 0:
        raise ValueError("lead_time_days must be positive")
    var = lead_time_days * float(sigma_daily) ** 2 + (float(mean_daily) * float(lt_std_days)) ** 2
    return float(z * math.sqrt(var))


def smart_reorder(forecast_ltd, lead_time_days, sigma_daily, stock, on_order=0.0,
                  reliability=100.0, avg_delay_days=0.0, lt_std_days=0.0, z=Z_SERVICE):
    """forecast_ltd = forecast demand over the nominal lead time. reliability = supplier score 0-100."""
    if lead_time_days <= 0:
        raise ValueError("lead_time_days must be positive")
    reliability = min(max(float(reliability), 0.0), 100.0)
    daily = max(float(forecast_ltd), 0.0) / lead_time_days
    eff_lt = lead_time_days + max(float(avg_delay_days), 0.0)
    demand = daily * eff_lt
    ss = safety_stock(sigma_daily, lead_time_days, daily, lt_std_days, z)
    buffer = ss * (1 + RELIABILITY_BUFFER * (1 - reliability / 100))
    target = demand + buffer
    position = float(stock) + float(on_order)
    qty = max(0, math.ceil(target - position - 1e-9))
    return {
        "order_qty": int(qty),
        "needs_reorder": qty > 0,
        "reorder_point": round(target, 1),
        "demand_over_lead_time": round(demand, 1),
        "safety_stock": round(buffer, 1),
        "effective_lead_time_days": round(eff_lt, 1),
        "inventory_position": round(position, 1),
        "days_of_cover": round(float(stock) / daily, 1) if daily > 0 else None,
    }


# ---------------------------------------------------------------- ABC-XYZ

def abc_classify(values):
    """values: annual value per product (Series). Returns a Series of 'A'/'B'/'C' with the same index."""
    v = pd.Series(values, dtype=float).clip(lower=0)
    total = v.sum()
    if total <= 0:
        return pd.Series("C", index=v.index)
    ordered = v.sort_values(ascending=False)
    share_before = (ordered.cumsum() - ordered) / total
    cls = np.select([share_before < ABC_A_CUT, share_before < ABC_B_CUT], ["A", "B"], "C")
    return pd.Series(cls, index=ordered.index).reindex(v.index)


def xyz_classify(cv):
    c = pd.Series(cv, dtype=float)
    cls = np.select([c < XYZ_X_CUT, c < XYZ_Y_CUT], ["X", "Y"], "Z")
    return pd.Series(cls, index=c.index)


# ---------------------------------------------------------------- supplier reliability

def _flag(s):
    if s.dtype == object:
        return s.astype(str).str.strip().str.lower().isin(["true", "yes", "y", "1", "1.0"]).astype(float)
    return (pd.to_numeric(s, errors="coerce").fillna(0) > 0).astype(float)


def reliability_from_metrics(on_time, avg_delay, delay_std, quality_rate):
    s = (W_ONTIME * min(max(on_time, 0.0), 1.0)
         + W_DELAY * (1 - min(avg_delay / DELAY_CAP_DAYS, 1))
         + W_VARIANCE * (1 - min(delay_std / STD_CAP_DAYS, 1))
         + W_QUALITY * (1 - min(quality_rate / QUALITY_CAP, 1)))
    return round(100 * s, 1)


def supplier_scores(pos):
    """pos needs: supplier_id, status, delay_days, quality_issue. Only delivered POs count."""
    d = pos[pos["status"] == "Delivered"].copy()
    d["delay_days"] = pd.to_numeric(d["delay_days"], errors="coerce").fillna(0.0)
    d["late"] = (d["delay_days"] > 0).astype(float)
    d["delay_pos"] = d["delay_days"].clip(lower=0)
    d["issue"] = _flag(d["quality_issue"])
    g = d.groupby("supplier_id")
    out = pd.DataFrame({
        "delivered_pos": g.size(),
        "late_pos": g["late"].sum(),
        "avg_delay_days": g["delay_pos"].mean(),
        "delay_std_days": g["delay_days"].std(ddof=1).fillna(0.0),
        "issue_pos": g["issue"].sum(),
    })
    n = out["delivered_pos"]
    out["on_time_rate"] = ((n - out["late_pos"]) + ONTIME_PRIOR * PRIOR_N) / (n + PRIOR_N)
    out["quality_issue_rate"] = (out["issue_pos"] + QUALITY_PRIOR * PRIOR_N) / (n + PRIOR_N)
    out["reliability_score"] = [
        reliability_from_metrics(r.on_time_rate, r.avg_delay_days, r.delay_std_days, r.quality_issue_rate)
        for r in out.itertuples()]
    out["risk_score"] = (100 - out["reliability_score"]).round(1)
    out["risk_level"] = np.select([out["risk_score"] < 20, out["risk_score"] < 40], ["Low", "Medium"], "High")
    return out.drop(columns=["late_pos", "issue_pos"]).round(3)


NEUTRAL_SUPPLIER = {"reliability_score": reliability_from_metrics(ONTIME_PRIOR, 0.0, 0.0, QUALITY_PRIOR),
                    "avg_delay_days": 0.0, "delay_std_days": 0.0}


# ---------------------------------------------------------------- data loading (CLI and Day 9)

def _need(df, names, what, fname):
    for n in names:
        if n in df.columns:
            return n
    raise ValueError(f"No {what} column in {fname}. Looked for {names}; the file has {list(df.columns)}. "
                     f"Add the right name to the list at the top of decision.py.")


def load_decision_inputs():
    products = pd.read_csv(DATA_DIR / "products.csv")
    pos = pd.read_csv(DATA_DIR / "purchase_orders.csv")
    price_col = _need(products, PRICE_COLS, "unit price", "products.csv")
    qcol = _need(pos, QUALITY_COLS, "quality issue", "purchase_orders.csv")
    pos = pos.rename(columns={qcol: "quality_issue"})
    if "supplier_id" not in products.columns:
        ids = _need(products, ["supplier_ids", "supplier"], "supplier", "products.csv")
        # a product can list several suppliers; the first one is treated as its primary supplier
        products["supplier_id"] = products[ids].astype(str).str.findall(r"[^\s,;|\[\]'\"]+").str[0]
    if "supplier_id" not in pos.columns:
        pos = pos.merge(products[["product_id", "supplier_id"]], on="product_id", how="left")
    return products, pos, price_col


def product_stats(series, products, price_col):
    meta = products.set_index("product_id")
    rows = []
    for pid, s in series.items():
        f = s["frame"]
        u = f["units_sold"].astype(float)
        weekly = pd.Series(u.to_numpy(), index=pd.DatetimeIndex(f["date"])).resample("W-SUN").sum().tail(52)
        mean_w = weekly.mean()
        rows.append({
            "product_id": pid, "name": s["name"], "lead_time_days": s["lt"],
            "stock": float(f["stock_on_hand"].iloc[-1]),
            "mean_daily_28": float(u.tail(28).mean()),
            "sigma_daily_60": float(u.tail(60).std(ddof=1)),
            "weekly_cv": float(weekly.std(ddof=1) / mean_w) if mean_w > 0 else float("inf"),
            "annual_value": float(u.tail(365).sum() * float(meta.loc[pid, price_col])),
            "supplier_id": str(meta.loc[pid, "supplier_id"]),
        })
    df = pd.DataFrame(rows)
    df["abc"] = abc_classify(df["annual_value"].set_axis(df["product_id"])).to_numpy()
    df["xyz"] = xyz_classify(df["weekly_cv"]).to_numpy()
    df["abc_xyz"] = df["abc"] + df["xyz"]
    return df


def main():
    products, pos, price_col = load_decision_inputs()
    stats = product_stats(load_series(), products, price_col)
    sup = supplier_scores(pos)
    print(f"Products whose supplier has no PO history: {int((~stats['supplier_id'].isin(sup.index)).sum())} of {len(stats)}")
    print("Supplier reliability:")
    print(sup.sort_values("reliability_score").to_string())

    print(f"\nABC-XYZ matrix (products):")
    print(pd.crosstab(stats["abc"], stats["xyz"]).to_string())
    print(f"A products: {int((stats['abc'] == 'A').sum())} | weekly CV quartiles: "
          f"{stats['weekly_cv'].replace(np.inf, np.nan).quantile([.25, .5, .75]).round(2).tolist()}")

    sup_map = sup.to_dict("index")
    rows = []
    for r in stats.to_dict("records"):
        sc = sup_map.get(r["supplier_id"], NEUTRAL_SUPPLIER)
        res = smart_reorder(r["mean_daily_28"] * r["lead_time_days"], r["lead_time_days"], r["sigma_daily_60"],
                            r["stock"], reliability=sc["reliability_score"],
                            avg_delay_days=sc["avg_delay_days"], lt_std_days=sc["delay_std_days"])
        rows.append({"product_id": r["product_id"], "name": r["name"], "abc_xyz": r["abc_xyz"],
                     "stock": r["stock"], "reorder_point": res["reorder_point"], "order_qty": res["order_qty"],
                     "supplier_score": sc["reliability_score"]})
    out = pd.DataFrame(rows)
    print(f"\nProducts needing a reorder now: {int(out['order_qty'].gt(0).sum())} of {len(out)} "
          f"(demand stand-in: last 28 days x lead time, no open POs counted)")
    print(out.sort_values("order_qty", ascending=False).head(10).to_string(index=False))

    scen = pd.read_csv(DATA_DIR / "scenario_labels.csv")[["product_id", "stock_scenario"]]
    chk = out.merge(scen, on="product_id")
    print("\nShare needing reorder by planted stock scenario (expect reorder high, over/well low):")
    print(chk.groupby("stock_scenario")["order_qty"].agg(products="size", needing=lambda s: int((s > 0).sum())).to_string())


if __name__ == "__main__":
    main()