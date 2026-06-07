from __future__ import annotations

import asyncio
import math
import os
import time
from typing import Literal

import google.generativeai as genai
from pydantic import BaseModel

from agents.itinerary import ItineraryAgent
from agents.planner import PlannerAgent
from agents.researcher import ResearcherAgent
from schemas import AgentTurn, CandidateSet, ConstraintSet, Itinerary, Plan, SubTask, UserSession
from tools import save_preference, save_session_update
from utils.logger import (
    get_logger,
    log_error,
    log_itinerary_invoked,
    log_researcher_invoked,
    log_turn_complete,
    log_turn_start,
)


AgentName = Literal["planner", "researcher", "itinerary"]
RouteType = Literal["full", "researcher_only", "category_reject", "direct_answer", "memory_ack"]
logger = get_logger(__name__)


class RoutingDecision(BaseModel):
    route_type: RouteType
    agents_to_run: list[AgentName]


class OrchestratorAgent:
    def __init__(
        self,
        planner: PlannerAgent | None = None,
        researcher: ResearcherAgent | None = None,
        itinerary: ItineraryAgent | None = None,
    ) -> None:
        self.planner = planner or PlannerAgent()
        self.researcher = researcher or ResearcherAgent()
        self.itinerary = itinerary or ItineraryAgent()
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        if self.api_key:
            genai.configure(api_key=self.api_key)

    async def route(self, turn: AgentTurn, session: UserSession) -> RoutingDecision:
        if turn.feedback == "liked" and turn.place_id is not None:
            return RoutingDecision(route_type="memory_ack", agents_to_run=[])

        if turn.feedback == "disliked" and turn.place_id is not None:
            return RoutingDecision(route_type="researcher_only", agents_to_run=["researcher", "itinerary"])

        if turn.feedback == "category_reject":
            return RoutingDecision(route_type="category_reject", agents_to_run=["researcher", "itinerary"])

        if self._is_general_conversation(turn.message):
            return RoutingDecision(route_type="direct_answer", agents_to_run=[])

        if turn.feedback is None or self._contains_intent_shift(turn.message):
            return RoutingDecision(route_type="full", agents_to_run=["planner", "researcher", "itinerary"])

        return RoutingDecision(route_type="full", agents_to_run=["planner", "researcher", "itinerary"])

    async def execute_turn(
        self,
        turn: AgentTurn,
        session: UserSession,
        sse_queue: asyncio.Queue[dict],
    ) -> dict:
        start = time.perf_counter()
        log_turn_start(turn.user_id, turn.session_id, turn.message)
        routing = await self.route(turn, session)
        logger.info("routing_decision", route=routing.model_dump(), user_id=turn.user_id, session_id=session.session_id)

        if turn.feedback:
            signal = "liked" if turn.feedback == "liked" else "disliked" if turn.feedback == "disliked" else "skipped"
            saved = await save_preference(
                turn.user_id,
                turn.place_id or "category_reject",
                signal,
                {"feedback": turn.feedback, "message": turn.message},
                turn.session_id,
            )
            await sse_queue.put({"type": "preference_saved", **saved})
            if turn.feedback in {"disliked", "category_reject"} and turn.place_id and turn.place_id not in session.negative_signals:
                session.negative_signals.append(turn.place_id)

        if routing.route_type == "memory_ack":
            answer = "Got it. I’ll remember that preference and use it to personalize your next recommendations."
            await sse_queue.put({"type": "answer", "content": answer})
            await self._safe_save_session(turn, answer, {"routing": routing.model_dump(), "answer": answer})
            duration_ms = int((time.perf_counter() - start) * 1000)
            log_turn_complete(turn.user_id, turn.session_id, duration_ms, 0)
            await sse_queue.put({"type": "done", "session_id": turn.session_id, "total_duration_ms": duration_ms})
            return {"routing": routing.model_dump(), "answer": answer}

        if routing.route_type == "direct_answer":
            answer = await self._answer_directly(turn, session)
            await sse_queue.put({"type": "answer", "content": answer})
            await self._safe_save_session(turn, answer, {"routing": routing.model_dump(), "answer": answer})
            duration_ms = int((time.perf_counter() - start) * 1000)
            log_turn_complete(turn.user_id, turn.session_id, duration_ms, 0)
            await sse_queue.put({"type": "done", "session_id": turn.session_id, "total_duration_ms": duration_ms})
            return {"routing": routing.model_dump(), "answer": answer}

        plan = self._fallback_plan(turn, session)
        candidates = CandidateSet(subtask_id="default")
        itinerary = Itinerary(stops=[], transitions=[], voice_summary="", total_duration_m=0, total_cost_estimate=0.0)

        if "planner" in routing.agents_to_run:
            await sse_queue.put({"type": "token", "content": "Planning your request.\n", "agent": "planner"})
            planner_message = f"{turn.message}\nCurrent location: lat={turn.location.lat}, lng={turn.location.lng}"
            plan = await self.planner.run(planner_message, session)
            await sse_queue.put({"type": "token", "content": f"Plan: {plan.goal}\n", "agent": "planner"})
            await sse_queue.put({"type": "plan_ready", "plan": plan.model_dump(mode="json")})

        if "researcher" in routing.agents_to_run:
            await sse_queue.put({"type": "token", "content": "Finding better places.\n", "agent": "researcher"})
            candidates = await self.researcher.find_candidates(plan)
            log_researcher_invoked(turn.user_id, turn.session_id, [plan.subtasks[0].subtask_id] if plan.subtasks else [])
            for place in candidates.places:
                await sse_queue.put({"type": "map_pin", "place": place.model_dump(mode="json")})

        if "itinerary" in routing.agents_to_run:
            await sse_queue.put({"type": "token", "content": "Updating your route.\n", "agent": "itinerary"})
            log_itinerary_invoked(turn.user_id, turn.session_id, len(candidates.places))
            itinerary = await self.itinerary.build_itinerary(plan, candidates)
            for index, stop in enumerate(itinerary.stops):
                await sse_queue.put({"type": "card", "stop": stop.model_dump(mode="json"), "index": index})
            await sse_queue.put({"type": "itinerary", "itinerary": itinerary.model_dump(mode="json")})
            await sse_queue.put({"type": "answer", "content": self._format_itinerary_answer(plan, candidates, itinerary)})

        state = {
            "routing": routing.model_dump(),
            "plan": plan.model_dump(mode="json"),
            "candidates": candidates.model_dump(mode="json"),
            "itinerary": itinerary.model_dump(mode="json"),
        }
        await self._safe_save_session(turn, itinerary.voice_summary, state)

        duration_ms = int((time.perf_counter() - start) * 1000)
        log_turn_complete(turn.user_id, turn.session_id, duration_ms, len(itinerary.stops))
        await sse_queue.put({"type": "done", "session_id": turn.session_id, "total_duration_ms": duration_ms})
        return state

    def _contains_intent_shift(self, message: str) -> bool:
        text = message.lower()
        markers = ["actually", "instead", "new plan", "change", "forget", "now i want", "different"]
        return any(marker in text for marker in markers)

    def _is_general_conversation(self, message: str) -> bool:
        text = message.lower().strip()
        planning_keywords = {
            "plan", "itinerary", "route", "near", "nearby", "restaurant", "food", "eat",
            "dinner", "lunch", "breakfast", "stadium", "match", "kickoff", "game",
            "visit", "attraction", "museum", "transport", "hotel",
            "budget", "hours", "open", "walking", "directions", "distance", "far", "map",
            "drive", "metro", "airport", "tourist",
            "city", "country", "rwanda", "kigali", "camp nou", "barcelona",
        }
        if any(keyword in text for keyword in planning_keywords):
            return False
        if len(text.split()) <= 5:
            return True
        question_starters = ("what", "why", "how", "who", "when", "where", "explain", "tell me", "can you")
        return text.startswith(question_starters)

    async def _answer_directly(self, turn: AgentTurn, session: UserSession) -> str:
        if self.api_key:
            try:
                model = genai.GenerativeModel(
                    self.model_name,
                    system_instruction=(
                        "You are Hodari, a helpful global AI assistant for travelers and football fans. "
                        "Answer naturally, clearly, and concisely like a premium assistant. "
                        "If the user asks for travel planning, ask for the missing location/time/budget when needed. "
                        "Never output raw JSON."
                    ),
                )
                response = await model.generate_content_async(
                    f"User profile: {session.profile.model_dump_json()}\nUser message: {turn.message}"
                )
                text = (response.text or "").strip()
                if text:
                    return text
            except Exception as exc:
                log_error(turn.user_id, turn.session_id, type(exc).__name__, str(exc), "direct_answer")

        return self._fallback_direct_answer(turn.message)

    def _fallback_direct_answer(self, message: str) -> str:
        text = message.lower().strip()
        if text in {"hi", "hello", "hey", "salut", "bonjour", "bonsoir"}:
            return (
                "Hi, I’m Hodari. I can help you plan a trip anywhere, find food near you, "
                "build a short itinerary, or answer travel questions. Tell me your city or area, time, "
                "and budget, and I’ll make it practical."
            )
        if "who are you" in text or "what can you do" in text or "tu peux faire quoi" in text:
            return (
                "I’m Hodari, your global tourist AI assistant. I can suggest places, build routes, "
                "adapt to dietary needs and budget, and help you make quick travel decisions anywhere."
            )
        return (
            "I can help with that. For the best answer, give me a little context, like the city or area, "
            "time available, budget, and what you prefer. If you want, ask me something like: "
            "\"Plan 4 hours in Kigali under $60\"."
        )

    def _format_itinerary_answer(self, plan: Plan, candidates: CandidateSet, itinerary: Itinerary) -> str:
        if not itinerary.stops:
            return (
                "I did not find reliable live places for that search yet. Try a more specific food type, landmark, "
                "or budget, and I will search real Google Places results again.\n\n"
                'Action chips: ["Show on map 🗺", "Get walking directions 🚶", "Filter by budget 💰"]'
            )

        by_id = {place.place_id: place for place in candidates.places}
        user_location = plan.constraints.location
        is_food = any(task.category == "restaurant" for task in plan.subtasks)
        lines = [
            (
                f"Here are {len(itinerary.stops)} food spots near you right now:"
                if is_food
                else f"Here are {len(itinerary.stops)} real places that match your request:"
            ),
            "",
        ]
        for index, stop in enumerate(itinerary.stops, start=1):
            place = by_id.get(stop.place_id)
            distance_m = self._distance_m(user_location.lat, user_location.lng, stop.lat, stop.lng)
            walk_m = max(1, math.ceil(distance_m / 75))
            rating = f"⭐ {place.rating:.1f}" if place and place.rating else "⭐ rating unavailable"
            price = "$" * (place.price_level if place else 2)
            open_text = self._format_open_now(place.hours if place else {})
            lines.append(
                f"{index}. {self._emoji_for_place(stop.name)} **{stop.name}**: {self._format_distance(distance_m)} · {walk_m} min walk\n"
                f"   {rating} · {price} · {open_text}\n"
                f"   {stop.address}"
            )
        lines.extend(["", 'Action chips: ["Show on map 🗺", "Get walking directions 🚶", "Filter by budget 💰"]'])
        return "\n".join(lines)

    def _format_open_now(self, hours: dict) -> str:
        open_now = hours.get("open_now")
        if open_now is True:
            return "Open now"
        if open_now is False:
            return "Closed now"
        return "Hours unavailable"

    def _emoji_for_place(self, name: str) -> str:
        text = name.lower()
        if any(word in text for word in ("pizza", "pizzeria")):
            return "🍕"
        if any(word in text for word in ("burger", "shake shack", "mcdonald")):
            return "🍔"
        if any(word in text for word in ("taco", "chipotle", "mexican")):
            return "🌮"
        if any(word in text for word in ("coffee", "cafe", "café")):
            return "☕"
        return "📍"

    def _format_distance(self, distance_m: int) -> str:
        if distance_m < 1000:
            return f"{distance_m} m"
        return f"{distance_m / 1000:.1f} km"

    def _distance_m(self, lat1: float, lng1: float, lat2: float, lng2: float) -> int:
        radius_m = 6_371_000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lng2 - lng1)
        a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
        return int(radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

    async def _safe_save_session(self, turn: AgentTurn, response: str, state: dict) -> None:
        try:
            await save_session_update(
                user_id=turn.user_id,
                session_id=turn.session_id,
                message=turn.message,
                response=response,
                state=state,
            )
        except Exception as exc:
            log_error(turn.user_id, turn.session_id, type(exc).__name__, str(exc), "memory")

    def _fallback_plan(self, turn: AgentTurn, session: UserSession) -> Plan:
        return Plan(
            goal=turn.message or "Refresh the current matchday plan",
            constraints=ConstraintSet(
                time_budget_m=180,
                budget_usd=75.0,
                dietary_flags=session.profile.dietary_flags,
                accessibility=session.profile.accessibility_needs,
                location=turn.location,
            ),
            subtasks=[
                SubTask(
                    subtask_id="fallback_nearby",
                    category="attraction",
                    filters={"negative_signals": session.negative_signals},
                )
            ],
            time_sensitive=False,
            negative_signals=session.negative_signals,
        )


Orchestrator = OrchestratorAgent
