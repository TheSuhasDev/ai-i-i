import os
from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_file_info_table, add_code_block, add_callout
)

def render_section_3_ml(doc):
    add_heading_2(doc, "3.2 Machine Learning Service Tier (Python FastAPI)")
    add_paragraph(doc, 
        "This section documents every file within the Python machine learning service (ml-service/). "
        "The ML service serves high-accuracy demand forecasts, calibrated stockout risks, heuristic decision recommendations, "
        "SHAP-based predictive attributions, unsupervised anomaly detections, and multi-scenario what-if simulations."
    )

    # 1. app/main.py
    add_heading_3(doc, "3.2.1 ml-service/app/main.py")
    add_file_info_table(doc,
        path="ml-service/app/main.py",
        purpose="FastAPI application factory, CORS policy, service-token authentication guard, and lifespan management.",
        deps="app/routes_forecast.py, app/routes_risk.py, app/routes_insights.py, app/routes_explain.py, app/routes_simulate.py, app/routes_performance.py",
        used_by="uvicorn app.main:app --port 8000 (FastAPI ASGI server)"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Loads environment variables via load_dotenv().", bold_prefix="1. Environment Setup: ")
    add_bullet(doc, "require_service_token(x_service_token): Authentication dependency. Reads X-Service-Token header. Compares with os.getenv('ML_SERVICE_TOKEN') using constant-time secrets.compare_digest(). If missing/mismatched, raises HTTPException(401, 'Invalid service token'). If server token unconfigured, raises 503.", bold_prefix="2. Service Authentication: ")
    add_bullet(doc, "lifespan(_app): Asynchronous context manager. Asserts that ML_SERVICE_TOKEN is defined at startup; if absent, raises RuntimeError and halts server bootstrap.", bold_prefix="3. Lifespan Assertion: ")
    add_bullet(doc, "app: Instantiates FastAPI(title='Inventory ML Service', version='0.1.0'). Adds CORSMiddleware configured with CLIENT_URL (:5173) and SERVER_URL (:5000).", bold_prefix="4. App Factory: ")
    add_bullet(doc, "Mounts 6 feature routers with service_auth dependency [Depends(require_service_token)]: forecast_router, risk_router, insights_router, explain_router, simulate_router, performance_router.", bold_prefix="5. Router Mounting: ")
    add_bullet(doc, "health(): Unprotected GET /health probe returning { status: 'ok', service: 'ml-service', timestamp: ISO8601 }.", bold_prefix="6. Health Probe: ")

    # 2. app/preprocessing.py
    add_heading_3(doc, "3.2.2 ml-service/app/preprocessing.py")
    add_file_info_table(doc,
        path="ml-service/app/preprocessing.py",
        purpose="Data ingestion, cleaning, weekly calendar aggregation, feature engineering (19 features), and time-based train/test splitting.",
        deps="pandas, numpy, math",
        used_by="app/baseline.py, app/train_forecast.py, app/forecasting.py, tests/test_preprocessing.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "SPLIT_DATE = '2026-04-13': Defines rigid time-based split (first 18 months train, last 6 months test, Monday boundary). Never randomized.", bold_prefix="1. Split Constant: ")
    add_bullet(doc, "load_raw(data_dir): Reads products.csv, sales.csv, suppliers.csv, purchase_orders.csv into Pandas DataFrames.", bold_prefix="2. Raw Loader: ")
    add_bullet(doc, "clean_sales(df): Drops duplicates, clips negative units_sold to 0, ensures continuous daily calendar by reindexing per product and filling missing days with 0.", bold_prefix="3. Daily Sanitization: ")
    add_bullet(doc, "holiday_flags(dates): Computes binary flags for national holidays and festival windows (e.g., Diwali).", bold_prefix="4. Holiday Tagger: ")
    add_bullet(doc, "aggregate_weekly(sales_df): Groups daily transactions into complete Monday-to-Sunday ISO weeks. Drops incomplete boundary weeks.", bold_prefix="5. Weekly Aggregation: ")
    add_bullet(doc, "add_features(df): Computes 19 engineered features strictly using historical weeks (lags 1, 2, 3, 4, 8; rolling 4w/8w means and standard deviations; growth_4_8 = mean4 / mean8; cv_8 = std8 / mean8; calendar sin/cos week of year; promo_days; price; lead_time_days). Lags strictly avoid target-week leakage.", bold_prefix="6. Feature Pipeline: ")
    add_bullet(doc, "build_weekly_dataset(data_dir): Orchestrates complete pipeline and returns cleaned, feature-rich weekly DataFrame.", bold_prefix="7. Master Builder: ")

    # 3. app/evaluation.py
    add_heading_3(doc, "3.2.3 ml-service/app/evaluation.py")
    add_file_info_table(doc,
        path="ml-service/app/evaluation.py",
        purpose="Computes standard statistical forecast accuracy metrics (MAE, RMSE, MAPE, WAPE).",
        deps="numpy",
        used_by="app/baseline.py, app/train_forecast.py, app/performance.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "mae(actual, pred): Mean Absolute Error = mean(|actual - pred|).", bold_prefix="1. mae(): ")
    add_bullet(doc, "rmse(actual, pred): Root Mean Squared Error = sqrt(mean((actual - pred)^2)).", bold_prefix="2. rmse(): ")
    add_bullet(doc, "mape(actual, pred): Mean Absolute Percentage Error = mean(|actual - pred| / actual) * 100 for actual > 0. Ignores zero-actual weeks to avoid division by zero.", bold_prefix="3. mape(): ")
    add_bullet(doc, "wape(actual, pred): Weighted Absolute Percentage Error = sum(|actual - pred|) / sum(actual) * 100. Stable metric for retail demand across varied product scales.", bold_prefix="4. wape(): ")
    add_bullet(doc, "summarize(actual, pred): Returns dict containing all 4 metrics rounded to 2 decimal places.", bold_prefix="5. summarize(): ")

    # 4. app/baseline.py
    add_heading_3(doc, "3.2.4 ml-service/app/baseline.py")
    add_file_info_table(doc,
        path="ml-service/app/baseline.py",
        purpose="Calculates heuristic baseline models (Naive, 4-Week Moving Average, Seasonal Naive) on the held-out test split.",
        deps="app/preprocessing.py, app/evaluation.py, json",
        used_by="Invoked via python -m app.baseline; outputs models/baseline_metrics.json"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "make_predictions(df, mode): Evaluates three heuristic algorithms: Naive (pred = lag 1), 4-Week Moving Average (pred = mean of lags 1..4), and Seasonal Naive (pred = lag 52 from same week prior year).", bold_prefix="1. Benchmarking: ")
    add_bullet(doc, "Evaluates both one-step-ahead (rolling actuals) and static multi-step regimes.", bold_prefix="2. Evaluation Modes: ")
    add_bullet(doc, "main(): Executes evaluation on test split (weeks >= SPLIT_DATE). Serializes results to models/baseline_metrics.json (e.g., 4-week MA achieved ~18.38% WAPE and ~22.54% MAPE at horizon 1).", bold_prefix="3. Metric Persistence: ")

    # 5. app/forecasting.py & app/train_forecast.py
    add_heading_3(doc, "3.2.5 ml-service/app/forecasting.py & app/train_forecast.py")
    add_file_info_table(doc,
        path="ml-service/app/forecasting.py & ml-service/app/train_forecast.py",
        purpose="Multi-horizon direct demand forecasting models (h=1, 2, 3 weeks), scale-free target normalization, inference, and joblib model persistence.",
        deps="app/preprocessing.py, app/evaluation.py, scikit-learn (HistGradientBoostingRegressor, RandomForestRegressor), joblib",
        used_by="app/routes_forecast.py, app/insights.py, tests/test_forecasting.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Direct Multi-Horizon Strategy: Fits independent regression models for forecast horizons h=1, h=2, and h=3 weeks ahead, matching typical retail lead times (4 to 18 days).", bold_prefix="1. Multi-Horizon: ")
    add_bullet(doc, "Scale-Free Target Formulation: Target = units[t+h] / mean_8w[t]. Normalizing by the product's recent 8-week sales scale enables a single unified model to accurately predict both fast-moving (e.g. 500 units/wk) and slow-moving items (e.g. 10 units/wk). Sample weight = scale, optimizing loss for WAPE.", bold_prefix="2. Target Normalization: ")
    add_bullet(doc, "Algorithm Selection: Evaluates HistGradientBoostingRegressor(loss='absolute_error') against RandomForestRegressor on a 13-week validation fold. HistGradientBoosting consistently wins on WAPE (h=1: 16.33% vs ma4 18.38%; h=2: 16.99%; h=3: 17.46%).", bold_prefix="3. Model Selection: ")
    add_bullet(doc, "Prediction Intervals: Computes empirical 80% prediction intervals (10th to 90th percentiles of validation residuals) stored per horizon.", bold_prefix="4. Prediction Intervals: ")
    add_bullet(doc, "lead_time_demand(product_id, lead_time_days, promo_weeks): Scales weekly predictions to lead-time duration: LTD = (weekly_forecast / 7) * lead_time_days.", bold_prefix="5. Lead-Time Demand: ")
    add_bullet(doc, "train_forecast.py main(): Fits models, computes test metrics, serializes models to models/forecast_models.joblib and metrics to models/forecast_metrics.json.", bold_prefix="6. Model Saving: ")

    # 6. app/risk.py & app/train_risk.py
    add_heading_3(doc, "3.2.6 ml-service/app/risk.py & app/train_risk.py")
    add_file_info_table(doc,
        path="ml-service/app/risk.py & ml-service/app/train_risk.py",
        purpose="Binary stockout risk classification, rolling feature extraction, Platt calibration, and F1 threshold tuning.",
        deps="scikit-learn (RandomForestClassifier, LogisticRegression, CalibratedClassifierCV), joblib",
        used_by="app/routes_risk.py, app/insights.py, app/explain.py, app/simulator.py, tests/test_risk.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Forward-Looking Label: stockout_label[t] = 1 if stock[t] < lead_time_demand(t+1..t+L) + safety_stock(t). Label looks forward over lead time L, while all 11 model features look strictly backward up to day t.", bold_prefix="1. Risk Label: ")
    add_bullet(doc, "11 Backward-Looking Features: stock_ratio, cover_ltd, cover_days, mean7_ratio, growth_28_90, cv_60, lead_time_days, supplier_on_time_rate, supplier_recent_delay, sin_day, cos_day.", bold_prefix="2. Features: ")
    add_bullet(doc, "Purged Time Split: Purges training rows whose label evaluation window crosses into the test period (SPLIT_DATE).", bold_prefix="3. Purged Split: ")
    add_bullet(doc, "Platt Scaling Calibration: Fits CalibratedClassifierCV(method='sigmoid', cv='prefit') on validation fold, ensuring predicted probabilities reflect true empirical stockout frequencies.", bold_prefix="4. Probability Calibration: ")
    add_bullet(doc, "Baseline Comparison: Evaluates against heuristic rule baseline 'stock_ratio < 1.0'. Produces precision, recall, F1, ROC-AUC, and PR-AUC saved to models/risk_metrics.json.", bold_prefix="5. Evaluation & Export: ")

    # 7. app/trend.py
    add_heading_3(doc, "3.2.7 ml-service/app/trend.py")
    add_file_info_table(doc,
        path="ml-service/app/trend.py",
        purpose="Detects year-over-year sales trends and 52-week seasonality patterns using statistical hypothesis tests.",
        deps="statsmodels, pandas, numpy, scipy.stats",
        used_by="app/routes_risk.py, app/insights.py, tests/test_trend.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Year-Over-Year Differencing: Computes 52-week differenced series: diff_52[t] = sales[t] - sales[t-52]. Differencing exactly 52 weeks cancels any recurring annual seasonality, isolating genuine long-term trend without seasonal bias.", bold_prefix="1. YoY Differencing: ")
    add_bullet(doc, "Trend Classification: Classifies as 'increasing' or 'decreasing' if relative change >= 15% and z-statistic >= 2.0 (p < 0.05); otherwise 'stable'.", bold_prefix="2. Trend Test: ")
    add_bullet(doc, "Seasonality Detection: Subtracts trend component, computes lag-52 autocorrelation coefficient (r). If r >= 0.30 and p < 0.05, tags as 'seasonal'. Identifies peak month (1..12) and seasonal uplift factor.", bold_prefix="3. Seasonality Test: ")
    add_bullet(doc, "Composite Pattern: Outputs classification: 'stable', 'increasing', 'decreasing', 'seasonal', 'increasing + seasonal', or 'decreasing + seasonal'. Generates models/trend_report.csv.", bold_prefix="4. Pattern Synthesis: ")

    # 8. app/decision.py
    add_heading_3(doc, "3.2.8 ml-service/app/decision.py")
    add_file_info_table(doc,
        path="ml-service/app/decision.py",
        purpose="Deterministic supply chain intelligence: safety stock formulas, smart reorder quantities, ABC-XYZ analysis, and supplier reliability.",
        deps="pandas, numpy, math",
        used_by="app/insights.py, app/routes_insights.py, app/simulator.py, tests/test_decision.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "safety_stock(lead_time, sigma_d, d, sigma_lt, z=1.65): Advanced safety stock formula incorporating both demand variance and supplier lead-time variance: SS = 1.65 * sqrt(LT * sigma_d^2 + d^2 * sigma_lt^2). If supplier has zero delivery variance (sigma_lt = 0), reduces to classic 1.65 * sigma_d * sqrt(LT).", bold_prefix="1. safety_stock(): ")
    add_bullet(doc, "smart_reorder(forecast_ltd, safety_stock, stock, on_order, supplier_reliability, supplier_avg_delay, daily_demand): Reorder point ROP = forecast_ltd + delay_demand + SS * buffer_penalty. Suggested order = max(0, ceil(ROP - (stock + on_order))). Buffer penalty increases dynamically for unreliable suppliers (1 + 0.5 * (1 - reliability/100)).", bold_prefix="2. smart_reorder(): ")
    add_bullet(doc, "abc_classify(revenue_series): Pareto analysis. Ranks products by annual revenue. Class A (cumulative share <= 70%), Class B (70% < share <= 90%), Class C (remaining 10%). 100% agreement with scenario ground truth.", bold_prefix="3. abc_classify(): ")
    add_bullet(doc, "xyz_classify(cv_series): Demand predictability clustering via coefficient of variation of weekly demand: Class X (CV < 0.25, steady), Class Y (0.25 <= CV < 0.35, variable), Class Z (CV >= 0.35, erratic).", bold_prefix="4. xyz_classify(): ")
    add_bullet(doc, "supplier_scores(po_df): Evaluates delivered POs. Scores 0-100: on-time delivery rate (40%), average delay severity (25%), lead-time standard deviation (20%), and defect/quality issue rate (15%). Shrinks metrics toward empirical prior (5 pseudo-orders) to avoid small-sample distortion. Risk score = 100 - reliability.", bold_prefix="5. supplier_scores(): ")

    # 9. app/health.py
    add_heading_3(doc, "3.2.9 ml-service/app/health.py")
    add_file_info_table(doc,
        path="ml-service/app/health.py",
        purpose="Pure mathematical scoring functions: 0-100 inventory health score and cover-margin alert prioritization.",
        deps="math",
        used_by="app/insights.py, app/simulator.py, tests/test_health.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "cover_score(stock_ratio, days_of_cover): Evaluates stock coverage. Maps stock ratio (0 -> 0, 1 -> 30, 2 -> 100). Above 90 days of cover, begins penalizing overstock, declining to 35 at 250 days.", bold_prefix="1. cover_score(): ")
    add_bullet(doc, "stability_score(cv): Demand stability score = 100 * (1 - cv / 0.8), clamped between 0 and 100.", bold_prefix="2. stability_score(): ")
    add_bullet(doc, "health_score(stock_ratio, days_of_cover, risk_pct, supplier_reliability, weekly_cv): Fuses four weighted operational components: 55% stock cover + 15% risk safety (100 - risk_pct) + 15% supplier reliability + 15% demand stability. Output ranges 0 to 100.", bold_prefix="3. health_score(): ")
    add_bullet(doc, "health_status(score): Discrete categorisation: Critical (< 40), Warning (40 <= score < 70), Healthy (>= 70).", bold_prefix="4. health_status(): ")
    add_bullet(doc, "alert_priority(margin_days): Evaluates cover margin = days_of_cover - replenishment_days. Categorises urgency: Critical (< 0 days, stockout before delivery), High (< 5 days), Medium (< 15 days), Low (>= 15 days).", bold_prefix="5. alert_priority(): ")

    # 10. app/insights.py
    add_heading_3(doc, "3.2.10 ml-service/app/insights.py")
    add_file_info_table(doc,
        path="ml-service/app/insights.py",
        purpose="Master analytical synthesis engine; combines forecasting, risk classification, decision rules, and health scoring into unified per-product payloads.",
        deps="app/forecasting.py, app/risk.py, app/trend.py, app/decision.py, app/health.py",
        used_by="app/routes_insights.py, server/src/controllers/insightsController.js"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "_open_pos(orders_df, as_of): Reconciles open POs from CSV. Filters status in ['Pending', 'In Transit']. Correctly excludes 'Delivered' and 'Cancelled' orders. Calculates remaining units (qty_ordered - qty_received) and earliest expected delivery date.", bold_prefix="1. _open_pos(): ")
    add_bullet(doc, "insights_for_product(product_id, stock_override, on_order_override, expected_delivery_date_override): Synthesizes single product intelligence. Computes 3-week demand forecast, lead-time demand, calibrated risk %, health score, alert priority, and smart reorder quantities using live overrides when supplied by Express.", bold_prefix="2. insights_for_product(): ")
    add_bullet(doc, "_alerts(stockout, reorder, health, supplier): Generates structured alert notifications (stockout_before_delivery, reorder_now, overstock, high_risk_supplier) tagged with urgency and plain-language descriptions.", bold_prefix="3. _alerts(): ")
    add_bullet(doc, "all_insights(): Computes insights across all 40 products in catalog, returning aggregated summary cards and product tables.", bold_prefix="4. all_insights(): ")

    # 11. app/explain.py
    add_heading_3(doc, "3.2.11 ml-service/app/explain.py")
    add_file_info_table(doc,
        path="ml-service/app/explain.py",
        purpose="Explainable AI engine generating feature attributions and plain-language explanations using SHAP and linear log-odds decomposition.",
        deps="shap, numpy, app/risk.py",
        used_by="app/routes_explain.py, server/src/controllers/insightsController.js, tests/test_explain.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "contributions(clf, x_scaled): For Logistic Regression models, computes exact feature contributions in log-odds space: contribution_i = coef_i * x_scaled_i. For Random Forest models, initializes shap.TreeExplainer(clf) to compute Shapley values.", bold_prefix="1. Attribution Computation: ")
    add_bullet(doc, "group_contributions(raw_contribs): Aggregates raw feature attributions into 4 intuitive business buckets: 'Current Stock Position', 'Demand Surge & Volatility', 'Supplier Reliability & Delay', and 'Lead Time Exposure'.", bold_prefix="2. Business Grouping: ")
    add_bullet(doc, "_reason(feature, value, contribution): Maps numerical feature values and signs to human-readable explanations (e.g. 'Current stock of 45 units provides only 3.2 days of cover against anticipated demand').", bold_prefix="3. Plain-Language Mapping: ")
    add_bullet(doc, "explain_risk(product_id, stock_override): Public entry point; constructs feature vector, evaluates attribution, and returns top positive risk drivers.", bold_prefix="4. explain_risk(): ")

    # 12. app/anomaly.py
    add_heading_3(doc, "3.2.12 ml-service/app/anomaly.py")
    add_file_info_table(doc,
        path="ml-service/app/anomaly.py",
        purpose="Unsupervised and rule-based anomaly detection engine identifying sales spikes, sudden zero sales, inventory count mismatches, and severe supplier delays.",
        deps="scikit-learn (IsolationForest), pandas, numpy, joblib",
        used_by="app/routes_explain.py, tests/test_anomaly.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Scale-Free Sales Features: Computes sales_ratio (units / mean28), sales_z ((units - mean28) / std28), and zero_surprise (zero day * (1 - zero_rate_28)). Normalization allows one unified model across fast and slow items.", bold_prefix="1. Sales Features: ")
    add_bullet(doc, "Stock Count Residuals: Evaluates daily residual e_t = stock[t-1] - stock[t] - units[t]. A physical inventory count error reverses on the following day (a 'blip'), whereas a true shipment receipt does not.", bold_prefix="2. Stock Features: ")
    add_bullet(doc, "fit_iforest(X_train, contamination): Trains Isolation Forest (300 estimators) on training period. Evaluates against ground-truth is_anomaly in test set.", bold_prefix="3. Model Training: ")
    add_bullet(doc, "recent_anomalies(days, product_id, limit, kind): Returns reverse-chronological list of detected anomalies across the catalog. Evaluates both Isolation Forest detections and rule-based baselines (sales |z| >= 3, stock blip >= 1.0, supplier delay >= 15 days). Provides plain-language descriptions with exact metrics.", bold_prefix="4. Anomaly Query: ")

    # 13. app/simulator.py
    add_heading_3(doc, "3.2.13 ml-service/app/simulator.py")
    add_file_info_table(doc,
        path="ml-service/app/simulator.py",
        purpose="What-If inventory simulation engine computing comparative impact of demand shifts, supplier delays, stock changes, and 30-day inventory projections.",
        deps="app/insights.py, app/forecasting.py, app/risk.py, app/decision.py, app/health.py",
        used_by="app/routes_simulate.py, tests/test_simulator.py, tests/test_simulate_all.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Dual State Evaluation: Evaluates 'before' baseline and 'after' scenario using identical analytical formulas from app/insights.py.", bold_prefix="1. Baseline & Scenario: ")
    add_bullet(doc, "Demand Scaling: Adjusts forecast by (1 + demand_change_pct / 100). Scales trailing 28-day sales history so risk model observes the simulated demand intensity.", bold_prefix="2. Demand Perturbation: ")
    add_bullet(doc, "Lead-Time Delay Shift: Adds extra_supplier_delay_days to effective lead time, shifting arrival dates of both open POs and proposed reorders.", bold_prefix="3. Delay Perturbation: ")
    add_bullet(doc, "project_stock(start_stock, daily_demand, arriving_orders, days=30): Iterates day-by-day over 30 days. Subtracts daily demand, credits arriving shipments, and records stock levels. Detects first shortfall day (stock < 0) and computes cumulative units short.", bold_prefix="4. 30-Day Projection: ")
    add_bullet(doc, "simulate(product_id, ...): Master routine returning before/after comparison (risk %, health, alert priority, stockout date, reorder qty) and 30-day projection curves.", bold_prefix="5. simulate(): ")

    # 14. app/performance.py
    add_heading_3(doc, "3.2.14 ml-service/app/performance.py")
    add_file_info_table(doc,
        path="ml-service/app/performance.py",
        purpose="Loads and validates persisted model evaluation metrics (JSON artifacts and CSV reports) for frontend visualization.",
        deps="json, os, pandas, numpy",
        used_by="app/routes_performance.py, tests/test_performance.py"
    )
    add_paragraph(doc, "Code Explanation (Top to Bottom):", bold_prefix="Execution Flow: ")
    add_bullet(doc, "Artifact Verification: Reads baseline_metrics.json, forecast_metrics.json, risk_metrics.json, anomaly_metrics.json, and trend_report.csv from models/.", bold_prefix="1. File Reader: ")
    add_bullet(doc, "_clean(obj): Traverses parsed JSON structures, replacing non-standard NaN and Infinity float values with None to ensure valid JSON serialization.", bold_prefix="2. NaN Sanitizer: ")
    add_bullet(doc, "_trend_agreement(report_df, data_dir): Compares computed trend and seasonality classes against scenario_labels.csv ground truth, reporting percentage agreement.", bold_prefix="3. Ground-Truth Check: ")
    add_bullet(doc, "load_performance(): Aggregates all model metrics into a structured dictionary. If any file is missing, records its filename and the exact CLI command required to regenerate it.", bold_prefix="4. Master Loader: ")

    # 15. FastAPI Routers & Data Generators
    add_heading_3(doc, "3.2.15 FastAPI Feature Routers & Synthetic Data Generator")
    add_paragraph(doc, "The ML service exposes 6 routers and 2 foundational data scripts:")
    add_bullet(doc, "ml-service/app/routes_forecast.py: Defines POST /forecast. Accepts ForecastRequest(product_id, promo_weeks, price_override). Returns weekly forecasts with 80% bounds and lead-time demand.", bold_prefix="routes_forecast.py: ")
    add_bullet(doc, "ml-service/app/routes_risk.py: Defines POST /risk, GET /risk/all, POST /trend, and GET /trend/all. Serves stockout risk probabilities and YoY trend classifications.", bold_prefix="routes_risk.py: ")
    add_bullet(doc, "ml-service/app/routes_insights.py: Defines POST /insights (accepts live stock and open PO overrides), GET /insights/all, and GET /supplier-risk.", bold_prefix="routes_insights.py: ")
    add_bullet(doc, "ml-service/app/routes_explain.py: Defines POST /explain (SHAP risk explanation) and GET /anomalies (query filters for days, product_id, limit, kind).", bold_prefix="routes_explain.py: ")
    add_bullet(doc, "ml-service/app/routes_simulate.py: Defines POST /simulate (single product scenario) and POST /simulate/all (portfolio-wide shock simulation).", bold_prefix="routes_simulate.py: ")
    add_bullet(doc, "ml-service/app/routes_performance.py: Defines GET /model-performance returning holdout evaluation metrics.", bold_prefix="routes_performance.py: ")
    add_bullet(doc, "ml-service/data/generate_data.py: Reproducible synthetic dataset generator (Random Seed 42). Synthesizes 40 products, 8 suppliers, 730 days of daily sales (29,200 rows), stock history, 398 POs, and planted scenarios (spikes, stockouts, count errors, extreme delays). Outputs 7 CSV files.", bold_prefix="generate_data.py: ")
    add_bullet(doc, "ml-service/data/validate_data.py: Statistical test script verifying dataset integrity: asserts no negative sales/stock, validates ABC-XYZ distributions, checks supplier delay profiles, and generates data/plots/sample_products.png.", bold_prefix="validate_data.py: ")
