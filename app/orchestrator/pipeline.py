import json
from collections.abc import AsyncGenerator
from typing import Any

from app.agents.itinerary_agent import run_itinerary
from app.agents.planner import run_planner
from app.agents.researcher import run_researcher
from app.logging_config import get_logger
from app.mcp.client import mcp_client
from app.orchestrator.routing import RouteDecision, classify_turn
from app.schemas.plan import Plan
from app.schemas.requests import TurnRequest

logger = get_logger("orchestrator")


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def execute_turn(req: TurnRequest) -> AsyncGenerator[str, None]:
    logger.info(
        "turn_start",
        user_id=req.user_id,
        session_id=req.session_id,
    )

    profile = await mcp_client.get_user_profile(req.user_id)
    recent = await mcp_client.get_recent_turns(req.user_id, req.session_id)
    last_msg = recent[0].get("content") if recent else None

    negative_signals: list[str] = []
    if req.feedback and req.place_id:
        await mcp_client.save_preference(
            req.user_id,
            req.place_id,
            req.feedback,
            req.reason or "user_feedback",
            req.session_id,
        )
        negative_signals.append(req.place_id)
        yield _sse("status", {"phase": "preference_saved", "place_id": req.place_id})

    route = classify_turn(req, last_msg)
    yield _sse("status", {"phase": "routing", "route": route.value})

    location = {"lat": req.location.lat, "lng": req.location.lng}
    plan: Plan | None = None

    if route == RouteDecision.FULL_PIPELINE:
        yield _sse("status", {"phase": "planner", "message": "Planning your trip..."})
        plan = await run_planner(
            req.message or "Suggest something great nearby",
            location,
            profile,
            negative_signals,
        )
        yield _sse("plan", plan.model_dump(mode="json"))
    else:
        yield _sse("status", {"phase": "planner_skipped", "reason": "single_stop_swap"})
        plan = Plan(
            goal="Replace rejected stop",
            constraints={
                "time_budget_m": 240,
                "budget_usd": 60.0,
                "dietary_flags": profile.get("dietary_flags", []),
                "accessibility": profile.get("accessibility_needs", []),
                "location": location,
            },
            subtasks=[{"subtask_id": "st_swap", "category": "attraction", "filters": {}}],
            time_sensitive=False,
            negative_signals=negative_signals,
        )

    yield _sse("status", {"phase": "researcher", "message": "Finding places..."})
    candidates = await run_researcher(plan)
    for cs in candidates:
        yield _sse("candidates", cs.model_dump(mode="json"))

    yield _sse("status", {"phase": "itinerary", "message": "Building your route..."})
    itinerary = await run_itinerary(plan, candidates)

    for i, stop in enumerate(itinerary.stops):
        yield _sse("stop", {"index": i, **stop.model_dump(mode="json")})

    yield _sse("itinerary", itinerary.model_dump(mode="json"))
    yield _sse("token", {"text": itinerary.voice_summary})

    if req.message:
        await mcp_client.persist_turn(req.user_id, req.session_id, "user", req.message)
    await mcp_client.persist_turn(req.user_id, req.session_id, "assistant", itinerary.voice_summary)

    logger.info("turn_complete", user_id=req.user_id, session_id=req.session_id)
    yield _sse("done", {"ok": True})
