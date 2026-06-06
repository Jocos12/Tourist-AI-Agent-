"""AgentTool wrapper that enqueues preference saves after the planning pipeline."""

from __future__ import annotations

import logging
from typing import Any

from google.adk.agents.base_agent import BaseAgent
from google.adk.tools.agent_tool import AgentTool
from google.adk.tools.tool_context import ToolContext

from .mongo_tools import (
    _user_id,
    enqueue_preference_saves,
    parse_itinerary_stops,
)

logger = logging.getLogger(__name__)


class HodariPipelineTool(AgentTool):
    """Runs hodari_pipeline and saves stop preferences in the background."""

    def __init__(self, agent: BaseAgent, **kwargs: Any) -> None:
        super().__init__(agent, **kwargs)

    async def run_async(
        self,
        *,
        args: dict[str, Any],
        tool_context: ToolContext,
    ) -> Any:
        result = await super().run_async(args=args, tool_context=tool_context)
        try:
            stops = parse_itinerary_stops(tool_context.state.get("itinerary"))
            if stops:
                enqueue_preference_saves(_user_id(tool_context), stops)
        except Exception as exc:
            logger.warning("Failed to enqueue background preference saves: %s", exc)
        return result
