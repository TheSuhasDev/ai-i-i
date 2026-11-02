# AI-Powered Inventory & Supply Chain Intelligence — Learning Documentation

Welcome to the complete, beginner-friendly learning documentation for the **AI-Powered Inventory & Supply Chain Intelligence** system.

This documentation was written specifically for developers who know the **MERN** stack (React, Node.js, Express, MongoDB) but are **new to Machine Learning, Data Science, and Python**. Everything is explained in clear, simple English without assuming any background in statistics or ML.

---

## 📚 Complete Document Index

| Document | Title | Description |
|---|---|---|
| [01_PROJECT_OVERVIEW.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/01_PROJECT_OVERVIEW.md) | **Project Overview & Tech Stack** | What problem this solves, who uses it, tech stack choices explained, and a complete repository tree with a 1-line purpose for every file. |
| [02_ARCHITECTURE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/02_ARCHITECTURE.md) | **System Architecture & Service Communication** | Big-picture Mermaid diagrams, inter-service HTTP communication, environment variables, full request lifecycles, and how to run each service. |
| [03_FILE_BY_FILE_GUIDE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03_FILE_BY_FILE_GUIDE.md) | **File-by-File Master Guide (Index)** | Master navigation guide for the file-by-file codebase walkthrough, divided into Client, Server, and ML Service sub-guides. |
| [03a_CLIENT_FILES.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03a_CLIENT_FILES.md) | **File-by-File: Client (React + Vite)** | Exhaustive, line-by-line breakdown of every file in `client/` (components, pages, context, hooks, services, and utils). |
| [03b_SERVER_FILES.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03b_SERVER_FILES.md) | **File-by-File: Server (Express + Mongoose)** | Exhaustive, line-by-line breakdown of every file in `server/` (models, controllers, routes, middleware, services, and scripts). |
| [03c_ML_SERVICE_FILES.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03c_ML_SERVICE_FILES.md) | **File-by-File: ML Service (FastAPI + Python)** | Exhaustive, line-by-line breakdown of every file in `ml-service/` (data generation, forecasting, risk, decision rules, health, and anomalies). |
| [04_FEATURE_GUIDE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/04_FEATURE_GUIDE.md) | **Complete Feature Guide** | Deep dive into all 10 core features + extras: UI location, end-to-end call trace, algorithm formulas with worked numeric examples, and edge cases. |
| [05_ML_AND_DATA_GUIDE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/05_ML_AND_DATA_GUIDE.md) | **Beginner's Guide to Machine Learning & Data** | Every ML concept taught from zero: 1-line definition, real-life analogy, why we use it, step-by-step code trace, small numerical examples, and complete ML glossary. |
| [06_DATABASE_AND_API_GUIDE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/06_DATABASE_AND_API_GUIDE.md) | **Database Schemas & API Reference** | MongoDB collections, ER diagrams, indexes, document examples, plus exhaustive endpoint reference tables for both Express and FastAPI. |
| [07_FRONTEND_GUIDE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/07_FRONTEND_GUIDE.md) | **Frontend Guide & Data Visualization** | Client routing, page hierarchy, state management, Recharts integration, and how raw API JSON transforms into beautiful UI components. |
| [08_HOW_EVERYTHING_CONNECTS.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/08_HOW_EVERYTHING_CONNECTS.md) | **Dependency Map & End-to-End Traces** | Full system dependency graph, 3 real user action walkthroughs, and a practical cheat sheet: "If I want to change X, which files do I edit?". |
| [09_PROBLEMS_AND_IMPROVEMENTS.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/09_PROBLEMS_AND_IMPROVEMENTS.md) | **Audit Findings & Improvement Roadmap** | Senior-engineer evaluation of bugs, security weak spots, edge case gaps, and a ranked list of practical improvements from easy to advanced. |
| [10_LEARNING_PATH.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/10_LEARNING_PATH.md) | **Learning Path, Interview Q&A & Elevator Pitch** | Recommended reading order to understand the project in 2 days, 20 interview/viva questions with model answers, and a 2-minute elevator pitch. |

---

## 🛠️ The 3 Services at a Glance

```
 Browser (User)
      │
      ▼  Port 5173
┌─────────────────────────────────┐
│   client (React 19 + Vite)      │
│   Tailwind CSS / Plain CSS      │
└───────────────┬─────────────────┘
                │  REST API Calls (/api/*)
                ▼  Port 5000
┌─────────────────────────────────┐      MongoDB (Port 27017)
│   server (Node.js + Express 5)  │◄───► [Users, Products, Suppliers,
│   JWT Auth, CRUD, Orchestrator  │      Sales, Inventory, POs, Insights]
└───────────────┬─────────────────┘
                │  Internal HTTP (X-Service-Token)
                ▼  Port 8000
┌─────────────────────────────────┐
│   ml-service (Python + FastAPI) │
│   scikit-learn, pandas, SHAP    │
│   HistGradientBoosting, RF, IF  │
└─────────────────────────────────┘
```

---

## 💡 How to Use This Documentation

1. **If you want the big picture first:** Start with [01_PROJECT_OVERVIEW.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/01_PROJECT_OVERVIEW.md) and [02_ARCHITECTURE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/02_ARCHITECTURE.md).
2. **If you want to understand the ML without feeling overwhelmed:** Read [05_ML_AND_DATA_GUIDE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/05_ML_AND_DATA_GUIDE.md). Every formula has a real-world analogy and numbers you can calculate on a napkin.
3. **If you need to prepare for a job interview or college viva:** Jump straight to [10_LEARNING_PATH.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/10_LEARNING_PATH.md) for the 20 questions and 2-minute script.
4. **If you want to know what file does what:** Consult [03_FILE_BY_FILE_GUIDE.md](file:///c:/Users/suhas/Desktop/ai-i-i/ai-inventory-intelligence%20-%20Copy/docs/03_FILE_BY_FILE_GUIDE.md).
