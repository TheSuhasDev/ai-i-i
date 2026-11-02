# 03b. File-by-File Guide: Server (Express + Mongoose)

This document provides a complete, line-by-line style reference for every file inside the `server/` directory.

---

## 1. Server Root & Configuration

### `server/package.json`
1. **Purpose:** Backend dependency definitions and operational scripts.
2. **Key Dependencies:**
   - `express` (v5.x): Web server framework with modern promise error propagation.
   - `mongoose` (v9.x): Object Data Modeling (ODM) library for MongoDB.
   - `jsonwebtoken`: Signs and validates cryptographic JWT tokens.
   - `bcryptjs`: Password hashing with 10 salt rounds.
   - `zod`: Request payload validation.
   - `cors`, `helmet`, `morgan`: Security headers, CORS control, and request logging.
3. **Scripts:**
   - `npm run dev`: Runs `server/src/index.js` using `nodemon` for auto-restarting on code changes.
   - `npm start`: Production Node.js process launcher.
   - `npm run seed`: Populates MongoDB with demo catalog, sales, suppliers, and purchase orders.
   - `npm test`: Runs Node's built-in test runner (`node --test test/*.test.js`).

### `server/src/index.js`
1. **Purpose:** Application entry point. Boots Express, mounts middleware, defines API route trees, validates startup secrets, and connects to MongoDB.
2. **Imports & Dependencies:**
   - Imports Express, CORS, Helmet, Morgan, and DB connector.
   - Imports route modules: `healthRoutes`, `authRoutes`, `supplierRoutes`, `productRoutes`, `inventoryRoutes`, `saleRoutes`, `purchaseOrderRoutes`, `insightsRoutes`, `supplierRiskRoutes`, `anomalyRoutes`, `simulatorRoutes`, `assistantRoutes`, `mlPerformanceRoutes`.
3. **Key Logic Step-by-Step:**
   - **Lines 24-27:** Mounts security middleware: `helmet()`, `cors({ origin: process.env.CLIENT_URL })`, `express.json({ limit: '1mb' })`, and `morgan('dev')`.
   - **Lines 29-41:** Mounts API routes under the `/api` prefix.
   - **Lines 43-44:** Mounts the 404 handler (`notFound`) followed by the centralized error handler (`errorHandler`).
   - **Lines 47-58:** Startup Security Guard: Checks `JWT_SECRET`. It MUST be at least 32 characters long and cannot be a common placeholder (like `"secret"` or `"changeme"`). If invalid, exits with code 1 immediately.
   - **Lines 60-62:** Calls `connectDB()` and binds to `process.env.PORT || 5000`.

### `server/src/config/db.js`
1. **Purpose:** MongoDB database connection lifecycle manager.
2. **Key Functions:**
   - `connectDB()`: Connects to MongoDB using `mongoose.connect(process.env.MONGODB_URI)`. Listens for connection error events and terminates the process if initial connection fails.

---

## 2. Middleware & Utilities

### `server/src/middleware/auth.js`
1. **Purpose:** JSON Web Token verification and Role-Based Access Control (RBAC).
2. **Key Functions:**
   - `protect(req, res, next)`:
     - Extracts `Bearer <token>` from the HTTP `Authorization` header.
     - Verifies token signature using `jwt.verify(token, process.env.JWT_SECRET)`.
     - Queries MongoDB `User.findById(decoded.id).select("-password")`.
     - Attaches the active user record to `req.user`. If token is missing, expired, or invalid, throws an `AppError(401)`.
   - `authorize(...roles)`:
     - Higher-order middleware checking if `roles.includes(req.user.role)`.
     - If user lacks required role, throws `AppError("Forbidden: insufficient permissions", 403)`.

### `server/src/middleware/errorHandler.js`
1. **Purpose:** Centralized Express exception and error handler.
2. **Key Logic:**
   - Catches all errors forwarded via `next(err)`.
   - Converts Mongoose `ValidationError` into clean HTTP 400 with a list of invalid field names.
   - Converts Mongoose `CastError` (e.g. invalid MongoDB ObjectId) into HTTP 400.
   - Converts MongoDB duplicate key error code `11000` into HTTP 409 Conflict.
   - Converts `JsonWebTokenError` and `TokenExpiredError` into HTTP 401.
   - In production (`NODE_ENV === 'production'`), hides raw internal stack traces and returns generic `500 Internal Server Error` to prevent information disclosure.

### `server/src/middleware/validate.js`
1. **Purpose:** Request body validation using Zod schemas.
2. **Key Functions:**
   - `validate(schema)`: Returns middleware that runs `schema.parse(req.body)`. Zod strips unknown fields automatically, preventing mass assignment attacks.

### `server/src/utils/AppError.js`
1. **Purpose:** Custom Error class carrying HTTP status code and optional details.
2. **Key Logic:** Subclasses JavaScript's native `Error`, assigning `this.statusCode` and `this.isOperational = true`.

### `server/src/utils/asyncHandler.js`
1. **Purpose:** Eliminates repetitive `try/catch` boilerplate across Express route controllers.
2. **Key Logic:** Wraps asynchronous controller functions: `(req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`.

### `server/src/validators/schemas.js`
1. **Purpose:** Centralized Zod validation schemas.
2. **Key Schemas:**
   - `registerSchema`: Email, password (min 6 chars), optional name.
   - `loginSchema`: Email, password.
   - `productSchema`: Name, SKU, category, costPrice, sellingPrice, leadTimeDays.
   - `inventoryUpdateSchema`: Quantity, reason for adjustment.
   - `saleSchema`: Product ID, date, unitsSold, unitPrice.
   - `purchaseOrderSchema`: Product ID, supplier ID, quantity, expectedDeliveryDate.
   - `simulatorSchema`: `product_id`, `demand_pct`, `extra_delay_days`, `stock`, `order_qty`.

---

## 3. Database Models (Mongoose Schemas)

### `server/src/models/User.js`
1. **Purpose:** User account schema.
2. **Fields:**
   - `email`: String, required, unique, lowercase, trimmed.
   - `password`: String, required, bcrypt hashed.
   - `name`: String, optional.
   - `role`: String, enum: `['admin', 'manager', 'staff']`, default: `'staff'`.
3. **Key Methods:**
   - `matchPassword(enteredPassword)`: Compares plaintext input with hashed password using `bcrypt.compare`.

### `server/src/models/Product.js`
1. **Purpose:** Catalog product schema.
2. **Fields:**
   - `code`: String, unique (e.g. `P001`), indexed.
   - `sku`: String, unique (e.g. `SKU-USB-001`).
   - `name`: String, required.
   - `category`: String, enum (`Electronics`, `Accessories`, etc.).
   - `unitCost` & `unitPrice`: Numbers representing procurement cost and selling price.
   - `leadTimeDays`: Expected supplier lead time in calendar days.
   - `primarySupplier`: ObjectId referencing `Supplier`.
   - `isActive`: Boolean flag.

### `server/src/models/Supplier.js`
1. **Purpose:** Vendor directory schema.
2. **Fields:**
   - `code`: String, unique (e.g. `S1`).
   - `name`: Vendor corporate name.
   - `leadTimeDays`: Baseline nominal lead time.
   - `contactEmail`, `phone`, `city`: Vendor metadata.

### `server/src/models/Inventory.js`
1. **Purpose:** Physical warehouse inventory ledger.
2. **Fields:**
   - `product`: ObjectId referencing `Product`, unique index (one record per product).
   - `currentStock`: Current physical units on warehouse shelves.
   - `inTransitQty`: Units currently on order in open purchase orders.
   - `safetyStock`: Computed buffer stock.
   - `lastCountDate`: Date of the latest manual stock count.

### `server/src/models/Sale.js`
1. **Purpose:** Daily sales transaction ledger.
2. **Fields:**
   - `product`: ObjectId referencing `Product`.
   - `date`: Date of transaction.
   - `unitsSold`: Integer count of units sold.
   - `unitPrice`: Selling price at transaction time.
   - `revenue`: Computed total (`unitsSold * unitPrice`).
   - `promoFlag`: Boolean indicating promotional discount day.
3. **Indexes:** Compound unique index on `{ product: 1, date: 1 }` (one aggregated sales row per product per calendar day).

### `server/src/models/PurchaseOrder.js`
1. **Purpose:** Procurement purchase order lifecycle.
2. **Fields:**
   - `poNumber`: Unique order number (e.g. `PO-0395`).
   - `product`: ObjectId referencing `Product`.
   - `supplier`: ObjectId referencing `Supplier`.
   - `status`: Enum (`Pending`, `Approved`, `In Transit`, `Delivered`, `Cancelled`).
   - `orderDate`: Creation timestamp.
   - `expectedDeliveryDate`: Promised delivery date.
   - `actualDeliveryDate`: Timestamp when shipment physically arrived.
   - `qtyOrdered`, `qtyReceived`: Unit counts.
   - `delayDays`: Difference in days between actual and expected delivery (positive = late, negative = early).
   - `qualityIssue`: Boolean flag indicating damaged or defective shipment.
3. **Static Helper `syncInTransit(productId)`:**
   - Aggregates remaining quantities across all open POs for a product and updates `Inventory.inTransitQty` in MongoDB.

### `server/src/models/Insight.js`
1. **Purpose:** Stored cache of ML intelligence calculations per product.
2. **Fields:**
   - `product`: ObjectId referencing `Product`, unique index.
   - `productCode`: String (e.g. `P001`).
   - `priority`: Enum (`Critical`, `High`, `Medium`, `Low`), indexed for fast sorting.
   - `healthScore`: Number (0 to 100), indexed.
   - `healthStatus`: Enum (`Critical`, `Warning`, `Healthy`).
   - `riskPct`: Stockout risk percentage (0 to 100).
   - `orderQty`: Recommended reorder quantity.
   - `daysOfCover`: Days until warehouse stock reaches zero.
   - `marginDays`: Days of cover minus days until shipment delivery.
   - `data`: Complete nested JSON payload containing 3-week forecast, SHAP factors, trend patterns, and alerts.
   - `computedAt`: Timestamp when the ML service calculated this record.

### `server/src/models/AuditLog.js`
1. **Purpose:** Compliance audit trail logging destructive mutations and manual stock adjustments.

---

## 4. Controllers & Services

### `server/src/controllers/authController.js`
1. **Purpose:** Handles user registration, login authentication, and profile lookups.
2. **Key Functions:**
   - `signToken(id, role)`: Generates a signed JWT token containing user ID and role with a 7-day expiration.
   - `register(req, res)`: Hashes password using bcrypt (10 rounds) and creates a user with `role: 'staff'`.
   - `login(req, res)`: Verifies user exists and password matches. Returns identical "Invalid credentials" error for unknown email or wrong password to prevent user enumeration.
   - `getMe(req, res)`: Returns authenticated user's profile (`req.user`).

### `server/src/controllers/crudFactory.js`
1. **Purpose:** Higher-order reusable controller generator creating standardized CRUD operations for Mongoose models.
2. **Key Functions Generated:**
   - `list(Model)`: Supports pagination (`?page=1&limit=15`), regex search, sorting, and field filtering.
   - `getOne(Model)`: Looks up document by MongoDB ID or unique code.
   - `createOne(Model)`: Validates body and inserts document into MongoDB.
   - `updateOne(Model)`: Performs `doc.set(data)` and saves, running Mongoose validators.
   - `deleteOne(Model)`: Deletes document by ID (restricted to Admin role).

### `server/src/controllers/insightsController.js`
1. **Purpose:** Orchestrator linking MongoDB with the Python ML service.
2. **Key Functions:**
   - `computeAndStore(product)`:
     - Calls `syncInTransit(product._id)` to ensure open POs match.
     - Fetches open PO summary (`onOrder` and earliest expected delivery date).
     - Queries current stock from `Inventory`.
     - Calls Python ML endpoint `mlService.insights({ product_id, stock, on_order, expected_delivery_date })`.
     - Upserts calculated results into `Insight` collection.
   - `getInsight(req, res)`: Recomputes live insights for a single product and returns the result.
   - `listInsights(req, res)`: Reads cached insight summaries from MongoDB, sorting most urgent first.
   - `getHistory(req, res)`: Aggregates historical sales into complete Monday-Sunday weekly buckets.
   - `refreshAll(req, res)`: Batch recomputes all 40 products in concurrent batches of 5.
   - `getExplanation(req, res)`: Calls Python `mlService.explain()` to get SHAP factor breakdown.

### `server/src/services/mlService.js`
1. **Purpose:** Centralized HTTP client communicating with Python FastAPI service.
2. **Key Functions:**
   - `call(path, options)`: Wraps native `fetch` with a 20-second timeout (`AbortController`), attaches `X-Service-Token: process.env.ML_SERVICE_TOKEN`, and maps HTTP error status codes cleanly.
   - Methods: `health()`, `forecast()`, `risk()`, `trend()`, `insights()`, `supplierRisk()`, `explain()`, `anomalies()`, `simulate()`, `simulateAll()`, `performance()`.

### `server/src/services/openPurchaseOrders.js`
1. **Purpose:** Calculates accurate open order exposure.
2. **Key Functions:**
   - `summarizeOpenPurchaseOrders(orders)`: Filters active orders (`Pending`, `Approved`, `In Transit`), subtracts partial receipts (`qtyOrdered - qtyReceived`), and identifies the earliest upcoming delivery date.
   - `getOpenPurchaseOrderSummary(productId)`: Executes query against MongoDB `PurchaseOrder`.

### `server/src/services/assistant.js` & `assistantTools.js`
1. **Purpose:** Autonomous AI assistant engine using OpenAI-compatible tool calling.
2. **Key Logic:**
   - `ask(messages)`: Runs an iterative agent loop (up to 6 tool turns):
     - Sends prompt and 10 tool definitions to the LLM.
     - When the LLM requests a tool call (e.g. `get_product_insight`, `simulate_product`, `list_alerts`), `assistantTools.js::runTool()` executes the read-only query against MongoDB or FastAPI.
     - Injects tool results back into the conversation context and requests final answer.
     - Enforces strict response structure: `## Facts` followed by `## Recommendation`.

---

## 5. API Routes

- `server/src/routes/health.js`: `GET /api/health` ➔ Checks database connectivity and returns timestamp.
- `server/src/routes/auth.js`: `POST /register`, `POST /login`, `GET /me`.
- `server/src/routes/crudRouter.js`: Creates standardized routes for resources.
- `server/src/routes/products.js`: `/api/products` CRUD.
- `server/src/routes/suppliers.js`: `/api/suppliers` CRUD.
- `server/src/routes/inventory.js`: `/api/inventory` CRUD.
- `server/src/routes/sales.js`: `/api/sales` CRUD.
- `server/src/routes/purchaseOrders.js`: `/api/purchase-orders` CRUD. Intercepts delivery updates to calculate `delayDays` and increment warehouse inventory. Blocks accidental duplicate open PO creation.
- `server/src/routes/insights.js`: `/api/insights` routes (`GET /`, `GET /:code`, `POST /refresh`, `GET /:code/explain`, `GET /:code/history`).
- `server/src/routes/supplierRisk.js`: `GET /api/supplier-risk` proxying vendor scorecard.
- `server/src/routes/anomalies.js`: `GET /api/anomalies` proxying Isolation Forest results.
- `server/src/routes/simulator.js`: `POST /api/simulator` and `POST /api/simulator/all`.
- `server/src/routes/assistant.js`: `POST /api/assistant` with in-memory per-user rate limiting (20 requests per 10 minutes).
- `server/src/routes/mlPerformance.js`: `GET /api/ml-performance`.

---

## 6. Database Seeding & Maintenance Scripts

### `server/src/seed/seed.js`
1. **Purpose:** Populates fresh MongoDB instance with demo data.
2. **Key Logic:**
   - Clears existing collections.
   - Reads CSV files from `ml-service/data/`.
   - Creates 3 users (`admin`, `manager`, `staff`).
   - Inserts 8 suppliers, 40 products, 40 inventory records, 29,200 sales transactions, and 398 purchase orders.
   - Calculates initial insights cache across all 40 products so the dashboard loads with complete data instantly.

### `server/src/scripts/advanceData.js`
1. **Purpose:** Shifts historical dates in MongoDB forward so demo data aligns with the current calendar day.

---

## 7. Backend Test Suite (`server/test/`)

- `openPurchaseOrders.test.js`: Verifies `summarizeOpenPurchaseOrders` properly excludes `Delivered` and `Cancelled` POs and calculates remaining quantities.
- `receivePurchaseOrder.test.js`: Tests stock replenishment when a purchase order is marked delivered.
- `salesAndPo.test.js`: Validates sales price calculations, revenue fields, and PO creation guards.
- `staleData.test.js`: Tests calculation of `dataAgeDays` against historical timestamps.
- `syncInTransit.test.js`: Verifies that `syncInTransit` correctly updates `Inventory.inTransitQty` in MongoDB.
