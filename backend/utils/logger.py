from __future__ import annotations

import logging
import os
import sys
from typing import Any

import structlog


_configured = False


def configure_logging() -> None:
    global _configured
    if _configured:
        return
    level = os.getenv("LOG_LEVEL", "info").upper()
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=getattr(logging, level, logging.INFO))
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, level, logging.INFO)),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    _configured = True


def get_logger(name: str):
    if not _configured:
        configure_logging()
    return structlog.get_logger(name)


logger = get_logger("hodari")


def _clean(value: Any) -> Any:
    return value if value is not None else ""


def log_turn_start(user_id: str, session_id: str, message_preview: str) -> None:
    logger.info(
        "turn_start",
        user_id=user_id,
        session_id=session_id,
        agent="orchestrator",
        duration_ms=None,
        message_preview=message_preview[:160],
    )


def log_planner_invoked(user_id: str, session_id: str, subtask_count: int) -> None:
    logger.info(
        "planner_invoked",
        user_id=user_id,
        session_id=session_id,
        agent="planner",
        duration_ms=None,
        subtask_count=subtask_count,
    )


def log_researcher_invoked(user_id: str, session_id: str, subtask_ids: list[str]) -> None:
    logger.info(
        "researcher_invoked",
        user_id=user_id,
        session_id=session_id,
        agent="researcher",
        duration_ms=None,
        subtask_ids=subtask_ids,
    )


def log_itinerary_invoked(user_id: str, session_id: str, candidate_count: int) -> None:
    logger.info(
        "itinerary_invoked",
        user_id=user_id,
        session_id=session_id,
        agent="itinerary",
        duration_ms=None,
        candidate_count=candidate_count,
    )


def log_preference_saved(user_id: str, session_id: str, place_id: str, signal: str) -> None:
    logger.info(
        "preference_saved",
        user_id=user_id,
        session_id=session_id,
        agent="memory",
        duration_ms=None,
        place_id=place_id,
        signal=signal,
    )


def log_turn_complete(user_id: str, session_id: str, duration_ms: int, stop_count: int) -> None:
    logger.info(
        "turn_complete",
        user_id=user_id,
        session_id=session_id,
        agent="orchestrator",
        duration_ms=duration_ms,
        stop_count=stop_count,
    )


def log_error(
    user_id: str,
    session_id: str,
    error_type: str,
    error_message: str,
    agent: str,
) -> None:
    logger.error(
        "error",
        user_id=_clean(user_id),
        session_id=_clean(session_id),
        agent=agent,
        duration_ms=None,
        error_type=error_type,
        error_message=error_message,
    )
