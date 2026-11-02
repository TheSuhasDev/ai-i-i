from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_file_info_table, add_code_block, add_callout,
    add_screenshot_slot
)

def render_section_3_client(doc):
    add_heading_2(doc, "3.3 Client Tier (React 19 & Vite)")
    add_paragraph(doc, 
        "This section documents every source code file within the client tier (client/src/). "
        "The frontend application provides a role-aware enterprise dashboard, operational data grids with server-side pagination, "
        "interactive Recharts visualizations, What-If simulation controls, anomaly inspection views, and an embedded conversational AI assistant."
    )

    # 1. main.jsx & App.jsx
    add_heading_3(doc, "3.3.1 client/src/main.jsx & client/src/App.jsx")
    add_file_info_table(doc,
        path="client/src/main.jsx & client/src/App.jsx",
        purpose="Application bootstrap, global React Provider hierarchy, and client-side declarative route definitions.",
        deps="react, react-dom, react-router-dom, context/AuthProvider.jsx, context/AssistantChatProvider.jsx, context/ProductImageViewer.jsx, components/Layout.jsx, components/ProtectedRoute.jsx, pages/*",
        used_by="index.html (browser entry point)"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "main.jsx: Mounts React application into DOM container document.getElementById('root'). Enforces strict Provider nesting: <BrowserRouter> -> <AuthProvider> -> <AssistantChatProvider> -> <ProductImageProvider> -> <App />.", bold_prefix="1. Provider Tree: ")
    add_bullet(doc, "App.jsx: Configures top-level React Router routes. Public route: /login (<Login />). Protected authenticated routes wrapped in <Layout />: / (Dashboard), /products, /products/new, /products/:id, /product/:code (ProductInsight), /inventory, /inventory/:id, /sales, /sales/new, /sales/:id, /suppliers, /suppliers/new, /suppliers/:id, /purchase-orders, /purchase-orders/new, /purchase-orders/:id, /reorder (SmartReorder), /alerts, /supplier-risk, /anomalies, /simulator, /performance, /trends, /assistant.", bold_prefix="2. Route Declarations: ")
    add_bullet(doc, "Role Guards: Employs <ProtectedRoute roles={['admin', 'manager']}> to shield create/edit views, while granting staff view-only and transactional sales/stock capabilities.", bold_prefix="3. Protected Guards: ")

    # 2. Contexts
    add_heading_3(doc, "3.3.2 React Context Providers (client/src/context/*)")
    add_paragraph(doc, "Three context providers manage global application state across independent components:")
    add_bullet(doc, "client/src/context/AuthProvider.jsx: Manages user authentication state. On mount, reads token and user from localStorage. Exposes login(email, password), register(data), and logout(). Attaches Axios Authorization header on login; purges storage on logout. Provides useAuth() hook.", bold_prefix="AuthProvider: ")
    add_bullet(doc, "client/src/context/AssistantChatProvider.jsx & useAssistantChat.js: Manages persistent conversation history for the AI assistant. State includes messages array, loading flag, open widget state, and unread indicator. Implements sendMessage(text): sends conversation history to POST /api/assistant, records assistant response and data_used lookups. Provides useAssistantChatContext() hook.", bold_prefix="AssistantChatProvider: ")
    add_bullet(doc, "client/src/context/ProductImageViewer.jsx: Global modal light-box for inspecting high-resolution catalog product images. Exposes openViewer(product) and closeViewer(). Provides useProductImageViewer() hook.", bold_prefix="ProductImageViewer: ")

    # 3. Hooks & Utilities
    add_heading_3(doc, "3.3.3 Custom Hooks & Utilities")
    add_bullet(doc, "client/src/hooks/useList.js: Reusable data-grid hook for CRUD collections. Manages state: items, total, pages, page, limit (15), search, sort, filters, loading, error. Automatically debounces search inputs and fetches updated paginated records via service.list(). Exposes refresh() and setFilter().", bold_prefix="useList.js: ")
    add_bullet(doc, "client/src/hooks/useFetch.js: Reusable async fetch hook. Accepts an async fetcher function and dependency array. Manages { data, loading, error, refetch }.", bold_prefix="useFetch.js: ")
    add_bullet(doc, "client/src/utils/format.js: Enterprise formatting helpers: money(val) formats currency (₹ / $), fmtDate(d) formats localized dates, num(v, dec) formats decimals, addDaysInput(days) returns HTML date string offset, PRIORITY_ORDER defines numerical ranking for alerts.", bold_prefix="format.js: ")
    add_bullet(doc, "client/src/utils/productImage.js: Normalizes product thumbnail image paths (e.g., /products/P001.jpg), providing fallback SVG placeholders if file is missing.", bold_prefix="productImage.js: ")
    add_bullet(doc, "client/src/lib/utils.js: Exports cn(...inputs) fusing clsx and tailwind-merge for conflict-free dynamic CSS class resolution.", bold_prefix="utils.js: ")

    # 4. Services
    add_heading_3(doc, "3.3.4 Client API Services (client/src/services/*)")
    add_bullet(doc, "client/src/services/api.js: Central Axios instance configured with baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'. Interceptors: Request interceptor injects Authorization: Bearer <token>. Response interceptor catches HTTP 401: if request URL is not /auth/login, purges localStorage and redirects browser to /login. errorMessage(err) extracts server-provided error detail string.", bold_prefix="api.js: ")
    add_bullet(doc, "client/src/services/index.js: Exports modular API clients: authService, productService, supplierService, inventoryService, saleService, purchaseOrderService, insightService, anomalyService, simulatorService, performanceService, assistantService.", bold_prefix="services/index.js: ")

    # 5. Modular UI Components
    add_heading_3(doc, "3.3.5 Reusable UI Components (client/src/components/*)")
    add_paragraph(doc, "The frontend maintains 18 reusable UI components:")
    add_bullet(doc, "Layout.jsx: Top-level application shell. Renders fixed 220px desktop sidebar, responsive header topbar, user profile avatar with role badge, and embeds the floating <AssistantWidget />.", bold_prefix="Layout.jsx: ")
    add_bullet(doc, "ProtectedRoute.jsx: Route wrapper. If !user, redirects to /login. If roles specified and !roles.includes(user.role), redirects to / with permission warning.", bold_prefix="ProtectedRoute.jsx: ")
    add_bullet(doc, "MetricCard.jsx: KPI summary card displaying title, numerical value, delta badge, and contextual subtitle.", bold_prefix="MetricCard.jsx: ")
    add_bullet(doc, "Pill.jsx: Color-coded status badge rendering health statuses (Critical, Warning, Healthy) and alert priorities.", bold_prefix="Pill.jsx: ")
    add_bullet(doc, "AbcXyzMatrix.jsx: Interactive 3x3 grid component visualizing product distribution across AX through CZ cells with count badges and drill-down links.", bold_prefix="AbcXyzMatrix.jsx: ")
    add_bullet(doc, "HealthChart.jsx: Recharts horizontal stacked bar chart showing the 4 weighted health score components (Stock Cover, Risk Safety, Supplier Reliability, Demand Stability).", bold_prefix="HealthChart.jsx: ")
    add_bullet(doc, "ForecastChart.jsx: Recharts composed area chart displaying 52 weeks of historical sales actuals concatenated with a 3-week predictive horizon and stacked 80% confidence interval band.", bold_prefix="ForecastChart.jsx: ")
    add_bullet(doc, "WhyPanel.jsx: Explainable AI attribution panel rendering top risk drivers with percentage progress bars and plain-language impact descriptions.", bold_prefix="WhyPanel.jsx: ")
    add_bullet(doc, "AssistantWidget.jsx & ChatMessages.jsx: Collapsible floating chatbot widget in the bottom-right viewport. Renders message bubbles, prompt suggestions, and separates Facts from Recommendations.", bold_prefix="AssistantWidget.jsx: ")
    add_bullet(doc, "Pagination.jsx, SearchBar.jsx, Field.jsx, PageHeader.jsx, Icon.jsx, ProductThumb.jsx, ProductCell.jsx, ProductSelect.jsx: Foundational form and table controls.", bold_prefix="Foundational Controls: ")

    # 6. Primary Application Pages
    add_heading_3(doc, "3.3.6 Primary Application Pages (client/src/pages/*)")
    add_paragraph(doc, "The platform delivers 20 dedicated screen views across analytics, decision-support, and CRUD administration:")

    # Page 1: Dashboard
    add_paragraph(doc, "Dashboard View (/):", bold_prefix="Dashboard.jsx: ")
    add_paragraph(doc, 
        "Primary executive landing screen. Fetches GET /api/insights?full=1 and system health probes. Renders 4 KPI cards "
        "(Critical Alerts, At-Risk Products, Average Health Score, Reorder Recommendations), service connectivity indicators, "
        "health status distribution chart, interactive 3x3 ABC-XYZ classification matrix, and an urgent attention table highlighting "
        "products with negative cover margins. Includes 'Refresh Insights' CTA."
    )
    add_screenshot_slot(doc, "Dashboard View", "Overview of KPI metric cards, health score distribution, ABC-XYZ matrix, and urgent inventory alerts.")

    # Page 2: Smart Reorder
    add_paragraph(doc, "Smart Reorder View (/reorder):", bold_prefix="SmartReorder.jsx: ")
    add_paragraph(doc, 
        "Prescriptive procurement recommendation view. Filters products where recommended order_qty > 0. Renders interactive "
        "data table displaying product code, thumbnail, ABC-XYZ class, current stock, units on order, reorder point (ROP), "
        "recommended order quantity, supplier lead time, and reliability score. Each row includes a 'Create PO' CTA button "
        "that opens the Purchase Order creation form pre-filled with the exact supplier and suggested unit count."
    )
    add_screenshot_slot(doc, "Smart Reorder View", "Procurement planning table displaying calculated reorder points, suggested unit quantities, and pre-filled Create PO actions.")

    # Page 3: Intelligent Alerts
    add_paragraph(doc, "Alerts View (/alerts):", bold_prefix="Alerts.jsx: ")
    add_paragraph(doc, 
        "Centralized exception management grid. Flattens structured product alerts into dedicated alert rows. Supports filtering "
        "by priority (Critical, High, Medium, Low) and alert type (stockout_before_delivery, reorder_now, overstock, supplier_risk). "
        "Displays cover margin days, expected stockout date, and expected delivery date."
    )
    add_screenshot_slot(doc, "Intelligent Alerts View", "Risk-based alert priority queue sorted by replenishment margin urgency.")

    # Page 4: What-If Simulator
    add_paragraph(doc, "What-If Simulator View (/simulator):", bold_prefix="Simulator.jsx: ")
    add_paragraph(doc, 
        "Interactive scenario modeling console. Features interactive sliders for Demand Adjustment (-50% to +100%), "
        "Extra Supplier Delay (0 to 30 days), Baseline Stock Level, and Proposed Order Quantity. Dispatches POST /api/simulator. "
        "Displays side-by-side 'Before' vs 'After' comparison table and a 30-day projected inventory trajectory chart with "
        "shortfall crossover indicators."
    )
    add_screenshot_slot(doc, "What-If Simulator View", "Interactive slider controls with side-by-side scenario comparison table and 30-day stock depletion projections.")

    # Page 5: Product Insight Detail
    add_paragraph(doc, "Product Insight Detail View (/product/:code):", bold_prefix="ProductInsight.jsx: ")
    add_paragraph(doc, 
        "Comprehensive deep-dive analytical view for an individual product. Renders 52-week historical sales trend with 3-week "
        "Recharts forecast band, health score breakdown bars, calibrated stockout risk percentage, SHAP WhyPanel attribution, "
        "ABC-XYZ class, YoY trend indicators, primary supplier scorecard, and one-click reorder actions."
    )
    add_screenshot_slot(doc, "Product Insight Detail View", "Single-product analytical dashboard with 52-week sales history, forecast confidence bands, and SHAP explainability panel.")

    # Page 6: Anomalies
    add_paragraph(doc, "Anomalies View (/anomalies):", bold_prefix="Anomalies.jsx: ")
    add_paragraph(doc, 
        "Inventory exception and operational audit view. Queries GET /api/anomalies with filter controls for time window (30d, 90d, 1y, 2y) "
        "and anomaly type (Sales Spike, Zero Sales, Stock Mismatch, Extreme Supplier Delay). Renders summary metric cards and a detailed "
        "audit log table with plain-language explanations of observed deviations."
    )
    add_screenshot_slot(doc, "Anomalies Audit View", "Auditing table displaying detected sales spikes, zero-sales days, and stock count mismatches with plain-language explanations.")

    # Page 7: Supplier Risk
    add_paragraph(doc, "Supplier Risk View (/supplier-risk):", bold_prefix="SupplierRisk.jsx: ")
    add_paragraph(doc, 
        "Supply chain resilience dashboard. Renders supplier scorecards sorted from highest risk to lowest. Displays on-time delivery rate, "
        "average delay days, lead-time standard deviation, defect rate, and risk tier (Low, Medium, High)."
    )
    add_screenshot_slot(doc, "Supplier Risk View", "Supplier reliability rankings, on-time delivery percentages, and lead-time variance scorecards.")

    # Page 8: Model Performance
    add_paragraph(doc, "Model Performance View (/performance):", bold_prefix="ModelPerformance.jsx: ")
    add_paragraph(doc, 
        "Transparent machine learning validation dashboard. Loads saved holdout test metrics from GET /api/ml-performance. "
        "Displays comparative regression metrics (MAE, RMSE, MAPE, WAPE) of HistGradientBoosting vs Naive/Moving Average baselines, "
        "classification metrics (Precision, Recall, F1, ROC-AUC) for stockout prediction, and Isolation Forest anomaly detection benchmarks."
    )
    add_screenshot_slot(doc, "Model Performance View", "Validation accuracy dashboard displaying real holdout test metrics (WAPE, MAPE, F1) compared against baseline heuristics.")

    # Page 9: AI Assistant Full Screen
    add_paragraph(doc, "AI Assistant View (/assistant):", bold_prefix="Assistant.jsx: ")
    add_paragraph(doc, 
        "Dedicated full-screen conversational assistant interface. Features structured prompt suggestions, multi-turn chat history, "
        "verifiable 'Data Used' tool lookup audit trail, and strict separation between factual inventory metrics and prescriptive recommendations."
    )
    add_screenshot_slot(doc, "AI Assistant View", "Conversational interface displaying structured prompt chips, tool lookup indicators, and separated Facts vs Recommendations.")

    # Page 10: Master Data CRUD Pages
    add_paragraph(doc, "Master Data & Transactional CRUD Pages:", bold_prefix="Catalog & Transaction Views: ")
    add_paragraph(doc, 
        "Standardized management views powered by useList and Zod validation: ProductList/Form, SupplierList/Form, "
        "InventoryList/Form (stock counts), SaleList/Form (POS transactions), and PurchaseOrderList/Form (procurement tracking). "
        "Enforces server-side pagination (15 rows/page), dynamic regex search, and role-based action controls."
    )
