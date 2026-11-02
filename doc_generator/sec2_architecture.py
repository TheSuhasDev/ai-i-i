import os
from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_table_custom, add_callout, add_code_block
)

def render_section_2(doc):
    add_heading_1(doc, "2. System Architecture & Data Flows")
    
    add_paragraph(doc, 
        "The system employs a distributed microservice-oriented topology that decouples transactional high-concurrency web traffic "
        "from compute-intensive analytical and machine learning workloads. The architecture consists of four primary runtime tiers: "
        "the Single Page Application (SPA) client tier, the Node.js/Express API gateway and business logic tier, the MongoDB persistence tier, "
        "and the Python/FastAPI machine learning engine."
    )
    
    add_heading_2(doc, "2.1 High-Level Component Interconnect & Security Topology")
    add_paragraph(doc, 
        "The four tiers communicate over strictly controlled network protocols and security boundaries:"
    )

    arch_diagram = (
        "+---------------------------------------------------------------------------------------+\n"
        "|                                CLIENT TIER (React 19 + Vite)                          |\n"
        "|  - Single-page application served on http://localhost:5173                             |\n"
        "|  - Axios HTTP client with Bearer Token interceptors                                    |\n"
        "|  - Dashboard, Reorder, Alerts, Simulator, Anomalies, Performance, AI Assistant         |\n"
        "+------------------------------------------+--------------------------------------------+\n"
        "                                           | HTTPS / REST (Authorization: Bearer <JWT>)\n"
        "                                           v\n"
        "+---------------------------------------------------------------------------------------+\n"
        "|                             BACKEND API GATEWAY (Node.js + Express 5)                 |\n"
        "|  - Port 5000 | Helmet Security Headers | CORS restricted to CLIENT_URL               |\n"
        "|  - JWT Authentication (HS256) & RBAC Authorization Middleware (admin/manager/staff)  |\n"
        "|  - Zod Request Schema Validation & Stripping (mass-assignment mitigation)             |\n"
        "|  - Centralized Error Handling & Async Wrappers                                        |\n"
        "|  - Open Purchase Order Aggregator (Pending/In Transit reconciliation)                |\n"
        "|  - AI Assistant Orchestrator (10 Read-Only Database & ML Inspection Tools)            |\n"
        "+---------------------+-----------------------------------+-----------------------------+\n"
        "                      | Mongoose TCP Connection           | REST (X-Service-Token Header)\n"
        "                      v                                   v\n"
        "+------------------------------------+  +-----------------------------------------------+\n"
        "|       DATABASE TIER (MongoDB)      |  |           ML MICROSERVICE (Python FastAPI)    |\n"
        "|  - Local Community / Atlas Cluster |  |  - Port 8000 | Strict Service Token Auth      |\n"
        "|  - Collections:                    |  |  - Direct Multi-Horizon Forecasting (h=1,2,3) |\n"
        "|    * users                         |  |  - Calibrated Stockout Risk (Platt Scaling)   |\n"
        "|    * suppliers                     |  |  - Explainability Engine (SHAP & Log-Odds)    |\n"
        "|    * products                      |  |  - Rule Decision Engine (Reorder, ABC-XYZ,   |\n"
        "|    * inventory (current snapshots) |  |    Safety Stock, Supplier Reliability)        |\n"
        "|    * sales (historical daily rows) |  |  - Health Scoring & Alert Prioritization     |\n"
        "|    * purchaseorders (open/history) |  |  - What-If Simulation Engine & Projections   |\n"
        "|    * insights (latest ML snapshot) |  |  - Dual-Path Anomaly Detector (IForest+Rules)|\n"
        "+------------------------------------+  +-----------------------------------------------+\n"
    )
    add_code_block(doc, arch_diagram, caption="Logical System Architecture and Communication Protocols")

    add_heading_2(doc, "2.2 Step-by-Step Data Flow Specifications")
    
    add_heading_3(doc, "Data Flow 1: Authentication & Authorization Flow")
    add_bullet(doc, "User enters credentials on client Login page (/login). Form state is sent via POST /api/auth/login.", bold_prefix="1. Submission: ")
    add_bullet(doc, "Express authController receives payload, validates schema via Zod (loginSchema).", bold_prefix="2. Validation: ")
    add_bullet(doc, "Mongoose executes User.findOne({ email }).select('+password'). If absent, returns 401 with generic invalid credentials message.", bold_prefix="3. User Lookup: ")
    add_bullet(doc, "bcrypt.compare(password, user.password) executes. If invalid, returns identical 401 error (preventing user enumeration).", bold_prefix="4. Hash Verification: ")
    add_bullet(doc, "jsonwebtoken signs token with secret JWT_SECRET (verified >= 32 chars on startup), payload { id, role }, expires in 7 days.", bold_prefix="5. Token Generation: ")
    add_bullet(doc, "Client Axios interceptor persists token in localStorage and attaches Authorization: Bearer <token> on all subsequent API dispatches.", bold_prefix="6. Token Storage: ")

    add_heading_3(doc, "Data Flow 2: Live Insights Generation & Refresh Pipeline")
    add_bullet(doc, "User navigates to Dashboard (/), Smart Reorder (/reorder), or clicks 'Refresh Insights' (POST /api/insights/refresh).", bold_prefix="1. Trigger: ")
    add_bullet(doc, "Express insightsController.computeAndStore(product) executes. It reads Inventory.findOne({ product: product._id }) for live shelf stock.", bold_prefix="2. Live Stock Read: ")
    add_bullet(doc, "Controller calls getOpenPurchaseOrderSummary(product._id) in openPurchaseOrders.js. It queries PurchaseOrder for statuses 'Pending' and 'In Transit', sums remaining quantities (qtyOrdered - qtyReceived), and selects earliest expectedDeliveryDate.", bold_prefix="3. PO Reconciliation: ")
    add_bullet(doc, "Express dispatches POST /insights to FastAPI mlService with { product_id, stock, on_order, expected_delivery_date }, authorized by header X-Service-Token.", bold_prefix="4. ML Dispatch: ")
    add_bullet(doc, "FastAPI executes insights_for_product(): calls forecast model (forecasting.py), stockout risk classifier (risk.py), health score & alerts (health.py), and smart reorder formula (decision.py).", bold_prefix="5. ML Synthesis: ")
    add_bullet(doc, "Express receives full JSON payload and executes Insight.findOneAndUpdate({ product: product._id }, updateData, { upsert: true, returnDocument: 'after' }).", bold_prefix="6. Upsert Persistence: ")
    add_bullet(doc, "Client receives updated summary or full payload, rendering urgent tables, health charts, and order quantities.", bold_prefix="7. UI Presentation: ")

    add_heading_3(doc, "Data Flow 3: What-If Inventory Simulator Flow")
    add_bullet(doc, "Manager opens What-If Simulator (/simulator), chooses product P001, and shifts sliders: Demand (+20%), Extra Supplier Delay (+3 days), Stock (50), Order Quantity (100).", bold_prefix="1. Parameter Selection: ")
    add_bullet(doc, "Client sends POST /api/simulator with scenario adjustments.", bold_prefix="2. Client Dispatch: ")
    add_bullet(doc, "Express queries live MongoDB stock and open POs, bundles parameters, and forwards to FastAPI POST /simulate.", bold_prefix="3. Backend Forwarding: ")
    add_bullet(doc, "ml-service/app/simulator.py executes simulate(): computes baseline state using identical production formulas, applies demand scaling (modifying trailing 28-day window for risk classifier), shifts delivery dates by extra delay, computes new safety stock, and projects daily stock over 30 days.", bold_prefix="4. Simulation Compute: ")
    add_bullet(doc, "Response returns side-by-side 'before' and 'after' metrics (risk %, health score, alert priority, stockout date, units short) plus 30-day projection series.", bold_prefix="5. Payload Return: ")
    add_bullet(doc, "React renders comparison table and multi-line Recharts projection with shortfall crossover points and 'Create PO' prefill CTA.", bold_prefix="6. Reactive UI: ")

    add_heading_3(doc, "Data Flow 4: Conversational AI Assistant Tool-Calling Loop")
    add_bullet(doc, "User submits natural-language prompt in Assistant page or persistent bottom-right widget: 'Which products should I reorder today?'.", bold_prefix="1. Chat Input: ")
    add_bullet(doc, "Client sends POST /api/assistant with conversation history. Express enforces per-user in-memory rate limiting (20 requests / 10 minutes).", bold_prefix="2. Rate Limiting: ")
    add_bullet(doc, "assistant.js formats 10 read-only tool declarations into OpenAI-compatible format and calls LLM_BASE_URL (Groq / OpenAI API).", bold_prefix="3. LLM Request: ")
    add_bullet(doc, "LLM model responds with tool call: list_reorder_recommendations({ limit: 10 }).", bold_prefix="4. Tool Selection: ")
    add_bullet(doc, "Express assistantTools.js intercepts and runs the function deterministically against MongoDB Insight collection, returning verified records capped by LLM_MAX_RESULT_CHARS.", bold_prefix="5. Tool Execution: ")
    add_bullet(doc, "assistant.js feeds tool output back into conversation history and requests final synthesis.", bold_prefix="6. Model Synthesis: ")
    add_bullet(doc, "System prompt strictly forces two distinct blocks: '## Facts' (verifiable tool data) and '## Recommendation' (proactive advice).", bold_prefix="7. Structural Enforcement: ")
    add_bullet(doc, "Client UI parses Markdown and displays Facts, Recommendations, and a verified 'Data Used' list of invoked tools.", bold_prefix="8. Dual-Panel Render: ")

    add_heading_2(doc, "2.3 Complete Project Folder Structure Tree")
    add_paragraph(doc, "The repository follows a clean monorepo architecture with strict separation between client, server, ML microservice, and project documentation:")

    tree_str = (
        "ai-inventory-intelligence/\n"
        "|-- .gitignore                               # Root gitignore (ignores node_modules, .env, .venv, *.joblib)\n"
        "|-- README.md                                # High-level project specifications and architectural blueprint\n"
        "|-- fetch_product_images.py                  # Utility script to query Pixabay API for catalog product images\n"
        "|-- import_manual.py                         # Utility script to convert and normalize manual candidate images\n"
        "|-- pick_images.py                           # Automated image pipeline: search, download candidates, crop 400x400\n"
        "|-- pick.html                                # Interactive visual curation gallery for product image selection\n"
        "|-- candidates/                              # Staging folder for downloaded raw candidate product images\n"
        "|-- manual/                                  # Fallback directory for manually supplied high-resolution images\n"
        "|-- docs/\n"
        "|   |-- AUDIT.md                             # Rigorous read-only code and security audit report\n"
        "|   |-- NOTES.md                             # Mathematical formulas, decision logs, and threshold definitions\n"
        "|   +-- PROGRESS.md                          # 15-day development log tracking daily milestones and verification\n"
        "|-- server/\n"
        "|   |-- .env.example                         # Environment variable template for Node.js backend\n"
        "|   |-- eslint.config.js                     # ESLint configuration for ES module server code\n"
        "|   |-- package.json                         # Node dependencies, scripts (dev, start, seed, test, lint)\n"
        "|   |-- test/\n"
        "|   |   +-- openPurchaseOrders.test.js       # Node:test regression suite for PO status and quantity aggregation\n"
        "|   +-- src/\n"
        "|       |-- index.js                         # Server entry point, middleware chain, and port listener\n"
        "|       |-- config/\n"
        "|       |   +-- db.js                        # Mongoose database connection lifecycle handler\n"
        "|       |-- controllers/\n"
        "|       |   |-- authController.js            # User registration, login, JWT issuance, and /me handler\n"
        "|       |   |-- crudFactory.js               # Generic reusable CRUD controller with search, sort, pagination\n"
        "|       |   +-- insightsController.js        # Synthesis controller: live PO/stock aggregation & ML dispatch\n"
        "|       |-- middleware/\n"
        "|       |   |-- auth.js                      # Bearer JWT verification and role authorization guards\n"
        "|       |   |-- errorHandler.js              # Centralized error handler and 404 route catcher\n"
        "|       |   +-- validate.js                  # Zod validation middleware for request body payloads\n"
        "|       |-- models/\n"
        "|       |   |-- User.js                      # Mongoose schema for user accounts and RBAC roles\n"
        "|       |   |-- Supplier.js                  # Mongoose schema for supplier profiles and contacts\n"
        "|       |   |-- Product.js                   # Mongoose schema for catalog items, prices, and lead times\n"
        "|       |   |-- Inventory.js                 # Mongoose schema for current stock snapshots\n"
        "|       |   |-- Sale.js                      # Mongoose schema for historical daily sales transactions\n"
        "|       |   |-- PurchaseOrder.js             # Mongoose schema for purchase orders, receipts, and delays\n"
        "|       |   +-- Insight.js                   # Mongoose schema for latest computed ML decision insights\n"
        "|       |-- routes/\n"
        "|       |   |-- health.js                    # GET /api/health system status probe\n"
        "|       |   |-- auth.js                      # Authentication endpoints (register, login, me)\n"
        "|       |   |-- crudRouter.js                # Helper routing wrapper applying RBAC policies to CRUD controllers\n"
        "|       |   |-- suppliers.js                 # CRUD endpoints for /api/suppliers\n"
        "|       |   |-- products.js                  # CRUD endpoints for /api/products\n"
        "|       |   |-- inventory.js                 # CRUD endpoints for /api/inventory\n"
        "|       |   |-- sales.js                     # CRUD endpoints for /api/sales\n"
        "|       |   |-- purchaseOrders.js            # CRUD endpoints for /api/purchase-orders\n"
        "|       |   |-- insights.js                  # Analytics endpoints (/api/insights, /refresh, /history, /explain)\n"
        "|       |   |-- supplierRisk.js              # Proxy endpoint for GET /api/supplier-risk\n"
        "|       |   |-- anomalies.js                 # Proxy endpoint for GET /api/anomalies\n"
        "|       |   |-- simulator.js                 # Proxy endpoint for POST /api/simulator\n"
        "|       |   |-- assistant.js                 # AI Assistant query and status endpoints\n"
        "|       |   +-- mlPerformance.js             # Model evaluation proxy endpoint\n"
        "|       |-- seed/\n"
        "|       |   +-- seed.js                      # Database seeding script populating MongoDB from ML CSV files\n"
        "|       |-- services/\n"
        "|       |   |-- mlService.js                 # HTTP client communicating with FastAPI ML microservice\n"
        "|       |   |-- openPurchaseOrders.js        # Business logic reconciling open PO quantities and dates\n"
        "|       |   |-- assistant.js                 # Orchestrator managing tool-calling conversational agent\n"
        "|       |   +-- assistantTools.js            # Definitions and handlers for 10 read-only assistant tools\n"
        "|       |-- utils/\n"
        "|       |   |-- AppError.js                  # Custom operational error class carrying HTTP status codes\n"
        "|       |   +-- asyncHandler.js              # Higher-order wrapper catching async route exceptions\n"
        "|       +-- validators/\n"
        "|           +-- schemas.js                   # Strict Zod schemas validating API payload structures\n"
        "|-- ml-service/\n"
        "|   |-- .env.example                         # Environment variable template for FastAPI service\n"
        "|   |-- pytest.ini                           # Pytest test suite discovery and configuration\n"
        "|   |-- requirements.txt                     # Pinned Python package dependencies\n"
        "|   |-- app/\n"
        "|   |   |-- __init__.py                      # Package initialization marker\n"
        "|   |   |-- main.py                          # FastAPI application factory, CORS, and auth middleware\n"
        "|   |   |-- preprocessing.py                 # Data cleaning, calendar aggregation, and feature engineering\n"
        "|   |   |-- evaluation.py                    # Regression evaluation metrics (MAE, RMSE, MAPE, WAPE)\n"
        "|   |   |-- baseline.py                      # Heuristic benchmarks (Naive, Moving Average, Seasonal Naive)\n"
        "|   |   |-- forecasting.py                   # Multi-horizon machine learning forecasting pipeline\n"
        "|   |   |-- train_forecast.py                # Model training, hyperparameter selection, and joblib persistence\n"
        "|   |   |-- risk.py                          # Stockout risk classification, feature tables, and calibration\n"
        "|   |   |-- train_risk.py                    # Risk classifier training, Platt calibration, and metric evaluation\n"
        "|   |   |-- trend.py                         # Year-over-year trend differencing and lag-52 seasonality analysis\n"
        "|   |   |-- decision.py                      # Safety stock, smart reorder, ABC-XYZ, and supplier reliability\n"
        "|   |   |-- health.py                        # Pure mathematical functions for health score and alert priority\n"
        "|   |   |-- insights.py                      # Composite per-product insight synthesis engine\n"
        "|   |   |-- explain.py                       # SHAP TreeExplainer and standardized log-odds attribution\n"
        "|   |   |-- anomaly.py                       # Isolation Forest model and rule-based anomaly detection\n"
        "|   |   |-- simulator.py                     # What-If scenario perturbation and 30-day stock projection\n"
        "|   |   |-- performance.py                   # Loader reading saved metric artifacts into structured schemas\n"
        "|   |   |-- routes_forecast.py               # FastAPI router for POST /forecast\n"
        "|   |   |-- routes_risk.py                   # FastAPI router for POST /risk and POST /trend\n"
        "|   |   |-- routes_insights.py               # FastAPI router for POST /insights and GET /supplier-risk\n"
        "|   |   |-- routes_explain.py                # FastAPI router for POST /explain and GET /anomalies\n"
        "|   |   |-- routes_simulate.py               # FastAPI router for POST /simulate and POST /simulate/all\n"
        "|   |   +-- routes_performance.py            # FastAPI router for GET /model-performance\n"
        "|   |-- data/\n"
        "|   |   |-- generate_data.py                 # Seed 42 synthetic data generator creating realistic retail scenarios\n"
        "|   |   |-- validate_data.py                 # Statistical validator asserting dataset integrity and distributions\n"
        "|   |   |-- products.csv                     # Catalog dataset (40 products across 6 categories)\n"
        "|   |   |-- suppliers.csv                    # Supplier dataset (8 suppliers with diverse reliability profiles)\n"
        "|   |   |-- sales.csv                        # Historical transaction log (730 days x 40 products = 29,200 rows)\n"
        "|   |   |-- inventory_snapshot.csv           # Current stock snapshots and lead times\n"
        "|   |   |-- stock_history.csv                # Daily reconstructed inventory levels over 730 days\n"
        "|   |   |-- purchase_orders.csv              # Purchase order records (398 POs with delay and quality flags)\n"
        "|   |   |-- scenario_labels.csv              # Validation ground-truth labels for audit checks (never a feature)\n"
        "|   |   +-- plots/\n"
        "|   |       +-- sample_products.png          # Visual verification plot of sample sales, stock, and demand\n"
        "|   |-- models/                              # Persisted JSON metrics and serialized joblib model bundles\n"
        "|   |   |-- baseline_metrics.json            # Benchmark metric evaluation results\n"
        "|   |   |-- forecast_metrics.json            # Multi-horizon forecast model evaluation results\n"
        "|   |   |-- risk_metrics.json                # Calibrated risk classifier evaluation results\n"
        "|   |   |-- anomaly_metrics.json             # Isolation Forest vs rule baseline evaluation results\n"
        "|   |   |-- trend_report.csv                 # Per-product trend, seasonality, and peak month analysis\n"
        "|   |   |-- forecast_models.joblib           # Trained multi-horizon regression models (git-ignored)\n"
        "|   |   |-- risk_model.joblib                # Trained calibrated risk classifier (git-ignored)\n"
        "|   |   +-- anomaly_models.joblib            # Trained Isolation Forest models (git-ignored)\n"
        "|   +-- tests/                               # Comprehensive pytest unit and integration test suite (66 tests)\n"
        "|-- client/\n"
        "|   |-- .env                                 # Runtime frontend configuration (VITE_API_URL, VITE_ML_URL)\n"
        "|   |-- package.json                         # Client dependencies, scripts (dev, build, lint, typecheck)\n"
        "|   |-- vite.config.js                       # Vite bundler configuration with React and Tailwind plugins\n"
        "|   |-- public/\n"
        "|   |   |-- favicon.svg                      # Application browser favicon\n"
        "|   |   |-- icons.svg                        # SVG symbol sprite sheet for application icons\n"
        "|   |   +-- products/                        # 40 cropped, normalized 400x400 JPG product thumbnails\n"
        "|   +-- src/\n"
        "|       |-- main.jsx                         # React application root DOM mount point and Provider tree\n"
        "|       |-- App.jsx                          # Main routing tree and route authorization guards\n"
        "|       |-- index.css                        # Design system CSS styles, color tokens, and utility classes\n"
        "|       |-- components/                      # Reusable modular UI components\n"
        "|       |-- context/                         # React context providers (Auth, AssistantChat, ProductImageViewer)\n"
        "|       |-- hooks/                           # Custom React hooks (useList, useFetch, useAssistantChat)\n"
        "|       |-- pages/                           # Application screen views (Dashboard, Reorder, Simulator, etc.)\n"
        "|       |-- services/                        # Axios API client services and endpoint wrappers\n"
        "|       +-- utils/                           # Formatting, currency, date, and product image helpers\n"
    )
    add_code_block(doc, tree_str, caption="Complete Codebase Hierarchy and File Distribution")
