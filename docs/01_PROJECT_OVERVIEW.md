# 01. Project Overview & Tech Stack

---

## 1. What Problem This Project Solves (In Plain Words)

Running a retail or e-commerce business involves a constant balancing act between two expensive mistakes:

1. **Stockouts (Running out of products):** If a customer wants to buy wireless earbuds and your warehouse is empty, you lose that sale immediately. Worse, the customer might go to your competitor and never return.
2. **Overstocking (Buying way too much):** If you panic and order 10,000 earbuds that sit on shelves for six months, your cash is frozen. You pay storage fees, risk damage, and products can become obsolete.

Traditional small-to-medium businesses manage this with basic Excel spreadsheets, static gut feeling, or simple "minimum stock" alerts (e.g., *"reorder when stock hits 20"*). But that fails in real life because:
- **Demand changes constantly:** Weekends have surges, holidays create spikes, and some products trend upward while others fade.
- **Suppliers are human:** A supplier might promise 7-day delivery, but in reality, they arrive in 12 days with 5% defective items.
- **Delivery takes time:** If your supplier takes 10 days to deliver, and you only notice you are low on stock 2 days before running out, an 8-day stockout is guaranteed.

### What This Software Does
**AI-Powered Inventory & Supply Chain Intelligence** is an automated decision-support web application for retailers. It brings enterprise-grade intelligence to warehouse managers by:
- Forecasting customer demand 1 to 3 weeks ahead using machine learning.
- Calculating the exact statistical risk (0% to 100%) that a product will run out before replenishment arrives.
- Recommending **smart reorder quantities** that factor in safety stock, supplier delivery delays, and minimum order sizes.
- Tracking supplier reliability (who delivers on time and who causes delays).
- Detecting bookkeeping mistakes and strange sales anomalies (like sudden 4x spikes or suspicious zero-sales days).
- Providing an **AI Assistant** and **What-If Simulator** so managers can ask questions like *"What happens if demand jumps 20% next week?"* and get instant data-backed answers.

---

## 2. Who Uses It and User Personas

The system features **Role-Based Access Control (RBAC)** tailored to three distinct personas:

| Role | Persona | Daily Tasks & Permissions |
|---|---|---|
| **Admin** | Business Owner / VP of Operations | Full system access. Configures suppliers, triggers batch ML model recalculations, manages user accounts, overrides system settings, and deletes erroneous records. |
| **Manager** | Warehouse / Inventory Manager | Oversees stock levels. Views dashboards, reviews AI alerts, approves and creates Purchase Orders (POs), runs What-If simulations, and adjusts product metadata. Can create and edit records but cannot delete them. |
| **Staff** | Warehouse Associate / Cashier | Day-to-day data entry. Records daily sales transactions and updates physical stock counts after manual inventory audits. Read-only access to analytics pages to prevent accidental business disruptions. |

---

## 3. Full Tech Stack & Why Each Tool Was Chosen

The project uses a modern **multi-service architecture** that separates user interface, business orchestration, and heavy mathematical computation:

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│ React 19 • Vite • Recharts • Tailwind CSS • Axios • Lucide   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON (REST)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                         │
│ Node.js 20 • Express 5 • MongoDB (Mongoose 9) • JWT • Zod   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal HTTP (X-Service-Token)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      ML SERVICE LAYER                       │
│ Python 3.11 • FastAPI • pandas • scikit-learn • SHAP • NumPy│
└─────────────────────────────────────────────────────────────┘
```

### 3.1. Frontend (Client)
- **React 19:** Component-based UI library. Perfect for dynamic dashboards where charts, tables, and metric cards need to react smoothly to user input.
- **Vite:** Next-generation build tool that replaces sluggish webpack bundlers. Provides near-instant Hot Module Replacement (HMR) during local development.
- **Recharts:** Declarative chart library built on SVG and React. Powers our 52-week historical demand curves, 80% confidence interval bands, and 30-day stock projection paths.
- **Axios:** Robust HTTP client. Configured with global interceptors to attach JWT Bearer tokens to outgoing requests and automatically redirect to `/login` when tokens expire.
- **Lucide Icons:** Clean, lightweight SVG icon system for modern inventory UI elements.
- **Pure CSS / Tailwind Utilities:** Fast styling without heavy runtime UI library bloat.

### 3.2. Backend (Server)
- **Node.js (ES Modules):** High-throughput, non-blocking asynchronous JavaScript runtime using modern `import`/`export` syntax.
- **Express 5:** Minimalist and fast web server framework. Handles API routing, authentication, request validation, and orchestrates calls between MongoDB and the Python service.
- **MongoDB & Mongoose 9:** Schema-based NoSQL database. Excellent for document-based inventory records, sales transactions, nested insight payloads, and fast JSON querying.
- **JSON Web Tokens (JWT) & bcryptjs:** Industry-standard stateless authentication. Passwords are securely hashed with 10 salt rounds; tokens carry user identity and role.
- **Zod:** TypeScript-first schema declaration and data validation library. It strips unexpected fields to prevent mass-assignment attacks before data touches the database.
- **Helmet & Morgan:** Helmet secures HTTP response headers; Morgan provides developer request logging.

### 3.3. Machine Learning Service (ml-service)
- **Python 3.11:** The native language of data science and machine learning.
- **FastAPI & Uvicorn:** Blazing fast ASGI Python web framework with automatic OpenAPI documentation and strict data typing.
- **pandas & NumPy:** The core data manipulation engines for time-series aggregation, rolling averages, weekly resampling, and vector math.
- **scikit-learn:** Production-ready machine learning toolkit:
  - `HistGradientBoostingRegressor` and `RandomForestRegressor` for demand forecasting.
  - `RandomForestClassifier` and `LogisticRegression` for stockout risk classification.
  - `IsolationForest` for unsupervised anomaly detection on sales and stock counts.
- **SHAP (SHapley Additive exPlanations):** Explainable AI framework based on cooperative game theory. Explains *why* the ML model flagged a product as high risk.
- **joblib:** Fast serialisation library to save and load trained machine learning models from disk.

---

## 4. Complete Master File & Folder Tree

Below is the complete inventory of every file and folder in the repository, along with its exact one-line purpose.

```text
ai-inventory-intelligence/
├── .gitignore                          # Excludes node_modules, Python venvs, local logs, and secrets from Git
├── README.md                           # Main repository landing page and developer runbook
├── PROJECT_DOCUMENTATION.docx          # Word documentation artifact for offline enterprise review
├── review_bundle.txt                   # Flat text dump of key files for AI model ingestion and review
├── fetch_product_images.py             # Utility script to scrape or download product thumbnail images
├── pick_images.py                      # Interactive script to associate image files with catalog product codes
├── pick.html                           # Lightweight HTML browser tool for visually reviewing product images
├── import_manual.py                    # Script to import manual product image assets into public directories
│
├── client/                             # ================= FRONTEND WEB APPLICATION =================
│   ├── .env                            # Client environment configuration (API base URL, port)
│   ├── .gitignore                      # Git ignore rules specific to Vite and npm build outputs
│   ├── index.html                      # Single Page Application HTML root template and viewport meta
│   ├── package.json                    # Client dependencies (React, Vite, Recharts, Axios, Lucide)
│   ├── package-lock.json               # Locked dependency tree for deterministic npm installs
│   ├── vite.config.js                  # Vite bundler configuration, dev server port, and build options
│   ├── eslint.config.js                # ESLint rules and syntax linting setup for React JSX
│   ├── components.json                 # Metadata configuration for UI component conventions
│   ├── tsconfig.json                   # Base TypeScript compiler settings
│   ├── tsconfig.app.json               # TypeScript config applied to application code
│   ├── tsconfig.node.json              # TypeScript config applied to Vite configuration files
│   ├── README.md                       # Frontend quickstart and setup notes
│   │
│   ├── public/                         # Static assets served directly by Vite
│   │   ├── favicon.svg                 # Browser tab favicon icon
│   │   ├── icons.svg                   # SVG sprite collection
│   │   └── products/                   # Directory containing 40 individual product image assets (P001.jpg - P040.jpg)
│   │
│   └── src/                            # React application source code
│       ├── main.jsx                    # React 19 application entry point; renders App into DOM #root
│       ├── App.jsx                     # Top-level router definitions, route protection, and lazy loading
│       ├── index.css                   # Global styles, CSS custom properties, typography, and card themes
│       ├── vite-env.d.ts               # Vite TypeScript environment declarations
│       │
│       ├── assets/                     # Static UI imagery
│       │   ├── hero.png                # Marketing banner illustration for login and dashboard headers
│       │   ├── react.svg               # React logo asset
│       │   └── vite.svg                # Vite logo asset
│       │
│       ├── components/                 # Reusable React UI presentation components
│       │   ├── Layout.jsx              # Main dashboard frame with collapsible sidebar, topbar, and user menu
│       │   ├── PageHeader.jsx          # Standardized header with page title, description, and primary CTA
│       │   ├── ProtectedRoute.jsx      # Route guard verifying user authentication and RBAC roles
│       │   ├── MetricCard.jsx          # KPI display card showing values, badges, and status colors
│       │   ├── Pill.jsx                # Color-coded status badge for priorities (Critical, High, Medium, Low)
│       │   ├── Pagination.jsx          # Reusable numeric pagination control for table datasets
│       │   ├── SearchBar.jsx           # Input search box with debounced change handlers
│       │   ├── Field.jsx               # Form input wrapper with label, error display, and accessibility tags
│       │   ├── Icon.jsx                # Icon wrapper mapping string identifiers to Lucide SVG icons
│       │   ├── ProductCell.jsx         # Table cell rendering product thumbnail, name, SKU, and detail link
│       │   ├── ProductSelect.jsx       # Dropdown component for picking products across forms and filters
│       │   ├── ProductThumb.jsx        # Image element with fallback placeholder handling for products
│       │   ├── StaleDataBanner.jsx     # Warning banner displayed when data freshness lags behind current date
│       │   ├── WhyPanel.jsx            # Explainable AI side panel explaining stockout risk factors via SHAP
│       │   ├── AbcXyzMatrix.jsx        # 3x3 interactive grid displaying inventory classification breakdown
│       │   ├── ForecastChart.jsx       # Recharts area chart showing 52-week sales history and 3-week forecast
│       │   ├── HealthChart.jsx         # Visual gauge/bar breakdown of the 4 inventory health components
│       │   ├── AssistantWidget.jsx     # Floating chat button and sliding drawer widget for AI assistant
│       │   └── ChatMessages.jsx        # Message thread renderer separating Facts from Recommendations
│       │
│       ├── context/                    # React Context providers for global application state
│       │   ├── authContext.js          # React Context definition for user authentication state
│       │   ├── AuthProvider.jsx        # Auth state provider holding token, user profile, login, and logout
│       │   ├── useAuth.js              # Custom hook to consume the AuthContext
│       │   ├── assistantChatContext.js # Context definition for persistent AI assistant chat sessions
│       │   ├── AssistantChatProvider.jsx # Chat state provider managing message history and loading flags
│       │   ├── useAssistantChat.js     # Hook exposing assistant chat actions and message dispatchers
│       │   ├── useAssistantChatContext.js # Hook exposing the raw assistant chat context
│       │   ├── productImageContext.js  # Context definition for global product image modal viewer
│       │   ├── ProductImageViewer.jsx  # Full-screen image preview modal triggered by thumbnail clicks
│       │   └── useProductImageViewer.js# Hook to open and close the product image viewer modal
│       │
│       ├── hooks/                      # Custom utility hooks
│       │   ├── useFetch.js             # Generic data fetching hook with loading, data, and error state
│       │   ├── useList.js              # Data table hook managing pagination, sort, search, and filters
│       │   ├── useAssistantChat.js     # Hook wrapping API calls to `/api/assistant`
│       │   └── useAssistantChatContext.js # Internal hook for assistant chat state consumption
│       │
│       ├── lib/                        # Core utility libraries
│       │   └── utils.js                # Class name merging and string manipulation helper utilities
│       │
│       ├── pages/                      # Top-level screen components mounted to URL routes
│       │   ├── Login.jsx               # User authentication login screen with demo credential pills
│       │   ├── Dashboard.jsx           # Main executive overview: KPIs, health chart, ABC-XYZ, urgent actions
│       │   ├── Alerts.jsx              # Actionable supply chain alerts sorted by urgency and margin days
│       │   ├── SmartReorder.jsx        # Automated replenishment table with calculated order sizes and MOQ
│       │   ├── TrendSeasonality.jsx    # Demand patterns, year-over-year trends, and seasonal peaks
│       │   ├── SupplierRisk.jsx        # Supplier scorecard ranking reliability, delays, and defect rates
│       │   ├── SupplierDeliveries.jsx  # Drill-down table showing historical delivery performance for a vendor
│       │   ├── ProductInsight.jsx      # Deep-dive 360-degree analytics page for an individual product
│       │   ├── ProductList.jsx         # Inventory catalog management table with search and category filters
│       │   ├── ProductForm.jsx         # Create and edit form for catalog product items
│       │   ├── InventoryList.jsx       # Physical stock ledger showing current on-hand and in-transit counts
│       │   ├── InventoryForm.jsx       # Form to perform stock adjustments and warehouse count updates
│       │   ├── SaleList.jsx            # Transaction history table showing units sold, revenue, and promos
│       │   ├── SaleForm.jsx            # Point-of-sale entry form to log new customer sales transactions
│       │   ├── SupplierList.jsx        # Vendor master list showing contact information and lead times
│       │   ├── SupplierForm.jsx        # Create and edit form for suppliers
│       │   ├── PurchaseOrderList.jsx   # Procurement table tracking open, in-transit, and delivered orders
│       │   ├── PurchaseOrderForm.jsx   # Procurement form to issue purchase orders to suppliers
│       │   ├── Anomalies.jsx           # Machine-learning flagged data blips (sales spikes, zero sales, stock mismatch)
│       │   ├── Simulator.jsx           # Interactive What-If sandbox to model demand shocks and supplier delays
│       │   ├── ModelPerformance.jsx    # Model evaluation scorecard showing MAE, RMSE, MAPE, WAPE, and F1
│       │   └── Assistant.jsx           # Full-page interactive AI chat assistant workspace
│       │
│       ├── services/                   # HTTP client integration layer
│       │   ├── api.js                  # Axios instance with base URL, timeout, and JWT auth interceptors
│       │   └── index.js                # Resource-specific API services (products, sales, insights, simulator)
│       │
│       └── utils/                      # Helper formatting and parsing functions
│           ├── exportCsv.js            # Browser utility to export table data into downloadable CSV files
│           ├── format.js               # Number, currency, percentage, and date string formatters
│           └── productImage.js         # Fallback generator for product image URLs
│
├── server/                             # ================= BACKEND WEB APPLICATION =================
│   ├── .env                            # Backend secrets and configuration (MongoDB URI, JWT secret, ports)
│   ├── .env.example                    # Template showing required environment variable keys
│   ├── package.json                    # Node dependencies (Express 5, Mongoose, Zod, JWT, Helmet)
│   ├── package-lock.json               # Locked dependency tree for Node packages
│   ├── eslint.config.js                # ESLint configuration for ES module server code
│   │
│   ├── src/                            # Server application source code
│   │   ├── index.js                    # Express application entry point; connects DB and starts HTTP server
│   │   │
│   │   ├── config/                     # Environment and database setup
│   │   │   └── db.js                   # Mongoose connection handler with retry logic and error logging
│   │   │
│   │   ├── controllers/                # Business logic and database query execution
│   │   │   ├── authController.js       # Handles user registration, login verification, and profile lookups
│   │   │   ├── crudFactory.js          # Generic reusable CRUD controller for standard Mongoose models
│   │   │   └── insightsController.js   # Orchestrates ML service calls, stores insight documents, and aggregations
│   │   │
│   │   ├── middleware/                 # Express request processing middleware
│   │   │   ├── auth.js                 # Verifies JWT Bearer tokens and enforces role permissions
│   │   │   ├── errorHandler.js         # Centralized error handler converting exceptions to clean JSON
│   │   │   └── validate.js             # Zod schema validation middleware checking request bodies
│   │   │
│   │   ├── models/                     # Mongoose schemas and database models
│   │   │   ├── User.js                 # User schema (email, bcrypt password, role: admin/manager/staff)
│   │   │   ├── Supplier.js             # Supplier schema (code, name, lead time, contact info)
│   │   │   ├── Product.js              # Product schema (SKU, name, category, prices, lead time, supplier)
│   │   │   ├── Inventory.js            # Inventory schema (stock on hand, in-transit, safety stock, location)
│   │   │   ├── Sale.js                 # Daily sales transaction schema (product, date, units, revenue, promo)
│   │   │   ├── PurchaseOrder.js        # Purchase order schema (PO number, vendor, status, dates, delay)
│   │   │   ├── Insight.js              # Stored ML analytics cache per product (priority, health, risk, reorder)
│   │   │   └── AuditLog.js             # Audit trail schema logging destructive actions and stock overrides
│   │   │
│   │   ├── routes/                     # Express API endpoint definitions
│   │   │   ├── health.js               # Service health check endpoint (`GET /api/health`)
│   │   │   ├── auth.js                 # Authentication routes (`POST /register`, `POST /login`, `GET /me`)
│   │   │   ├── crudRouter.js           # Higher-order router generator binding models to CRUD endpoints
│   │   │   ├── suppliers.js            # Supplier resource endpoints (`/api/suppliers`)
│   │   │   ├── products.js             # Product catalog endpoints (`/api/products`)
│   │   │   ├── inventory.js            # Stock ledger endpoints (`/api/inventory`)
│   │   │   ├── sales.js                # Sales history endpoints (`/api/sales`)
│   │   │   ├── purchaseOrders.js       # Procurement PO endpoints (`/api/purchase-orders`)
│   │   │   ├── insights.js             # ML analytics proxy endpoints (`/api/insights`)
│   │   │   ├── supplierRisk.js         # Vendor scorecard proxy endpoints (`/api/supplier-risk`)
│   │   │   ├── anomalies.js            # Data blip detection endpoints (`/api/anomalies`)
│   │   │   ├── simulator.js            # What-if scenario modeling endpoints (`/api/simulator`)
│   │   │   ├── assistant.js            # AI chat agent endpoint with tool execution (`/api/assistant`)
│   │   │   └── mlPerformance.js        # Model validation metrics endpoint (`/api/ml-performance`)
│   │   │
│   │   ├── scripts/                    # Maintenance and operational scripts
│   │   │   └── advanceData.js          # Utility script to roll synthetic dates forward to match current date
│   │   │
│   │   ├── seed/                       # Database seeding logic
│   │   │   └── seed.js                 # Seeds MongoDB from CSV files with 40 products, 8 suppliers, and users
│   │   │
│   │   ├── services/                   # External integration and business logic services
│   │   │   ├── mlService.js            # HTTP client making authenticated requests to Python FastAPI service
│   │   │   ├── openPurchaseOrders.js   # Calculates open quantities and earliest arrival dates from open POs
│   │   │   ├── assistant.js            # LLM agent engine orchestrating OpenAI-compatible tool calling loops
│   │   │   └── assistantTools.js       # Defines 10 read-only database and ML lookup tools for the assistant
│   │   │
│   │   ├── utils/                      # Server helper utilities
│   │   │   ├── AppError.js             # Custom Error class carrying HTTP status codes and details
│   │   │   └── asyncHandler.js         # Wrapper forwarding asynchronous Promise rejections to error handler
│   │   │
│   │   └── validators/                 # Request validation schemas
│   │       └── schemas.js              # Zod validation schemas for products, sales, orders, and simulators
│   │
│   └── test/                           # Backend unit and integration tests
│       ├── openPurchaseOrders.test.js  # Tests aggregation of pending and in-transit purchase order quantities
│       ├── receivePurchaseOrder.test.js# Tests stock increment logic when purchase orders are marked delivered
│       ├── salesAndPo.test.js          # Tests sales validation, pricing calculations, and order creation
│       ├── staleData.test.js           # Tests calculation of data age and stale data flags
│       └── syncInTransit.test.js       # Tests synchronisation between open POs and Inventory in-transit count
│
├── ml-service/                         # ================= PYTHON MACHINE LEARNING SERVICE =================
│   ├── .env                            # Python service environment variables (port, shared service token)
│   ├── .env.example                    # Template for Python environment variable keys
│   ├── requirements.txt                # Python package dependencies (FastAPI, scikit-learn, pandas, SHAP)
│   ├── pytest.ini                      # Pytest runner configuration
│   │
│   ├── app/                            # Python application source code
│   │   ├── __init__.py                 # Marks `app` as a Python package
│   │   ├── main.py                     # FastAPI application setup, CORS middleware, token auth, and routes
│   │   ├── preprocessing.py            # Loads raw CSVs, handles cleaning, missing dates, and feature engineering
│   │   ├── evaluation.py               # Calculation functions for MAE, RMSE, MAPE, and WAPE metrics
│   │   ├── baseline.py                 # Benchmarking baselines: Naive, 4-Week Moving Average, Seasonal Naive
│   │   ├── forecasting.py              # Direct multi-horizon (h=1,2,3) demand forecasting logic and inference
│   │   ├── train_forecast.py           # Training pipeline selecting best regressor (HistGradientBoosting vs RF)
│   │   ├── risk.py                     # Stockout risk classification model and Platt probability calibration
│   │   ├── train_risk.py               # Training pipeline fitting the stockout classifier with time-based purging
│   │   ├── trend.py                    # YoY trend calculation, t-test significance, and seasonal autocorrelation
│   │   ├── decision.py                 # Pure rule-based engine: Safety Stock, Smart Reorder, ABC-XYZ, Supplier
│   │   ├── health.py                   # Pure mathematical formulas for Inventory Health Score (0-100) and Alerts
│   │   ├── insights.py                 # Aggregates forecast, risk, reorder, health, and alerts into one response
│   │   ├── anomaly.py                  # Unsupervised Isolation Forest for sales spikes, zero days, and stock blips
│   │   ├── explain.py                  # SHAP TreeExplainer and linear factor decomposition of stockout risk
│   │   ├── simulator.py                # Pure what-if scenario engine with 30-day day-by-day inventory projection
│   │   ├── performance.py              # Aggregates trained model metrics and benchmark comparisons for the UI
│   │   ├── routes_forecast.py          # FastAPI endpoint (`POST /forecast`) for 3-week demand forecasting
│   │   ├── routes_risk.py              # FastAPI endpoints (`POST /risk`, `GET /risk/all`, `POST /trend`)
│   │   ├── routes_insights.py          # FastAPI endpoints (`POST /insights`, `GET /insights/all`, `/supplier-risk`)
│   │   ├── routes_explain.py           # FastAPI endpoints (`POST /explain`, `GET /anomalies`)
│   │   ├── routes_simulate.py          # FastAPI endpoints (`POST /simulate`, `POST /simulate/all`)
│   │   └── routes_performance.py       # FastAPI endpoint (`GET /model-performance`)
│   │
│   ├── data/                           # Synthetic ground-truth datasets (730 days / 2 years of history)
│   │   ├── generate_data.py            # Generates realistic synthetic datasets with seed 42 and planted patterns
│   │   ├── validate_data.py            # Statistical assertions checking data distributions and absence of leaks
│   │   ├── products.csv                # 40 products across 6 categories with lead times, prices, and suppliers
│   │   ├── suppliers.csv               # 8 suppliers with baseline lead times, on-time rates, and quality ratings
│   │   ├── sales.csv                   # 29,200 daily sales rows (40 products x 730 days) with units and revenue
│   │   ├── stock_history.csv           # 29,200 daily stock records built backwards to guarantee historical parity
│   │   ├── inventory_snapshot.csv      # Current stock-on-hand snapshot for each product
│   │   ├── purchase_orders.csv         # 398 historical and active purchase orders with actual delivery dates
│   │   ├── scenario_labels.csv         # Ground-truth scenario labels used solely to validate model accuracy
│   │   └── plots/                      # Visual verification outputs
│   │       └── sample_products.png     # Rendered matplotlib time-series chart of demand patterns
│   │
│   ├── models/                         # Serialized model artifacts and metric evaluation reports
│   │   ├── forecast_models.joblib      # Trained multi-horizon forecasting models for h=1, 2, 3
│   │   ├── forecast_metrics.json       # Holdout evaluation metrics (MAE, RMSE, MAPE, WAPE) for forecasting
│   │   ├── baseline_metrics.json       # Baseline metrics (Naive, 4-Week MA) for performance comparison
│   │   ├── risk_model.joblib           # Trained Random Forest stockout classifier and Platt probability calibrator
│   │   ├── risk_metrics.json           # Holdout evaluation metrics (Precision, Recall, F1, ROC-AUC, PR-AUC)
│   │   ├── anomaly_models.joblib       # Trained Isolation Forest models for sales and stock anomaly detection
│   │   ├── anomaly_metrics.json        # Evaluation report for anomaly detection against planted anomalies
│   │   └── trend_report.csv            # Pre-computed trend classification and seasonality report across products
│   │
│   └── tests/                          # Automated Pytest suite for the ML service
│       ├── test_preprocessing.py       # Verifies weekly aggregation and lag feature integrity without leakage
│       ├── test_forecasting.py         # Tests model loading, multi-horizon inference, and prediction intervals
│       ├── test_risk.py                # Tests stockout feature construction, probability calibration, and thresholds
│       ├── test_trend.py               # Tests YoY change, t-test significance, and seasonal autocorrelation
│       ├── test_decision.py            # Tests safety stock formulas, smart reorder, ABC-XYZ, and supplier scoring
│       ├── test_health.py              # Tests health score calculations, component weights, and alert priority
│       ├── test_anomaly.py             # Tests Isolation Forest feature engineering and anomaly score thresholds
│       ├── test_explain.py             # Tests SHAP additivity (base value + sum of contributions == raw score)
│       ├── test_simulator.py           # Tests what-if scenario before/after parity and 30-day stock projections
│       ├── test_simulate_all.py        # Tests portfolio-wide simulation across all 40 products
│       ├── test_open_pos.py            # Tests open purchase order filtering and arrival date estimation
│       └── test_performance.py         # Tests model performance JSON loading and report formatting
│
└── docs/                               # ================= COMPLETE SYSTEM DOCUMENTATION =================
    ├── README.md                       # Master index linking all documentation files
    ├── 01_PROJECT_OVERVIEW.md          # Problem definition, personas, tech stack, and master file tree (This file)
    ├── 02_ARCHITECTURE.md              # Service communication, protocols, ports, and request lifecycles
    ├── 03_FILE_BY_FILE_GUIDE.md        # File-by-file index and architecture navigation
    ├── 03a_CLIENT_FILES.md             # Exhaustive line-by-line guide for every client file
    ├── 03b_SERVER_FILES.md             # Exhaustive line-by-line guide for every server file
    ├── 03c_ML_SERVICE_FILES.md         # Exhaustive line-by-line guide for every ML service file
    ├── 04_FEATURE_GUIDE.md             # Deep dive into all features, UI flows, and worked formulas
    ├── 05_ML_AND_DATA_GUIDE.md         # Beginner's ML primer, synthetic data patterns, and glossary
    ├── 06_DATABASE_AND_API_GUIDE.md    # MongoDB schemas, ER diagrams, and exhaustive API reference tables
    ├── 07_FRONTEND_GUIDE.md            # React architecture, routing, state management, and Recharts
    ├── 08_HOW_EVERYTHING_CONNECTS.md   # Dependency graphs, 3 end-to-end traces, and edit cheat sheet
    ├── 09_PROBLEMS_AND_IMPROVEMENTS.md # Audit findings, security considerations, and ranked roadmap
    ├── 10_LEARNING_PATH.md             # Reading order, 20 interview Q&A, and 2-minute elevator pitch
    ├── AUDIT.md                        # Read-only architectural and functional audit report
    ├── FULL_AUDIT.md                   # Comprehensive issue tracking and resolution matrix
    ├── NOTES.md                        # Development log, mathematical notes, and daily engineering decisions
    ├── PROGRESS.md                     # 15-day milestone tracking log
    └── screenshots/                    # UI capture gallery across viewport resolutions
```
