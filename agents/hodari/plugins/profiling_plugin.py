"""ADK plugin: per-call LLM and tool timing for Hodari (Phase B)."""

from __future__ import annotations

import os
import uuid
from typing import Any, Optional

from google.adk.agents.base_agent import BaseAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.plugins.base_plugin import BasePlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from typing_extensions import override

from ..telemetry import (
    current_invocation_id,
    get_trace,
    log_trace_summary,
    pop_trace,
)


def profiling_enabled() -> bool:
    return os.getenv("HODARI_PROFILING", "1").lower() not in ("0", "false", "no")


class ProfilingPlugin(BasePlugin):
    """Records LLM token usage and tool durations; logs a summary after each run."""

    def __init__(self, name: str = "hodari_profiling") -> None:
        super().__init__(name)

    @override
    async def before_model_callback(
        self, *, callback_context: CallbackContext, llm_request: LlmRequest
    ) -> Optional[LlmResponse]:
        trace = get_trace(callback_context.invocation_id)
        key = f"llm:{uuid.uuid4().hex}"
        trace.begin_llm(
            key,
            callback_context.agent_name,
            llm_request.model,
        )
        callback_context.state["_hodari_llm_key"] = key
        return None

    @override
    async def after_model_callback(
        self, *, callback_context: CallbackContext, llm_response: LlmResponse
    ) -> Optional[LlmResponse]:
        trace = get_trace(callback_context.invocation_id)
        key = callback_context.state.get("_hodari_llm_key")
        if not isinstance(key, str):
            return None

        usage = llm_response.usage_metadata
        prompt_tokens = getattr(usage, "prompt_token_count", None) if usage else None
        output_tokens = (
            getattr(usage, "candidates_token_count", None) if usage else None
        )
        thought_tokens = (
            getattr(usage, "thoughts_token_count", None) if usage else None
        )
        trace.end_llm(
            key,
            prompt_tokens=prompt_tokens,
            output_tokens=output_tokens,
            thought_tokens=thought_tokens,
        )
        return None

    @override
    async def before_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict[str, Any],
        tool_context: ToolContext,
    ) -> Optional[dict]:
        trace = get_trace(tool_context.invocation_id)
        call_id = tool_context.function_call_id or uuid.uuid4().hex
        key = f"tool:{tool.name}:{call_id}"
        trace.begin_tool(key, tool_context.agent_name, tool.name)
        tool_context.state["_hodari_tool_key"] = key
        return None

    @override
    async def after_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict[str, Any],
        tool_context: ToolContext,
        result: dict,
    ) -> Optional[dict]:
        trace = get_trace(tool_context.invocation_id)
        key = tool_context.state.get("_hodari_tool_key")
        if isinstance(key, str):
            trace.end_tool(key)
        return None

    @override
    async def before_run_callback(
        self, *, invocation_context: InvocationContext
    ) -> None:
        current_invocation_id.set(invocation_context.invocation_id)
        return None

    @override
    async def after_run_callback(
        self, *, invocation_context: InvocationContext
    ) -> None:
        trace = pop_trace(invocation_context.invocation_id)
        if trace and (trace.llm_calls or trace.tool_calls):
            log_trace_summary(trace)
        current_invocation_id.set(None)


def create_profiling_plugin() -> ProfilingPlugin:
    return ProfilingPlugin()
