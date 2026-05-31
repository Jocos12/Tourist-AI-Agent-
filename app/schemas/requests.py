from typing import Literal

from pydantic import BaseModel, Field


class Location(BaseModel):
    lat: float
    lng: float


class TurnRequest(BaseModel):
    user_id: str
    message: str | None = None
    location: Location
    session_id: str
    feedback: Literal["liked", "disliked", "visited", "skipped", "booked"] | None = None
    place_id: str | None = None
    reason: str | None = None


class VoiceRequest(BaseModel):
    user_id: str
    session_id: str
    location: Location
