import numpy as np
import pandas as pd
import pytest

from app.forecasting import MODEL_PATH
from app.health import PRIORITY_RANK
from app.insights import insights_for_product
from app.risk import RISK_MODEL_PATH
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


def test_projection_recurrence_relation():
    """
    Verify: Stock_t = max(0, Stock_{t-1} - Demand_t + Deliveries_t)
    for every day t from 1 to 30.
    """
    stock0 = 50.0
    daily = 12.0
    arrivals = [(3, 30.0), (7, 60.0), (15, 40.0)]
    proj = project_stock(stock0, daily, arrivals, days=30)
    levels = proj["levels"]

    prev_stock = stock0
    for t in range(1, 31):
        deliv_t = sum(q for d, q in arrivals if max(int(round(d)), 0) == t - 1)
        expected_stock = max(0.0, prev_stock - daily + deliv_t)
        assert levels[t - 1] == pytest.approx(expected_stock, abs=0.1)
        prev_stock = levels[t - 1]


def test_zero_stock_edge_case():
    r = project_stock(0, 15.0, [], days=30)
    assert r["levels"] == [0.0] * 30
    assert r["first_shortfall_day"] == 1
    assert r["units_short"] == pytest.approx(450.0)


def test_scale_recent_units_only_touches_the_window():
    f = pd.DataFrame({"units_sold": np.full(40, 10.0)})
    g = scale_recent_units(f, 1.2, window=28)
    assert np.allclose(g["units_sold"].iloc[-28:], 12.0)
    assert np.allclose(g["units_sold"].iloc[:12], 10.0)
    assert np.allclose(f["units_sold"], 10.0)               # the original is untouched


MODELS = MODEL_PATH.exists() and RISK_MODEL_PATH.exists()


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_neutral_scenario_changes_nothing_and_matches_insights():
    s = simulate("P001")
    assert s["before"]["risk_pct"] == s["after"]["risk_pct"]
    assert s["before"]["priority"] == s["after"]["priority"]
    assert s["before"]["reorder"]["order_qty"] == s["after"]["reorder"]["order_qty"]
    ins = insights_for_product("P001")
    assert s["before"]["risk_pct"] == pytest.approx(ins["risk"]["risk_pct"], abs=0.05)
    assert s["before"]["priority"] == ins["priority"]
    assert s["before"]["health"]["status"] == ins["health"]["status"]


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


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_large_demand_shocks():
    # Large demand drop: -90% (factor = 0.1)
    s_drop = simulate("P001", demand_pct=-90)
    assert s_drop["after"]["daily_demand"] == pytest.approx(s_drop["before"]["daily_demand"] * 0.1, abs=0.1)
    assert s_drop["after"]["days_of_cover"] > s_drop["before"]["days_of_cover"]
    assert s_drop["after"]["units_short_30d"] <= s_drop["before"]["units_short_30d"]

    # Large demand spike: +300% (factor = 4.0)
    s_spike = simulate("P001", demand_pct=300)
    assert s_spike["after"]["daily_demand"] == pytest.approx(s_spike["before"]["daily_demand"] * 4.0, abs=0.1)
    assert s_spike["after"]["days_of_cover"] < s_spike["before"]["days_of_cover"]
    assert s_spike["after"]["units_short_30d"] > s_spike["before"]["units_short_30d"]
    assert s_spike["after"]["priority"] == "Critical"


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_new_order_placed_today_delivers_and_reduces_shortfall():
    # Zero stock to start, place order of 500 units
    s = simulate("P001", stock=0, order_qty=500)
    assert s["after"]["stock"] == 0
    assert s["after"]["on_order"] >= 500
    # The new order arrival appears in projected stock levels
    assert max(s["after"]["projected_stock"]) > 0