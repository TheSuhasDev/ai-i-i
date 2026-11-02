# 03a. File-by-File Guide: Client (React + Vite)

This document provides a complete, line-by-line style reference for every file inside the `client/` directory.

---

## 1. Configuration & Root Files

### `client/package.json`
1. **Purpose:** Defines frontend dependencies, scripts, and build configuration.
2. **Key Dependencies:**
   - `react` & `react-dom` (v19): Modern React component runtime.
   - `react-router-dom` (v7): Client-side SPA routing.
   - `recharts` (v2): SVG charting library for demand forecasts and metrics.
   - `axios`: HTTP client with interceptors for JWT injection and error handling.
   - `lucide-react`: Lightweight, tree-shakeable SVG icon collection.
   - `clsx` & `tailwind-merge`: Class name merging helpers.
3. **Scripts:**
   - `npm run dev`: Runs Vite dev server with Hot Module Replacement on port 5173.
   - `npm run build`: Compiles production bundle into `/dist`.
   - `npm run lint`: Runs ESLint across all `.jsx` and `.js` source files.
4. **Key Logic:** Configures `"type": "module"` so the browser uses native ES module imports.

### `client/vite.config.js`
1. **Purpose:** Configures Vite bundler options and development server parameters.
2. **Key Logic:**
   - Imports `@vitejs/plugin-react` to support JSX transformation and React Fast Refresh.
   - Sets `server.port = 5173` so the client always runs predictably on the designated port.
   - Configures path alias `@` resolving to `./src` for clean import paths.

### `client/index.html`
1. **Purpose:** Single Page Application (SPA) HTML shell.
2. **Key Logic:**
   - Declares the `<div id="root"></div>` mounting point where React injects the entire virtual DOM tree.
   - Imports Google Fonts or system typography stylesheets.
   - Loads `/src/main.jsx` as an ES module via `<script type="module" src="/src/main.jsx"></script>`.

### `client/.env`
1. **Purpose:** Environment variables accessible in browser code via `import.meta.env`.
2. **Key Variables:**
   - `VITE_API_URL=http://localhost:5000/api`: Base URL for all backend Express endpoints.

---

## 2. Application Core & Shell

### `client/src/main.jsx`
1. **Purpose:** Application bootstrap entry point.
2. **Key Functions:**
   - `createRoot(document.getElementById('root')).render(...)`: Mounts React 19 into the DOM.
3. **Dependencies:**
   - Imports `client/src/index.css` (global styles).
   - Wraps `<App />` inside `<BrowserRouter>` and global context providers (`AuthProvider`, `ProductImageViewerProvider`, `AssistantChatProvider`).
4. **Key Logic:** Strict mode is enabled during development to catch unhandled side effects and double-invocations.

### `client/src/App.jsx`
1. **Purpose:** Top-level URL routing table with code-splitting and role-based access control.
2. **Key Components:**
   - Uses `React.lazy()` to code-split all 22 page components into independent chunks, drastically speeding up initial page load times.
   - Wraps routes inside `<Suspense fallback={<LoadingSpinner />}>`.
3. **Dependencies:**
   - Imports `client/src/components/ProtectedRoute.jsx` and `client/src/components/Layout.jsx`.
4. **Route Hierarchy:**
   - `/login` ➔ Public route for `Login.jsx`.
   - `/` ➔ Protected by `ProtectedRoute`. Renders `Layout.jsx` containing:
     - `/` (Dashboard)
     - `/alerts` (Alerts)
     - `/reorder` (Smart Reorder)
     - `/trend` (Trend & Seasonality)
     - `/supplier-risk` (Supplier Risk scorecard)
     - `/supplier-risk/:id/deliveries` (Supplier delivery history)
     - `/product/:code` (Product 360 Insight)
     - `/anomalies` (Isolation Forest anomaly explorer)
     - `/simulator` (What-If scenario simulator)
     - `/performance` (ML model evaluation scorecard)
     - `/assistant` (Full-page AI assistant)
     - CRUD lists (`/products`, `/inventory`, `/sales`, `/suppliers`, `/purchase-orders`)
     - Admin/Manager guards for mutation forms (`/products/new`, `/sales/:id/edit`, etc.).

### `client/src/index.css`
1. **Purpose:** Global styling, design system tokens, CSS custom properties, and UI responsiveness rules.
2. **Key Logic:**
   - Defines CSS variables for primary slate colors, accent blues, emerald greens (healthy), amber (warning), and crimson (critical).
   - Styles buttons, clean cards, tabular typography (`font-variant-numeric: tabular-nums`), responsive data tables, and scrollbars.
   - Provides utility classes (`.pill-critical`, `.pill-warning`, `.pill-healthy`) used throughout badge components.

### `client/src/lib/utils.js`
1. **Purpose:** Utility helper for dynamic class concatenation.
2. **Key Function:**
   - `cn(...inputs)`: Combines `clsx` and `tailwind-merge` to resolve conflicting CSS class names cleanly.

---

## 3. Services & Data Fetching Layer

### `client/src/services/api.js`
1. **Purpose:** Centralized Axios instance with request and response interceptors.
2. **Key Logic:**
   - Creates an Axios instance with `baseURL: import.meta.env.VITE_API_URL` and a 20-second timeout.
   - **Request Interceptor:** Reads `token` from `localStorage`. If present, injects `headers.Authorization = 'Bearer ' + token`.
   - **Response Interceptor:** Watches for HTTP 401 Unauthorized responses. If a 401 occurs on an authenticated route, it clears `localStorage.removeItem('token')` and forces a redirect to `/login`.
3. **Used by:** Every API service module in `client/src/services/index.js`.

### `client/src/services/index.js`
1. **Purpose:** Exported catalog of typed API service functions mapped directly to Express routes.
2. **Key Service Objects:**
   - `authService`: `login(creds)`, `register(data)`, `me()`.
   - `productsService`: `list(params)`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`.
   - `inventoryService`: `list(params)`, `update(id, data)`.
   - `salesService`: `list(params)`, `create(data)`, `update(id, data)`, `delete(id)`.
   - `suppliersService`: `list(params)`, `get(id)`, `create(data)`, `update(id, data)`.
   - `purchaseOrdersService`: `list(params)`, `create(data)`, `update(id, data)`, `delete(id)`.
   - `insightsService`:
     - `list(params)`: Calls `GET /api/insights?priority=&status=&full=1`.
     - `get(code)`: Calls `GET /api/insights/:code` (recomputes and caches).
     - `history(code, weeks)`: Calls `GET /api/insights/:code/history?weeks=52`.
     - `refresh()`: Calls `POST /api/insights/refresh` (batch recomputation).
     - `explain(code)`: Calls `GET /api/insights/:code/explain`.
   - `simulatorService`:
     - `simulate(payload)`: Calls `POST /api/simulator` for single product.
     - `simulateAll(payload)`: Calls `POST /api/simulator/all` across all 40 products.
   - `anomaliesService`: `list(params)` ➔ `GET /api/anomalies`.
   - `mlPerformanceService`: `get()` ➔ `GET /api/ml-performance`.
   - `assistantService`: `ask(message, conversation)` ➔ `POST /api/assistant`.

### `client/src/utils/format.js`
1. **Purpose:** Formatting helpers ensuring clean numbers and dates across all UI views.
2. **Key Functions:**
   - `formatCurrency(amount)`: Formats numbers as `$1,249.50`.
   - `formatNumber(num)`: Formats with thousands separators (`29,200`).
   - `formatPercent(decimal)`: Converts `0.158` to `15.8%`.
   - `formatDate(isoString)`: Converts ISO timestamps to readable formats (`Oct 26, 2026`).

### `client/src/utils/exportCsv.js`
1. **Purpose:** Client-side CSV generator.
2. **Key Function:**
   - `exportToCsv(filename, rows, headers)`: Converts a JavaScript array of objects into a formatted CSV string and triggers a browser download using a temporary `<a>` blob download link.

### `client/src/utils/productImage.js`
1. **Purpose:** Generates reliable product image URLs and fallback SVG avatars.
2. **Key Function:**
   - `getProductImageUrl(productCode)`: Returns `/products/${productCode}.jpg` if available; otherwise falls back to a category-specific SVG icon.

---

## 4. Context Providers & Custom Hooks

### `client/src/context/authContext.js` & `AuthProvider.jsx` & `useAuth.js`
1. **Purpose:** Global state management for user authentication and permissions.
2. **State Managed:**
   - `user`: Object containing `{ id, email, name, role }`.
   - `token`: Stored JWT string.
   - `isAuthenticated`: Boolean flag.
   - `loading`: Boolean indicating initial startup check.
3. **Key Methods:**
   - `login(email, password)`: Calls `authService.login()`, saves token and user in `localStorage`, and updates React state.
   - `logout()`: Clears `localStorage` and resets state to null, instantly redirecting to login.
   - `hasRole(requiredRoles)`: Returns true if user's role matches any in the allowed list.

### `client/src/context/assistantChatContext.js` & `AssistantChatProvider.jsx` & `useAssistantChatContext.js`
1. **Purpose:** Keeps AI assistant conversation history alive when navigating between different pages.
2. **Key State:**
   - `messages`: Array of chat objects `[{ role: 'user'|'assistant', text, facts, recommendations, toolsUsed }]`.
   - `isOpen`: Boolean toggling the floating assistant drawer.
   - `loading`: Boolean indicating whether the LLM is actively thinking and invoking tools.

### `client/src/context/productImageContext.js` & `ProductImageViewer.jsx` & `useProductImageViewer.js`
1. **Purpose:** Global image preview modal. When a user clicks any product thumbnail in a table, this opens a high-resolution preview modal with zoom controls and product specs.

### `client/src/hooks/useFetch.js`
1. **Purpose:** Generic asynchronous data fetching hook.
2. **Key State:** `{ data, loading, error, refetch }`. Automatically runs on mount and handles component unmount cleanup to prevent memory leaks.

### `client/src/hooks/useList.js`
1. **Purpose:** Powers all data tables across the application.
2. **Key State:** Manages `page`, `limit` (default 15), `search`, `sortBy`, `sortOrder`, and arbitrary resource filter objects.
3. **Key Methods:** Automatically debounces search input and requests refreshed paginated datasets from the server.

### `client/src/hooks/useAssistantChat.js`
1. **Purpose:** Exposes actions to send user prompts to `POST /api/assistant` and stream or push resulting facts and recommendations into context state.

---

## 5. UI Presentation Components

### `client/src/components/Layout.jsx`
1. **Purpose:** Main application shell.
2. **Features:**
   - Collapsible left sidebar navigation with active route highlights and icons.
   - Top navigation bar showing current page breadcrumbs, system data freshness badge, user role badge, and logout button.
   - Bottom padding ensuring table action buttons are never obscured by the floating assistant widget.
   - Renders `<Outlet />` where page components display.

### `client/src/components/ProtectedRoute.jsx`
1. **Purpose:** Security wrapper checking authentication and role authorization.
2. **Key Logic:**
   - If `!isAuthenticated`, returns `<Navigate to="/login" replace />`.
   - If `roles` prop is supplied (e.g. `['admin', 'manager']`) and user has `role: 'staff'`, it redirects to `/` with an access denied alert.

### `client/src/components/MetricCard.jsx`
1. **Purpose:** Standard KPI statistic card.
2. **Props:** `title`, `value`, `subtitle`, `icon`, `trend`, `variant` (normal, warning, critical, success).
3. **Key Logic:** Renders prominent numeric values with tabular numbers and color-coded change badges.

### `client/src/components/Pill.jsx`
1. **Purpose:** Standardized color badge for status display.
2. **Key Logic:** Maps values like `Critical` ➔ crimson, `High` ➔ amber, `Medium` ➔ blue, `Low` / `Healthy` ➔ emerald green.

### `client/src/components/PageHeader.jsx`
1. **Purpose:** Consistent header block across all pages containing title, subtitle, refresh buttons, and primary action CTAs.

### `client/src/components/Pagination.jsx`
1. **Purpose:** Clean numeric pagination bar showing "Showing 1 to 15 of 40 results" with Prev, Next, and direct page number buttons.

### `client/src/components/SearchBar.jsx`
1. **Purpose:** Reusable search input with integrated search icon, clear button, and 300ms debounce timer.

### `client/src/components/Field.jsx`
1. **Purpose:** Form field component standardizing labels, required asterisks, helper text, and Zod error message alerts.

### `client/src/components/Icon.jsx`
1. **Purpose:** Dynamic Lucide icon mapper allowing icons to be specified as string identifiers.

### `client/src/components/ProductCell.jsx` & `ProductThumb.jsx`
1. **Purpose:** Table cell displaying product image thumbnail, name, SKU code, category tag, and clickable link to `/product/:code`.

### `client/src/components/ProductSelect.jsx`
1. **Purpose:** Dropdown select input pre-populated with active catalog products for forms and filter bars.

### `client/src/components/StaleDataBanner.jsx`
1. **Purpose:** Prominent header banner displayed whenever the latest database sale date lags behind today's date, warning users that forecasts reflect historical demo data.

### `client/src/components/WhyPanel.jsx`
1. **Purpose:** Explainable AI side panel explaining *why* a product has a given stockout risk.
2. **Key Logic:** Renders SHAP factor groups (Stock Level, Demand Trend, Volatility, Lead Time, Supplier Delays) as proportional horizontal impact bars (red = raises risk, green = lowers risk).

### `client/src/components/AbcXyzMatrix.jsx`
1. **Purpose:** Interactive 3x3 classification grid (AX, AY, AZ, BX, BY, BZ, CX, CY, CZ).
2. **Key Logic:** Counts products in each cell. Clicking any cell filters the table below to show only products in that category.

### `client/src/components/ForecastChart.jsx`
1. **Purpose:** Recharts multi-horizon demand forecasting visualization.
2. **Key Logic:**
   - Plots 52 weeks of actual weekly units sold as a continuous blue line.
   - Plots 3 weeks of ML forecast as a dashed purple line.
   - Renders a semi-transparent shaded area representing the **80% prediction interval** (Upper Bound vs Lower Bound).

### `client/src/components/HealthChart.jsx`
1. **Purpose:** Horizontal stacked bar chart breaking down the 4 components of the Inventory Health Score: Stock Cover (55%), Risk Buffer (15%), Supplier Reliability (15%), and Demand Stability (15%).

### `client/src/components/AssistantWidget.jsx` & `ChatMessages.jsx`
1. **Purpose:** Floating AI assistant chat drawer accessible on any page.
2. **Key Logic:**
   - Sends questions to `POST /api/assistant`.
   - Formats responses into distinct blocks: **## Facts** (stored system data) and **## Recommendation** (AI advice).
   - Lists the exact database tools invoked under a collapsible "Data used" badge.

---

## 6. Page Screens

### `client/src/pages/Login.jsx`
1. **Purpose:** Authentication portal.
2. **Features:** Email and password fields, login button, error toasts, and one-click demo login buttons for Admin, Manager, and Staff accounts.

### `client/src/pages/Dashboard.jsx`
1. **Purpose:** Executive overview dashboard.
2. **Features:** 4 primary KPI cards (Critical Alerts, At-Risk Products, Average Health, Reorders Needed), health score breakdown, ABC-XYZ matrix, and the "What needs attention today" table.

### `client/src/pages/Alerts.jsx`
1. **Purpose:** Supply chain alert dashboard.
2. **Features:** Lists all active alerts across products sorted by urgency. Categorizes alerts by type (`stockout_before_delivery`, `po_overdue`, `reorder_now`, `overstock`, `supplier_risk`).

### `client/src/pages/SmartReorder.jsx`
1. **Purpose:** Intelligent replenishment workbench.
2. **Features:** Shows current stock, on-order quantities, safety stock, reorder point, and recommended order size. Includes a "Create PO" button that pre-fills the purchase order form. Highlights High-Risk suppliers and suggests reliable alternates.

### `client/src/pages/TrendSeasonality.jsx`
1. **Purpose:** Long-term demand pattern analysis.
2. **Features:** Displays YoY demand changes, t-test statistical significance, seasonal autocorrelation strength, and peak sales months.

### `client/src/pages/SupplierRisk.jsx` & `SupplierDeliveries.jsx`
1. **Purpose:** Vendor performance evaluation.
2. **Features:** Supplier scorecard ranking vendors by reliability score (0-100), on-time delivery rate, average delay days, and defect rates. Clicking a supplier opens `SupplierDeliveries.jsx` with order-by-order history.

### `client/src/pages/ProductInsight.jsx`
1. **Purpose:** 360-degree deep-dive analytics view for a single product.
2. **Features:** Combines `ForecastChart`, `HealthChart`, `WhyPanel` (SHAP explanations), supplier metrics, inventory ledger, and replenishment recommendations on one screen.

### `client/src/pages/Anomalies.jsx`
1. **Purpose:** Machine-learning audit log.
2. **Features:** Displays abnormal sales spikes (e.g. 4.2x normal), unexpected zero-sales days, stock count entry errors (blips), and extreme supplier delays detected by Isolation Forest models.

### `client/src/pages/Simulator.jsx`
1. **Purpose:** Interactive What-If simulation sandbox.
2. **Features:** Sliders for Demand Shock (-50% to +100%), Extra Supplier Delay (+0 to +30 days), Scenario Stock, and New Orders. Compares Before vs After and plots a 30-day day-by-day projected inventory trajectory.

### `client/src/pages/ModelPerformance.jsx`
1. **Purpose:** Model evaluation and data science scorecard.
2. **Features:** Displays held-out test set accuracy for Demand Forecasting (MAE, RMSE, MAPE, WAPE vs Naive baselines), Stockout Risk Classifier (Precision, Recall, F1, ROC-AUC), and Isolation Forest anomaly metrics.

### `client/src/pages/Assistant.jsx`
1. **Purpose:** Dedicated full-screen AI chat workspace with conversation history, suggested prompt chips, and full tool execution inspection.

### CRUD Management Pages
- `ProductList.jsx` & `ProductForm.jsx`: Master product catalog management.
- `InventoryList.jsx` & `InventoryForm.jsx`: Warehouse stock ledger and stock adjustments.
- `SaleList.jsx` & `SaleForm.jsx`: Point-of-sale customer sales logging.
- `SupplierList.jsx` & `SupplierForm.jsx`: Vendor master directory.
- `PurchaseOrderList.jsx` & `PurchaseOrderForm.jsx`: Procurement order tracking and delivery confirmation.
