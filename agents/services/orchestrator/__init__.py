import os
import sys

# Add agents/ root to path so the hodari package is importable regardless of
# where adk api_server is launched from.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

PLANNER_URL = os.getenv("PLANNER_SERVICE_URL")
EXPLORER_URL = os.getenv("EXPLORER_SERVICE_URL")
ITINERARY_URL = os.getenv("ITINERARY_SERVICE_URL")

if PLANNER_URL and EXPLORER_URL and ITINERARY_URL:
    # Production: call each sub-agent as a remote Cloud Run service
    from .remote_pipeline import build_remote_orchestrator  # noqa: E402
    root_agent = build_remote_orchestrator(PLANNER_URL, EXPLORER_URL, ITINERARY_URL)
else:
    # Dev / local: run everything in-process (same as `adk api_server hodari`)
    from hodari.agent import root_agent  # noqa: F401, E402
