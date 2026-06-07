from __future__ import annotations

from pydantic import BaseModel, Field


class Stop(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    address: str = ""
    arrival_time: str
    dwell_time_m: int
    rationale: str
    photos: list[str] = Field(default_factory=list)


class Transition(BaseModel):
    from_place_id: str
    to_place_id: str
    travel_mode: str
    duration_m: int
    distance_m: int = 0
    polyline: str


class Itinerary(BaseModel):
    stops: list[Stop] = Field(default_factory=list)
    transitions: list[Transition] = Field(default_factory=list)
    voice_summary: str
    total_duration_m: int = 0
    total_cost_estimate: float = 0.0
    rationale: str = ""


TravelLeg = Transition
ItineraryStop = Stop
