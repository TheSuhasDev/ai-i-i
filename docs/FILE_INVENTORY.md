# Complete Project File Inventory
> **Audit Verification Record**: Every source file in the repository mapped for complete coverage.
**Total Source Files Documented**: 247

---
## 1. Server Tier (Node.js & Express REST API) (52 files)

| # | Relative File Path | Language / Type | Role / Functional Scope |
| :-: | :--- | :--- | :--- |
| 1 | server/.env | Text | Source File |
| 2 | server/.env.example | Environment Template | Source File |
| 3 | server/eslint.config.js | JavaScript (Node.js) | Build / Linter / Server Configuration |
| 4 | server/package-lock.json | JSON Configuration / Data | Source File |
| 5 | server/package.json | JSON Configuration / Data | Source File |
| 6 | server/src/config/db.js | JavaScript (Node.js) | Build / Linter / Server Configuration |
| 7 | server/src/controllers/authController.js | JavaScript (Node.js) | API Controller (Request orchestration) |
| 8 | server/src/controllers/crudFactory.js | JavaScript (Node.js) | API Controller (Request orchestration) |
| 9 | server/src/controllers/insightsController.js | JavaScript (Node.js) | API Controller (Request orchestration) |
| 10 | server/src/index.js | JavaScript (Node.js) | Source File |
| 11 | server/src/middleware/auth.js | JavaScript (Node.js) | Express Middleware (Auth, RBAC, Validation) |
| 12 | server/src/middleware/errorHandler.js | JavaScript (Node.js) | Express Middleware (Auth, RBAC, Validation) |
| 13 | server/src/middleware/rateLimiter.js | JavaScript (Node.js) | Express Middleware (Auth, RBAC, Validation) |
| 14 | server/src/middleware/validate.js | JavaScript (Node.js) | Express Middleware (Auth, RBAC, Validation) |
| 15 | server/src/models/AuditLog.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 16 | server/src/models/Insight.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 17 | server/src/models/Inventory.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 18 | server/src/models/Product.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 19 | server/src/models/PurchaseOrder.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 20 | server/src/models/Sale.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 21 | server/src/models/Supplier.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 22 | server/src/models/User.js | JavaScript (Node.js) | Mongoose Data Model & Schema |
| 23 | server/src/routes/anomalies.js | JavaScript (Node.js) | REST API Route declaration |
| 24 | server/src/routes/assistant.js | JavaScript (Node.js) | REST API Route declaration |
| 25 | server/src/routes/auditLogs.js | JavaScript (Node.js) | REST API Route declaration |
| 26 | server/src/routes/auth.js | JavaScript (Node.js) | REST API Route declaration |
| 27 | server/src/routes/crudRouter.js | JavaScript (Node.js) | REST API Route declaration |
| 28 | server/src/routes/health.js | JavaScript (Node.js) | REST API Route declaration |
| 29 | server/src/routes/insights.js | JavaScript (Node.js) | REST API Route declaration |
| 30 | server/src/routes/inventory.js | JavaScript (Node.js) | REST API Route declaration |
| 31 | server/src/routes/mlPerformance.js | JavaScript (Node.js) | REST API Route declaration |
| 32 | server/src/routes/products.js | JavaScript (Node.js) | REST API Route declaration |
| 33 | server/src/routes/purchaseOrders.js | JavaScript (Node.js) | REST API Route declaration |
| 34 | server/src/routes/sales.js | JavaScript (Node.js) | REST API Route declaration |
| 35 | server/src/routes/simulator.js | JavaScript (Node.js) | REST API Route declaration |
| 36 | server/src/routes/supplierRisk.js | JavaScript (Node.js) | REST API Route declaration |
| 37 | server/src/routes/suppliers.js | JavaScript (Node.js) | REST API Route declaration |
| 38 | server/src/scripts/advanceData.js | JavaScript (Node.js) | Source File |
| 39 | server/src/seed/seed.js | JavaScript (Node.js) | Source File |
| 40 | server/src/services/assistant.js | JavaScript (Node.js) | Integration Service (ML client, LLM tool runner) |
| 41 | server/src/services/assistantTools.js | JavaScript (Node.js) | Integration Service (ML client, LLM tool runner) |
| 42 | server/src/services/mlService.js | JavaScript (Node.js) | Integration Service (ML client, LLM tool runner) |
| 43 | server/src/services/openPurchaseOrders.js | JavaScript (Node.js) | Integration Service (ML client, LLM tool runner) |
| 44 | server/src/utils/AppError.js | JavaScript (Node.js) | Source File |
| 45 | server/src/utils/asyncHandler.js | JavaScript (Node.js) | Source File |
| 46 | server/src/validators/schemas.js | JavaScript (Node.js) | Source File |
| 47 | server/test/hardening.test.js | JavaScript (Node.js) | Automated Test Suite |
| 48 | server/test/openPurchaseOrders.test.js | JavaScript (Node.js) | Automated Test Suite |
| 49 | server/test/receivePurchaseOrder.test.js | JavaScript (Node.js) | Automated Test Suite |
| 50 | server/test/salesAndPo.test.js | JavaScript (Node.js) | Automated Test Suite |
| 51 | server/test/staleData.test.js | JavaScript (Node.js) | Automated Test Suite |
| 52 | server/test/syncInTransit.test.js | JavaScript (Node.js) | Automated Test Suite |

---

## 2. Machine Learning Tier (Python 3.10 & FastAPI) (56 files)

| # | Relative File Path | Language / Type | Role / Functional Scope |
| :-: | :--- | :--- | :--- |
| 1 | ml-service/.env | Text | Source File |
| 2 | ml-service/.env.example | Environment Template | Source File |
| 3 | ml-service/app/__init__.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 4 | ml-service/app/anomaly.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 5 | ml-service/app/baseline.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 6 | ml-service/app/decision.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 7 | ml-service/app/evaluation.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 8 | ml-service/app/explain.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 9 | ml-service/app/forecasting.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 10 | ml-service/app/health.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 11 | ml-service/app/insights.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 12 | ml-service/app/main.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 13 | ml-service/app/performance.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 14 | ml-service/app/preprocessing.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 15 | ml-service/app/risk.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 16 | ml-service/app/routes_explain.py | Python 3.10 | REST API Route declaration |
| 17 | ml-service/app/routes_forecast.py | Python 3.10 | REST API Route declaration |
| 18 | ml-service/app/routes_insights.py | Python 3.10 | REST API Route declaration |
| 19 | ml-service/app/routes_performance.py | Python 3.10 | REST API Route declaration |
| 20 | ml-service/app/routes_risk.py | Python 3.10 | REST API Route declaration |
| 21 | ml-service/app/routes_simulate.py | Python 3.10 | REST API Route declaration |
| 22 | ml-service/app/simulator.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 23 | ml-service/app/train_forecast.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 24 | ml-service/app/train_risk.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 25 | ml-service/app/trend.py | Python 3.10 | Machine Learning Engine / Mathematical Rule |
| 26 | ml-service/data/generate_data.py | Python 3.10 | Source File |
| 27 | ml-service/data/inventory_snapshot.csv | CSV Benchmark Dataset | Benchmark Scenario & Training Dataset |
| 28 | ml-service/data/products.csv | CSV Benchmark Dataset | Benchmark Scenario & Training Dataset |
| 29 | ml-service/data/purchase_orders.csv | CSV Benchmark Dataset | Benchmark Scenario & Training Dataset |
| 30 | ml-service/data/sales.csv | CSV Benchmark Dataset | Benchmark Scenario & Training Dataset |
| 31 | ml-service/data/scenario_labels.csv | CSV Benchmark Dataset | Benchmark Scenario & Training Dataset |
| 32 | ml-service/data/stock_history.csv | CSV Benchmark Dataset | Benchmark Scenario & Training Dataset |
| 33 | ml-service/data/suppliers.csv | CSV Benchmark Dataset | Benchmark Scenario & Training Dataset |
| 34 | ml-service/data/validate_data.py | Python 3.10 | Source File |
| 35 | ml-service/models/anomaly_metrics.json | JSON Configuration / Data | Source File |
| 36 | ml-service/models/anomaly_models.joblib | Serialized Model Binary | Source File |
| 37 | ml-service/models/baseline_metrics.json | JSON Configuration / Data | Source File |
| 38 | ml-service/models/forecast_metrics.json | JSON Configuration / Data | Source File |
| 39 | ml-service/models/forecast_models.joblib | Serialized Model Binary | Source File |
| 40 | ml-service/models/risk_metrics.json | JSON Configuration / Data | Source File |
| 41 | ml-service/models/risk_model.joblib | Serialized Model Binary | Source File |
| 42 | ml-service/models/trend_report.csv | CSV Benchmark Dataset | Source File |
| 43 | ml-service/pytest.ini | Configuration | Automated Test Suite |
| 44 | ml-service/requirements.txt | .TXT | Source File |
| 45 | ml-service/tests/test_anomaly.py | Python 3.10 | Automated Test Suite |
| 46 | ml-service/tests/test_decision.py | Python 3.10 | Automated Test Suite |
| 47 | ml-service/tests/test_explain.py | Python 3.10 | Automated Test Suite |
| 48 | ml-service/tests/test_forecasting.py | Python 3.10 | Automated Test Suite |
| 49 | ml-service/tests/test_health.py | Python 3.10 | Automated Test Suite |
| 50 | ml-service/tests/test_open_pos.py | Python 3.10 | Automated Test Suite |
| 51 | ml-service/tests/test_performance.py | Python 3.10 | Automated Test Suite |
| 52 | ml-service/tests/test_preprocessing.py | Python 3.10 | Automated Test Suite |
| 53 | ml-service/tests/test_risk.py | Python 3.10 | Automated Test Suite |
| 54 | ml-service/tests/test_simulate_all.py | Python 3.10 | Automated Test Suite |
| 55 | ml-service/tests/test_simulator.py | Python 3.10 | Automated Test Suite |
| 56 | ml-service/tests/test_trend.py | Python 3.10 | Automated Test Suite |

---

## 3. Client Tier (React 19 & Tailwind CSS) (94 files)

| # | Relative File Path | Language / Type | Role / Functional Scope |
| :-: | :--- | :--- | :--- |
| 1 | client/.env | Text | Source File |
| 2 | client/.env.example | Environment Template | Source File |
| 3 | client/.gitignore | Text | Source File |
| 4 | client/README.md | Markdown Documentation | Source File |
| 5 | client/components.json | JSON Configuration / Data | Reusable React UI Component |
| 6 | client/eslint.config.js | JavaScript (Node.js) | Build / Linter / Server Configuration |
| 7 | client/index.html | HTML Entry Template | Source File |
| 8 | client/package-lock.json | JSON Configuration / Data | Source File |
| 9 | client/package.json | JSON Configuration / Data | Source File |
| 10 | client/src/App.jsx | React 19 (JSX) | Source File |
| 11 | client/src/components/AbcXyzMatrix.jsx | React 19 (JSX) | Reusable React UI Component |
| 12 | client/src/components/AssistantWidget.jsx | React 19 (JSX) | Reusable React UI Component |
| 13 | client/src/components/ChatMessages.jsx | React 19 (JSX) | Reusable React UI Component |
| 14 | client/src/components/CommandPalette.jsx | React 19 (JSX) | Reusable React UI Component |
| 15 | client/src/components/ConfirmModal.jsx | React 19 (JSX) | Reusable React UI Component |
| 16 | client/src/components/ErrorBoundary.jsx | React 19 (JSX) | Reusable React UI Component |
| 17 | client/src/components/Field.jsx | React 19 (JSX) | Reusable React UI Component |
| 18 | client/src/components/ForecastChart.jsx | React 19 (JSX) | Reusable React UI Component |
| 19 | client/src/components/HealthChart.jsx | React 19 (JSX) | Reusable React UI Component |
| 20 | client/src/components/Icon.jsx | React 19 (JSX) | Reusable React UI Component |
| 21 | client/src/components/Layout.jsx | React 19 (JSX) | Reusable React UI Component |
| 22 | client/src/components/MetricCard.jsx | React 19 (JSX) | Reusable React UI Component |
| 23 | client/src/components/NotificationBell.jsx | React 19 (JSX) | Reusable React UI Component |
| 24 | client/src/components/PageHeader.jsx | React 19 (JSX) | Reusable React UI Component |
| 25 | client/src/components/Pagination.jsx | React 19 (JSX) | Reusable React UI Component |
| 26 | client/src/components/Pill.jsx | React 19 (JSX) | Reusable React UI Component |
| 27 | client/src/components/ProductCell.jsx | React 19 (JSX) | Reusable React UI Component |
| 28 | client/src/components/ProductSelect.jsx | React 19 (JSX) | Reusable React UI Component |
| 29 | client/src/components/ProductThumb.jsx | React 19 (JSX) | Reusable React UI Component |
| 30 | client/src/components/ProtectedRoute.jsx | React 19 (JSX) | Reusable React UI Component |
| 31 | client/src/components/SearchBar.jsx | React 19 (JSX) | Reusable React UI Component |
| 32 | client/src/components/StaleDataBanner.jsx | React 19 (JSX) | Reusable React UI Component |
| 33 | client/src/components/WhyPanel.jsx | React 19 (JSX) | Reusable React UI Component |
| 34 | client/src/components/analysis/AnalysisButton.jsx | React 19 (JSX) | Reusable React UI Component |
| 35 | client/src/components/analysis/AnalysisIdle.jsx | React 19 (JSX) | Reusable React UI Component |
| 36 | client/src/components/analysis/AnalysisLoader.jsx | React 19 (JSX) | Reusable React UI Component |
| 37 | client/src/components/analysis/AnalysisReveal.jsx | React 19 (JSX) | Reusable React UI Component |
| 38 | client/src/components/analysis/AnimatedNumber.jsx | React 19 (JSX) | Reusable React UI Component |
| 39 | client/src/components/analysis/index.js | JavaScript (Node.js) | Reusable React UI Component |
| 40 | client/src/components/ui/README.md | Markdown Documentation | Reusable React UI Component |
| 41 | client/src/context/AssistantChatProvider.jsx | React 19 (JSX) | Custom React Hook / Global Context |
| 42 | client/src/context/AuthProvider.jsx | React 19 (JSX) | Custom React Hook / Global Context |
| 43 | client/src/context/ProductImageViewer.jsx | React 19 (JSX) | Custom React Hook / Global Context |
| 44 | client/src/context/ToastContext.jsx | React 19 (JSX) | Custom React Hook / Global Context |
| 45 | client/src/context/assistantChatContext.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 46 | client/src/context/authContext.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 47 | client/src/context/productImageContext.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 48 | client/src/context/toastContextDef.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 49 | client/src/context/useAuth.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 50 | client/src/context/useProductImageViewer.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 51 | client/src/context/useToast.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 52 | client/src/hooks/useAnalysis.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 53 | client/src/hooks/useAssistantChat.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 54 | client/src/hooks/useAssistantChatContext.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 55 | client/src/hooks/useFetch.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 56 | client/src/hooks/useList.js | JavaScript (Node.js) | Custom React Hook / Global Context |
| 57 | client/src/index.css | CSS / Tailwind Styles | Source File |
| 58 | client/src/lib/utils.js | JavaScript (Node.js) | Source File |
| 59 | client/src/main.jsx | React 19 (JSX) | Source File |
| 60 | client/src/pages/Alerts.jsx | React 19 (JSX) | React Application Page View |
| 61 | client/src/pages/Anomalies.jsx | React 19 (JSX) | React Application Page View |
| 62 | client/src/pages/Assistant.jsx | React 19 (JSX) | React Application Page View |
| 63 | client/src/pages/AuditLogs.jsx | React 19 (JSX) | React Application Page View |
| 64 | client/src/pages/Dashboard.jsx | React 19 (JSX) | React Application Page View |
| 65 | client/src/pages/InventoryForm.jsx | React 19 (JSX) | React Application Page View |
| 66 | client/src/pages/InventoryList.jsx | React 19 (JSX) | React Application Page View |
| 67 | client/src/pages/Login.jsx | React 19 (JSX) | React Application Page View |
| 68 | client/src/pages/ModelPerformance.jsx | React 19 (JSX) | React Application Page View |
| 69 | client/src/pages/NotFound.jsx | React 19 (JSX) | React Application Page View |
| 70 | client/src/pages/ProductForm.jsx | React 19 (JSX) | React Application Page View |
| 71 | client/src/pages/ProductInsight.jsx | React 19 (JSX) | React Application Page View |
| 72 | client/src/pages/ProductList.jsx | React 19 (JSX) | React Application Page View |
| 73 | client/src/pages/PurchaseOrderForm.jsx | React 19 (JSX) | React Application Page View |
| 74 | client/src/pages/PurchaseOrderList.jsx | React 19 (JSX) | React Application Page View |
| 75 | client/src/pages/SaleForm.jsx | React 19 (JSX) | React Application Page View |
| 76 | client/src/pages/SaleList.jsx | React 19 (JSX) | React Application Page View |
| 77 | client/src/pages/Settings.jsx | React 19 (JSX) | React Application Page View |
| 78 | client/src/pages/Simulator.jsx | React 19 (JSX) | React Application Page View |
| 79 | client/src/pages/SmartReorder.jsx | React 19 (JSX) | React Application Page View |
| 80 | client/src/pages/SupplierDeliveries.jsx | React 19 (JSX) | React Application Page View |
| 81 | client/src/pages/SupplierForm.jsx | React 19 (JSX) | React Application Page View |
| 82 | client/src/pages/SupplierList.jsx | React 19 (JSX) | React Application Page View |
| 83 | client/src/pages/SupplierRisk.jsx | React 19 (JSX) | React Application Page View |
| 84 | client/src/pages/TrendSeasonality.jsx | React 19 (JSX) | React Application Page View |
| 85 | client/src/services/api.js | JavaScript (Node.js) | Integration Service (ML client, LLM tool runner) |
| 86 | client/src/services/index.js | JavaScript (Node.js) | Integration Service (ML client, LLM tool runner) |
| 87 | client/src/utils/exportCsv.js | JavaScript (Node.js) | Source File |
| 88 | client/src/utils/format.js | JavaScript (Node.js) | Source File |
| 89 | client/src/utils/productImage.js | JavaScript (Node.js) | Source File |
| 90 | client/src/vite-env.d.ts | TypeScript Definition | Source File |
| 91 | client/tsconfig.app.json | JSON Configuration / Data | Build / Linter / Server Configuration |
| 92 | client/tsconfig.json | JSON Configuration / Data | Build / Linter / Server Configuration |
| 93 | client/tsconfig.node.json | JSON Configuration / Data | Build / Linter / Server Configuration |
| 94 | client/vite.config.js | JavaScript (Node.js) | Build / Linter / Server Configuration |

---

## 4. Documentation & Doc Generator Tooling (32 files)

| # | Relative File Path | Language / Type | Role / Functional Scope |
| :-: | :--- | :--- | :--- |
| 1 | doc_generator/builder.py | Python 3.10 | Source File |
| 2 | doc_generator/main.py | Python 3.10 | Source File |
| 3 | doc_generator/sec1_overview.py | Python 3.10 | Source File |
| 4 | doc_generator/sec2_architecture.py | Python 3.10 | Source File |
| 5 | doc_generator/sec3_client.py | Python 3.10 | Source File |
| 6 | doc_generator/sec3_config_root.py | Python 3.10 | Build / Linter / Server Configuration |
| 7 | doc_generator/sec3_ml.py | Python 3.10 | Source File |
| 8 | doc_generator/sec3_server.py | Python 3.10 | Source File |
| 9 | doc_generator/sec4_database.py | Python 3.10 | Source File |
| 10 | doc_generator/sec5_api.py | Python 3.10 | Source File |
| 11 | doc_generator/sec6_setup.py | Python 3.10 | Source File |
| 12 | doc_generator/sec7_progress.py | Python 3.10 | Source File |
| 13 | doc_generator/sec8_limitations.py | Python 3.10 | Source File |
| 14 | doc_generator/sec9_audit_list.py | Python 3.10 | Source File |
| 15 | docs/01_PROJECT_OVERVIEW.md | Markdown Documentation | Source File |
| 16 | docs/02_ARCHITECTURE.md | Markdown Documentation | Source File |
| 17 | docs/03_FILE_BY_FILE_GUIDE.md | Markdown Documentation | Source File |
| 18 | docs/03a_CLIENT_FILES.md | Markdown Documentation | Source File |
| 19 | docs/03b_SERVER_FILES.md | Markdown Documentation | Source File |
| 20 | docs/03c_ML_SERVICE_FILES.md | Markdown Documentation | Source File |
| 21 | docs/04_FEATURE_GUIDE.md | Markdown Documentation | Source File |
| 22 | docs/05_ML_AND_DATA_GUIDE.md | Markdown Documentation | Source File |
| 23 | docs/06_DATABASE_AND_API_GUIDE.md | Markdown Documentation | Source File |
| 24 | docs/07_FRONTEND_GUIDE.md | Markdown Documentation | Source File |
| 25 | docs/08_HOW_EVERYTHING_CONNECTS.md | Markdown Documentation | Source File |
| 26 | docs/09_PROBLEMS_AND_IMPROVEMENTS.md | Markdown Documentation | Source File |
| 27 | docs/10_LEARNING_PATH.md | Markdown Documentation | Source File |
| 28 | docs/AUDIT.md | Markdown Documentation | Source File |
| 29 | docs/FULL_AUDIT.md | Markdown Documentation | Source File |
| 30 | docs/NOTES.md | Markdown Documentation | Source File |
| 31 | docs/PROGRESS.md | Markdown Documentation | Source File |
| 32 | docs/README.md | Markdown Documentation | Source File |

---

## 5. Root Configuration & Project Artifacts (13 files)

| # | Relative File Path | Language / Type | Role / Functional Scope |
| :-: | :--- | :--- | :--- |
| 1 | .gitignore | Text | Source File |
| 2 | CHANGELOG_REVIEW.md | Markdown Documentation | Source File |
| 3 | DEMO_FLOW.md | Markdown Documentation | Source File |
| 4 | PROJECT_DOCUMENTATION.docx | .DOCX | Source File |
| 5 | PROJECT_LEARNING_GUIDE.md | Markdown Documentation | Source File |
| 6 | README.md | Markdown Documentation | Source File |
| 7 | fetch_product_images.py | Python 3.10 | Source File |
| 8 | import_manual.py | Python 3.10 | Source File |
| 9 | package.json | JSON Configuration / Data | Source File |
| 10 | pick.html | HTML Entry Template | Source File |
| 11 | pick_images.py | Python 3.10 | Source File |
| 12 | review_bundle.txt | .TXT | Source File |
| 13 | start-all.bat | .BAT | Source File |

---

