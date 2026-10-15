import pandas as pd
import pytest

from app.explain import GROUPS, _reason, explain_risk
from app.risk import RISK_MODEL_PATH, RFEATS, risk_for_product


def test_every_feature_is_in_exactly_one_group():
    assert sorted(sum(GROUPS.values(), [])) == sorted(RFEATS)


def test_reasons_use_the_product_numbers():
    row = pd.Series({"stock_ratio": 0.42, "cover_days": 1.9, "mean7_ratio": 1.3, "growth_28_90": 1.1,
                     "sup_ontime": 0.6, "sup_delay": 3.2, "cv_60": 0.5})
    frame = pd.DataFrame({"stock_on_hand": [40.0]})
    assert "40 units" in _reason("stock", True, row, frame, 5) and "0.42" in _reason("stock", True, row, frame, 5)
    assert "+30%" in _reason("demand", True, row, frame, 5)
    assert "60%" in _reason("supplier", True, row, frame, 5)
    assert "5-day" in _reason("lead_time", False, row, frame, 5)


@pytest.mark.skipif(not RISK_MODEL_PATH.exists(), reason="risk model not trained")
def test_contributions_add_up_and_match_the_risk_endpoint():
    e = explain_risk("P001")
    assert e["additivity_gap"] < 1e-3                       # base + sum(contributions) == raw model score
    assert abs(e["risk_pct"] - risk_for_product("P001")["risk_pct"]) < 0.05
    assert e["factors"] and abs(sum(f["share_pct"] for f in e["factors"])) <= 100.1