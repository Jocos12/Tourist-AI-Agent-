# Hodari — Performance Optimization Plan

## Baseline (pre-optimization, ITINERARY_PLANNING path)

Measured on a full itinerary request ("plan my afternoon near Camp Nou"):

| Metric | Value |
|---|---|
| Wall time | ~230 s |
| LLM calls | ~13 |
| Primary bottleneck | Sequential LLM calls (Planner → Explorer → Itinerary), each waiting on Vertex round-trip |

The LLM calls break down roughly as:
- Orchestrator: 2–3 calls (load profile decision + pipeline invocation + final response)
- Planner: 1–2 calls
- Explorer: 3–4 calls (find_similar_preferences, find_places_by_vector, search_places × N)
- Itinerary: 3–4 calls (weather, route × 2, output)

---

## Optimization 1 — Gemini context/prompt caching (Vertex AI)

**What:** ADK 2.1.0's `ContextCacheConfig` uploads each agent's system instruction +
tool definitions to Vertex once and returns a cache token. Subsequent calls send only
variable content (user message + session state); the large stable prefix is billed at
the cached-token rate (~4× cheaper than full input tokens on Gemini 2.0 Flash).

**Where:** `agent.py` — `App(context_cache_config=ContextCacheConfig(...))`.
ADK handles cache creation, reference injection into every `LlmRequest`, and refresh
after TTL or after `cache_intervals` invocations.

**Knobs:**
| Env var | Default | Meaning |
|---|---|---|
| `HODARI_CONTEXT_CACHE` | `1` (when Vertex) | Set `0` to disable |
| — | ttl=3600s | Cache lives 1 hour |
| — | cache_intervals=20 | Refresh after 20 invocations |
| — | min_tokens=1024 | Skip caching tiny requests |

**Estimated token savings per ITINERARY_PLANNING request:**

| Agent | System instruction (approx tokens) | Calls per request | Cached tokens saved |
|---|---|---|---|
| Orchestrator | ~4,000 | 2–3 | ~8,000–12,000 |
| Planner | ~600 | 1–2 | ~600–1,200 |
| Explorer | ~900 | 3–4 | ~2,700–3,600 |
| Itinerary | ~700 | 3–4 | ~2,100–2,800 |
| **Total** | | ~13 | **~13,400–19,600 prompt tokens** |

At Gemini 2.0 Flash pricing (~$0.075/1M input tokens, ~$0.019/1M cached tokens),
this is roughly **70–75% cost reduction on the prompt portion** of each pipeline run.
Wall time improvement is minimal (caching reduces billing, not latency).

**Requires:** `GOOGLE_GENAI_USE_VERTEXAI=TRUE`. No-op with AI Studio keys.

---

## Optimization 2 — LIST_DISCOVERY response cache

**What:** An in-process TTL dict (`hodari/tools/response_cache.py`) keyed by
normalized query string. On cache hit, `discover_places()` returns the stored JSON
immediately — zero LLM calls, zero Maps API quota, ~2ms instead of ~15 s.

**Where:** `tools/discovery.py` — `discover_places()` checks the cache before calling
Maps and stores the result after a live search.

**Normalization:** lowercase + collapse whitespace + strip punctuation. Preserves
location specifics ("near Camp Nou" ≠ "near Bernabeu") while collapsing
capitalisation/spacing variants of the same query.

**Knobs:**
| Env var | Default | Meaning |
|---|---|---|
| `HODARI_RESPONSE_CACHE_TTL` | `1200` (20 min) | Set `0` to disable |

**Token savings on cache hit:** 100% of all LLM and Maps tokens for that request.
LIST_DISCOVERY normally takes ~15 s and ~3–5 LLM calls. A cache hit takes ~0 s
and 0 calls.

**Staleness trade-off:** Place data (ratings, hours, existence) can change.
20 minutes is conservative — short enough to stay fresh in a live session,
long enough to absorb repeated queries from the same user or test suite.

---

## Combined impact (steady-state usage)

- **LIST_DISCOVERY repeat queries** (common in demos and user exploration):
  100% savings on cached turns.
- **ITINERARY_PLANNING** (every run, no response cache):
  70–75% cheaper prompt costs; wall time unchanged.
- **Net effect on the 230 s / 13-call baseline:**
  Latency is dominated by sequential Vertex round-trips (not prompt size),
  so wall time stays near the baseline. Token cost drops ~20–30% on a cold
  ITINERARY_PLANNING run and 100% on a cached LIST_DISCOVERY hit.

Phase 2 latency improvements (parallelising Planner + Explorer, streaming
itinerary output) are separate from this caching work.
