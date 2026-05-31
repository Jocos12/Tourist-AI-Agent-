"""Itinerary agent stub — Pacifique implements Routes API + reorder loop."""

from app.logging_config import get_logger
from app.schemas.candidate import CandidateSet
from app.schemas.itinerary import Itinerary, Stop, Transition
from app.schemas.plan import Plan

logger = get_logger("itinerary")


async def run_itinerary(plan: Plan, candidates: list[CandidateSet]) -> Itinerary:
    logger.info("itinerary_invoked", candidate_sets=len(candidates))

    stops: list[Stop] = []
    seen: set[str] = set()
    for cs in candidates:
        for p in cs.places[:1]:
            if p.place_id in seen or p.place_id in plan.negative_signals:
                continue
            seen.add(p.place_id)
            stops.append(
                Stop(
                    place_id=p.place_id,
                    name=p.name,
                    lat=p.lat,
                    lng=p.lng,
                    arrival_time="12:00",
                    dwell_time_m=60 if "restaurant" in cs.subtask_id else 45,
                    rationale=p.match_reason or "Great match for your trip",
                    photos=p.photos,
                )
            )
            if len(stops) >= 3:
                break
        if len(stops) >= 3:
            break

    transitions: list[Transition] = []
    for i in range(len(stops) - 1):
        transitions.append(
            Transition(
                from_place_id=stops[i].place_id,
                to_place_id=stops[i + 1].place_id,
                travel_mode="walking",
                duration_m=10,
                polyline="encoded_polyline_stub",
            )
        )

    return Itinerary(
        stops=stops,
        transitions=transitions,
        rationale="Balanced route within your time budget with top-rated stops.",
        voice_summary=(
            f"You have {plan.constraints.time_budget_m // 60} hours before the game. "
            f"Start at {stops[0].name}, then walk to {stops[1].name if len(stops) > 1 else 'your next stop'}."
        ),
        total_duration_m=sum(s.dwell_time_m for s in stops) + sum(t.duration_m for t in transitions),
        total_cost_estimate=45.0,
    )
