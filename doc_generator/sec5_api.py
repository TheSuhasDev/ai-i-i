from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_table_custom
)

def render_section_5(doc):
    add_heading_1(doc, "5. Unified API Reference")
    
    add_paragraph(doc, 
        "This section delivers a complete RESTful API reference for all operational endpoints exposed across the system. "
        "The interface consists of two distinct protocol layers: the public and client-facing Express Backend API (port 5000), "
        "and the private service-authenticated FastAPI ML Microservice API (port 8000)."
    )

    add_heading_2(doc, "5.1 Express Backend API Reference (Port 5000)")
    add_paragraph(doc, "All Express endpoints are prefixed with /api. Protected routes require HTTP header: Authorization: Bearer <JWT>.")

    express_api_data = [
        ["GET", "/api/health", "System health and database readiness probe.", "Public", "None", "{ status: 'ok', database: 'connected', uptime: 1240 }"],
        ["POST", "/api/auth/register", "Registers new warehouse staff account.", "Public", "{ name, email, password }", "{ success: true, token: '<JWT>', data: { user } }"],
        ["POST", "/api/auth/login", "Authenticates user and returns signed JWT.", "Public", "{ email, password }", "{ success: true, token: '<JWT>', data: { user } }"],
        ["GET", "/api/auth/me", "Retrieves current authenticated profile.", "Bearer (Any)", "None", "{ success: true, data: { _id, name, email, role } }"],
        ["GET", "/api/products", "Paginated product catalog with search.", "Bearer (Any)", "?page=1&limit=20&search=mouse&category=Accessories", "{ success: true, total: 40, pages: 2, data: [...] }"],
        ["POST", "/api/products", "Creates a new catalog item.", "Admin / Manager", "Zod: { code, sku, name, category, price, cost, leadTimeDays }", "{ success: true, data: { created product } }"],
        ["PUT", "/api/products/:id", "Updates existing product fields.", "Admin / Manager", "Partial<Product>", "{ success: true, data: { updated product } }"],
        ["DELETE", "/api/products/:id", "Deletes product from catalog.", "Admin Only", "None", "{ success: true, data: {} }"],
        ["GET", "/api/suppliers", "Paginated supplier directory.", "Bearer (Any)", "?page=1&limit=20&search=apex", "{ success: true, total: 8, pages: 1, data: [...] }"],
        ["POST", "/api/suppliers", "Enrolls new supplier.", "Admin / Manager", "{ code, name, contactEmail, city }", "{ success: true, data: { created supplier } }"],
        ["PUT", "/api/suppliers/:id", "Updates vendor contact details.", "Admin / Manager", "Partial<Supplier>", "{ success: true, data: { updated supplier } }"],
        ["DELETE", "/api/suppliers/:id", "Removes vendor record.", "Admin Only", "None", "{ success: true, data: {} }"],
        ["GET", "/api/inventory", "Lists warehouse stock snapshots.", "Bearer (Any)", "?page=1&limit=20&product=<id>", "{ success: true, total: 40, data: [...] }"],
        ["PUT", "/api/inventory/:id", "Updates physical stock count.", "Staff / Mgr / Admin", "{ currentStock: 120, snapshotDate: '2026-10-23' }", "{ success: true, data: { updated inventory } }"],
        ["GET", "/api/sales", "Lists historical daily sales.", "Bearer (Any)", "?page=1&limit=50&product=<id>&from=2026-01-01", "{ success: true, total: 29200, data: [...] }"],
        ["POST", "/api/sales", "Records daily sales transaction.", "Staff / Mgr / Admin", "{ product, date, unitsSold, unitPrice, promoFlag }", "{ success: true, data: { created sale, revenue } }"],
        ["GET", "/api/purchase-orders", "Lists procurement orders with filters.", "Bearer (Any)", "?page=1&limit=20&status=Pending&supplier=<id>", "{ success: true, total: 398, data: [...] }"],
        ["POST", "/api/purchase-orders", "Creates PO (recomputes delay if delivered).", "Admin / Manager", "{ poNumber, product, supplier, orderDate, expectedDeliveryDate, qtyOrdered, unitCost }", "{ success: true, data: { created PO } }"],
        ["PUT", "/api/purchase-orders/:id", "Updates PO (sets delay if actual date given).", "Admin / Manager", "{ actualDeliveryDate: '2026-10-18', status: 'Delivered' }", "{ success: true, data: { updated PO, delayDays } }"],
        ["GET", "/api/insights", "Returns stored insight summaries.", "Bearer (Any)", "?priority=Critical&status=Warning&full=1", "{ success: true, count: 40, data: [...] }"],
        ["GET", "/api/insights/:code", "Recalculates and upserts insight for product.", "Bearer (Any)", "Param: code (e.g. P001)", "{ success: true, data: { full insight, computedAt } }"],
        ["GET", "/api/insights/:code/history", "Returns 52 complete weekly sales actuals.", "Bearer (Any)", "?weeks=52", "{ success: true, data: { code, weeks: [...] } }"],
        ["POST", "/api/insights/refresh", "Recalculates insights for all active items.", "Admin / Manager", "None", "{ success: true, data: { total: 40, ok: 40, failed: [] } }"],
        ["GET", "/api/insights/:code/explain", "Retrieves SHAP risk explanation.", "Bearer (Any)", "Param: code (e.g. P010)", "{ success: true, data: { factors, reasons, method } }"],
        ["GET", "/api/supplier-risk", "Returns supplier reliability scores.", "Bearer (Any)", "None", "{ success: true, data: [{ code, reliability, delay, ... }] }"],
        ["GET", "/api/anomalies", "Queries detected anomalies.", "Bearer (Any)", "?days=90&limit=100&kind=sales_spike", "{ success: true, count: 1551, data: [...] }"],
        ["POST", "/api/simulator", "Runs What-If simulation with live baseline.", "Bearer (Any)", "{ product_id, demand_change_pct, extra_delay, stock, order_qty }", "{ success: true, data: { before, after, projection } }"],
        ["POST", "/api/simulator/all", "Portfolio-wide What-If stress test.", "Bearer (Any)", "{ demand_change_pct, extra_supplier_delay_days }", "{ success: true, data: { summary, products } }"],
        ["GET", "/api/ml-performance", "Returns holdout evaluation metrics.", "Bearer (Any)", "None", "{ success: true, data: { forecast, risk, anomaly, trend } }"],
        ["POST", "/api/assistant", "Chatbot query loop (10 read-only tools).", "Bearer (Any)", "{ messages: [{ role: 'user', content: '...' }] }", "{ success: true, message: '...', data_used: [...] }"],
        ["GET", "/api/assistant/status", "Checks if LLM provider is configured.", "Bearer (Any)", "None", "{ success: true, configured: true, model: '...' }"]
    ]
    add_table_custom(doc, ["Method", "Endpoint URL", "Description", "Auth Level", "Request Body / Query Params", "Response Structure"], express_api_data, [Inches(0.7), Inches(1.8), Inches(1.8), Inches(1.0), Inches(1.8), Inches(2.0)])

    add_heading_2(doc, "5.2 FastAPI Machine Learning Service API Reference (Port 8000)")
    add_paragraph(doc, "All non-health FastAPI endpoints require HTTP header: X-Service-Token: <ML_SERVICE_TOKEN>.")

    fastapi_api_data = [
        ["GET", "/health", "Unprotected liveness probe.", "Public", "None", "{ status: 'ok', service: 'ml-service', timestamp: ISO8601 }"],
        ["POST", "/forecast", "Predicts weekly demand (h=1,2,3) with 80% range.", "X-Service-Token", "{ product_id: 'P001', promo_weeks: [], price_override: null }", "{ product_id, horizon_weeks, predictions, lower_80, upper_80, lead_time_demand }"],
        ["POST", "/risk", "Predicts calibrated stockout risk percentage.", "X-Service-Token", "{ product_id: 'P010', stock_override: 50 }", "{ product_id, risk_pct: 87.4, risk_band: 'High', threshold: 0.42 }"],
        ["GET", "/risk/all", "Batch stockout risk for all products.", "X-Service-Token", "None", "{ products: [{ product_id, risk_pct, risk_band }, ...] }"],
        ["POST", "/trend", "YoY trend and seasonality analysis for product.", "X-Service-Token", "{ product_id: 'P005' }", "{ product_id, pattern: 'increasing + seasonal', trend_pct: 18.4, peak_month: 11 }"],
        ["GET", "/trend/all", "Batch trend report for catalog.", "X-Service-Token", "None", "{ count: 40, data: [...] }"],
        ["POST", "/insights", "Comprehensive decision insight synthesis.", "X-Service-Token", "{ product_id, stock, on_order, expected_delivery_date }", "{ product_id, priority, health, risk, reorder, forecast, classification, alerts }"],
        ["GET", "/insights/all", "Synthesizes insights across all products.", "X-Service-Token", "None", "{ count: 40, data: [...], summary: { critical, high, ... } }"],
        ["GET", "/supplier-risk", "Scores reliability and delay across vendors.", "X-Service-Token", "None", "{ count: 8, suppliers: [{ code, reliability, avg_delay, on_time_rate, ... }] }"],
        ["POST", "/explain", "SHAP and log-odds attribution of risk factors.", "X-Service-Token", "{ product_id: 'P010', stock_override: null }", "{ product_id, risk_pct, method, factors: [{ name, contribution, reason }], base_value }"],
        ["GET", "/anomalies", "Queries detected catalog anomalies.", "X-Service-Token", "?days=90&limit=500&kind=sales_spike", "{ count: 1551, by_type: { sales_spike: 358, ... }, data: [...] }"],
        ["POST", "/simulate", "What-If perturbation on single product.", "X-Service-Token", "{ product_id, demand_change_pct, extra_supplier_delay_days, stock, order_qty }", "{ product_id, before: { ... }, after: { ... }, projection: [{ day, stock, arriving_qty }] }"],
        ["POST", "/simulate/all", "Portfolio-wide demand and delay simulation.", "X-Service-Token", "{ demand_change_pct: 20, extra_supplier_delay_days: 3 }", "{ summary: { stockouts_before, stockouts_after }, most_affected: [...] }"],
        ["GET", "/model-performance", "Loads held-out test evaluation metrics.", "X-Service-Token", "None", "{ forecast: { h1, h2, h3 }, risk: { f1, auc }, anomaly: { ... }, trend_agreement_pct: 100 }"]
    ]
    add_table_custom(doc, ["Method", "FastAPI Route", "Analytical Responsibility", "Auth Header", "Payload / Query Schema", "Response Schema"], fastapi_api_data, [Inches(0.7), Inches(1.8), Inches(1.8), Inches(1.2), Inches(1.8), Inches(2.0)])
