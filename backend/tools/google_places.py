from __future__ import annotations

import os
import math
from typing import Any

import httpx

from schemas import ScoredPlace
from utils.logger import get_logger


logger = get_logger(__name__)

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def has_google_places_key() -> bool:
    return bool(_api_key())


async def search_places_text(
    *,
    query: str,
    lat: float | None = None,
    lng: float | None = None,
    radius_m: int = 8_000,
    max_results: int = 8,
) -> list[ScoredPlace]:
    """Search real places globally using Google Places Text Search.

    This keeps the live FastAPI path useful outside the demo cities. If no key is
    configured or Google rejects the request, callers should fall back to local
    demo candidates.
    """

    key = _api_key()
    if not key:
        return []

    payload: dict[str, Any] = {
        "textQuery": query,
        "maxResultCount": max(1, min(max_results, 10)),
        "languageCode": "en",
    }

    if lat is not None and lng is not None and (abs(lat) > 0.0001 or abs(lng) > 0.0001):
        payload["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius_m,
            }
        }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,places.location,"
            "places.rating,places.priceLevel,places.currentOpeningHours,places.photos,places.types"
        ),
    }

    try:
        async with httpx.AsyncClient(timeout=10, verify=_verify_ssl()) as client:
            response = await client.post(PLACES_TEXT_SEARCH_URL, json=payload, headers=headers)
            response.raise_for_status()
        places = [
            place for place in response.json().get("places", [])
            if ((place.get("displayName") or {}).get("text"))
        ]
        scored = [_to_scored_place(place, index, lat, lng) for index, place in enumerate(places)]
        if lat is not None and lng is not None and (abs(lat) > 0.0001 or abs(lng) > 0.0001):
            scored.sort(key=lambda place: _distance_m(lat, lng, place.lat, place.lng))
        return scored
    except Exception as exc:
        logger.warning("google_places_search_failed", query=query, error=str(exc))
        return []


def _api_key() -> str | None:
    for name in ("GOOGLE_MAPS_API_KEY", "MAPS_API_KEY", "GOOGLE_API_KEY"):
        value = os.getenv(name)
        if value and "your_" not in value.lower() and "key_here" not in value.lower():
            return value
    return None


def _verify_ssl() -> bool:
    value = os.getenv("GOOGLE_PLACES_VERIFY_SSL", "true").lower()
    return value not in {"0", "false", "no"}


def _to_scored_place(place: dict[str, Any], index: int, origin_lat: float | None, origin_lng: float | None) -> ScoredPlace:
    location = place.get("location") or {}
    display_name = place.get("displayName") or {}
    price = place.get("priceLevel")
    lat = float(location.get("latitude") or 0.0)
    lng = float(location.get("longitude") or 0.0)
    distance_score = 0.0
    if origin_lat is not None and origin_lng is not None and (abs(origin_lat) > 0.0001 or abs(origin_lng) > 0.0001):
        # Boost closer places while keeping the original Google ranking meaningful.
        distance_score = max(0.0, 0.18 - min(_distance_m(origin_lat, origin_lng, lat, lng), 5_000) / 5_000 * 0.18)

    return ScoredPlace(
        place_id=place.get("id") or f"google-place-{index}",
        name=display_name.get("text") or place.get("id") or f"Google Maps result {index + 1}",
        lat=lat,
        lng=lng,
        rating=float(place.get("rating") or 0.0),
        price_level=_price_level(price),
        hours={"open_now": (place.get("currentOpeningHours") or {}).get("openNow")},
        photos=[],
        address=place.get("formattedAddress") or "Address unavailable",
        similarity_score=min(1.0, max(0.55, 0.92 - index * 0.04 + distance_score)),
        match_reason="Real Google Maps result matched to your request, location, and constraints.",
    )


def _price_level(value: Any) -> int:
    if isinstance(value, int):
        return max(1, min(value, 4))
    text = str(value or "").upper()
    mapping = {
        "PRICE_LEVEL_FREE": 1,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }
    return mapping.get(text, 2)


def _distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    radius_m = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return int(radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
