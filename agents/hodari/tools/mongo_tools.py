"""
MongoDB tools for Hodari agents.

All Atlas operations go through the MongoDB MCP HTTP server
(MONGODB_MCP_URL, default http://localhost:3100/mcp) — not a direct driver
connection. This satisfies the MongoDB prize-track partner-integration
requirement: every read/write to hodari.interactions is routed through MCP.
"""

import json
import logging
import os
import re
import threading
import uuid
from typing import Any, Optional

import requests
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)

MDB_MCP_URL = os.getenv("MONGODB_MCP_URL", "http://localhost:3100/mcp")
HODARI_DB = os.getenv("MONGODB_DATABASE", "hodari")

_session_id: Optional[str] = None


# ── MCP session & transport ──────────────────────────────────────────────────

def _init_session() -> str:
    resp = requests.post(
        MDB_MCP_URL,
        json={
            "jsonrpc": "2.0",
            "id": 0,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "hodari-agents", "version": "1.0"},
            },
        },
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
        timeout=10,
    )
    resp.raise_for_status()
    sid = resp.headers.get("mcp-session-id")
    if not sid:
        raise RuntimeError("MCP server did not return a session ID")
    return sid


def _mcp_tool(tool_name: str, arguments: dict) -> dict:
    """Call a MongoDB MCP tool; auto-renews the session on expiry (once)."""
    global _session_id
    if not _session_id:
        _session_id = _init_session()

    def _post(sid: str) -> requests.Response:
        return requests.post(
            MDB_MCP_URL,
            json={
                "jsonrpc": "2.0",
                "id": str(uuid.uuid4()),
                "method": "tools/call",
                "params": {"name": tool_name, "arguments": arguments},
            },
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
                "mcp-session-id": sid,
            },
            timeout=30,
        )

    resp = _post(_session_id)
    resp.raise_for_status()

    # Parse SSE line(s): "data: {...}"
    for line in resp.text.splitlines():
        if not line.startswith("data: "):
            continue
        payload = json.loads(line[6:])

        # Session expired — renew once and retry
        if payload.get("error", {}).get("code") == -32003:
            _session_id = _init_session()
            resp = _post(_session_id)
            resp.raise_for_status()
            for line2 in resp.text.splitlines():
                if line2.startswith("data: "):
                    payload = json.loads(line2[6:])
                    break

        if "error" in payload:
            raise RuntimeError(f"MCP error calling '{tool_name}': {payload['error']}")
        return payload.get("result", {})

    raise RuntimeError(f"No response data from MCP tool '{tool_name}'")


def _parse_docs(result: dict) -> list[dict]:
    """Extract document list from an MCP tool result."""
    # insert-many / update-many return structuredContent
    sc = result.get("structuredContent") or {}
    if isinstance(sc, list):
        return sc
    if "documents" in sc:
        return sc["documents"]

    # find / aggregate embed results inside untrusted-user-data blocks.
    # The warning text itself mentions the tag names, so the first regex match
    # captures " and " — not valid JSON. Use findall and try every match.
    for item in result.get("content", []):
        text = item.get("text", "")
        for block in re.findall(
            r"<untrusted-user-data-[^>]+>(.*?)</untrusted-user-data-[^>]+>",
            text,
            re.DOTALL,
        ):
            try:
                parsed = json.loads(block.strip())
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass

    return []


# ── Embedding (Vertex AI — still Python-side, no driver involved) ────────────

def _embed(text: str) -> list[float]:
    """768-dim embedding via Vertex AI text-embedding-004 (ADC auth)."""
    import google.auth
    import google.auth.transport.requests as _tr

    creds, detected_project = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    creds.refresh(_tr.Request())

    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or detected_project
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
    if location == "global":
        location = "us-central1"

    url = (
        f"https://{location}-aiplatform.googleapis.com/v1"
        f"/projects/{project}/locations/{location}"
        f"/publishers/google/models/text-embedding-004:predict"
    )
    resp = requests.post(
        url,
        headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"},
        json={"instances": [{"content": text, "task_type": "RETRIEVAL_QUERY"}]},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["predictions"][0]["embeddings"]["values"]


# ── ADK tool helpers ─────────────────────────────────────────────────────────

def _user_id(tool_context: ToolContext) -> str:
    try:
        return tool_context.invocation_context.session.user_id
    except AttributeError:
        pass
    try:
        return tool_context.state.get("_user_id", "anonymous")
    except Exception:
        return "anonymous"


# ── Public tools ─────────────────────────────────────────────────────────────

def load_user_profile(tool_context: ToolContext) -> dict:
    """Load the current user's profile from MongoDB via MCP.

    Call at the start of every planning request to personalise the itinerary.
    Returns dietary restrictions, budget tier, accessibility needs, and language.
    Returns a minimal dict if no profile exists yet (new user).
    """
    uid = _user_id(tool_context)
    try:
        result = _mcp_tool("find", {
            "database": HODARI_DB,
            "collection": "users",
            "filter": {"user_id": uid},
            "limit": 1,
        })
        docs = _parse_docs(result)
        if docs:
            doc = {k: v for k, v in docs[0].items() if k != "_id"}
            tool_context.state["user_profile"] = doc
            return doc
        profile = {"user_id": uid, "new_user": True}
        tool_context.state["user_profile"] = profile
        return profile
    except Exception as exc:
        logger.warning("load_user_profile failed: %s", exc)
        return {}


def _city_from_address(address: str) -> str:
    """Best-effort city extraction from a Google-style address string."""
    parts = [p.strip() for p in address.split(",") if p.strip()]
    if len(parts) >= 2:
        return parts[-2]
    return parts[-1] if parts else ""


def _persist_preference_sync(
    user_id: str,
    place_id: str,
    place_name: str,
    city: str,
    action: str,
) -> None:
    """Write one interaction record (embedding + MCP upsert). Blocking."""
    embedding = _embed(f"{place_name} {city} {action}")
    _mcp_tool("update-many", {
        "database": HODARI_DB,
        "collection": "interactions",
        "filter": {"user_id": user_id, "place_id": place_id},
        "update": {
            "$set": {
                "place_name": place_name,
                "city": city,
                "action": action,
                "embedding": embedding,
            }
        },
        "upsert": True,
    })


def enqueue_preference_saves(user_id: str, stops: list[dict[str, Any]]) -> int:
    """Persist itinerary stop recommendations in a background thread.

    Returns the number of stops queued. Non-blocking for the caller.
    """
    if not stops:
        return 0

    work = []
    for stop in stops:
        place_id = stop.get("place_id")
        place_name = stop.get("name")
        if not place_id or not place_name:
            continue
        city = stop.get("city") or _city_from_address(stop.get("address", ""))
        work.append((place_id, place_name, city))

    if not work:
        return 0

    def _run() -> None:
        for place_id, place_name, city in work:
            try:
                _persist_preference_sync(
                    user_id, place_id, place_name, city, "recommended"
                )
            except Exception as exc:
                logger.warning(
                    "Background save_preference failed for %s: %s", place_name, exc
                )

    threading.Thread(
        target=_run,
        name="hodari-save-preferences",
        daemon=True,
    ).start()
    logger.info("Queued %d preference saves for user %s", len(work), user_id)
    return len(work)


def parse_itinerary_stops(raw: Any) -> list[dict[str, Any]]:
    """Extract stops from session-state itinerary (JSON string or dict)."""
    if raw is None:
        return []
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
        stops = data.get("stops") if isinstance(data, dict) else None
        return stops if isinstance(stops, list) else []
    except (json.JSONDecodeError, AttributeError, TypeError):
        return []


def save_preference(
    place_id: str,
    place_name: str,
    city: str,
    action: str,
    tool_context: ToolContext,
) -> str:
    """Record a user interaction with a place to power future personalisation.

    Args:
        place_id:   Google Place ID of the place.
        place_name: Human-readable name (e.g. "Alive Restaurant").
        city:       City of the place (e.g. "Barcelona").
        action:     One of: recommended, liked, visited, skipped, disliked.
        tool_context: Injected by ADK.

    Writes to Atlas via the MongoDB MCP server — no direct driver call.
    """
    uid = _user_id(tool_context)
    try:
        _persist_preference_sync(uid, place_id, place_name, city, action)
        return f"Saved: {action} → {place_name} ({city})"
    except Exception as exc:
        logger.warning("save_preference failed: %s", exc)
        return "Preference not saved (non-critical)."


def find_similar_preferences(
    query: str,
    tool_context: ToolContext,
    limit: int = 5,
) -> list[dict]:
    """Find places from the user's past interactions most similar to the current request.

    Use BEFORE searching for new places to bias results toward the user's taste.
    Returns an empty list if the user has no history or the vector index is not ready.

    Args:
        query: What the user is looking for (e.g. "vegetarian tapas near Camp Nou").
        limit: Maximum results to return (default 5).
        tool_context: Injected by ADK.
    """
    uid = _user_id(tool_context)
    profile = tool_context.state.get("user_profile") or {}
    if profile.get("new_user"):
        logger.info("find_similar_preferences skipped: new user has no history")
        return []

    try:
        q_embedding = _embed(query)
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "interactions_embedding",
                    "path": "embedding",
                    "queryVector": q_embedding,
                    "numCandidates": limit * 6,
                    "limit": limit,
                    "filter": {"user_id": {"$eq": uid}},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "place_id": 1,
                    "place_name": 1,
                    "city": 1,
                    "action": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]
        result = _mcp_tool("aggregate", {
            "database": HODARI_DB,
            "collection": "interactions",
            "pipeline": pipeline,
        })
        return _parse_docs(result)
    except Exception as exc:
        logger.info("find_similar_preferences returned empty (index not ready?): %s", exc)
        return []
