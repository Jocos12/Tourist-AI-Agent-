from __future__ import annotations

from schemas import CandidateSet, Plan, ScoredPlace, SubTask
from tools.google_places import search_places_text


class ResearcherAgent:
    """Finds candidate places.

    Live Google Places results are the source of truth. Known-city demo catalogs
    are only used for explicit known areas when the API is unavailable.
    """

    async def find_candidates(self, plan: Plan) -> CandidateSet:
        places: list[ScoredPlace] = []
        for subtask in plan.subtasks:
            real_places = await self._search_real_places(plan, subtask)
            if real_places:
                places.extend(real_places)
            else:
                places.extend(self._places_for_subtask(plan, subtask))

        negative = set(plan.negative_signals)
        deduped: dict[str, ScoredPlace] = {}
        for place in sorted(places, key=lambda item: item.similarity_score, reverse=True):
            if place.place_id in negative:
                continue
            deduped.setdefault(place.place_id, place)

        places = list(deduped.values())[:10]
        return CandidateSet(
            subtask_id=plan.subtasks[0].subtask_id if plan.subtasks else "default",
            search_query=plan.goal,
            places=places,
        )

    async def _search_real_places(self, plan: Plan, subtask: SubTask) -> list[ScoredPlace]:
        query = self._build_search_query(plan, subtask)
        return await search_places_text(
            query=query,
            lat=plan.constraints.location.lat,
            lng=plan.constraints.location.lng,
            max_results=6,
        )

    def _build_search_query(self, plan: Plan, subtask: SubTask) -> str:
        dietary = " ".join(plan.constraints.dietary_flags)
        category_terms = {
            "restaurant": "restaurants food cafes",
            "attraction": "attractions things to do landmarks museums parks",
            "event": "stadium fan area sports venue",
            "transport": "transit station walking route",
        }
        return " ".join(
            part
            for part in [
                plan.goal,
                dietary,
                category_terms[subtask.category],
                "tourist friendly",
            ]
            if part
        )

    def _places_for_subtask(self, plan: Plan, subtask: SubTask) -> list[ScoredPlace]:
        query = f"{plan.goal} {subtask.category}".lower()
        if "kigali" in query or "rwanda" in query:
            catalog = self._kigali_catalog()
        elif "camp nou" in query or "barcelona" in query:
            catalog = self._barcelona_catalog()
        elif "metlife" in query or "meadowlands" in query:
            catalog = self._metlife_catalog()
        else:
            return []

        dietary = {flag.lower() for flag in plan.constraints.dietary_flags}
        budget = plan.constraints.budget_usd
        category_bonus = {
            "restaurant": ("restaurant", "food", "cafe"),
            "attraction": ("attraction", "shopping", "museum", "experience"),
            "event": ("stadium", "fan", "arrival"),
            "transport": ("transit", "station", "route"),
        }[subtask.category]

        ranked: list[ScoredPlace] = []
        for place in catalog:
            score = place.similarity_score
            text = f"{place.name} {place.match_reason} {place.address}".lower()
            if any(term in text for term in category_bonus):
                score += 0.08
            if "vegetarian" in dietary and any(term in text for term in ("vegetarian", "veggie", "plant", "salad")):
                score += 0.07
            if budget <= 60 and place.price_level <= 2:
                score += 0.05
            ranked.append(place.model_copy(update={"similarity_score": min(1.0, score)}))

        return sorted(ranked, key=lambda item: item.similarity_score, reverse=True)[:5]

    def _metlife_catalog(self) -> list[ScoredPlace]:
        return [
            ScoredPlace(
                place_id="metlife-american-dream",
                name="American Dream",
                lat=40.8093,
                lng=-74.0719,
                rating=4.2,
                price_level=2,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="1 American Dream Way, East Rutherford, NJ",
                similarity_score=0.83,
                match_reason="Large indoor attraction and shopping complex next to MetLife, good for weather-safe time before kickoff.",
            ),
            ScoredPlace(
                place_id="metlife-vegetarian-bowl",
                name="Vegetarian Bowl at American Dream",
                lat=40.8098,
                lng=-74.0712,
                rating=4.1,
                price_level=2,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="Food hall, American Dream, East Rutherford, NJ",
                similarity_score=0.88,
                match_reason="Vegetarian-friendly quick meal inside American Dream, keeping the food stop close and low-friction.",
            ),
            ScoredPlace(
                place_id="metlife-redds",
                name="Redd's Restaurant & Bar",
                lat=40.8132,
                lng=-74.0776,
                rating=4.0,
                price_level=2,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="317 Washington Ave, Carlstadt, NJ",
                similarity_score=0.76,
                match_reason="Casual pre-game restaurant close to the stadium area, practical for fans on a moderate budget.",
            ),
            ScoredPlace(
                place_id="metlife-meadowlands-station",
                name="Meadowlands Rail Station",
                lat=40.8127,
                lng=-74.0708,
                rating=4.0,
                price_level=1,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="Meadowlands Sports Complex, East Rutherford, NJ",
                similarity_score=0.8,
                match_reason="Transit-aware final approach point that helps avoid stressful last-minute rideshare congestion.",
            ),
            ScoredPlace(
                place_id="metlife-stadium-arrival",
                name="MetLife Stadium Fan Arrival Area",
                lat=40.8136,
                lng=-74.0745,
                rating=4.4,
                price_level=1,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="1 MetLife Stadium Dr, East Rutherford, NJ",
                similarity_score=0.84,
                match_reason="Keeps the final stop close to entry gates, reducing stress before kickoff and leaving time for security.",
            ),
        ]

    def _barcelona_catalog(self) -> list[ScoredPlace]:
        return [
            ScoredPlace(
                place_id="barcelona-camp-nou-area",
                name="Camp Nou Area",
                lat=41.3809,
                lng=2.1228,
                rating=4.5,
                price_level=1,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="C. d'Aristides Maillol, Barcelona",
                similarity_score=0.9,
                match_reason="A natural anchor near Camp Nou, useful for planning food and walking time around the stadium area.",
            ),
            ScoredPlace(
                place_id="barcelona-boqueria",
                name="Mercat de la Boqueria",
                lat=41.3817,
                lng=2.1716,
                rating=4.5,
                price_level=2,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="La Rambla, 91, Barcelona",
                similarity_score=0.84,
                match_reason="Iconic food market with quick vegetarian-friendly options and strong local atmosphere.",
            ),
            ScoredPlace(
                place_id="barcelona-gothic-quarter",
                name="Gothic Quarter Walk",
                lat=41.3839,
                lng=2.1763,
                rating=4.7,
                price_level=1,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="Barri Gotic, Barcelona",
                similarity_score=0.82,
                match_reason="Compact sightseeing stop with beautiful streets and minimal cost.",
            ),
        ]

    def _kigali_catalog(self) -> list[ScoredPlace]:
        return [
            ScoredPlace(
                place_id="kigali-question-coffee",
                name="Question Coffee Gishushu",
                lat=-1.9537,
                lng=30.0962,
                rating=4.5,
                price_level=2,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="KG 8 Ave, Kigali, Rwanda",
                similarity_score=0.86,
                match_reason="A reliable Kigali coffee and light-food stop that works well for a relaxed tourist itinerary.",
            ),
            ScoredPlace(
                place_id="kigali-convention-centre",
                name="Kigali Convention Centre",
                lat=-1.9546,
                lng=30.0937,
                rating=4.6,
                price_level=1,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="KG 2 Roundabout, Kigali, Rwanda",
                similarity_score=0.82,
                match_reason="A recognizable city landmark with easy routing and good nearby food options.",
            ),
            ScoredPlace(
                place_id="kigali-genocide-memorial",
                name="Kigali Genocide Memorial",
                lat=-1.9319,
                lng=30.0606,
                rating=4.7,
                price_level=1,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="KG 14 Ave, Kigali, Rwanda",
                similarity_score=0.8,
                match_reason="A meaningful cultural stop for visitors who want to understand Rwanda beyond surface-level sightseeing.",
            ),
            ScoredPlace(
                place_id="kigali-nyamirambo-walk",
                name="Nyamirambo Walking Area",
                lat=-1.9750,
                lng=30.0440,
                rating=4.4,
                price_level=1,
                hours={"open_now": True, "periods": []},
                photos=[],
                address="Nyamirambo, Kigali, Rwanda",
                similarity_score=0.76,
                match_reason="A lively local neighborhood option for food, culture, and a less generic tourist experience.",
            ),
        ]

