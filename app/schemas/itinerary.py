from typing import Literal

from pydantic import BaseModel, Field


class Stop(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    arrival_time: str
    dwell_time_m: int
    rationale: str
    photos: list[str] = Field(default_factory=list)


class Transition(BaseModel):
    from_place_id: str
    to_place_id: str
    travel_mode: Literal["walking", "driving", "transit"]
    duration_m: int
    polyline: str = ""


class Itinerary(BaseModel):
    """Itinerary Agent → Orchestrator contract."""

    stops: list[Stop]
    transitions: list[Transition]
    rationale: str
    voice_summary: str
    total_duration_m: int
    total_cost_estimate: float
