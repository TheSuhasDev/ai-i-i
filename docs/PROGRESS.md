# Project Progress Log

Project: AI Inventory Intelligence (MERN + Python ML), 15-day plan
Repo layout: client/ (Vite+React, :5173), server/ (Express, :5000), ml-service/ (FastAPI, :8000), docs/

## How to run
- server: cd server; npm run dev
- client: cd client; npm run dev
- ml-service: cd ml-service; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000

## Day 1: Setup and architecture - DONE
Tasks done:
- Monorepo created with git
- Express server with Mongoose connection, helmet, cors, morgan, /api/health
- Vite + React client with health status page for all services
- FastAPI skeleton with /health, venv, ML libraries installed (requirements.txt)
- .env and .env.example files, root .gitignore, ESLint on server and client
Deliverable: three services running locally - confirmed

## Decisions
- Server uses ES modules ("type": "module")
- Database: <local MongoDB / Atlas - fill in>

## Day 2: Data models and synthetic dataset - DONE
Tasks done:
- Mongoose models: User, Supplier, Product, Inventory, Sale, PurchaseOrder (server/src/models)
- ml-service/data/generate_data.py (seed 42) producing products, suppliers, sales, inventory_snapshot,
  stock_history, purchase_orders and scenario_labels CSVs
- ml-service/data/validate_data.py: all checks pass; plot checked visually
- server/src/seed/seed.js written and dry-run tested (real seeding happens on Day 3)
Demo logins (seeded on Day 3): admin@inventory.com / Admin@123, manager@inventory.com / Manager@123,
staff@inventory.com / Staff@123
Decisions: see docs/NOTES.md (ABC has 9 A products, provisional health/alert rules, stock built backwards)

## Next: Day 3 - Backend APIs
- JWT register/login + role middleware, CRUD routes for products, inventory, sales, suppliers, purchase orders
- express-validator or Zod, central error handler
- Run npm run seed, test everything in Postman