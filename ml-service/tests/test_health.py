import numpy as np
import pytest

from app.health import alert_priority, cover_score, health_score, health_status, stability_score


def test_cover_score_curve():
    assert cover_score(0) == 0
    assert cover_score(1) == pytest.approx(30)
    assert cover_score(1.5) == pytest.approx(65)
    assert cover_score(2) == 100 and cover_score(3) == 100


def test_overstock_lowers_cover_score():
    assert cover_score(5, 90) == 100                    # exactly 90 days is still fine
    assert cover_score(5, 170) == pytest.approx(67.5)
    assert cover_score(5, 400) == pytest.approx(35)


def test_health_status_thresholds():
    assert [health_status(x) for x in (39.9, 40, 69.9, 70)] == ["Critical", "Warning", "Warning", "Healthy"]


def test_alert_priority_thresholds():
    got = [alert_priority(x) for x in (-0.1, 0, 4.9, 5, 14.9, 15, None)]
    assert got == ["Critical", "High", "High", "Medium", "Medium", "Low", "Low"]


def test_health_score_extremes_and_components():
    best = health_score(2.0, 10, 0, 100, 0.0)
    worst = health_score(0.0, 3, 100, 0, 0.8)
    assert best["score"] == 100 and best["status"] == "Healthy"
    assert worst["score"] == 0 and worst["status"] == "Critical"
    assert set(best["components"]) == {"cover", "risk", "supplier", "stability"}


def test_health_is_lower_for_the_riskier_product():
    low = health_score(0.3, 3, 90, 90, 0.2)["score"]
    high = health_score(2.5, 40, 2, 90, 0.2)["score"]
    assert low < 40 < 70 < high


def test_stability_score_edge_cases():
    assert stability_score(0) == 100 and stability_score(0.4) == pytest.approx(50)
    assert stability_score(float("inf")) == 0 and stability_score(float("nan")) == 50 and stability_score(None) == 50