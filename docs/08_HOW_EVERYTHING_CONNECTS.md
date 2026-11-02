# 08. How Everything Connects: Dependency Map & Traces

This document provides a holistic look at the repository, featuring an architectural dependency map, 3 complete end-to-end walkthroughs of real-world user workflows, and a practical developer cheat sheet.

---

## 1. System Dependency Map

Below is a complete visual map illustrating how files in the client, server, and ML service import and depend on each other:

```mermaid
graph TD
    subgraph ClientLayer ["Client (React)"]
        App["App.jsx (Router)"] --> Dashboard["Dashboard.jsx"]
        App --> Reorder["SmartReorder.jsx"]
        App --> ProdInsight["ProductInsight.jsx"]
        App --> Simulator["Simulator.jsx"]

        Dashboard --> Recharts["ForecastChart / HealthChart"]
        Dashboard --> ApiService["services/index.js"]
        Reorder --> ApiService
        ProdInsight --> ApiService
        Simulator --> ApiService

        ApiService --> AxiosInstance["services/api.js"]
    end

    subgraph ServerLayer ["Server (Express)"]
        AxiosInstance -->|HTTP REST| IndexJs["server/src/index.js"]
        IndexJs --> AuthMiddleware["middleware/auth.js"]
        IndexJs --> InsightsRouter["routes/insights.js"]
        IndexJs --> SimulatorRouter["routes/simulator.js"]
        IndexJs --> PORouter["routes/purchaseOrders.js"]

        InsightsRouter --> InsightsCtrl["controllers/insightsController.js"]
        SimulatorRouter --> MLClient["services/mlService.js"]
        PORouter --> MongoosePO["models/PurchaseOrder.js"]

        InsightsCtrl --> MongooseInsight["models/Insight.js"]
        InsightsCtrl --> MongooseInv["models/Inventory.js"]
        InsightsCtrl --> OpenPOService["services/openPurchaseOrders.js"]
        InsightsCtrl --> MLClient
    end

    subgraph MLLayer ["ML Service (FastAPI)"]
        MLClient -->|HTTP X-Service-Token| FastAPIMain["ml-service/app/main.py"]
        FastAPIMain --> RoutesInsights["routes_insights.py"]
        FastAPIMain --> RoutesSimulate["routes_simulate.py"]
        FastAPIMain --> RoutesExplain["routes_explain.py"]

        RoutesInsights --> InsightsModule["app/insights.py"]
        RoutesSimulate --> SimulatorModule["app/simulator.py"]
        RoutesExplain --> ExplainModule["app/explain.py"]

        InsightsModule --> ForecastModule["app/forecasting.py"]
        InsightsModule --> RiskModule["app/risk.py"]
        InsightsModule --> DecisionModule["app/decision.py"]
        InsightsModule --> HealthModule["app/health.py"]

        ForecastModule --> JoblibModels["models/forecast_models.joblib"]
        RiskModule --> JoblibRisk["models/risk_model.joblib"]
    end
```

---

## 2. Three End-to-End Walkthroughs of Real User Actions

---

### Walkthrough 1: Creating a Purchase Order from Smart Reorder
**Scenario:** A warehouse manager notices that USB Hubs (P001) are low on stock, reviews the AI recommendation, and issues a purchase order to Supplier S1.

```mermaid
sequenceDiagram
    autonumber
    actor Mgr as Warehouse Manager
    participant UI as SmartReorder.jsx
    participant Form as PurchaseOrderForm.jsx
    participant Axios as api.js
    participant Server as routes/purchaseOrders.js
    participant Sync as PurchaseOrder.js (syncInTransit)
    participant DB as MongoDB (PurchaseOrder & Inventory)

    Mgr->>UI: Clicks "Create PO" button next to P001 (recommending 84 units)
    UI->>Form: Navigates to /purchase-orders/new?product=P001&supplier=S1&qty=84
    Form->>Form: Pre-populates product dropdown, supplier, and quantity (84)
    Mgr->>Form: Selects expected delivery date (Nov 3) and clicks "Submit"
    Form->>Axios: POST /api/purchase-orders with body { product, supplier, qtyOrdered: 84, expectedDeliveryDate }
    Axios->>Server: HTTP POST /api/purchase-orders (Authorization: Bearer <token>)
    Server->>Server: Validates body using Zod purchaseOrderSchema
    Server->>DB: Checks for duplicate open POs (none found)
    Server->>DB: Inserts new PurchaseOrder document (status: "In Transit")
    Server->>Sync: Calls syncInTransit(productId)
    Sync->>DB: Aggregates open POs and updates Inventory.inTransitQty = 84
    Server-->>Axios: 201 Created { success: true, data: { poNumber: "PO-20261026-P001" } }
    Axios-->>Form: Success toast displayed
    Form->>UI: Redirects to /purchase-orders list
```

#### Files Involved in Walkthrough 1:
1. `client/src/pages/SmartReorder.jsx`: Displays the recommended reorder quantity (84 units) and renders a link to `/purchase-orders/new?product=P001&qty=84`.
2. `client/src/pages/PurchaseOrderForm.jsx`: Parses URL query parameters using `useSearchParams()`, fills form fields, and submits.
3. `client/src/services/api.js`: Injects JWT Bearer token into headers.
4. `server/src/routes/purchaseOrders.js`: Intercepts POST request, checks for existing open orders, and saves to MongoDB.
5. `server/src/models/PurchaseOrder.js::syncInTransit()`: Recalculates total open in-transit units and updates `Inventory.inTransitQty`.
6. `server/src/models/Inventory.js`: Persists new physical order exposure in MongoDB.

---

### Walkthrough 2: Asking the AI Assistant a Complex Supply Chain Question
**Scenario:** A manager opens the AI assistant drawer and asks: *"Which products are at critical risk right now, and why is P001 critical?"*

```mermaid
sequenceDiagram
    autonumber
    actor Mgr as Warehouse Manager
    participant Drawer as AssistantWidget.jsx
    participant ServerRoute as routes/assistant.js
    participant Agent as services/assistant.js (ask loop)
    participant Tools as services/assistantTools.js
    participant DB as MongoDB
    participant FastAPI as Python ML (POST /explain)
    participant LLM as OpenAI-Compatible LLM (Groq / Gemini)

    Mgr->>Drawer: Types: "Which products are critical and why is P001 critical?"
    Drawer->>ServerRoute: POST /api/assistant { message: "..." }
    ServerRoute->>ServerRoute: Checks in-memory rate limiter (20 requests/10 min)
    ServerRoute->>Agent: Calls ask(messages)
    Agent->>LLM: Sends system prompt + user question + 10 tool definitions

    Note over Agent,LLM: Turn 1: LLM decides it needs to list alerts first
    LLM-->>Agent: Tool Call Request: list_alerts({ priority: "Critical" })
    Agent->>Tools: runTool("list_alerts", { priority: "Critical" })
    Tools->>DB: Insight.find({ priority: "Critical" })
    DB-->>Tools: Returns P001, P010, P016, P039
    Tools-->>Agent: Tool Result JSON: [P001, P010, ...]

    Note over Agent,LLM: Turn 2: LLM decides it needs SHAP explanation for P001
    Agent->>LLM: Sends conversation history + tool result
    LLM-->>Agent: Tool Call Request: explain_stockout_risk({ product_code: "P001" })
    Agent->>Tools: runTool("explain_stockout_risk", { product_code: "P001" })
    Tools->>FastAPI: POST /explain { product_id: "P001" }
    FastAPI-->>Tools: Returns SHAP factors (Stock level: 52.4%, Supplier delays: 28.1%)
    Tools-->>Agent: Tool Result JSON: { factors: [...] }

    Note over Agent,LLM: Turn 3: LLM formats final answer
    Agent->>LLM: Sends conversation history + tool result
    LLM-->>Agent: Formats markdown answer into ## Facts and ## Recommendation
    Agent-->>ServerRoute: Returns { reply, facts, recommendations, toolsUsed }
    ServerRoute-->>Drawer: 200 OK
    Drawer->>Mgr: Renders formatted reply and lists "Data used: list_alerts, explain_stockout_risk"
```

#### Files Involved in Walkthrough 2:
1. `client/src/components/AssistantWidget.jsx`: Captures user prompt and toggles chat drawer.
2. `server/src/routes/assistant.js`: Enforces per-user rate limit and dispatches to agent.
3. `server/src/services/assistant.js`: Orchestrates the iterative function-calling loop with the external LLM.
4. `server/src/services/assistantTools.js`: Executes `list_alerts` against MongoDB and `explain_stockout_risk` against Python FastAPI.
5. `ml-service/app/explain.py`: Runs `shap.TreeExplainer` on Random Forest model to calculate factor shares.

---

### Walkthrough 3: Running a What-If Demand Shock Simulation
**Scenario:** A manager navigates to `/simulator`, sets **Demand Shock to +30%**, sets **Extra Supplier Delay to +4 days**, and observes the projected stockout trajectory.

```mermaid
sequenceDiagram
    autonumber
    actor Mgr as Warehouse Manager
    participant UI as Simulator.jsx
    participant Express as routes/simulator.js
    participant DB as MongoDB (Inventory & PO)
    participant MLClient as services/mlService.js
    participant FastAPI as routes_simulate.py
    participant SimEngine as simulator.py

    Mgr->>UI: Selects P001, moves sliders to +30% demand, +4 days delay
    UI->>Express: POST /api/simulator { product_id: "P001", demand_pct: 30, extra_delay_days: 4 }
    Express->>DB: Queries live Inventory.currentStock and open PurchaseOrder summary
    Express->>MLClient: Calls mlService.simulate(body_with_live_stock)
    MLClient->>FastAPI: HTTP POST /simulate (X-Service-Token)
    FastAPI->>SimEngine: Calls simulate(product_id="P001", demand_pct=30, extra_delay_days=4, ...)
    SimEngine->>SimEngine: Computes _state() for baseline and scenario
    SimEngine->>SimEngine: project_stock() simulates 30-day day-by-day depletion
    SimEngine-->>FastAPI: Returns Before/After comparison, shortfall day, and projected_stock array
    FastAPI-->>MLClient: 200 OK
    MLClient-->>Express: Returns simulation JSON
    Express-->>UI: 200 OK
    UI->>Mgr: Renders Before vs After metric comparison & plots 30-day red stockout line
```

#### Files Involved in Walkthrough 3:
1. `client/src/pages/Simulator.jsx`: Renders input sliders and before/after comparison table.
2. `server/src/routes/simulator.js`: Validates input with Zod and injects live MongoDB warehouse stock.
3. `server/src/services/mlService.js`: Proxies request to Python service.
4. `ml-service/app/routes_simulate.py`: FastAPI route handler.
5. `ml-service/app/simulator.py`: Runs mathematical 30-day projection and recalculates health/reorder.

---

## 3. Developer Cheat Sheet: "If I Want to Change X, Which Files Do I Edit?"

Use this reference table whenever you need to add a feature, modify a formula, or fix an issue:

| What do you want to change? | Primary Files to Touch | Secondary Files to Verify |
|---|---|---|
| **Change the Safety Stock formula** (e.g. increase service level from 95% to 99%) | `ml-service/app/decision.py` (`Z_SERVICE = 2.33`) | `ml-service/app/risk.py`, `ml-service/tests/test_decision.py` |
| **Change Health Score weights or thresholds** | `ml-service/app/health.py` (`health_score`, `health_status`) | `ml-service/tests/test_health.py`, `client/src/components/HealthChart.jsx` |
| **Change Alert Margin thresholds** (e.g. Critical < 0 days) | `ml-service/app/health.py` (`alert_priority`), `ml-service/app/insights.py` | `client/src/pages/Alerts.jsx`, `server/src/controllers/insightsController.js` |
| **Add a new field to Product catalog** (e.g. `barcode` or `brand`) | `server/src/models/Product.js`, `server/src/validators/schemas.js` | `client/src/pages/ProductForm.jsx`, `client/src/pages/ProductList.jsx` |
| **Change user roles or add a new role** (e.g. `'auditor'`) | `server/src/models/User.js`, `server/src/middleware/auth.js` | `client/src/components/ProtectedRoute.jsx`, `client/src/context/AuthProvider.jsx` |
| **Retrain the Demand Forecasting model** | Run `python -m app.train_forecast` inside `ml-service/` | `ml-service/models/forecast_models.joblib`, `forecast_metrics.json` |
| **Retrain the Stockout Risk Classifier** | Run `python -m app.train_risk` inside `ml-service/` | `ml-service/models/risk_model.joblib`, `risk_metrics.json` |
| **Add a new tool for the AI Assistant** | `server/src/services/assistantTools.js` (add tool definition & handler) | `server/src/services/assistant.js` (`SYSTEM_PROMPT`) |
| **Change the chart colors or font styles** | `client/src/index.css` (CSS variables), `client/src/components/ForecastChart.jsx` | `client/src/components/HealthChart.jsx` |
| **Change minimum order quantity (MOQ) logic** | `ml-service/app/decision.py` (`smart_reorder`, `moq` parameter) | `client/src/pages/SmartReorder.jsx` |
