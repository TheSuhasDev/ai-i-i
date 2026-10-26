import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routes_forecast import router as forecast_router
from app.routes_risk import router as risk_router
from app.routes_insights import router as insights_router
from app.routes_explain import router as explain_router
from app.routes_simulate import router as simulate_router
from app.routes_performance import router as performance_router

load_dotenv()

def require_service_token(x_service_token: str | None = Header(default=None, alias="X-Service-Token")):
    expected = os.getenv("ML_SERVICE_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="ML service authentication is not configured")
    if not x_service_token or not secrets.compare_digest(x_service_token, expected):
        raise HTTPException(status_code=401, detail="Invalid service token")


@asynccontextmanager
async def lifespan(_app):
    if not os.getenv("ML_SERVICE_TOKEN"):
        raise RuntimeError("ML_SERVICE_TOKEN is required; refusing to start the ML service")
    yield


app = FastAPI(title="Inventory ML Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:5173"),
                   os.getenv("SERVER_URL", "http://localhost:5000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

service_auth = [Depends(require_service_token)]
app.include_router(forecast_router, dependencies=service_auth)
app.include_router(risk_router, dependencies=service_auth)
app.include_router(insights_router, dependencies=service_auth)
app.include_router(explain_router, dependencies=service_auth)
app.include_router(simulate_router, dependencies=service_auth)
app.include_router(performance_router, dependencies=service_auth)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ml-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
