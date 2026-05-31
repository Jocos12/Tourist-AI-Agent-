# Hodari Orchestrator (Joseph)

Backend entry point for the Hodari multi-agent system. All frontend traffic goes to this service only.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agent/turn` | User turn — returns **SSE** stream |
| `POST` | `/agent/voice` | Push-to-talk audio → transcript |
| `GET` | `/health` | Health check |

## SSE event types (for Christian's `useSSE` hook)

| Event | Payload |
|-------|---------|
| `status` | `{ phase, message? }` |
| `plan` | Full `Plan` JSON |
| `candidates` | `CandidateSet` per subtask |
| `stop` | Single stop (progressive map pins) |
| `itinerary` | Full `Itinerary` |
| `token` | `{ text }` voice summary chunk |
| `done` | `{ ok: true }` |
| `error` | `{ message }` |

## Schemas (Section 9 — frozen)

- `app/schemas/plan.py` — Planner output
- `app/schemas/candidate.py` — Researcher output
- `app/schemas/itinerary.py` — Itinerary output

## Local run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8080
```

Test SSE:

```bash
curl -N -X POST http://localhost:8080/agent/turn ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"u1\",\"message\":\"4 hours before the game\",\"location\":{\"lat\":40.75,\"lng\":-73.99},\"session_id\":\"s1\"}"
```

## MongoDB MCP

All reads/writes go through `app/mcp/client.py` → Bienvenue's MCP server. Set `MONGODB_MCP_URL` in production (Secret Manager on Cloud Run).

## Deploy (Cloud Run)

1. Enable Cloud Run, Secret Manager, Vertex AI / Agent Builder APIs in GCP.
2. Store secrets: `GOOGLE_API_KEY`, `MONGODB_MCP_URL`, `MAPS_API_KEY`, `ROUTES_API_KEY`.
3. `gcloud builds submit --config cloudbuild.yaml`

## Structured logs

JSON logs at: `turn_start`, `planner_invoked`, `researcher_invoked`, `itinerary_invoked`, `preference_saved`, `turn_complete`.
