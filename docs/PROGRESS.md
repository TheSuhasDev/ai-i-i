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

## Day 11: Explainable AI and anomaly detection - DONE
Tasks done:
- ml-service/app/anomaly.py: Isolation Forest for sales (spike, zero sales, drop) and stock (count mismatch), plus a rule for extreme supplier delays (15+ days)
- python -m app.anomaly trains, evaluates against is_anomaly, saves models/anomaly_models.joblib (git-ignored) and models/anomaly_metrics.json
- ml-service/app/routes_explain.py: GET /anomalies (days, product_id, limit, kind); Express GET /api/anomalies calls it through mlService.js
- Anomalies page in the client: type cards, time and type filters, table with a plain-English "What happened" message per row
- SHAP "Why is this critical?" panel on the risk model: (fill in: done / not done)
- Bugs fixed: route/function signature mismatch (TypeError, 502 in Express); `kind` filter overwritten inside the sales loop (list only showed sales spikes)
Run: cd ml-service; python -m app.anomaly; uvicorn app.main:app --reload --port 8000; cd ../server; npm run dev; cd ../client; npm run dev

## Day 12: What-if simulator - DONE
Tasks done:
- ml-service: simulator (demand %, supplier delay, stock, order quantity) with before/after on the same code path as /insights, POST /simulate
- Express: POST /api/simulator (live stock baseline); client: What-If Simulator page with sliders, comparison table, 30-day projection chart, Create PO
- Tests: python -m pytest (58 passing); validation: python -m app.simulator
Run: ml-service: python -m app.simulator (validation); open /simulator in the client

## Day 13: Model performance page and AI assistant - DONE
Tasks done:
- ML Performance page from the real saved metrics (forecast vs baselines, risk classifier vs rule, anomaly detection, trend agreement, feature importance)
- AI assistant: tool-calling chatbot over inventory data (10 read-only tools), facts labelled separately from recommendations, "Data used" list
- ml-service: GET /model-performance, POST /simulate/all; Express: /api/ml-performance, /api/assistant (+ /status)
- Tests: python -m pytest (63 passing)
New env vars (server): ANTHROPIC_API_KEY, ANTHROPIC_MODEL (optional)

## Next: Day 14 - Testing, security and deployment
- Test pass over all 26 checklist items (README feature checklist), fix bugs
- Rate limiting (express-rate-limit), Helmet, CORS, protected ML endpoints (shared secret between Express and the ML service; the ML service is currently open), no secrets in Git
- Deploy: frontend (Vercel/Netlify), backend + ML service (Render/Railway), MongoDB Atlas. The ML build must run: python data/generate_data.py, python -m app.train_forecast,
  python -m app.train_risk, python -m app.anomaly (the *.joblib files are git-ignored). Set ANTHROPIC_API_KEY on the host.