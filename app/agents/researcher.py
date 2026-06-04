"""
Researcher Agent - The information-gathering engine of Hodari

This agent:
1. Takes a Plan from the Orchestrator
2. Runs parallel searches using Google Maps Grounding API
3. Re-ranks results using user preferences (via MongoDB vector search)
4. Returns a CandidateSet for the Itinerary agent

Author: Shaka
Target execution time: < 3 seconds
"""

import os
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if we're in mock mode (no real API calls)
MOCK_MODE = os.getenv("MOCK_AGENTS", "false").lower() == "true"

# Import schemas
from app.schemas.candidate import CandidateSet, ScoredPlace
from app.schemas.plan import Plan
from app.logging_config import get_logger

logger = get_logger("researcher")

# ============================================================
# CONFIGURATION
# ============================================================

GOOGLE_MAPS_API_KEY = os.getenv("MAPS_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ============================================================
# TOOL 1: search_places_grounded - Call Google Maps API (or mock)
# ============================================================

async def search_places_grounded(
    query: str,
    location: Dict[str, float],
    radius_m: int = 1000,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Search Google Maps for real places matching query and filters.
    If MOCK_MODE is true, returns fake data for testing.
    """
    
    # MOCK MODE: Return fake data for testing without API keys
    if MOCK_MODE:
        logger.info(f"[MOCK] search_places_grounded called with query: {query}")
        return [
            {
                "place_id": f"mock_place_restaurant_1",
                "name": "Mock Vegan Restaurant",
                "lat": location.get("lat", 40.7128) + 0.001,
                "lng": location.get("lng", -74.0060) + 0.001,
                "rating": 4.7,
                "price_level": 2,
                "hours": "11:00 AM - 10:00 PM",
                "photos": ["https://placehold.co/400x300"],
                "address": "123 Mock Street, City",
                "user_ratings_total": 150
            },
            {
                "place_id": f"mock_place_restaurant_2",
                "name": "Mock Organic Bistro",
                "lat": location.get("lat", 40.7128) - 0.002,
                "lng": location.get("lng", -74.0060) + 0.002,
                "rating": 4.5,
                "price_level": 3,
                "hours": "12:00 PM - 11:00 PM",
                "photos": ["https://placehold.co/400x300"],
                "address": "456 Mock Avenue, City",
                "user_ratings_total": 89
            },
            {
                "place_id": f"mock_place_restaurant_3",
                "name": "Mock Coffee & Bagels",
                "lat": location.get("lat", 40.7128) + 0.002,
                "lng": location.get("lng", -74.0060) - 0.001,
                "rating": 4.3,
                "price_level": 1,
                "hours": "7:00 AM - 3:00 PM",
                "photos": ["https://placehold.co/400x300"],
                "address": "789 Mock Lane, City",
                "user_ratings_total": 45
            }
        ]
    
    # REAL MODE: Call actual Google Maps API
    if not GOOGLE_MAPS_API_KEY:
        logger.error("MAPS_API_KEY not set and MOCK_MODE is false")
        return []
    
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    
    params = {
        "location": f"{location['lat']},{location['lng']}",
        "radius": radius_m,
        "keyword": query,
        "key": GOOGLE_MAPS_API_KEY
    }
    
    if filters and filters.get("price") is not None:
        params["maxprice"] = filters["price"]
        params["minprice"] = 0
    
    if filters and filters.get("open_now", False):
        params["opennow"] = True
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, params=params) as response:
                data = await response.json()
                
                if data.get("status") != "OK":
                    logger.warning(f"Google Maps API error: {data.get('status')}")
                    return []
                
                places = []
                for place in data.get("results", [])[:15]:
                    places.append({
                        "place_id": place["place_id"],
                        "name": place["name"],
                        "lat": place["geometry"]["location"]["lat"],
                        "lng": place["geometry"]["location"]["lng"],
                        "rating": place.get("rating", 0.0),
                        "price_level": place.get("price_level", 2),
                        "hours": "",  # Would need details call
                        "photos": [p["photo_reference"] for p in place.get("photos", [])[:3]],
                        "address": place.get("vicinity", ""),
                        "user_ratings_total": place.get("user_ratings_total", 0)
                    })
                
                return places
                
        except Exception as e:
            logger.error(f"Error calling Google Maps API: {e}")
            return []


# ============================================================
# TOOL 2: find_similar_preferences - STUB (waiting for Bienvenue)
# ============================================================

async def find_similar_preferences(
    user_id: str,
    query_embedding: List[float],
    candidate_place_ids: List[str],
    k: int = 10
) -> List[Dict[str, Any]]:
    """
    STUB FUNCTION - Waiting for Bienvenue's MongoDB MCP implementation.
    Currently returns mock preference scores.
    """
    logger.info(f"[STUB] find_similar_preferences called for user {user_id}")
    
    # Mock scores for testing
    return [
        {
            "place_id": place_id,
            "similarity_score": 0.75 + (i * 0.05) if i < 10 else 0.5,
            "match_reason": "You liked similar places before (stub)"
        }
        for i, place_id in enumerate(candidate_place_ids[:k])
    ]


# ============================================================
# TOOL 3: web_search - For time-sensitive information
# ============================================================

async def web_search(query: str) -> Dict[str, Any]:
    """Web search for time-sensitive information (mock for now)"""
    logger.info(f"[STUB] web_search called for: {query}")
    
    return {
        "search_query": query,
        "results": f"Current information about: {query} (mock data)",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============================================================
# TOOL 4: get_embedding - Convert text to vector
# ============================================================

async def get_embedding(text: str) -> List[float]:
    """Generate embedding using Gemini API"""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set, returning zero vector")
        return [0.0] * 768
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_query"
        )
        
        return result["embedding"]
        
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return [0.0] * 768


# ============================================================
# MAIN RESEARCHER AGENT - Entry point called by Orchestrator
# ============================================================

async def run_researcher(plan: Plan) -> List[CandidateSet]:
    """
    Main Researcher agent entry point.
    
    Args:
        plan: Structured Plan from the Planner agent
    
    Returns:
        List of CandidateSet objects (one per subtask)
    """
    logger.info(
        "researcher_invoked",
        subtask_count=len(plan.subtasks),
        mock_mode=MOCK_MODE
    )
    start_time = datetime.now(timezone.utc)
    
    # Extract plan data
    subtasks = plan.subtasks
    location = {
        "lat": plan.constraints.location.get("lat", 40.7128),
        "lng": plan.constraints.location.get("lng", -74.0060)
    }
    user_id = getattr(plan, "user_id", "test_user")
    time_sensitive = getattr(plan, "time_sensitive", False)
    
    if not subtasks:
        logger.warning("No subtasks in plan, returning empty")
        return []
    
    # ============================================================
    # STEP 1: Create all search tasks (will run in parallel)
    # ============================================================
    
    search_tasks = []
    subtask_info = []
    
    for subtask in subtasks:
        # Get query from subtask (use category as fallback)
        query = getattr(subtask, "query", None)
        if not query:
            query = f"{subtask.category} near me"
        
        filters = getattr(subtask, "filters", {})
        if hasattr(filters, "model_dump"):
            filters = filters.model_dump()
        
        task = search_places_grounded(
            query=query,
            location=location,
            radius_m=1000,
            filters=filters
        )
        search_tasks.append(task)
        subtask_info.append({
            "subtask_id": subtask.subtask_id,
            "original_query": query,
            "filters": filters,
            "category": subtask.category
        })
    
    # ============================================================
    # STEP 2: Add embedding generation for personalization
    # ============================================================
    
    goal = getattr(plan, "goal", "")
    embedding_task = get_embedding(goal)
    search_tasks.append(embedding_task)
    
    # ============================================================
    # STEP 3: Add web search if time-sensitive
    # ============================================================
    
    if time_sensitive:
        web_task = web_search(goal)
        search_tasks.append(web_task)
    
    # ============================================================
    # STEP 4: RUN EVERYTHING IN PARALLEL with asyncio.gather()
    # ============================================================
    
    logger.info(f"Running {len(search_tasks)} tasks in parallel...")
    results = await asyncio.gather(*search_tasks, return_exceptions=True)
    
    # Extract results
    search_results = results[:len(subtask_info)]
    embedding_vector = results[len(subtask_info)]
    
    if isinstance(embedding_vector, Exception):
        logger.error(f"Embedding generation failed: {embedding_vector}")
        embedding_vector = [0.0] * 768
    
    # ============================================================
    # STEP 5: Re-rank with user preferences
    # ============================================================
    
    candidate_sets = []
    
    for i, (info, raw_places) in enumerate(zip(subtask_info, search_results)):
        if isinstance(raw_places, Exception):
            logger.error(f"Search failed for {info['subtask_id']}: {raw_places}")
            continue
        
        if not raw_places:
            logger.warning(f"No places found for {info['subtask_id']}")
            continue
        
        # Get place IDs for preference ranking
        place_ids = [p["place_id"] for p in raw_places]
        
        # Call find_similar_preferences (stub for now)
        preference_scores = await find_similar_preferences(
            user_id=user_id,
            query_embedding=embedding_vector if isinstance(embedding_vector, list) else [0.0] * 768,
            candidate_place_ids=place_ids,
            k=len(place_ids)
        )
        
        # Create map of place_id -> preference score
        score_map = {ps["place_id"]: ps for ps in preference_scores}
        
        # Merge raw places with preference scores
        scored_places = []
        for place in raw_places:
            pref = score_map.get(place["place_id"], {
                "similarity_score": 0.5,
                "match_reason": "No preference data available"
            })
            
            scored_place = ScoredPlace(
                place_id=place["place_id"],
                name=place["name"],
                lat=place["lat"],
                lng=place["lng"],
                rating=place.get("rating", 0.0),
                price_level=place.get("price_level", 2),
                hours=place.get("hours", ""),
                photos=place.get("photos", []),
                address=place.get("address", ""),
                similarity_score=pref["similarity_score"],
                match_reason=pref["match_reason"]
            )
            scored_places.append(scored_place)
        
        # Sort by similarity score (highest first)
        scored_places.sort(key=lambda x: x.similarity_score, reverse=True)
        
        # Limit to 10 places per subtask
        scored_places = scored_places[:10]
        
        # Create CandidateSet
        candidate_set = CandidateSet(
            subtask_id=info["subtask_id"],
            places=scored_places,
            search_query=info["original_query"],
            timestamp=datetime.now(timezone.utc)
        )
        candidate_sets.append(candidate_set)
    
    # ============================================================
    # STEP 6: Log performance and return
    # ============================================================
    
    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"researcher_completed", elapsed_seconds=elapsed, candidate_sets=len(candidate_sets))
    
    return candidate_sets