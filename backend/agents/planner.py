from __future__ import annotations

import json
import os
import re
from typing import Any

import google.generativeai as genai
from pydantic import ValidationError

from schemas import ConstraintSet, Location, Plan, SubTask, UserSession
from utils.logger import get_logger, log_planner_invoked


logger = get_logger(__name__)


class PlannerError(RuntimeError):
    pass


PLANNER_SYSTEM_PROMPT = """
You are the Planner agent for Hodari, a global tourist assistant that can help in any city or country.
Your ONLY job is to decompose the user's request into a structured Plan.
You do NOT call any tools. You reason only.

Given the user message and their profile, output a JSON Plan with:
- goal: one sentence describing what the user wants to do
- constraints: { time_budget_m, budget_usd, dietary_flags[], accessibility, location: {lat, lng} }
- subtasks: [ { subtask_id, category (restaurant|attraction|transport|event), filters: {...} } ]
- time_sensitive: true if the request involves live events, stadium schedules, or disruptions
- negative_signals: list of place_ids the user has rejected in this session

If the message contains "Current location: lat=..., lng=...", copy those exact coordinates into
constraints.location. For "near me" requests, this GPS location is mandatory and should be the
search anchor.

User profile context will be injected. Output ONLY valid JSON matching the Plan schema.
Do not add any text before or after the JSON.
"""


class PlannerAgent:
    def __init__(self) -> None:
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        self.fallback_model_name = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-1.5-pro")

    async def run(self, user_message: str, session: UserSession) -> Plan:
        using_default_generator = getattr(self._generate, "__func__", None) is PlannerAgent._generate
        if not self.api_key and using_default_generator:
            plan = self._fallback_plan(user_message, session)
            log_planner_invoked(session.user_id, session.session_id, len(plan.subtasks))
            logger.warning("planner_fallback_no_api_key", session_id=session.session_id)
            return plan

        prompt = self._build_prompt(user_message, session)
        errors: list[str] = []

        for attempt in range(2):
            retry_hint = ""
            if attempt == 1:
                retry_hint = (
                    "\nYour previous response failed validation. Fix these errors and return ONLY valid JSON:\n"
                    + "\n".join(errors)
                )
            raw = await self._generate(prompt + retry_hint, self.model_name)
            try:
                plan = Plan.model_validate(self._parse_json(raw))
                log_planner_invoked(session.user_id, session.session_id, len(plan.subtasks))
                logger.info("planner_result", plan=plan.model_dump(mode="json"), session_id=session.session_id)
                return plan
            except (json.JSONDecodeError, ValidationError, TypeError) as exc:
                errors.append(str(exc))
            except Exception as exc:
                errors.append(str(exc))
                break

        plan = self._fallback_plan(user_message, session)
        log_planner_invoked(session.user_id, session.session_id, len(plan.subtasks))
        logger.warning("planner_fallback_after_errors", session_id=session.session_id, errors=errors)
        return plan

    async def plan(self, *, message: str, session: UserSession) -> Plan:
        return await self.run(message, session)

    async def _generate(self, prompt: str, model_name: str) -> str:
        try:
            model = genai.GenerativeModel(model_name, system_instruction=PLANNER_SYSTEM_PROMPT)
            response = await model.generate_content_async(prompt)
            return response.text or "{}"
        except Exception:
            if model_name == self.fallback_model_name:
                raise
            model = genai.GenerativeModel(self.fallback_model_name, system_instruction=PLANNER_SYSTEM_PROMPT)
            response = await model.generate_content_async(prompt)
            return response.text or "{}"

    def _parse_json(self, raw: str) -> dict[str, Any]:
        clean = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)

    def _build_prompt(self, user_message: str, session: UserSession) -> str:
        return (
            f"User message: {user_message}\n"
            f"User profile: {session.profile.model_dump_json()}\n"
            f"Recent interactions: {json.dumps([i.model_dump(mode='json') for i in session.recent_interactions], ensure_ascii=False)}\n"
            f"Negative signals: {session.negative_signals}\n"
        )

    def _parse_location(self, user_message: str) -> Location:
        match = re.search(r"lat=([-\d.]+),\s*lng=([-\d.]+)", user_message, re.IGNORECASE)
        if match:
            lat = float(match.group(1))
            lng = float(match.group(2))
            if abs(lat) > 0.0001 or abs(lng) > 0.0001:
                return Location(lat=lat, lng=lng)
        named_location = self._parse_named_location(user_message)
        if named_location:
            return named_location
        return Location(lat=0.0, lng=0.0)

    def _parse_named_location(self, user_message: str) -> Location | None:
        text = user_message.lower()
        known_locations = {
            "kigali": Location(lat=-1.9441, lng=30.0619),
            "rwanda": Location(lat=-1.9441, lng=30.0619),
            "camp nou": Location(lat=41.3809, lng=2.1228),
            "barcelona": Location(lat=41.3851, lng=2.1734),
            "metlife": Location(lat=40.8136, lng=-74.0745),
            "meadowlands": Location(lat=40.8136, lng=-74.0745),
            "azteca": Location(lat=19.3029, lng=-99.1505),
            "mexico city": Location(lat=19.4326, lng=-99.1332),
            "tokyo": Location(lat=35.6762, lng=139.6503),
            "paris": Location(lat=48.8566, lng=2.3522),
            "london": Location(lat=51.5072, lng=-0.1276),
            "doha": Location(lat=25.2854, lng=51.5310),
            "nairobi": Location(lat=-1.2921, lng=36.8219),
        }
        for key, location in known_locations.items():
            if key in text:
                return location
        return None

    def _infer_category(self, message: str) -> str:
        text = message.lower()
        if any(word in text for word in ("dinner", "lunch", "food", "restaurant", "eat", "vegetarian", "halal")):
            return "restaurant"
        if any(word in text for word in ("stadium", "match", "kickoff", "game", "world cup", "camp nou")):
            return "event"
        if any(word in text for word in ("metro", "bus", "train", "transport", "uber")):
            return "transport"
        return "attraction"

    def _extract_budget(self, message: str, fallback: float) -> float:
        match = re.search(r"(?:\$|usd\s*)\s*(\d{1,4})|(\d{1,4})\s*(?:dollars|usd|\$)", message, re.IGNORECASE)
        if not match:
            return fallback
        return float(match.group(1) or match.group(2))

    def _extract_time_budget(self, message: str) -> int:
        hours = re.search(r"(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)", message, re.IGNORECASE)
        if hours:
            return int(float(hours.group(1)) * 60)
        minutes = re.search(r"(\d{2,3})\s*(?:m|min|mins|minutes)", message, re.IGNORECASE)
        if minutes:
            return int(minutes.group(1))
        return 180

    def _extract_dietary_flags(self, message: str, profile_flags: list[str]) -> list[str]:
        text = message.lower()
        flags = set(profile_flags)
        for flag in ("vegetarian", "vegan", "halal", "kosher", "gluten-free"):
            if flag in text:
                flags.add(flag)
        return sorted(flags)

    def _build_fallback_subtasks(self, message: str, category: str, negative_signals: list[str]) -> list[SubTask]:
        text = message.lower()
        subtasks: list[SubTask] = []

        wants_food = category == "restaurant" or any(word in text for word in ("food", "eat", "lunch", "dinner", "breakfast", "vegetarian", "cafe", "coffee"))
        wants_stadium = any(word in text for word in ("stadium", "match", "kickoff", "game", "world cup", "metlife", "camp nou", "azteca"))
        wants_attraction = any(word in text for word in ("hours", "visit", "attraction", "shopping", "museum", "experience", "before"))

        if wants_food:
            subtasks.append(SubTask(subtask_id="restaurant_1", category="restaurant", filters={"query": message, "negative_signals": negative_signals}))
        if wants_attraction or wants_stadium:
            subtasks.append(SubTask(subtask_id="attraction_1", category="attraction", filters={"query": message, "negative_signals": negative_signals}))
        if wants_stadium:
            subtasks.append(SubTask(subtask_id="event_1", category="event", filters={"query": message, "negative_signals": negative_signals}))

        if not subtasks:
            subtasks.append(SubTask(subtask_id=f"{category}_1", category=category, filters={"query": message, "negative_signals": negative_signals}))
        return subtasks

    def _fallback_plan(self, user_message: str, session: UserSession) -> Plan:
        clean_message = user_message.split("\nCurrent location:")[0].strip()
        category = self._infer_category(clean_message)
        budget_map = {"budget": 40.0, "mid": 75.0, "luxury": 150.0}
        fallback_budget = budget_map.get(session.profile.budget_tier, 75.0)
        return Plan(
            goal=clean_message or "Plan a useful tourist itinerary near your location",
            constraints=ConstraintSet(
                time_budget_m=self._extract_time_budget(clean_message),
                budget_usd=self._extract_budget(clean_message, fallback_budget),
                dietary_flags=self._extract_dietary_flags(clean_message, session.profile.dietary_flags),
                accessibility=session.profile.accessibility_needs,
                location=self._parse_location(user_message),
            ),
            subtasks=self._build_fallback_subtasks(clean_message, category, session.negative_signals),
            time_sensitive=any(word in clean_message.lower() for word in ("kickoff", "match", "stadium", "today", "tonight")),
            negative_signals=session.negative_signals,
        )
