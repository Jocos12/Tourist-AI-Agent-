from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

from mcp.client import mcp_client
from schemas import Interaction
from utils.logger import log_error, log_preference_saved


async def save_preference(
    user_id: str,
    place_id: str,
    signal: str,
    context: dict,
    session_id: str,
) -> dict:
    try:
        interaction = Interaction(
            user_id=user_id,
            place_id=place_id,
            signal=signal,  # type: ignore[arg-type]
            context=context,
            session_id=session_id,
            timestamp=datetime.now(UTC),
        )
        await mcp_client.insert_one("interactions", interaction.model_dump(mode="json"))
        log_preference_saved(user_id, session_id, place_id, signal)
        return {"ack": True, "place_id": place_id, "signal": signal}
    except Exception as exc:
        log_error(user_id, session_id, type(exc).__name__, str(exc), "memory")
        return {"ack": False, "place_id": place_id, "signal": signal}


async def save_session_update(
    *,
    user_id: str,
    session_id: str,
    message: str,
    response: str,
    state: dict[str, Any],
) -> None:
    now = datetime.now(UTC).isoformat()
    await mcp_client.update_one(
        "sessions",
        {"user_id": user_id, "session_id": session_id},
        {
            "$set": {
                "user_id": user_id,
                "session_id": session_id,
                "state": state,
                "updated_at": now,
            },
            "$push": {
                "messages": {
                    "$each": [
                        {"role": "user", "content": message, "created_at": now},
                        {"role": "assistant", "content": response, "created_at": now},
                    ]
                }
            },
            "$setOnInsert": {"created_at": now},
        },
    )
