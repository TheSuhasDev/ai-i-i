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

## Next: Day 2 - Data models and synthetic dataset
- Mongoose schemas: User, Product, Inventory, Sale, Supplier, PurchaseOrder
- ml-service/data/generate_data.py (seed 42) following the Synthetic Data Design section
- Run validation checks before Day 3