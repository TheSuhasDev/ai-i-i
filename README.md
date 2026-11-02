# AI-Powered Inventory & Supply Chain Intelligence

An enterprise-grade, end-to-end intelligent inventory and supply chain decision-support platform designed for modern retail and distribution operations. Traditional inventory systems rely on static threshold alerts and backward-looking spreadsheets, resulting in frequent stockouts, costly overstock holding, and blind spots to supplier disruptions. This platform solves those challenges by bridging operational inventory management with applied machine learning. It pairs high-throughput operational tracking (products, inventory, sales, suppliers, and purchase orders) with predictive analytics—including multi-horizon demand forecasting (1 to 4 weeks ahead), calibrated stockout risk classification, TreeSHAP model interpretability, ABC-XYZ demand volatility segmentation, statistical anomaly detection, interactive What-If scenario simulation, and an LLM-powered supply chain reasoning assistant with grounded tool calling.

---

## 1. Key Features

- **Executive Operations Dashboard**: Real-time operational overview featuring inventory health distributions (Healthy, Warning, Critical), an interactive 3x3 ABC-XYZ demand value vs. predictability matrix, fastest growing and declining product leaders, demand pattern distributions, and active alert summaries.
- **Smart Reorder & Procurement Optimization**: Automated calculation of Reorder Points (ROP), Economic Order Quantity (EOQ), lead-time demand, buffer safety stocks, and effective inventory positions (current stock + open PO on-order units) adjusted dynamically for supplier on-time delivery reliability.
- **Multi-Horizon Demand Forecasting**: Machine learning models predicting product demand 1, 2, 3, and 4 weeks ahead with confidence interval bands (10th to 90th percentile residual quantiles), systematically benchmarked against naive and 4-week moving average baselines.
- **Calibrated Stockout Risk & TreeSHAP Interpretability**: Supervised risk classifier predicting stockout probability within supplier lead times, paired with TreeSHAP waterfall feature attribution revealing exact drivers (e.g., current stock buffer, sales velocity, supplier delay risk, days to next scheduled delivery).
- **Trend & Seasonality Classification**: Time-series decomposition automatically categorizing products into 5 demand patterns (`stable`, `increasing`, `decreasing`, `seasonal`, `trend + seasonal`) with YoY growth calculations and Mann-Kendall trend metrics.
- **Supplier Risk & Delivery Analytics**: Supplier performance scoring tracking on-time delivery percentages, average delay days, quality issue ratios, and drill-down history across past purchase order deliveries.
- **Statistical & Isolation Forest Anomaly Detection**: Unsupervised and rule-based anomaly detection flagging sales surges, demand drop-offs, zero-sale events, and inventory discrepancies over customizable windows (7 to 730 days) with server-side pagination.
- **Interactive What-If Scenario Simulator**: Real-time stress testing tool simulating demand shocks (-90% to +300%), supplier lead-time delays (0 to 30 days), and order quantity adjustments to visualize projected stock trajectories, days-of-cover changes, and stockout probabilities before making procurement commitments.
- **AI Supply Chain Assistant**: Context-aware conversational agent utilizing OpenAI-compatible tool calling (Groq, Gemini, OpenRouter, Mistral) to query stock levels, suppliers, open purchase orders, forecasts, and simulations with strictly factual, hallucination-free responses. Accessible via a dedicated page and a global floating widget.
- **Time Simulation Engine (`advanceData`)**: Administrative timeline advancement script (`npm run data:advance [days]`) and API endpoint (`POST /api/insights/advance`) that rolls operational dates forward, generates new sales records, decrements stock, and fulfills delivered purchase orders.
- **Enterprise RBAC & Security**: JWT-based authentication supporting three operational roles (`admin`, `manager`, `staff`), protected routes, sliding-window rate limiting on sensitive auth endpoints, and immutable audit logging for critical write operations.

---

## 2. Tech Stack

### Frontend (`client/`)
- **Framework**: [React 19](https://react.dev/) (`^19.2.8`) with [Vite 8](https://vitejs.dev/) (`^8.3.0`)
- **Routing**: [React Router DOM 7](https://reactrouter.com/) (`^7.18.4`)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) (`^4.3.3`) with `@tailwindcss/vite` & custom design system tokens
- **Data Visualizations**: [Recharts](https://recharts.org/) (`^3.10.1`)
- **Icons & Motion**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/) (`^14.3.0`)
- **HTTP Client**: [Axios](https://axios-http.com/) (`^1.20.0`) with request/response auth interceptors
- **Typography**: `@fontsource/inter` (`^5.3.0`)

### Backend Server (`server/`)
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules, `type: module`)
- **Web Framework**: [Express 5](https://expressjs.com/) (`^5.3.0`)
- **Database ODM**: [Mongoose 9](https://mongoosejs.com/) (`^9.11.1`)
- **Validation**: [Zod 4](https://zod.dev/) (`^4.6.6`) schema validation middleware
- **Security & Utilities**: [Helmet](https://helmetjs.github.io/) (`^8.3.0`), [CORS](https://github.com/expressjs/cors) (`^2.8.6`), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (`^3.0.3`), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) (`^9.0.3`), [Morgan](https://github.com/expressjs/morgan) (`^1.12.1`)
- **CSV Ingestion**: `csv-parse` (`^7.0.3`)
- **Test Framework**: Node.js built-in test runner (`node --test`)

### ML & Predictive Analytics Service (`ml-service/`)
- **Language**: Python 3.11 / 3.12
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) (`0.143.0`) with [Uvicorn](https://www.uvicorn.org/) (`0.54.0`) & [Pydantic](https://docs.pydantic.dev/) (`2.14.0`)
- **Machine Learning**: [scikit-learn](https://scikit-learn.org/) (`1.7.2`), [XGBoost](https://xgboost.readthedocs.io/) (`3.2.0`), [SHAP](https://shap.readthedocs.io/) (`0.49.1`), [statsmodels](https://www.statsmodels.org/) (`0.15.0`)
- **Data Processing**: [Pandas](https://pandas.pydata.org/) (`2.3.3`), [NumPy](https://numpy.org/) (`2.2.6`), [SciPy](https://scipy.org/) (`1.15.3`), [Joblib](https://joblib.readthedocs.io/) (`1.6.0`)
- **Testing**: [Pytest](https://docs.pytest.org/) (`9.1.1`)

### Database & External Services
- **Primary Database**: MongoDB (v6.0+ or MongoDB Atlas)
- **LLM Reasoning**: OpenAI-compatible chat completions endpoint (Groq, OpenRouter, Google Gemini OpenAI proxy) for tool-based reasoning

---

## 3. System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 19 + Vite @ :5173)"]
        UI["SPA Views & Layout\n(Dashboard, Alerts, Reorder, Insights)"]
        WIDGET["Assistant Floating Widget & Page"]
        AXIOS["Axios HTTP Client\n(JWT Interceptors)"]
        UI --> AXIOS
        WIDGET --> AXIOS
    end

    subgraph Server["Backend API Gateway (Express 5 @ :5000)"]
        AUTH["Auth & Rate Limiting\n(/api/auth)"]
        CRUD["CRUD Controllers\n(Products, Inventory, Sales, POs, Suppliers)"]
        AUDIT["Audit Logger\n(AuditLog Collection)"]
        INSIGHTS["Insights Aggregator\n(/api/insights, /api/simulator)"]
        ASSISTANT["AI Assistant Service\n(Tool Runner Loop)"]
        ML_PROXY["ML Client Service\n(X-Service-Token)"]

        AXIOS -->|REST API + Bearer Token| Server
        AUTH --> CRUD
        CRUD --> AUDIT
        INSIGHTS --> ML_PROXY
        ASSISTANT --> CRUD
        ASSISTANT --> ML_PROXY
    end

    subgraph Storage["Database Layer"]
        MONGO[("MongoDB @ :27017\nUsers, Products, Inventory,\nSales, POs, Suppliers, Insights")]
        CRUD --> MONGO
        INSIGHTS --> MONGO
    end

    subgraph MLService["ML Microservice (FastAPI @ :8000)"]
        API["FastAPI Endpoints\n(/forecast, /risk, /insights, /simulate, /explain)"]
        FORECAST["Demand Forecaster\n(GradientBoosting / XGBoost)"]
        RISK["Stockout Classifier\n(Calibrated Logistic / Tree)"]
        SHAP_MOD["TreeSHAP Engine\n(Feature Contributions)"]
        SIM["Simulation Engine\n(Shock & Lead-Time Stress)"]
        ANOMALY["Anomaly Detector\n(Isolation Forest)"]

        ML_PROXY -->|HTTP + Service Token| API
        API --> FORECAST
        API --> RISK
        API --> SHAP_MOD
        API --> SIM
        API --> ANOMALY
    end

    subgraph LLM["External Reasoning Engine"]
        GROQ["OpenAI-Compatible LLM\n(Groq / Gemini / OpenRouter)"]
        ASSISTANT -->|Function Calling Loop| GROQ
    end
```

### Architectural Flow
1. **Operational Operations**: The user authenticates via JWT. Standard business transactions (recording sales, updating inventory counts, issuing purchase orders, adding suppliers) pass through Zod validators and persist to MongoDB, recording mutation audit logs.
2. **Predictive Intelligence Loop**: When inventory is updated or purchase orders are created, the backend coordinates with the Python ML microservice via internal authenticated HTTP calls (`X-Service-Token`).
3. **ML Pipeline Execution**: The ML service computes multi-horizon demand forecasts, evaluates stockout risk within supplier lead time, calculates TreeSHAP attributions, checks statistical anomalies, and segments products into ABC-XYZ classes.
4. **Insight Caching & Retrieval**: Precomputed insights are stored in MongoDB's `Insight` collection and served instantly to the React client to ensure sub-millisecond dashboard renders.
5. **Conversational Tool Calling**: The AI Assistant receives user prompts, invokes structured tools to fetch live MongoDB and ML metrics, and delivers grounded, factual responses with recommendations.

---

## 4. Folder Structure

```
ai-inventory-intelligence/
├── client/                     # Frontend Vite + React 19 Single Page Application
│   ├── public/                 # Static assets (favicons, product image thumbnails)
│   ├── src/
│   │   ├── components/         # Reusable UI widgets (Charts, Matrices, Modals, Tables)
│   │   ├── context/            # Global state providers (Auth, Assistant Chat, Image Viewer)
│   │   ├── hooks/              # Custom React hooks (useFetch, useList, useAssistantChat)
│   │   ├── lib/                # Shared utilities and Tailwind class mergers
│   │   ├── pages/              # Routed view pages (Dashboard, Reorder, Insights, CRUD lists)
│   │   ├── services/           # Axios API service clients for server endpoints
│   │   └── utils/              # Formatting, CSV export, and date computation helpers
│   ├── package.json            # Frontend scripts and client dependencies
│   └── vite.config.js          # Vite bundler configuration with Tailwind plugin
├── manual/                     # Source high-resolution product photographs (P001-P040)
├── ml-service/                 # Python FastAPI predictive analytics microservice
│   ├── app/                    # ML service core logic, routes, and model definitions
│   │   ├── anomaly.py          # Isolation Forest and statistical anomaly detection
│   │   ├── baseline.py         # Moving average and naive baseline predictors
│   │   ├── decision.py         # Reorder calculation logic (ROP, EOQ, safety stock)
│   │   ├── evaluation.py       # Evaluation metrics (MAPE, WAPE, RMSE, ROC-AUC, F1)
│   │   ├── explain.py          # TreeSHAP feature contribution calculation
│   │   ├── forecasting.py      # Multi-horizon gradient boosting demand forecasters
│   │   ├── health.py           # Multi-factor product health score index
│   │   ├── insights.py         # ABC-XYZ segmentation and insight aggregation
│   │   ├── main.py             # FastAPI entrypoint, CORS, and auth middleware
│   │   ├── performance.py      # Model comparison and validation report generator
│   │   ├── preprocessing.py    # Time-series feature engineering and date resampling
│   │   ├── risk.py             # Calibrated stockout risk classification
│   │   ├── routes_*.py         # FastAPI router modules (forecast, risk, explain, etc.)
│   │   ├── simulator.py        # Supply chain shock and lead-time simulator
│   │   ├── train_forecast.py   # Demand forecast training CLI script
│   │   ├── train_risk.py       # Stockout risk classifier training CLI script
│   │   └── trend.py            # Trend & seasonality classification engine
│   ├── data/                   # Synthetic dataset CSVs and generation scripts
│   │   ├── generate_data.py    # Seeded synthetic supply chain data generator (Seed 42)
│   │   ├── validate_data.py    # Strict mathematical & business logic data validator
│   │   └── *.csv               # Generated supply chain CSV tables
│   ├── models/                 # Serialized model bundles (.joblib) and metrics (.json)
│   ├── tests/                  # Pytest automated test suite (72 test cases)
│   ├── requirements.txt        # Python pip dependencies
│   └── pytest.ini              # Pytest configuration
├── server/                     # Node.js Express 5 REST API backend
│   ├── src/
│   │   ├── config/             # MongoDB database connection configuration
│   │   ├── controllers/        # Route controllers (CRUD factory, auth, insights)
│   │   ├── middleware/         # Auth verification, rate limiting, and error handling
│   │   ├── models/             # Mongoose database schemas (Product, Sale, PO, etc.)
│   │   ├── routes/             # Express API route declarations
│   │   ├── scripts/            # advanceData.js timeline advancement utility
│   │   ├── seed/               # seed.js MongoDB ingestion script from CSVs
│   │   ├── services/           # ML service HTTP client & AI Assistant tool runner
│   │   ├── utils/              # AppError class and async wrapper utilities
│   │   ├── validators/         # Zod schemas for input validation
│   │   └── index.js            # Express server entrypoint
│   ├── test/                   # Automated Node.js unit tests (26 test cases)
│   └── package.json            # Backend scripts and dependencies
├── .gitignore                  # Git ignore rules for node_modules, venvs, and env files
├── import_manual.py            # Image processing script: crops & optimizes manual/ images
├── pick.html                   # HTML catalog tool for visual product image verification
├── start-all.bat               # Windows batch script to launch all 3 services simultaneously
└── README.md                   # Project documentation
```

---

## 5. Prerequisites

Before setting up the project, ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (tested on Node.js `v20.x` / `v22.x`)
- **npm**: `v9.0.0` or higher
- **Python**: `v3.10`, `v3.11`, or `v3.12`
- **MongoDB**: A running local instance on `mongodb://localhost:27017` or a cloud-hosted MongoDB Atlas URI
- **Git**: For version control and cloning

---

## 6. Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-inventory-intelligence
```

### 2. Set Up the Python ML Service
```bash
cd ml-service

# Create and activate a Python virtual environment
# Windows (PowerShell):
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
# python3 -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env configuration
cp .env.example .env

# (Optional) Verify data validity and train ML models
python data/validate_data.py
python -m app.train_forecast
python -m app.train_risk

cd ..
```

### 3. Set Up the Backend Server
```bash
cd server

# Install Node dependencies
npm install

# Create .env configuration
cp .env.example .env
# Edit server/.env with your MONGO_URI, JWT_SECRET, and ML_SERVICE_TOKEN

# Seed the database from synthetic CSVs (populates MongoDB with demo records)
npm run seed

cd ..
```

### 4. Set Up the Frontend Client
```bash
cd client

# Install Node dependencies
npm install

# Create .env configuration
# Copy the example or create client/.env with:
# VITE_API_URL=http://localhost:5000/api
# VITE_ML_URL=http://localhost:8000

cd ..
```

---

## 7. Environment Variables

### Server (`server/.env`)
| Variable | Description | Example / Default Value |
| :--- | :--- | :--- |
| `PORT` | Port for the Express backend server | `5000` |
| `MONGO_URI` | MongoDB connection connection string | `mongodb://localhost:27017/inventory_db` |
| `CLIENT_URL` | Allowed origin for CORS | `http://localhost:5173` |
| `ML_SERVICE_URL` | Base URL of the Python ML microservice | `http://localhost:8000` |
| `ML_SERVICE_TOKEN` | Shared secret token passed in `X-Service-Token` | `replace_with_a_long_random_shared_secret` |
| `JWT_SECRET` | Secret key for signing auth tokens (>= 32 chars) | `change_me_to_a_long_random_string` |
| `JWT_EXPIRES_IN` | Validity duration of issued JWT tokens | `7d` |
| `NODE_ENV` | Runtime environment mode | `development` |
| `LLM_API_KEY` | API Key for LLM provider (Groq / Gemini / OpenAI) | `gsk_...` or `AIza...` |
| `LLM_BASE_URL` | Base URL for OpenAI-compatible completions API | `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | LLM model identifier for assistant reasoning | `llama-3.3-70b-versatile` |

### ML Service (`ml-service/.env`)
| Variable | Description | Example / Default Value |
| :--- | :--- | :--- |
| `PORT` | Port for the FastAPI server | `8000` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `SERVER_URL` | Allowed backend origin for CORS | `http://localhost:5000` |
| `ML_SERVICE_TOKEN` | Shared secret token required in `X-Service-Token` | `replace_with_a_long_random_shared_secret` |

### Client (`client/.env`)
| Variable | Description | Example / Default Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL of the backend API gateway | `http://localhost:5000/api` |
| `VITE_ML_URL` | URL of the Python ML microservice | `http://localhost:8000` |

---

## 8. How to Run

### Quick Start (Windows)
Run the launcher script in the project root:
```cmd
start-all.bat
```
This launches all three services concurrently in dedicated terminal windows.

### Manual Service Execution

#### 1. ML Service
```bash
cd ml-service
# Activate virtual environment (.venv\Scripts\activate or source .venv/bin/activate)
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

#### 2. Backend Server
```bash
cd server
npm run dev
```
- API Base: [http://localhost:5000/api](http://localhost:5000/api)
- Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

#### 3. Frontend Client
```bash
cd client
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

### Demo Login Accounts
The database seed script generates three pre-configured accounts:
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@inventory.com` | `Admin@123` | Full access: CRUD on all resources, cancellations, deletions, insight refresh |
| **Manager** | `manager@inventory.com` | `Manager@123` | Operational access: Create/edit products, inventory, sales, suppliers, POs |
| **Staff** | `staff@inventory.com` | `Staff@123` | View all resources, record sales, update inventory stock levels |

---

## 9. API Endpoints

All backend endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication & Health
| Method | Route | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | No | System health check (server status, MongoDB connection state) |
| `POST` | `/auth/register` | No | Register a new user account (Zod validated, role defaults to staff) |
| `POST` | `/auth/login` | No | Authenticate user credentials, returns JWT token and user profile |
| `GET` | `/auth/me` | Yes | Retrieve the currently authenticated user's profile |

### Core Catalog & Operations
| Method | Route | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Yes | List products with pagination, search, category filter, and supplier population |
| `GET` | `/products/:id` | Yes | Fetch single product record by ID or product code |
| `POST` | `/products` | Admin, Manager | Create a new product (validates price >= cost, unique code & SKU) |
| `PUT` | `/products/:id` | Admin, Manager | Update existing product details |
| `DELETE` | `/products/:id` | Admin | Delete a product record |
| `GET` | `/inventory` | Yes | List current stock balances, in-transit quantities, and snapshot dates |
| `GET` | `/inventory/:id` | Yes | Fetch single inventory record |
| `PUT` | `/inventory/:id` | All Roles | Update stock level (staff, manager, admin) |
| `GET` | `/sales` | Yes | List sales transactions with date-range filters (`from`, `to`) and product filters |
| `GET` | `/sales/:id` | Yes | Fetch single sale transaction |
| `POST` | `/sales` | All Roles | Record a new sale transaction (creates audit log) |
| `PUT` | `/sales/:id` | Admin | Update sale record and recalculate revenue (creates audit log) |
| `DELETE` | `/sales/:id` | Admin | Delete sale record (creates audit log) |
| `GET` | `/suppliers` | Yes | List suppliers with city filtering and search |
| `GET` | `/suppliers/:id` | Yes | Fetch single supplier profile |
| `GET` | `/suppliers/:id/deliveries` | Yes | Fetch historical PO delivery records for reliability analysis |
| `POST` | `/suppliers` | Admin, Manager | Register a new supplier |
| `PUT` | `/suppliers/:id` | Admin, Manager | Update supplier contact information |
| `DELETE` | `/suppliers/:id` | Admin | Delete a supplier |
| `GET` | `/purchase-orders` | Yes | List purchase orders with status and supplier filters |
| `GET` | `/purchase-orders/:id` | Yes | Fetch single purchase order |
| `POST` | `/purchase-orders` | Admin, Manager | Create purchase order (updates in-transit quantities & triggers insight recompute) |
| `PUT` | `/purchase-orders/:id` | Admin, Manager | Update purchase order (handles receipt deltas & inventory stock sync) |
| `PATCH` | `/purchase-orders/:id/cancel` | Admin, Manager | Cancel a Pending purchase order |
| `DELETE` | `/purchase-orders/:id` | Admin | Delete purchase order (only permitted if status is Cancelled) |

### Intelligence, Simulation & Assistant
| Method | Route | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/insights` | Yes | List cached inventory insights (health scores, stockout risk, ABC-XYZ, reorder) |
| `GET` | `/insights/:code` | Yes | Fetch comprehensive insight packet for a specific product code |
| `GET` | `/insights/:code/history` | Yes | Fetch weekly sales and stock historical data for chart visualizations |
| `GET` | `/insights/:code/explain` | Yes | Retrieve TreeSHAP feature attributions for product risk |
| `POST` | `/insights/refresh` | Admin, Manager | Trigger bulk recalculation of all product insights from ML service |
| `POST` | `/insights/advance` | Admin, Manager | Advance operational timeline by N days (generates sales, fulfills POs) |
| `GET` | `/anomalies` | Yes | Retrieve sales and stock anomalies with severity scoring and pagination |
| `POST` | `/simulator` | Yes | Run What-If simulation for a product under demand shocks & supplier delays |
| `GET` | `/supplier-risk` | Yes | Fetch aggregated supplier risk profiles (on-time rate, delay days, score) |
| `GET` | `/ml-performance` | Yes | Retrieve model validation metrics (WAPE, RMSE, ROC-AUC, Brier score) |
| `GET` | `/assistant/status` | Yes | Check whether the AI assistant LLM backend is configured |
| `POST` | `/assistant` | Yes | Chat with AI supply chain assistant (rate limited: 20 queries / 10 min) |

---

## 10. Machine Learning Models & Analytics

### 1. Multi-Horizon Demand Forecasting
- **Target**: Predict weekly unit demand for horizons $H \in \{1, 2, 3, 4\}$ weeks ahead.
- **Algorithms**: Gradient Boosting Regressor (`HistGradientBoostingRegressor`), Random Forest, and XGBoost with ratio-to-scale target formulation.
- **Features**: Lagged weekly sales, 4-week and 12-week rolling moving averages, categorical encodings, promotional indicators, and seasonal cyclical features.
- **Evaluation**: Weighted Absolute Percentage Error (WAPE), Mean Absolute Error (MAE), and Root Mean Squared Error (RMSE) benchmarked against naive last-week and 4-week rolling average predictors.
- **Training Command**:
  ```bash
  python -m app.train_forecast
  ```
  Artifacts generated: `ml-service/models/forecast_models.joblib`, `forecast_metrics.json`.

### 2. Stockout Risk Classification
- **Target**: Binary classification predicting probability $P(\text{stockout} = 1)$ within the supplier lead-time planning window.
- **Algorithms**: Calibrated Gradient Boosting Classifier with Isotonic/Sigmoid probability calibration.
- **Features**: Days of inventory cover, supplier average delay days, supplier on-time rate, open purchase order quantities, demand forecast over lead time, and safety stock ratio.
- **Evaluation**: ROC-AUC, Precision, Recall, F1-Score, and Brier Score Loss.
- **Training Command**:
  ```bash
  python -m app.train_risk
  ```
  Artifacts generated: `ml-service/models/risk_model.joblib`, `risk_metrics.json`.

### 3. TreeSHAP Explainability Engine
- Computes exact feature attribution values ($\text{SHAP}$) for stockout risk predictions. Identifies which operational variables pushed a product into `Critical` or `Warning` status (e.g., negative impact of supplier delivery delay vs. positive buffer from on-order shipments).

### 4. Anomaly Detection
- Unsupervised Isolation Forest combined with Z-score thresholding on 90-day rolling sales volumes. Flags sudden sales spikes, abrupt drop-offs, persistent zero-sale stretches on fast-movers, and physical inventory balance mismatches.

### 5. ABC-XYZ Matrix Segmentation
- **ABC Classification (Revenue Volume)**: Pareto analysis dividing catalog into Class A (top 70% revenue), Class B (next 20%), and Class C (remaining 10%).
- **XYZ Classification (Demand Volatility)**: Demand predictability based on Coefficient of Variation ($CV = \sigma / \mu$): Class X ($CV \le 0.5$, steady), Class Y ($0.5 < CV \le 1.0$, variable), and Class Z ($CV > 1.0$, erratic).

---

## 11. Screenshots

*(Screenshots can be placed in `docs/screenshots/`)*

| View | Description | Placeholder |
| :--- | :--- | :--- |
| **Operations Dashboard** | Executive view with ABC-XYZ matrix, health scores, and trend leaders | `![Dashboard](docs/screenshots/dashboard.png)` |
| **Product Insight & SHAP** | Forecast curves, confidence bands, and TreeSHAP waterfall explanation | `![Product Insight](docs/screenshots/product_insight.png)` |
| **Smart Reorder** | Recommended purchase quantities with lead-time demand calculations | `![Smart Reorder](docs/screenshots/smart_reorder.png)` |
| **What-If Simulator** | Interactive slider stress testing for demand surges and supplier delays | `![Simulator](docs/screenshots/simulator.png)` |
| **AI Assistant** | Grounded LLM conversational assistant answering stock & supplier queries | `![AI Assistant](docs/screenshots/assistant.png)` |
| **Supplier Deliveries** | On-time delivery tracking and historical delivery delay distributions | `![Supplier Risk](docs/screenshots/supplier_risk.png)` |

---

## 12. Verification & Testing

The project maintains comprehensive test coverage across both the backend server and the ML service:

```bash
# 1. Run Node.js Server Tests (26 test suites)
cd server
npm test

# 2. Run Python ML Service Tests (72 unit and integration tests)
cd ml-service
pytest -q tests

# 3. Validate Synthetic Supply Chain Data Consistency
cd ml-service
python data/validate_data.py

# 4. Run Frontend Linting & Type Checking
cd client
npm run lint
npm run typecheck
npm run build
```

---

## 13. Future Improvements

1. **Distributed Background Task Processing**: Offload intensive batch forecasting and TreeSHAP calculations to a Redis + BullMQ worker queue instead of in-process execution.
2. **Real-Time WebSocket Updates**: Integrate Socket.io to push instantaneous inventory decrement events and purchase order status transitions to active client dashboards without polling.
3. **Multi-Warehouse / Multi-Location Routing**: Expand data schemas from single-depot inventory to multi-node distribution centers with inter-facility transfer recommendations.
4. **Automated Purchase Order Splitter**: Introduce multi-supplier split logic that optimizes reorder allocations across competing vendors based on dynamic cost vs. lead-time trade-offs.
5. **Database Migration to TimescaleDB**: Transition high-velocity daily sales and inventory snapshot logs to time-series optimized hypertables for faster aggregate querying.

---

## 14. Author & License

- **License**: ISC (as specified in `server/package.json`)
- **Author**: AI Inventory Intelligence Team
- **Project Repository**: AI-Powered Inventory & Supply Chain Intelligence

---

### Notes / TODO
- *Assistant LLM Key*: The AI Assistant requires `LLM_API_KEY` (e.g. Groq or OpenAI-compatible key) configured in `server/.env`. If omitted, the assistant page displays a clean setup alert while the rest of the application functions normally.
- *Image Ingestion*: High-resolution product images in `manual/` can be processed into the client public thumbnail directory by executing `python import_manual.py`.

