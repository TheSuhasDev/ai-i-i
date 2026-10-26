# AI Inventory Intelligence — Read-only audit

Audit date: 2026-10-17. Scope: repository code and committed data/docs; no source changes were made for the audit. The only intended new file is this report.

## 1. Feature checklist

| Feature | Status | Evidence and UI/API path | Gap |
|---|---|---|---|
| Smart reorder | **Partial** | `ml-service/app/decision.py::smart_reorder` (lines 57–90) computes forecast lead-time demand, safety stock, supplier reliability adjustment, and subtracts stock plus `on_order`. `ml-service/app/insights.py::insights_for_product` (66–90) supplies these inputs. Express `computeAndStore` calls ML via `POST /insights` (`server/src/controllers/insightsController.js::computeAndStore`, lines 11–18). Client `/reorder` calls `GET /api/insights?full=1` (`client/src/pages/SmartReorder.jsx`, lines 9–17). | Express passes only `Inventory.inTransitQty`, not quantities aggregated from Pending/In Transit PurchaseOrder documents. CSV fallback counts Cancelled as open. Therefore order position can be wrong (including P010 reported on-order 0 despite its Pending PO). Formula is implemented but operational on-order input is not trustworthy. |
| Explainable AI | **Partial** | `ml-service/app/explain.py::explain_risk` uses `shap.TreeExplainer` only when the selected risk model is Random Forest; for Logistic Regression it uses exact coefficient × standardized value contributions (`contributions`, lines 37–56). Express `GET /api/insights/:code/explain` calls it (`server/src/controllers/insightsController.js::getExplanation`, lines 107–115). Product detail `/product/:code` renders `WhyPanel` (`client/src/pages/ProductInsight.jsx`, lines 9, 73; `client/src/components/WhyPanel.jsx`). | Runtime explanation for P010 reported `linear contributions: coefficient x standardised value (log-odds units)`, not SHAP TreeExplainer. The UI panel is present, but the exact “Why is this critical?” wording is not. Explanations explain model risk, not alert priority. |
| What-if simulator | **Implemented** | `ml-service/app/simulator.py::simulate` creates before/after state and a 30-day projection (lines 83–133, 152–207); Express validates and forwards it (`server/src/routes/simulator.js::schema`, lines 11–17, and POST handler). Client `/simulator` (`client/src/pages/Simulator.jsx`) exposes demand %, supplier delay, stock, and order quantity and displays before/after plus projected stock chart. | Projection holds daily demand constant, per simulator assumptions. Supplier delay is an added delay rather than a direct replacement. |
| Health score 0–100 | **Implemented** | `ml-service/app/health.py::health_score` and `health_status` (lines 35–48): Critical <40, Warning 40–69, Healthy >=70. Included in per-product insights. Client product detail displays score/status and component bars (`client/src/pages/ProductInsight.jsx`, lines 66–70, 100–105); dashboard also summarizes health. | Weights are heuristic as documented in `docs/NOTES.md`; score is not a calibrated outcome probability. |
| Supplier reliability and risk | **Implemented** | `ml-service/app/decision.py::supplier_scores` (line 119 onward) scores on-time rate, delay, variation and quality issue rates; `insights.py::supplier_table` returns supplier risk. Express `GET /api/supplier-risk`; client `/supplier-risk` via `client/src/pages/SupplierRisk.jsx`. Product detail also shows supplier. | Score weights/prior are judgment calls; only delivered purchase orders train reliability. |
| Alert priority | **Partial** | `ml-service/app/health.py::alert_priority` (lines 51–54) assigns Critical/High/Medium/Low from cover-minus-delivery margin. `insights.py::insights_for_product` (92–102) calculates expected dates and margin. `/alerts` page flattens each product’s alerts into individual rows (`client/src/pages/Alerts.jsx`, lines 15–19, 45–51). | An overdue open PO is clamped to zero days until delivery (`insights.py`, line 96), so its age is ignored and it is treated like it arrives today (plus average delay). Also alert logic can emit multiple alerts per product by design. |
| ABC-XYZ classification and matrix | **Implemented** | `ml-service/app/decision.py::product_stats` (line 174 onward) computes classes; `insights.py` returns `classification`. UI shows each product class on Smart Reorder and a matrix component on Dashboard (`client/src/components/AbcXyzMatrix.jsx`). | Implemented cutoffs differ from README’s earlier target thresholds; current code/NOTES should be treated as implementation. |
| Trend and seasonality exposed in UI | **Implemented** | `ml-service/app/trend.py::trend_for_product` (line 95 onward) returns pattern, year-over-year trend and seasonal statistics. `insights.py` includes trend. Product detail visibly renders “Trend and seasonality” (`client/src/pages/ProductInsight.jsx`, lines 116–119); Dashboard also has trend analytics. | No standalone Trend page/route, but it is exposed in product detail/dashboard, not only in ML. |
| ML performance page with saved metrics | **Implemented** | `ml-service/app/performance.py::load_performance` reads JSON metric artifacts and `trend_report.csv` (lines 60–74); Express `GET /api/ml-performance` proxies it. `/performance` page (`client/src/pages/ModelPerformance.jsx`) renders forecast MAE, RMSE, MAPE, WAPE and classifier precision/recall/F1 from returned saved JSON, plus anomaly/trend metrics. | If artifacts are missing the API reports `missing` and the UI can show unavailable sections; files exist in this checkout. Metrics last generated dates vary and should be surfaced as freshness metadata. |
| AI assistant | **Implemented** | `server/src/services/assistantTools.js` defines 10 read-only tools; `server/src/services/assistant.js::ask` performs OpenAI-compatible tool calling and uses LLM_* config. `assistant.js` system prompt separates Facts and Recommendation, and UI displays tool lookups as “Data used” (`client/src/pages/Assistant.jsx`, lines 76–80). Route is protected at `/assistant`. | Prompt injection via editable product/data fields is possible; system text asks the model to treat tool output as data but does not structurally isolate it. Rate limiting is in-memory and per process/user, not `express-rate-limit`. README/progress config note is stale (see below). |

### Other requested implementation checks

- **Isolation Forest:** implemented in `ml-service/app/anomaly.py::fit_iforest` and used for live sales and stock listings by `recent_anomalies` (lines 85–90, 182–214). The live stock list uses Isolation Forest, not the better stock rule baseline.
- **JWT and roles:** bearer JWT verification in `server/src/middleware/auth.js::protect`; token contains user id/role in `server/src/controllers/authController.js::signToken`; bcryptjs 10-round password hash at `register` lines 18–20. CRUD routers apply `protect`; creates/updates default to admin/manager, deletes admin, with staff exceptions configured for Sales create and Inventory update. Public register/login and health are intentionally unauthenticated. No mounted API route beyond those public endpoints was found without authentication. The ML service is a separate exception (open endpoints, below).
- **CRUD:** full CRUD routes exist for Product, Supplier, Inventory, Sale, and PurchaseOrder through `server/src/routes/crudRouter.js` and resource routers. The sixth model, User, has no user-management CRUD route (auth supports only register/login/me); if “all 6 resources” means all six Mongoose models, User CRUD is missing. If it means six protected business endpoints, this repo has five CRUD resources plus analytics routes.
- **Zod validation:** schemas in `server/src/validators/schemas.js` are attached to CRUD writes, auth, simulator and assistant requests. Zod object schemas strip unknown properties by default, so arbitrary mass assignment fields are not copied into models.
- **Central error handler:** mounted in `server/src/index.js` after not-found handler; maps validation, cast, duplicate-key, JWT and JSON parse errors in `server/src/middleware/errorHandler.js`.
- **ML client:** `server/src/services/mlService.js` centralizes fetch, timeout, JSON/error translation and all ML endpoint calls.
- **Insight collection:** `server/src/models/Insight.js` has unique `product` index and full payload in `data`; `computeAndStore` uses upsert by product, thus one latest document per product, no history.

## 2. Confirmed problems and severity

### High

1. **Express ignores purchase orders when assembling current on-order quantity.** `server/src/controllers/insightsController.js:12-18` sends only `inv.inTransitQty`; it never queries `PurchaseOrder`. `ml-service/app/insights.py:86-90` uses the supplied value whenever it is not `None`, overriding the CSV quantity. This confirms why P010’s Pending PO can coexist with “On order 0”. The Simulator route has the same pattern at `server/src/routes/simulator.js:31-41`. **Impact:** reorder quantities, inventory position and alerts can over-order or misstate exposure. **Minimal fix:** aggregate open PO quantities (status in Pending/In Transit, minus received quantity as policy dictates) in Express and send that total; keep the specific earliest expected date in the payload too. Add parity tests for Pending and In Transit POs.

2. **ML CSV fallback counts Cancelled purchase orders as open.** `ml-service/app/insights.py:26-34` filters only `status != "Delivered"`; that includes Cancelled. `ml-service/app/simulator.py:169-174` consumes the same `_open_pos()` quantity. **Impact:** a canceled order may suppress a needed reorder or distort delivery margin whenever no Express override is supplied (e.g. direct ML calls/CLI). **Minimal fix:** filter statuses to `{"Pending", "In Transit"}` and use remaining qty (`qty_ordered - qty_received`) if partial receipts are supported.

3. **ML service endpoints are unauthenticated.** `ml-service/app/main.py:16-31` mounts all routers without authentication/dependency; FastAPI CORS only constrains browsers and does not block direct HTTP callers. No shared secret/header between Express and FastAPI was found; `mlService.js:11-15` sends only Content-Type. **Impact:** anyone who can reach port 8000 can invoke compute-intensive APIs and query model/data output. **Minimal fix:** require a shared service token on every non-health ML route and have Express send it from an environment variable; keep network ingress private as an additional control.

4. **Production-configured JWT secret is mandatory, but no strength check exists.** `server/src/index.js:48-51` exits only when `JWT_SECRET` is absent; it accepts weak/default strings. **Impact:** weak secrets enable token forgery. **Minimal fix:** validate minimum entropy/length and reject known placeholders at startup; provision a random secret through deployment secret storage.

### Medium

5. **Overdue PO age is discarded in alert margin.** `ml-service/app/insights.py:95-102` applies `max((expected_date - as_of).days, 0) + average_delay`. A PO expected 20 days ago is therefore modeled as due today plus only supplier average delay. **Impact:** priority may be too optimistic when a late PO has not arrived. **Minimal fix:** calculate overdue days explicitly and use an expected remaining delay model based on late-order history, or treat already-overdue POs as an immediate exception/critical state.

6. **Stock anomaly listing uses inferior Isolation Forest vs rule for stock count errors.** Live `/anomalies` calls `recent_anomalies`, which scores stock with `bundle["stock_model"]` at `ml-service/app/anomaly.py:203-214`. Saved held-out metrics `ml-service/models/anomaly_metrics.json:35-50` report Isolation Forest F1 0.4333 versus simple `stock_blip >= 1` rule F1 0.9180. **Impact:** more false positives and lower-quality stock mismatch list. **Minimal fix:** use the rule for stock listing (and label it as such), or retain both detectors and expose their outputs/validation evidence before selecting one.

7. **Anomaly UI list cap hides most available anomalies.** `client/src/pages/Anomalies.jsx:10` requests `limit: 500`; FastAPI permits up to 1000 (`ml-service/app/routes_explain.py:29-33`) and `recent_anomalies` returns only `out[:limit]` (`ml-service/app/anomaly.py:232-233`). In the reported current data this is 500 rows for 1551 reported anomalies. **Impact:** the list cannot be fully reviewed, while cards/count can imply the full count. **Minimal fix:** server-side pagination/cursor or explicit next-page controls; display “500 of 1551.”

8. **LLM configuration docs contradict the implementation.** `server/src/services/assistant.js:37-39,86` reads `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`; assistant status checks `LLM_API_KEY` at `server/src/routes/assistant.js:41-43`. `docs/PROGRESS.md:124,130` tells operators to set `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, while `docs/NOTES.md:291-304` describes LLM_* then also mentions ANTHROPIC_MODEL. **Impact:** following the Progress instructions leaves the assistant unconfigured. **Minimal fix:** make docs consistently specify LLM_*; set `LLM_BASE_URL` to the chosen provider’s OpenAI-compatible endpoint and `LLM_MODEL` to its model name (or change code to Anthropic-native config, but do not mix conventions). No Anthropic SDK/native API is used in code.

9. **Multiple alert rows per product are deliberate and observable.** `ml-service/app/insights.py:42-63` can add stockout/low-margin, reorder, overstock and supplier risk alerts; `client/src/pages/Alerts.jsx:15-19,45-51` flatMaps and renders each alert as its own row. This confirms 44 rows for roughly 20 products is possible. **Impact:** users may mistake alert count for affected-product count and see repeated product rows. **Minimal fix:** label the count “alerts across N products,” or provide grouped-by-product mode; retain distinct alert types.

10. **No “Data as of” date is rendered in client UI.** ML responses carry `as_of` (`ml-service/app/insights.py:107-123`; simulator response has it too), but client search found no `as_of`/“Data as of” reference in `client/src`. **Impact:** user may treat stale synthetic/model data as current; source dataset ends 2026-10-11 while audit date is 2026-10-17. **Minimal fix:** show response `as_of` prominently on dashboard/insight pages and distinguish data date from compute timestamp.

11. **Days of cover is computed with different demand bases.** Risk features use trailing 28-day demand (`ml-service/app/risk.py:35,91,248-251`); insights recompute cover from 3-week forecast average (`ml-service/app/insights.py:92-93`); simulator uses its own projected demand path and cover (`ml-service/app/simulator.py:83-133`). Product detail displays forecast-based `d.stockout.days_of_cover` and also renders all risk signals through `KeyValues` (`client/src/pages/ProductInsight.jsx:69,108-109`), exposing the recent-demand `days_of_cover`. **Impact:** same product can show inconsistent cover values without disclosing basis. **Minimal fix:** use one canonical UI field or label both (“recent-demand cover” vs “forecast cover”) and add units/basis in API schema.

12. **Assistant prompt injection remains possible through database values.** `server/src/services/assistant.js:10-17` instructs the model to ignore instructions inside tool data, but tools return editable product and supplier fields (`assistantTools.js` read-only handlers); the prompt also embeds tool results into model context (`assistant.js` lines 90–117). **Impact:** malicious product names/notes could influence model output or tool selection. Current tools are read-only, which limits but does not eliminate impacts (misleading answers/data disclosure already available to the user). **Minimal fix:** treat tool result content as clearly delimited untrusted data, constrain tool sequences/arguments, and avoid sending arbitrary free-text fields unless required.

13. **Errors expose development internals outside production.** `server/src/middleware/errorHandler.js:35-43` returns stack traces for any 500 unless `NODE_ENV=production`, and original error text is returned for 500 in non-production. `server/src/controllers/insightsController.js:95-102` additionally returns caught exception messages in the refresh response regardless of environment. **Impact:** internal paths/query details may leak if environment is misconfigured or refresh is called. **Minimal fix:** always return generic 500 messages; log diagnostics server-side and return a stable error code per failed product.

### Low

14. **No global Express rate limiter is installed.** `server/package.json` has no `express-rate-limit` dependency; only assistant-specific in-memory throttling exists (`server/src/routes/assistant.js:9-22`, 20 requests/user/10 min). Login/register and other endpoints have no app-wide limiter. **Impact:** authentication brute force and API overuse are not controlled at app level. **Minimal fix:** add a distributed/proxy-aware limiter to auth and API routes; retain assistant budget cap.

15. **Assistant limiter is process-local and unbounded by user cardinality.** The `hits` map at `server/src/routes/assistant.js:11` never evicts user IDs, and resets on restart/multiple replicas. **Impact:** cap can be bypassed across replicas and memory grows with distinct accounts. **Minimal fix:** use shared TTL storage (Redis/database) or a middleware with a shared store.

16. **README is stale relative to implementation.** README feature checklist and page table still mark delivered items planned/unchecked (`README.md` sections 10 and Project Status), despite routes/pages existing. **Impact:** misleads reviewers/operators about app capability. **Minimal fix:** revise status tables after reconciling feature gaps in this report.

17. **A fallback Vite port/origin fails API calls under the current CORS setting.** Browser verification at `http://127.0.0.1:5174` rendered the login page but login failed with “Cannot reach the server. Is it running?”; the same login succeeded at `http://localhost:5173`. `server/.env` sets `CLIENT_URL=http://localhost:5173` and `server/src/index.js:25` allows exactly that origin. **Impact:** if 5173 is occupied and Vite falls back to 5174, the UI appears available but API requests fail. **Minimal fix:** pin the client to the configured origin/port in local dev, or make the CORS allowed-origin list configurable for the actual client origin; do not use a broad wildcard in production.

## 3. Security findings

### Server

- Helmet is enabled at `server/src/index.js:24`.
- CORS is restricted to `process.env.CLIENT_URL` at line 25; it is not an access-control substitute. If unset, browser CORS will reject origins, but deployments should fail startup rather than rely on an unset origin.
- JSON body is limited to 1 MB (line 26).
- `express-rate-limit` is **not present**; assistant only has a process-local limiter, as above.
- JWT secret is required at startup but not checked for strength (`index.js:48-51`); JWT verification uses `jsonwebtoken.verify` and user lookup (`middleware/auth.js:6-16`). HS256 payload/expiry are set at `authController.js:7-10`.
- Passwords are bcryptjs hashed with 10 rounds (`authController.js:18-20`). Login returns same invalid-credentials message for unknown user and bad password (`authController.js:25-31`). Public self-registration forces staff role.
- Role enforcement: generic CRUD reads are protected; create/update default admin/manager, delete admin (`routes/crudRouter.js:15-21`). Staff exceptions are Sales create and Inventory update. Analytics and assistant routes all apply `protect`; Insights refresh adds admin/manager. Public exceptions are health, register, login. No unprotected operational Express route found.
- Mass assignment: Zod schemas validate write payloads; schemas strip unknown keys, and generic updates use `doc.set(data)`. This reduces arbitrary-field assignment risk. No direct user-controlled Mongo operator is incorporated in standard CRUD search: search text is regex escaped (`controllers/crudFactory.js:4,28-30`), filter fields accept strings, sort is regex constrained (`35-37`). Insights priority/status filters lack enum validation (`insightsController.js:49-51`), but only scalar query values are applied; add enum validation for correctness/defense-in-depth.
- Error leakage: development stack and message leakage plus refresh error text confirmed above. Production generic handling is present in error handler, but refresh error payload bypasses that policy.

### ML service

- All FastAPI endpoints are open to any network caller who can reach the service. CORS allowlist in `ml-service/app/main.py:18-24` only affects browser requests; no auth dependency, API key or shared secret exists. Express client does not send one.
- The ML service reads CSVs directly for model-serving/training (`ml-service/app/preprocessing.py`, `decision.py`, `anomaly.py`). Express supplies live stock/on-order overrides on some calls, but does not pass live PurchaseOrder-derived on-order or expected date.

### Secrets and repository hygiene

- `.gitignore` ignores `.env`, `.env.*`, and re-includes `.env.example`; it ignores `ml-service/models/*.joblib` (not every `*.joblib` anywhere). This covers the current ML model path, though wording “all *.joblib” is broader than the rule.
- `git ls-files` found only `server/.env.example` and `ml-service/.env.example`; no committed real `.env` was found. Git history file-name scan found no `.env` history beyond examples. A credential-pattern scan of current source/config found no matching real API/private-key strings; a history patch scan found no matching credential assignments. This is a pattern scan, not a guarantee against every secret format.

### Client and assistant

- JWT is stored in `localStorage` (`client/src/context/AuthProvider.jsx:16-20`; Axios reads it in `client/src/services/api.js:5-8`), so successful XSS can steal it. No `dangerouslySetInnerHTML` occurrence was found in `client/src`.
- Pages generally have loading/error/empty handling (`Alerts`, `SmartReorder`, `Anomalies`, `Simulator`, `ProductInsight`, `Assistant`, `ModelPerformance`); list-form pages use shared `useList`. Several related dropdown fetches silently swallow errors (for example `client/src/pages/InventoryList.jsx:19` and `SaleList.jsx:19`), so not every page data path exposes a failure. This audit did not render every route in a browser.
- Assistant validates plain-text message roles/count/length (`server/src/routes/assistant.js:25-36`), has 10 read-only tools and result size cap (`server/src/services/assistantTools.js`, `LLM_MAX_RESULT_CHARS`, default 7000), bounded 20-turn tool loop and 1200 output tokens (`server/src/services/assistant.js:86-120`). Tool outputs are serialized data, but prompt injection is still possible via editable values. The in-memory per-user limiter is not distributed.

## 4. Test and command results

Executed exactly the requested commands from each service folder. No files were changed manually; `npm run build` generated the ignored Vite output as part of the requested build.

- `ml-service: python -m pytest -q` — **PASS: 63 passed**, 13 warnings, 15.70s. Warnings were pandas `FutureWarning` from `app/preprocessing.py:80` (DataFrameGroupBy.resample grouping-column behavior deprecation); test groups: forecasting 4, preprocessing 8, simulate_all 1.
- `server: npm run lint` — **PASS** (no lint output/errors; command proceeded to the next command).
- `server: npm test` — **NOT RUN: missing script. Verbatim output:**

  ```text
  npm error Missing script: "test"
  npm error
  npm error To see a list of scripts, run:
  npm error   npm run
  npm error A complete log of this run can be found in: C:\Users\suhas\AppData\Local\Packages\sandbox.{***}\AC\npm-cache\_logs\2026-10-17T11_50_30_387Z-debug-0.log
  ```

- `client: npm run lint` — **PASS** (no lint output/errors; build then ran).
- `client: npm run build` — **PASS with warning**, Vite 8.3.4 built 690 modules; JavaScript chunk is 797.68 kB (234.13 kB gzip), over 500 kB. Verbatim warning:

  ```text
  (!) Some chunks are larger than 500 kB after minification. Consider:
  - Using dynamic import() to code-split the application
  - Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
  - Adjust build.chunkSizeWarningLimit to change this warning threshold.
  ```

- No server integration test was attempted: `npm test` is absent and the server package has no test script. The audit did not start services or require a MongoDB connection.

## 7. Runtime verification (2026-10-17)

Started the local ML service on port 8000, Express on 5000, and the Vite client. Port 5173 was already occupied, so Vite selected `http://127.0.0.1:5174/`. MongoDB connected. Local API checks used the seeded admin demo account from README; the password/token are not reproduced here.

| Check | Runtime result |
|---|---|
| Express `GET /api/health` | `status=ok`, `database=connected` |
| Client `GET /` on `http://127.0.0.1:5174/` | HTTP 200; Vite served the app shell |
| ML `GET /health` and unauthenticated `GET /supplier-risk` | Both HTTP 200, confirming the ML service is reachable and its analytics endpoint is open |
| `POST /api/auth/login` | Succeeded; returned admin role |
| `GET /api/insights?full=1` | 40 products; sample `as_of=2026-10-11` |
| `GET /api/supplier-risk` | 8 suppliers returned |
| `GET /api/ml-performance` | Succeeded; `missing` metrics list empty |
| `GET /api/anomalies?days=730&limit=500` | `count=1551`, 500 anomaly rows returned, `as_of=2026-10-11` |
| `GET /api/assistant/status` | `configured=true`; no prompt was sent to the external LLM provider |
| `GET /api/insights/P010` | `on_order=0`, `order_qty=422`, priority Critical. MongoDB purchase-order list had 6 P010 POs, including a Pending PO quantity total of 422. This reproduces the known integration gap. |
| `GET /api/insights/P010/explain` | Succeeded with one factor; method was **linear contributions** (the loaded risk model is logistic regression), not SHAP TreeExplainer. |
| `POST /api/simulator` with P010, demand +20%, delay +3d, order 100 | Succeeded; 30 projected stock values returned; priority remained Critical before/after. |
| Unauthenticated `GET /api/insights?full=1` | HTTP 401, confirming Express auth protection. |

### Browser/UI checks

Opened the app in the in-app browser, logged in with the documented local demo account, and inspected the rendered screens. The normal configured origin `http://localhost:5173` works. The fallback Vite instance on `http://127.0.0.1:5174` served the login shell but login failed with “Cannot reach the server. Is it running?” because the current Express CORS allowlist is only `http://localhost:5173` (`server/.env` has `CLIENT_URL=http://localhost:5173`). This is a local-origin configuration mismatch, not an auth failure; login succeeded at the configured origin. No source/config changes were made to work around it.

- **Dashboard:** loads service health “server ok | ML service ok,” KPI cards, ABC-XYZ matrix, and urgent-product table. It displays “Last computed 17/10/2026” but not the source-data as-of date (`2026-10-11`).
- **Smart Reorder:** shows 8 products needing orders, 1,111 total units. P010 row displays stock 0, on-order 0, reorder point 422, inventory position 0, order quantity 422, despite a Pending PO for 422 units in the PO page/database.
- **Alerts:** renders 44 alert rows across about 20 products; P010 appears once for stockout-before-delivery and once for reorder-now. Separate rows are expected from the implementation.
- **P010 Product Insight:** loaded health 24 Critical, risk 100% High, forecast-based cover 0, recommended order 422, explanation panel with one reason, ABC-XYZ AY, seasonal trend, and supplier details. The same page shows risk signals and chart; there is no data-as-of label.
- **What-if simulator:** loaded the 30-day stock projection and before/after table. Clicking “Demand +20%” recalculated successfully: daily demand 45.8 → 54.9, suggested order 422 → 507, units short 1,373 → 1,648; priority remained Critical and risk remained 100%. The page explicitly states that new order quantity does not change risk percentage.
- **ML Performance:** loaded saved metric results with MAE/RMSE/MAPE/WAPE and stockout precision/recall/F1. The trained classifier F1 is 0.928 versus 0.931 for the simple stock-ratio rule on the displayed holdout, so the trained classifier is marginally worse on F1. The anomaly table confirms stock-count Isolation Forest F1 0.433 versus simple rule F1 0.918. Trend agreement shows 100%, seasonality 85% for 40 products.
- **Anomalies:** displays 1,551 total, “500 shown of 1551,” and cards broken down by type. This confirms the list is capped. Page description says stock mismatch uses Isolation Forest; the metrics page reveals the stock rule performs much better.
- **Supplier Risk:** renders all 8 suppliers, ordered by reliability; low-reliability S6/S7/S8 are marked High risk.
- **AI Assistant:** page and prompt examples render; status API says configured. I did not send a prompt, to avoid transmitting inventory context to the configured external LLM provider.
- **Narrow viewport:** the in-app browser is about 595px wide; the shell retains a 220px fixed sidebar and shows horizontal page overflow at that size. This is a narrow embedded viewport observation, not a desktop-width layout verdict.

The browser was left open on the dashboard at `http://localhost:5173/`.

## 5. Ten most valuable tests to add

1. Express insight integration: Pending and In Transit PO quantities (including partially received quantities) are aggregated into on-order and passed to ML; reproduce P010.
2. ML `_open_pos`: Pending/In Transit count; Delivered/Cancelled do not; multiple POs select earliest expected date and sum remaining quantity.
3. Overdue PO priority: expected date in the past must not be treated as an on-time arrival; assert delivery estimate, margin and resulting alert priority.
4. Alert list contract: multiple alert types for one product render distinctly, count says alerts and unique products, filters preserve each alert.
5. Live stock anomaly detector: compare chosen detector against saved holdout metrics and assert correct result/cap/pagination semantics.
6. Every Express route auth matrix: unauthenticated rejected; staff/manager/admin allowed/denied per method, including insights refresh and assistant.
7. Zod/mass-assignment and NoSQL query tests: unknown update fields stripped, operator-shaped query strings cannot alter filters, invalid enum/date filters rejected.
8. Auth/security tests: weak/missing JWT secret startup rejection; registration always staff; passwords are not returned; generic login error; rate-limit behavior across multiple app instances.
9. ML boundary tests: all model/analytics endpoints reject missing/incorrect shared secret; health remains intentionally public; Express sends valid secret.
10. Assistant safety tests: prompt injection embedded in product/supplier values does not cause tool execution outside ten read-only tools; schema rejects user-supplied tool calls; result cap and tool-call loop enforced; output separates Facts/Recommendation/Data used.

## 6. Prioritized Day 14–15 to-do list

### Day 14 — correctness, tests, security

1. Fix live PO aggregation and ML Cancelled-status filter; add the first two PO regression tests before tuning reorder output.
2. Decide and implement an overdue-order policy; add alert margin boundary tests at <0, 5 and 15 days.
3. Change stock mismatch live detection to the validated rule or expose both methods with clear labels; add anomaly paging and clarify total versus displayed count.
4. Add server test runner and route/auth/validation integration tests; add ML endpoint auth with an Express-to-FastAPI shared secret; rate-limit login/register and assistant using shared storage.
5. Validate JWT secret strength at startup; standardize error responses so no stack/internal message appears in client responses, including insight refresh.
6. Reconcile assistant configuration: code expects `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, optional `LLM_MAX_RESULT_CHARS`; correct Progress/README deployment instructions and test a configured provider.

### Day 15 — deployment, documentation, demo/report

1. Add deployment config and a deployment checklist for MongoDB, server, client, and private ML network access; verify production CORS and secrets in the target environment.
2. Add a visible `Data as of` date and label the basis of every days-of-cover number; verify the page shows source-date 2026-10-11 rather than implying live data.
3. Update README capability/status tables, environment variable names, endpoint/security architecture, test commands, and known limitations to match code.
4. Re-run ML tests, server tests/lint, client lint/build after fixes; record exact results and warnings.
5. Complete the report with model metric provenance/date, screenshots of the implemented pages, architecture/API/ER diagram, synthetic-data limitations, and a reproducible demo flow.
