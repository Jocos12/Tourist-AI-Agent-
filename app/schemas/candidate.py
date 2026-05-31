from datetime import datetime, timezone

from pydantic import BaseModel, Field


class ScoredPlace(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    rating: float | None = None
    price_level: int | None = None
    hours: str | None = None
    photos: list[str] = Field(default_factory=list)
    address: str | None = None
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    match_reason: str = ""


class CandidateSet(BaseModel):
    """Researcher → Orchestrator contract."""

    subtask_id: str
    places: list[ScoredPlace]
    search_query: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
