"""MongoDB MCP client — all Atlas reads/writes go through MCP (Bienvenue's server)."""

from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings
from app.logging_config import get_logger

logger = get_logger("mcp")


class MCPClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or settings.mongodb_mcp_url).rstrip("/")

    async def _call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": name, "arguments": arguments}}
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(f"{self.base_url}/mcp", json=payload)
                resp.raise_for_status()
                data = resp.json()
                if "error" in data:
                    raise RuntimeError(data["error"])
                return data.get("result", data)
            except httpx.HTTPError as e:
                logger.warning("mcp_call_failed", tool=name, error=str(e))
                return {}

    async def get_user_profile(self, user_id: str) -> dict[str, Any]:
        result = await self._call_tool("find_one", {"database": "hodari", "collection": "users", "filter": {"user_id": user_id}})
        return result.get("document") or self._mock_user(user_id)

    async def get_recent_turns(self, user_id: str, session_id: str, limit: int = 5) -> list[dict]:
        result = await self._call_tool(
            "find",
            {
                "database": "hodari",
                "collection": "sessions",
                "filter": {"user_id": user_id, "session_id": session_id},
                "limit": limit,
                "sort": {"timestamp": -1},
            },
        )
        return result.get("documents", [])

    async def save_preference(
        self,
        user_id: str,
        place_id: str,
        signal: str,
        context: str,
        session_id: str,
    ) -> dict[str, bool]:
        doc = {
            "user_id": user_id,
            "place_id": place_id,
            "signal": signal,
            "context": context,
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._call_tool("insert_one", {"database": "hodari", "collection": "interactions", "document": doc})
        logger.info("preference_saved", user_id=user_id, place_id=place_id, signal=signal)
        return {"ack": True}

    async def persist_turn(self, user_id: str, session_id: str, role: str, content: str) -> None:
        doc = {
            "user_id": user_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await self._call_tool("insert_one", {"database": "hodari", "collection": "sessions", "document": doc})

    @staticmethod
    def _mock_user(user_id: str) -> dict[str, Any]:
        return {
            "user_id": user_id,
            "dietary_flags": ["vegetarian"],
            "budget_tier": "medium",
            "accessibility_needs": [],
            "languages": ["en"],
        }


mcp_client = MCPClient()
