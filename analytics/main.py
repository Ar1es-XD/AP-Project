import os
import secrets
from fastapi import FastAPI, Header, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI(
    title="Hospital Wait-Time Analytics",
    description="Erlang-C queueing theory engine for wait-time estimation",
    version="1.0.0"
)

# Fail startup safely if no shared secret is provided
INTERNAL_SHARED_SECRET = os.getenv("ANALYTICS_SHARED_SECRET") or os.getenv("ANALYTICS_SECRET")
if not INTERNAL_SHARED_SECRET:
    raise RuntimeError("ANALYTICS_SHARED_SECRET (or ANALYTICS_SECRET) must be set")


def verify_shared_secret(x_internal_secret: Optional[str] = Header(None)):
    """
    Constant-time comparison guard ensuring only authenticated backend callers access the service.
    """
    if not x_internal_secret or not secrets.compare_digest(
        x_internal_secret.encode("utf-8"),
        INTERNAL_SHARED_SECRET.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing internal shared secret."
        )


class EstimateRequest(BaseModel):
    department_id: str
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


@app.post(
    "/estimate",
    response_model=EstimateResponse,
    tags=["Wait Estimation"],
    dependencies=[Depends(verify_shared_secret)]
)
def estimate_wait_time(payload: EstimateRequest):
    """
    Estimate wait time for a patient.
    Day 1 baseline stub: Full Erlang-C mathematical engine is integrated on Day 4.
    """
    count = payload.active_doctors
    lam = payload.arrival_rate
    mu = payload.service_rate

    # Zero active doctors: Queue is offline / unavailable
    if count == 0:
        return EstimateResponse(
            department_id=payload.department_id,
            expected_wait_minutes_min=-1,
            expected_wait_minutes_max=-1,
            probability_of_wait=1.0,
            system_utilization=1.0,
            status="UNAVAILABLE_ZERO_DOCTORS"
        )

    rho = lam / (count * mu)

    # Overloaded queue: Utilization >= 1.0 means demand exceeds capacity
    if rho >= 1.0:
        return EstimateResponse(
            department_id=payload.department_id,
            expected_wait_minutes_min=-1,
            expected_wait_minutes_max=-1,
            probability_of_wait=1.0,
            system_utilization=1.0,
            status="OVERLOADED"
        )

    # Day 1 stub baseline: returns nominal range when system is operating normally
    return EstimateResponse(
        department_id=payload.department_id,
        expected_wait_minutes_min=10,
        expected_wait_minutes_max=20,
        probability_of_wait=round(min(1.0, rho), 4),
        system_utilization=round(min(1.0, rho), 4),
        status="STUB_SUCCESS"
    )