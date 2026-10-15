import pytest

from app.forecasting import MODEL_PATH
from app.risk import RISK_MODEL_PATH
from app.simulator import simulate_all

MODELS = MODEL_PATH.exists() and RISK_MODEL_PATH.exists()
SAMPLE = ["P001", "P002", "P003", "P009"]


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_neutral_scenario_changes_no_priority():
    r = simulate_all(0, 0, product_ids=SAMPLE)
    assert r["summary"]["n_products"] == len(SAMPLE)
    assert r["summary"]["priority_worse"] == 0
    assert all(p["priority_before"] == p["priority_after"] for p in r["products"])


@pytest.mark.skipif(not MODELS, reason="models not trained")
def test_demand_increase_never_lengthens_cover():
    r = simulate_all(20, 0, product_ids=SAMPLE)
    for p in r["products"]:
        if p["days_of_cover_before"] is not None and p["days_of_cover_after"] is not None:
            assert p["days_of_cover_after"] <= p["days_of_cover_before"] + 1e-9