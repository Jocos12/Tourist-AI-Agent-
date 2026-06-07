from __future__ import annotations

import json
import os
import uuid
from typing import Any

import httpx
from pymongo import ASCENDING, DESCENDING

from db import get_database
from utils.logger import get_logger


logger = get_logger(__name__)


class MCPClient:
    def __init__(self, url: str | None = None) -> None:
        self.url = url or os.getenv("MCP_SERVER_URL") or os.getenv("MONGODB_MCP_URL", "http://localhost:3100/mcp")
        self.database = os.getenv("MONGODB_DB") or os.getenv("MONGODB_DATABASE", "hodari")
        self._session_id: str | None = None

    async def initialize(self) -> str:
        payload = {
            "jsonrpc": "2.0",
            "id": "initialize",
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "hodari-backend", "version": "1.0.0"},
            },
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(self.url, json=payload, headers=self._headers())
            response.raise_for_status()
        session_id = response.headers.get("mcp-session-id")
        if not session_id:
            raise RuntimeError("MongoDB MCP server did not return mcp-session-id")
        self._session_id = session_id
        return session_id

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        if not self._session_id:
            await self.initialize()

        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                result = await self._post(payload)
                if result.get("error", {}).get("code") == -32003:
                    await self.initialize()
                    result = await self._post(payload)
                if "error" in result:
                    raise RuntimeError(f"MCP tool '{name}' failed: {result['error']}")
                logger.info("mcp_tool_called", tool=name, collection=arguments.get("collection"), attempt=attempt + 1)
                return result.get("result", {})
            except Exception as exc:
                last_error = exc
                logger.warning("mcp_tool_retry", tool=name, error=str(exc), attempt=attempt + 1)
        raise RuntimeError(f"MCP unavailable after retries: {last_error}")

    async def find_one(self, collection: str, filter: dict) -> dict | None:
        try:
            result = await self.call_tool(
                "find",
                {"database": self.database, "collection": collection, "filter": filter, "limit": 1},
            )
            docs = self._extract_documents(result)
            return docs[0] if docs else None
        except Exception as exc:
            logger.error("mcp_find_one_fallback", collection=collection, error=str(exc))
            return await get_database()[collection].find_one(filter)

    async def find_many(
        self,
        collection: str,
        filter: dict,
        sort: dict | None = None,
        limit: int = 20,
    ) -> list[dict]:
        try:
            result = await self.call_tool(
                "find",
                {
                    "database": self.database,
                    "collection": collection,
                    "filter": filter,
                    "sort": sort or {},
                    "limit": limit,
                },
            )
            return self._extract_documents(result)
        except Exception as exc:
            logger.error("mcp_find_many_fallback", collection=collection, error=str(exc))
            cursor = get_database()[collection].find(filter)
            if sort:
                cursor = cursor.sort([(key, DESCENDING if value < 0 else ASCENDING) for key, value in sort.items()])
            return await cursor.limit(limit).to_list(length=limit)

    async def insert_one(self, collection: str, document: dict) -> str:
        try:
            result = await self.call_tool(
                "insert-one",
                {"database": self.database, "collection": collection, "document": document},
            )
            inserted_id = result.get("structuredContent", {}).get("insertedId") or result.get("insertedId")
            logger.info("mcp_insert_one", collection=collection, inserted_id=str(inserted_id))
            return str(inserted_id)
        except Exception as exc:
            logger.error("mcp_insert_one_fallback", collection=collection, error=str(exc))
            result = await get_database()[collection].insert_one(document)
            return str(result.inserted_id)

    async def update_one(self, collection: str, filter: dict, update: dict) -> bool:
        try:
            result = await self.call_tool(
                "update-one",
                {"database": self.database, "collection": collection, "filter": filter, "update": update, "upsert": True},
            )
            logger.info("mcp_update_one", collection=collection)
            return bool(result)
        except Exception as exc:
            logger.error("mcp_update_one_fallback", collection=collection, error=str(exc))
            result = await get_database()[collection].update_one(filter, update, upsert=True)
            return result.acknowledged

    async def ping(self) -> bool:
        await self.initialize()
        return True

    async def _post(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(self.url, json=payload, headers=self._headers())
            response.raise_for_status()

        for line in response.text.splitlines():
            if line.startswith("data: "):
                return json.loads(line[6:])
        return response.json()

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if self._session_id:
            headers["mcp-session-id"] = self._session_id
        return headers

    def _extract_documents(self, result: dict[str, Any]) -> list[dict[str, Any]]:
        structured = result.get("structuredContent") or {}
        if isinstance(structured, dict) and isinstance(structured.get("documents"), list):
            return structured["documents"]
        if isinstance(structured, list):
            return structured
        docs: list[dict[str, Any]] = []
        for item in result.get("content", []):
            text = item.get("text", "")
            for line in text.splitlines():
                try:
                    parsed = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(parsed, list):
                    docs.extend(parsed)
        return docs


mcp_client = MCPClient()
