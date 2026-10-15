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

  ## Day 6: Demand forecasting
- Code: ml-service/app/forecasting.py (origin-based feature table, inference, lead-time demand),
  app/train_forecast.py (selection, evaluation, saving), app/routes_forecast.py (POST /forecast), tests/test_forecasting.py.
- Direct models for h = 1, 2, 3 weeks (reorder needs 4-18 days). Features use weeks <= origin only, plus target-week
  promo/holiday/price/calendar known in advance. Training and live inference share make_origin_table (parity test).
- Target = units / mean of last 8 weeks, so one model serves fast and slow products. Ratio features clipped at 3x to limit
  spike pollution. Sample weight = scale so training matches WAPE (unit-based).
- Algorithm per horizon (Random Forest vs HistGradientBoosting, MAE loss) chosen on the last 13 train weeks;
  test set used once. Reported metrics are from the train-only fit; the saved model is refit on all data.
- 80% prediction interval from validation residual quantiles; coverage on test reported in forecast_metrics.json.
- Lead-time demand = weekly forecast / 7 x lead time days (ignores weekend uplift; list under limitations).
- Baselines at the same horizons: naive (last week) and 4-week MA on the same test rows.
- Results (test: 26 weeks x 40 products, train-only fit):
  h=1 hgb WAPE 16.33% / MAPE 20.09% / MAE 21.65 / RMSE 37.20 vs ma4 18.38% / 22.54%
  h=2 hgb WAPE 16.99% / MAPE 20.45% vs ma4 19.03% / 22.88%
  h=3 hgb WAPE 17.46% / MAPE 20.89% vs ma4 19.52% / 23.57%
  Gain vs ma4 (WAPE): 11.1% / 10.7% / 10.6%. 80% interval coverage: 81% / 79% / 83%.
  HistGradientBoosting beat Random Forest on the validation fold at every horizon.
  Top features at h=1: promo_days, r0, cv_8, mean4_ratio, r7.
  h=1 model __ / __ vs ma4 __ / __ | h=2 model __ / __ vs ma4 __ / __ | h=3 model __ / __ vs ma4 __ / __
- Model file (*.joblib) is git-ignored; regenerate with python -m app.train_forecast. forecast_metrics.json is committed.

## Day 7: Stockout risk and trend detection
- Code: ml-service/app/risk.py, train_risk.py, trend.py, routes_risk.py; tests/test_risk.py, test_trend.py.
- Label: stock[t] < lead-time demand (units on days t+1..t+L) + safety stock (1.65 * std of last 60 days * sqrt(L)). Same as the Day 2 check.
  It looks forward because it is the target; features use only data up to day t.
- Features (11): stock_ratio, cover_ltd, cover_days, mean7_ratio, growth_28_90, cv_60, lead_time_days,
  supplier on-time rate and recent delay (only POs already delivered by that day), day-of-year sin/cos.
  Dropped: historical in-transit quantity (the synthetic history has no future orders, so it would cause train/serve skew).
- Split: train rows are purged so each label window (day + lead time) ends before 2026-04-13; test = days on/after the split.
  Validation fold = last 60 days of training (algorithm choice, calibration, threshold). Test set used once.
- Imbalance: class weights (balanced). Probabilities calibrated with Platt scaling on the validation fold so risk % is meaningful.
  Threshold = F1-optimal on validation. Production model refit on all labeled days with the same procedure.
- Baseline: rule "stock_ratio < 1". The label is largely a function of stock and demand, so the model must beat this rule to add value.
- Risk bands (provisional, Day 9 alerts combine risk with stockout vs delivery date): High >= 60%, Medium 30-60%, Low < 30%.
- /risk accepts an optional stock override (used by the Day 12 simulator). /risk/all and /trend/all feed the dashboard.
- Trend: year-over-year change over the last 104 weeks. Increasing/decreasing needs |change| >= 15% and |z| >= 2.
  A plain linear slope is biased by seasonality; the 52-week difference cancels any 52-week pattern.
- Seasonality: lag-52 autocorrelation of the detrended weekly series; seasonal if r >= 0.30 (p < 0.05). Peak month and uplift reported.
- Pattern labels: increasing / stable / decreasing / seasonal / "increasing + seasonal" etc.
- Trend and seasonality are checked against scenario_labels.csv (validation only): python -m app.trend.
- Limitations: daily rows of one product are autocorrelated (effective sample size < n); risk model trained on synthetic data;
  supplier features barely affect the label by construction (the label ignores supplier delay).
- Results (fill from your run):
  Risk: model __ F1 __ (P __, R __), ROC-AUC __, PR-AUC __ | rule baseline F1 __ (P __, R __) | train/test positive rate __% / __%
  Trend agreement __%, seasonality agreement __%

  ## Day 8: Rule-based intelligence - DONE
Tasks done:
- ml-service/app/decision.py: safety stock, smart reorder, ABC-XYZ, supplier reliability and risk score
- ml-service/tests/test_decision.py: 14 unit tests (python -m pytest, 38 passing)
- python -m app.decision prints the supplier table, ABC-XYZ matrix and reorder suggestions
Run: cd ml-service; python -m pytest; python -m app.decision

Formulas (also in the decision.py docstring)
- Safety stock: SS = 1.65 * sqrt(LT * sigma_d^2 + d^2 * sigma_LT^2). With sigma_LT = 0 it equals the Day 2 / Day 7 label definition.
- Smart reorder: order = max(0, ceil(demand over (LT + avg supplier delay) + SS * (1 + 0.5 * (1 - reliability/100)) - (stock + on_order)))
- ABC: share of annual value; A up to 70%, B up to 90%, C the rest
- XYZ: CV of weekly demand over 52 weeks; X < 0.25, Y < 0.35, Z otherwise
- Supplier reliability (0-100): 40% on-time rate, 25% average delay (0 at 7+ days), 20% delay std (0 at 5+ days), 15% quality-issue rate (0 at 20%+). Rates are shrunk toward a prior (5 pseudo-orders). Risk score = 100 - reliability. Low < 20, Medium < 40, High >= 40.

Decisions
- products.csv has supplier_ids (a list); the first supplier is treated as the product's primary supplier
- ABC and XYZ cutoffs calibrated on scenario_labels (abc_actual, xyz_actual). The same labels were used for validation, so on real data pick the cutoffs from business policy
- smart_reorder takes the forecast lead-time demand as an input; the CLI uses last 28 days x lead time as a stand-in. Day 9 passes in the /forecast value and open POs (on_order)

Results
- Supplier reliability: S6, S7, S8 are High risk (scores 39, 47, 55); S1 to S4 score 83-97
- ABC: 9 A products, 100% agreement with abc_actual
- XYZ: 90% agreement (36/40). Misses: P017 and P018 (seasonal fans, CV inflated by seasonality), P005 and P040 (just below the 0.25 cutoff)
- Reorder check by planted stock scenario: reorder 10/10, near 3/8, normal, over and well 0

Known limitations
- Weekly CV counts trend and seasonality as variability; a deseasonalised CV would fix the fan misses
- Open POs are not counted in the CLI reorder check, so some near products show an order that Day 9 will remove
- Reliability uses delivered POs only; weights and caps are judgment calls, not fitted

## Day 9: Health score, alerts and integration
- Code (ml-service): app/health.py (pure functions), app/insights.py (combined per-product result),
  app/routes_insights.py (POST /insights, GET /insights/all), tests/test_health.py.
  Code (server): services/mlService.js (fetch client, 20 s timeout, 503 if the ML service is unreachable),
  models/Insight.js, controllers/insightsController.js, routes/insights.js.
- Health score (0-100) = 55% stock cover + 15% (100 - stockout risk %) + 15% supplier reliability + 15% demand stability.
  Weights are judgment calls, not fitted. Status: below 40 Critical, 40-69 Warning, 70+ Healthy.
  - Cover: stock ratio 0 -> 0, 1 -> 30, 2 -> 100. Above 90 days of cover the score falls from 100 to 35 at 250 days,
    so overstock is penalised too.
  - Stability: 100 x (1 - weekly CV / 0.8), floored at 0.
- Alert priority from margin = days of cover - days until replenishment:
  below 0 Critical (stockout before delivery), below 5 High, below 15 Medium, otherwise Low.
  - Days of cover = stock / mean daily forecast (the 3-week forecast / 7).
  - Days until replenishment = open PO expected date if one exists, otherwise lead time; the supplier's
    average delay is added to both.
- Alert list per product: stockout or low margin, reorder now, overstock, high-risk supplier; sorted by priority.
- Reorder uses the /forecast lead-time demand and open POs (replaces the Day 8 stand-in).
- Live stock: Express sends current stock and in-transit quantity from MongoDB; the ML service falls back to the
  CSV snapshot. Insight collection keeps ONE document per product (latest result in `data`, plus indexed
  priority, health and risk fields for filtering). No history is kept.
- Endpoints: GET /api/insights/:code (recompute and store), GET /api/insights?priority=&status= (stored summaries,
  most urgent first), POST /api/insights/refresh (admin, manager).
- Checks:
  - P001 (stock 40): Critical priority, health 32.5 Critical, margin -2.9 days, reorder 84 units.
    Stock override to 400: Low priority, health 97.3 Healthy, no reorder. Health arithmetic verified by hand.
  - Express: /refresh gave 40 ok, 0 failed; Critical filter returned 6 products, lowest health first.
  - Dataset checkpoint: priorities 6 Critical / 6 High / 13 Medium / 15 Low; health 7 Critical / 15 Warning /
    18 Healthy; 2 products at 0 cover (P039, P010); all 9 ABC-XYZ cells filled, AY has only 2 products
    (CX has 10). Dataset left unchanged, because regenerating would invalidate every earlier result.
  - Flip test (stock / 1.2, approximating +20% demand): 8 near-threshold products all rose to 36-73% risk and
    5 of 8 changed priority (P037, P016, P040 High -> Critical; P003, P035 Medium -> High).
  - pytest: 45 passed. Agreement with provisional labels (app.insights): health status 95% exact (38 of 40),
    score correlation 0.97; alert priority 90% exact, 100% within one level. All 5 disagreements are at threshold
    boundaries (health 70, margin 5 and 15) or from the label using generator parameters instead of the live forecast.
  - P039 orderQty 0 explained by: an open PO of 85 units (inventory position 85 >= reorder point 68.6).
    Critical priority is correct because stock is 0 until the PO arrives (about 9 days). Its supplier S6 has
    reliability 38.8, so the PO itself is a delay risk.
- Limitations:
  - Risk probabilities are near binary on this data (7 products at about 99-100%, 26 at about 0%); priority
    (margin) carries the nuance, so the UI should show both.
  - "Days of cover" is defined three ways (forecast-based, last-28-day demand, lead-time demand); the UI shows only
    stockout.days_of_cover.
  - The forecast 80% interval is skewed upward (promo spikes in the validation residuals); use lead_time_demand_high
    as a busy-week scenario, not as a safety-stock input.
  - Weekly forecast / 7 ignores the weekend uplift.
  - Health weights are not fitted to data.

  ## Day 10: Dashboard
- Recharts for charts. Pages: Dashboard (cards, health distribution, ABC-XYZ matrix, urgent table), Alerts, Smart Reorder,
  Supplier Risk, product detail (/product/:code). Create PO on Smart Reorder opens the PO form prefilled from query params.
- Cards: critical alerts (priority Critical), products at risk (stockout risk >= 30%, the Medium and High bands), average health, reorder now (order qty > 0).
- Data flow: Express stores the latest insight per product; GET /api/insights returns summaries (full=1 adds the whole payload);
  GET /api/insights/:code recomputes live; GET /api/insights/:code/history returns complete Mon-Sun weekly sales from MongoDB.
- Forecast chart: 52 weeks of actuals + 3 forecast weeks with the 80% range (stacked areas: transparent low + band).
- Supplier Risk and the reorder card render whatever fields the ML service returns; /supplier-risk exposes the full supplier score table.
- Day 9 routes now wrapped in asyncHandler (safe on Express 4 and 5).
- Not yet: SHAP "why" panel (Day 11), what-if simulator (Day 12).

## Day 11: Explainable AI and anomaly detection
- Code: ml-service/app/anomaly.py (features, training, live listing), app/routes_explain.py (GET /anomalies),
  server/src/routes/anomalies.js, client Anomalies page.
- Sales features (day t, previous 28 days only): sales_ratio = units / mean28, sales_z = (units - mean28) / std28,
  zero_surprise = zero day x (1 - share of zero days in the last 28). Ratio and z are clipped.
- Stock features: residual e_t = stock[t-1] - stock[t] - units[t] is 0 on a normal day. A count error reverses the next day
  (a "blip"); a real restock does not. Features: |e_t|, |e_t+1|, blip size, all divided by recent daily demand.
  Stock anomalies are therefore detected with a one-day delay (the latest day is not checked yet).
- Scale-free features, so one model per anomaly family covers every product.
- Model: Isolation Forest, 300 trees. Threshold = training-score quantile at the assumed contamination
  (sales 3%, stock 1.5%). Contamination sets the threshold only, never the training labels.
- Split: fit on the first 548 days, score the last 182. Production model refit on all rows with the same recipe.
- is_anomaly is used only for evaluation, never as a feature.
- Rule baselines for comparison: sales |z| >= 3 or a surprising zero day; stock blip >= 1.0; supplier delay >= 15 days.
- Type rules: zero sales while out of stock is skipped (not an anomaly); zero sales with stock = zero_sales;
  units above normal = sales_spike; below normal = sales_drop.
- Explainability: every row carries a message with the numbers behind it ("24 units sold, 3.1x the usual 8 a day").
- Listing: GET /anomalies?days=&product_id=&limit=&kind= returns count, by_type (counts before the kind filter and the limit)
  and the newest-first list. Cards use by_type; the table uses the filtered, limited list.
- Bugs and lessons:
  - 502 from Express was only the ML service's 500; the real TypeError (4 positional args to a 3-arg function) was in the
    FastAPI terminal. Call with keyword arguments so mismatches fail loudly. Pass the ML response body into AppError details.
  - Variable shadowing: the sales loop reassigned `kind`, the filter argument, so "All types" returned only sales spikes.
    Renamed the loop variable to atype. Cards (by_type) showed the full mix, which exposed the mismatch.
- Results (fill from your run):
  Sales: IF F1 __ (P __, R __) | rule F1 __ | ROC-AUC __, PR-AUC __ | recall spikes __%, zero days __%
  Stock: IF F1 __ (P __, R __) | rule F1 __ | ROC-AUC __, PR-AUC __
  Supplier delay rule: P __, R __
  Live listing, 730 days: 707 stock mismatch, 485 zero sales, 358 sales spike, 1 supplier delay
- Limitations:
  - Contamination rates are assumptions, so flagged counts follow the threshold more than the data.
  - The live listing also scores the training period with the production model, so counts there are in-sample.
  - Scores are not comparable across types, and supplier delay has no score (rule-based).
  - limit caps the list, so the table can show fewer rows than the card counts.
  - sales_drop can appear in the list but has no card or dropdown option yet.
  - The first 28 days of each product have no sales features (trailing window needs 28 days).