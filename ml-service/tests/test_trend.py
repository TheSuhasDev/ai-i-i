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


def test_decreasing_seasonal_pattern_detected():
    rng = np.random.default_rng(5)
    t = np.arange(104)
    y = 250 - 1.0 * t + 35 * np.sin(2 * np.pi * t / 52) + rng.normal(0, 5, 104)
    r = analyze_series(weekly(y))
    assert r["trend"] == "decreasing"
    assert r["seasonal"] is True
    assert r["pattern"] == "decreasing + seasonal"


def test_increasing_seasonal_pattern_detected():
    rng = np.random.default_rng(6)
    t = np.arange(104)
    y = 100 + 1.0 * t + 35 * np.sin(2 * np.pi * t / 52) + rng.normal(0, 5, 104)
    r = analyze_series(weekly(y))
    assert r["trend"] == "increasing"
    assert r["seasonal"] is True
    assert r["pattern"] == "increasing + seasonal"


def test_air_cooler_p019_is_decreasing_seasonal():
    from app.trend import trend_for_product
    r = trend_for_product("P019")
    assert r["product_id"] == "P019"
    assert "Air Cooler" in r["name"]
    assert r["trend"] == "decreasing"
    assert r["seasonal"] is True
    assert r["pattern"] == "decreasing + seasonal"
    assert r["yoy_change_pct"] < -15.0
    assert r["peak_month"] == "May"


def test_all_40_products_trend_patterns_valid():
    from app.trend import all_trends
    trends = all_trends()
    assert len(trends) == 40
    valid_patterns = {"increasing", "decreasing", "stable", "seasonal", "increasing + seasonal", "decreasing + seasonal"}
    for t in trends:
        assert t["pattern"] in valid_patterns, f"Product {t['product_id']} has unexpected pattern {t['pattern']}"
    p019 = next(t for t in trends if t["product_id"] == "P019")
    assert p019["pattern"] == "decreasing + seasonal"
