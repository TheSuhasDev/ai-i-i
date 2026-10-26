"""
Anomaly detection (Day 11): Isolation Forest on abnormal sales and stock behaviour, plus a rule for extreme supplier delays.

Sales features (day t, trailing window only): units / mean of the previous 28 days, z-score, and how surprising a zero day is.
Stock features: the bookkeeping residual e_t = stock[t-1] - stock[t] - units[t] is 0 on a normal day. A count error shows
as residuals that REVERSE the next day (blip); a real restock does not reverse. Stock anomalies are therefore found
with a one-day delay. Features are scale-free (divided by recent daily demand) so one model covers every product.

Training/evaluation: fit on the first 548 days, score the held-out last 182 days, threshold = training-score quantile.
is_anomaly is used ONLY to evaluate, never as a feature. Run `python -m app.anomaly` to train, evaluate and save.
"""
import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, precision_recall_fscore_support, roc_auc_score

from app.preprocessing import DATA_DIR, TRAIN_DAYS

ANOMALY_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "anomaly_models.joblib"
ANOMALY_METRICS_PATH = ANOMALY_MODEL_PATH.with_name("anomaly_metrics.json")

SALES_FEATS = ["sales_ratio", "sales_z", "zero_surprise"]
STOCK_FEATS = ["stock_resid", "stock_resid_next", "stock_blip"]
CONTAM = {"sales": 0.03, "stock": 0.015}   # assumed anomaly rates; set the score threshold, not the training labels
PO_DELAY_THRESHOLD = 15                     # days; extreme supplier delay rule


# ---------------------------------------------------------------- features

def behaviour_features(f):
    """f: ONE product's daily frame sorted by date with units_sold and stock_on_hand."""
    u = f["units_sold"].astype(float).reset_index(drop=True)
    s = f["stock_on_hand"].astype(float).reset_index(drop=True)
    prior = u.shift(1)
    mean28 = prior.rolling(28, min_periods=28).mean()
    std28 = prior.rolling(28, min_periods=28).std()
    zero_share = (u == 0).astype(float).shift(1).rolling(28, min_periods=28).mean()
    m = mean28.clip(lower=1.0)

    e = s.shift(1) - s - u
    e_next = e.shift(-1)
    opposite = (e * e_next) < 0
    blip = pd.Series(np.where(opposite, np.minimum(e.abs(), e_next.abs()) / m, 0.0), index=u.index)
    blip = blip.where(e.notna() & e_next.notna() & m.notna())

    return pd.DataFrame({
        "sales_ratio": (u / m).clip(0, 10),
        "sales_z": ((u - mean28) / std28.clip(lower=1.0)).clip(-6, 6),
        "zero_surprise": (u == 0).astype(float) * (1 - zero_share),
        "stock_resid": (e.abs() / m).clip(0, 50),
        "stock_resid_next": (e_next.abs() / m).clip(0, 50),
        "stock_blip": blip.clip(0, 50),
        "expected_units": mean28,
        "stock_gap": e,
        "prior_stock": s.shift(1),
    })


@lru_cache(maxsize=1)
def load_behaviour_table():
    sales = pd.read_csv(DATA_DIR / "sales.csv", parse_dates=["date"],
                        usecols=["date", "product_id", "units_sold", "is_anomaly"]).rename(columns={"is_anomaly": "sales_anomaly"})
    stock = pd.read_csv(DATA_DIR / "stock_history.csv", parse_dates=["date"],
                        usecols=["date", "product_id", "stock_on_hand", "is_anomaly"]).rename(columns={"is_anomaly": "stock_anomaly"})
    daily = sales.merge(stock, on=["product_id", "date"]).sort_values(["product_id", "date"])
    parts = []
    for _, g in daily.groupby("product_id"):
        g = g.reset_index(drop=True)
        parts.append(pd.concat([g, behaviour_features(g)], axis=1))
    return pd.concat(parts, ignore_index=True)


@lru_cache(maxsize=1)
def _names():
    return pd.read_csv(DATA_DIR / "products.csv").set_index("product_id")["name"].to_dict()


# ---------------------------------------------------------------- model

def fit_iforest(X):
    return IsolationForest(n_estimators=300, random_state=42, n_jobs=-1).fit(X)


def anomaly_scores(model, X):
    return -model.score_samples(X)   # higher = more abnormal


def _prf(y, pred):
    p, r, f1, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    return {"precision": round(float(p), 4), "recall": round(float(r), 4), "f1": round(float(f1), 4),
            "flagged": int(np.sum(pred)), "true": int(np.sum(y))}


def main():
    tbl = load_behaviour_table().copy()
    split = tbl["date"].min() + pd.Timedelta(days=TRAIN_DAYS)
    bundle = {"contamination": CONTAM, "split_date": str(split.date()), "data_end": str(tbl["date"].max().date()),
              "trained_at": datetime.now(timezone.utc).isoformat()}
    report = {}

    specs = (("sales", SALES_FEATS, "sales_anomaly"), ("stock", STOCK_FEATS, "stock_anomaly"))
    for name, feats, label in specs:
        d = tbl.dropna(subset=feats)
        train, test = d[d["date"] < split], d[d["date"] >= split]
        model = fit_iforest(train[feats])
        thr = float(np.quantile(anomaly_scores(model, train[feats]), 1 - CONTAM[name]))
        score = anomaly_scores(model, test[feats])
        y = test[label].to_numpy()
        pred = (score >= thr).astype(int)

        if name == "sales":
            rule = ((test["sales_z"].abs() >= 3) | ((test["zero_surprise"] >= 0.9) & (test["expected_units"] >= 5))).astype(int).to_numpy()
            spike, zero = (y == 1) & (test["units_sold"].to_numpy() > 0), (y == 1) & (test["units_sold"].to_numpy() == 0)
            extra = {"recall_spikes": round(float(pred[spike].mean()), 3), "n_spikes": int(spike.sum()),
                     "recall_zero_days": round(float(pred[zero].mean()), 3), "n_zero_days": int(zero.sum())}
        else:
            rule = (test["stock_blip"] >= 1.0).astype(int).to_numpy()
            extra = {}

        report[name] = {
            "test_rows": int(len(test)), "base_rate": round(float(y.mean()), 4),
            "isolation_forest": _prf(y, pred), "rule_baseline": _prf(y, rule),
            "roc_auc": round(float(roc_auc_score(y, score)), 4), "pr_auc": round(float(average_precision_score(y, score)), 4),
            "threshold": round(thr, 4), **extra,
        }

        # production model: same recipe, fit on all rows
        full_model = fit_iforest(d[feats])
        bundle[f"{name}_model"] = full_model
        bundle[f"{name}_threshold"] = float(np.quantile(anomaly_scores(full_model, d[feats]), 1 - CONTAM[name]))

    # supplier delay rule vs the planted label
    pos = pd.read_csv(DATA_DIR / "purchase_orders.csv")
    pred = (pos["delay_days"].fillna(0) >= PO_DELAY_THRESHOLD).astype(int).to_numpy()
    report["supplier_delay_rule"] = {**_prf(pos["is_anomaly"].to_numpy(), pred), "rule": f"delay >= {PO_DELAY_THRESHOLD} days"}

    for name in ("sales", "stock"):
        r = report[name]
        print(f"\n{name.upper()} anomalies - test period ({r['test_rows']} rows, {r['base_rate'] * 100:.2f}% abnormal)")
        print(pd.DataFrame({"isolation_forest": r["isolation_forest"], "simple_rule": r["rule_baseline"]}).T.to_string())
        print(f"ROC-AUC {r['roc_auc']:.3f} | PR-AUC {r['pr_auc']:.3f} (random would score {r['base_rate']:.3f})")
        if name == "sales":
            print(f"Recall on spikes {r['recall_spikes']:.0%} (n={r['n_spikes']}), on zero-sales days {r['recall_zero_days']:.0%} (n={r['n_zero_days']})")
    print(f"\nSupplier delay rule: {report['supplier_delay_rule']}")

    ANOMALY_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, ANOMALY_MODEL_PATH)
    ANOMALY_METRICS_PATH.write_text(json.dumps({
        "generated_at": bundle["trained_at"], "split_date": bundle["split_date"],
        "method": "Isolation Forest (300 trees); threshold = training-score quantile at the assumed contamination",
        "contamination": CONTAM, "results": report,
        "notes": "is_anomaly is used only for evaluation. Stock anomalies are detected with a one-day delay.",
    }, indent=2))
    print(f"\nSaved {ANOMALY_METRICS_PATH.name} and {ANOMALY_MODEL_PATH.name}")


# ---------------------------------------------------------------- live listing

@lru_cache(maxsize=1)
def load_bundle():
    return joblib.load(ANOMALY_MODEL_PATH)  # FileNotFoundError if not trained yet


def recent_anomalies(days=90, product_id=None, limit=200, kind=None):
    bundle = load_bundle()
    tbl = load_behaviour_table()
    names = _names()
    end = tbl["date"].max()
    start = end - pd.Timedelta(days=days)
    t = tbl[tbl["date"] > start]
    if product_id is not None:
        t = t[t["product_id"] == str(product_id)]
        if t.empty:
            raise KeyError(product_id)
    out = []

    # ---- sales anomalies
    s = t.dropna(subset=SALES_FEATS).copy()
    if len(s):
        s["score"] = anomaly_scores(bundle["sales_model"], s[SALES_FEATS])
        for r in s[s["score"] >= bundle["sales_threshold"]].itertuples():
            if r.units_sold == 0 and (r.stock_on_hand <= 0 or (hasattr(r, "prior_stock") and r.prior_stock <= 0)):
                continue  # no sales because it was out of stock
            if r.units_sold == 0:
                atype = "zero_sales"
                msg = (f"No sales, although about {r.expected_units:.0f} units a day are normal and "
                       f"{r.stock_on_hand:.0f} units were in stock.")
            elif r.sales_z > 0:
                atype = "sales_spike"
                msg = f"{r.units_sold:.0f} units sold, {r.sales_ratio:.1f}x the usual {r.expected_units:.0f} a day."
            else:
                atype = "sales_drop"
                msg = f"Only {r.units_sold:.0f} units sold against a usual {r.expected_units:.0f} a day."
            out.append({"date": r.date.date().isoformat(), "product_id": r.product_id,
                        "name": names.get(r.product_id), "type": atype,
                        "score": round(float(r.score), 3), "message": msg})

    # ---- stock anomalies
    k = t.dropna(subset=STOCK_FEATS).copy()
    if len(k):
        k["score"] = anomaly_scores(bundle["stock_model"], k[STOCK_FEATS])
        for r in k[k["score"] >= bundle["stock_threshold"]].itertuples():
            lower = r.stock_gap > 0
            msg = (f"Recorded stock ({r.stock_on_hand:.0f}) is about {abs(r.stock_gap):.0f} units "
                   f"{'below' if lower else 'above'} what sales explain, and the next count returns to normal. "
                   f"Likely a counting or entry error.")
            out.append({"date": r.date.date().isoformat(), "product_id": r.product_id,
                        "name": names.get(r.product_id), "type": "stock_mismatch",
                        "score": round(float(r.score), 3), "message": msg})

    # ---- supplier delays (rule)
    pos = pd.read_csv(DATA_DIR / "purchase_orders.csv", parse_dates=["actual_delivery_date"])
    d = pos[(pos["status"] == "Delivered") & (pos["delay_days"] >= PO_DELAY_THRESHOLD)
            & (pos["actual_delivery_date"] > start)]
    if product_id is not None:
        d = d[d["product_id"] == str(product_id)]
    for r in d.itertuples():
        out.append({"date": r.actual_delivery_date.date().isoformat(), "product_id": r.product_id,
                    "name": names.get(r.product_id), "type": "supplier_delay", "score": None,
                    "message": f"{r.po_id} from supplier {r.supplier_id} arrived {int(r.delay_days)} days late "
                               f"(rule: {PO_DELAY_THRESHOLD}+ days)."})

    out.sort(key=lambda a: (a["date"], a["score"] or 0), reverse=True)
    by_type = pd.Series([a["type"] for a in out], dtype=object).value_counts().to_dict()
    if kind:  # now this is really the caller's filter, never overwritten
        out = [a for a in out if a["type"] == kind]
    return {"as_of": end.date().isoformat(), "days": days, "count": len(out),
            "by_type": by_type, "anomalies": out[:limit]}


if __name__ == "__main__":
    main()