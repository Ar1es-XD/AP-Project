"""
Inpatient Bed Analytics Engine
Author: Person A (Ishika)

Mathematical Models:
1. Log-normal Average Length of Stay (ALOS) & Bed Turnover Rate:
   f(t; mu, sigma) = (1 / (t * sigma * sqrt(2 * pi))) * exp(-((ln(t) - mu)^2) / (2 * sigma^2))
2. Ward Bed Depletion & Time-to-Zero Exhaustion:
   T_exhaustion = B_free / (lambda_admit - mu_discharge)  (for lambda_admit > mu_discharge)
"""

import math
from typing import List, Optional, Dict, Any


def calculate_turnover(total_beds: int, stay_durations_hours: List[float]) -> Dict[str, Any]:
    """
    Calculates Average Length of Stay (ALOS), stay variance, and Bed Turnover Rate.
    Models log-normal parameters (mu_ln, sigma_ln) if stay durations are positive.
    """
    if total_beds <= 0:
        raise ValueError("total_beds must be greater than 0")

    if not stay_durations_hours:
        return {
            "total_beds": total_beds,
            "discharges_count": 0,
            "alos_hours": 0.0,
            "alos_days": 0.0,
            "turnover_rate": 0.0,
            "lognormal_mu": 0.0,
            "lognormal_sigma": 0.0,
            "p90_stay_hours": 0.0,
        }

    count = len(stay_durations_hours)
    total_hours = sum(stay_durations_hours)
    alos_hours = round(total_hours / count, 2)
    alos_days = round(alos_hours / 24.0, 2)
    turnover_rate = round(count / total_beds, 2)

    # Log-normal distribution parameters for lengths of stay
    positive_durations = [h for h in stay_durations_hours if h > 0]
    if positive_durations:
        log_vals = [math.log(h) for h in positive_durations]
        mu_ln = sum(log_vals) / len(log_vals)
        var_ln = sum((x - mu_ln) ** 2 for x in log_vals) / len(log_vals)
        sigma_ln = math.sqrt(var_ln) if var_ln > 0 else 0.0
        # 90th percentile from log-normal: exp(mu + 1.28155 * sigma)
        p90_stay_hours = round(math.exp(mu_ln + 1.28155 * sigma_ln), 2)
    else:
        mu_ln = 0.0
        sigma_ln = 0.0
        p90_stay_hours = alos_hours

    return {
        "total_beds": total_beds,
        "discharges_count": count,
        "alos_hours": alos_hours,
        "alos_days": alos_days,
        "turnover_rate": turnover_rate,
        "lognormal_mu": round(mu_ln, 4),
        "lognormal_sigma": round(sigma_ln, 4),
        "p90_stay_hours": p90_stay_hours,
    }


def forecast_depletion(
    total_beds: int,
    occupied_beds: int,
    admission_rate: float,
    discharge_rate: float,
) -> Dict[str, Any]:
    """
    Projects the time to bed exhaustion (T_exhaustion = B_free / (lambda - mu)).
    Returns hours until zero beds remain and surge alert status.
    """
    if total_beds <= 0:
        raise ValueError("total_beds must be greater than 0")
    if occupied_beds < 0:
        raise ValueError("occupied_beds cannot be negative")
    if admission_rate < 0 or discharge_rate < 0:
        raise ValueError("admission_rate and discharge_rate cannot be negative")

    available_beds = total_beds - occupied_beds

    # 1. Ward is full or over-capacity
    if available_beds <= 0:
        return {
            "total_beds": total_beds,
            "occupied_beds": max(total_beds, occupied_beds),
            "available_beds": 0,
            "hours_until_full": 0.0,
            "status": "FULL",
            "surge_warning": True,
            "surge_risk_level": "CRITICAL",
        }

    # 2. Net depletion speed
    net_rate = admission_rate - discharge_rate

    # If discharges >= admissions, the ward is stable and will not run out of beds
    if net_rate <= 0:
        return {
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": available_beds,
            "hours_until_full": None,
            "status": "STABLE",
            "surge_warning": False,
            "surge_risk_level": "LOW",
        }

    # 3. Time to exhaustion in hours
    hours_until_full = round(available_beds / net_rate, 2)
    surge_warning = hours_until_full < 4.0

    if hours_until_full < 2.0:
        risk = "HIGH"
    elif hours_until_full < 6.0:
        risk = "MODERATE"
    else:
        risk = "ELEVATED"

    return {
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "hours_until_full": hours_until_full,
        "status": "DEPLETING",
        "surge_warning": surge_warning,
        "surge_risk_level": risk,
    }
