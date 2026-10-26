"""
Demand trend and seasonality detection (Day 7), on weekly demand over the last 104 weeks (two full years).

Trend: year-over-year change = (mean of the last 52 weeks / mean of the 52 weeks before) - 1.
  A plain linear slope is biased by seasonality; a 52-week difference cancels any 52-week pattern exactly.
  increasing / decreasing needs |change| >= 15% AND |z| >= 2 for the 52 paired weekly differences.
Seasonality: lag-52 autocorrelation of the detrended weekly series (this year vs last year, week by week).
  seasonal if r >= 0.30 (about p < 0.05 with 52 pairs).
Run `python -m app.trend` to compare against the planted ground truth (scenario_labels.csv, validation only).
"""
import calendar
from functools import lru_cache

import numpy as np
import pandas as pd
from scipy import stats

from app.preprocessing import DATA_DIR, build_weekly_dataset

PERIOD = 52
WINDOW = 2 * PERIOD
TREND_PCT = 15.0
TREND_Z = 2.0
SEASONAL_R = 0.30


def analyze_series(weekly):
    """weekly needs columns week_start and units. Returns plain Python types (JSON-safe)."""
    w = weekly.sort_values("week_start").tail(WINDOW)
    if len(w) < WINDOW:
        raise ValueError(f"Need {WINDOW} complete weeks of history, found {len(w)}")
    y = w["units"].to_numpy(float)
    y1, y2 = y[:PERIOD], y[PERIOD:]

    # ---- trend
    d = y2 - y1
    level1 = y1.mean()
    yoy = float(d.mean() / level1 * 100) if level1 > 0 else 0.0
    se = d.std(ddof=1) / np.sqrt(PERIOD)
    z = float(d.mean() / se) if se > 0 else 0.0
    slope = float(d.mean() / PERIOD)  # units per week, per week
    if abs(yoy) >= TREND_PCT and abs(z) >= TREND_Z:
        trend = "increasing" if yoy > 0 else "decreasing"
    else:
        trend = "stable"

    # ---- seasonality (trend removed so a ramp is not mistaken for a season)
    t = np.arange(WINDOW)
    yd = y - slope * t
    a, b = yd[:PERIOD], yd[PERIOD:]
    if a.std() == 0 or b.std() == 0:
        r, p = 0.0, 1.0
    else:
        r, p = stats.pearsonr(a, b)
    seasonal = bool(r >= SEASONAL_R and p < 0.05)

    level = y.mean()
    adj = yd - yd.mean() + level
    months = (w["week_start"] + pd.Timedelta(days=3)).dt.month.to_numpy()
    monthly = pd.Series(adj).groupby(months).mean().reindex(range(1, 13))
    monthly_index = [round(float(value / level), 3) if level > 0 else 1.0 for value in monthly]

    peak_month, peak_uplift = None, None
    if seasonal:
        peak_month = calendar.month_abbr[int(monthly.idxmax())]
        peak_uplift = round(float((monthly.max() / level - 1) * 100), 1) if level > 0 else None

    if seasonal and trend == "stable":
        pattern = "seasonal"
    elif seasonal:
        pattern = f"{trend} + seasonal"
    else:
        pattern = trend

    return {
        "trend": trend,
        "yoy_change_pct": round(yoy, 1),
        "trend_z": round(z, 2),
        "weekly_slope": round(slope, 3),
        "seasonal": seasonal,
        "seasonal_strength": round(float(r), 2),
        "peak_month": peak_month,
        "peak_uplift_pct": peak_uplift,
        "monthly_index": monthly_index,
        "weekly_series": [
            {"week_start": row.week_start.date().isoformat(), "units": float(row.units)}
            for row in w.itertuples()
        ],
        "pattern": pattern,
        "window": {"start": w["week_start"].iloc[0].date().isoformat(),
                   "end": (w["week_start"].iloc[-1] + pd.Timedelta(days=6)).date().isoformat(),
                   "weeks": int(len(w))},
    }


@lru_cache(maxsize=1)
def _weekly():
    weekly, _ = build_weekly_dataset()
    return weekly


def trend_for_product(product_id):
    w = _weekly()
    w = w[w["product_id"].astype(str) == str(product_id)]
    if w.empty:
        raise KeyError(product_id)
    return {"product_id": str(product_id), "name": str(w["name"].iloc[0]), **analyze_series(w)}


def all_trends():
    out = []
    for pid in _weekly()["product_id"].unique():
        try:
            out.append(trend_for_product(pid))
        except ValueError:
            continue
    return out


def main():
    """Validate against the planted ground truth (validation only, never used by the detector)."""
    res = pd.DataFrame(all_trends())
    labels = pd.read_csv(DATA_DIR / "scenario_labels.csv")[["product_id", "archetype", "seasonality"]]
    res = res.merge(labels, on="product_id")

    def trend_ok(r):
        want = {"increasing": "increasing", "decreasing": "decreasing", "stable": "stable", "seasonal": "stable"}
        return (r["trend"] != "stable") if r["archetype"] == "trend_seasonal" else r["trend"] == want[r["archetype"]]

    res["trend_ok"] = res.apply(trend_ok, axis=1)
    res["seasonal_ok"] = res["seasonal"] == (res["seasonality"] != "none")

    cols = ["product_id", "name", "archetype", "seasonality", "pattern", "yoy_change_pct", "trend_z", "seasonal_strength"]
    print("Mismatches:")
    bad = res[~(res["trend_ok"] & res["seasonal_ok"])]
    print(bad[cols].to_string(index=False) if len(bad) else "  none")
    print(f"\nTrend agreement:       {res['trend_ok'].mean() * 100:.0f}% ({int(res['trend_ok'].sum())}/{len(res)})")
    print(f"Seasonality agreement: {res['seasonal_ok'].mean() * 100:.0f}% ({int(res['seasonal_ok'].sum())}/{len(res)})")
    print("\nDetected patterns:")
    print(res["pattern"].value_counts().to_string())
    print("\nPlanted archetypes:")
    print(res["archetype"].value_counts().to_string())

    out = DATA_DIR.parent / "models" / "trend_report.csv"
    out.parent.mkdir(exist_ok=True)
    res[cols + ["trend_ok", "seasonal_ok"]].to_csv(out, index=False)
    print(f"\nSaved {out}")


if __name__ == "__main__":
    main()
