"""AgentTool wrapper: intent routing + pipeline + background preference saves."""

from __future__ import annotations

import logging
from typing import Any

from google.adk.agents.base_agent import BaseAgent
from google.adk.tools.agent_tool import AgentTool
from google.adk.tools.tool_context import ToolContext

from ..intent import ITINERARY_PLANNING, LIST_DISCOVERY, classify_intent
from ..telemetry import record_intent
from .discovery import discover_places
from .mongo_tools import (
    _user_id,
    enqueue_preference_saves,
    parse_itinerary_stops,
)

logger = logging.getLogger(__name__)


class HodariPipelineTool(AgentTool):
    """Routes LIST_DISCOVERY to the fast path; ITINERARY_PLANNING runs the full pipeline."""

    def __init__(self, agent: BaseAgent, **kwargs: Any) -> None:
        super().__init__(agent, **kwargs)

    async def run_async(
        self,
        *,
        args: dict[str, Any],
        tool_context: ToolContext,
    ) -> Any:
        request = args.get("request", "")
        intent = classify_intent(request)
        record_intent(intent)
        tool_context.state["intent_type"] = intent
        logger.info("hodari_pipeline intent=%s request=%r", intent, request[:120])

        if intent == LIST_DISCOVERY:
            return await discover_places(request, tool_context)

        tool_context.state["intent_type"] = ITINERARY_PLANNING
        result = await super().run_async(args=args, tool_context=tool_context)
        try:
            stops = parse_itinerary_stops(tool_context.state.get("itinerary"))
            if stops:
                enqueue_preference_saves(_user_id(tool_context), stops)
        except Exception as exc:
            logger.warning("Failed to enqueue background preference saves: %s", exc)
        return result
