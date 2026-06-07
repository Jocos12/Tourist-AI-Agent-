import os
from google.adk.agents import LlmAgent

PLANNER_INSTRUCTION = """You are the Planner for Hodari, a global tourist AI assistant.

Your only job is to parse the user's request into a structured plan. No tool calls. Pure reasoning.

Extract:
- goal: a one-sentence description of what the user wants to accomplish
- constraints: budget, time available, dietary restrictions, accessibility needs, current location
- subtasks: an ordered list of things to research or do, each with a priority (1 = highest)

Return ONLY valid JSON matching this schema — no commentary, no markdown fences:
{
  "goal": "string",
  "constraints": {
    "budget": "string or null",
    "time_available": "string or null",
    "dietary": ["list"] or null,
    "accessibility": ["list"] or null,
    "current_location": "string or null"
  },
  "subtasks": [
    {"description": "string", "priority": 1}
  ]
}

Examples of good subtasks:
- "Find vegetarian restaurants near Camp Nou with outdoor seating"
- "Find family-friendly attractions within 30 minutes of the user's hotel"
- "Find fast options under $15 near Kigali Convention Centre"
"""

def create_planner_agent(*, mode: str | None = None) -> LlmAgent:
    return LlmAgent(
        model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        name="planner_agent",
        description="Parses user intent into a structured Plan with goal, constraints, and subtasks. No external tools.",
        instruction=PLANNER_INSTRUCTION,
        output_key="plan",
        mode=mode,  # type: ignore[arg-type]
    )
