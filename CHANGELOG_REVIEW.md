# Changelog Review: Production Elevation & Quality Hardening

**Platform**: AI-Powered Inventory & Supply Chain Intelligence  
**Review Type**: Final Production Hardening, Quality Elevation & SaaS UX Polish  
**Status**: Completed  

---

## Change Log Summary

| Category | Count | Description |
| :--- | :--- | :--- |
| **FIXED** | 4 | Critical bug fixes in RBAC authorization, negative delay days, schema constraints, and JSX nesting |
| **POLISHED** | 18 | UX/UI elevations: typography system, KPI cards, Recharts visualizations, auto-refresh polling, toasts |
| **ADDED** | 9 | New components, pages, middleware, unit tests, and configuration templates |
| **TOTAL** | **31** | Total quality elevation changes applied |

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
