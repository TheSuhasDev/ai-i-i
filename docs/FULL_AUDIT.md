# AI Inventory Intelligence — Full End-to-End Audit Report

**Date:** 2026-10-26  
**Auditors:** Antigravity Autonomous Agent  
**Scope:** Client (React 19, Vite, Recharts), Server (Node.js/Express 5, Mongoose 9), ML Service (FastAPI, scikit-learn, pandas).  

---

## Executive Summary & Audit Matrix

| ID | Area | File | Problem | Severity | Fix |
|---|---|---|---|---|---|
| **AUD-01** | Purchase Orders / Backend | `server/src/routes/purchaseOrders.js`, `server/src/validators/schemas.js`, `client/src/pages/PurchaseOrderForm.jsx` | Duplicate open POs for the same product (e.g. P039 has 3 open POs: PO-0395, PO-20261018-P039, PO-20261026-P039) are created without confirmation or validation. | **Critical** | Block duplicate open PO creation on server unless `confirmDuplicate: true` is passed; in client, show confirmation dialog displaying existing PO number, status, and quantity. |
| **AUD-02** | Alerts / ML Service | `ml-service/app/insights.py`, `ml-service/app/health.py`, `client/src/pages/Alerts.jsx` | Alerts clamp overdue PO days to 0 (`max((expected_date - as_of).days, 0) + delay`), misstating delivery as 0.0 days away. Also formats `-0.0` margin days. | **Critical** | When PO is overdue, calculate overdue days explicitly and display `"PO overdue by Nd, ETA unknown"`; clamp `-0.0` to `0.0`. |
| **AUD-03** | Smart Reorder / Data Parity | `client/src/pages/SmartReorder.jsx`, `server/src/controllers/insightsController.js`, `server/src/seed/seed.js` | "ON ORDER" displays 0 everywhere in Smart Reorder after seed/startup; inventory position does not incorporate pending and in-transit open POs. | **Critical** | Ensure `computeAndStore` syncs and injects `openPurchaseOrders` total (`qtyOrdered - qtyReceived`) across Pending + In Transit; run insights calculation during seeding and ensure inventory position equals `stock + on_order`. |
| **AUD-04** | Data Freshness / Dates | `ml-service/data/generate_data.py`, `server/src/seed/seed.js`, `client/src/components/StaleDataBanner.jsx` | Dashboard banners say data is 15 days old (`2026-10-11`) while local date is `2026-10-26`, and purchase orders are placed up to current dates. | **High** | Extend `END_DATE` in `generate_data.py` to today (`2026-10-26`), regenerate datasets, re-train models, and re-seed database so all dates align with today. |
| **AUD-05** | Smart Reorder / Supplier Risk | `ml-service/app/insights.py`, `ml-service/app/decision.py`, `client/src/pages/SmartReorder.jsx` | Reorder recommendations for High-Risk suppliers (e.g., S6 QuickShip Traders, reliability < 70) show no risk warning and fail to recommend available alternative suppliers. Orders odd unit counts (e.g., Electric Kettle 9 units) instead of respecting lot/MOQ rounding. | **High** | Add high-risk supplier warning and suggest highest-reliability alternate supplier in `insights.py`; add minimum order quantity / case-pack rounding (MOQ 10, multiple of 5/10) in `smart_reorder`. Expose warning and switch button in UI. |
| **AUD-06** | Alerts / UI & Noise | `ml-service/app/health.py`, `client/src/pages/Alerts.jsx` | Alert list is noisy with dozens of Low/Medium alerts displayed equally alongside Critical alerts. Medium threshold (<15 days) is too loose. | **High** | Tighten alert thresholds (Critical < 0, High < 5, Medium < 10 days). In `Alerts.jsx`, collapse Low and Medium alerts by default with expand/collapse toggle. |
| **AUD-07** | Trend & Seasonality / ML Data | `ml-service/data/generate_data.py`, `client/src/pages/TrendSeasonality.jsx` | Trend page shows artificial clustering where nearly all increasing products have YoY change of +40% to +55% due to narrow uniform slope generator. Client table defaults to desc sort. | **High** | Diversify trend slope distributions in `generate_data.py` across realistic ranges (+10% to +45%, -10% to -35%, stable); default sort by product code / name in `TrendSeasonality.jsx`. |
| **AUD-08** | Anomalies / ML Service | `ml-service/app/anomaly.py`, `client/src/pages/Anomalies.jsx` | Zero-sales anomalies are flagged on days when stock was 0 (stockouts are lost demand, not an anomaly). Explanatory messages in table are truncated and unreadable. | **High** | Suppress zero-sales anomaly when stock on hand or prior-day stock <= 0; in client UI, provide accessible tooltip and click-to-expand full message for each row. |
| **AUD-09** | Supplier Risk / UX | `client/src/pages/SupplierRisk.jsx`, `client/src/utils/format.js` | Supplier metrics table displays raw decimals for rates (e.g., `0.96` for on-time, `0.02` for quality issue) instead of percentages (`96.0%`, `2.0%`). Reliability score and risk level appear duplicated without explanatory tooltips. | **Medium** | Format all rate columns as percentages; add descriptive headers and tooltips explaining Reliability Score (0-100 composite) and Risk Level categorization. |
| **AUD-10** | Dashboard / UI Clipping | `client/src/pages/Dashboard.jsx`, `client/src/index.css` | "What needs attention today" item right-side text "100% estimated stockout risk" is clipped by adjacent action buttons on smaller container widths. | **High** | Apply `min-w-0` on reason container and `shrink-0` on action buttons with responsive wrapping using flexbox. |
| **AUD-11** | Layout / UI Overlap | `client/src/components/AssistantWidget.jsx`, `client/src/index.css`, `client/src/components/Layout.jsx` | Fixed floating assistant chat button (`bottom: 24px; right: 24px`) overlaps Create PO, Edit, and Cancel buttons in data tables. | **High** | Reposition widget button and add `padding-bottom: 5rem` to main layout content container so all table actions scroll completely clear of the widget. |
| **AUD-12** | Purchase Orders / UI & Typography | `client/src/pages/PurchaseOrderList.jsx`, `client/src/index.css` | "QUALITY" table header is truncated; action buttons (Edit, Cancel, Delete) wrap and stack awkwardly, doubling row heights. | **Medium** | Fix column widths; make actions cell compact with flex row, `white-space: nowrap`, and tabular numeric alignment. |
| **AUD-13** | Code Quality / Lint Errors | `client/src/pages/ProductInsight.jsx`, `client/src/pages/SupplierDeliveries.jsx`, `client/src/pages/SupplierRisk.jsx` | `npm run lint` fails with 3 unused variable errors (`ProductCell`, `num`, `r`). | **High** | Remove unused imports and variables across all three files. |
| **AUD-14** | Typography / Modern Standard | `client/package.json`, `client/src/main.jsx`, `client/src/index.css` | App uses system fonts without bundled Inter typography; numbers lack `tabular-nums`, causing visual jitter in numeric columns. | **Medium** | Install and import `@fontsource/inter`; configure system-ui fallback; add `font-variant-numeric: tabular-nums` to all monetary, inventory, PO, and metric values. |
| **AUD-15** | UI Polish / Feedback States | `client/src/components/`, `client/src/pages/` | Missing consistent skeleton loaders, empty state banners, unified confirmation dialogs, and error toast feedback for destructive mutations. | **Medium** | Add skeleton loading states, empty state banners, and structured modal/toast alerts across all CRUD forms and list views. |
| **AUD-16** | Backend Security / Rate Limiting | `server/src/index.js`, `server/package.json` | No global rate limiter installed on Express API routes; assistant limiter is process-local and unbounded. | **Medium** | Add `express-rate-limit` for `/api/auth` and global API routes with proper proxy trust configuration. |
| **AUD-17** | ML Service Security | `ml-service/app/main.py`, `server/src/services/mlService.js` | ML service endpoints are unauthenticated and expose internal endpoints to any process without service token verification. | **Medium** | Verify `ML_SERVICE_TOKEN` via FastAPI dependency header on all non-health routes; ensure Express passes token in headers. |

---

## Detailed Audit by Focus Area

### A. Every Page and Route Analysis
- **Login (`/login`):** Validates email and password; gracefully displays bad credential toasts. Staff accounts lack administrative actions as expected.
- **Dashboard (`/`):** KPI cards match database aggregations; StaleDataBanner shows 15-day lag due to seed dates. Attention items clip text on standard viewports.
- **Alerts (`/alerts`):** Displays products with active alert signals; Low/Medium alerts overwhelm Critical alerts; overdue PO ETA calculation displays 0.0 days.
- **Smart Reorder (`/reorder`):** On-order quantities show 0 despite existing open POs in database; Electric Kettle recommends 9 units without MOQ rounding. High-risk suppliers lack visual warning and alternative suggestion.
- **Trend & Seasonality (`/trend`):** YoY changes show excessive +40-50% clustering; list sorts desc by default.
- **Supplier Risk (`/supplier-risk`):** Metrics table renders unformatted fractions (`0.96`) instead of percentages (`96%`).
- **Purchase Orders (`/purchase-orders`):** Duplicate PO creation not blocked; "Quality" header truncated; Edit/Cancel buttons stack.
- **Anomalies (`/anomalies`):** Flags zero-sales on out-of-stock days; messages are truncated in cell without expansion.
- **Product Detail (`/product/:code`):** Historical charts and ML forecasting render; unused import causes ESLint failure.
- **Chat Widget (`AssistantWidget.jsx`):** Fixed position overlaps table actions in bottom right.

### B. Data Correctness & Cross-Page Parity
- **Stock & On-Order:** Inventory current stock and purchase order quantities differed between Smart Reorder, Inventory snapshot, and ML inputs because `openPurchaseOrders` summary was omitted during seed calculation.
- **KPI Counts:** Alert badge counts and dashboard critical metrics match once alert calculation rules are unified.

### C. Business Logic Formulas & Edge Cases
- **Overdue PO Days:** `max((expected_date - as_of).days, 0)` caused negative delays to become 0. Overdue days must be explicit: `as_of - expected_date`.
- **Negative Zero (`-0.0`):** Floating point rounding in margin calculations produced `-0.0` in alert strings.
- **MOQ & Lot Rounding:** Small order quantities (e.g. 9 units) violate typical vendor lot requirements. An MOQ of 10 with rounding to multiples of 5/10 is necessary.

### D. Backend / API Architecture
- Duplicate PO check missing in `crudFactory` and `purchaseOrders.js`.
- Zod schema requires validation for `confirmDuplicate`.
- Central error handler properly masks internal stack traces in production.

### E. ML Service & Synthetic Data
- `generate_data.py` frozen at `2026-10-11` instead of `2026-10-26`.
- Trend slope generator lacks realistic variance.
- Anomaly detector needs exclusion for `stock_on_hand <= 0` and prior-day stockouts.

### F. Database Hygiene
- P039 contains duplicate pending/in-transit purchase orders.
- Missing indexes on `PurchaseOrder.product` and `PurchaseOrder.status`.
- Seeding script needs to compute and store initial insights.

### G. UI / UX & Typography
- Missing `@fontsource/inter` bundle.
- Numeric columns lack tabular numbers.
- Responsive wrapping needed at 375px, 768px, 1366px, and 1920px.

---
*Report generated for PHASE 2 audit compliance.*
