import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes_forecast import router as forecast_router
from app.routes_risk import router as risk_router
from app.routes_insights import router as insights_router

load_dotenv()

app = FastAPI(title="Inventory ML Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:5173"),
                   os.getenv("SERVER_URL", "http://localhost:5000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)
app.include_router(risk_router)
app.include_router(insights_router)
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ml-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }