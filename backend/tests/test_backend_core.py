from __future__ import annotations

import asyncio
import json
import unittest
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from agents.orchestrator import OrchestratorAgent
from agents.planner import PlannerAgent
from agents.researcher import ResearcherAgent
from schemas import AgentTurn, Location, UserProfile, UserSession
from tools.save_preference import save_preference
from utils.sse import SSEManager


def make_session() -> UserSession:
    return UserSession(
        user_id="usr_123",
        session_id="ses_456",
        profile=UserProfile(user_id="usr_123", created_at=datetime.now(UTC)),
        recent_interactions=[],
        negative_signals=[],
    )


def make_turn(**overrides) -> AgentTurn:
    payload = {
        "user_id": "usr_123",
        "message": "Find dinner near the stadium",
        "location": Location(lat=40.0, lng=-74.0),
        "session_id": "ses_456",
        "feedback": None,
        "place_id": None,
    }
    payload.update(overrides)
    return AgentTurn(**payload)


class PlannerAgentTests(unittest.IsolatedAsyncioTestCase):
    async def test_planner_returns_valid_plan_with_mock_gemini(self) -> None:
        planner = PlannerAgent()
        planner._generate = AsyncMock(
            return_value=json.dumps(
                {
                    "goal": "Find dinner near the stadium.",
                    "constraints": {
                        "time_budget_m": 90,
                        "budget_usd": 50,
                        "dietary_flags": [],
                        "accessibility": False,
                        "location": {"lat": 40.0, "lng": -74.0},
                    },
                    "subtasks": [{"subtask_id": "restaurant_1", "category": "restaurant", "filters": {}}],
                    "time_sensitive": False,
                    "negative_signals": [],
                }
            )
        )

        plan = await planner.run("Find dinner near the stadium", make_session())

        self.assertEqual(plan.goal, "Find dinner near the stadium.")
        self.assertEqual(plan.subtasks[0].category, "restaurant")

    async def test_fallback_planner_resolves_global_named_locations(self) -> None:
        planner = PlannerAgent()
        planner.api_key = None
        plan = await planner.run("4 hours, $60, vegetarian in Kigali Rwanda", make_session())

        self.assertAlmostEqual(plan.constraints.location.lat, -1.9441, places=2)
        self.assertAlmostEqual(plan.constraints.location.lng, 30.0619, places=2)
        self.assertEqual(plan.constraints.budget_usd, 60)
        self.assertIn("vegetarian", plan.constraints.dietary_flags)


class ResearcherAgentTests(unittest.IsolatedAsyncioTestCase):
    async def test_researcher_has_kigali_fallback_candidates(self) -> None:
        planner = PlannerAgent()
        planner.api_key = None
        plan = await planner.run("Plan 3 hours in Kigali Rwanda for coffee and culture", make_session())

        with patch("agents.researcher.search_places_text", new=AsyncMock(return_value=[])):
            candidates = await ResearcherAgent().find_candidates(plan)

        self.assertTrue(any("Kigali" in place.address or "Kigali" in place.name for place in candidates.places))


class RoutingTests(unittest.IsolatedAsyncioTestCase):
    async def test_single_stop_dislike_runs_researcher_and_itinerary(self) -> None:
        decision = await OrchestratorAgent().route(make_turn(feedback="disliked", place_id="plc_1"), make_session())
        self.assertEqual(decision.route_type, "researcher_only")
        self.assertEqual(decision.agents_to_run, ["researcher", "itinerary"])

    async def test_category_reject_runs_researcher_and_itinerary(self) -> None:
        decision = await OrchestratorAgent().route(make_turn(feedback="category_reject"), make_session())
        self.assertEqual(decision.route_type, "category_reject")
        self.assertEqual(decision.agents_to_run, ["researcher", "itinerary"])

    async def test_new_intent_runs_full_pipeline(self) -> None:
        decision = await OrchestratorAgent().route(make_turn(message="Actually make a new plan"), make_session())
        self.assertEqual(decision.route_type, "full")
        self.assertEqual(decision.agents_to_run, ["planner", "researcher", "itinerary"])


class SavePreferenceTests(unittest.IsolatedAsyncioTestCase):
    async def test_save_preference_writes_interaction(self) -> None:
        with patch("tools.save_preference.mcp_client.insert_one", new=AsyncMock(return_value="abc123")) as insert_one:
            result = await save_preference("usr_123", "plc_1", "liked", {"source": "test"}, "ses_456")

        self.assertEqual(result, {"ack": True, "place_id": "plc_1", "signal": "liked"})
        insert_one.assert_awaited_once()


class SSEManagerTests(unittest.IsolatedAsyncioTestCase):
    async def test_stream_generator_yields_events_until_done(self) -> None:
        queue: asyncio.Queue[dict] = asyncio.Queue()
        await queue.put({"type": "token", "agent": "planner", "content": "hello"})
        await queue.put({"type": "done", "session_id": "ses_456", "total_duration_ms": 12})

        events = []
        async for event in SSEManager.stream_generator(queue, timeout=5):
            events.append(event)

        self.assertIn('"type": "token"', events[0])
        self.assertIn('"type": "done"', events[1])


if __name__ == "__main__":
    unittest.main()
