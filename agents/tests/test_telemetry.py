"""Tests for Hodari Phase B telemetry formatting."""

from hodari.telemetry import (
    InvocationTrace,
    LlmCallRecord,
    ToolCallRecord,
    format_trace_summary,
)


def test_format_trace_summary_includes_llm_and_tools():
    trace = InvocationTrace(invocation_id="test-inv")
    trace.llm_calls = [
        LlmCallRecord(
            seq=1,
            agent="hodari",
            model="gemini-3.5-flash",
            prompt_tokens=1432,
            output_tokens=12,
            thought_tokens=120,
            duration_s=8.1,
        ),
        LlmCallRecord(
            seq=2,
            agent="explorer_agent",
            model="gemini-3.5-flash",
            prompt_tokens=2200,
            output_tokens=400,
            thought_tokens=0,
            duration_s=29.3,
        ),
    ]
    trace.tool_calls = [
        ToolCallRecord(seq=1, agent="explorer_agent", tool="search_places", duration_s=2.1),
    ]

    text = format_trace_summary(trace)

    trace.intent_type = "LIST_DISCOVERY"
    text = format_trace_summary(trace)

    assert "HODARI PROFILE" in text
    assert "intent_type=LIST_DISCOVERY" in text
    assert "hodari" in text
    assert "explorer_agent" in text
    assert "29.300s" in text
    assert "search_places" in text
    assert "LLM subtotal: 2 calls" in text
