# AI-Powered Inventory & Supply Chain Intelligence

An AI-powered inventory and supply-chain **decision-support platform** built with **MERN + Python ML**.

The system goes beyond inventory CRUD. It uses historical sales, stock levels, supplier delivery records, lead times and purchase orders to support **demand forecasting, supply-chain risk analysis, inventory decisions and actionable recommendations**.

> **Project status:** in development on a 15-day plan. Foundation (Days 1-4) is complete; the ML, decision-engine and dashboard phases are in progress. See [Project Status](#project-status).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Objectives](#2-objectives)
3. [Features](#3-features)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Data Model](#6-data-model)
7. [Synthetic Dataset](#7-synthetic-dataset)
8. [Machine Learning Pipeline](#8-machine-learning-pipeline)
9. [Decision Engine](#9-decision-engine)
10. [Application Pages](#10-application-pages)
11. [API Structure](#11-api-structure)
12. [Security](#12-security)
13. [Project Structure](#13-project-structure)
14. [Installation and Running](#14-installation-and-running)
15. [Environment Variables](#15-environment-variables)
16. [Model Evaluation](#16-model-evaluation)
17. [Demo Flow](#17-demo-flow)
18. [Project Status](#project-status)
19. [Future Scope](#19-future-scope)
20. [Limitations](#20-limitations)

---

## 1. Overview

Businesses commonly face stockouts, excess inventory, supplier delays, unpredictable demand, poor reorder decisions, and difficulty identifying high-risk products and suppliers. This project uses machine learning and business rules to turn inventory data into actionable insight.

```text
Inventory / Sales / Supplier / Purchase Order Data
                         |
                         v
                  Python ML Service
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
   Demand Forecast   Risk Analysis   Anomaly Detection
          |              |              |
          +--------------+--------------+
                         |
                         v
                  Decision Engine
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
    Smart Reorder   Health Score   Supplier Risk
                         |
                         v
                  Explainable AI
                         |
                         v
                  What-If Simulator
                         |
                         v
                 React Dashboard
```

The central value proposition:

```text
DATA -> PREDICTION -> RISK ANALYSIS -> EXPLANATION -> SIMULATION -> RECOMMENDATION -> BUSINESS ACTION
```

---

## 2. Objectives

1. Forecast future product demand from historical sales.
2. Identify products at risk of stockout or abnormal inventory behaviour.
3. Recommend when and how much to reorder.
4. Explain the factors behind AI predictions.
5. Evaluate supplier reliability and supply-chain risk.
6. Give every product an inventory health score.
7. Let managers test hypothetical scenarios.
8. Classify products with ABC-XYZ analysis.
9. Detect demand trends and seasonality.
10. Report measurable ML model performance.
11. Provide an AI assistant for natural-language queries.
12. Present everything in an easy-to-use dashboard.

---

## 3. Features

The project covers **10 feature areas**.

### 3.1 Smart Reorder Recommendation
Recommends when and how much to reorder from current stock, predicted demand, supplier lead time, safety stock and supplier reliability.

```text
Product: Keyboard
Predicted demand over lead time: 120
Current stock:                    45
Safety stock:                     20
Supplier lead time:                6 days

Base order = 120 + 20 - 45 = 95 units, then adjusted by supplier reliability
Priority: HIGH
```

The exact formula is documented in `docs/NOTES.md` once implemented (Day 8).

### 3.2 Explainable AI
Shows why a prediction was made, using SHAP on the risk model and converting contributions into plain-language reasons.

```text
Stockout Risk: 87%
- Demand increased significantly
- Current stock is low
- Supplier has a history of delays
- Lead time is long
```

### 3.3 What-If Inventory Simulator
Managers can change demand (+10%, +20%), supplier delay, stock level or order quantity, and see recalculated demand, stockout date, risk, reorder quantity and alert priority, before and after.

### 3.4 Inventory Health Score
Every product gets a 0-100 score based on stock level, demand, stockout risk, turnover and supplier factors.

| Score | Status |
|---|---|
| 0-39 | Critical |
| 40-69 | Warning |
| 70-100 | Healthy |

Slow-moving overstocked products also score low, so the score is not only about stockouts.

### 3.5 Supplier Reliability & Risk Score
Scores suppliers on on-time delivery rate, average delay, quality issues and lead-time consistency (variance). The dataset deliberately contains excellent, average, poor and erratic suppliers.

### 3.6 Intelligent Alert Priority
Replaces simple low-stock alerts with risk-based alerts (Critical, High, Medium, Low) by comparing the **expected stockout date** with the **expected delivery date**.

```text
CRITICAL: product may stock out before the supplier's expected delivery.
Expected stockout: 3 days | Expected delivery: 5 days | Action: reorder immediately
```

### 3.7 ABC-XYZ Classification
- **ABC** by revenue share: A (about 70% of revenue), B (next 20%), C (last 10%).
- **XYZ** by coefficient of variation of daily demand: X (< 0.5), Y (0.5-1.0), Z (> 1.0).
- Nine combined classes (AX ... CZ), e.g. AZ = high value, unpredictable demand.

### 3.8 Demand Trend & Seasonality Detection
Classifies products as increasing, stable, decreasing or seasonal using rolling slope and autocorrelation / seasonal decomposition, with charts of history and forecast.

### 3.9 ML Model Performance Dashboard
Displays **real calculated metrics** read from saved evaluation results, never hand-entered values.
- Forecasting: MAE, RMSE, MAPE
- Classification: Precision, Recall, F1

### 3.10 AI Inventory Assistant
A chatbot that answers questions using the application's own inventory data (via tool/function calls), and labels generated recommendations separately from stored facts.

```text
Which products should I reorder today?
Which suppliers have the most delays?
Which products are overstocked?
What happens if demand increases by 20%?
Why is this product marked as critical?
```

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React (Vite), React Router, Axios, Recharts (planned), plain CSS |
| Backend | Node.js, Express, Mongoose, JWT, bcryptjs, Zod, Helmet, CORS, Morgan |
| Database | MongoDB (local or Atlas) |
| ML service | Python, FastAPI, Pandas, NumPy, scikit-learn, XGBoost, statsmodels, SHAP, joblib |
| Tooling | VS Code, Git/GitHub, Postman, ESLint, pytest |

---

## 5. System Architecture

```text
                    +----------------------+
                    |    React Frontend    |
                    |   (Vite, port 5173)  |
                    +----------+-----------+
                               |
                               | REST API (JWT)
                               v
                    +----------------------+
                    |   Node.js + Express  |
                    |  Backend (port 5000) |
                    +----------+-----------+
                               |
                    +----------+-----------+
                    |                      |
                    v                      v
             +-------------+       +------------------+
             |   MongoDB   |       | FastAPI ML Service|
             |             |       |   (port 8000)    |
             | Users       |       | Forecasting      |
             | Products    |       | Risk / Trend     |
             | Inventory   |       | Anomalies / SHAP |
             | Sales       |       +--------+---------+
             | Suppliers   |                |
             | Orders      |                v
             +-------------+       +------------------+
                                   |  Decision Engine |
                                   | Reorder, Health, |
                                   | Supplier risk,   |
                                   | Alerts           |
                                   +------------------+
```

- MongoDB holds the operational data for the app.
- The ML service reads the generated CSV datasets for training and evaluation.
- Express calls the ML service through a dedicated client and stores results in MongoDB.

---

## 6. Data Model

| Entity | Key fields |
|---|---|
| **User** | name, email (unique), hashed password, role (`admin`, `manager`, `staff`) |
| **Supplier** | code, name, contactEmail, city |
| **Product** | code, sku, name, category, price, cost, leadTimeDays, suppliers (1-2), isActive |
| **Inventory** | product (unique), currentStock, inTransitQty, snapshotDate |
| **Sale** | product, date, unitsSold, unitPrice, revenue, promoFlag (unique per product per day) |
| **PurchaseOrder** | poNumber, product, supplier, orderDate, expectedDeliveryDate, actualDeliveryDate, delayDays, qtyOrdered, qtyReceived, unitCost, qualityIssue, status |

`delayDays = actual - expected delivery` (negative means early; on time means delay <= 0).

---

## 7. Synthetic Dataset

Generated by `ml-service/data/generate_data.py` (seed 42, reproducible). Specific scenarios are planted so every feature has something clear to show.

| Item | Value |
|---|---|
| Products | 40 across 6 categories |
| Suppliers | 8 (2 excellent, 3 average, 2 poor, 1 erratic) |
| Sales | 730 days of daily sales per product (29,200 rows) |
| Purchase orders | 398, with expected vs actual delivery, delays and quality flags |
| Stock | Current snapshot plus daily stock history |
| Split | First 18 months train, last 6 months test (time-based, never random) |

Demand model: `daily demand = base x trend x seasonality x weekday x promo x noise`.

Planted: 8 increasing, 5 decreasing, 12 stable, 10 strongly seasonal and 5 trend-plus-seasonal products; 10 products below lead-time demand plus safety stock; at least 4 expected stockouts before delivery; 2 products already out of stock; 2-3% injected anomalies (spikes, zero-sales days, stock mismatches, one 17-day supplier delay).

Outputs: `products.csv`, `suppliers.csv`, `sales.csv`, `inventory_snapshot.csv`, `stock_history.csv`, `purchase_orders.csv`, `scenario_labels.csv`.
`scenario_labels.csv` and `is_anomaly` are for **validation only** and are never model inputs.

Validate with `python data/validate_data.py` (ABC-XYZ coverage, trend classes, supplier profiles, health statuses, baseline MAPE, no negatives).

---

## 8. Machine Learning Pipeline

```text
Historical Data -> Cleaning -> Feature Engineering -> Time-based Split
   -> Model Training -> Evaluation -> Model Serving -> Predictions -> Decision Engine
```

- **Features:** lag values, rolling mean/std, day of week, month, holiday flags, price.
- **Models:** baseline (naive, moving average) vs Random Forest / XGBoost for demand; Random Forest / Logistic Regression (class-weighted) for stockout risk; Isolation Forest for anomalies; SHAP TreeExplainer for explanations.
- **Evaluation:** time-based hold-out only.

---

## 9. Decision Engine

Combines ML predictions with operational data:

```text
Predicted demand + Current stock + Safety stock + Lead time + Supplier reliability
        |
        +--> Reorder quantity   +--> Priority   +--> Stockout risk
        +--> Inventory health   +--> Alert
```

Provisional rules are documented in `docs/NOTES.md`:
- Safety stock = `1.65 x sigma x sqrt(lead time)`
- Reorder quantity = predicted demand over lead time + safety stock - current stock, adjusted for supplier reliability
- Alert margin = days of cover - days to delivery (negative = Critical)

---

## 10. Application Pages

| Page | Status |
|---|---|
| Login, Dashboard (placeholder) | Done |
| Products, Inventory, Sales, Suppliers, Purchase Orders | Done |
| Demand Forecast, Trend & Seasonality | Planned |
| Stockout & Risk Analysis, Smart Reorder | Planned |
| Explainable AI, Anomalies | Planned |
| What-If Simulator | Planned |
| Inventory Health, Supplier Risk, Alerts | Planned |
| ABC-XYZ Classification | Planned |
| ML Performance | Planned |
| AI Inventory Assistant | Planned |

Role-aware UI: **staff** can view, record sales and update stock counts; **manager** can also add and edit; **admin** can also delete.

---

## 11. API Structure

### Express backend (implemented)

| Resource | Base path | Notes |
|---|---|---|
| Health | `GET /api/health` | status and database state |
| Auth | `/api/auth` | `POST register` (always creates `staff`), `POST login`, `GET me` |
| Suppliers | `/api/suppliers` | CRUD, search name/code/city |
| Products | `/api/products` | CRUD, filter category/isActive/supplier |
| Inventory | `/api/inventory` | CRUD, filter product |
| Sales | `/api/sales` | CRUD, filter product/promoFlag/from/to |
| Purchase orders | `/api/purchase-orders` | CRUD, filter product/supplier/status/qualityIssue |

All list endpoints support `page`, `limit` (max 200), `sort` and `search`. Errors return `{ success: false, message, details? }`.

**Permissions:** read = any logged-in user; create/update = admin, manager; delete = admin. Exceptions: staff can `POST /sales` and `PUT /inventory/:id`.

### Planned

```text
Express:    /api/forecast  /api/risk  /api/reorder  /api/health-score  /api/supplier-risk
            /api/alerts  /api/abc-xyz  /api/trends  /api/simulator  /api/ml-performance  /api/assistant
ML service: GET /health   POST /forecast   POST /risk   POST /trend   POST /simulate   GET /model-performance
```

Exact endpoint names may be adjusted during implementation. The ML service exposes interactive docs at `http://localhost:8000/docs`.

---

## 12. Security

- JWT authentication (7-day expiry) with bcrypt-hashed passwords
- Role-based authorization middleware
- Zod input validation; unknown fields stripped (prevents mass assignment)
- Central error handler; identical message for unknown email and wrong password
- Helmet, CORS restricted to the client origin
- Secrets only in `.env` (git-ignored); `.env.example` committed
- Planned (Day 14): rate limiting, protected ML endpoints

**Known limitation:** the client keeps the JWT in `localStorage`, which injected scripts could read (XSS). httpOnly cookies would be safer.

---

## 13. Project Structure

```text
ai-inventory-intelligence/
|
+-- client/                     Vite + React
|   +-- src/
|       +-- components/         Layout, ProtectedRoute, Pagination, SearchBar, Field
|       +-- context/            AuthProvider, useAuth
|       +-- hooks/              useList
|       +-- pages/              Login, Dashboard, list and form pages
|       +-- services/           axios instance and per-resource services
|       +-- utils/              formatting helpers
|
+-- server/                     Express + Mongoose (ES modules)
|   +-- src/
|       +-- config/             database connection
|       +-- controllers/        auth, generic CRUD factory
|       +-- middleware/         auth, validate, errorHandler
|       +-- models/             User, Supplier, Product, Inventory, Sale, PurchaseOrder
|       +-- routes/             one router per resource
|       +-- seed/               CSV-to-MongoDB seed script
|       +-- utils/              AppError, asyncHandler
|       +-- validators/         Zod schemas
|       +-- index.js
|
+-- ml-service/                 FastAPI
|   +-- app/                    main.py (and later: preprocessing, models, endpoints)
|   +-- data/                   generate_data.py, validate_data.py, CSV datasets, plots
|   +-- models/                 saved models (*.joblib are git-ignored)
|   +-- tests/
|   +-- requirements.txt
|
+-- docs/                       NOTES.md, PROGRESS.md, postman_collection.json
+-- .gitignore
+-- README.md
```

---

## 14. Installation and Running

**Prerequisites:** Node.js 20+, Python 3.10+, Git, and MongoDB (local Community Server or a free Atlas cluster).

### Clone

```bash
git clone <repository-url>
cd ai-inventory-intelligence
```

### 1. ML service (generate the dataset)

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python data\generate_data.py
python data\validate_data.py          # expect: ALL CHECKS PASSED
uvicorn app.main:app --reload --port 8000
```

### 2. Backend (seed the database, then run)

```powershell
cd server
npm install
# create .env from .env.example and fill in MONGO_URI and JWT_SECRET
npm run seed                          # loads the CSVs into MongoDB
npm run dev
```

### 3. Frontend

```powershell
cd client
npm install
# create .env from .env.example
npm run dev
```

Open **http://localhost:5173**.

### Demo logins (created by the seed script, development only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@inventory.com | Admin@123 |
| Manager | manager@inventory.com | Manager@123 |
| Staff | staff@inventory.com | Staff@123 |

Change or remove these before any real deployment.

### Ports

| Service | URL |
|---|---|
| Client | http://localhost:5173 |
| Server | http://localhost:5000/api/health |
| ML service | http://localhost:8000/health |

---

## 15. Environment Variables

Never commit real credentials. Copy each `.env.example` to `.env`.

**server/.env**

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000
JWT_SECRET=a_long_random_string
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

Generate a secret with: `node -p "require('crypto').randomBytes(48).toString('hex')"`

**client/.env**

```env
VITE_API_URL=http://localhost:5000/api
VITE_ML_URL=http://localhost:8000
```

**ml-service/.env**

```env
PORT=8000
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
```

---

## 16. Model Evaluation

Results will be reported from the time-based hold-out set (last 6 months) and stored as saved metrics that the performance page reads.

| Task | Metrics | Compared against |
|---|---|---|
| Demand forecasting | MAE, RMSE, MAPE | Naive and 4-week moving-average baselines (baseline weekly MAPE is about 29% on the generated data) |
| Stockout risk | Precision, Recall, F1 | Class-weighted classifier (stockout label rate about 15.8%) |

Final numbers will be added here after Days 5-7.

---

## 17. Demo Flow

1. Log in.
2. Open the dashboard; data loads from MongoDB.
3. The ML service forecasts demand and stockout risk per product.
4. The decision engine combines predictions with stock and supplier lead time.
5. A reorder quantity and priority are generated.
6. Explainable AI shows why a product is critical.
7. Open the What-If Simulator and change demand, stock or supplier delay.
8. Review supplier risk, health scores and prioritised alerts.
9. Review or create a purchase order.
10. Ask the AI assistant a question.

---

## Project Status

| Phase | Day | Deliverable | Status |
|---|---|---|---|
| Foundation | 1 | Monorepo, three services with `/health` | Done |
| | 2 | Data models, full synthetic dataset, validation | Done |
| | 3 | JWT auth, CRUD APIs, validation, error handling, seeded DB | Done |
| | 4 | Frontend shell, CRUD UI for all five resources | Done |
| Machine learning | 5 | Data preparation, features, baseline metrics | Next |
| | 6 | Demand forecasting model and `/forecast` | Planned |
| | 7 | Stockout risk, trend and seasonality | Planned |
| Decision engine | 8 | Reorder, safety stock, ABC-XYZ, supplier risk | Planned |
| | 9 | Health score, alerts, Express-ML integration | Planned |
| Dashboard | 10 | Analytics dashboard | Planned |
| | 11 | Explainable AI and anomaly detection | Planned |
| | 12 | What-if simulator | Planned |
| | 13 | Performance page and AI assistant | Planned |
| Finish | 14 | Testing, security, deployment | Planned |
| | 15 | Documentation and demo | Planned |

Detailed daily progress and design decisions: `docs/PROGRESS.md` and `docs/NOTES.md`.

### Feature checklist

- [x] Authentication and authorization
- [x] Product, inventory, sales, supplier and purchase-order management
- [x] Input validation and central error handling
- [x] Synthetic dataset with validation checks
- [ ] Demand forecasting
- [ ] Stockout-risk prediction
- [ ] Anomaly detection
- [ ] Smart reorder recommendation
- [ ] Explainable AI
- [ ] What-If simulator
- [ ] Inventory health score
- [ ] Supplier reliability and risk score
- [ ] Intelligent alert priority
- [ ] ABC-XYZ classification
- [ ] Trend and seasonality detection
- [ ] ML performance dashboard
- [ ] AI inventory assistant
- [ ] Testing
- [ ] Deployment
- [ ] Final documentation

---

## 19. Future Scope

- Real-time ERP integration and supplier APIs
- Automated purchase-order generation
- Multi-warehouse optimization
- Real-time streaming inventory data
- Advanced time-series models
- Model drift monitoring and automated retraining
- httpOnly-cookie authentication
- Mobile application
- Multi-company / multi-tenant support

---

## 20. Limitations

- The dataset is **synthetic**; real-world data will be noisier and may behave differently.
- Historical patterns may not represent future demand.
- Sales are treated as uncensored demand (no lost-sales effect).
- Supplier information may be incomplete in practice.
- Model performance can drift over time without retraining.
- Real ERP integration and large-scale deployments need additional work.
- The JWT is stored in `localStorage` (see Security).

---

## Documentation

Final report sections: problem statement, objectives, dataset, preprocessing, feature engineering, train/test methodology, models, metrics, architecture, ER diagram, API documentation, screenshots, security, testing, deployment, limitations, future scope, results. Working notes live in `docs/NOTES.md`; the Postman collection is in `docs/postman_collection.json`.
