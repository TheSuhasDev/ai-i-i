"""
Stockout-risk model (Day 7).

Label (history only): on day t, stock[t] < lead-time demand + safety stock, where
  lead-time demand = sum of units sold on days t+1 .. t+lead_time
  safety stock     = 1.65 * std(units, last 60 days up to t) * sqrt(lead_time)
This is the Day 2 definition (about 15.8% positives).

Features use ONLY data up to day t (past sales, recorded stock, POs already delivered by t).
The label looks forward because it is the target; the features never do.
"""
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_recall_curve
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app.preprocessing import DATA_DIR

RISK_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "risk_model.joblib"
Z_SERVICE = 1.65
VAL_DAYS = 60
ONTIME_PRIOR = 0.85   # neutral prior until a product has delivered POs
DELAY_PRIOR = 1.0

RFEATS = [
    "stock_ratio",     # stock / (recent lead-time demand + safety stock)  <- the rule-of-thumb ratio
    "cover_ltd",       # stock / recent lead-time demand
    "cover_days",      # days of cover at the recent demand rate
    "mean7_ratio",     # last 7 days vs last 28 days (momentum, surges)
    "growth_28_90",    # last 28 days vs last 90 days (trend)
    "cv_60",           # demand volatility
    "lead_time_days",
    "sup_ontime",      # on-time rate of the product's delivered POs so far
    "sup_delay",       # mean positive delay of its last 5 delivered POs
    "doy_sin", "doy_cos",
]


# ---------------------------------------------------------------- features and labels

def supplier_history(pos, daily):
    """For every (product, day): supplier performance from POs already delivered ON OR BEFORE that day."""
    d = pos[pos["status"] == "Delivered"].dropna(subset=["actual_delivery_date"]).copy()
    d["delay_days"] = pd.to_numeric(d["delay_days"])
    d["late"] = (d["delay_days"] > 0).astype(float)
    d["delay_pos"] = d["delay_days"].clip(lower=0)
    d = d.sort_values(["product_id", "actual_delivery_date"])
    g = d.groupby("product_id")
    d["sup_ontime"] = 1 - g["late"].transform(lambda s: s.expanding().mean())
    d["sup_delay"] = g["delay_pos"].transform(lambda s: s.rolling(5, min_periods=1).mean())

    parts = []
    for pid, days in daily.groupby("product_id"):
        left = days[["date"]].sort_values("date")
        right = d[d["product_id"] == pid][["actual_delivery_date", "sup_ontime", "sup_delay"]]
        if len(right):
            m = pd.merge_asof(left, right, left_on="date", right_on="actual_delivery_date")
            m.index = left.index
        else:
            m = left.assign(sup_ontime=np.nan, sup_delay=np.nan)
        parts.append(m[["sup_ontime", "sup_delay"]])
    res = pd.concat(parts).reindex(daily.index)
    return res.fillna({"sup_ontime": ONTIME_PRIOR, "sup_delay": DELAY_PRIOR})


def product_features(f, lt, on_order=0.0, demand_rate=None):
    """Features for every day of ONE product. f needs: date, units_sold, stock_on_hand, sup_ontime, sup_delay."""
    u = f["units_sold"].astype(float)
    s = f["stock_on_hand"].astype(float)
    if on_order > 0:
        s = s.copy()
        s.iloc[-1] += float(on_order)
    mean7 = u.rolling(7, min_periods=7).mean()
    mean28 = u.rolling(28, min_periods=28).mean()
    mean90 = u.rolling(90, min_periods=60).mean()
    std60 = u.rolling(60, min_periods=30).std()

    m28 = mean28.clip(lower=0.5)
    d_rate = m28.copy()
    if demand_rate is not None and demand_rate > 0:
        d_rate.iloc[-1] = float(demand_rate)

    ltd_hat = d_rate * lt
    ss_hat = Z_SERVICE * std60 * np.sqrt(lt)
    doy = f["date"].dt.dayofyear

    return pd.DataFrame({
        "date": f["date"],
        "stock_ratio": (s / (ltd_hat + ss_hat)).clip(0, 10),
        "cover_ltd": (s / ltd_hat).clip(0, 20),
        "cover_days": (s / d_rate).clip(0, 365),
        "mean7_ratio": (mean7 / m28).clip(0, 5),
        "growth_28_90": (m28 / mean90.clip(lower=0.5)).clip(0, 5),
        "cv_60": (std60 / m28).clip(0, 5),
        "lead_time_days": float(lt),
        "sup_ontime": f["sup_ontime"],
        "sup_delay": f["sup_delay"],
        "doy_sin": np.sin(2 * np.pi * doy / 365.25),
        "doy_cos": np.cos(2 * np.pi * doy / 365.25),
    })


def stockout_labels(units, stock, lt):
    """Return (y, ltd, ss). y is NaN where the label cannot be computed (first 29 days, last lt days)."""
    units = np.asarray(units, float)
    stock = np.asarray(stock, float)
    rev = pd.Series(units[::-1]).rolling(lt, min_periods=lt).sum().to_numpy()[::-1]  # sum of units[t .. t+lt-1]
    ltd = np.roll(rev, -1)                                                            # sum of units[t+1 .. t+lt]
    ltd[-1] = np.nan
    std60 = pd.Series(units).rolling(60, min_periods=30).std().to_numpy()
    ss = Z_SERVICE * std60 * np.sqrt(lt)
    valid = ~np.isnan(ltd) & ~np.isnan(ss)
    y = np.where(valid, (stock < ltd + ss).astype(float), np.nan)
    return y, ltd, ss


@lru_cache(maxsize=1)
def load_series():
    """Per product: daily frame (units, recorded stock, supplier history), lead time and name."""
    sales = pd.read_csv(DATA_DIR / "sales.csv", parse_dates=["date"], usecols=["date", "product_id", "units_sold"])
    stock = pd.read_csv(DATA_DIR / "stock_history.csv", parse_dates=["date"],
                        usecols=["date", "product_id", "stock_on_hand"])
    products = pd.read_csv(DATA_DIR / "products.csv")
    pos = pd.read_csv(DATA_DIR / "purchase_orders.csv", parse_dates=["actual_delivery_date"])

    daily = (sales.merge(stock, on=["product_id", "date"], how="inner")
             .sort_values(["product_id", "date"]).reset_index(drop=True))
    daily = daily.join(supplier_history(pos, daily))

    meta = products.set_index("product_id")
    series = {}
    for pid, g in daily.groupby("product_id"):
        series[pid] = {"frame": g.reset_index(drop=True), "lt": int(meta.loc[pid, "lead_time_days"]),
                       "name": str(meta.loc[pid, "name"])}
    return series


def build_risk_table(series):
    parts = []
    for pid, s in series.items():
        f = s["frame"]
        feats = product_features(f, s["lt"])
        y, ltd, ss = stockout_labels(f["units_sold"], f["stock_on_hand"], s["lt"])
        feats["y"], feats["ltd"], feats["ss"], feats["product_id"] = y, ltd, ss, pid
        parts.append(feats)
    return pd.concat(parts, ignore_index=True)


def split_risk_rows(tbl, split_date):
    """Time-based split with purging: a training day's whole label window (day + lead time) must end before the split."""
    lt = pd.to_timedelta(tbl["lead_time_days"], unit="D")
    train = tbl[tbl["date"] + lt < split_date]
    test = tbl[tbl["date"] >= split_date]
    return train, test


# ---------------------------------------------------------------- training helpers

def risk_candidates():
    return {
        "rf": RandomForestClassifier(n_estimators=300, max_depth=8, min_samples_leaf=20, max_features="sqrt",
                                     class_weight="balanced_subsample", n_jobs=-1, random_state=42),
        "logreg": make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=2000)),
    }


def _logit(p):
    p = np.clip(np.asarray(p, float), 1e-4, 1 - 1e-4)
    return np.log(p / (1 - p)).reshape(-1, 1)


def apply_calibration(calibrator, raw):
    return calibrator.predict_proba(_logit(raw))[:, 1]


def best_f1_threshold(y, p):
    prec, rec, thr = precision_recall_curve(y, p)
    f1 = 2 * prec[:-1] * rec[:-1] / np.maximum(prec[:-1] + rec[:-1], 1e-12)
    return float(thr[int(np.argmax(f1))])


def fit_with_calibration(rows, val_start, algo=None):
    """Fit on rows whose label window ends before val_start; pick the algorithm, calibrate and set the threshold on rows from val_start on."""
    lt = pd.to_timedelta(rows["lead_time_days"], unit="D")
    fit_rows = rows[rows["date"] + lt < val_start]
    val_rows = rows[rows["date"] >= val_start]
    yv = val_rows["y"].astype(int).to_numpy()

    fitted, scores = {}, {}
    for name, est in risk_candidates().items():
        if algo and name != algo:
            continue
        est.fit(fit_rows[RFEATS], fit_rows["y"].astype(int))
        raw = est.predict_proba(val_rows[RFEATS])[:, 1]
        fitted[name] = (est, raw)
        scores[name] = float(average_precision_score(yv, raw))
    best = max(scores, key=scores.get)
    est, raw = fitted[best]

    calibrator = LogisticRegression().fit(_logit(raw), yv)
    p_cal = apply_calibration(calibrator, raw)
    return {"name": best, "model": est, "calibrator": calibrator,
            "threshold": best_f1_threshold(yv, p_cal), "val_scores": scores}


# ---------------------------------------------------------------- live inference

def risk_level(pct):
    """Provisional bands. Alert priority (Day 9) combines risk with expected stockout vs delivery dates."""
    return "High" if pct >= 60 else "Medium" if pct >= 30 else "Low"


@lru_cache(maxsize=1)
def load_bundle():
    return joblib.load(RISK_MODEL_PATH)  # FileNotFoundError if not trained yet


def risk_for_product(product_id, stock=None, on_order=0.0, demand_rate=None):
    """Stockout risk as of the last data day. `stock` and `on_order` optionally override."""
    bundle = load_bundle()
    s = load_series().get(str(product_id))
    if s is None:
        raise KeyError(product_id)

    f = s["frame"].copy()
    if stock is not None:
        f.loc[f.index[-1], "stock_on_hand"] = float(stock)
    row = product_features(f, s["lt"], on_order=float(on_order or 0.0), demand_rate=demand_rate).iloc[-1]
    if row[RFEATS].isna().any():
        raise ValueError("Not enough history (need 60+ days) to score this product")

    X = pd.DataFrame([row[RFEATS].astype(float).to_dict()])
    raw = bundle["model"].predict_proba(X)[:, 1]
    p = float(apply_calibration(bundle["calibrator"], raw)[0])
    pct = round(p * 100, 1)

    effective_demand_rate = float(demand_rate if demand_rate is not None and demand_rate > 0 else f["units_sold"].tail(28).mean())

    return {
        "product_id": str(product_id),
        "name": s["name"],
        "as_of": f["date"].iloc[-1].date().isoformat(),
        "stock": float(f["stock_on_hand"].iloc[-1]),
        "risk_probability": round(p, 4),
        "risk_pct": pct,
        "risk_level": risk_level(pct),
        "flagged": bool(p >= bundle["threshold"]),
        "threshold": round(bundle["threshold"], 4),
        "lead_time_days": s["lt"],
        "signals": {
            "stock_ratio": round(float(row["stock_ratio"]), 2),
            "days_of_cover": round(float(row["cover_days"]), 1),
            "avg_daily_demand_28d": round(float(f["units_sold"].tail(28).mean()), 1),
            "demand_rate": round(effective_demand_rate, 1),
            "demand_momentum_7d_vs_28d": round(float(row["mean7_ratio"]), 2),
            "demand_growth_28d_vs_90d": round(float(row["growth_28_90"]), 2),
            "supplier_on_time_rate": round(float(row["sup_ontime"]), 2),
            "supplier_recent_delay_days": round(float(row["sup_delay"]), 1),
        },
        "model": bundle["algorithm"],
        "label": "stock below lead-time demand + safety stock",
    }


def all_risks():
    out = []
    for pid in load_series():
        try:
            out.append(risk_for_product(pid))
        except ValueError:
            continue
    return sorted(out, key=lambda r: -r["risk_pct"])