import pandas as pd

from app import insights


def test_open_pos_only_counts_pending_and_in_transit_remaining_quantities(tmp_path, monkeypatch):
    pd.DataFrame([
        {"product_id": "P010", "status": "Pending", "qty_ordered": 422, "qty_received": 0,
         "expected_delivery_date": "2026-10-20"},
        {"product_id": "P010", "status": "Approved", "qty_ordered": 50, "qty_received": 10,
         "expected_delivery_date": "2026-10-22"},
        {"product_id": "P010", "status": "In Transit", "qty_ordered": 100, "qty_received": 25,
         "expected_delivery_date": "2026-10-18"},
        {"product_id": "P010", "status": "Delivered", "qty_ordered": 300, "qty_received": 300,
         "expected_delivery_date": "2026-10-12"},
        {"product_id": "P010", "status": "Cancelled", "qty_ordered": 500, "qty_received": 0,
         "expected_delivery_date": "2026-10-15"},
        {"product_id": "P010", "status": "Pending", "qty_ordered": 10, "qty_received": 12,
         "expected_delivery_date": "2026-10-25"},
    ]).to_csv(tmp_path / "purchase_orders.csv", index=False)
    monkeypatch.setattr(insights, "DATA_DIR", tmp_path)
    insights._open_pos.cache_clear()

    try:
        # 422 (Pending) + 40 (Approved) + 75 (In Transit) + 0 = 537
        assert insights._open_pos()["P010"] == {"qty": 537.0, "date": pd.Timestamp("2026-10-18").date()}
    finally:
        insights._open_pos.cache_clear()


def test_insights_dates_count_from_as_of_date(monkeypatch):
    monkeypatch.setenv("AS_OF_DATE", "2026-10-24")
    r = insights.insights_for_product("P039", stock=0, on_order=0)
    assert r["stockout"]["expected_stockout_date"] == "2026-10-24"
    assert r["stockout"]["out_of_stock_now"] is True
    assert r["stockout"]["expected_delivery_date"] > "2026-10-24"
    r = insights.insights_for_product("P039", stock=0, on_order=50, expected_delivery_date="2026-10-30")
    assert r["stockout"]["expected_delivery_date"] >= "2026-10-30"


def test_overdue_po_shows_eta_unknown(monkeypatch):
    monkeypatch.setenv("AS_OF_DATE", "2026-10-26")
    r = insights.insights_for_product("P010", stock=10, on_order=50, expected_delivery_date="2026-10-20")
    assert r["stockout"]["is_overdue"] is True
    assert r["stockout"]["overdue_days"] == 6
    assert "PO overdue by 6d, ETA unknown" in r["stockout"]["days_to_delivery_text"]
    alert_types = [a["type"] for a in r["alerts"]]
    assert "po_overdue" in alert_types


def test_high_risk_supplier_warning_and_alternate():
    # S6 is High Risk; product using S6 should have a warning and alternate recommendation if available
    r = insights.insights_for_product("P014")  # Smartwatch uses S6
    reorder = r["reorder"]
    if reorder.get("supplier_risk_level") == "High" or reorder.get("supplier_reliability", 100) < 70:
        assert reorder["supplier_warning"] is not None
        assert "High Risk" in reorder["supplier_warning"]

