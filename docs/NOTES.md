# Running Notes (decisions and formulas for the report)

## Day 1
- Monorepo: client (Vite+React), server (Express+Mongoose, ES modules), ml-service (FastAPI)
- Ports: client 5173, server 5000, ml-service 8000
- Each service exposes /health (server at /api/health)
- Secrets live in .env (git-ignored); .env.example committed

## Day 2: Data models and synthetic dataset
- Dataset: 40 products / 6 categories, 8 suppliers, 730 days of sales (29,200 rows), 398 purchase orders. Seed 42.
- Demand: daily = base x trend x seasonality x weekday x promo x noise (gamma noise; low/medium/high = X/Y/Z).
- ABC: rank by revenue, class A while cumulative share before the product < 70%, B < 90%, else C.
  Result: 9 A (71%), 12 B (19%), 19 C (10%). A has 9 products (not 8) so every ABC-XYZ cell can hold 3+.
- XYZ: coefficient of variation of daily units: X < 0.5, Y 0.5-1.0, Z > 1.0.
- Supplier delay: delay_days = actual - expected delivery; negative = early; on-time means delay <= 0.
- Stock history is built backwards from the current snapshot, so history and today's stock always agree.
  Sales are uncensored demand (no lost-sales effect).
- "Demand 85" for USB Hub and "120" for Keyboard are read as demand over the lead time (~17 and ~20 per day).
- Provisional rules in scenario_labels.csv (final versions on Days 8-9):
  stock_ratio = stock / (lead-time demand + safety stock); safety stock = 1.65 * sigma * sqrt(lead time);
  alert margin = days of cover - days to delivery (< 0 Critical, < 5 High, < 15 Medium, else Low);
  health = 0.65 cover + 0.15 supplier + 0.10 turnover + 0.10 stability (< 40 Critical, < 70 Warning).
- Stockout label (Day 7): stock < lead-time demand + safety stock; about 15.8% of rows.
- Anomalies: ~2.5% of sales rows (3-5x spikes, zero-sales days), ~1% stock count mismatches, one 17-day supplier delay.
  is_anomaly is only for evaluating Isolation Forest, never a model feature.
- scenario_labels.csv is for validation only, never a model input.
- ML service reads the CSVs directly; MongoDB holds the operational data for the app.
- Baseline weekly MAPE (4-week moving average) is about 29%, so the trained model has room to improve.

## Day 3: Backend APIs
- Auth: JWT (HS256), payload {id, role}, expiry 7d. Passwords hashed with bcryptjs (10 rounds).
  Public register always creates role "staff". admin/manager come from the seed.
- Roles: read = any logged-in user; create/update = admin, manager; delete = admin.
  Exceptions: staff can POST /sales and PUT /inventory/:id.
- Validation: Zod schemas in server/src/validators/schemas.js; unknown fields are stripped (blocks mass assignment).
- Errors: one central handler returns {success:false, message, details?}.
  Mapped: Zod/Mongoose validation 400, CastError 400, duplicate key 409, JWT errors 401, not found 404.
- Lists: ?page &limit (max 200) &sort &search plus per-resource filters.
- Sales revenue = unitsSold x unitPrice when not supplied.
- PO delayDays = actual - expected delivery (days, negative = early); status set to Delivered when an actual date is given.
- Login returns the same error for unknown email and wrong password (no user enumeration).

### API summary (for the report)
| Resource | Base path | Notes |
|---|---|---|
| Auth | /api/auth | POST register, POST login, GET me |
| Suppliers | /api/suppliers | CRUD, search name/code/city |
| Products | /api/products | CRUD, filter category/isActive/supplier |
| Inventory | /api/inventory | CRUD, filter product |
| Sales | /api/sales | CRUD, filter product/promoFlag/from/to |
| Purchase orders | /api/purchase-orders | CRUD, filter product/supplier/status/qualityIssue |

## Day 4: Frontend shell
- Client structure: services/ (axios + per-resource services), context/ (auth), hooks/useList, components/, pages/, utils/.
- Auth: login stores the JWT and user in localStorage; an axios request interceptor adds the Bearer header;
  a response interceptor clears storage and redirects to /login on any 401 (except the login call itself).
  Limitation for the report: localStorage tokens can be read by injected scripts (XSS); httpOnly cookies would be safer.
- Routing: <ProtectedRoute> redirects to /login when logged out; with a roles prop it also blocks other roles.
  Create/edit pages require admin or manager. UI buttons mirror the server rules (Delete = admin only),
  but the server is the real enforcement.
- Lists use server-side pagination, search and filters through the useList hook (15 rows per page).
- Forms: dedicated pages for create/edit; server validation messages are shown in an alert (field: message).
- PO form: entering an actual delivery date sets status to Delivered; the server computes delayDays.
- Dashboard is a placeholder with service status and record counts; replaced on Day 10.
- Plain CSS in index.css, no UI library.

### Day 4 addendum: Inventory and Sales pages
- Inventory: list (sorted lowest stock first), "Update stock" form for all roles, add (admin/manager), delete (admin).
  Editing stamps the snapshot date with today by default. One record per product (unique index).
- Sales: list with product, date range and promo filters; record sale for all roles (staff included),
  edit for admin/manager, delete for admin. Unit price pre-fills from the product; revenue = units x price (server-computed).
  One sale per product per day (unique index).
- Rules mirror the API permissions from Day 3; the server remains the real enforcement.

## Day 5: Data preparation and baseline
- Code: ml-service/app/preprocessing.py (load, clean, weekly aggregation, features, time split),
  app/evaluation.py (MAE, RMSE, MAPE, WAPE), app/baseline.py, tests in tests/test_preprocessing.py.
- Granularity: weekly (Mon-Sun). Daily MAPE is not meaningful with CV up to 0.9 and many zero days;
  weekly matches the plan's MAPE target. Demand over a lead time of L days is approximated as (weekly forecast / 7) x L.
- Cleaning: duplicates dropped, negatives clipped, missing calendar days filled with 0. Injected spikes and zero days are
  kept on purpose (Isolation Forest needs them). is_anomaly and scenario_labels are never features.
- Features (19): lags 1,2,3,4,8; rolling mean and std over 4 and 8 weeks; growth_4_8 (mean4/mean8); cv_8;
  price, promo_days, holiday_days; month, sin/cos week of year; lead_time_days, category_code.
  Lag/rolling features use only weeks before the target (verified by unit tests).
  Promo, holiday, price and lead time describe the target week and are known in advance.
- Holiday flags are approximate (fixed dates plus Diwali windows); the synthetic data only has month-level seasonality.
- Split: first 548 days train, last 182 test; split date 2026-04-13 (a Monday). Never random.
- Baselines: naive (last week), 4-week moving average, seasonal naive (same week last year).
  Two modes: one-step-ahead (the model's benchmark) and static multi-step (frozen at the split; matches the Day 2 check).
- MAPE ignores weeks with zero actual demand. Pooled MAPE and mean per-product MAPE are both reported.
- Metrics saved to ml-service/models/baseline_metrics.json (committed; only *.joblib is git-ignored).
- Baseline results (fill in from your run):
  naive_1step __% | ma4_1step __% | seasonal_naive __% | naive_static __% | ma4_static __% (MAPE)