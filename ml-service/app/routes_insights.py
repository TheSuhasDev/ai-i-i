from datetime import date
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.insights import all_insights, insights_for_product, supplier_table

router = APIRouter()

NOT_TRAINED = "Model not trained. Run: python -m app.train_forecast and python -m app.train_risk"


class InsightRequest(BaseModel):
    product_id: str
    stock: Optional[float] = Field(default=None, ge=0, description="Current on-hand stock. Default: CSV snapshot.")
    on_order: Optional[float] = Field(default=None, ge=0, description="Quantity on open POs. Default: CSV open POs.")
    promo_days: Optional[List[int]] = Field(default=None, description="Planned promo days (0-7) for the next 3 weeks.")
    price: Optional[float] = Field(default=None, gt=0)
    expected_delivery_date: Optional[date] = None


@router.post("/insights")
def insights(req: InsightRequest):
    if req.promo_days is not None and (len(req.promo_days) > 3 or any(not 0 <= d <= 7 for d in req.promo_days)):
        raise HTTPException(status_code=422, detail="promo_days: up to 3 values, each between 0 and 7")
    try:
        return insights_for_product(req.product_id, req.stock, req.on_order, req.promo_days, req.price,
                                    req.expected_delivery_date)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail=NOT_TRAINED)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown product_id {req.product_id}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/insights/all")
def insights_all():
    try:
        return all_insights()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail=NOT_TRAINED)

@router.get("/supplier-risk")
def supplier_risk():
    return supplier_table()
