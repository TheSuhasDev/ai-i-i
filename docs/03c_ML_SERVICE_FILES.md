# 03c. File-by-File Guide: ML Service (FastAPI + Python)

This document provides a complete, line-by-line style reference for every file inside the `ml-service/` directory.

---

## 1. Root & Configuration

### `ml-service/requirements.txt`
1. **Purpose:** Python package dependencies.
2. **Key Libraries:**
   - `fastapi` & `uvicorn`: Web framework and high-performance ASGI web server.
   - `pandas` & `numpy`: Tabular time-series data manipulation and linear algebra.
   - `scikit-learn`: Regression (HistGradientBoosting, RF), classification, and Isolation Forest.
   - `scipy`: Statistical hypothesis testing (Pearson correlation, p-values).
   - `shap`: Explainable AI (SHapley Additive exPlanations).
   - `joblib`: Fast binary serialization for machine learning models.
   - `pytest`: Automated unit test framework.

### `ml-service/app/main.py`
1. **Purpose:** FastAPI application entry point, CORS middleware, service token verification, and route mounting.
2. **Key Functions:**
   - `require_service_token(x_service_token)`: Verifies that callers provide a valid `X-Service-Token` matching `os.getenv("ML_SERVICE_TOKEN")` using constant-time string comparison (`secrets.compare_digest`).
   - `lifespan(_app)`: Startup validation ensuring `ML_SERVICE_TOKEN` is configured before allowing the service to boot.
3. **Mounted Routers:**
   - Mounts `forecast_router`, `risk_router`, `insights_router`, `explain_router`, `simulate_router`, `performance_router` with token dependencies.
   - Exposes public `GET /health` returning service status and UTC timestamp.

---

## 2. Preprocessing & Baseline Benchmarking

### `ml-service/app/preprocessing.py`
1. **Purpose:** Data ingestion, calendar day normalization, weekly resampling, feature engineering, and strict time-based splitting.
2. **Key Functions:**
   - `holiday_flags(dates)`: Generates boolean holiday indicators for fixed national dates and Diwali floating festival windows.
   - `build_weekly_dataset()`:
     - Loads `sales.csv`, fills missing calendar days with 0, and aggregates daily sales into complete Monday-Sunday weeks.
     - Merges static product metadata (lead time, category code, unit price).
     - Computes cyclical calendar covariates: `month`, `woy_sin`, `woy_cos` (sine/cosine of week-of-year).
   - `time_split_masks(df, split_date)`: Divides dataset chronologically (first 548 days = train, last 182 days = test). Never performs random shuffling to avoid lookahead data leakage.

### `ml-service/app/evaluation.py`
1. **Purpose:** Statistical error metric functions for regression evaluation.
2. **Key Functions:**
   - `mae(y_true, y_pred)`: Mean Absolute Error.
   - `rmse(y_true, y_pred)`: Root Mean Squared Error.
   - `mape(y_true, y_pred)`: Mean Absolute Percentage Error (ignores weeks with zero actual demand).
   - `wape(y_true, y_pred)`: Weighted Absolute Percentage Error (`sum(|y - y_hat|) / sum(y)`), which weights high-volume products appropriately.

### `ml-service/app/baseline.py`
1. **Purpose:** Computes simple non-ML baseline benchmarks to measure whether machine learning models actually provide real value.
2. **Key Functions:**
   - `naive_forecast()`: Predicts next week will equal last week's demand.
   - `moving_average_4w()`: Predicts next week will equal the average of the last 4 weeks.
   - `seasonal_naive()`: Predicts next week will equal the exact same week from the previous year.
3. **Saved Artifact:** `ml-service/models/baseline_metrics.json` (baseline MAPE is ~29%, providing the benchmark to beat).

---

## 3. Demand Forecasting Engine

### `ml-service/app/forecasting.py`
1. **Purpose:** Direct multi-horizon demand forecasting models for $h = 1, 2, 3$ weeks ahead.
2. **Key Architecture Decisions:**
   - Uses a direct forecasting approach: 3 independent models are trained for horizon week 1, week 2, and week 3.
   - **Scale-Free Target:** Target is `y_ratio = units / mean(last 8 weeks)`. This allows a single model to accurately forecast both high-volume items (selling 200/day) and low-volume accessories (selling 5/day).
   - Ratio features are clipped at `RATIO_CAP = 3.0` to prevent promotional spikes from distorting future predictions.
3. **Key Functions:**
   - `make_origin_table(weekly, h)`: Constructs origin-based feature tables where all lag features use ONLY data prior to the origin week, while target-week covariates (promo plan, holidays) are known in advance.
   - `forecast_product(product_id, promo_days, price)`:
     - Feeds recent sales history into the model.
     - Produces point forecasts for weeks $h=1, 2, 3$.
     - Computes **80% prediction intervals** (`low` and `high`) using validation residual quantiles ($q_{10}$ and $q_{90}$).
     - `lead_time_demand(weekly_forecasts, days)`: Integrates daily forecast demand across the supplier lead time: $\frac{\text{forecast}}{7} \times \text{lead\_time}$.

### `ml-service/app/train_forecast.py`
1. **Purpose:** Offline model training and selection pipeline.
2. **Key Logic:**
   - Evaluates `HistGradientBoostingRegressor` (loss: absolute error) vs `RandomForestRegressor` on a validation fold (last 13 training weeks).
   - `HistGradientBoosting` beat Random Forest at every horizon.
   - Evaluates once on the held-out test set (WAPE ~16.3% vs baseline MA4 ~18.4%, an 11% error reduction).
   - Saves final trained models to `ml-service/models/forecast_models.joblib` and metrics to `forecast_metrics.json`.

---

## 4. Stockout Risk Classification

### `ml-service/app/risk.py`
1. **Purpose:** Stockout risk classification model predicting the probability ($0\%$ to $100\%$) that a product will run out before replenishment arrives.
2. **Ground-Truth Label:**
   - On day $t$, labeled $y=1$ (Stockout) if:
     $$\text{stock}[t] < \text{lead\_time\_demand}(t+1 \dots t+L) + \text{safety\_stock}$$
   - Safety stock is defined as $1.65 \times \text{std}(\text{sales}_{60d}) \times \sqrt{L}$.
3. **Features (11):**
   - `stock_ratio`: $\text{stock} / (\text{estimated lead-time demand} + \text{safety stock})$.
   - `cover_ltd`: $\text{stock} / \text{lead-time demand}$.
   - `cover_days`: $\text{stock} / \text{mean daily demand}$.
   - `mean7_ratio`: Last 7 days demand vs last 28 days (momentum / surges).
   - `growth_28_90`: Last 28 days demand vs last 90 days (trend).
   - `cv_60`: Demand volatility.
   - `lead_time_days`: Nominal supplier lead time.
   - `sup_ontime`: Historical on-time delivery rate of the supplier up to day $t$.
   - `sup_delay`: Historical average delay of the supplier up to day $t$.
   - `doy_sin`, `doy_cos`: Time-of-year cyclical seasonality.
4. **Key Functions:**
   - `apply_calibration(calibrator, raw)`: Applies Platt scaling (logistic regression on logit model scores) so output probabilities reflect real-world frequencies.
   - `risk_for_product(product_id, stock)`: Predicts calibrated risk percentage for today's inventory.

### `ml-service/app/train_risk.py`
1. **Purpose:** Offline training pipeline for the risk classifier.
2. **Key Logic:**
   - Uses **time-based purging**: Training days whose lead-time label window overlaps with the test split date are purged to eliminate lookahead bias.
   - Fits Random Forest with balanced class weights.
   - Calibrates probabilities on a 60-day validation fold.
   - Saves trained model to `ml-service/models/risk_model.joblib` and metrics to `risk_metrics.json`.

---

## 5. Decision & Business Intelligence Rules

### `ml-service/app/decision.py`
1. **Purpose:** Deterministic, rule-based supply chain algorithms (no black-box ML).
2. **Key Functions & Formulas:**
   - `safety_stock(sigma_daily, lead_time_days, mean_daily, lt_std_days, z=1.65)`:
     $$\text{SS} = z \times \sqrt{\text{LT} \times \sigma_d^2 + d^2 \times \sigma_{\text{LT}}^2}$$
     Accounts for both customer demand volatility ($\sigma_d$) and supplier arrival delays ($\sigma_{\text{LT}}$).
   - `smart_reorder(forecast_ltd, lead_time_days, sigma_daily, stock, on_order, reliability, avg_delay_days, lt_std_days, moq=10)`:
     - Effective lead time: $\text{eff\_LT} = \text{LT} + \text{avg\_delay}$.
     - Adjusted safety buffer: $\text{buffer} = \text{SS} \times \left(1 + 0.5 \times \left(1 - \frac{\text{reliability}}{100}\right)\right)$.
     - Target reorder point: $\text{Target} = \text{Demand}_{\text{eff\_LT}} + \text{buffer}$.
     - Order quantity: $\max(0, \lceil\text{Target} - (\text{stock} + \text{on\_order})\rceil)$. If $>0$, rounds up to Minimum Order Quantity (`moq=10`).
   - `abc_classify(values)`: Ranks products by cumulative annual sales revenue:
     - Class A: Top 70% of revenue.
     - Class B: Next 20% (up to 90%).
     - Class C: Bottom 10%.
   - `xyz_classify(cv)`: Categorizes demand predictability by Coefficient of Variation ($\text{CV} = \sigma / \mu$):
     - Class X: $\text{CV} < 0.25$ (steady, predictable).
     - Class Y: $0.25 \le \text{CV} < 0.35$ (variable / seasonal).
     - Class Z: $\text{CV} \ge 0.35$ (erratic / lumpy).
   - `supplier_scores(pos)`: Calculates composite reliability score ($0$ to $100$):
     - $40\%$ On-Time Delivery Rate.
     - $25\%$ Average Delay Days (penalized up to 7 days).
     - $20\%$ Delay Variance (penalized up to 5 days std).
     - $15\%$ Quality Issue / Defect Rate (penalized up to 20%).
     - Shrinks rates toward a neutral prior ($5$ pseudo-orders) to prevent small sample distortion.

---

## 6. Health Score & Supply Chain Alerts

### `ml-service/app/health.py`
1. **Purpose:** Pure functions computing composite Inventory Health Score ($0$ to $100$) and Alert Priority.
2. **Health Score Formula:**
   $$\text{Health} = 0.55 \times \text{Cover} + 0.15 \times (100 - \text{Risk}\%) + 0.15 \times \text{Supplier} + 0.15 \times \text{Stability}$$
   - **Cover Score:** $0$ at stock ratio 0; $30$ at ratio 1; $100$ at ratio 2. Overstocking ($>90$ days of cover) linearly penalizes the score down to $35$ at $250$ days.
   - **Stability Score:** $100 \times \left(1 - \frac{\text{weekly\_cv}}{0.8}\right)$.
   - **Health Status:** Critical ($<40$), Warning ($40-69$), Healthy ($\ge 70$).
3. **Alert Priority Formula:**
   $$\text{Margin} = \text{Days of Cover} - \text{Days until Replenishment}$$
   - **Critical:** $\text{Margin} < 0$ (warehouse will run dry before replenishment arrives).
   - **High:** $0 \le \text{Margin} < 5$ days.
   - **Medium:** $5 \le \text{Margin} < 10$ days.
   - **Low:** $\text{Margin} \ge 10$ days.

### `ml-service/app/insights.py`
1. **Purpose:** Master aggregator synthesizing forecast, risk, trend, reorder, health, and alerts into one combined payload per product.
2. **Key Functions:**
   - `_open_pos()`: Scans `purchase_orders.csv` for active shipments (`Pending`, `In Transit`), calculates remaining unreceived units, and finds earliest delivery dates.
   - `insights_for_product(product_id, stock, on_order, expected_delivery_date)`: Accepts live overrides from Express and generates the complete product analysis payload.
   - Identifies High-Risk primary suppliers and automatically finds the highest-reliability alternate supplier in the catalog.

---

## 7. Explainable AI & Anomaly Detection

### `ml-service/app/explain.py`
1. **Purpose:** Explainable AI (XAI) using SHAP (SHapley Additive exPlanations).
2. **Key Functions:**
   - `contributions(X)`: Runs `shap.TreeExplainer` on the Random Forest classifier to extract exact feature contributions for an individual product.
   - `group_contributions(vals)`: Aggregates the 11 raw features into 6 plain-language factor groups: Stock Level, Demand Trend, Demand Volatility, Lead Time, Supplier Reliability, and Time of Year.
   - Generates human-readable explanation strings (e.g., *"Current stock is low: about 2.1 days of recent demand against a 7-day lead time"*).
   - Validates that Base Value + sum of SHAP contributions exactly equals the model's raw probability (additivity check).

### `ml-service/app/anomaly.py`
1. **Purpose:** Unsupervised anomaly detection using `IsolationForest` (300 trees).
2. **Key Logic:**
   - **Sales Anomalies:** Features include `sales_ratio` ($\text{units} / \text{mean}_{28d}$), `sales_z` (z-score), and `zero_surprise`. Detects 3-5x spikes and unexpected zero-sales days on items with active stock.
   - **Stock Count Anomalies:** Tracks daily bookkeeping residuals:
     $$e_t = \text{stock}[t-1] - \text{stock}[t] - \text{sales}[t]$$
     A human count error creates a sudden residual that reverses the very next day (a "blip"). Detects count blips with a one-day delay.
   - **Supplier Delays:** Deterministic rule flagging any purchase order arriving $\ge 15$ days late.

---

## 8. What-If Simulator & Trend Analysis

### `ml-service/app/simulator.py`
1. **Purpose:** Interactive scenario modeling engine.
2. **Key Logic:**
   - Accepts scenario adjustments: `demand_pct` (-50% to +100%), `extra_delay_days` (+0 to +30), scenario stock, and new order quantity.
   - `_state(...)`: Evaluates "Before" and "After" through the exact same code path.
   - `project_stock(...)`: Simulates a day-by-day 30-day inventory trajectory holding projected daily demand constant and injecting scheduled order arrivals. Identifies the exact day of shortfall and total units short.

### `ml-service/app/trend.py`
1. **Purpose:** Time-series trend and seasonality detection over 104 weeks (2 full years).
2. **Key Functions:**
   - `analyze_series(weekly)`:
     - **Year-over-Year Trend:** Calculates 52-week difference:
       $$\text{YoY} = \frac{\mu_{\text{year2}} - \mu_{\text{year1}}}{\mu_{\text{year1}}} \times 100$$
       Cancels 52-week seasonal cycles exactly. Classifies as `increasing` or `decreasing` if $|\text{YoY}| \ge 15\%$ and $|z| \ge 2.0$.
     - **Seasonality:** Detrends series by subtracting linear slope, then computes lag-52 Pearson autocorrelation ($r$). Classifies as `seasonal` if $r \ge 0.30$ and $p < 0.05$. Identifies peak month and percentage uplift.

### `ml-service/app/performance.py`
1. **Purpose:** Reads saved metrics from `models/*.json` and `trend_report.csv` and compiles them into a JSON payload for the `/performance` page.

---

## 9. FastAPI Route Handlers (`app/routes_*.py`)

- `routes_forecast.py`: `POST /forecast` ➔ Accepts `{ product_id, promo_days, price }` and returns 3-week forecast with 80% intervals.
- `routes_risk.py`: `POST /risk`, `GET /risk/all`, `POST /trend`.
- `routes_insights.py`: `POST /insights`, `GET /insights/all`, `GET /supplier-risk`.
- `routes_explain.py`: `POST /explain` (SHAP factor breakdown) and `GET /anomalies` (Isolation Forest list).
- `routes_simulate.py`: `POST /simulate` and `POST /simulate/all`.
- `routes_performance.py`: `GET /model-performance`.

---

## 10. Data Generation, Ground Truth & Tests

### `ml-service/data/generate_data.py`
1. **Purpose:** Generates synthetic 2-year retail dataset using pseudo-random seed 42.
2. **Features:**
   - Generates 40 products, 8 suppliers, 730 days of sales (29,200 rows), and 398 purchase orders.
   - Demand model combines base demand, trend slopes, seasonal harmonics, weekday effects, and Gamma noise.
   - Injects planted patterns: promotional spikes, zero-sales days, stock count blips, and an extreme 17-day supplier delay.
   - Builds stock history backwards from current snapshot to guarantee mathematical parity.

### Automated Test Suite (`ml-service/tests/`)
- `test_preprocessing.py`: Validates weekly grouping and ensures lag features contain no future leaks.
- `test_forecasting.py`: Verifies model loading and multi-horizon inference.
- `test_risk.py`: Tests probability calibration and classification thresholds.
- `test_trend.py`: Tests YoY trend calculations and seasonal autocorrelation.
- `test_decision.py`: 14 unit tests checking safety stock formulas, reorder logic, and ABC-XYZ matrices.
- `test_health.py`: Validates health score weights and alert margins.
- `test_anomaly.py`: Tests Isolation Forest feature calculation and score thresholds.
- `test_explain.py`: Verifies SHAP additivity.
- `test_simulator.py`: Verifies simulator reproduces live insights under neutral parameters.
- `test_open_pos.py`: Tests PO status filtering.
- `test_performance.py`: Verifies JSON report parsing.
