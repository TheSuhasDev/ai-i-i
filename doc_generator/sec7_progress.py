from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_table_custom
)

def render_section_7(doc):
    add_heading_1(doc, "7. Day-wise Development Progress Mapping")
    
    add_paragraph(doc, 
        "The project was engineered systematically against an intensive 15-day implementation roadmap. "
        "The following section maps every milestone, delivered component, and verified deliverable directly to the "
        "repository codebase."
    )

    progress_table_data = [
        ["Day 1", "Monorepo Setup & Architecture", "Completed", "Monorepo layout, Express+Mongoose skeleton, Vite+React client, FastAPI skeleton, health probes, .env templates."],
        ["Day 2", "Data Models & Synthetic Generator", "Completed", "Mongoose models (User, Supplier, Product, Inventory, Sale, PO); seed 42 dataset generator producing 7 CSV files; data validator."],
        ["Day 3", "Backend CRUD & Authentication", "Completed", "JWT auth, Zod validation, generic crudFactory, seed script populating 3 users, 8 suppliers, 40 products, 29,200 sales."],
        ["Day 4", "Frontend Application Shell", "Completed", "Axios client layer with JWT interceptors, AuthProvider, ProtectedRoute, Layout sidebar, CRUD list grids, and form pages."],
        ["Day 5", "Data Prep & Baseline Forecasting", "Completed", "Weekly aggregation, 19 lag/rolling features, time-based split, evaluation metrics, heuristic baselines (Naive, 4w MA)."],
        ["Day 6", "Demand Forecasting Models", "Completed", "Direct multi-horizon models (h=1,2,3), scale-free target normalization, HistGradientBoosting vs RF, 80% intervals, POST /forecast."],
        ["Day 7", "Stockout Risk & Trend Detection", "Completed", "Platt calibrated risk classifier, YoY 52-week differenced trend, lag-52 autocorrelation seasonality, POST /risk, POST /trend."],
        ["Day 8", "Decision Intelligence Engine", "Completed", "Advanced safety stock (with lead-time variance), smart reorder with reliability penalties, ABC Pareto, XYZ demand volatility."],
        ["Day 9", "Health Score, Alerts & Integration", "Completed", "0-100 inventory health score, replenishment margin alert prioritization, mlService.js client, Insight upsert, /api/insights."],
        ["Day 10", "Executive Dashboard & Analytics", "Completed", "KPI overview cards, health distribution chart, 3x3 ABC-XYZ matrix, urgent items table, Recharts forecast visualization."],
        ["Day 11", "Explainable AI & Anomaly Detection", "Completed", "Isolation Forest for sales spikes/stock count errors, SHAP risk attribution panel, GET /api/anomalies, Anomalies audit page."],
        ["Day 12", "What-If Scenario Simulator", "Completed", "Demand shock, delay shock, stock/order adjustments, 30-day daily stock trajectory projection, POST /api/simulator, Simulator view."],
        ["Day 13", "Model Performance & AI Assistant", "Completed", "Holdout validation performance page, 10 read-only assistant tools, Groq/OpenAI tool-calling, Facts vs Recommendation separation."],
        ["Day 14", "Testing, Security & PO Reconciliation", "Completed", "Open PO status/qty reconciliation (Pending/In Transit fix), JWT strength validation, ML service token auth (X-Service-Token), 66 passing tests."],
        ["Day 15", "Comprehensive Documentation & Audit", "Completed", "Full-stack code audit, Word documentation generation (PROJECT_DOCUMENTATION.docx), API references, and deployment guides."]
    ]
    add_table_custom(doc, ["Development Day", "Milestone Focus", "Status", "Delivered Code & Architectural Features"], progress_table_data, [Inches(1.2), Inches(1.8), Inches(1.1), Inches(2.9)])

    add_heading_2(doc, "7.1 Detailed Daily Implementation Records")
    
    add_paragraph(doc, "Days 1–4: Core Foundation & Monorepo Infrastructure", bold_prefix="Phase 1: ")
    add_bullet(doc, "Established three running runtime environments: React/Vite on port 5173, Express API gateway on port 5000, and FastAPI ML service on port 8000.", bold_prefix="Day 1: ")
    add_bullet(doc, "Engineered seed 42 synthetic dataset generator in ml-service/data/generate_data.py producing 29,200 daily sales transactions across 40 products and 8 suppliers over a 730-day timeline. Planted realistic demand patterns, supplier delays, and inventory scenarios.", bold_prefix="Day 2: ")
    add_bullet(doc, "Implemented secure HS256 JWT authentication with bcrypt 10-round password hashing, Zod schema validation, central error handling, and reusable generic CRUD controllers. Populated MongoDB via npm run seed.", bold_prefix="Day 3: ")
    add_bullet(doc, "Delivered React 19 single-page application shell featuring role-based route guards, Axios interceptors, responsive navigation sidebar, and operational list/form views for catalog entities.", bold_prefix="Day 4: ")

    add_paragraph(doc, "Days 5–8: Machine Learning & Decision Intelligence", bold_prefix="Phase 2: ")
    add_bullet(doc, "Engineered 19 time-series lag and rolling features in ml-service/app/preprocessing.py with strict Monday-to-Sunday weekly aggregation. Established strict time-based split at 2026-04-13. Evaluated Naive and Moving Average baselines.", bold_prefix="Day 5: ")
    add_bullet(doc, "Trained direct multi-horizon regression models for horizons 1, 2, and 3 weeks. Normalized targets by 8-week baseline scale. HistGradientBoosting beat Random Forest across all horizons (h=1 WAPE 16.33% vs ma4 18.38%). Serialized forecast_models.joblib.", bold_prefix="Day 6: ")
    add_bullet(doc, "Constructed forward-looking stockout risk label. Trained class-weighted classifier with Platt calibration on validation fold. Detected long-term trend via YoY 52-week differencing and seasonality via lag-52 autocorrelation.", bold_prefix="Day 7: ")
    add_bullet(doc, "Formulated deterministic decision rules in ml-service/app/decision.py: safety stock factoring lead-time variance, smart reorder quantities penalizing unreliable suppliers, ABC Pareto revenue ranking, and XYZ demand volatility clustering.", bold_prefix="Day 8: ")

    add_paragraph(doc, "Days 9–13: Decision Support, UI & Explainable AI", bold_prefix="Phase 3: ")
    add_bullet(doc, "Engineered 0-100 inventory health score and cover-margin alert prioritization in ml-service/app/health.py. Created mlService.js HTTP client and Insight collection in MongoDB, persisting latest computed states.", bold_prefix="Day 9: ")
    add_bullet(doc, "Built interactive executive Dashboard with KPI cards, 3x3 ABC-XYZ matrix, health score distribution, and urgent alerts table. Added ForecastChart with stacked 80% prediction interval bands.", bold_prefix="Day 10: ")
    add_bullet(doc, "Implemented Isolation Forest anomaly detectors on scale-free sales and stock residual features. Created SHAP WhyPanel component rendering top predictive risk factors in plain English.", bold_prefix="Day 11: ")
    add_bullet(doc, "Delivered What-If Simulator with interactive sliders for demand surges, supplier delays, stock changes, and order quantities, computing side-by-side metrics and 30-day stock depletion projections.", bold_prefix="Day 12: ")
    add_bullet(doc, "Created ML Model Performance view loading verified holdout test metrics. Implemented conversational AI assistant with 10 deterministic read-only database tools, strictly separating Facts from Recommendations.", bold_prefix="Day 13: ")

    add_paragraph(doc, "Days 14–15: Security Hardening, PO Bug Fix & Project Documentation", bold_prefix="Phase 4: ")
    add_bullet(doc, "Resolved Purchase Order reconciliation gap: created openPurchaseOrders.js to aggregate Pending and In Transit PO quantities, excluding Delivered and Cancelled orders, and selecting earliest expected delivery dates. Added regression unit test.", bold_prefix="Day 14: ")
    add_bullet(doc, "Enforced mandatory startup JWT_SECRET strength validation (>= 32 chars, rejecting default placeholders). Protected all non-health FastAPI ML endpoints using X-Service-Token header authentication.", bold_prefix="Day 14: ")
    add_bullet(doc, "Validated entire test suite (66 pytest tests passing, Node.js native tests passing, clean Vite build). Generated comprehensive PROJECT_DOCUMENTATION.docx covering every source file.", bold_prefix="Day 15: ")
