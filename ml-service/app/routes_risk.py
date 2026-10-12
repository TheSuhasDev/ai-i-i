from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.risk import all_risks, risk_for_product
from app.trend import all_trends, trend_for_product

router = APIRouter()
NOT_TRAINED = "Model not trained. Run: python -m app.train_risk"


class RiskRequest(BaseModel):
    product_id: str
    stock: Optional[int] = Field(default=None, ge=0, description="Override today's stock (what-if). Default: current stock.")


class TrendRequest(BaseModel):
    product_id: str


@router.post("/risk")
def risk(req: RiskRequest):
    try:
        return risk_for_product(req.product_id, req.stock)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail=NOT_TRAINED)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown product_id {req.product_id}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/risk/all")
def risk_all():
    try:
        return all_risks()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail=NOT_TRAINED)


@router.post("/trend")
def trend(req: TrendRequest):
    try:
        return trend_for_product(req.product_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown product_id {req.product_id}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/trend/all")
def trend_all():
    return all_trends()