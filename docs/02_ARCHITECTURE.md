# 02. System Architecture & Service Communication

---

## 1. Big-Picture Architecture Diagram

The system operates as three decoupled services communicating over HTTP:

```mermaid
graph TD
    subgraph Browser ["Client Web Browser"]
        User["User / Manager"]
        ReactApp["React 19 SPA (Vite)<br/>Port 5173"]
    end

    subgraph NodeServer ["Backend Server (Node.js / Express 5)"]
        Express["Express API Server<br/>Port 5000"]
        AuthMiddleware["JWT Auth Guard"]
        ZodValidator["Zod Schema Validator"]
        CRUD["CRUD Controller Factory"]
        InsightsController["Insights Controller"]
        AssistantService["AI Assistant Agent"]
    end

    subgraph Mongo ["Operational Database"]
        MongoDB[("MongoDB<br/>Port 27017")]
    end

    subgraph PythonML ["Machine Learning Service (Python / FastAPI)"]
        FastAPI["FastAPI Web Server<br/>Port 8000"]
        TokenAuth["X-Service-Token Guard"]
        ForecastEngine["Forecasting Engine<br/>(HistGradientBoosting)"]
        RiskEngine["Stockout Risk Classifier<br/>(Random Forest + Platt Scaling)"]
        DecisionEngine["Decision & Rules Engine<br/>(Safety Stock, Reorder, ABC-XYZ)"]
        AnomalyEngine["Isolation Forest Engine<br/>(Sales Spikes, Stock Mismatches)"]
        SimulatorEngine["What-If Simulation Engine<br/>(30-Day Day-by-Day Projection)"]
        ExplainEngine["SHAP Explainability Engine<br/>(TreeExplainer)"]
    end

    User -->|Interacts with UI| ReactApp
    ReactApp -->|REST API Requests<br/>Authorization: Bearer JWT| Express

    Express --> AuthMiddleware
    AuthMiddleware --> ZodValidator
    ZodValidator --> CRUD
    ZodValidator --> InsightsController
    ZodValidator --> AssistantService

    CRUD <-->|Read / Write Operational Data| MongoDB
    InsightsController <-->|Sync Open POs & Stock| MongoDB
    InsightsController -->|Internal HTTP Call<br/>X-Service-Token| FastAPI

    FastAPI --> TokenAuth
    TokenAuth --> ForecastEngine
    TokenAuth --> RiskEngine
    TokenAuth --> DecisionEngine
    TokenAuth --> AnomalyEngine
    TokenAuth --> SimulatorEngine
    TokenAuth --> ExplainEngine

    AssistantService -->|Tool Calls| MongoDB
    AssistantService -->|Tool Calls| FastAPI
```

---

## 2. How the 3 Services Talk

### 2.1. Service Overview Table

| Service | Technology | Port | Default Local URL | Primary Responsibility |
|---|---|---|---|---|
| **Client** | React 19, Vite | `5173` | `http://localhost:5173` | User interface, charts, tables, form input, local state management |
| **Server** | Node.js, Express 5 | `5000` | `http://localhost:5000` | Authentication, RBAC, business validation, MongoDB persistence, orchestration |
| **ML Service** | Python, FastAPI | `8000` | `http://localhost:8000` | Statistical calculations, machine learning inference, SHAP explanations |
| **Database** | MongoDB | `27017` | `mongodb://localhost:27017/inventory_db` | Persistent operational storage for users, catalog, stock, sales, and POs |

---

### 2.2. Environment Variables & Cross-Service Configuration

Each service isolates its secrets and URLs inside an `.env` file:

```
┌─────────────────────────────────┐
│          client/.env            │
│  VITE_API_URL=                  │
│  http://localhost:5000/api      │
└───────────────┬─────────────────┘
                │ Sends HTTP Requests to
                ▼
┌─────────────────────────────────┐
│          server/.env            │
│  PORT=5000                      │
│  CLIENT_URL=                    │
│  http://localhost:5173          │
│  MONGODB_URI=mongodb://...      │
│  JWT_SECRET=super_secret_32_chr │
│  ML_SERVICE_URL=                │
│  http://localhost:8000          │
│  ML_SERVICE_TOKEN=token_123     │
│  LLM_API_KEY=groq_or_gemini_key │
└───────────────┬─────────────────┘
                │ Sends Internal Requests to
                ▼
┌─────────────────────────────────┐
│        ml-service/.env          │
│  PORT=8000                      │
│  CLIENT_URL=                    │
│  http://localhost:5173          │
│  SERVER_URL=                    │
│  http://localhost:5000          │
│  ML_SERVICE_TOKEN=token_123     │
└─────────────────────────────────┘
```

#### Detailed Environment Variable Reference:

1. **`client/.env`**:
   - `VITE_API_URL`: Points to the Express backend (`http://localhost:5000/api`). Axios prepends this to all outgoing network calls.
2. **`server/.env`**:
   - `PORT`: The port Express listens on (default `5000`).
   - `CLIENT_URL`: The allowed origin for CORS (`http://localhost:5173`).
   - `MONGODB_URI`: Connection string for MongoDB (`mongodb://127.0.0.1:27017/inventory_intelligence`).
   - `JWT_SECRET`: High-entropy secret key (at least 32 characters) used to sign and verify JSON Web Tokens.
   - `JWT_EXPIRES_IN`: Token lifespan (default `7d`).
   - `ML_SERVICE_URL`: The URL where the Python FastAPI service is reachable (`http://localhost:8000`).
   - `ML_SERVICE_TOKEN`: Secret pre-shared key passed in the `X-Service-Token` header to authenticate internal calls to FastAPI.
   - `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`: Credentials for the OpenAI-compatible AI assistant provider (e.g. Groq, Google Gemini, OpenRouter).
3. **`ml-service/.env`**:
   - `PORT`: Port FastAPI listens on (default `8000`).
   - `CLIENT_URL` & `SERVER_URL`: Origins allowed by FastAPI's CORS middleware.
   - `ML_SERVICE_TOKEN`: Matches the server's token to verify that callers are authorized.

---

### 2.3. Cross-Origin Resource Sharing (CORS) & Security Handshake

#### Client to Server (Port 5173 ➔ Port 5000)
When the browser loads `http://localhost:5173` and makes an API call to `http://localhost:5000/api/products`, the browser enforces CORS rules:
- In `server/src/index.js`, Express mounts the CORS middleware:
  ```javascript
  app.use(cors({ origin: process.env.CLIENT_URL }));
  ```
- If a browser at `http://localhost:5173` makes a request, Express returns headers:
  `Access-Control-Allow-Origin: http://localhost:5173`
- If the user is logged in, Axios attaches the token:
  `Authorization: Bearer eyJhbGciOiJIUzI1Ni...`
- The Express middleware `server/src/middleware/auth.js` intercepts the request, verifies the token signature using `JWT_SECRET`, looks up the user in MongoDB, and attaches `req.user` to the request.

#### Server to Python ML Service (Port 5000 ➔ Port 8000)
Direct server-to-server calls do NOT go through the browser, so browser CORS does not apply. However, for security, the ML service protects all data endpoints using a **Pre-Shared Service Token**:
- In `server/src/services/mlService.js`, every fetch request injects an HTTP header:
  ```javascript
  headers: {
    "Content-Type": "application/json",
    "X-Service-Token": process.env.ML_SERVICE_TOKEN,
  }
  ```
- In `ml-service/app/main.py`, FastAPI enforces this dependency across all analytics routers:
  ```python
  def require_service_token(x_service_token: str = Header(..., alias="X-Service-Token")):
      if not secrets.compare_digest(x_service_token, os.getenv("ML_SERVICE_TOKEN")):
          raise HTTPException(status_code=401, detail="Invalid service token")
  ```
- If the token is missing or incorrect, FastAPI halts the request with `401 Unauthorized`. If the ML service is down, Express catches the error and cleanly returns `503 Service Unavailable` with a user-friendly message rather than crashing.

---

## 3. Full Request Lifecycle: "User Opens Dashboard"

Let us trace exactly what happens when an inventory manager opens their browser to `http://localhost:5173/`:

```mermaid
sequenceDiagram
    autonumber
    actor User as Inventory Manager
    participant Browser as React Client (Dashboard.jsx)
    participant Axios as Axios Client (api.js)
    participant Express as Express Server (index.js)
    participant Auth as Auth Middleware (auth.js)
    participant Ctrl as insightsController.js
    participant DB as MongoDB (Insight & Sale collections)
    participant PyClient as mlService.js (Node fetch)
    participant FastAPI as Python ML (routes_insights.py)
    participant Engines as ML Engines (Forecast, Risk, Health)

    User->>Browser: Navigates to / (Dashboard)
    Browser->>Axios: Call services.insights.list({ full: "0" })
    Axios->>Express: GET /api/insights (with Bearer JWT)
    Express->>Auth: Verify JWT signature & expiration
    Auth-->>Express: req.user = { id: "...", role: "manager" }
    Express->>Ctrl: listInsights(req, res)
    Ctrl->>DB: Insight.find().select("productCode priority healthScore ...")
    Ctrl->>DB: Sale.findOne().sort({ date: -1 }) (check latest sale date)
    DB-->>Ctrl: Return 40 cached product insight records
    Ctrl-->>Axios: 200 OK { success: true, count: 40, data: [...] }
    Axios-->>Browser: State updated via setInsights(res.data)
    Browser->>User: Renders KPI Metric Cards, Health Chart & Urgent Table

    opt If User Clicks "Refresh Insights" (Admin / Manager)
        Browser->>Axios: POST /api/insights/refresh
        Axios->>Express: POST /api/insights/refresh
        Express->>Ctrl: refreshAll(req, res)
        loop In batches of 5 products
            Ctrl->>DB: Query current stock from Inventory & open POs from PurchaseOrder
            Ctrl->>PyClient: mlService.insights({ product_id: "P001", stock: 40, on_order: 85 })
            PyClient->>FastAPI: POST /insights (X-Service-Token)
            FastAPI->>Engines: Compute Forecast, Risk, Reorder, Health, Alerts
            Engines-->>FastAPI: Combined JSON result
            FastAPI-->>PyClient: 200 OK
            PyClient-->>Ctrl: Returns live computation
            Ctrl->>DB: Insight.findOneAndUpdate({ product: id }, doc, { upsert: true })
        end
        Ctrl-->>Browser: 200 OK { total: 40, ok: 40, failed: [] }
        Browser->>User: Dashboard refreshes with fresh calculations!
    end
```

### Step-by-Step Code Walkthrough:

1. **Client URL Mount:** The browser router in `client/src/App.jsx` matches the path `/` and renders `client/src/pages/Dashboard.jsx` wrapped inside `Layout.jsx` and `ProtectedRoute.jsx`.
2. **Token Verification:** `ProtectedRoute.jsx` checks `useAuth()`. The token exists in `localStorage`, so access is granted.
3. **Data Fetching:** Inside `Dashboard.jsx`, a `useEffect` hook fires:
   ```javascript
   insightsService.list().then(res => setInsights(res.data.data));
   ```
4. **Network Interceptor:** `client/src/services/api.js` intercepts the request and injects the header `Authorization: Bearer <token>`.
5. **Express Routing:** The request hits `server/src/index.js`, which routes `/api/insights` to `server/src/routes/insights.js`.
6. **Authentication Middleware:** `server/src/middleware/auth.js::protect` decodes the token, finds the user in MongoDB, and attaches `req.user`.
7. **Controller Execution:** `server/src/controllers/insightsController.js::listInsights` executes:
   - Queries the `Insight` MongoDB collection for pre-computed summaries (avoiding heavy recalculation on every page load).
   - Queries the latest `Sale` document to determine data freshness (`liveDataDate`).
   - Sorts the results so `Critical` and lowest health score items appear at the very top.
8. **JSON Response:** Express responds with HTTP 200 and the JSON array of products.
9. **UI Render:** React receives the payload:
   - Aggregates KPIs: Counts total alerts, critical stockouts, and products needing reorder.
   - Renders `MetricCard` components across the top.
   - Feeds health score distributions into `HealthChart.jsx` (Recharts).
   - Renders `AbcXyzMatrix.jsx` (3x3 classification grid).
   - Populates the "What needs attention today" table with direct action buttons.

---

## 4. How to Run the Project (Step-by-Step Runbook)

To run the entire system locally, you need three terminal windows:

### Terminal 1: Python Machine Learning Service
```powershell
# 1. Navigate to the ML service folder
cd ml-service

# 2. Activate Python virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
# (On macOS/Linux, run: source .venv/bin/activate)

# 3. Verify packages are installed
pip install -r requirements.txt

# 4. (Optional) Run automated test suite
pytest

# 5. Start the FastAPI server with hot-reloading on Port 8000
uvicorn app.main:app --reload --port 8000
```
- **What this does:** Starts the Uvicorn ASGI server. It loads the pre-trained `.joblib` models from `ml-service/models/` into memory and listens for requests from Express on `http://localhost:8000`.

---

### Terminal 2: Node.js Express Backend Server
```powershell
# 1. Navigate to the server folder
cd server

# 2. Install dependencies (if not already installed)
npm install

# 3. (First time only) Seed the MongoDB database with demo data
npm run seed

# 4. Start the Express server in development mode
npm run dev
```
- **What `npm run seed` does:** Reads the CSV files in `ml-service/data/` (40 products, 8 suppliers, 29,200 sales, 398 POs, 3 user accounts) and inserts them into MongoDB. It creates demo logins:
  - Admin: `admin@inventory.com` / `Admin@123`
  - Manager: `manager@inventory.com` / `Manager@123`
  - Staff: `staff@inventory.com` / `Staff@123`
- **What `npm run dev` does:** Uses `nodemon` to run `server/src/index.js` on `http://localhost:5000`. It watches for file changes and restarts automatically.

---

### Terminal 3: React Vite Client Application
```powershell
# 1. Navigate to the client folder
cd client

# 2. Install dependencies (if not already installed)
npm install

# 3. Start the Vite development server
npm run dev
```
- **What this does:** Starts the Vite local server on `http://localhost:5173`. Open this URL in your web browser to access the application.
