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

## Day 14 & 15: Full End-to-End Audit & Fixes - DONE

### Summary of Fixes by Audit ID
- **AUD-01 (Purchase Orders):** Prevent duplicate open PO creation. Added validation check in `server/src/routes/purchaseOrders.js` returning 409 `DUPLICATE_OPEN_PO` unless explicit confirmation `confirmDuplicate: true` is passed. Added prompt in `PurchaseOrderForm.jsx`. Unit test added in `server/test/salesAndPo.test.js`.
- **AUD-02 (Alerts & Business Logic):** Fixed overdue PO display and "-0.0" margin clamping. When an open PO is overdue, alerts display `PO overdue by Nd, ETA unknown`. Clamped margin to `0.0` if `abs(margin) < 0.05` across `ml-service/app/insights.py` and `simulator.py`.
- **AUD-03 (Smart Reorder & Inventory Position):** Fixed on-order quantities showing 0. Seeded Insight collection with live open PO aggregation. `on_order` and `inventory_position` now correctly incorporate pending and in-transit PO quantities across products.
- **AUD-04 (Dataset & Dates):** Extended synthetic data end date to current date (`date.today()`) in `generate_data.py`, regenerated datasets and revalidated (`validate_data.py` - all 8 checks passed), retrained ML models. Dates are fully consistent across all pages.
- **AUD-05 (Smart Reorder & Supplier Risk):** Added Minimum Order Quantity (`moq=10`) and rounding in `decision.py`. Added high-risk supplier warning badge and automatic alternate supplier recommendation in `insights.py` and `SmartReorder.jsx`. Added "Use [Alt Supplier]" PO creation action.
- **AUD-06 (Alert Noise Reduction):** Tightened Medium priority stockout margin threshold from 15 to 10 days in `health.py`. Collapsed Low/Medium alerts by default in `Alerts.jsx` with per-row and global expand/collapse controls.
- **AUD-07 (Trend & Seasonality):** Adjusted synthetic trend generation slopes in `generate_data.py` to yield a realistic distribution of Increasing, Decreasing, and Stable products. Added product code and YoY sorting to `TrendSeasonality.jsx`.
- **AUD-08 (Anomalies):** Suppressed false-positive zero-sales anomalies when prior stock is 0 in `anomaly.py`. Expanded message column width and disclosure wrapping in `Anomalies.jsx`.
- **AUD-09 (Supplier Risk):** Formatted on-time delivery rates and quality issue rates as percentages (`pct()`). Excluded redundant raw `risk_score` (which was simply `100 - reliability_score`), keeping Reliability Score and Risk Level with explanatory tooltip header descriptions. Removed unused variables.
- **AUD-10 (Dashboard Layout):** Fixed clipped attention item text ("100% estimated stockout risk") using flexbox `min-w-0` on container and reason, and `shrink-0` on action buttons.
- **AUD-11 (Floating Chat Widget):** Repositioned and added bottom clearance (`padding-bottom: 105px` on `.content`) so floating assistant button never obstructs table actions or form submit buttons.
- **AUD-12 (Purchase Orders Table):** Added dedicated `col-quality` min-width (90px) to prevent "QUALITY" header truncation. Styled `td.actions.sticky-actions-col` as horizontal flex row with compact action buttons to prevent vertical stacking.
- **AUD-13 (Code Quality & Linting):** Cleaned up unused imports and variables in `ProductInsight.jsx` (`ProductCell`), `SupplierDeliveries.jsx` (`num`), and `SupplierRisk.jsx` (`r`). `npm run lint` passes with 0 errors.
- **AUD-14 (Typography & Polish):** Installed `@fontsource/inter` locally. Applied typography scale (page titles 28–32px, section headings 18–20px, body 14.5px, table headers 12px uppercase tracking). Applied `font-variant-numeric: tabular-nums` to numbers, dates, IDs, and PO numbers.
- **AUD-15 (Feedback & States):** Added demo login quick-fill buttons to `Login.jsx` (Admin & Staff) for seamless role testing and verification.
- **AUD-16 & AUD-17 (Verification & Responsive Polish):** Full responsive verification completed across 1920px, 1366px, 768px, and 375px viewports. Verified zero console errors. Saved visual screenshot artifacts into `docs/screenshots/`.

### Modified Files
- `ml-service/data/generate_data.py`
- `ml-service/app/decision.py`
- `ml-service/app/insights.py`
- `ml-service/app/simulator.py`
- `ml-service/app/health.py`
- `ml-service/app/anomaly.py`
- `ml-service/tests/test_anomaly.py`
- `ml-service/tests/test_decision.py`
- `ml-service/tests/test_health.py`
- `ml-service/tests/test_open_pos.py`
- `server/src/routes/purchaseOrders.js`
- `server/src/validators/schemas.js`
- `server/src/seed/seed.js`
- `server/test/salesAndPo.test.js`
- `client/package.json`
- `client/src/main.jsx`
- `client/src/index.css`
- `client/src/utils/format.js`
- `client/src/pages/Login.jsx`
- `client/src/pages/Dashboard.jsx`
- `client/src/pages/Alerts.jsx`
- `client/src/pages/SmartReorder.jsx`
- `client/src/pages/TrendSeasonality.jsx`
- `client/src/pages/SupplierRisk.jsx`
- `client/src/pages/PurchaseOrderList.jsx`
- `client/src/pages/PurchaseOrderForm.jsx`
- `client/src/pages/Anomalies.jsx`
- `client/src/pages/ProductInsight.jsx`
- `client/src/pages/SupplierDeliveries.jsx`
- `docs/FULL_AUDIT.md`
- `docs/PROGRESS.md`

### Test Suite Status
- `ml-service`: 72 / 72 pytest tests passing.
- `server`: 25 / 25 node tests passing.
- `client`: `eslint` 0 errors/warnings; `vite build` succeeded in 573ms.
- Remaining items: None. All audited issues (AUD-01 through AUD-17) resolved and verified.