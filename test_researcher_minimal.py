"""
Minimal test for Researcher Agent - No complex imports
"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Add to path
sys.path.insert(0, str(Path(__file__).parent))

# Import directly from your researcher file
import importlib.util

# Load researcher.py directly
researcher_path = Path(__file__).parent / "app" / "agents" / "researcher.py"
spec = importlib.util.spec_from_file_location("researcher", researcher_path)
researcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(researcher)

run_researcher = researcher.run_researcher
MOCK_MODE = researcher.MOCK_MODE

async def main():
    print("=" * 60)
    print("MINIMAL TEST - Researcher Agent")
    print(f"Mock Mode: {MOCK_MODE}")
    print("=" * 60)
    
    # Create a simple plan object with the required attributes
    class MockSubtask:
        def __init__(self, subtask_id, category, query=None, filters=None):
            self.subtask_id = subtask_id
            self.category = category
            self.query = query or f"{category} near me"
            self.filters = filters or {}
    
    class MockConstraints:
        def __init__(self):
            self.location = {"lat": 40.7128, "lng": -74.0060}
    
    class MockPlan:
        def __init__(self):
            self.goal = "Find a good breakfast place before the game"
            self.constraints = MockConstraints()
            self.subtasks = [
                MockSubtask("breakfast_01", "restaurant", "breakfast restaurant"),
                MockSubtask("attraction_01", "attraction", "museum")
            ]
            self.time_sensitive = False
            self.user_id = "test_user"
            self.negative_signals = []
    
    test_plan = MockPlan()
    
    print(f"\n📋 Test Plan:")
    print(f"   Goal: {test_plan.goal}")
    print(f"   Subtasks: {[s.subtask_id for s in test_plan.subtasks]}")
    
    print("\n🚀 Running Researcher Agent...\n")
    
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
            for i, place in enumerate(cs.places[:3]):
                print(f"     {i+1}. {place.name} (score: {place.similarity_score})")
            print()
    else:
        print("\n❌ Researcher returned nothing")
    
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())