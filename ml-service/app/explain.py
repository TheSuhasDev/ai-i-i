"""
Explainable AI for the stockout-risk model (Day 11).

SHAP values (TreeExplainer for a Random Forest; exact coefficient x standardised value for logistic regression)
are summed into six plain-language factor groups. Contributions explain the model's RAW score; the displayed
risk % is that score after calibration, so each factor is reported as a share of the total effect.
Run `python -m app.explain` to validate against the planted drivers (scenario_labels.csv, validation only).
"""
from functools import lru_cache

import numpy as np
import pandas as pd

from app.risk import RFEATS, apply_calibration, load_bundle, load_series, product_features, risk_for_product, risk_level

GROUPS = {
    "stock": ["stock_ratio", "cover_ltd", "cover_days"],
    "demand": ["mean7_ratio", "growth_28_90"],
    "volatility": ["cv_60"],
    "lead_time": ["lead_time_days"],
    "supplier": ["sup_ontime", "sup_delay"],
    "season": ["doy_sin", "doy_cos"],
}
LABELS = {
    "stock": "Stock level", "demand": "Demand trend", "volatility": "Demand volatility",
    "lead_time": "Lead time", "supplier": "Supplier reliability", "season": "Time of year",
}
MIN_SHARE = 3.0  # factors below this share of the total effect are left out as negligible


@lru_cache(maxsize=1)
def _tree_explainer():
    import shap
    return shap.TreeExplainer(load_bundle()["model"])


def contributions(X):
    """Per-feature contributions for one row. Returns (values, base, raw_probability, method)."""
    bundle = load_bundle()
    model = bundle["model"]
    raw = float(model.predict_proba(X)[0, 1])

    if bundle["algorithm"] == "rf":
        explainer = _tree_explainer()
        sv = explainer.shap_values(X)
        if isinstance(sv, list):                      # older shap: one array per class
            vals = np.asarray(sv[1])[0]
        else:
            sv = np.asarray(sv)
            vals = sv[0, :, 1] if sv.ndim == 3 else sv[0]
        base = float(np.ravel(explainer.expected_value)[-1])
        return vals, base, raw, "SHAP TreeExplainer on the Random Forest (model probability units)"

    scaler, lr = model[0], model[-1]                  # logistic regression pipeline
    vals = lr.coef_[0] * scaler.transform(X)[0]       # exact: the scaled training mean is 0
    return vals, float(lr.intercept_[0]), raw, "linear contributions: coefficient x standardised value (log-odds units)"


def group_contributions(vals):
    idx = {f: i for i, f in enumerate(RFEATS)}
    return {g: float(sum(vals[idx[f]] for f in feats)) for g, feats in GROUPS.items()}


def _reason(group, up, row, frame, lt):
    stock = float(frame["stock_on_hand"].iloc[-1])
    if group == "stock":
        ratio, cover = float(row["stock_ratio"]), float(row["cover_days"])
        if up:
            return (f"Current stock ({stock:.0f} units) is low: about {cover:.1f} days of recent demand, against a "
                    f"{lt}-day lead time plus safety stock (stock ratio {ratio:.2f}; below 1 means short).")
        return f"Current stock ({stock:.0f} units) is comfortable: about {cover:.0f} days of cover (stock ratio {ratio:.2f})."
    if group == "demand":
        m7, g = (float(row["mean7_ratio"]) - 1) * 100, (float(row["growth_28_90"]) - 1) * 100
        lead = "Demand is rising" if up else "Demand is flat or falling"
        return (f"{lead}: the last 7 days are {m7:+.0f}% versus the 28-day average, and the 28-day average "
                f"is {g:+.0f}% versus the 90-day average.")
    if group == "lead_time":
        return (f"The lead time is long ({lt} days), so stock has to cover more demand before a new order can arrive."
                if up else f"The short {lt}-day lead time means a new order arrives quickly.")
    if group == "supplier":
        on, delay = float(row["sup_ontime"]) * 100, float(row["sup_delay"])
        return (f"The supplier has a record of delays (on-time rate {on:.0f}%, recent average delay {delay:.1f} days)."
                if up else f"The supplier has been reliable (on-time rate {on:.0f}%, recent average delay {delay:.1f} days).")
    if group == "volatility":
        cv = float(row["cv_60"])
        return (f"Demand is volatile (variation {cv:.2f} of the average), which calls for more safety stock."
                if up else f"Demand is steady (variation {cv:.2f} of the average).")
    return ("This time of year has historically carried a higher stockout risk."
            if up else "This time of year has historically carried a lower stockout risk.")


def _feature_row(product_id, stock=None):
    s = load_series().get(str(product_id))
    if s is None:
        raise KeyError(product_id)
    f = s["frame"].copy()
    if stock is not None:
        f.loc[f.index[-1], "stock_on_hand"] = float(stock)
    row = product_features(f, s["lt"]).iloc[-1]
    if row[RFEATS].isna().any():
        raise ValueError("Not enough history (need 60+ days) to explain this product")
    return s, f, row


def explain_risk(product_id, stock=None, top_n=4):
    bundle = load_bundle()
    s, f, row = _feature_row(product_id, stock)
    X = pd.DataFrame([row[RFEATS].astype(float).to_dict()])
    vals, base, raw, method = contributions(X)

    p = float(apply_calibration(bundle["calibrator"], np.array([raw]))[0])
    pct = round(p * 100, 1)
    level = risk_level(pct)

    # additivity check: base + sum(contributions) must reproduce the raw model score
    total = base + float(np.sum(vals))
    recon = total if bundle["algorithm"] == "rf" else 1 / (1 + np.exp(-total))
    gap = abs(recon - raw)

    groups = group_contributions(vals)
    denom = sum(abs(v) for v in groups.values()) or 1.0
    ranked = sorted(groups.items(), key=lambda kv: -abs(kv[1]))
    factors = []
    for g, v in ranked:
        share = abs(v) / denom * 100
        if share < MIN_SHARE or len(factors) >= top_n:
            continue
        up = v > 0
        factors.append({
            "group": g, "label": LABELS[g], "direction": "raises" if up else "lowers",
            "contribution": round(float(v), 4), "share_pct": round(share, 1),
            "reason": _reason(g, up, row, f, s["lt"]),
        })

    raising = [x for x in factors if x["direction"] == "raises"]
    summary = (f"{level} stockout risk ({pct:.0f}%). Main reason: {raising[0]['reason']}" if raising
               else f"{level} stockout risk ({pct:.0f}%). Nothing is pushing the risk up strongly.")

    return {
        "product_id": str(product_id), "name": s["name"], "as_of": f["date"].iloc[-1].date().isoformat(),
        "risk_pct": pct, "risk_level": level, "raw_score": round(raw, 4), "base_value": round(base, 4),
        "additivity_gap": float(gap), "method": method, "summary": summary, "factors": factors,
        "feature_contributions": {k: round(float(v), 4) for k, v in zip(RFEATS, vals)},
        "note": ("Shares show how much each factor moves the model's score. The risk % is that score after "
                 "calibration, so shares are relative importance, not percentage points. Explanations describe "
                 "the model, not a proven cause."),
    }


DRIVER_GROUP = {"low_stock": "stock", "rising_demand": "demand", "late_supplier": "supplier", "long_lead_time": "lead_time"}


def main():
    from app.preprocessing import DATA_DIR
    rows, gaps, mismatch = [], [], 0
    for pid in load_series():
        try:
            e = explain_risk(pid)
        except ValueError:
            continue
        gaps.append(e["additivity_gap"])
        if abs(e["risk_pct"] - risk_for_product(pid)["risk_pct"]) > 0.05:
            mismatch += 1
        raising = [x["group"] for x in e["factors"] if x["direction"] == "raises"]
        rows.append({"product_id": pid, "name": e["name"], "risk_pct": e["risk_pct"],
                     "top": raising[0] if raising else "-", "raising": ",".join(raising[:3])})
    df = pd.DataFrame(rows)
    lab = pd.read_csv(DATA_DIR / "scenario_labels.csv")[["product_id", "xai_driver"]]
    df = df.merge(lab, on="product_id")

    print(f"Method: {explain_risk(df['product_id'].iloc[0])['method']}")
    print(f"Max additivity gap (base + sum of contributions vs raw score): {max(gaps):.2e}")
    print(f"Explain risk % differs from /risk for {mismatch} of {len(df)} products (expect 0)\n")

    risky = df[df["risk_pct"] >= 30]
    print(f"Top raising factor among the {len(risky)} products at risk (30% or more):")
    print(risky["top"].value_counts().to_string())

    check = risky[risky["xai_driver"].isin(DRIVER_GROUP)].copy()
    check["want"] = check["xai_driver"].map(DRIVER_GROUP)
    check["hit1"] = check["want"] == check["top"]
    check["hit3"] = check.apply(lambda r: r["want"] in r["raising"].split(","), axis=1)
    print(f"\nPlanted driver vs explanation, for {len(check)} at-risk products with a planted driver:")
    print(f"  planted driver is the TOP factor:       {int(check['hit1'].sum())}/{len(check)}")
    print(f"  planted driver is among the top 3:      {int(check['hit3'].sum())}/{len(check)}")
    print(check[["product_id", "name", "risk_pct", "xai_driver", "raising"]].to_string(index=False))


if __name__ == "__main__":
    main()