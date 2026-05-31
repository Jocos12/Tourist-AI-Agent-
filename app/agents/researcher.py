"""Researcher agent stub — Shaka implements full parallel fan-out."""

from datetime import datetime, timezone

from app.logging_config import get_logger
from app.schemas.candidate import CandidateSet, ScoredPlace
from app.schemas.plan import Plan

logger = get_logger("researcher")


async def run_researcher(plan: Plan) -> list[CandidateSet]:
    logger.info("researcher_invoked", subtask_count=len(plan.subtasks))
    results: list[CandidateSet] = []
    for st in plan.subtasks:
        places = [
            ScoredPlace(
                place_id=f"demo_{st.subtask_id}_1",
                name="Vegan Table",
                lat=plan.constraints.location["lat"] + 0.001,
                lng=plan.constraints.location["lng"] + 0.001,
                rating=4.7,
                price_level=2,
                hours="11:00-22:00",
                photos=["https://placehold.co/400x300"],
                address="123 Demo St",
                similarity_score=0.92,
                match_reason="Matches vegetarian preference",
            ),
            ScoredPlace(
                place_id=f"demo_{st.subtask_id}_2",
                name="High Line Walk",
                lat=plan.constraints.location["lat"] + 0.003,
                lng=plan.constraints.location["lng"] - 0.002,
                rating=4.5,
                price_level=0,
                similarity_score=0.85,
                match_reason="Popular attraction nearby",
            ),
        ]
        if st.subtask_id == "st2" and plan.negative_signals:
            places = [p for p in places if p.place_id not in plan.negative_signals]

        results.append(
            CandidateSet(
                subtask_id=st.subtask_id,
                places=places,
                search_query=f"{st.category} near user",
                timestamp=datetime.now(timezone.utc),
            )
        )
    return results
