import sys
import os

# Add agents/ root to path so the hodari package is importable regardless of
# where adk api_server is launched from.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from hodari.sub_agents.planner import planner_agent  # noqa: E402

root_agent = planner_agent
