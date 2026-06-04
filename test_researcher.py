"""
Test script for Researcher Agent
Run this to verify your implementation works with mock mode
"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Add backend to path
sys.path.insert(0, str(Path(__file__)))

from app.agents.researcher import run_researcher
from app.schemas.plan import Plan, PlanConstraints, SubTask

async def main():
    print("=" * 60)
    print("Testing Researcher Agent (Mock Mode)")
    print("=" * 60)
    
    # Create a test plan (matching the Plan schema)
    test_plan = Plan(
        goal="Find a good breakfast place before the game",
        constraints=PlanConstraints(
            time_budget_m=240,
            budget_usd=60,
            dietary_flags=["vegetarian"],
            accessibility=False,
            location={"lat": 40.7128, "lng": -74.0060}
        ),
        subtasks=[
            SubTask(
                subtask_id="breakfast_01",
                category="restaurant",
                filters={}
            ),
            SubTask(
                subtask_id="attraction_01",
                category="attraction",
                filters={}
            )
        ],
        time_sensitive=False,
        negative_signals=[]
    )
    
    print(f"\n📋 Test Plan:")
    print(f"   Goal: {test_plan.goal}")
    print(f"   Subtasks: {[s.subtask_id for s in test_plan.subtasks]}")
    print(f"   Mock Mode: Enabled (using fake data)")
    
    print("\n🚀 Running Researcher Agent...")
    
    result = await run_researcher(test_plan)
    
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    
    if result:
        print(f"\n✅ Researcher returned {len(result)} candidate sets\n")
        for cs in result:
            print(f"📌 Subtask: {cs.subtask_id}")
            print(f"   Search query: {cs.search_query}")
            print(f"   Places found: {len(cs.places)}")
            print(f"   Timestamp: {cs.timestamp}")
            print("\n   Top 3 places:")
            for i, place in enumerate(cs.places[:3]):
                print(f"     {i+1}. {place.name}")
                print(f"       - Rating: {place.rating}/5")
                print(f"       - Price level: {place.price_level}/4")
                print(f"       - Similarity score: {place.similarity_score}")
                print(f"       - Reason: {place.match_reason}")
            print()
    else:
        print("\n❌ Researcher returned nothing")
    
    print("=" * 60)
    print("Test Complete")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())