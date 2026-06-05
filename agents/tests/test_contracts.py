"""Tests for Phase 2 Pydantic schemas (task 3 / foundation for tasks 17-20)."""
import pytest
from hodari.schemas.contracts import (
    Plan, CandidateSet, Itinerary,
    Place, ItineraryStop, TravelLeg, Constraints, Subtask,
)


class TestPlanSchema:
    def test_full_plan(self):
        plan = Plan.model_validate({
            "goal": "Explore vegetarian food near Camp Nou",
            "constraints": {
                "budget": "$60",
                "time_available": "4 hours",
                "dietary": ["vegetarian"],
                "accessibility": None,
                "current_location": "Camp Nou, Barcelona",
            },
            "subtasks": [
                {"description": "Find vegetarian restaurants near Camp Nou", "priority": 1},
                {"description": "Find family-friendly attractions nearby", "priority": 2},
            ],
        })
        assert plan.goal == "Explore vegetarian food near Camp Nou"
        assert plan.constraints.dietary == ["vegetarian"]
        assert plan.constraints.budget == "$60"
        assert len(plan.subtasks) == 2
        assert plan.subtasks[0].priority == 1

    def test_all_constraints_optional(self):
        plan = Plan.model_validate({
            "goal": "Quick lunch",
            "constraints": {},
            "subtasks": [{"description": "Find any restaurant", "priority": 1}],
        })
        assert plan.constraints.budget is None
        assert plan.constraints.dietary is None
        assert plan.constraints.accessibility is None
        assert plan.constraints.current_location is None

    def test_subtask_default_priority(self):
        subtask = Subtask.model_validate({"description": "Do something"})
        assert subtask.priority == 1


class TestCandidateSetSchema:
    def _sample_place(self, **overrides):
        base = {
            "place_id": "ChIJ123",
            "name": "Alive Restaurant",
            "address": "Carrer dels Consellers, Barcelona",
            "coordinates": {"lat": 41.3874, "lng": 2.1686},
            "categories": ["restaurant", "vegetarian"],
            "rating": 4.5,
            "price_level": "PRICE_LEVEL_MODERATE",
            "summary": "Great vegan tapas near Camp Nou",
            "personalization_score": 0.85,
        }
        return {**base, **overrides}

    def test_valid_candidate_set(self):
        cs = CandidateSet.model_validate({"places": [self._sample_place()]})
        assert len(cs.places) == 1
        assert cs.places[0].name == "Alive Restaurant"
        assert cs.places[0].personalization_score == 0.85

    def test_personalization_score_defaults_to_zero(self):
        place = Place.model_validate({
            "place_id": "ChIJ456",
            "name": "Some Bar",
            "address": "Barcelona",
            "coordinates": {"lat": 41.38, "lng": 2.17},
        })
        assert place.personalization_score == 0.0

    def test_empty_candidate_set(self):
        cs = CandidateSet.model_validate({"places": []})
        assert cs.places == []

    def test_multiple_places(self):
        places = [self._sample_place(place_id=f"ChIJ{i}", name=f"Place {i}") for i in range(5)]
        cs = CandidateSet.model_validate({"places": places})
        assert len(cs.places) == 5


class TestItinerarySchema:
    def test_valid_itinerary_with_travel_leg(self):
        itin = Itinerary.model_validate({
            "stops": [
                {
                    "place": {
                        "place_id": "ChIJ123",
                        "name": "Alive Restaurant",
                        "address": "Barcelona",
                        "coordinates": {"lat": 41.38, "lng": 2.17},
                    },
                    "arrival_time": "14:00",
                    "duration_at_stop": "45 min",
                    "travel_from_prev": {"distance": "0.4 km", "duration": "5 min", "encoded_polyline": "_p~iF~ps|U_ulLnnqC_mqNvxq`@"},
                    "rationale": "Great vegan tapas close to the stadium",
                },
                {
                    "place": {
                        "place_id": "ChIJ456",
                        "name": "FC Barcelona Museum",
                        "address": "Barcelona",
                        "coordinates": {"lat": 41.39, "lng": 2.12},
                    },
                    "arrival_time": "15:00",
                    "duration_at_stop": "1 hr",
                    "travel_from_prev": {"distance": "0.7 km", "duration": "7 min"},
                    "rationale": "Immerse in Barça history before the match",
                },
            ],
            "total_duration": "2h 30min",
            "total_distance": "1.1 km",
            "voice_summary": "A vegetarian-friendly afternoon near Camp Nou.",
        })
        assert len(itin.stops) == 2
        assert itin.stops[0].travel_from_prev.distance == "0.4 km"
        assert itin.stops[0].travel_from_prev.encoded_polyline == "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
        assert itin.stops[1].travel_from_prev.duration == "7 min"
        assert itin.voice_summary != ""

    def test_travel_leg_encoded_polyline_optional(self):
        leg = TravelLeg.model_validate({"distance": "0.5 km", "duration": "6 min"})
        assert leg.encoded_polyline is None

    def test_stop_without_travel_leg(self):
        stop = ItineraryStop.model_validate({
            "place": {
                "place_id": "ChIJ001",
                "name": "Starting Point",
                "address": "Somewhere",
                "coordinates": {"lat": 0.0, "lng": 0.0},
            },
            "rationale": "First stop — no travel leg needed",
        })
        assert stop.travel_from_prev is None
        assert stop.arrival_time is None
