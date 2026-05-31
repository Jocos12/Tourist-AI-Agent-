import json

from app.config import settings
from app.logging_config import get_logger
from app.schemas.plan import Plan

logger = get_logger("planner")

PLANNER_SYSTEM_PROMPT = """You are the Hodari Planner agent for FIFA World Cup 2026 tourists.
Decompose the user's goal into a structured JSON plan. You must NOT call tools — reason only.

Output valid JSON matching this schema:
{
  "goal": "one sentence",
  "constraints": {
    "time_budget_m": int,
    "budget_usd": float or null,
    "dietary_flags": ["vegetarian", ...],
    "accessibility": [],
    "location": {"lat": float, "lng": float}
  },
  "subtasks": [
    {"subtask_id": "st1", "category": "restaurant|attraction|shopping|transit|other", "filters": {}}
  ],
  "time_sensitive": false,
  "negative_signals": ["place_id", ...]
}

Rules:
- Create 1-3 research subtasks based on the goal.
- Include negative_signals from user rejections.
- Set time_sensitive true only for events, transit disruptions, or stadium entry rules.
"""


def _mock_plan(message: str, location: dict, profile: dict, negative_signals: list[str]) -> Plan:
    dietary = profile.get("dietary_flags", [])
    filters = {"cuisine": dietary[0]} if dietary else {}
    return Plan(
        goal=message or "Explore nearby before the match",
        constraints={
            "time_budget_m": 240,
            "budget_usd": 60.0,
            "dietary_flags": dietary,
            "accessibility": profile.get("accessibility_needs", []),
            "location": location,
        },
        subtasks=[
            {"subtask_id": "st1", "category": "restaurant", "filters": filters},
            {"subtask_id": "st2", "category": "attraction", "filters": {}},
        ],
        time_sensitive=False,
        negative_signals=negative_signals,
    )


async def run_planner(
    message: str,
    location: dict[str, float],
    profile: dict,
    negative_signals: list[str],
) -> Plan:
    logger.info("planner_invoked", message_preview=message[:80] if message else "")

    if settings.mock_agents or not settings.google_api_key:
        return _mock_plan(message, location, profile, negative_signals)

    import google.generativeai as genai

    genai.configure(api_key=settings.google_api_key)
    model = genai.GenerativeModel(
        model_name=settings.gemini_model,
        system_instruction=PLANNER_SYSTEM_PROMPT,
    )
    user_content = json.dumps(
        {
            "message": message,
            "location": location,
            "profile": profile,
            "negative_signals": negative_signals,
        }
    )

    for attempt in range(2):
        try:
            response = await model.generate_content_async(
                user_content,
                generation_config={"response_mime_type": "application/json"},
            )
            raw = json.loads(response.text)
            return Plan.model_validate(raw)
        except Exception as e:
            logger.warning("planner_validation_failed", attempt=attempt + 1, error=str(e))
            if attempt == 1:
                raise

    raise RuntimeError("Planner failed after retry")
