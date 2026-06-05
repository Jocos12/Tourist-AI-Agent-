# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Hodari

Hodari is a multi-agent tourist AI assistant built for the 2026 FIFA World Cup. It helps visitors plan grounded, personalized itineraries through a conversational interface backed by real-world map data.

The full architecture spec lives in `Hodari_System_Architecture.md` — read it before making structural decisions.

**Implementation status:** Implemented. Backend agents live in `agents/hodari/` (ADK); the Next.js client lives in `client/`. `Hodari_System_Architecture.md` remains the design reference.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (Responsive Web App / PWA) |
| Agent runtime | Python on Google Cloud Run |
| Orchestration | Google Cloud Agent Builder |
| LLM | Gemini 3.5 Flash (`gemini-3.5-flash`) via Vertex AI — `global` location only (Gemini 3.x is not served from regional endpoints); embeddings via `text-embedding-004` (768 dims) |
| Database | MongoDB Atlas |
| Vector search | Atlas Vector Search (HNSW, cosine similarity) |
| Maps MCP | Google Maps Grounding Lite (`https://mapstools.googleapis.com/mcp`) |
| Map UI | Maps JavaScript API (places overlay, route polylines) |
| External APIs | web search (via Gemini Function Calling) |
| Schema validation | Pydantic |
| Secrets | Google Secret Manager |
| Auth | Google Cloud IAM |

---

## Multi-Agent Architecture

Four agents; keep it at four — adding more increases inter-agent latency.

### Orchestrator
Entry point for every user request.
- Loads user profile and conversation history from MongoDB via MCP
- Routes to Planner → Researcher → Itinerary in sequence
- Owns the `save_preference` tool (only agent that writes session-level state)
- Streams the final response back to the client via SSE

### Planner Agent
- **Input:** user request + user profile + conversation history
- **Output:** `Plan` schema — goal, constraints (budget, time, dietary, accessibility, location), ordered subtasks
- Uses **no external tools** — pure reasoning only
- Output validated with Pydantic; one retry on failure, then graceful error

### Explorer / Map Agent
The agent connected directly to Google Maps via the **Maps Grounding Lite MCP server**. Place search and routing go through MCP — not Gemini Function Calling — which keeps the vector database lean and saves tokens.

- **Tools (all called in parallel):**
  - `search_places` *(Maps Grounding Lite MCP)* — `text_query` + optional `location_bias` → Place ID, name, coords, AI summary, ratings, price, hours, photos
  - `find_similar_preferences` *(internal)* — Gemini embeddings + Atlas Vector Search → personalization ranking from interaction history. **Only tool that touches the vector DB.**
  - `web_search` *(Gemini Function Calling)* — only for time-sensitive data (events, transit disruptions, festivals)
- **Output:** `CandidateSet` schema — 5–10 enriched locations with grounding metadata and personalization scores

### Itinerary Agent
- **Input:** `Plan` + `CandidateSet`
- **Tool:** `compute_routes` *(Maps Grounding Lite MCP)* — origin + destination (address, coords, or Place ID) + travel mode (DRIVE/WALK) → distance, duration, polyline. No real-time traffic or turn-by-turn in Grounding Lite.
- **Output:** `Itinerary` schema — stops, travel transitions, rationales, voice-friendly summary
- Verifies feasibility and optimizes stop ordering

---

## Inter-Agent Contracts (Pydantic Schemas)

Three schemas pass between agents. All are validated; one retry on malformed output, then graceful error.

| Schema | Key Fields |
|---|---|
| `Plan` | goal, constraints, ordered subtasks |
| `CandidateSet` | grounded locations, ranking scores |
| `Itinerary` | stops, travel times, rationales, voice summary |

---

## Data Tier (MongoDB Atlas)

Three collections:

- **`users`** — user ID, email, home country, languages, dietary preferences, budget tier, accessibility requirements
- **`places`** — Google Place ID, name, city, GeoJSON location, categories, price level, description, 768-dim embedding, ratings, photos, reviews
- **`interactions`** — per-user feedback signals: liked, disliked, visited, skipped, booked (drives personalization)

Agents communicate with MongoDB via the **MongoDB MCP Server** (MCP Protocol).

---

## Communication Patterns

- **Client ↔ Orchestrator:** HTTPS; streaming via Server-Sent Events (SSE)
- **Orchestrator/Agents ↔ MongoDB:** MCP Protocol through MongoDB MCP Server
- **Explorer & Itinerary ↔ Google Maps:** MCP Protocol through Maps Grounding Lite (`https://mapstools.googleapis.com/mcp`)
- **Explorer ↔ web search:** Gemini Function Calling

---

## Client (Next.js)

Four main UI components:
1. Conversational chat panel
2. Interactive map with custom pins and route overlays — **Maps JavaScript API** (target UX: Uber/Google Maps style with nearby-places overlay)
3. Swipeable itinerary card stack
4. Push-to-talk voice input

The client only handles UI state, streaming rendering, and audio capture. All reasoning stays server-side.

---

## Maps Grounding Lite MCP Server

Both the Explorer and Itinerary agents share this server.

| Setting | Value |
|---|---|
| MCP endpoint | `https://mapstools.googleapis.com/mcp` |
| Transport | Streamable HTTP |
| Auth header | `X-Goog-Api-Key: <YOUR_API_KEY>` |
| Required API | Enable **Maps Grounding Lite API** in Google Cloud Console |
| Tools exposed | `search_places`, `compute_routes`, `lookup_weather` |

Gemini CLI config reference:
```bash
gemini mcp add -s user -t http \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  maps-grounding-lite \
  https://mapstools.googleapis.com/mcp
```

**`lookup_weather`** is available on the MCP server and can be wired up later for weather-aware itinerary suggestions without extra API integration.

---

## Dev Commands

### Backend agents (Python 3.10+)

```bash
# ── Step 0: MongoDB MCP HTTP server (required before starting ADK) ──────────
# Reads MDB_MCP_CONNECTION_STRING from env (or set it to your MONGODB_URI).
# Keep this running in a dedicated terminal.
MDB_MCP_CONNECTION_STRING="<your atlas URI>" npx mongodb-mcp-server --transport http --httpPort=3100
# Windows PowerShell:
# $env:MDB_MCP_CONNECTION_STRING="<your atlas URI>"; npx mongodb-mcp-server --transport http --httpPort=3100

cd agents

# First-time setup — use the py launcher to target official CPython 3.12
# (not MSYS2/MinGW Python, which lacks pydantic-core wheels)
py -3.12 -m venv .venv

# Activate (PowerShell / Windows)
.venv\Scripts\Activate.ps1
# Activate (bash / Mac / Linux)
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # then fill in API keys

# Run the ADK dev server (http://localhost:8000)
# IMPORTANT: launch via the venv's adk, not bare `adk`. A global ADK install
# (C:\...\Python310\Scripts\adk.exe) can shadow the venv on PATH even when the
# venv is "activated" — and the global one lacks `mcp`, so module load fails.
.venv\Scripts\adk.exe api_server hodari

# Interactive web UI for testing agents
.venv\Scripts\adk.exe web hodari
```

### Frontend (Next.js)

```bash
cd client
npm install
npm run dev        # dev server on http://localhost:3000
npm run build
npm run lint
```

---

## Build Phasing (read before scaffolding)

Build the smallest grounded loop first; add complexity only when a concrete need appears.

**MVP — prove the core loop:** Orchestrator → Explorer/Map (`search_places` via Maps MCP) → result rendered on the map. Then add the Itinerary agent (`compute_routes`).
- Run **all agents in one Cloud Run service** with in-process routing — not four services.
- **Skip the vectorized `places` collection.** Personalize by re-ranking Maps candidates against the `interactions` history. The 768-dim embeddings + Atlas Vector Search are Phase 2.
- Planner and Itinerary can start as structured-output steps inside the Orchestrator; split them into agents only if the single-pass approach gets unwieldy.

**Phase 2 — add when justified:** vectorized `places` + vector search, per-agent Cloud Run services, `lookup_weather`-driven itineraries.

Each Phase 2 item carries real cost (maintenance, ops, or tokens). None is required to demonstrate grounded place search → feasible itinerary. Don't build them preemptively.

---

## MVP Scope

Explicitly **out of scope** for MVP (features, not architecture):
- Booking and payments
- Email integration
- Calendar synchronization
- OAuth integrations
- Multilingual support

---

## Deployment

Each agent (Orchestrator, Planner, Explorer/Map, Itinerary) deploys independently to **Google Cloud Run**. Frontend deploys to Vercel or Cloud Run behind a CDN. Observability via Cloud Run logging and distributed tracing with structured logs at every agent boundary.
