# Running Notes (decisions and formulas for the report)

## Day 1
- Monorepo: client (Vite+React), server (Express+Mongoose, ES modules), ml-service (FastAPI)
- Ports: client 5173, server 5000, ml-service 8000
- Each service exposes /health (server at /api/health)
- Secrets live in .env (git-ignored); .env.example committed