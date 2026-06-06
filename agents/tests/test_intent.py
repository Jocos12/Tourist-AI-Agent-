"""Tests for list-vs-itinerary intent routing."""

from hodari.intent import ITINERARY_PLANNING, LIST_DISCOVERY, classify_intent


class TestClassifyIntent:
    def test_locate_restaurants_is_list(self):
        q = (
            "Please locate 4 restaurants near the stadium that will host "
            "the World Cup first match this year. I have a big budget"
        )
        assert classify_intent(q) == LIST_DISCOVERY

    def test_find_near_camp_nou_is_list(self):
        assert classify_intent("Find 4 restaurants near Camp Nou") == LIST_DISCOVERY

    def test_find_near_amahoro_is_list(self):
        assert classify_intent("find 2 restaurant near Amahoro stadium") == LIST_DISCOVERY

    def test_plan_afternoon_is_itinerary(self):
        assert (
            classify_intent("Plan a 3-hour lunch itinerary near Camp Nou")
            == ITINERARY_PLANNING
        )

    def test_food_tour_is_itinerary(self):
        assert classify_intent("Create a food tour in Dallas before the match") == ITINERARY_PLANNING

    def test_best_coffee_is_list(self):
        assert classify_intent("Best coffee shops near Lusail Stadium") == LIST_DISCOVERY

    def test_orchestrator_paraphrase_is_list(self):
        q = "4 high-end or fine dining restaurants near Camp Nou, Barcelona, with a big budget."
        assert classify_intent(q) == LIST_DISCOVERY
