# 04. Comprehensive Feature Guide

This guide details all **16 core features and modules** of the AI-Powered Inventory & Supply Chain Intelligence platform.

For each feature, this document provides:
1. **User Value:** What it does in plain, simple English.
2. **UI Location:** Exactly where it appears on the screen.
3. **End-to-End Execution Trace:** Every file, function, route, and controller invoked.
4. **Formula & Worked Numerical Example:** Step-by-step arithmetic you can verify with a calculator.
5. **Inputs, Outputs & Edge Cases:** How the system behaves under boundary conditions.
6. **Related Automated Tests:** Which unit and integration tests verify the logic.

---

## Feature Index

1. [Smart Reorder & Replenishment Engine](#1-smart-reorder--replenishment-engine)
2. [Multi-Horizon Demand Forecasting (1, 2, 3 Weeks Ahead)](#2-multi-horizon-demand-forecasting)
3. [Stockout Risk Classification & Calibration](#3-stockout-risk-classification--calibration)
4. [Inventory Health Score (0–100) & Component Breakdown](#4-inventory-health-score)
5. [Supply Chain Alert Prioritization & Margin Days](#5-supply-chain-alert-prioritization)
6. [Explainable AI (Why Panel / SHAP Factors)](#6-explainable-ai-why-panel)
7. [What-If Scenario Simulator & 30-Day Projections](#7-what-if-scenario-simulator)
8. [Supplier Reliability Scorecard & Risk Assessment](#8-supplier-reliability-scorecard)
9. [ABC-XYZ Inventory Matrix & Classification](#9-abc-xyz-inventory-matrix)
10. [Unsupervised Anomaly Detection (Isolation Forest)](#10-unsupervised-anomaly-detection)
11. [Demand Trend & Seasonality Detection](#11-demand-trend--seasonality-detection)
12. [Autonomous AI Assistant & Tool Calling](#12-autonomous-ai-assistant)
13. [Executive Dashboard & Real-Time KPIs](#13-executive-dashboard)
14. [Product 360 Insight Deep-Dive](#14-product-360-insight)
15. [Authentication, JWT & Role-Based Access Control](#15-authentication--rbac)
16. [Physical Stock Ledger & Adjustment Audits](#16-physical-stock-ledger)

---

## 1. Smart Reorder & Replenishment Engine

### User Value
Tells warehouse managers **exactly how many units to order today** so the warehouse never runs out of stock, without tying up excess cash. It automatically accounts for upcoming supplier delivery delays, minimum vendor order sizes, and open purchase orders already in transit.

### UI Location
- Primary screen: Navigation sidebar ➔ **Smart Reorder** (`/reorder`).
- Also appears on **Product Insight** (`/product/:code`) and **Dashboard** ("Reorder Now" KPI card).

### Complete End-to-End Flow
```text
1. UI: User views SmartReorder.jsx
2. API Call: Axios triggers GET /api/insights?full=1
3. Express Route: server/src/routes/insights.js (handled by listInsights)
4. Controller: server/src/controllers/insightsController.js::listInsights queries MongoDB
   (Or on refresh: computeAndStore(product) queries MongoDB Inventory & open POs)
5. ML Client: server/src/services/mlService.js calls POST /insights
6. FastAPI Route: ml-service/app/routes_insights.py::insights()
7. Python Logic: ml-service/app/insights.py::insights_for_product() calls
   ml-service/app/decision.py::smart_reorder()
8. Response: JSON payload containing order_qty, reorder_point, and buffer
9. UI Render: SmartReorder.jsx renders order recommendation table with "Create PO" button
```

### Formula & Worked Numeric Example
```
Inputs:
- Forecast demand over nominal lead time (forecast_ltd) = 84.0 units
- Nominal lead time (LT) = 7 days
- Daily demand (d) = 84 / 7 = 12.0 units/day
- Daily demand standard deviation (sigma_daily) = 4.0 units
- Supplier average delay (avg_delay) = 3.0 days
- Supplier delay standard deviation (lt_std) = 2.0 days
- Supplier reliability score = 80.0%
- Current stock on hand (stock) = 25 units
- Open purchase orders in transit (on_order) = 20 units
- Minimum Order Quantity (MOQ) = 10 units

Step 1: Effective Lead Time (eff_LT)
eff_LT = LT + avg_delay = 7 + 3 = 10 days

Step 2: Nominal Demand over Effective Lead Time
Demand_eff = d * eff_LT = 12.0 * 10 = 120.0 units

Step 3: Base Safety Stock (SS) with 95% service level (z = 1.65)
Variance = (LT * sigma_daily^2) + (d^2 * lt_std^2)
Variance = (7 * 4^2) + (12^2 * 2^2) = (7 * 16) + (144 * 4) = 112 + 576 = 688
SS = 1.65 * sqrt(688) = 1.65 * 26.23 = 43.28 units

Step 4: Adjusted Buffer for Supplier Reliability (1.0x at 100%, up to 1.5x at 0%)
Buffer_multiplier = 1 + 0.5 * (1 - 80 / 100) = 1 + 0.5 * 0.20 = 1.10
Buffer = SS * 1.10 = 43.28 * 1.10 = 47.6 units

Step 5: Target Reorder Point (Target)
Target = Demand_eff + Buffer = 120.0 + 47.6 = 167.6 units

Step 6: Current Inventory Position
Inventory_Position = stock + on_order = 25 + 20 = 45.0 units

Step 7: Recommended Order Quantity
Raw_Order = ceil(Target - Inventory_Position) = ceil(167.6 - 45.0) = 123 units
Order_Qty = max(123, MOQ) = 123 units
```

### Edge Cases & Handling
- **Inventory Position $\ge$ Target:** If `stock + on_order >= Target`, returns `order_qty: 0` and `needs_reorder: false`.
- **Below MOQ:** If calculated reorder is 4 units and `moq = 10`, rounds up to 10 units to satisfy vendor requirements.
- **Missing Open POs:** If Express fails to send `on_order`, the ML service falls back to reading active POs from `purchase_orders.csv`.

### Related Tests
- `ml-service/tests/test_decision.py`: Validates `test_smart_reorder_basic()`, `test_smart_reorder_with_on_order()`, and `test_moq_rounding()`.

---

## 2. Multi-Horizon Demand Forecasting

### User Value
Predicts how many units customers will buy in **Week 1, Week 2, and Week 3**, providing upper and lower 80% confidence boundaries so businesses can prepare for spikes or lulls.

### UI Location
- Visualized as an interactive area chart on **Product Insight** (`/product/:code`).

### Complete End-to-End Flow
```text
1. UI: User opens ProductInsight.jsx
2. API Call: GET /api/insights/:code
3. Express Route: server/src/routes/insights.js (getInsight)
4. Controller: server/src/controllers/insightsController.js queries Product and calls mlService.insights()
5. ML Client: server/src/services/mlService.js calls POST /insights
6. FastAPI Route: ml-service/app/routes_insights.py::insights()
7. Python Inference: ml-service/app/insights.py calls
   ml-service/app/forecasting.py::forecast_product(product_id)
8. Regressor: HistGradientBoostingRegressor loads weights from forecast_models.joblib
9. Response: 3-week array with point forecast, low (q10), and high (q90)
10. UI Render: ForecastChart.jsx displays historical curve and shaded 80% forecast cone
```

### Formula & Worked Numeric Example
```
Inputs for Product P001 at Horizon h = 1:
- Scale (mean demand of last 8 weeks) = 50.0 units/week
- Scaled features: r0 = 1.05, r1 = 0.98, promo_days_target = 0, month = 10
- Regressor predicted ratio (y_ratio) = 1.12
- Validation residual quantiles for 80% interval: q10 = -0.15, q90 = +0.22

Step 1: Point Forecast
Point_Forecast = y_ratio * Scale = 1.12 * 50.0 = 56.0 units

Step 2: 80% Prediction Interval Bounds
Low_Bound = max(0, (y_ratio + q10) * Scale) = (1.12 - 0.15) * 50.0 = 0.97 * 50.0 = 48.5 units
High_Bound = (y_ratio + q90) * Scale = (1.12 + 0.22) * 50.0 = 1.34 * 50.0 = 67.0 units

Output for Week 1: { forecast: 56.0, low: 48.5, high: 67.0 }
```

### Edge Cases & Handling
- **Less than 8 weeks of sales history:** Throws `ValueError("Not enough history to forecast")`; handled gracefully by the UI displaying a "History under construction" banner.

### Related Tests
- `ml-service/tests/test_forecasting.py`: Verifies parity between training feature pipeline and live inference.

---

## 3. Stockout Risk Classification & Calibration

### User Value
Gives an unambiguous probability ($0\%$ to $100\%$) indicating whether current inventory will run out before a new purchase order can arrive.

### UI Location
- **Dashboard** ("At-Risk Products" metric card).
- **Product Insight** (Risk gauge badge and WhyPanel).
- **Smart Reorder** (Risk Level column: High / Medium / Low).

### Complete End-to-End Flow
```text
1. UI: User views Dashboard.jsx or ProductInsight.jsx
2. Express Route: /api/insights
3. ML Service: POST /insights ➔ ml-service/app/risk.py::risk_for_product()
4. Feature Construction: Extracts 11 tabular features from recent sales & stock history
5. Classifier: RandomForestClassifier predicts raw class probability
6. Calibration: Platt scaling logistic regression maps raw score to calibrated risk %
7. Response: { risk_pct: 78.4, risk_level: "High", flagged: true }
8. UI Render: Renders color-coded risk badge (High >= 60%, Medium 30-60%, Low < 30%)
```

### Formula & Worked Numeric Example
```
Inputs:
- Random Forest raw ensemble probability = 0.65
- Platt Calibrator: Logistic Regression fitted with intercept = -0.12, coef = 1.25

Step 1: Convert raw probability to Log-Odds (Logit)
logit = ln(p / (1 - p)) = ln(0.65 / 0.35) = ln(1.857) = 0.619

Step 2: Apply Calibrator Logistic Regression
z = intercept + coef * logit = -0.12 + 1.25 * 0.619 = -0.12 + 0.774 = 0.654

Step 3: Compute Calibrated Probability
Calibrated_p = 1 / (1 + exp(-z)) = 1 / (1 + exp(-0.654)) = 1 / (1 + 0.520) = 0.658 (65.8%)

Output: risk_pct = 65.8%, risk_level = "High"
```

### Related Tests
- `ml-service/tests/test_risk.py`: Tests threshold optimization and Platt scaling calibration.

---

## 4. Inventory Health Score

### User Value
A single composite score from **0 (Failing / Empty) to 100 (Flawless)** summarizing how well-managed a product's inventory is across stock cover, stockout risk, vendor reliability, and demand stability.

### UI Location
- **Dashboard:** Average Health Score metric card and distribution chart.
- **Product Insight:** Health score gauge and 4-bar breakdown component (`HealthChart.jsx`).

### Complete End-to-End Flow
```text
1. Computed inside ml-service/app/health.py::health_score()
2. Synthesized inside ml-service/app/insights.py
3. Stored in MongoDB Insight collection (fields: healthScore, healthStatus)
4. Rendered on frontend via HealthChart.jsx
```

### Formula & Worked Numeric Example
$$\text{Health} = 0.55 \times \text{Cover} + 0.15 \times (100 - \text{Risk}\%) + 0.15 \times \text{Supplier} + 0.15 \times \text{Stability}$$

```
Given:
- Stock Ratio = 1.5 (Between 1.0 and 2.0; interpolated: 30 + 0.5 * 70 = 65.0)
- Stockout Risk % = 20.0% (Risk Buffer = 100 - 20.0 = 80.0)
- Supplier Reliability = 85.0%
- Weekly CV = 0.20 (Stability = 100 * (1 - 0.20 / 0.8) = 100 * 0.75 = 75.0)

Calculation:
Health = (0.55 * 65.0) + (0.15 * 80.0) + (0.15 * 85.0) + (0.15 * 75.0)
Health = 35.75 + 12.00 + 12.75 + 11.25 = 71.75 -> 71.8

Status: Healthy (>= 70)
```

### Edge Cases
- **Severe Overstocking ($>90$ days of cover):** The cover score linearly decreases from 100 down to 35 at 250 days of cover, properly penalizing overstocked dead capital.

### Related Tests
- `ml-service/tests/test_health.py`: Verifies status boundaries (Critical < 40, Warning 40–69, Healthy $\ge$ 70).

---

## 5. Supply Chain Alert Prioritization

### User Value
Identifies operational crises before they hit the warehouse floor by computing the **replenishment margin** (how many days of inventory remain when a shipment arrives).

### UI Location
- Sidebar ➔ **Alerts** (`/alerts`).
- **Dashboard** top urgent items list.

### Complete End-to-End Flow
```text
1. ml-service/app/insights.py computes days_of_cover and days_to_replenishment
2. Calls ml-service/app/health.py::alert_priority(margin_days)
3. Evaluates alerts list (_alerts function)
4. Express serves GET /api/insights, sorted by priority rank
5. Alerts.jsx renders categorized alert cards with direct action buttons
```

### Formula & Worked Numeric Example
$$\text{Margin Days} = \text{Days of Stock Cover} - \text{Days Until Replenishment}$$

```
Case A (Critical Alert):
- Current stock = 30 units
- Forecast daily sales = 10 units/day -> Days of Cover = 30 / 10 = 3.0 days
- Open PO arriving in 6 days (including supplier delay) -> Days to Replenish = 6.0 days
- Margin = 3.0 - 6.0 = -3.0 days (Negative margin!)
-> Priority: Critical ("Stock will run out 3.0 days before replenishment arrives!")

Case B (Overdue PO Alert):
- Open PO was expected 5 days ago and has not arrived.
-> Emits alert: "PO overdue by 5d, ETA unknown. Stock covers 3.0 days." Priority: Critical.
```

---

## 6. Explainable AI (Why Panel)

### User Value
Removes the "black box" mystery from machine learning. Managers can click any high-risk product and see **plain-language reasons** explaining why the algorithm flagged it.

### UI Location
- **Product Insight** (`/product/:code`) ➔ Right side sliding/embedded **Why Panel** (`WhyPanel.jsx`).

### Complete End-to-End Flow
```text
1. UI: User views ProductInsight.jsx
2. API Call: GET /api/insights/:code/explain
3. Express Route: server/src/routes/insights.js (getExplanation)
4. Python Route: POST /explain (ml-service/app/routes_explain.py)
5. SHAP Explainer: ml-service/app/explain.py::explain_risk() executes shap.TreeExplainer
6. Grouping: Maps 11 raw features into 6 factor groups (Stock, Demand, Volatility, Lead Time, Supplier, Season)
7. Response: Factors with percentage impact shares and human-readable text
8. UI Render: WhyPanel.jsx renders impact bars and plain-English explanation bullets
```

### Numerical Sample Output
```json
{
  "risk_pct": 74.0,
  "summary": "High stockout risk (74%). Main reason: Current stock (18 units) is low: about 1.8 days of cover against a 7-day lead time.",
  "factors": [
    {
      "group": "stock",
      "label": "Stock level",
      "direction": "raises",
      "share_pct": 52.4,
      "reason": "Current stock (18 units) is low: about 1.8 days of recent demand, against a 7-day lead time."
    },
    {
      "group": "supplier",
      "label": "Supplier reliability",
      "direction": "raises",
      "share_pct": 28.1,
      "reason": "The supplier has a record of delays (on-time rate 65%, recent average delay 3.4 days)."
    }
  ]
}
```

---

## 7. What-If Scenario Simulator

### User Value
Allows managers to test hypothetical business shocks without touching real database records: *"What if holiday demand jumps 30% and our supplier is delayed by 5 extra days?"*

### UI Location
- Navigation sidebar ➔ **Simulator** (`/simulator`).

### Complete End-to-End Flow
```text
1. UI: User moves sliders in Simulator.jsx (demand %, delay days, stock, order qty)
2. API Call: POST /api/simulator (validated by Zod schema)
3. Express Route: server/src/routes/simulator.js
4. Controller: Merges live MongoDB stock and in-transit POs as baseline
5. Python ML: POST /simulate ➔ ml-service/app/simulator.py::simulate()
6. State Comparison: Computes _state() for "Before" and "After" on identical code path
7. 30-Day Projection: project_stock() simulates daily stock drawdown and order arrivals
8. UI Render: Simulator.jsx renders Before vs After comparison table and 30-day trajectory chart
```

### Worked Numeric Example
```
Baseline:
- Stock: 50 units
- Daily Demand: 10 units/day
- Lead time: 7 days + 0 days extra delay

Simulation Shock:
- Demand change = +20% -> Scenario Daily Demand = 12 units/day
- Extra supplier delay = +3 days -> Effective Lead Time = 10 days
- New order placed = 60 units (arrives on day 11)

Day-by-Day Projection:
Day 1: 50 - 12 = 38
Day 2: 38 - 12 = 26
Day 3: 26 - 12 = 14
Day 4: 14 - 12 = 2
Day 5: 2 - 12 = Shortfall of 10 units! (Stock hits 0)
Days 5 to 10: Out of stock (Total units short = 60 units)
Day 11: Order of 60 arrives -> Stock replenishes!

Result: First shortfall on Day 5, 60 units lost sales. Health drops from Healthy to Critical.
```

---

## 8. Supplier Reliability Scorecard

### User Value
Ranks all suppliers by their actual delivery track record, showing who is dependable and who causes expensive warehouse stockouts.

### UI Location
- Navigation sidebar ➔ **Supplier Risk** (`/supplier-risk`).
- Click any vendor to drill into **Supplier Deliveries** (`/supplier-risk/:id/deliveries`).

### Complete End-to-End Flow
```text
1. ml-service/app/decision.py::supplier_scores() processes purchase_orders.csv
2. Filters delivered purchase orders and calculates on-time rates and delay variance
3. Express serves GET /api/supplier-risk
4. SupplierRisk.jsx renders scorecard table with reliability scores and risk levels
```

### Formula
$$\text{Reliability} = 100 \times [0.40 \times \text{OnTime} + 0.25 \times (1 - \text{DelayPen}) + 0.20 \times (1 - \text{VarPen}) + 0.15 \times (1 - \text{QualityPen})]$$
Rates are smoothed with a Bayesian prior of 5 pseudo-orders.

---

## 9. ABC-XYZ Inventory Matrix

### User Value
Categorizes catalog products into a 3x3 matrix based on financial importance (ABC) and demand predictability (XYZ), allowing managers to focus attention where money is made.

### UI Location
- Visualized as an interactive 3x3 grid on **Dashboard** (`AbcXyzMatrix.jsx`).
- Tagged on **Product Insight** and **Smart Reorder**.

### Classification Rules
- **ABC (Annual Revenue Share):**
  - **A (High Value):** Products that make up the top 70% of revenue.
  - **B (Medium Value):** Next 20% of revenue (70% to 90%).
  - **C (Low Value):** Bottom 10% of revenue.
- **XYZ (Coefficient of Variation $\text{CV} = \sigma / \mu$):**
  - **X (Steady):** $\text{CV} < 0.25$ (reliable daily sales).
  - **Y (Variable):** $0.25 \le \text{CV} < 0.35$ (seasonal or promo-driven).
  - **Z (Erratic):** $\text{CV} \ge 0.35$ (lumpy, unpredictable demand).

---

## 10. Unsupervised Anomaly Detection

### User Value
Finds data entry errors and suspicious sales spikes automatically, catching human mistakes before they corrupt forecasting models.

### UI Location
- Navigation sidebar ➔ **Anomalies** (`/anomalies`).

### Complete End-to-End Flow
```text
1. Python engine: ml-service/app/anomaly.py runs Isolation Forest (300 trees)
2. Computes sales anomalies (spikes/zero days) and stock count blips
3. Express serves GET /api/anomalies
4. Anomalies.jsx renders audit table with filter chips and explanatory messages
```

### Anomaly Types Detected
1. **Sales Spike:** Unusually high sales (e.g. 4.5x normal 28-day average).
2. **Suspicious Zero Sales:** Zero sales on a day when stock was available and normal demand is high.
3. **Stock Count Mismatch (Blip):** Bookkeeping error where physical count drops unexpectedly and reverses the very next day.
4. **Extreme Supplier Delay:** Rule flagging POs delayed by 15+ days.

---

## 11. Demand Trend & Seasonality Detection

### User Value
Identifies whether a product's demand is growing, declining, or repeating seasonal peaks year over year.

### UI Location
- Navigation sidebar ➔ **Trend & Seasonality** (`/trend`).
- Summary badge on **Product Insight**.

### Complete End-to-End Flow
```text
1. ml-service/app/trend.py::analyze_series() evaluates 104 weeks of sales
2. Year-over-Year (YoY) 52-week difference cancels annual seasonality
3. Pearson autocorrelation on detrended series checks for seasonal repetition
4. Client renders TrendSeasonality.jsx with peak months and uplift percentages
```

---

## 12. Autonomous AI Assistant

### User Value
A natural-language decision support assistant that can answer warehouse questions, check stock levels, evaluate supplier delays, and run what-if simulations using real live database tools.

### UI Location
- Floating drawer on all screens (`AssistantWidget.jsx`).
- Full-page dedicated chat workspace (`/assistant`).

### Complete End-to-End Flow
```text
1. User types prompt: "Why is P001 critical and what should I order?"
2. Client sends POST /api/assistant
3. Express routes to server/src/services/assistant.js::ask()
4. Agent loop sends prompt + 10 tool schemas to OpenAI-compatible LLM endpoint
5. LLM requests tool call: get_product_insight({ product_code: "P001" })
6. server/src/services/assistantTools.js executes query against MongoDB & FastAPI
7. Agent feeds tool data back to LLM
8. LLM formats final answer into ## Facts and ## Recommendation
9. Client renders formatted answer and lists exact tools used under "Data used" badge
```

---

## 13. Executive Dashboard

### User Value
The central command center providing an executive overview of warehouse operations in 5 seconds.

### UI Location
- Route `/`.

### Key Widgets
- 4 Primary KPI cards: Critical Alerts, Products at Risk, Average Health, Reorders Needed.
- Health Score component breakdown chart.
- Interactive 3x3 ABC-XYZ Matrix.
- "What Needs Attention Today" priority action table.

---

## 14. Product 360 Insight

### User Value
Complete 360-degree technical dossier for an individual SKU, uniting charts, risk factors, and replenishment actions in one place.

### UI Location
- Route `/product/:code`.

---

## 15. Authentication & RBAC

### User Value
Secures company data and ensures staff members cannot delete records or trigger expensive model recomputations.

### Permissions Matrix
- **Admin:** Full access (CRUD on all collections, delete records, batch refresh insights).
- **Manager:** Create and edit catalog, approve POs, run simulations (no delete).
- **Staff:** Read-only analytics, record sales, update inventory counts.

---

## 16. Physical Stock Ledger & Adjustment Audits

### User Value
Maintains physical inventory counts and logs stock adjustments when warehouse staff perform physical shelf audits.

### UI Location
- Navigation sidebar ➔ **Inventory** (`/inventory`).
- Staff click "Update Stock" to record cycle counts.
