import os
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI(
    title="Hospital Wait-Time Analytics",
    description="Erlang-C queueing theory engine for wait-time estimation",
    version="1.0.0"
)

INTERNAL_SHARED_SECRET = os.getenv("ANALYTICS_SHARED_SECRET", "super-secret-internal-key")


def verify_shared_secret(x_internal_secret: Optional[str] = Header(None)):
    """
    Gaurd to ensure only the hospital backend API can call the analytics microservice."""
    
    if not x_internal_secret or x_internal_secret != INTERNAL_SHARED_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing internal shared secret."
        )

class EstimateRequest(BaseModel):
    deparment_id: str
    active_doctors: int = Field(..., ge=0, description="Active doctors (c)")
    arrival_rate: float = Field(..., ge=0, description="Arrivals per hour (lambda)")
    service_rate: float = Field(..., gt=0, description="Service per doctor per hour (mu)")
    queue_depth: int = Field(0, ge=0, description="Number of patients currently ahead in queue")
    
    
class EstimateResponse(BaseModel):
    department_id: str
    expected_wait_minutes_min: int
    expected_wait_minutes_max: int
    probability_of_wait: float
    system_utilization: float
    status: str
    


@app.get("/health", tags=["Monitoring"])
def health_check():

    """
    Health check endpoint.
    """

    return {
        "status": "healthy",
        "service": "opd-analytics-erlang-c",
        "version": "1.0.0"
        
    }


@app.post("/estimate", response_model=EstimateResponse, tags=["Wait Estimation"])
def estimate_wait_time(
    payload: EstimateRequest,
    x_internal_secret: Optional[str] = Header(None)
):
    """
    Estimate wait time for a patient.
    """
    
    verify_shared_secret(x_internal_secret)

    count = payload.active_doctors
    lam = payload.arrival_rate
    mu = payload.service_rate
    rho = lam / (count * mu) if (count * mu) > 0 else 1.0
    
    
    
    return EstimateResponse(
        deparment_id=payload.deparment_id,
        expected_wait_minutes_main=10,
        expected_wait_minutes_max=20,
        probability_of_wait=round(min(1.0, rho), 4),
        system_utilization=round(rho, 4),
        status="success"
    )






