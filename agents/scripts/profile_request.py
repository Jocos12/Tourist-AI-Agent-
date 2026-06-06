#!/usr/bin/env python3
"""Fire one planning request against local ADK and print wall-clock time.

Phase B/C: read the HODARI PROFILE table in the ADK server terminal after this
script finishes. Check intent_type=LIST_DISCOVERY vs ITINERARY_PLANNING.
Requires ADK on :8000 and Mongo MCP on :3100.

Usage (from agents/):
    .venv\\Scripts\\python.exe scripts/profile_request.py --list
    .venv\\Scripts\\python.exe scripts/profile_request.py --itinerary
    .venv\\Scripts\\python.exe scripts/profile_request.py -m "custom query"
"""

from __future__ import annotations

import argparse
import json
import time
import uuid
from datetime import datetime

import requests

ADK = "http://localhost:8000"
APP = "hodari"
USER = "profile_probe"

QUERY_LIST = "Find 4 restaurants near Camp Nou. I have a big budget."
QUERY_ITINERARY = (
    "Plan a 3-hour lunch itinerary near Camp Nou in Barcelona, "
    "vegetarian-friendly, budget around 60 dollars."
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Profile one Hodari /run request")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--list", action="store_true", help="LIST_DISCOVERY benchmark query")
    group.add_argument("--itinerary", action="store_true", help="ITINERARY_PLANNING benchmark query")
    parser.add_argument("-m", "--message", help="Custom user message")
    args = parser.parse_args()

    if args.message:
        msg = args.message
    elif args.itinerary:
        msg = QUERY_ITINERARY
    else:
        msg = QUERY_LIST

    session = f"probe-{uuid.uuid4().hex[:8]}"

    requests.post(
        f"{ADK}/apps/{APP}/users/{USER}/sessions/{session}",
        json={},
        timeout=30,
    )

    print(f"START {datetime.now().isoformat(timespec='seconds')}")
    print(f"session={session}")
    print(f"query={msg!r}")
    print("Watch the ADK terminal for HODARI PROFILE (intent_type line).")
    print("---")

    t0 = time.perf_counter()
    resp = requests.post(
        f"{ADK}/run",
        json={
            "app_name": APP,
            "user_id": USER,
            "session_id": session,
            "new_message": {"role": "user", "parts": [{"text": msg}]},
            "streaming": False,
        },
        timeout=900,
    )
    resp.raise_for_status()
    events = resp.json()
    elapsed = round(time.perf_counter() - t0, 2)

    print(f"EVENT_COUNT {len(events)}")
    print(f"TOTAL_WALL {elapsed}s")
    out = f"hodari_probe_{session}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)
    print(f"Saved events to {out}")


if __name__ == "__main__":
    main()
