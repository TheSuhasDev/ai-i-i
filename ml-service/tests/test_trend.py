import numpy as np
import pandas as pd
import pytest

from app.trend import analyze_series


def weekly(y):
    start = pd.Timestamp("2024-10-14")
    return pd.DataFrame({"week_start": start + pd.to_timedelta(np.arange(len(y)) * 7, unit="D"), "units": y})


def test_increasing():
    rng = np.random.default_rng(1)
    r = analyze_series(weekly(100 + 1.0 * np.arange(104) + rng.normal(0, 5, 104)))
    assert r["trend"] == "increasing" and r["yoy_change_pct"] > 15


def test_decreasing():
    rng = np.random.default_rng(2)
    r = analyze_series(weekly(250 - 1.0 * np.arange(104) + rng.normal(0, 5, 104)))
    assert r["trend"] == "decreasing" and r["yoy_change_pct"] < -15


def test_stable():
    rng = np.random.default_rng(3)
    assert analyze_series(weekly(100 + rng.normal(0, 10, 104)))["trend"] == "stable"


def test_seasonal_pattern_is_detected_and_is_not_a_trend():
    rng = np.random.default_rng(4)
    t = np.arange(104)
    r = analyze_series(weekly(100 + 30 * np.sin(2 * np.pi * t / 52) + rng.normal(0, 8, 104)))
    assert r["seasonal"] and r["peak_month"] is not None
    assert r["trend"] == "stable"       # the year-over-year difference cancels the seasonal cycle


def test_monthly_index_matches_seasonal_peak():
    rng = np.random.default_rng(4)
    t = np.arange(104)
    r = analyze_series(weekly(100 + 30 * np.sin(2 * np.pi * t / 52) + rng.normal(0, 8, 104)))
    month = pd.Timestamp(f"2026-{r['peak_month']}-01").month
    assert len(r["monthly_index"]) == 12
    assert r["monthly_index"].index(max(r["monthly_index"])) == month - 1
    assert len(r["weekly_series"]) == 104
    assert set(r["weekly_series"][0]) == {"week_start", "units"}


def test_flat_series_monthly_index_is_average():
    r = analyze_series(weekly(np.ones(104)))
    assert len(r["monthly_index"]) == 12
    assert r["monthly_index"] == pytest.approx([1.0] * 12)


def test_noise_is_rarely_flagged_seasonal():
    flagged = 0
    for seed in range(30):
        rng = np.random.default_rng(seed)
        flagged += analyze_series(weekly(100 + rng.normal(0, 15, 104)))["seasonal"]
    assert flagged <= 5                 # about 2% expected


def test_short_history_is_rejected():
    with pytest.raises(ValueError):
        analyze_series(weekly(np.ones(80)))
