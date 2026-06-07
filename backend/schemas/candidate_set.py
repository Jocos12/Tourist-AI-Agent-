from __future__ import annotations

from datetime import datetime, UTC
from typing import Any

from pydantic import BaseModel, Field


class ScoredPlace(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    rating: float = 0.0
    price_level: int = Field(default=2, ge=1, le=4)
    hours: dict[str, Any] = Field(default_factory=dict)
    photos: list[str] = Field(default_factory=list)
    address: str
    similarity_score: float = Field(default=0.0, ge=0.0, le=1.0)
    match_reason: str


class CandidateSet(BaseModel):
    subtask_id: str = "default"
    places: list[ScoredPlace] = Field(default_factory=list)
    search_query: str = ""
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


Place = ScoredPlace
