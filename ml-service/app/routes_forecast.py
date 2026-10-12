from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.forecasting import forecast_product

router = APIRouter()


class ForecastRequest(BaseModel):
    product_id: str
    promo_days: Optional[List[int]] = Field(
        default=None, description="Planned promo days (0-7) for each of the next 3 weeks. Default 0.")
    price: Optional[float] = Field(default=None, gt=0, description="Planned unit price. Default: last week's price.")


@router.post("/forecast")
def forecast(req: ForecastRequest):
    if req.promo_days is not None and (len(req.promo_days) > 3 or any(not 0 <= d <= 7 for d in req.promo_days)):
        raise HTTPException(status_code=422, detail="promo_days: up to 3 values, each between 0 and 7")
    try:
        return forecast_product(req.product_id, req.promo_days, req.price)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained. Run: python -m app.train_forecast")
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown product_id {req.product_id}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))