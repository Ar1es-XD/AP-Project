"""
Tests for Inpatient Bed Analytics Engine
Author: Person A (Ishika)
"""

from fastapi.testclient import TestClient
from main import app
from core.bed_analytics import calculate_turnover, forecast_depletion

client = TestClient(app)


def test_turnover_calculation():
    # 3 patients stayed 24, 48, 72 hours (total 144 hours, average = 48 hours = 2 days)
    # in a 10 bed ward -> turnover rate = 3 / 10 = 0.3
    res = calculate_turnover(total_beds=10, stay_durations_hours=[24, 48, 72])
    assert res["discharges_count"] == 3
    assert res["alos_hours"] == 48.0
    assert res["alos_days"] == 2.0
    assert res["turnover_rate"] == 0.3
    assert res["lognormal_mu"] > 0
    assert res["p90_stay_hours"] >= 48.0


def test_turnover_empty_list():
    res = calculate_turnover(total_beds=10, stay_durations_hours=[])
    assert res["discharges_count"] == 0
    assert res["alos_hours"] == 0.0
    assert res["turnover_rate"] == 0.0


def test_forecast_surging():
    # 20 total beds, 16 occupied -> 4 available
    # Admissions = 3/hr, Discharges = 1/hr -> Net rate = 2/hr
    # Hours left = 4 / 2 = 2.0 hours (< 4 hours, so surge_warning should be True)
    res = forecast_depletion(
        total_beds=20,
        occupied_beds=16,
        admission_rate=3.0,
        discharge_rate=1.0,
    )
    assert res["available_beds"] == 4
    assert res["hours_until_full"] == 2.0
    assert res["surge_warning"] is True
    assert res["status"] == "DEPLETING"
    assert res["surge_risk_level"] in ["HIGH", "MODERATE"]


def test_forecast_stable():
    # Admissions = 1/hr, Discharges = 2/hr (discharges >= admissions)
    res = forecast_depletion(
        total_beds=20,
        occupied_beds=10,
        admission_rate=1.0,
        discharge_rate=2.0,
    )
    assert res["hours_until_full"] is None
    assert res["surge_warning"] is False
    assert res["status"] == "STABLE"
    assert res["surge_risk_level"] == "LOW"


def test_forecast_already_full():
    # Ward is 100% full
    res = forecast_depletion(
        total_beds=20,
        occupied_beds=20,
        admission_rate=2.0,
        discharge_rate=1.0,
    )
    assert res["available_beds"] == 0
    assert res["hours_until_full"] == 0.0
    assert res["surge_warning"] is True
    assert res["status"] == "FULL"
    assert res["surge_risk_level"] == "CRITICAL"


def test_turnover_api_endpoint():
    payload = {
        "ward_id": "ICU-1",
        "total_beds": 5,
        "stay_durations_hours": [24, 48],
    }
    response = client.post("/analytics/beds/turnover", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ward_id"] == "ICU-1"
    assert data["alos_hours"] == 36.0


def test_forecast_api_endpoint():
    payload = {
        "ward_id": "ICU-1",
        "total_beds": 10,
        "occupied_beds": 8,
        "admission_rate": 2.0,
        "discharge_rate": 1.0,
    }
    response = client.post("/analytics/beds/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ward_id"] == "ICU-1"
    assert data["available_beds"] == 2
    assert data["hours_until_full"] == 2.0
