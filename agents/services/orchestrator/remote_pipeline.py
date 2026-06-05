"""
remote_pipeline.py
------------------
Builds a production LlmAgent whose three pipeline steps (Planner, Explorer,
Itinerary) are dispatched as HTTP calls to independent Cloud Run services
instead of running in-process.

Each helper follows the ADK HTTP API contract:
  POST {service}/apps/{app}/users/{uid}/sessions/{sid}   → create session
  POST {service}/run                                      → execute agent
"""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any

import requests
from google.adk.agents import LlmAgent

logger = logging.getLogger(__name__)

_TIMEOUT = 120  # seconds per remote call
_USER_ID = "prod_user"


# ── Low-level ADK HTTP helpers ────────────────────────────────────────────────

def _ensure_session(service_url: str, app_name: str, session_id: str) -> None:
    """Create an ADK session on the remote service (idempotent — 409 is OK)."""
    url = f"{service_url.rstrip('/')}/apps/{app_name}/users/{_USER_ID}/sessions/{session_id}"
    resp = requests.post(url, json={}, timeout=_TIMEOUT)
    if resp.status_code not in (200, 201, 409):
        resp.raise_for_status()


def _run_agent(
    service_url: str,
    app_name: str,
    session_id: str,
    message: str,
    agent_author: str,
) -> str:
    """
    POST to /run and return the text from the last event whose author matches
    *agent_author*.  Falls back to the very last text-bearing event.
    """
    payload: dict[str, Any] = {
        "app_name": app_name,
        "user_id": _USER_ID,
        "session_id": session_id,
        "new_message": {
            "role": "user",
            "parts": [{"text": message}],
        },
        "streaming": False,
    }
    resp = requests.post(
        f"{service_url.rstrip('/')}/run",
        json=payload,
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()

    events: list[dict] = resp.json()  # list of ADK event dicts

    # Prefer the last event from the target agent author
    candidate_texts: list[str] = []
    for event in reversed(events):
        if event.get("author") == agent_author:
            parts = (
                event.get("content", {}).get("parts", [])
                or event.get("message", {}).get("parts", [])
            )
            texts = [p["text"] for p in parts if isinstance(p, dict) and "text" in p]
            if texts:
                return "\n".join(texts)

    # Fallback: last event with any text
    for event in reversed(events):
        parts = (
            event.get("content", {}).get("parts", [])
            or event.get("message", {}).get("parts", [])
        )
        texts = [p["text"] for p in parts if isinstance(p, dict) and "text" in p]
        if texts:
            candidate_texts = texts
            break

    return "\n".join(candidate_texts) if candidate_texts else ""


# ── Tool factory ──────────────────────────────────────────────────────────────

def _make_tools(planner_url: str, explorer_url: str, itinerary_url: str):
    """
    Return three plain Python functions (ADK FunctionTools) that call the
    remote services.  Each call gets a fresh session ID so there is no
    cross-request state leakage.
    """

    def call_planner(user_request: str) -> str:
        """Call the remote Planner service with the user's request.

        Returns a Plan JSON string describing the goal, constraints, and
        ordered subtasks.  Pass the result directly to call_explorer.

        Args:
            user_request: The original user message exactly as received.
        """
        session_id = f"planner-{uuid.uuid4().hex}"
        try:
            _ensure_session(planner_url, "planner", session_id)
            result = _run_agent(
                planner_url, "planner", session_id, user_request, "planner_agent"
            )
            logger.debug("call_planner returned %d chars", len(result))
            return result or '{"error": "planner returned empty response"}'
        except Exception as exc:
            logger.warning("call_planner failed: %s", exc)
            return f"Error calling planner: {exc}"

    def call_explorer(plan_json: str) -> str:
        """Call the remote Explorer service with the plan produced by call_planner.

        Searches Google Maps and personalises results against the user's
        interaction history.  Returns a CandidateSet JSON array (5-10 places).

        Args:
            plan_json: The raw JSON string returned by call_planner.
        """
        session_id = f"explorer-{uuid.uuid4().hex}"
        try:
            _ensure_session(explorer_url, "explorer", session_id)
            result = _run_agent(
                explorer_url, "explorer", session_id, plan_json, "explorer_agent"
            )
            logger.debug("call_explorer returned %d chars", len(result))
            return result or '[]'
        except Exception as exc:
            logger.warning("call_explorer failed: %s", exc)
            return f"Error calling explorer: {exc}"

    def call_itinerary(plan_json: str, candidates_json: str) -> str:
        """Call the remote Itinerary service to build a routed itinerary.

        Combines the plan and candidate places, calls compute_routes between
        stops, and returns a weather-aware 2-3 stop Itinerary JSON string.

        Args:
            plan_json:       The raw JSON string returned by call_planner.
            candidates_json: The raw JSON string returned by call_explorer.
        """
        session_id = f"itinerary-{uuid.uuid4().hex}"
        message = (
            f"PLAN:\n{plan_json}\n\nCANDIDATES:\n{candidates_json}"
        )
        try:
            _ensure_session(itinerary_url, "itinerary", session_id)
            result = _run_agent(
                itinerary_url, "itinerary", session_id, message, "itinerary_agent"
            )
            logger.debug("call_itinerary returned %d chars", len(result))
            return result or '{"error": "itinerary returned empty response"}'
        except Exception as exc:
            logger.warning("call_itinerary failed: %s", exc)
            return f"Error calling itinerary: {exc}"

    return call_planner, call_explorer, call_itinerary


# ── Public builder ────────────────────────────────────────────────────────────

def build_remote_orchestrator(
    planner_url: str,
    explorer_url: str,
    itinerary_url: str,
) -> LlmAgent:
    """
    Return a production LlmAgent that fans out to three Cloud Run services.
    """
    # Import mongo tools here to keep top-level import clean
    sys_path_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    import sys
    if sys_path_root not in sys.path:
        sys.path.insert(0, sys_path_root)

    from hodari.tools.mongo_tools import load_user_profile, save_preference  # noqa: E402

    call_planner, call_explorer, call_itinerary = _make_tools(
        planner_url, explorer_url, itinerary_url
    )

    REMOTE_ORCHESTRATOR_INSTRUCTION = """You are Hodari, a friendly tourist AI assistant for the 2026 FIFA World Cup.
You help football fans find great places and build feasible itineraries before, between, and after matches.

CRITICAL: Always respond in natural, friendly language. NEVER output raw JSON or code blocks.
CRITICAL: Never use em dashes (the "—" character) in your replies. Use commas, periods, or
parentheses instead. This applies to every message you send the user.

═══ PLANNING FLOW ═══

When the user asks to plan activities or find places:

STEP 1 — Load profile (always first):
  Call load_user_profile() — no arguments needed.
  This returns the user's dietary restrictions, budget, and accessibility needs.
  Silently use this to shape the subsequent steps (do not quote it back to the user).

STEP 2 — Plan:
  Call call_planner with the user's original request as-is.
  This returns a Plan JSON string (goal, constraints, subtasks).

STEP 3 — Explore:
  Call call_explorer with the Plan JSON string from STEP 2.
  This returns a CandidateSet JSON array of 5-10 personalised places.

STEP 4 — Build itinerary:
  Call call_itinerary with two arguments:
    plan_json       = the Plan JSON string from STEP 2
    candidates_json = the CandidateSet JSON string from STEP 3
  This returns an Itinerary JSON string with stops, routes, and a voice summary.

STEP 5 — Present the itinerary:
  Format the result as a friendly message. Example:

  Here's your afternoon near Camp Nou 🗺️

  1. **Alive Restaurant** (2:00 PM · 45 min)
     Great vegan tapas, 0.4 km from Camp Nou. ~5 min walk.

  2. **FC Barcelona Museum** (3:00 PM · 1 hr)
     Immerse yourself in Barça history right before the game. 0.7 km · ~7 min walk.

  Total: ~2 h 30 min · 1.1 km
  *A vegetarian-friendly afternoon with culture and great food near the stadium.*

  Use **bold** for place names, include arrival time, duration, and short walking info.
  End with the voice_summary as a friendly italic closing line.

STEP 6 — Save preferences (always after presenting):
  For each stop in the itinerary, call save_preference with:
    place_id   = the stop's place_id
    place_name = the stop's name
    city       = the city (extract from the address)
    action     = "recommended"
  This builds the user's taste profile for future personalisation.

═══ ERROR HANDLING ═══

If any step returns an error string (starts with "Error calling"):
  Tell the user there was a temporary issue and ask them to try again.
  Do NOT expose raw error messages or stack traces.

═══ OTHER REQUESTS ═══

For simple follow-up questions ("what are the opening hours?", "is it expensive?"):
  Answer directly without re-running the pipeline.

For refinements ("cheaper option", "only 2 hours", "add one more stop"):
  Re-run from STEP 1.

Keep answers concise — users are on mobile near a stadium.
"""

    return LlmAgent(
        model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        name="hodari",
        description="Hodari — tourist AI assistant for the 2026 FIFA World Cup (remote pipeline)",
        instruction=REMOTE_ORCHESTRATOR_INSTRUCTION,
        tools=[
            load_user_profile,
            save_preference,
            call_planner,
            call_explorer,
            call_itinerary,
        ],
    )
