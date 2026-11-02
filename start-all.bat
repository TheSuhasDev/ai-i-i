@echo off
title AI Inventory Intelligence Launcher
echo ============================================================
echo  AI Inventory Intelligence - Local Launcher
echo ============================================================
echo.

echo [1/3] Launching ML Service on http://127.0.0.1:8000 ...
start "ML Service (8000)" cmd /k "cd /d ""%~dp0ml-service"" && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

echo [2/3] Launching Backend on http://localhost:5000 ...
start "Backend API" cmd /k "cd /d ""%~dp0server"" && npm run dev"

echo [3/3] Launching Vite Frontend on http://localhost:5173 ...
start "Frontend (5173)" cmd /k "cd /d ""%~dp0client"" && npm run dev"

echo.
echo ============================================================
echo  All 3 services have started in separate terminal windows!
echo  - Frontend UI:  http://localhost:5173
echo  - ML Service:   http://127.0.0.1:8000/docs
echo ============================================================
pause