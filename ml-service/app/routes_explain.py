from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.anomaly import recent_anomalies
from app.explain import explain_risk

router = APIRouter()


class ExplainRequest(BaseModel):
    product_id: str
    stock: Optional[float] = Field(default=None, ge=0, description="Override today's stock. Default: CSV snapshot.")


@router.post("/explain")
def explain(req: ExplainRequest):
    try:
        return explain_risk(req.product_id, req.stock)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained. Run: python -m app.train_risk")
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown product_id {req.product_id}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/anomalies")
def anomalies(days: int = Query(90, ge=7, le=730), product_id: Optional[str] = None,
              limit: int = Query(200, ge=1, le=1000), kind: Optional[str] = Query(None, alias="type")):
    try:
        return recent_anomalies(days, product_id, limit, kind)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained. Run: python -m app.anomaly")
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown product_id {product_id}")