"""
MongoDB tools for Hodari agents (Phase 2).

Provides:
  load_user_profile        — Orchestrator reads users collection
  save_preference          — Orchestrator writes interactions collection
  find_similar_preferences — Explorer queries Atlas Vector Search
"""

import os
import logging
import requests
from typing import Optional
from pymongo import MongoClient
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)

_client: Optional[MongoClient] = None


def _db():
    global _client
    if _client is None:
        _client = MongoClient(os.environ["MONGODB_URI"])
    return _client[os.environ.get("MONGODB_DATABASE", "hodari")]


def _user_id(tool_context: ToolContext) -> str:
    """Extract user_id from ADK ToolContext (handles multiple ADK versions)."""
    try:
        return tool_context.invocation_context.session.user_id
    except AttributeError:
        pass
    try:
        return tool_context.state.get("_user_id", "anonymous")
    except Exception:
        return "anonymous"


def _embed(text: str) -> list[float]:
    """768-dim embedding via Vertex AI text-embedding-004 (ADC auth, no API key needed)."""
    import google.auth
    import google.auth.transport.requests as _auth_transport

    creds, detected_project = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    creds.refresh(_auth_transport.Request())

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
        headers={
            "Authorization": f"Bearer {creds.token}",
            "Content-Type": "application/json",
        },
        json={"instances": [{"content": text, "task_type": "RETRIEVAL_QUERY"}]},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["predictions"][0]["embeddings"]["values"]


# ── Public tools ────────────────────────────────────────────────────────────

def load_user_profile(tool_context: ToolContext) -> dict:
    """Load the current user's preferences and profile from MongoDB.

    Call this at the start of every planning request to personalise the itinerary.
    Returns dietary restrictions, budget tier, accessibility needs, and language.
    Returns a minimal dict if no profile exists yet (new user).
    """
    uid = _user_id(tool_context)
    try:
        doc = _db()["users"].find_one({"user_id": uid}, {"_id": 0})
        if doc:
            # Cache in session state so sub-agents can read it
            tool_context.state["user_profile"] = doc
            return doc
        profile = {"user_id": uid, "new_user": True}
        tool_context.state["user_profile"] = profile
        return profile
    except Exception as exc:
        logger.warning("load_user_profile failed: %s", exc)
        return {}


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
        action:     Interaction type — one of: recommended, liked, visited, skipped, disliked.
        tool_context: Injected by ADK.

    Returns a short confirmation string.
    """
    uid = _user_id(tool_context)
    try:
        embedding = _embed(f"{place_name} {city} {action}")
        _db()["interactions"].update_one(
            {"user_id": uid, "place_id": place_id},
            {
                "$set": {
                    "place_name": place_name,
                    "city": city,
                    "action": action,
                    "embedding": embedding,
                }
            },
            upsert=True,
        )
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

    Use this BEFORE searching for new places to bias results toward the user's taste.
    Returns an empty list if the user has no history or vector search is not yet configured.

    Args:
        query: What the user is looking for (e.g. "vegetarian tapas near Camp Nou Barcelona").
        limit: Maximum results to return (default 5).
        tool_context: Injected by ADK.

    Returns list of dicts: [{place_name, city, action, score}, ...], sorted by similarity.
    """
    uid = _user_id(tool_context)
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
        results = list(_db()["interactions"].aggregate(pipeline))
        return results
    except Exception as exc:
        # Vector search index not set up yet — gracefully return empty
        logger.info("find_similar_preferences returned empty (index not ready?): %s", exc)
        return []
