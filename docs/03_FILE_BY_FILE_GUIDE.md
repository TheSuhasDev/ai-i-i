# 03. File-by-File Master Guide (Overview & Index)

To ensure that **every single file** in this project is explained thoroughly without skipping details, truncation, or superficial summaries, the File-by-File Guide is divided into three focused, dedicated volumes:

---

## 📑 Volume Directory

| Document | Area Covered | File Count | Description |
|---|---|---|---|
| [03a_CLIENT_FILES.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03a_CLIENT_FILES.md) | **Frontend (client/)** | 48 files | Comprehensive line-by-line breakdown of every React component, page, context provider, custom hook, service, and utility script. |
| [03b_SERVER_FILES.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03b_SERVER_FILES.md) | **Backend (server/)** | 35 files | Comprehensive line-by-line breakdown of every Mongoose model, Express controller, API route, middleware, validator schema, test, and seeding script. |
| [03c_ML_SERVICE_FILES.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03c_ML_SERVICE_FILES.md) | **ML Service (ml-service/)** | 33 files | Comprehensive line-by-line breakdown of every Python module, FastAPI route, data generator, training script, evaluation pipeline, and pytest suite. |

---

## 🎯 Format Used for Every File

Each file entry across the sub-guides adheres strictly to the following 5-point template:

```markdown
### `[Relative Path to File]`
1. **Purpose:** A concise 1-2 line plain-English summary of what this file does.
2. **Key Functions / Components / Classes:**
   - `FunctionName(param1, param2)`:
     - **What it does:** Plain English explanation of the logic.
     - **Inputs:** Data types and descriptions of parameters.
     - **Outputs:** Return value and structure.
3. **Dependencies (Imports & Used By):**
   - **Imports from:** Which local files and npm/pip packages this file pulls in.
   - **Used by:** Which other files in the project import or execute this file.
4. **Line-by-Line Style Logic Explanation:**
   - A step-by-step walkthrough explaining the key lines of code, conditions, calculations, and error-handling paths in simple words.
5. **Issues & Improvements (if any):**
   - Any bugs, hardcoded values, performance risks, or edge-case oversights found in the file, marked with "⚠ Issue" and a recommended fix.
```

---

## 🧭 High-Level Architecture Map

Before diving into individual files, here is where each category lives in the codebase:

```
├── client/
│   ├── src/components/   # Reusable UI presentation (charts, badges, modals, tables)
│   ├── src/pages/        # Full screens mounted to React Router paths
│   ├── src/context/      # Global state (auth session, image viewer, chat state)
│   ├── src/hooks/        # Data management helpers (useFetch, useList, useAssistantChat)
│   └── src/services/     # Network layer making Axios HTTP calls to the backend
│
├── server/
│   ├── src/models/       # MongoDB schemas (Product, Supplier, Sale, Inventory, PO, Insight)
│   ├── src/controllers/  # Business logic and database operations
│   ├── src/routes/       # Express URL routing endpoints
│   ├── src/middleware/   # Security filters, JWT authentication, and Zod validators
│   └── src/services/     # Python ML client and AI assistant tool loops
│
└── ml-service/
    ├── app/              # Python application core (forecasting, risk, decision rules, anomalies)
    ├── data/             # Synthetic 730-day ground-truth dataset generator and CSVs
    ├── models/           # Saved .joblib model weights and holdout evaluation JSON files
    └── tests/            # Automated Pytest suite verifying mathematical accuracy
```

Click one of the volume links above to explore the detailed file breakdowns!
