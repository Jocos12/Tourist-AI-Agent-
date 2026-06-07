from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any


def format_sse_event(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data}, ensure_ascii=False, default=str)}\n\n"


def sse_event(payload: dict[str, Any]) -> str:
    event_type = str(payload.get("type", "message"))
    data = {key: value for key, value in payload.items() if key != "type"}
    return format_sse_event(event_type, data)


async def keep_alive(interval_seconds: float = 15.0) -> AsyncIterator[str]:
    while True:
        await asyncio.sleep(interval_seconds)
        yield format_sse_event("ping", {})


class SSEManager:
    @staticmethod
    async def stream_generator(queue: asyncio.Queue, timeout: int = 300) -> AsyncIterator[str]:
        started = asyncio.get_running_loop().time()
        last_event = started

        while True:
            now = asyncio.get_running_loop().time()
            if now - started > timeout:
                yield format_sse_event("error", {"message": "SSE stream timed out.", "recoverable": False})
                break

            try:
                event = await asyncio.wait_for(queue.get(), timeout=15)
            except asyncio.TimeoutError:
                now = asyncio.get_running_loop().time()
                if now - last_event >= 30:
                    yield format_sse_event(
                        "error",
                        {"message": "No agent event received for 30 seconds.", "recoverable": True},
                    )
                    break
                yield format_sse_event("ping", {})
                continue

            if event is None:
                yield format_sse_event("done", {"session_id": "", "total_duration_ms": 0})
                break

            event_type = str(event.get("type", "message"))
            data = {key: value for key, value in event.items() if key != "type"}
            yield format_sse_event(event_type, data)
            last_event = asyncio.get_running_loop().time()

            if event_type in {"done", "error"}:
                break
