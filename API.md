# Hospital Management System — API Specification

## 1. Authentication & Security
All protected endpoints require the RFC 6750 Bearer authentication header:

`Authorization: Bearer <jwt-token>`

Decoded JWT payload structure:
* `sub`: User ID (`UUID`)
* `hospital_id`: Active hospital boundary (`UUID`)
* `roles`: Array of assigned hospital roles (`user_role[]`)

---

## 2. OPD Queue & Triage Endpoints (Person B)

### 2.1. Join OPD Queue
Allows authorized hospital staff (front desk reception, triage nurse, or doctor) to check a patient into an active outpatient queue. Generates an atomic, gapless token number using row-level locking on `queue_counter`.

* **Method:** `POST`
* **Path:** `/api/v1/queues/join`
* **Access Control:** `FRONT_DESK`, `NURSE`, `DOCTOR`, `HOSPITAL_ADMIN`
* **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "department_id": "c7a8b9e0-3d21-4f56-8a90-123456789abc",
  "patient_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "priority": "ROUTINE"
}
```

#### Triage Priority Definitions:
| Priority | Clinical Definition | Scheduling Weight |
| :--- | :--- | :--- |
| `EMERGENCY` | Acute distress, cardiac symptoms, trauma requiring immediate intervention. | Jumps directly to top of queue (Base Rank: 1). |
| `URGENT` | Severe pain, high fever, fractures needing expedited consultation. | Prioritized ahead of general checkups (Base Rank: 2). |
| `ROUTINE` | General wellness checkups, prescription renewals, standard follow-ups (default). | Standard FIFO ordering with dynamic priority aging (Base Rank: 3). |

* **Success Response (201 Created):**
```json
{
  "message": "Joined queue successfully",
  "entry": {
    "entry_id": "8e3b1c67-9d45-421a-b678-0123456789de",
    "queue_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "patient_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "hospital_id": "11111111-2222-3333-4444-555555555555",
    "department_id": "c7a8b9e0-3d21-4f56-8a90-123456789abc",
    "token_number": 14,
    "token_display": "CARD-014",
    "priority": "ROUTINE",
    "status": "WAITING",
    "priority_bump_count": 0,
    "joined_at": "2026-11-26T08:30:00.000Z",
    "called_at": null,
    "consultation_start_at": null,
    "consultation_end_at": null
  }
}
```

* **Error Responses:**
  - `400 Bad Request`: Validation failure (non-UUID ID, invalid priority) or queue is `CLOSED` for new walk-ins.
  - `401 Unauthorized`: Missing, expired, or invalid JWT token.
  - `403 Forbidden`: User lacks required clinical or administrative role.

---

### 2.2. Get Active Queue Status by ID
Retrieves active departmental queue metrics and the real-time list of waiting patients, ordered by clinical priority and arrival time.

* **Method:** `GET`
* **Path:** `/api/v1/queues/:id`
* **Access Control:** Authenticated hospital staff
* **Headers:**
  - `Authorization: Bearer <token>`
* **Success Response (200 OK):**
```json
{
  "queue": {
    "queue_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "hospital_id": "11111111-2222-3333-4444-555555555555",
    "department_id": "c7a8b9e0-3d21-4f56-8a90-123456789abc",
    "department_name": "Cardiology",
    "queue_date": "2026-11-26",
    "status": "OPEN",
    "created_at": "2026-11-26T07:45:00.000Z"
  },
  "waiting_count": 2,
  "waiting_patients": [
    {
      "entry_id": "9f4c2d78-0e56-532b-c789-1234567890ef",
      "token_number": 15,
      "token_display": "CARD-015",
      "priority": "EMERGENCY",
      "status": "WAITING",
      "joined_at": "2026-11-26T08:35:00.000Z"
    },
    {
      "entry_id": "8e3b1c67-9d45-421a-b678-0123456789de",
      "token_number": 14,
      "token_display": "CARD-014",
      "priority": "ROUTINE",
      "status": "WAITING",
      "joined_at": "2026-11-26T08:30:00.000Z"
    }
  ]
}
```

* **Error Responses:**
  - `404 Not Found`: Queue ID does not exist or belongs to another hospital tenant.


### 2.3. Call Next Patient (Priority Aging + CAS)
Doctor calls the next patient in line. Uses the dynamic priority aging formula to calculate the highest-priority waiting patient and executes an atomic Compare-and-Swap (CAS) update (`WHERE status = 'WAITING'`) to eliminate double-calling race conditions.

* **Method:** `POST`
* **Path:** `/api/v1/queues/call-next`
* **Access Control:** `DOCTOR`, `HOSPITAL_ADMIN`
* **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "department_id": "c7a8b9e0-3d21-4f56-8a90-123456789abc",
  "room_number": "Room 102"
}
```
* **Success Response (200 OK):**
```json
{
  "message": "Patient called successfully",
  "called_patient": {
    "entry_id": "8e3b1c67-9d45-421a-b678-0123456789de",
    "token_number": 14,
    "token_display": "CARD-014",
    "priority": "ROUTINE",
    "status": "CALLED",
    "called_at": "2026-11-28T09:15:00.000Z"
  },
  "room_number": "Room 102"
}
```

---

### 2.4. Clinical State Machine Transitions
Transitions a patient ticket through the clinical workflow:
- `START_CONSULTATION`: Patient enters room, starts timer.
- `COMPLETE`: Finishes consultation, automatically inserts into `consultation_log` with computed duration.
- `NO_SHOW`: Patient was called but never showed up.
- `HOLD`: Patient sent for immediate diagnostic test (X-ray, ECG, blood work).

* **Method:** `POST`
* **Path:** `/api/v1/queues/entries/:id/transition`
* **Access Control:** `DOCTOR`, `NURSE`, `HOSPITAL_ADMIN`
* **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
* **Request Body:**
```json
{
  "action": "START_CONSULTATION"
}
```
* **Success Response (200 OK):**
```json
{
  "message": "Status transitioned successfully to IN_CONSULTATION",
  "entry": {
    "entry_id": "8e3b1c67-9d45-421a-b678-0123456789de",
    "status": "IN_CONSULTATION",
    "consultation_start_at": "2026-11-28T09:20:00.000Z"
  }
}
```