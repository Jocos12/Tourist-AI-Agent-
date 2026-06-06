"""Tests for fast discovery ranking helpers."""

from hodari.tools.discovery import extract_place_limit, rank_places


def test_extract_place_limit_from_request():
    assert extract_place_limit("Find 4 restaurants near Camp Nou") == 4
    assert extract_place_limit("find 2 restaurant near Amahoro stadium") == 2
    assert extract_place_limit("4 high-end restaurants near Camp Nou") == 4
    assert extract_place_limit("restaurants near stadium") == 5


def test_rank_places_prefers_higher_rating():
    places = [
        {"place_id": "a", "name": "A", "rating": 4.1, "price_level": "PRICE_LEVEL_MODERATE"},
        {"place_id": "b", "name": "B", "rating": 4.8, "price_level": "PRICE_LEVEL_MODERATE"},
        {"place_id": "c", "name": "C", "rating": 4.5, "price_level": "PRICE_LEVEL_MODERATE"},
    ]
    ranked = rank_places(places, "find restaurants", limit=2)
    assert [p["name"] for p in ranked] == ["B", "C"]
