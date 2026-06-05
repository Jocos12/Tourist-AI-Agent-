"""
Fallback: creates the places_embedding Atlas Vector Search index via pymongo.
Use this if the Atlas UI gives you trouble.

  pip install pymongo
  python scripts/create_vector_index_pymongo.py
"""

import os, sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

try:
    from pymongo import MongoClient
except ImportError:
    sys.exit("pymongo not installed — run:  pip install pymongo")

URI = os.environ.get("MONGODB_URI")
if not URI:
    sys.exit("MONGODB_URI not set in .env")

# M0 free tier has very few connection slots.
# maxPoolSize=1 ensures we don't compete with the MCP server.
client = MongoClient(
    URI,
    maxPoolSize=1,
    serverSelectionTimeoutMS=30_000,
    connectTimeoutMS=30_000,
    socketTimeoutMS=30_000,
)
db = client["hodari"]

INDEX = {
    "name": "places_embedding",
    "type": "vectorSearch",
    "definition": {
        "fields": [
            {"type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine"},
            {"type": "filter", "path": "city"},
            {"type": "filter", "path": "categories"},
        ]
    },
}

try:
    result = db["places"].create_search_index(INDEX)
    print(f"Index created: {result}")
    print("Status will show as 'BUILDING' in Atlas — takes 1-3 minutes to become READY.")
except Exception as e:
    if "already exists" in str(e).lower() or "Duplicate" in str(e):
        print("Index already exists — nothing to do.")
    else:
        raise
finally:
    client.close()
