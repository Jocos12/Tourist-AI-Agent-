"""In-process performance traces for Hodari agent runs (Phase B observability)."""

from __future__ import annotations

import contextvars
from dataclasses import dataclass, field
import logging
import threading
import time
from typing import Optional

current_invocation_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "hodari_invocation_id",
    default=None,
)

logger = logging.getLogger(__name__)

_traces: dict[str, InvocationTrace] = {}
_lock = threading.Lock()


@dataclass
class LlmCallRecord:
    seq: int
    agent: str
    model: Optional[str]
    prompt_tokens: Optional[int]
    output_tokens: Optional[int]
    thought_tokens: Optional[int]
    duration_s: float


@dataclass
class ToolCallRecord:
    seq: int
    agent: str
    tool: str
    duration_s: float


@dataclass
class SubstepRecord:
    seq: int
    name: str
    duration_s: float


@dataclass
class InvocationTrace:
    invocation_id: str
    intent_type: Optional[str] = None
    started_at: float = field(default_factory=time.perf_counter)
    llm_calls: list[LlmCallRecord] = field(default_factory=list)
    tool_calls: list[ToolCallRecord] = field(default_factory=list)
    substeps: list[SubstepRecord] = field(default_factory=list)
    _pending_llm: dict[str, tuple[str, Optional[str], float]] = field(
        default_factory=dict
    )
    _pending_tool: dict[str, tuple[str, str, float]] = field(default_factory=dict)
    _llm_seq: int = 0
    _tool_seq: int = 0
    _substep_seq: int = 0

    def begin_llm(self, key: str, agent: str, model: Optional[str]) -> None:
        self._pending_llm[key] = (agent, model, time.perf_counter())

    def end_llm(
        self,
        key: str,
        *,
        prompt_tokens: Optional[int],
        output_tokens: Optional[int],
        thought_tokens: Optional[int],
    ) -> None:
        pending = self._pending_llm.pop(key, None)
        if not pending:
            return
        agent, model, started = pending
        self._llm_seq += 1
        self.llm_calls.append(
            LlmCallRecord(
                seq=self._llm_seq,
                agent=agent,
                model=model,
                prompt_tokens=prompt_tokens,
                output_tokens=output_tokens,
                thought_tokens=thought_tokens,
                duration_s=round(time.perf_counter() - started, 3),
            )
        )

    def begin_tool(self, key: str, agent: str, tool: str) -> None:
        self._pending_tool[key] = (agent, tool, time.perf_counter())

    def end_tool(self, key: str) -> None:
        pending = self._pending_tool.pop(key, None)
        if not pending:
            return
        agent, tool, started = pending
        self._tool_seq += 1
        self.tool_calls.append(
            ToolCallRecord(
                seq=self._tool_seq,
                agent=agent,
                tool=tool,
                duration_s=round(time.perf_counter() - started, 3),
            )
        )

    def record_substep(self, name: str, duration_s: float) -> None:
        self._substep_seq += 1
        self.substeps.append(
            SubstepRecord(
                seq=self._substep_seq,
                name=name,
                duration_s=round(duration_s, 3),
            )
        )

    @property
    def wall_s(self) -> float:
        return round(time.perf_counter() - self.started_at, 3)

    @property
    def llm_total_s(self) -> float:
        return round(sum(c.duration_s for c in self.llm_calls), 3)

    @property
    def tool_total_s(self) -> float:
        return round(sum(c.duration_s for c in self.tool_calls), 3)


def get_trace(invocation_id: str) -> InvocationTrace:
    with _lock:
        trace = _traces.get(invocation_id)
        if trace is None:
            trace = InvocationTrace(invocation_id=invocation_id)
            _traces[invocation_id] = trace
        return trace


def pop_trace(invocation_id: str) -> Optional[InvocationTrace]:
    with _lock:
        return _traces.pop(invocation_id, None)


def record_intent(intent_type: str) -> None:
    inv_id = current_invocation_id.get()
    if not inv_id:
        return
    get_trace(inv_id).intent_type = intent_type
    logger.info("HODARI intent_type=%s invocation=%s", intent_type, inv_id)


def format_trace_summary(trace: InvocationTrace) -> str:
    """Render a compact text table for ADK logs."""
    lines = [
        "",
        "=" * 72,
        f"HODARI PROFILE  invocation={trace.invocation_id}",
        f"intent_type={trace.intent_type or 'unknown'}",
        "=" * 72,
        f"{'#':>3}  {'Agent':<22} {'Prompt':>7} {'Output':>7} {'Thought':>7} {'Duration':>9}",
        "-" * 72,
    ]
    for call in trace.llm_calls:
        lines.append(
            f"{call.seq:>3}  {call.agent:<22} "
            f"{_fmt_int(call.prompt_tokens):>7} "
            f"{_fmt_int(call.output_tokens):>7} "
            f"{_fmt_int(call.thought_tokens):>7} "
            f"{call.duration_s:>8.3f}s"
        )
    lines.append("-" * 72)
    lines.append(
        f"LLM subtotal: {len(trace.llm_calls)} calls, {trace.llm_total_s:.3f}s"
    )
    if trace.tool_calls:
        lines.append("")
        lines.append(f"{'#':>3}  {'Agent':<22} {'Tool':<28} {'Duration':>9}")
        lines.append("-" * 72)
        for call in trace.tool_calls:
            lines.append(
                f"{call.seq:>3}  {call.agent:<22} {call.tool:<28} {call.duration_s:>8.3f}s"
            )
        lines.append("-" * 72)
        lines.append(
            f"Tool subtotal: {len(trace.tool_calls)} calls, {trace.tool_total_s:.3f}s"
        )
    if trace.substeps:
        lines.append("")
        lines.append(f"{'#':>3}  {'Substep':<40} {'Duration':>9}")
        lines.append("-" * 72)
        for step in trace.substeps:
            lines.append(
                f"{step.seq:>3}  {step.name:<40} {step.duration_s:>8.3f}s"
            )
    lines.append("-" * 72)
    lines.append(
        f"Wall time: {trace.wall_s:.3f}s  "
        f"(LLM {trace.llm_total_s:.3f}s + tools {trace.tool_total_s:.3f}s)"
    )
    lines.append("=" * 72)
    return "\n".join(lines)


def log_trace_summary(trace: InvocationTrace) -> None:
    logger.info(format_trace_summary(trace))


def record_substep(name: str, duration_s: float) -> None:
    inv_id = current_invocation_id.get()
    if not inv_id:
        return
    get_trace(inv_id).record_substep(name, duration_s)


def _fmt_int(value: Optional[int]) -> str:
    return str(value) if value is not None else "-"
