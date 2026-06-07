from __future__ import annotations

import os
from datetime import UTC, datetime

from pymongo.errors import DuplicateKeyError

from mcp.client import mcp_client
from schemas import Interaction, UserProfile, UserSession
from utils.logger import get_logger


logger = get_logger(__name__)


async def load_session(user_id: str, session_id: str) -> UserSession:
    profile_doc = await mcp_client.find_one("users", {"user_id": user_id})
    if not profile_doc:
        profile = UserProfile(user_id=user_id, created_at=datetime.now(UTC))
        try:
            await mcp_client.insert_one("users", profile.model_dump(mode="json", exclude_none=True))
        except DuplicateKeyError:
            # Some Atlas seed data has a unique email index that rejects repeated nulls.
            # The in-memory profile is enough for this turn if the insert races or fails.
            logger.warning("user_profile_insert_duplicate", user_id=user_id, session_id=session_id)
    else:
        profile_doc.pop("_id", None)
        profile = UserProfile.model_validate(profile_doc)

    interaction_docs = await mcp_client.find_many(
        "interactions",
        {"user_id": user_id, "session_id": session_id},
        sort={"timestamp": -1},
        limit=5,
    )
    interactions: list[Interaction] = []
    for doc in interaction_docs:
        doc.pop("_id", None)
        interactions.append(Interaction.model_validate(doc))

    negative_signals = [
        interaction.place_id
        for interaction in interactions
        if interaction.signal in {"disliked", "skipped"}
    ]
    logger.info(
        "session_loaded",
        user_id=user_id,
        session_id=session_id,
        agent="memory",
        duration_ms=None,
        interaction_count=len(interactions),
    )
    return UserSession(
        user_id=user_id,
        session_id=session_id,
        profile=profile,
        recent_interactions=interactions,
        negative_signals=negative_signals,
    )
