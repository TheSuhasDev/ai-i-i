from docx.shared import Inches, Pt, RGBColor
from doc_generator.builder import (
    add_heading_1, add_heading_2, add_heading_3, add_paragraph,
    add_bullet, add_table_custom, add_callout, COLOR_PRIMARY, COLOR_DARK
)

def render_section_1(doc):
    add_heading_1(doc, "1. Project Overview")
    
    add_paragraph(doc, 
        "The AI-Powered Inventory & Supply Chain Intelligence platform is an enterprise-grade decision-support system "
        "engineered to bridge transactional enterprise resource planning (ERP) workflows with predictive and prescriptive "
        "machine learning algorithms. Built upon a hybrid polyglot architecture combining a MERN stack (MongoDB, Express, React, Node.js) "
        "and a high-performance Python FastAPI machine learning microservice, the system transforms raw historical transaction logs "
        "into real-time operational foresight."
    )
    
    add_heading_2(doc, "1.1 Problem Statement & Core Value Proposition")
    add_paragraph(doc, 
        "Modern inventory and supply chain operations frequently suffer from catastrophic inefficiencies stemming from disconnected systems, "
        "lagging indicators, and heuristic rules of thumb. Specifically, organizations grapple with:",
        bold_prefix="The Operational Challenge: "
    )
    
    add_bullet(doc, "Stockouts of high-velocity, high-margin products during demand surges or supplier lead-time slippage, leading to lost revenue and customer churn.", bold_prefix="Stockout Vulnerability: ")
    add_bullet(doc, "Excess working capital locked in slow-moving or obsolete stock due to untuned, static buffer levels.", bold_prefix="Working Capital Inefficiency: ")
    add_bullet(doc, "Unpredictable supplier delivery schedules where delays, variability, and quality rejection rates are not quantitatively factored into reorder dates.", bold_prefix="Supplier Variance: ")
    add_bullet(doc, "Opaque 'black box' machine learning outputs where procurement managers reject recommendations because predictive rationale is obscured.", bold_prefix="Explainability Gap: ")
    add_bullet(doc, "Manual calculation bottlenecks where evaluating hypothetical demand surges, tariffs, or shipping disruptions requires cumbersome spreadsheet modeling.", bold_prefix="Scenario Rigidity: ")

    add_callout(doc, 
        "The platform establishes an end-to-end intelligence loop: \n"
        "DATA (Sales, Stock, POs, Suppliers) -> PREDICTION (Multi-horizon demand) -> "
        "RISK ANALYSIS (Calibrated stockout classification) -> EXPLANATION (SHAP & linear log-odds attribution) -> "
        "SIMULATION (What-if parameter shifting) -> RECOMMENDATION (Dynamic reorder quantities & priority) -> "
        "BUSINESS ACTION (One-click Purchase Order creation & AI assistant lookup).",
        title="Central Value Chain",
        alert_type="note"
    )

    add_heading_2(doc, "1.2 Target User Personas & Role-Based Access Control (RBAC)")
    add_paragraph(doc, "The platform enforces strict role-based access control across all frontend interfaces and RESTful backend endpoints:")

    rb_data = [
        ["Admin", "Full System Governance", "Has unrestricted access across all resources. Can manage database records, execute destructive deletes, trigger synchronous insight recalculations across the catalog, inspect model performance, and audit raw predictions."],
        ["Manager", "Procurement & Supply Chain Management", "Possesses operational write permissions. Can create and modify Products, Suppliers, and Purchase Orders; trigger intelligent reorder workflows; run What-If simulations; inspect anomaly clusters; and query the AI assistant."],
        ["Staff", "Warehouse & Storefront Operations", "Possesses tactical execution permissions. Configured with read-only visibility into master catalogs, but explicitly authorized to record real-time sales transactions (POST /sales) and update daily shelf stock counts (PUT /inventory/:id)."]
    ]
    add_table_custom(doc, ["Role", "Operational Scope", "System Capabilities & Permissions"], rb_data, [Inches(1.2), Inches(1.8), Inches(3.5)])

    add_heading_2(doc, "1.3 Technology Stack & Verified Package Versions")
    add_paragraph(doc, 
        "All component dependencies and runtimes are pinned to verified versions extracted directly from the repository configuration "
        "files (server/package.json, client/package.json, and ml-service/requirements.txt):"
    )

    tech_data = [
        ["Frontend Tier", "React", "19.2.8", "Core component-driven user interface library with concurrent rendering."],
        ["Frontend Tier", "Vite", "8.3.0", "Next-generation ES-module frontend build tool and local dev server."],
        ["Frontend Tier", "React Router", "7.18.4", "Declarative client-side routing, protected routes, and URL parameter management."],
        ["Frontend Tier", "Recharts", "3.10.1", "Composable SVG charting library used for multi-horizon forecast bands and 30-day stock projections."],
        ["Frontend Tier", "TailwindCSS & Merge", "4.3.3 / 3.7.0", "Utility-first design styling engine and dynamic class resolution."],
        ["Frontend Tier", "Axios", "1.20.0", "Promise-based HTTP client with request/response JWT interceptors."],
        ["Frontend Tier", "Framer Motion", "14.3.0", "Production-ready motion library for fluid UI transitions and modal animations."],
        ["Backend Tier", "Node.js", "20+ LTS", "Asynchronous event-driven JavaScript server runtime."],
        ["Backend Tier", "Express", "5.3.0", "Next-generation web application framework powering RESTful routing and middleware."],
        ["Backend Tier", "Mongoose", "9.11.1", "Object Data Modeling (ODM) library for MongoDB with schema validation and indexing."],
        ["Backend Tier", "Zod", "4.6.6", "TypeScript-first schema declaration and data validation library for API payload defense."],
        ["Backend Tier", "jsonwebtoken", "9.0.3", "HS256 signed JWT generation, authentication, and session claims handling."],
        ["Backend Tier", "bcryptjs", "3.0.3", "Secure password hashing algorithm (10 salt rounds) with zero unmanaged dependencies."],
        ["Backend Tier", "Helmet & CORS", "8.3.0 / 2.8.6", "HTTP security headers and strictly constrained cross-origin resource sharing."],
        ["Database Tier", "MongoDB", "Community / Atlas 7.0+", "NoSQL document database holding catalog, transaction logs, and latest ML insights."],
        ["ML Service Tier", "Python", "3.10+", "Scientific and analytical programming language runtime."],
        ["ML Service Tier", "FastAPI", "0.143.0", "Modern, asynchronous high-performance web framework for Python model serving."],
        ["ML Service Tier", "Uvicorn", "0.54.0", "Lightning-fast ASGI web server implementation."],
        ["ML Service Tier", "Scikit-Learn", "1.7.2", "Machine learning library providing Random Forest, HistGradientBoosting, and Isolation Forest."],
        ["ML Service Tier", "XGBoost", "3.2.0", "Optimized distributed gradient boosting library for non-linear regression."],
        ["ML Service Tier", "SHAP", "0.49.1", "Game-theoretic tree and linear explainability engine for model predictions."],
        ["ML Service Tier", "Statsmodels", "0.15.0", "Time-series decomposition, autocorrelation analysis, and statistical hypothesis testing."],
        ["ML Service Tier", "Pandas & NumPy", "2.3.3 / 2.2.6", "High-performance vector mathematics and tabular data wrangling."],
        ["LLM Assistant", "OpenAI-Compatible", "External Groq/Claude", "Tool-calling conversational engine executing 10 deterministic read-only functions."]
    ]
    add_table_custom(doc, ["Architecture Layer", "Technology", "Version", "Technical Purpose in System"], tech_data, [Inches(1.3), Inches(1.3), Inches(1.1), Inches(2.8)])

    add_heading_2(doc, "1.4 Feature Matrix: Implemented vs. Planned Capabilities")
    add_paragraph(doc, 
        "The following matrix maps the functional capabilities defined in the system specification against the verified code "
        "present in this repository:"
    )

    feat_data = [
        ["Smart Reorder Recommendation", "Implemented", "ml-service/app/decision.py", "Dynamically calculates safety stock, lead-time demand, open PO aggregation, and supplier delay penalties."],
        ["Explainable AI (XAI)", "Implemented", "ml-service/app/explain.py", "Employs SHAP TreeExplainer for Random Forest and exact standardized log-odds for Logistic Regression."],
        ["What-If Inventory Simulator", "Implemented", "ml-service/app/simulator.py", "Simulates demand adjustments, supplier delay shocks, stock shifts, and 30-day stock depletion paths."],
        ["Inventory Health Score (0-100)", "Implemented", "ml-service/app/health.py", "Weighted score fusing stock cover (55%), risk safety (15%), supplier reliability (15%), and demand stability (15%)."],
        ["Supplier Risk & Reliability", "Implemented", "ml-service/app/decision.py", "Multi-factor reliability scoring (on-time rate, delay severity, variance, quality defects) shrunk toward empirical Bayesian prior."],
        ["Intelligent Alert Priority", "Implemented", "ml-service/app/health.py", "Evaluates net cover-minus-replenishment margin: Critical (<0d), High (<5d), Medium (<15d), Low (>=15d)."],
        ["ABC-XYZ Classification", "Implemented", "ml-service/app/decision.py", "Revenue Pareto partitioning (A=70%, B=90%, C=100%) and CV volatility clustering (X<0.25, Y<0.35, Z>=0.35)."],
        ["Demand Trend & Seasonality", "Implemented", "ml-service/app/trend.py", "Year-over-year 52-week differencing (cancels seasonal bias) and detrended lag-52 autocorrelation testing."],
        ["ML Model Performance Dashboard", "Implemented", "ml-service/app/performance.py", "Serves verified holdout validation metrics (MAE, RMSE, MAPE, WAPE, Precision, Recall, F1) from saved JSON files."],
        ["AI Inventory Assistant", "Implemented", "server/src/services/assistant.js", "Tool-calling agent over 10 MongoDB/ML read-only tools, strictly enforcing Facts vs Recommendations separation."],
        ["Anomaly Detection", "Implemented", "ml-service/app/anomaly.py", "Dual-engine detection: Isolation Forest on scale-free sales/stock features + deterministic business threshold rules."],
        ["Product Image Curation Pipeline", "Implemented", "root / fetch_product_images.py", "Pixabay image fetching, manual curation viewer (pick.html), and automated square thumbnail normalizer."],
        ["Distributed Express Rate Limiter", "Planned (Pending)", "server/package.json", "Current limiter is in-memory per user process (20 req / 10 min); production requires Redis-backed express-rate-limit."],
        ["Historical Insight Time-Series", "Planned (Pending)", "server/src/models/Insight.js", "Current Insight model maintains 1 latest snapshot per product (upserted); historical tracking is future scope."]
    ]
    add_table_custom(doc, ["Feature Capability", "Status", "Code Location", "Implementation Summary"], feat_data, [Inches(1.8), Inches(1.1), Inches(1.6), Inches(2.0)])
