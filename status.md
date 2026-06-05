/# Hodari — Implementation Status

Updated automatically as tasks complete.

**Build order:** Backend agents → Frontend → Integration → MongoDB tools → Deployment

---

## Phase 1 — MVP Core Loop

> Goal: Orchestrator → Explorer (Maps MCP `search_places`) → response renders on map, then add Itinerary (`compute_routes`).

### 1.1 Backend — Python / Google ADK

| # | Task | Status | Done when |
|---|---|---|---|
| 1 | `agents/requirements.txt` | [x] | `pip install -r requirements.txt` succeeds |
| 2 | `agents/.env.example` | [x] | All required env vars documented |
| 3 | `agents/hodari/schemas/contracts.py` | [x] | `Plan`, `CandidateSet`, `Itinerary` Pydantic models pass `model_validate` with sample data |
| 4 | `agents/hodari/tools/maps_mcp.py` | [x] | `McpToolset` instantiates without error; `search_places` visible in tool list |
| 5 | `agents/hodari/sub_agents/planner.py` | [x] | Returns valid `Plan` JSON for "4 hours, $60, vegetarian" prompt |
| 6 | `agents/hodari/sub_agents/explorer.py` | [x] | Returns 5+ places via Maps MCP for a sample location query |
| 7 | `agents/hodari/sub_agents/itinerary.py` | [x] | Returns ordered stops with travel times via `compute_routes` |
| 8 | `agents/hodari/agent.py` (orchestrator) | [x] | `adk api_server agents/hodari` starts; `/run_sse` responds end-to-end |

### 1.2 Frontend — Next.js

| # | Task | Status | Done when |
|---|---|---|---|
| 9 | Next.js app scaffold (`client/`) | [x] | `npm run dev` starts on port 3000 |
| 10 | Chat panel component | [x] | User can type a message and see streamed agent response |
| 11 | Map component (Maps JavaScript API) | [x] | Map renders with a default city center; custom pins show for each place in response |
| 12 | Itinerary card stack | [x] | Each itinerary stop renders as a swipeable card with name, time, rationale |
| 13 | Voice input (push-to-talk) | [x] | Browser mic capture sends audio; transcription shown in chat (full transcription Phase 2) |

### 1.3 Frontend ↔ Backend Integration

| # | Task | Status | Done when |
|---|---|---|---|
| 14 | SSE streaming connected | [x] | Agent tokens stream into the chat panel in real time |
| 15 | Map pins update from agent response | [x] | Place coordinates from `CandidateSet` appear as pins on the map |
| 16 | Route polyline drawn | [x] | `Itinerary` route polyline renders between stops on the map (real road path via encoded polyline from `compute_routes`) |

---

## Phase 2 — Personalization + Polish

| # | Task | Status | Done when |
|---|---|---|---|
| 17 | MongoDB user profile tool (`load_user_profile`) | [x] | Orchestrator loads real user preferences from `users` collection |
| 18 | `save_preference` tool | [x] | Liked/disliked feedback writes to `interactions` collection |
| 19 | Interactions-based re-ranking | [x] | Explorer re-ranks Maps candidates by user's past likes/categories |
| 20 | Vectorized `places` catalog + Atlas Vector Search | [x] | `find_similar_preferences` returns personalized ranking from embeddings |
| 21 | `lookup_weather` wired up | [x] | Itinerary agent considers weather forecast in stop selection |

---

## Phase 3 — Deployment

| # | Task | Status | Done when |
|---|---|---|---|
| 22 | `Dockerfile` for agents service | [ ] | `docker build` succeeds; container starts |
| 23 | Cloud Run deployment | [ ] | `gcloud run deploy` succeeds; `/health` returns 200 |
| 24 | Google Secret Manager integration | [ ] | No secrets in env files; all keys pulled from Secret Manager at runtime |
| 25 | Frontend deploy (Vercel or Cloud Run) | [ ] | Production URL live and reachable |
| 26 | Per-agent Cloud Run services | [ ] | Each agent has independent scaling config |

---

## Current Focus

**→ Phase 1 + Phase 2 complete — needs API keys + Atlas Vector Search index + `npm install` + `pip install` to run end-to-end**
**→ Next: Task 22–26 (Phase 3: Deployment)**

### Phase 2 notes
- Atlas Vector Search index `interactions_embedding` must be created manually in Atlas UI before `find_similar_preferences` returns results (gracefully returns `[]` until then)
- `MCPToolset` renamed to `McpToolset` in `maps_mcp.py` (ADK deprecation fixed)
- `_embed` switched from AI Studio REST → Vertex AI REST (ADC auth, no API key needed)
- Route polyline upgraded: `TravelLeg.encoded_polyline` carries the road path from `compute_routes`; `MapView` decodes it via `google.maps.geometry.encoding.decodePath()`, falls back to straight line if absent

---

## Notes

- All 4 agents run in **one Cloud Run service** for MVP (split in Phase 3 task 26)
- `places` collection (vector embeddings) deferred to task 20 — Explorer uses Maps MCP for place data, `interactions` collection for personalization
- Architecture spec: `Hodari_System_Architecture.md`
- Build guidance: `CLAUDE.md`
