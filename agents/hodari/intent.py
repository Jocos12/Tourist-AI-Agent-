"""Lightweight intent routing for Hodari planning requests (Phase C)."""

from __future__ import annotations

import re

LIST_DISCOVERY = "LIST_DISCOVERY"
ITINERARY_PLANNING = "ITINERARY_PLANNING"

_ITINERARY_PATTERNS = (
    r"\bitinerary\b",
    r"\bplan\s+(my|a|an|the)\b",
    r"\bfood tour\b",
    r"\bday trip\b",
    r"\bschedule\b",
    r"\b(add|include)\s+(a|another)\s+stop\b",
    r"\bwalking tour\b",
    r"\boptimi[sz]e\b",
    r"\btransport\b",
    r"\bmulti[- ]stop\b",
    r"\bwhat should i do\b",
    r"\b(route|loop)\b",
    r"\b\d+\s*[- ]?hours?\b.+\b(before|after|around|near)\b",
    r"\b(before|after)\s+the\s+match\b",
)

_LIST_PATTERNS = (
    r"\b(find|locate|list|search for|show me|recommend|suggest)\b",
    r"\b(best|top)\s+\d*\s*(restaurant|hotel|cafe|coffee|bar|places?)\b",
    r"\b\d+\s+(restaurant|restaurants|hotel|hotels|cafe|cafes|coffee|bars?|places?)\b",
    # Orchestrator often paraphrases: "4 high-end fine dining restaurants near X"
    r"\b\d{1,2}\b.+\b(restaurants?|hotels?|cafes?|coffee|bars?|places?)\b",
    r"\b(restaurants?|hotels?|cafes?|coffee|bars?|places?)\s+(near|around|close to)\b",
    r"\bwhere\s+(can|should)\s+i\s+(eat|drink|stay)\b",
    r"\bnearby\b",
)


def classify_intent(request: str) -> str:
    """Return LIST_DISCOVERY or ITINERARY_PLANNING for a user planning request."""
    lower = request.lower()

    for pattern in _ITINERARY_PATTERNS:
        if re.search(pattern, lower):
            return ITINERARY_PLANNING

    for pattern in _LIST_PATTERNS:
        if re.search(pattern, lower):
            return LIST_DISCOVERY

    # Bare "restaurants near X" without plan verbs → list.
    if re.search(
        r"\b(restaurant|restaurants|hotel|hotels|cafe|coffee|bar|bars|places?)\b",
        lower,
    ) and not re.search(r"\bplan\b", lower):
        return LIST_DISCOVERY

    return ITINERARY_PLANNING
