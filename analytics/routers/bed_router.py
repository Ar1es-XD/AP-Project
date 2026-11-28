"""
Bed Analytics Router
Author: Person A (Ishika)

Endpoints:
- POST /analytics/beds/turnover
- POST /analytics/beds/forecast
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from core.bed_analytics import calculate_turnover, forecast_depletion

router = APIRouter(prefix="/analytics/beds", tags=["Inpatient Bed Analytics"])


class TurnoverRequest(BaseModel):
    ward_id: str
    total_beds: int = Field(..., gt=0, description="Total physical bed capacity")
    stay_durations_hours: List[float] = Field(default_factory=list, description="Historical patient stay lengths in hours")


class ForecastRequest(BaseModel):
    ward_id: str
    total_beds: int = Field(..., gt=0, description="Total physical bed capacity")
    occupied_beds: int = Field(..., ge=0, description="Currently occupied beds")
    admission_rate: float = Field(..., ge=0, description="Patient arrival/admit rate per hour (lambda)")
    discharge_rate: float = Field(..., ge=0, description="Patient discharge rate per hour (mu)")


@router.post("/turnover")
def get_turnover(data: TurnoverRequest):
    """Calculates Average Length of Stay (ALOS) and Bed Turnover Rate."""
    try:
        result = calculate_turnover(data.total_beds, data.stay_durations_hours)
        result["ward_id"] = data.ward_id
        return result
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/forecast")
def get_forecast(data: ForecastRequest):
    """Calculates projected hours until ward bed exhaustion and surge risk."""
    try:
        result = forecast_depletion(
            total_beds=data.total_beds,
            occupied_beds=data.occupied_beds,
            admission_rate=data.admission_rate,
            discharge_rate=data.discharge_rate,
        )
        result["ward_id"] = data.ward_id
        return result
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
