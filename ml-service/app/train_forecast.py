"""
Train and evaluate the direct multi-horizon demand models (Day 6).
Run from ml-service/:  python -m app.train_forecast
"""
import json
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance

from app.evaluation import summarize, wape
from app.forecasting import FCOLS, HORIZONS, MODEL_PATH, candidates, make_origin_table, split_rows
from app.preprocessing import build_weekly_dataset

METRICS_PATH = MODEL_PATH.with_name("forecast_metrics.json")
BASELINE_PATH = MODEL_PATH.with_name("baseline_metrics.json")
VAL_WEEKS = 13


def fit(est, df):
    return est.fit(df[FCOLS], df["y_ratio"], sample_weight=df["scale"])


def to_units(ratio, df):
    return np.maximum(np.asarray(ratio) * df["scale"].to_numpy(), 0.0)


def main():
    weekly, split_date = build_weekly_dataset()
    val_start = split_date - pd.Timedelta(weeks=VAL_WEEKS)
    category_map = {str(c): int(k) for c, k in
                    weekly[["category", "category_code"]].drop_duplicates().itertuples(index=False)}

    bundle = {
        "models": {}, "model_names": {}, "residual_q": {},
        "feature_cols": FCOLS, "category_map": category_map,
        "split_date": str(split_date.date()), "data_end": str(weekly["week_end"].max().date()),
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    results, rows, importance = {}, [], {}

    for h in HORIZONS:
        tbl = make_origin_table(weekly, h)
        train, test = split_rows(tbl, split_date)
        assert len(test) == test["product_id"].nunique() * test["target_week_start"].nunique(), "test grid has gaps"

        # 1) choose the algorithm on a validation fold carved from the END of the training period
        fit_rows = train[train["target_week_end"] < val_start]
        val_rows = train[train["target_week_start"] >= val_start]
        fitted, val_wape = {}, {}
        for name, est in candidates().items():
            fitted[name] = fit(est, fit_rows)
            val_wape[name] = wape(val_rows["units"], to_units(fitted[name].predict(val_rows[FCOLS]), val_rows))
        best = min(val_wape, key=val_wape.get)

        # 80% interval from validation residuals (ratio space)
        resid = val_rows["y_ratio"].to_numpy() - fitted[best].predict(val_rows[FCOLS])
        q10, q90 = (float(q) for q in np.quantile(resid, [0.1, 0.9]))

        # 2) evaluate once on the held-out test weeks (train-only fit)
        eval_model = fit(candidates()[best], train)
        ratio = eval_model.predict(test[FCOLS])
        ev = test[["product_id", "units"]].copy()
        ev["model"] = to_units(ratio, test)
        ev["naive"] = test["last"]
        ev["ma4"] = test["mean4"]
        metrics = {k: summarize(ev, k) for k in ("model", "naive", "ma4")}

        lo, hi = to_units(ratio + q10, test), to_units(ratio + q90, test)
        coverage = float(np.mean((test["units"].to_numpy() >= lo) & (test["units"].to_numpy() <= hi)) * 100)
        gain = (1 - metrics["model"]["wape"] / metrics["ma4"]["wape"]) * 100

        if h == 1:  # sanity: must reproduce the Day 5 one-step MA4 number
            if BASELINE_PATH.exists():
                ref = json.loads(BASELINE_PATH.read_text())["metrics"]["ma4_1step"]["mape"]
                flag = "OK" if abs(ref - metrics["ma4"]["mape"]) < 0.01 else "MISMATCH - check the pipeline"
                print(f"Sanity: h=1 ma4 MAPE {metrics['ma4']['mape']:.2f} vs Day 5 {ref:.2f} -> {flag}\n")
            imp = permutation_importance(eval_model, test[FCOLS], test["y_ratio"], n_repeats=5, random_state=42,
                                         scoring="neg_mean_absolute_error", sample_weight=test["scale"])
            importance = dict(sorted(((f, float(v)) for f, v in zip(FCOLS, imp.importances_mean)),
                                     key=lambda kv: -kv[1]))

        # 3) production model: same algorithm, refit on every available row
        all_rows = tbl.dropna(subset=FCOLS + ["y_ratio"])
        bundle["models"][h] = fit(candidates()[best], all_rows)
        bundle["model_names"][h] = best
        bundle["residual_q"][h] = (q10, q90)

        results[str(h)] = {
            "selected_model": best,
            "validation_wape": {k: round(v, 2) for k, v in val_wape.items()},
            "test": metrics,
            "wape_gain_vs_ma4_pct": round(gain, 1),
            "interval_80_coverage_pct": round(coverage, 1),
            "n_test_rows": int(len(test)),
        }
        for label in ("naive", "ma4", "model"):
            m = metrics[label]
            rows.append({"h": h, "predictor": label if label != "model" else f"{best} (model)",
                         "mae": m["mae"], "rmse": m["rmse"], "mape": m["mape"], "wape": m["wape"]})
        print(f"h={h}: picked {best} (val WAPE {val_wape}) | WAPE gain vs ma4: {gain:.1f}% | 80% interval coverage: {coverage:.0f}%")

    print("\nTest metrics (26 weeks x 40 products):")
    print(pd.DataFrame(rows).round(2).to_string(index=False))
    print("\nTop features (permutation importance, h=1):")
    for f, v in list(importance.items())[:8]:
        print(f"  {f:15s} {v:.4f}")

    payload = {
        "generated_at": bundle["trained_at"],
        "granularity": "weekly (Mon-Sun)",
        "split_date": bundle["split_date"],
        "validation_weeks": VAL_WEEKS,
        "target": "units / mean of last 8 weeks (scale-free), sample weight = scale",
        "horizons_weeks": list(HORIZONS),
        "results": results,
        "feature_importance_h1": importance,
        "notes": "Metrics from train-only fit evaluated on held-out weeks. Saved model is refit on all data.",
    }
    METRICS_PATH.write_text(json.dumps(payload, indent=2))
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    print(f"\nSaved {METRICS_PATH.name} and {MODEL_PATH.name} in {MODEL_PATH.parent}")


if __name__ == "__main__":
    main()