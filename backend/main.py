from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import close_mongo, ping_mongo
from mcp import mcp_client
from routers.turn import router as turn_router
from routers.voice import router as voice_router
from utils.logger import configure_logging, get_logger


load_dotenv()
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ping_mongo()
        logger.info("mongo_connected")
    except Exception as exc:
        logger.error("mongo_connection_failed", error=str(exc))

    try:
        await mcp_client.ping()
        logger.info("mcp_connected")
    except Exception as exc:
        logger.error("mcp_connection_failed", error=str(exc))

    yield
    await close_mongo()


app = FastAPI(title="Hodari Orchestrator", version="1.0.0", lifespan=lifespan)

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(turn_router)
app.include_router(voice_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
