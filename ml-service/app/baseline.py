"""
Baseline forecasts on the time-based hold-out (Day 5).
Run from ml-service/:  python -m app.baseline

One-step-ahead  : predict week t using actuals up to week t-1 (what the Day 6 model is compared with)
Static multi-step: frozen at the split date, forecast every test week from training data only
"""
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from app.evaluation import summarize
from app.preprocessing import build_weekly_dataset, time_split

OUT = Path(__file__).resolve().parents[1] / "models" / "baseline_metrics.json"

PREDICTORS = {
    "naive_1step": "Last week's demand (one-step-ahead)",
    "ma4_1step": "Mean of the last 4 weeks (one-step-ahead)",
    "seasonal_naive": "Same week last year (lag 52)",
    "naive_static": "Last training week, held flat for all test weeks",
    "ma4_static": "Mean of last 4 training weeks, held flat (matches the Day 2 validation check)",
}


def make_predictions(train, test):
    test = test.copy()
    tr = train.sort_values(["product_id", "week_start"])
    last_week = tr.groupby("product_id")["units"].last()
    last_4_mean = tr.groupby("product_id").tail(4).groupby("product_id")["units"].mean()

    test["naive_1step"] = test["lag_1"]
    test["ma4_1step"] = test["roll_mean_4"]
    test["seasonal_naive"] = test["lag_52"]
    test["naive_static"] = test["product_id"].map(last_week)
    test["ma4_static"] = test["product_id"].map(last_4_mean)
    return test


def main():
    weekly, split_date = build_weekly_dataset()
    train, test = time_split(weekly, split_date)
    test = make_predictions(train, test)

    missing = test[list(PREDICTORS)].isna().sum()
    if missing.any():
        raise SystemExit(f"Baseline predictions have gaps:\n{missing[missing > 0]}")

    metrics = {name: summarize(test, name) for name in PREDICTORS}
    table = pd.DataFrame(metrics).T[["mae", "rmse", "mape", "wape", "mape_by_product_mean"]].round(2)

    print(f"Split date: {split_date.date()} | train weeks/product: {train['week_start'].nunique()} "
          f"| test weeks/product: {test['week_start'].nunique()} | products: {test['product_id'].nunique()}")
    print(table.to_string())

    best_1step = min(["naive_1step", "ma4_1step", "seasonal_naive"], key=lambda k: metrics[k]["mape"])
    print(f"\nBest one-step baseline: {best_1step} (MAPE {metrics[best_1step]['mape']:.1f}%). "
          "The Day 6 model must beat this on the same test weeks.")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "granularity": "weekly (Mon-Sun)",
        "split_date": str(split_date.date()),
        "train_weeks_per_product": int(train["week_start"].nunique()),
        "test_weeks_per_product": int(test["week_start"].nunique()),
        "n_products": int(test["product_id"].nunique()),
        "metric_definitions": {
            "mae": "mean absolute error, units/week, pooled over all product-weeks",
            "rmse": "root mean squared error, units/week, pooled",
            "mape": "mean absolute percentage error %, pooled, weeks with zero actual demand ignored",
            "wape": "sum(|error|) / sum(actual) %",
            "mape_by_product_mean": "MAPE computed per product, then averaged",
        },
        "baselines": PREDICTORS,
        "metrics": metrics,
        "best_one_step_baseline": best_1step,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2))
    print(f"\nSaved metrics to {OUT}")


if __name__ == "__main__":
    main()