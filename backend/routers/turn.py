from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agents import Orchestrator
from schemas import AgentTurn, Location
from tools import load_session
from utils.logger import get_logger, log_error
from utils.sse import SSEManager, sse_event


router = APIRouter(prefix="/agent", tags=["agent"])
logger = get_logger(__name__)
orchestrator = Orchestrator()


class TurnRequest(BaseModel):
    user_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    location: Location = Field(default_factory=lambda: Location(lat=0.0, lng=0.0))
    lat: float | None = None
    lng: float | None = None
    session_id: str = Field(min_length=1)
    feedback: str | None = None
    place_id: str | None = None


async def _stream_turn(request: TurnRequest) -> AsyncIterator[str]:
    logger.info("turn_start", user_id=request.user_id, session_id=request.session_id)

    try:
        location = (
            Location(lat=request.lat, lng=request.lng)
            if request.lat is not None and request.lng is not None
            else request.location
        )
        session = await load_session(request.user_id, request.session_id)
        turn = AgentTurn(
            user_id=request.user_id,
            message=request.message,
            location=location,
            session_id=request.session_id,
            feedback=request.feedback,  # type: ignore[arg-type]
            place_id=request.place_id,
        )

        queue: asyncio.Queue[dict] = asyncio.Queue()

        async def _execute() -> None:
            try:
                await orchestrator.execute_turn(turn, session, queue)  # type: ignore[attr-defined]
            except Exception as exc:
                log_error(request.user_id, request.session_id, type(exc).__name__, str(exc), "orchestrator")
                await queue.put(
                    {
                        "type": "error",
                        "message": "The orchestrator failed to complete this turn.",
                        "recoverable": True,
                    }
                )

        task = asyncio.create_task(_execute())
        async for event in SSEManager.stream_generator(queue):
            yield event
        await task
        logger.info("turn_complete", user_id=request.user_id, session_id=request.session_id)
    except Exception as exc:
        log_error(request.user_id, request.session_id, type(exc).__name__, str(exc), "router")
        yield sse_event(
            {"type": "error", "message": "The orchestrator failed to complete this turn.", "recoverable": True}
        )


@router.post("/turn")
async def turn(request: TurnRequest) -> StreamingResponse:
    return StreamingResponse(
        _stream_turn(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
