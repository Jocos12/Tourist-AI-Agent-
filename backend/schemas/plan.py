from __future__ import annotations

from datetime import datetime, UTC
from typing import Any, Literal

from pydantic import BaseModel, Field


class Location(BaseModel):
    lat: float
    lng: float


class ConstraintSet(BaseModel):
    time_budget_m: int = Field(default=180, ge=0)
    budget_usd: float = Field(default=75.0, ge=0)
    dietary_flags: list[str] = Field(default_factory=list)
    accessibility: bool = False
    location: Location


class SubTask(BaseModel):
    subtask_id: str
    category: Literal["restaurant", "attraction", "transport", "event"]
    filters: dict[str, Any] = Field(default_factory=dict)


class Plan(BaseModel):
    goal: str
    constraints: ConstraintSet
    subtasks: list[SubTask]
    time_sensitive: bool = False
    negative_signals: list[str] = Field(default_factory=list)


class UserProfile(BaseModel):
    user_id: str
    email: str | None = None
    home_country: str | None = None
    languages: list[str] = Field(default_factory=lambda: ["en"])
    dietary_flags: list[str] = Field(default_factory=list)
    budget_tier: Literal["budget", "mid", "luxury"] = "mid"
    accessibility_needs: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Interaction(BaseModel):
    user_id: str
    place_id: str
    signal: Literal["liked", "disliked", "visited", "skipped", "booked"]
    context: dict[str, Any] = Field(default_factory=dict)
    session_id: str
    timestamp: datetime


class UserSession(BaseModel):
    user_id: str
    session_id: str
    profile: UserProfile
    recent_interactions: list[Interaction] = Field(default_factory=list)
    negative_signals: list[str] = Field(default_factory=list)


class AgentTurn(BaseModel):
    user_id: str
    message: str
    location: Location
    session_id: str
    feedback: Literal["liked", "disliked", "category_reject"] | None = None
    place_id: str | None = None


# Backward-compatible aliases for internal modules created before Task 9.
Constraints = ConstraintSet
Subtask = SubTask
