from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta

from schemas import CandidateSet, Itinerary, Plan, Stop, Transition


class ItineraryAgent:
    """Interface owned by Pacifique.

    This builds a valid itinerary from candidates until the full routing/weather
    implementation is connected.
    """

    async def build_itinerary(self, plan: Plan, candidates: CandidateSet) -> Itinerary:
        start = datetime.now(UTC).replace(microsecond=0)
        selected = self._select_places(plan, candidates)
        stops: list[Stop] = []
        transitions: list[Transition] = []
        elapsed = 0

        for index, place in enumerate(selected):
            if index > 0:
                prev = selected[index - 1]
                distance_m = self._distance_m(prev.lat, prev.lng, place.lat, place.lng)
                duration_m = max(4, math.ceil(distance_m / 75))  # relaxed walking pace, meters/minute
                transitions.append(
                    Transition(
                        from_place_id=prev.place_id,
                        to_place_id=place.place_id,
                        travel_mode="walking",
                        duration_m=duration_m,
                        distance_m=distance_m,
                        polyline="",
                    )
                )
                elapsed += duration_m

            dwell = self._dwell_time(plan, index)
            stops.append(
                Stop(
                    place_id=place.place_id,
                    name=place.name,
                    lat=place.lat,
                    lng=place.lng,
                    address=place.address,
                    arrival_time=(start + timedelta(minutes=elapsed)).isoformat(),
                    dwell_time_m=dwell,
                    rationale=place.match_reason or f"Matches the plan: {plan.goal}",
                    photos=place.photos,
                )
            )
            elapsed += dwell

        total_cost = self._estimate_cost(selected)
        summary = (
            f"I found a {len(stops)}-stop plan that fits about {elapsed} minutes and keeps the route low-stress."
            if stops
            else "I could not build an itinerary yet because no candidate places were available."
        )
        return Itinerary(
            stops=stops,
            transitions=transitions,
            voice_summary=summary,
            total_duration_m=elapsed,
            total_cost_estimate=total_cost,
            rationale="Stops are ordered to minimize backtracking and keep the plan practical for the available time.",
        )

    def _select_places(self, plan: Plan, candidates: CandidateSet):
        max_stops = 3 if plan.constraints.time_budget_m >= 150 else 2
        ordered = sorted(candidates.places, key=lambda place: place.similarity_score, reverse=True)
        selected = ordered[:max_stops]

        # Keep the plan within the time budget by dropping the weakest stop first.
        while len(selected) > 1 and self._rough_total_minutes(plan, selected) > plan.constraints.time_budget_m:
            selected.pop()
        return selected

    def _rough_total_minutes(self, plan: Plan, places) -> int:
        total = 0
        for index, place in enumerate(places):
            total += self._dwell_time(plan, index)
            if index > 0:
                prev = places[index - 1]
                total += max(4, math.ceil(self._distance_m(prev.lat, prev.lng, place.lat, place.lng) / 75))
        return total

    def _dwell_time(self, plan: Plan, index: int) -> int:
        if plan.constraints.time_budget_m <= 90:
            return 30
        if index == 0 and plan.constraints.dietary_flags:
            return 45
        return 40 if index < 2 else 30

    def _estimate_cost(self, places) -> float:
        # Conservative demo estimate: price_level 1 ~= $10, 2 ~= $20, etc.
        return float(sum(max(8, place.price_level * 10) for place in places))

    def _distance_m(self, lat1: float, lng1: float, lat2: float, lng2: float) -> int:
        radius_m = 6_371_000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lng2 - lng1)
        a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
        return int(radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
