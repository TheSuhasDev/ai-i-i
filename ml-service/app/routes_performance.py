from fastapi import APIRouter

from app.performance import load_performance

router = APIRouter()


@router.get("/model-performance")
def model_performance():
    return load_performance()