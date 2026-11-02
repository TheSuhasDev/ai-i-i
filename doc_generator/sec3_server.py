from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_file_info_table, add_code_block, add_callout
)

def render_section_3_server(doc):
    add_heading_1(doc, "3. File-by-File Documentation")
    add_heading_2(doc, "3.1 Server Tier (Node.js & Express)")
    add_paragraph(doc, 
        "This section documents every source code file within the server tier. For each file, an architectural summary table "
        "specifies the exact file path, technical purpose, internal project dependencies, and dependents, followed by a rigorous, "
        "step-by-step code explanation from top to bottom."
    )

    # 1. server/src/index.js
    add_heading_3(doc, "3.1.1 server/src/index.js")
    add_file_info_table(doc,
        path="server/src/index.js",
        purpose="Application entry point; bootstraps Express server, global security middleware, route mounts, and database connection.",
        deps="config/db.js, middleware/errorHandler.js, routes/* (health, auth, suppliers, products, inventory, sales, purchaseOrders, insights, supplierRisk, anomalies, simulator, assistant, mlPerformance)",
        used_by="npm run dev (via nodemon), npm start (via node)"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Loads runtime configuration from .env via import 'dotenv/config'. Initializes Express application instance.", bold_prefix="1. Environment Initialization: ")
    add_bullet(doc, "Registers helmet() for HTTP security headers, cors() restricted to process.env.CLIENT_URL, express.json({ limit: '1mb' }) to restrict payload size, and morgan('dev') for HTTP request logging.", bold_prefix="2. Global Middleware: ")
    add_bullet(doc, "Mounts 13 API route groups under the /api namespace: /api (health), /api/auth, /api/suppliers, /api/products, /api/inventory, /api/sales, /api/purchase-orders, /api/insights, /api/supplier-risk, /api/anomalies, /api/simulator, /api/assistant, /api/ml-performance.", bold_prefix="3. Router Registration: ")
    add_bullet(doc, "Attaches terminal middleware: notFound catches unregistered endpoints, forwarding AppError('Not Found', 404) to central errorHandler.", bold_prefix="4. Error Handling Pipeline: ")
    add_bullet(doc, "Validates JWT_SECRET security strength at startup: verifies secret length >= 32 characters and rejects known trivial placeholders ('secret', 'changeme', 'your_jwt_secret', 'change_me_to_a_long_random_string'). Exits with code 1 if check fails.", bold_prefix="5. Security Assertion: ")
    add_bullet(doc, "Invokes connectDB(). Upon resolution, binds HTTP listener to PORT (default 5000) and logs server readiness.", bold_prefix="6. Database & Listener: ")
    add_code_block(doc, 
        "if (jwtSecret.length < 32 || knownJwtPlaceholders.has(jwtSecret.toLowerCase())) {\n"
        "  console.error('JWT_SECRET must be at least 32 characters and must not be a known placeholder');\n"
        "  process.exit(1);\n"
        "}\n"
        "connectDB().then(() => {\n"
        "  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));\n"
        "});",
        caption="Startup JWT Strength Validation and Listener Bootstrap"
    )

    # 2. server/src/config/db.js
    add_heading_3(doc, "3.1.2 server/src/config/db.js")
    add_file_info_table(doc,
        path="server/src/config/db.js",
        purpose="Manages asynchronous MongoDB connection lifecycle and handles startup connection failures.",
        deps="mongoose",
        used_by="server/src/index.js"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "connectDB(): Asynchronous export. Reads process.env.MONGO_URI and calls mongoose.connect(process.env.MONGO_URI).", bold_prefix="1. Connection: ")
    add_bullet(doc, "On success, logs the connected host: console.log(`MongoDB connected: ${conn.connection.host}`).", bold_prefix="2. Success Log: ")
    add_bullet(doc, "On error, catches exception, logs failure message: console.error('MongoDB connection error:', err), and terminates node process immediately with process.exit(1).", bold_prefix="3. Failure Guard: ")

    # 3. server/src/controllers/authController.js
    add_heading_3(doc, "3.1.3 server/src/controllers/authController.js")
    add_file_info_table(doc,
        path="server/src/controllers/authController.js",
        purpose="Implements authentication controllers: user registration, credential verification, JWT issuance, and profile retrieval.",
        deps="models/User.js, utils/AppError.js, bcryptjs, jsonwebtoken",
        used_by="server/src/routes/auth.js"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "signToken(user): Helper function. Invokes jwt.sign with claims { id: user._id, role: user.role }, secret process.env.JWT_SECRET, and options { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }.", bold_prefix="1. Token Signer: ")
    add_bullet(doc, "register(req, res): POST /api/auth/register handler. Extracts { name, email, password } from req.body. Hashes password using bcrypt.hash(password, 10). Persists new User with role strictly forced to 'staff' (public self-registration cannot create admin/manager). Responds 201 with JWT token and user profile object.", bold_prefix="2. Register Action: ")
    add_bullet(doc, "login(req, res): POST /api/auth/login handler. Extracts email and password. Executes User.findOne({ email }).select('+password'). If user does not exist or !(await bcrypt.compare(password, user.password)), throws AppError('Invalid email or password', 401). Responds 200 with JWT and user object.", bold_prefix="3. Login Action: ")
    add_bullet(doc, "me(req, res): GET /api/auth/me handler. Reads req.user (populated by protect middleware) and returns { success: true, data: req.user }.", bold_prefix="4. Profile Action: ")

    # 4. server/src/controllers/crudFactory.js
    add_heading_3(doc, "3.1.4 server/src/controllers/crudFactory.js")
    add_file_info_table(doc,
        path="server/src/controllers/crudFactory.js",
        purpose="Higher-order factory generating reusable RESTful CRUD controller handlers with search, filtering, sorting, and pagination.",
        deps="utils/AppError.js",
        used_by="routes/suppliers.js, routes/products.js, routes/inventory.js, routes/sales.js, routes/purchaseOrders.js"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "escapeRegex(str): Escapes regex special characters ([-[\\]{}()*+?.,\\\\^$|#\\s]) to prevent ReDoS injection attacks in MongoDB queries.", bold_prefix="1. Regex Sanitizer: ")
    add_bullet(doc, "makeCrud(Model, options): Returns an object containing 5 route handler functions: list, getOne, create, update, remove.", bold_prefix="2. Factory Dispatcher: ")
    add_bullet(doc, "list(req, res): Parses page (default 1), limit (default 20, max 200), sort (validated against /^[a-zA-Z0-9_,-]+$/), search text, and resource-specific filter fields. Executes Model.countDocuments(filter) and Model.find(filter).skip(...).limit(...).populate(...).lean(). Returns paginated response with total, pages, and data array.", bold_prefix="3. List Handler: ")
    add_bullet(doc, "getOne(req, res): Finds document by req.params.id with populate. If null, throws AppError(404).", bold_prefix="4. GetOne Handler: ")
    add_bullet(doc, "create(req, res): Instantiates new Model(req.body) and saves. Responds 201 with created record.", bold_prefix="5. Create Handler: ")
    add_bullet(doc, "update(req, res): Finds document by id, applies updates via doc.set(req.body), saves, and returns 200.", bold_prefix="6. Update Handler: ")
    add_bullet(doc, "remove(req, res): Finds document by id, invokes doc.deleteOne(), and responds with { success: true, data: {} }.", bold_prefix="7. Delete Handler: ")

    # 5. server/src/controllers/insightsController.js
    add_heading_3(doc, "3.1.5 server/src/controllers/insightsController.js")
    add_file_info_table(doc,
        path="server/src/controllers/insightsController.js",
        purpose="Core orchestration controller: bridges MongoDB live stock and open POs with Python ML microservice, storing and querying insights.",
        deps="models/Product.js, models/Inventory.js, models/Insight.js, models/Sale.js, services/mlService.js, services/openPurchaseOrders.js, utils/AppError.js",
        used_by="server/src/routes/insights.js"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "computeAndStore(product): Core reconciliation routine. Fetches live shelf stock from Inventory. Queries open POs via getOpenPurchaseOrderSummary(product._id). Assembles payload { product_id: product.code, stock, on_order, expected_delivery_date }. Dispatches POST /insights to ML service. Upserts response into Insight collection via findOneAndUpdate({ product: product._id }, ..., { upsert: true, returnDocument: 'after' }).", bold_prefix="1. computeAndStore(): ")
    add_bullet(doc, "getInsight(req, res): GET /api/insights/:code handler. Finds product by uppercase code, executes computeAndStore, and returns fresh payload.", bold_prefix="2. getInsight(): ")
    add_bullet(doc, "listInsights(req, res): GET /api/insights?priority=&status=&full=1 handler. Reads stored summaries. If full != '1', projects lightweight summary fields. Sorts in memory: Critical (0) > High (1) > Medium (2) > Low (3), sub-sorted by lowest healthScore.", bold_prefix="3. listInsights(): ")
    add_bullet(doc, "getHistory(req, res): GET /api/insights/:code/history?weeks=52 handler. Aggregates complete Monday-Sunday sales weeks using MongoDB $isoWeekYear and $isoWeek. Filters out partial weeks (days === 7) matching ML data alignment.", bold_prefix="4. getHistory(): ")
    add_bullet(doc, "refreshAll(req, res): POST /api/insights/refresh handler (admin/manager). Fetches all active products and processes computeAndStore in concurrent batches of 5 using Promise.allSettled(). Returns total, ok, and failed list.", bold_prefix="5. refreshAll(): ")
    add_bullet(doc, "getExplanation(req, res): GET /api/insights/:code/explain handler. Fetches current stock and forwards { product_id, stock } to mlService.explain(). Returns risk factors and plain-language attribution.", bold_prefix="6. getExplanation(): ")

    # 6. server/src/middleware/auth.js
    add_heading_3(doc, "3.1.6 server/src/middleware/auth.js")
    add_file_info_table(doc,
        path="server/src/middleware/auth.js",
        purpose="Authentication and authorization middleware verifying Bearer JWTs and enforcing role-based permissions.",
        deps="models/User.js, utils/AppError.js, utils/asyncHandler.js, jsonwebtoken",
        used_by="server/src/routes/*"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "protect: Express middleware wrapped in asyncHandler. Checks req.headers.authorization for 'Bearer <token>'. Extracts token and verifies using jwt.verify(token, process.env.JWT_SECRET). Queries User.findById(decoded.id). If user does not exist, throws AppError(401). Attaches user document to req.user and proceeds via next().", bold_prefix="1. protect(): ")
    add_bullet(doc, "authorize(...roles): Curried middleware returning (req, res, next). Compares req.user.role against permitted roles. If !roles.includes(req.user.role), throws AppError('Not authorized for this action', 403).", bold_prefix="2. authorize(): ")

    # 7. server/src/middleware/errorHandler.js
    add_heading_3(doc, "3.1.7 server/src/middleware/errorHandler.js")
    add_file_info_table(doc,
        path="server/src/middleware/errorHandler.js",
        purpose="Global centralized error handler mapping Mongoose, Zod, and JWT exceptions to standardized JSON error responses.",
        deps="utils/AppError.js",
        used_by="server/src/index.js"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "notFound(req, res, next): Terminal route catcher. Creates new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404) and forwards to next().", bold_prefix="1. notFound(): ")
    add_bullet(doc, "errorHandler(err, req, res, next): Central error responder. Maps specific error types to HTTP statuses: CastError (400, 'Invalid ID format'), Mongo duplicate key 11000 (409, 'Duplicate field value'), ValidationError (400 with field messages), JsonWebTokenError (401, 'Invalid token'), TokenExpiredError (401, 'Token expired'), SyntaxError in JSON body (400, 'Malformed JSON').", bold_prefix="2. Error Mapping: ")
    add_bullet(doc, "Production security policy: In production, 500 internal errors hide system details, returning generic 'Internal server error'. In non-production, includes err.stack.", bold_prefix="3. Stack Sanitization: ")

    # 8. server/src/middleware/validate.js
    add_heading_3(doc, "3.1.8 server/src/middleware/validate.js")
    add_file_info_table(doc,
        path="server/src/middleware/validate.js",
        purpose="Request body validation middleware enforcing Zod schemas and stripping unknown properties.",
        deps="utils/AppError.js",
        used_by="server/src/routes/*"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "validate(schema): Curried middleware function taking a Zod schema. Executes schema.safeParse(req.body).", bold_prefix="1. safeParse Execution: ")
    add_bullet(doc, "If result.success is false, formats issues into { field: issue.path.join('.'), message: issue.message } and throws AppError('Validation failed', 400, formattedErrors).", bold_prefix="2. Error Formatting: ")
    add_bullet(doc, "If successful, assigns stripped, type-coerced data back: req.body = result.data (blocking unvalidated mass-assignment parameters) and calls next().", bold_prefix="3. Sanitized Replacement: ")

    # 9-15: Models
    add_heading_3(doc, "3.1.9 Mongoose Data Models (server/src/models/*)")
    add_paragraph(doc, "The server defines 7 Mongoose schemas in server/src/models/:")
    add_bullet(doc, "server/src/models/User.js: Defines User schema: name (String), email (String, unique, lowercase), password (String, select: false), role (enum: 'admin', 'manager', 'staff', default 'staff'). Timestamps enabled.", bold_prefix="User Model: ")
    add_bullet(doc, "server/src/models/Supplier.js: Defines Supplier schema: code (String, unique, S1..S8), name (String), contactEmail (String), city (String). Timestamps enabled.", bold_prefix="Supplier Model: ")
    add_bullet(doc, "server/src/models/Product.js: Defines Product schema: code (String, unique, P001..P040), sku (String, unique), name (String), imageUrl (String), category (String, indexed), price (Number, min 0), cost (Number, min 0), leadTimeDays (Number, min 1), suppliers (ObjectId array ref Supplier), isActive (Boolean, default true). Timestamps enabled.", bold_prefix="Product Model: ")
    add_bullet(doc, "server/src/models/Inventory.js: Defines Inventory schema: product (ObjectId ref Product, unique), currentStock (Number, min 0), inTransitQty (Number, default 0), snapshotDate (Date). Timestamps enabled.", bold_prefix="Inventory Model: ")
    add_bullet(doc, "server/src/models/Sale.js: Defines Sale schema: product (ObjectId ref Product), date (Date), unitsSold (Number, min 0), unitPrice (Number, min 0), revenue (Number, min 0), promoFlag (Boolean, default false). Unique compound index on { product: 1, date: 1 }.", bold_prefix="Sale Model: ")
    add_bullet(doc, "server/src/models/PurchaseOrder.js: Defines PurchaseOrder schema: poNumber (String, unique), product (ObjectId ref Product, indexed), supplier (ObjectId ref Supplier, indexed), orderDate (Date), expectedDeliveryDate (Date), actualDeliveryDate (Date), delayDays (Number), qtyOrdered (Number, min 1), qtyReceived (Number, default 0), unitCost (Number, min 0), qualityIssue (Boolean, default false), status (enum: 'Pending', 'In Transit', 'Delivered', 'Cancelled', default 'Pending'). Timestamps enabled.", bold_prefix="PurchaseOrder Model: ")
    add_bullet(doc, "server/src/models/Insight.js: Defines Insight schema: product (ObjectId ref Product, unique), productCode (String, indexed), asOf (Date), priority (enum: 'Critical', 'High', 'Medium', 'Low', indexed), healthScore (Number), healthStatus (enum: 'Critical', 'Warning', 'Healthy', indexed), riskPct (Number), orderQty (Number), daysOfCover (Number), marginDays (Number), data (Mixed payload containing complete ML response), computedAt (Date). Timestamps enabled.", bold_prefix="Insight Model: ")

    # 16-29: Routes
    add_heading_3(doc, "3.1.10 Express Routers (server/src/routes/*)")
    add_paragraph(doc, "The server exposes 13 modular Express routers mounted in server/src/index.js:")
    add_bullet(doc, "server/src/routes/health.js: Exposes GET /api/health (public). Probes mongoose.connection.readyState (1 = connected). Returns status: 'ok' or 'degraded', database state, and uptime.", bold_prefix="health.js: ")
    add_bullet(doc, "server/src/routes/auth.js: Exposes POST /register (validate(registerSchema)), POST /login (validate(loginSchema)), and GET /me (protect).", bold_prefix="auth.js: ")
    add_bullet(doc, "server/src/routes/crudRouter.js: Helper factory function crudRouter(crud, options). Maps CRUD handlers to Router instance. Configures default permissions: GET (protect), POST/PUT (protect + authorize('admin', 'manager')), DELETE (protect + authorize('admin')). Supports schema validation overrides.", bold_prefix="crudRouter.js: ")
    add_bullet(doc, "server/src/routes/suppliers.js: Configures CRUD for Supplier model with search fields ['name', 'code', 'city']. Validates with supplierCreate/Update.", bold_prefix="suppliers.js: ")
    add_bullet(doc, "server/src/routes/products.js: Configures CRUD for Product model with search ['name', 'code', 'sku'], filters ['category', 'isActive', 'supplier'], and populates ['suppliers']. Validates with productCreate/Update.", bold_prefix="products.js: ")
    add_bullet(doc, "server/src/routes/inventory.js: Configures CRUD for Inventory model. Grants special permission allowing staff to update stock counts: router.put('/:id', protect, authorize('admin', 'manager', 'staff'), validate(inventoryUpdate), crud.update).", bold_prefix="inventory.js: ")
    add_bullet(doc, "server/src/routes/sales.js: Configures CRUD for Sale model. Grants staff permission to record sales: router.post('/', protect, authorize('admin', 'manager', 'staff'), validate(saleCreate), crud.create). Automatically computes revenue = unitsSold * unitPrice if not provided.", bold_prefix="sales.js: ")
    add_bullet(doc, "server/src/routes/purchaseOrders.js: Configures CRUD for PurchaseOrder model. Overrides POST / and PUT /:id: if actualDeliveryDate is provided, automatically computes delayDays = (actual - expected) in days and sets status = 'Delivered'.", bold_prefix="purchaseOrders.js: ")
    add_bullet(doc, "server/src/routes/insights.js: Mounts analytics endpoints: GET / (listInsights, protect), GET /:code (getInsight, protect), GET /:code/history (getHistory, protect), POST /refresh (refreshAll, protect + authorize('admin', 'manager')), GET /:code/explain (getExplanation, protect).", bold_prefix="insights.js: ")
    add_bullet(doc, "server/src/routes/supplierRisk.js: Exposes GET / (protect) forwarding directly to mlService.supplierRisk().", bold_prefix="supplierRisk.js: ")
    add_bullet(doc, "server/src/routes/anomalies.js: Exposes GET / (protect) accepting query params { days, product_id, limit, kind }, forwarding to mlService.anomalies(req.query).", bold_prefix="anomalies.js: ")
    add_bullet(doc, "server/src/routes/simulator.js: Exposes POST / (protect, validate(simulatorSchema)). Reads live MongoDB stock and open POs for the product, merging with scenario adjustments (demand_change_pct, extra_supplier_delay_days, stock, order_qty) before forwarding to mlService.simulate(). Exposes POST /all (protect) forwarding to mlService.simulateAll().", bold_prefix="simulator.js: ")
    add_bullet(doc, "server/src/routes/assistant.js: Exposes POST / (protect) and GET /status (protect). Enforces in-memory rate limiting (20 requests per 10 minutes per user). Validates message structure with Zod. Dispatches conversation to assistant.js.", bold_prefix="assistant.js: ")
    add_bullet(doc, "server/src/routes/mlPerformance.js: Exposes GET / (protect) forwarding to mlService.performance().", bold_prefix="mlPerformance.js: ")

    # 30: seed
    add_heading_3(doc, "3.1.11 server/src/seed/seed.js")
    add_file_info_table(doc,
        path="server/src/seed/seed.js",
        purpose="Database migration script reading CSV datasets from ml-service/data and seeding MongoDB collections.",
        deps="models/*, csv-parse/sync, bcryptjs, mongoose",
        used_by="npm run seed (package.json script)"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Parses 6 CSV files from ml-service/data: suppliers.csv, products.csv, inventory_snapshot.csv, sales.csv, purchase_orders.csv.", bold_prefix="1. CSV Parsing: ")
    add_bullet(doc, "Generates ObjectIds and cross-references foreign keys: resolves supplier_ids into ObjectId arrays on Product; resolves product_id and supplier_id on PurchaseOrder, Inventory, and Sale.", bold_prefix="2. Foreign Key Linking: ")
    add_bullet(doc, "Creates 3 demo users with bcrypt 10-round hashed passwords: Admin User (admin@inventory.com / Admin@123), Inventory Manager (manager@inventory.com / Manager@123), Warehouse Staff (staff@inventory.com / Staff@123).", bold_prefix="3. Demo User Setup: ")
    add_bullet(doc, "Supports DRY_RUN=1 mode to validate CSV structures and foreign key mapping without touching database.", bold_prefix="4. Dry-Run Check: ")
    add_bullet(doc, "Connects to MONGO_URI, wipes existing collections (deleteMany({})), inserts users, suppliers, products, inventory, purchase orders, and batch-inserts 29,200 sales records in chunks of 5,000 via insertBatches(Sale, sales).", bold_prefix="5. Batch Insertion: ")

    # 31-34: Services
    add_heading_3(doc, "3.1.12 Server Services (server/src/services/*)")
    add_paragraph(doc, "Four foundational service modules provide business logic and external integrations:")
    
    add_bullet(doc, "server/src/services/mlService.js: Central HTTP client wrapping native fetch(). Adds X-Service-Token: process.env.ML_SERVICE_TOKEN on every call. Implements 20-second AbortController timeout (90s for simulateAll). Translates HTTP 404, 422, 503 errors and maps unhandled exceptions to AppError(502 / 503). Exposes methods: health, forecast, risk, trend, insights, supplierRisk, explain, anomalies, simulate, simulateAll, performance.", bold_prefix="mlService.js: ")
    add_bullet(doc, "server/src/services/openPurchaseOrders.js: Reconciles open PO positions. summarizeOpenPurchaseOrders(orders): Filters orders with status in ['Pending', 'In Transit']. Computes remaining quantity = max(qtyOrdered - qtyReceived, 0). Sums remaining qty into onOrder. Finds the earliest expectedDeliveryDate among active orders. getOpenPurchaseOrderSummary(productId): Queries MongoDB PurchaseOrder collection and calls summarizeOpenPurchaseOrders.", bold_prefix="openPurchaseOrders.js: ")
    add_bullet(doc, "server/src/services/assistant.js: LLM conversational orchestrator. Defines SYSTEM_PROMPT instructing model that it is inside an inventory intelligence system, forcing strict output separation into '## Facts' (verifiable tool data) and '## Recommendation' (proactive operational advice). ask(history): Executes OpenAI-compatible chat completion loop against LLM_BASE_URL. Translates toolDefinitions into OpenAI function signatures. Executes tool calls via runTool() in assistantTools.js, feeds responses back into history, and iterates up to 20 turns with 1200 max tokens.", bold_prefix="assistant.js: ")
    add_bullet(doc, "server/src/services/assistantTools.js: Defines 10 read-only inspection tools: search_products, list_reorder_recommendations, get_product_insight, explain_stockout_risk, list_alerts, get_supplier_risk, list_overstocked, simulate_product, simulate_all, get_model_performance. Validates parameters with Zod. Executes queries deterministically against Mongoose models and mlService. Enforces LLM_MAX_RESULT_CHARS (default 7,000) on stringified outputs to prevent context window exhaustion.", bold_prefix="assistantTools.js: ")

    # 35-38: Utils & Validators & Tests
    add_heading_3(doc, "3.1.13 Utilities, Validators & Tests")
    add_bullet(doc, "server/src/utils/AppError.js: Extends native Error class. Constructor accepts (message, statusCode = 500, details = null). Assigns this.statusCode, this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error', and this.isOperational = true. Captures stack trace via Error.captureStackTrace.", bold_prefix="AppError.js: ")
    add_bullet(doc, "server/src/utils/asyncHandler.js: Single-line higher-order utility: export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next). Eliminates boilerplate try-catch blocks across route handlers.", bold_prefix="asyncHandler.js: ")
    add_bullet(doc, "server/src/validators/schemas.js: Strict Zod schemas: registerSchema, loginSchema, supplierCreate/Update, productCreate/Update, inventoryCreate/Update, saleCreate/Update, poCreate/Update, simulatorSchema, assistantMessageSchema. Strips unknown parameters by default.", bold_prefix="schemas.js: ")
    add_bullet(doc, "server/test/openPurchaseOrders.test.js: Node.js native test runner test suite (node --test). Asserts that summarizeOpenPurchaseOrders() correctly aggregates Pending and In Transit remaining quantities (qtyOrdered - qtyReceived), excludes Delivered and Cancelled orders, and selects the earliest expected delivery date.", bold_prefix="openPurchaseOrders.test.js: ")
