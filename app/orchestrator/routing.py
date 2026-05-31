from enum import Enum

from app.schemas.requests import TurnRequest


class RouteDecision(str, Enum):
    FULL_PIPELINE = "full"  # Planner + Researcher + Itinerary
    RESEARCH_ONLY = "research"  # Skip Planner — single-stop swap or category rejection
    FEEDBACK_ONLY = "feedback"  # save_preference then replan


def classify_turn(req: TurnRequest, last_message: str | None = None) -> RouteDecision:
    """
    Rule 1: single-stop swap (swipe left) → Researcher + Itinerary only.
    Rule 2: category-level rejection → Researcher + Itinerary.
    Rule 3: fundamental intent change → full pipeline including Planner.
    """
    if req.feedback and req.place_id:
        return RouteDecision.RESEARCH_ONLY

    msg = (req.message or "").lower()
    intent_change_keywords = [
        "skip lunch",
        "go shopping",
        "instead",
        "change plan",
        "forget",
        "new plan",
        "different",
    ]
    if any(k in msg for k in intent_change_keywords):
        return RouteDecision.FULL_PIPELINE

    if last_message and req.message:
        return RouteDecision.FULL_PIPELINE

    return RouteDecision.FULL_PIPELINE
