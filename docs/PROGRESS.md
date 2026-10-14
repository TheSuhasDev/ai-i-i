# Project Progress Log

Project: AI Inventory Intelligence (MERN + Python ML), 15-day plan
Repo layout: client/ (Vite+React, :5173), server/ (Express, :5000), ml-service/ (FastAPI, :8000), docs/

## How to run
- server: cd server; npm run dev
- client: cd client; npm run dev
- ml-service: cd ml-service; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000

## Day 1: Setup and architecture - DONE
Tasks done:
- Monorepo created with git
- Express server with Mongoose connection, helmet, cors, morgan, /api/health
- Vite + React client with health status page for all services
- FastAPI skeleton with /health, venv, ML libraries installed (requirements.txt)
- .env and .env.example files, root .gitignore, ESLint on server and client
Deliverable: three services running locally - confirmed

## Decisions
- Server uses ES modules ("type": "module")
- Database: <local MongoDB / Atlas - fill in>

## Day 2: Data models and synthetic dataset - DONE
Tasks done:
- Mongoose models: User, Supplier, Product, Inventory, Sale, PurchaseOrder (server/src/models)
- ml-service/data/generate_data.py (seed 42) producing products, suppliers, sales, inventory_snapshot,
  stock_history, purchase_orders and scenario_labels CSVs
- ml-service/data/validate_data.py: all checks pass; plot checked visually
- server/src/seed/seed.js written and dry-run tested (real seeding happens on Day 3)
Demo logins (seeded on Day 3): admin@inventory.com / Admin@123, manager@inventory.com / Manager@123,
staff@inventory.com / Staff@123
Decisions: see docs/NOTES.md (ABC has 9 A products, provisional health/alert rules, stock built backwards)

## Day 3: Backend APIs - DONE
Tasks done:
- JWT auth (register, login, me), protect + authorize(role) middleware
- Generic CRUD controller factory; routes for suppliers, products, inventory, sales, purchase-orders
- Zod validation, central error handler, 404 handler
- MongoDB seeded via npm run seed (3 users, 8 suppliers, 40 products, 40 inventory, 29,200 sales, 398 POs)
- Tested in Postman (collection saved at docs/postman_collection.json)
New env vars (server): JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV
Demo logins: admin@inventory.com / Admin@123, manager@inventory.com / Manager@123, staff@inventory.com / Staff@123
API summary: see docs/NOTES.md

## Day 4: Frontend shell - DONE
Tasks done:
- Axios service layer with token interceptor and 401 handling (client/src/services)
- AuthProvider context, ProtectedRoute (with role guard), Layout with sidebar and topbar
- Login page; placeholder Dashboard (service status and record counts)
- Product, Supplier and Purchase Order list pages (search, filters, pagination) and create/edit forms
- Role-aware UI: staff read-only, manager add/edit, admin also delete
Run: server npm run dev, client npm run dev, then open http://localhost:5173
- Extra: Inventory and Sales list/form pages (staff can record sales and update stock counts)

## Day 5: Data preparation and baseline - DONE
Tasks done:
- ml-service/app/preprocessing.py: cleaning, weekly aggregation, 19 features, time-based split
- ml-service/app/evaluation.py: MAE, RMSE, MAPE, WAPE
- ml-service/app/baseline.py: naive, 4-week MA and seasonal naive, one-step and static; metrics saved to models/baseline_metrics.json
- 8 pytest tests including no-leakage checks (python -m pytest)
Run: cd ml-service; python -m pytest; python -m app.baseline

## Day 6: Demand forecasting - DONE
Tasks done:
- Direct 1/2/3-week models (scale-free target), validation-based model choice, baselines at the same horizons
- models/forecast_models.joblib (git-ignored) and models/forecast_metrics.json
- POST /forecast: weekly forecasts with 80% range, promo/price inputs, lead-time demand
- 13 pytest tests including no-leakage and train/serve parity
Run: cd ml-service; python -m pytest; python -m app.train_forecast; uvicorn app.main:app --reload --port 8000

## Day 7: Stockout risk and trend detection - DONE
Tasks done:
- Stockout labels from stock history, class-weighted + calibrated classifier (RF vs logistic regression), metrics in models/risk_metrics.json
- Trend (year-over-year, deseasonalised) and seasonality (lag-52 autocorrelation) detection, checked against planted ground truth
- Endpoints: POST /risk, GET /risk/all, POST /trend, GET /trend/all
- Tests: python -m pytest (24 passing)
Run: cd ml-service; python -m app.train_risk; python -m app.trend; uvicorn app.main:app --reload --port 8000

## Day 8: Rule-based intelligence - DONE
Tasks done:
- ml-service/app/decision.py: safety stock (with lead-time variance), smart reorder (delay + reliability adjusted, formula in module docstring), ABC-XYZ, supplier reliability and risk score
- ABC cutoffs 70/90% and XYZ cutoffs 0.25/0.35 calibrated on scenario_labels (ABC exact, XYZ 90%); XYZ misses are trend/seasonal products (CV counts them as variability)
- 14 unit tests in tests/test_decision.py (python -m pytest, 38 passing)
Run: cd ml-service; python -m pytest; python -m app.decision

## Day 9: Health score, alerts and integration - DONE
Tasks done:
- ml-service: health score, alert priority, combined POST /insights and GET /insights/all
- server: mlService.js client, Insight collection, /api/insights endpoints (stored latest result per product)
- Dataset checkpoint run: all features show on real output (AY cell has 2 products, noted as a limitation)
Run: cd ml-service; python -m pytest; uvicorn app.main:app --reload --port 8000; cd ../server; npm run dev

## Day 10: Dashboard - DONE
Tasks done:
- Dashboard with overview cards, health distribution chart, ABC-XYZ matrix and urgent products table
- Alerts, Smart Reorder (with Create PO), Supplier Risk and product detail pages (history + forecast chart)
- Express: /api/insights/:code/history, /api/insights?full=1, /api/supplier-risk; ML: GET /supplier-risk
Run: ml-service (uvicorn), server (npm run dev), client (npm run dev); click Refresh insights on the dashboard

## Next: Day 11 - Explainable AI and anomaly detection
- SHAP TreeExplainer on the risk model, top factors per prediction in plain language ("Why is this critical?" panel)
- Isolation Forest for abnormal sales and stock behaviour, anomaly list (is_anomaly used only for evaluation)