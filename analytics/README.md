# Analytics Microservice (Python / FastAPI)

This microservice provides queueing theory wait-time estimations using the **Erlang-C ($M/M/c$) model**.

## Setup & Running Locally

```bash
# 1. Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run development server
uvicorn main:app --reload --port 8000
```

## Endpoints

* `GET /health` — Health check endpoint.
* `POST /estimate` — Protected by `X-Internal-Secret` header, computes Erlang-C wait-time predictions.