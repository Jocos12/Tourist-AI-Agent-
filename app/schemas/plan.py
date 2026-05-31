from typing import Literal

from pydantic import BaseModel, Field


class ConstraintSet(BaseModel):
    time_budget_m: int = Field(..., description="Total time budget in minutes")
    budget_usd: float | None = None
    dietary_flags: list[str] = Field(default_factory=list)
    accessibility: list[str] = Field(default_factory=list)
    location: dict[str, float] = Field(..., description="lat/lng keys")


class SubTask(BaseModel):
    subtask_id: str
    category: Literal["restaurant", "attraction", "shopping", "transit", "other"]
    filters: dict = Field(default_factory=dict)


class Plan(BaseModel):
    """Planner → Orchestrator contract."""

    goal: str
    constraints: ConstraintSet
    subtasks: list[SubTask]
    time_sensitive: bool = False
    negative_signals: list[str] = Field(default_factory=list)
