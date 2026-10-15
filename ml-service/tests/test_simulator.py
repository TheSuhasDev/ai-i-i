import numpy as np
import pandas as pd
import pytest

from app.forecasting import MODEL_PATH
from app.health import PRIORITY_RANK
from app.risk import RISK_MODEL_PATH, risk_for_product
from app.simulator import project_stock, scale_recent_units, simulate


def test_projection_without_orders():
    r = project_stock(100, 10, [], days=15)
    assert r["levels"][0] == 90 and r["levels"][9] == 0
    assert r["first_shortfall_day"] == 11 and r["units_short"] == 50


def test_arriving_order_ends_the_shortfall():
    r = project_stock(30, 10, [(5, 100)], days=8)
    assert r["levels"] == [20, 10, 0, 0, 0, 90, 80, 70]   # the order arrives after day 5
    assert r["first_shortfall_day"] == 4 and r["units_short"] == 20


def test_zero_demand_never_runs_short():
    r = project_stock(0, 0, [], days=10)
    assert r["first_shortfall_day"] is None and r["units_short"] == 0


def test_scale_recent_units_only_touches_the_window():
    f = pd.DataFrame({"units_sold": np.full(40, 10.0)})
    g = scale_recent_units(f, 1.2, window=28)
    assert np.allclose(g["units_sold"].iloc[-28:], 12.0)
    assert np.allclose(g["units_sold"].iloc[:12], 10.0)
    assert np.allclose(f["units_sold"], 10.0)               # the original is untouched


MODELS = MODEL_PATH.exists() and RISK_MODEL_PATH.exists()


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_neutral_scenario_changes_nothing_and_matches_the_risk_endpoint():
    s = simulate("P001")
    assert s["before"]["risk_pct"] == s["after"]["risk_pct"]
    assert s["before"]["priority"] == s["after"]["priority"]
    assert s["before"]["reorder"]["order_qty"] == s["after"]["reorder"]["order_qty"]
    assert abs(s["before"]["risk_pct"] - risk_for_product("P001")["risk_pct"]) < 0.05


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_more_stock_lowers_risk_and_never_worsens_priority():
    s = simulate("P001", stock=400)
    assert s["after"]["risk_pct"] < s["before"]["risk_pct"]
    assert PRIORITY_RANK[s["after"]["priority"]] >= PRIORITY_RANK[s["before"]["priority"]]


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_demand_up_and_delay_up_shorten_cover_and_delay_delivery():
    s = simulate("P001", demand_pct=20, extra_delay_days=3)
    assert s["after"]["days_of_cover"] < s["before"]["days_of_cover"]
    assert s["after"]["days_to_delivery"] == pytest.approx(s["before"]["days_to_delivery"] + 3)