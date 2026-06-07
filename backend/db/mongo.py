from __future__ import annotations

import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase


_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise RuntimeError("MONGODB_URI is not configured")
        _client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    return get_mongo_client()[os.getenv("MONGODB_DB") or os.getenv("MONGODB_DATABASE", "hodari")]


async def ping_mongo() -> bool:
    await get_mongo_client().admin.command("ping")
    return True


async def close_mongo() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
