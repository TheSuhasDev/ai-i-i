from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.simulator import simulate

router = APIRouter()


class SimulateRequest(BaseModel):
    product_id: str
    demand_pct: float = Field(default=0, ge=-90, le=300, description="Demand change in percent")
    extra_delay_days: int = Field(default=0, ge=0, le=30, description="Additional supplier delay in days")
    stock: Optional[float] = Field(default=None, ge=0, description="Scenario stock on hand. Default: current stock.")
    order_qty: float = Field(default=0, ge=0, description="New order placed today")
    base_stock: Optional[float] = Field(default=None, ge=0, description="Live current stock (sent by Express)")
    base_on_order: Optional[float] = Field(default=None, ge=0, description="Live quantity on order (sent by Express)")


@router.post("/simulate")
def simulate_endpoint(req: SimulateRequest):
    try:
        return simulate(req.product_id, req.demand_pct, req.extra_delay_days, req.stock, req.order_qty,
                        req.base_stock, req.base_on_order)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not trained. Run: python -m app.train_forecast and python -m app.train_risk")
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown product_id {req.product_id}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))