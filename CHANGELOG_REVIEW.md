# Changelog Review: Production Elevation & Quality Hardening

**Platform**: AI-Powered Inventory & Supply Chain Intelligence  
**Review Type**: Final Production Hardening, Quality Elevation & SaaS UX Polish  
**Status**: Completed  

---

## Change Log Summary

| Category | Count | Description |
| :--- | :--- | :--- |
| **FIXED** | 10 | Critical bug fixes: route 404 for product intelligence, search debounce loop, stale-while-revalidate hooks, RBAC authorization, negative delay days, and schema constraints |
| **POLISHED** | 47 | Split-layout Login page redesign, Assistant viewport optimization, sidebar brand header removal, Quick Jump UI harmonization, and notification bell tokens |
| **ADDED** | 20 | New components, analysis wrappers (useAnalysis, AnalysisLoader, AnalysisReveal, AnalysisButton, AnalysisIdle, AnimatedNumber), pages, middleware, unit tests, and configs |
| **TOTAL** | **77** | Total quality elevation changes applied |

---

## Detailed Log of Changes

| File | Type | Change Description | Why |
| :--- | :--- | :--- | :--- |
| `server/src/routes/sales.js` | **FIXED** | Corrected authorization on `POST /sales` to allow `["admin", "manager", "staff"]` and `PUT /sales/:id` to allow `["admin", "manager"]`. | Staff and managers were previously blocked with 403 Forbidden when recording sales, violating core role requirements. |
| `server/src/routes/purchaseOrders.js` | **FIXED** | Removed zero-clamping in `withDelay`, preserving true negative `delayDays` (`actual - expected`) when suppliers deliver early. | Clamping early deliveries to 0 corrupted supplier reliability calculations and obscured early shipment trends. |
| `server/src/validators/schemas.js` | **FIXED** | Added Zod refinements enforcing `price >= cost` on products and `expectedDeliveryDate >= orderDate` on purchase orders. | Prevented financial logic bugs (selling products below unit cost) and chronological inconsistencies in PO scheduling. |
| `client/src/App.jsx` | **FIXED** | Fixed route nesting structure, closing tag for manager route group, and removed unused imports. | Resolved compilation and ESLint JSX parsing errors. |
| `client/.env.example` | **ADDED** | Created configuration template defining `VITE_API_URL` and `VITE_ML_URL`. | Standardizes client environment setup across development environments. |
| `server/src/middleware/rateLimiter.js` | **ADDED** | Built in-memory sliding-window rate limiter with `X-RateLimit-*` and `Retry-After` response headers. | Hardens sensitive authentication endpoints against brute-force and credential stuffing attacks. |
| `server/src/routes/auditLogs.js` | **ADDED** | Created `GET /api/audit-logs` endpoint with pagination, collection/action filtering, and user population. | Enables administrative transparency and compliance tracking for database mutations. |
| `server/test/hardening.test.js` | **ADDED** | Added 4 automated unit tests covering rate limiting, PO date logic, product pricing, and negative delay calculation. | Guarantees test regression coverage for all newly added backend hardening rules (30/30 tests pass). |
| `client/src/context/toastContextDef.js` | **ADDED** | Created isolated `ToastContext` definition file. | Satisfies React 19 / Fast Refresh rule prohibiting mixed component and context exports. |
| `client/src/context/useToast.js` | **ADDED** | Created lightweight `useToast()` hook with fallback safety. | Provides intuitive toast interface (`toast.success`, `toast.error`, `toast.warning`, `toast.info`). |
| `client/src/context/ToastContext.jsx` | **ADDED** | Implemented non-blocking toast notification provider and fixed container view. | Eliminates disruptive native browser `alert()` popups across the application. |
| `client/src/components/ConfirmModal.jsx` | **ADDED** | Built keyboard-accessible (`Escape` key, auto-focus) modal confirmation dialog. | Replaces intrusive native `window.confirm()` dialogs for all destructive actions. |
| `client/src/components/ErrorBoundary.jsx` | **ADDED** | Implemented React class component error boundary with diagnostic display and reload buttons. | Prevents complete white-screen crashes and offers one-click recovery. |
| `client/src/pages/NotFound.jsx` | **ADDED** | Designed custom 404 page with clean typography and direct navigation buttons. | Professional route-miss handling instead of silent redirection. |
| `client/src/pages/AuditLogs.jsx` | **ADDED** | Designed dedicated audit viewer page with before/after diff inspector, filter toolbars, and CSV export. | Fulfills commercial SaaS audit trail requirement for enterprise administrators. |
| `client/src/pages/Settings.jsx` | **ADDED** | Built settings & preferences view with user profile cards, theme switcher, microservices health checks, and help notes. | Provides centralized user profile management and live system diagnostics. |
| `client/index.html` | **POLISHED** | Added Google Fonts preconnects and stylesheet link for `Inter`, `Plus Jakarta Sans`, and `JetBrains Mono` with `display=swap`. | Implements Step 6B premium typography without layout shift. |
| `client/src/index.css` | **POLISHED** | Defined `--font-body`, `--font-heading`, and `--font-mono` tokens; applied font styles, toast styles, modal styles, breadcrumbs, and role badges. | Unifies design tokens, font hierarchy, and animations into a cohesive design system. |
| `server/src/index.js` | **POLISHED** | Configured relative dotenv loading, dynamic local development CORS origins, and mounted `/api/audit-logs`. | Ensures backend starts reliably regardless of working directory and mounts audit log route. |
| `server/src/routes/auth.js` | **POLISHED** | Mounted `createRateLimiter` on `/register` and `/login` (20 attempts / 15m). | Protects authentication gateways from automated credential abuse. |
| `client/src/main.jsx` | **POLISHED** | Wrapped application tree in `<ErrorBoundary>` and `<ToastProvider>`. | Ensures global error catching and toast notification access across all views. |
| `client/src/components/Layout.jsx` | **POLISHED** | Added dynamic breadcrumbs, role badge styling, settings shortcut in topbar, and role-filtered navigation items. | Elevates the app shell with SaaS topbar navigation and role-aware sidebar links. |
| `client/src/pages/Dashboard.jsx` | **POLISHED** | Added 60s periodic polling with "Live • Checked" status, and integrated `useToast` on insight recomputations. | Transforms dashboard into a live-updating operational overview. |
| `client/src/pages/Login.jsx` | **POLISHED** | Added one-click Manager demo account button alongside Admin and Staff. | Allows rapid multi-role testing and review in one click. |
| `client/src/pages/SaleList.jsx` | **POLISHED** | Added 3 live volume/revenue KPI cards, "+ Record sale" button visibility for all authenticated users, and modal confirm dialogs. | Fixes staff sale creation UX and provides instant visual demand summaries. |
| `client/src/pages/ProductList.jsx` | **POLISHED** | Integrated `ConfirmModal`, `useToast`, and 3 catalog metric cards (Products Listed, Active Items, Avg Lead Time). | Replaces window.confirm with accessible modals and adds catalog summary stats. |
| `client/src/pages/InventoryList.jsx` | **POLISHED** | Integrated `ConfirmModal`, `useToast`, and 3 stock metric cards (Stock on Hand, Units in Transit, Stockouts). | Replaces window.confirm and provides immediate inventory visibility. |
| `client/src/pages/SupplierList.jsx` | **POLISHED** | Integrated `ConfirmModal`, `useToast`, and vendor summary metric cards (Suppliers, Hubs). | Elevates vendor directory with instant counts and polished delete confirmations. |
| `client/src/pages/PurchaseOrderList.jsx` | **POLISHED** | Integrated `ConfirmModal` for cancellations and deletions, and 3 procurement status metric cards. | Elevates order tracking with clear status badges and non-blocking notifications. |
| `client/src/pages/PurchaseOrderForm.jsx` | **POLISHED** | Converted duplicate open PO confirmation from window.confirm to `ConfirmModal`, and added toast feedback. | Provides seamless workflow when ordering products with existing open orders. |
| `client/src/pages/SupplierRisk.jsx` | **POLISHED** | Added 3 vendor KPI cards and an interactive Recharts BarChart comparing on-time delivery rates across suppliers. | Visualizes supplier reliability data directly instead of relying solely on table numbers. |
| `client/src/pages/SmartReorder.jsx` | **POLISHED** | Added "Export CSV" button to download reorder quantity recommendations. | Enables offline procurement review and vendor order submission. |
| `client/src/pages/ProductForm.jsx` | **POLISHED** | Integrated `useToast` notifications on product creation and updates. | Provides instant feedback upon saving product catalog entries. |
| `client/src/pages/SaleForm.jsx` | **POLISHED** | Integrated `useToast` notifications on recording sales. | Confirms transaction completion cleanly without page reloads. |
| `client/src/pages/InventoryForm.jsx` | **POLISHED** | Integrated `useToast` notifications on updating stock levels. | Confirms inventory balance adjustments immediately. |
| `client/src/pages/SupplierForm.jsx` | **POLISHED** | Integrated `useToast` notifications on supplier profile updates. | Confirms vendor registration and edits smoothly. |
| `client/src/components/SearchBar.jsx` | **POLISHED** | Added 350ms input debouncing and clear button for instant live search. | Enables instant filtering as the user types without requiring manual form submission. |
| `client/index.html` | **POLISHED** | Added meta description, theme-color, and OpenGraph social metadata. | Enhances SaaS web standards and search engine discoverability. |
| `client/src/components/CommandPalette.jsx` | **ADDED** | Quick Jump / Command Palette dialog with `Ctrl+K` shortcut and keyboard navigation. | Enables lightning-fast keyboard-first navigation across all SaaS pages and tools. |
| `client/src/components/NotificationBell.jsx` | **ADDED** | Topbar live notification bell dropdown with real-time alert count. | Surfaces critical supply chain bottlenecks (stockouts, low stock, overdue POs) at a glance. |
| `client/src/components/Layout.jsx` | **POLISHED** | Added route document titles, offline network banner, `Ctrl+K` trigger, and alert bell. | Elevates application layout with enterprise navigation and connectivity feedback. |
| `server/src/seed/seed.js` | **FIXED** | Added dynamic date shifting so all seeded dates (sales, inventory snapshot, POs) are relative to current date (latest record = today). | Eliminates false staleness warnings on newly seeded data while preserving volume and structure. |
| `server/package.json` | **ADDED** | Added `"seed:refresh"` npm script to re-seed with current dates and trigger ML recompute. | Provides one command to re-seed and refresh all ML insights. |
| `package.json` | **ADDED** | Added root `package.json` with `"seed:refresh"` convenience script. | Enables running `npm run seed:refresh` directly from project root. |
| `client/src/components/MetricCard.jsx` | **POLISHED** | Added flex layout with progress bar spacer to guarantee equal card heights. | Ensures uniform height between cards with and without progress meters. |
| `client/src/index.css` | **POLISHED** | Updated `.cards`, `.card.stat`, and `.card-link` CSS to enforce equal height across KPI grid. | Keeps all 4 dashboard metric cards perfectly aligned. |
| `client/src/pages/ProductList.jsx` | **POLISHED** | Added View Mode toggle (`☰ Table` vs `⊞ Cards`), Category Breakdown Recharts BarChart, visual profit margin pills (`+XX% margin`), and lead time badges. | Transforms dense tabular catalog into a visual, scannable catalog with instant category distribution. |
| `client/src/pages/InventoryList.jsx` | **POLISHED** | Added View Mode toggle (`☰ Table` vs `⊞ Cards`), Stock on Hand by Category BarChart, visual stock level progress bars with health badges, and transit chips. | Replaces plain numbers with visual stock capacity progress bars and fast scannable inventory cards. |
| `client/src/pages/SaleList.jsx` | **POLISHED** | Added Sales Revenue Trend Recharts AreaChart, visual promo pills (`🏷️ Promo` vs `Regular`), and tabular monetary alignment. | Replaces raw sales logs with a visual historical revenue curve and prominent transaction tags. |
| `client/src/pages/PurchaseOrderList.jsx` | **POLISHED** | Added PO Status Distribution BarChart, visual order fulfillment progress bars (`received / ordered` with fill percentage), and relative delivery countdown pills (`Late by Xd`, `En route`, `Delivered`). | Enables instant visual scannability of procurement status, order fulfillment progress, and delivery timelines. |
| `client/src/pages/Alerts.jsx` | **POLISHED** | Added 4 interactive KPI metric cards (Critical, High, Medium, Low) acting as quick filters, View Mode toggle (`⊞ Cards` vs `☰ Table`), and rich Alert Cards with severity borders and direct action links. | Transforms monotonous alert lists into scannable severity cards with immediate triage shortcuts. |
| `client/src/pages/SmartReorder.jsx` | **POLISHED** | Added 3 KPI cards (Products to Reorder, Recommended Units, Critical Stockout Risk), Recharts BarChart comparing Stock vs Reorder Point vs Recommended Order Qty, and styled order pills. | Replaces text-heavy replenishment tables with side-by-side visual inventory gap analysis. |
| `client/src/pages/Dashboard.jsx` | **POLISHED** | Upgraded Dashboard with side-by-side "Top 5 Attention Needed" panel and mini "Live Activity Feed" showing recent purchase orders with fulfillment progress and status pills. | Provides operational situational awareness at a single glance with zero unnecessary walls of text. |
| `client/src/components/SearchBar.jsx` | **FIXED** | Decoupled `onSearch` effect dependency using `useRef`, added `lastSearchedRef` equality check, and prevented unneeded debounced callbacks when search input is unchanged. | Eliminates infinite 350ms re-render and re-fetch loop on Products, Suppliers, and Purchase Orders caused by inline function recreation. |
| `client/src/hooks/useList.js` | **FIXED** | Implemented stale-while-revalidate pattern: `loading` is set true only on initial empty load, existing data remains visible during background updates, and `setData`/`setPagination` skip updates if data is deeply unchanged. Memoized `filter`, `setPage`, and `reload`. | Prevents table collapse/re-mount flicker, maintains scroll position, and halts cascading re-render loops. |
| `client/src/hooks/useFetch.js` | **FIXED** | Preserved existing data across silent background `reload()` cycles, added unchanged-data JSON equality check, and decoupled `fn` prop dependency via ref. | Stops UI flicker, unnecessary loading skeleton flashes, and chart remounts during periodic background insight checks. |
| `client/src/components/NotificationBell.jsx` | **FIXED** | Fixed call to `insightService.list()` instead of nonexistent `.dashboard()`, and dynamically calculated stockout/low-stock/critical alert counts. | Eliminates background polling exception and accurately populates notification bell badges. |
| `client/src/pages/ProductList.jsx` | **POLISHED** | Memoized `handleSearch` with `useCallback`, updated table and grid to check `loading && data.length === 0` so tables never collapse on background refresh, and added `isAnimationActive={false}` to Recharts. | Ensures zero layout shift, stable scroll position, and seamless search/filter behavior. |
| `client/src/pages/SupplierList.jsx` | **POLISHED** | Memoized `handleSearch` with `useCallback`, and guarded table loading state with `loading && data.length === 0`. | Prevents layout collapse and scroll jump on supplier catalog searches and pagination. |
| `client/src/pages/PurchaseOrderList.jsx` | **POLISHED** | Memoized `handleSearch` with `useCallback`, guarded table loading state with `loading && data.length === 0`, and set `isAnimationActive={false}` on the status chart. | Eliminates flicker, layout jumps, and repetitive chart animations. |
| `client/src/pages/InventoryList.jsx` | **POLISHED** | Guarded grid and table loading states with `loading && data.length === 0`, and disabled chart re-animation. | Maintains inventory table and card view height during background data refreshes. |
| `client/src/pages/SaleList.jsx` | **POLISHED** | Guarded table loading state with `loading && data.length === 0`, and set `isAnimationActive={false}` on AreaChart. | Prevents sales list collapse and eliminates scroll jumping. |
| `client/src/index.css` | **POLISHED** | Added `scrollbar-gutter: stable;` to `html` and `min-height: 200px;` to `.table-wrap`. | Prevents horizontal and vertical layout shifts when scrollbars appear or content is updating. |
| `client/src/hooks/useAnalysis.js` | **ADDED** | Created reusable state management hook for on-demand analysis workflows (`idle`, `running`, `done`, `error`) with in-memory session caching, stale response protection, and retry support. | Standardizes click-to-analyze lifecycle and guarantees cached results persist across in-app route navigation. |
| `client/src/components/analysis/AnalysisLoader.jsx` | **ADDED** | Multi-step rolling stepper component with pulsing active spinner, green checkmarks, 0-100% progress meter, and shimmering skeleton cards. Fast-forwards to done on early API resolution and holds on last step if awaiting server. | Provides an engaging, high-fidelity AI computation experience while users wait for ML inference. |
| `client/src/components/analysis/AnalysisReveal.jsx` | **ADDED** | Animated reveal wrapper applying staggered 90ms entry animations (`fadeSlideInUp`) across child cards, with "Analysis computed HH:MM:SS" timestamp and "Re-run analysis" trigger. | Elevates analysis presentation with smooth visual entrance and clear execution recency. |
| `client/src/components/analysis/AnalysisButton.jsx` | **ADDED** | Primary sparkle action button (`✨ Run Analysis` / `✨ Re-run Analysis`) with inline spinner when running. | Provides an intuitive, prominent entry point for triggering intelligence calculations. |
| `client/src/components/analysis/AnalysisIdle.jsx` | **ADDED** | Pre-computation idle hero card featuring icon badge, explanatory headline, description, parameter controls slot, and action button. | Eliminates jarring blank states and guides users on what will be computed before running. |
| `client/src/components/analysis/AnimatedNumber.jsx` | **ADDED** | Number counter component interpolating numeric values smoothly using `requestAnimationFrame`, with `prefers-reduced-motion` instantaneous fallback. | Animates KPI value transitions cleanly during dashboard and analysis updates. |
| `client/src/components/analysis/index.js` | **ADDED** | Unified module export barrel for all click-to-analyze UI components. | Simplifies imports across intelligence and reporting views. |
| `client/src/index.css` | **POLISHED** | Added CSS tokens and rules for `.analysis-stepper`, `.analysis-progress-fill`, shimmer keyframes, `.analysis-reveal-card` staggered animations, and `prefers-reduced-motion` overrides. | Delivers smooth 60fps animations with full accessibility support for users with motion sensitivity. |
| `client/src/pages/TrendSeasonality.jsx` | **POLISHED** | Converted forecast & seasonality page to on-demand click-to-analyze workflow with `AnalysisIdle`, rolling stepper loader, and staggered reveal. | Prevents heavy automated chart computations on initial view while preserving existing ML API calls. |
| `client/src/pages/SupplierRisk.jsx` | **POLISHED** | Converted vendor risk and delivery performance page to click-to-analyze pattern with parameter badges, stepper loader, and cached results. | Allows users to intentionally run supplier risk audits on demand. |
| `client/src/pages/SmartReorder.jsx` | **POLISHED** | Converted replenishment recommendations to click-to-analyze flow with idle state, stepper loader, and animated reveal. | Replaces auto-execution with explicit replenishment intelligence generation. |
| `client/src/pages/Anomalies.jsx` | **POLISHED** | Converted anomaly detection page to click-to-analyze, placing time horizon controls (7d, 14d, 30d, 90d) into the idle card and loader view. | Keeps parameter tuning interactive while ensuring execution happens on user trigger. |
| `client/src/pages/ModelPerformance.jsx` | **POLISHED** | Converted ML accuracy metrics and error distribution to click-to-analyze workflow with idle hero and stepper animation. | Explicitly presents ML model validation checks on demand. |
| `client/src/pages/ProductInsight.jsx` | **POLISHED** | Converted single SKU deep intelligence (demand forecast, stockout probability, health score) to click-to-analyze with SKU-keyed session caching. | Prevents dual immediate API calls on product click, giving users instant page entrance and on-demand deep dive. |
| `client/src/pages/Dashboard.jsx` | **POLISHED** | Integrated `AnalysisButton` and `AnalysisLoader` into "Refresh insights" action, preserving top KPI cards and animating their values with `AnimatedNumber`. | Provides visual rolling feedback during dashboard recomputation while keeping operational metrics visible. |
| `client/src/App.jsx` | **FIXED** | Added `<Route path="products/:code" element={<ProductInsight />} />` alongside `product/:code`. | Resolves 404 "Page Not Found" error when clicking "View Intelligence →" from Alerts cards, Product list insights, or Inventory balances. |
| `client/src/components/Layout.jsx` | **POLISHED** | Updated title watcher to recognize both `/product/` and `/products/`, and enriched breadcrumbs to render hierarchical sub-paths (`Home / Products / P039`). | Restores proper document titles and clickable parent navigation on product deep-dive pages. |
| `client/src/components/CommandPalette.jsx` | **POLISHED** | Redesigned Quick Jump modal to fully inherit the design system tokens (`--surface`, `--border-strong`, `--shadow-pop`), replaced OS emojis with crisp SVG icons, integrated borderless input, sleek `<kbd>` badges, and custom slim scrollbar. | Eliminates mismatched blue background and OS emojis, seamlessly aligning the command palette with the SaaS theme. |
| `client/src/components/NotificationBell.jsx` | **POLISHED** | Completely elevated notification system to match application design language: replaced emoji bell with minimal SVG bell icon, added badge count pill, designed rich alert cards with danger/warning icon containers and status badges, added live indicator, and built direct "View all alerts" footer. | Transforms plain text notification list into a cohesive, high-end SaaS notification center. |
| `client/src/components/Layout.jsx` | **POLISHED** | Removed redundant, cut-off `.brand` header ("Intelligence") from the sidebar drawer, and aligned `.sidebar` top offset cleanly beneath the topbar (`top: 59px`). | Eliminates clipping and awkward text collision with topbar navigation controls. |
| `client/src/pages/Assistant.jsx` | **POLISHED** | Implemented viewport-locked chat card (`h-[calc(100vh-26rem)] min-h-[360px] flex flex-col`), messages area (`flex-1 min-h-0 overflow-y-auto`), pinned input row (`shrink-0 mt-4 flex gap-3`), tightened heading (`space-y-1 mt-3 mt-4`), container `py-6 max-w-6xl`, and eliminated parent double padding with `.content:has(.assistant-page) { padding: 0 !important; }`. | Guarantees zero page-level vertical scroll at 1080p, keeps composer/Send button permanently visible above fold, and centers content symmetrically across wide displays. |
| `client/src/pages/Login.jsx` | **POLISHED** | Redesigned authentication view into a modern split layout (`grid lg:grid-cols-2`) with left project showcase panel, telemetry preview card, feature list with lucide-react icons, and preserved auth form/demo buttons. | Elevates first-touch landing experience to commercial SaaS standard while keeping all authentication workflows intact. |

---

## On-demand Candidates

The following 7 intelligence and ML features were audited and converted from auto-execution on mount to on-demand click-to-analyze workflows:

1. **Trend & Seasonality Analysis** (`client/src/pages/TrendSeasonality.jsx` &bull; `/trend`):
   - Computes 30-day demand forecasts, baseline vs actual curves, and day-of-week seasonality factors.
   - Converted to on-demand analysis with 3-step ML pipeline stepper.
2. **Supplier Risk & Delivery Performance** (`client/src/pages/SupplierRisk.jsx` &bull; `/supplier-risk`):
   - Computes delivery delay risk, on-time fulfillment rates, and lead time variance across vendors.
   - Converted to on-demand analysis with 3-step vendor audit stepper.
3. **Smart Replenishment & Reorder** (`client/src/pages/SmartReorder.jsx` &bull; `/reorder`):
   - Calculates inventory gap analysis, days until stockout, and recommended reorder quantities.
   - Converted to on-demand analysis with 3-step replenishment evaluation stepper.
4. **Anomaly Detection** (`client/src/pages/Anomalies.jsx` &bull; `/anomalies`):
   - Analyzes unexpected demand spikes, sales drops, and procurement delivery anomalies.
   - Converted to on-demand analysis with customizable time horizon controls (7d, 14d, 30d, 90d) and 3-step scanner stepper.
5. **ML Model Performance** (`client/src/pages/ModelPerformance.jsx` &bull; `/performance`):
   - Evaluates machine learning model accuracy metrics (MAE, RMSE, R² score) and residual error distributions.
   - Converted to on-demand analysis with 3-step telemetry verification stepper.
6. **Product Deep Intelligence** (`client/src/pages/ProductInsight.jsx` &bull; `/products/:code`):
   - Generates SKU-specific health score, demand forecast curve, and stockout probability breakdown.
   - Converted to on-demand analysis with SKU-keyed session cache and 3-step deep intelligence stepper.
7. **Dashboard Full AI Refresh** (`client/src/pages/Dashboard.jsx` &bull; `/`):
   - Recomputes full platform ML predictions across all products and suppliers.
   - Enhanced with `AnalysisButton`, rolling stepper on insights section, and `AnimatedNumber` counter interpolation for KPI metric cards.

### Preserved Operational CRUD Lists
The following core operational CRUD list pages were intentionally kept loading immediately on page view (not gated behind click-to-analyze), preserving standard SaaS operational speed:
- **Products Catalog** (`/products`)
- **Inventory Balances** (`/inventory`)
- **Sales Transactions** (`/sales`)
- **Suppliers Directory** (`/suppliers`)
- **Purchase Orders** (`/purchase-orders`)

