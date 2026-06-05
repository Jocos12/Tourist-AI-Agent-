"""
Creates Atlas Vector Search indexes for the hodari database.

Atlas Vector Search indexes require the Atlas Admin API — they cannot be
created via the MongoDB MCP `create-index` tool (which only supports regular
B-tree indexes).

This script:
  1. Always prints manual UI instructions (the reliable fallback).
  2. Attempts programmatic creation via the Atlas Admin API when the required
     env vars are present.

Required env vars for programmatic creation:
    MONGODB_ATLAS_PUBLIC_KEY   — Atlas API public key
    MONGODB_ATLAS_PRIVATE_KEY  — Atlas API private key
    MONGODB_ATLAS_GROUP_ID     — Atlas project (group) ID
    MONGODB_ATLAS_CLUSTER_NAME — Atlas cluster name
    MONGODB_DATABASE           — database name (default: hodari)

Usage:
    python scripts/create_indexes.py
"""

import json
import logging
import os
import sys
from pathlib import Path

# ── Load .env ────────────────────────────────────────────────────────────────
_here = Path(__file__).resolve().parent
_agents_dir = _here.parent
try:
    from dotenv import load_dotenv
    _env_path = _agents_dir / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
    else:
        load_dotenv()
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

HODARI_DB: str = os.getenv("MONGODB_DATABASE", "hodari")

# ── Index definitions ────────────────────────────────────────────────────────

INDEXES = [
    {
        "name": "places_embedding",
        "collection": "places",
        "database": HODARI_DB,
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 768,
                    "similarity": "cosine",
                },
                {
                    "type": "filter",
                    "path": "city",
                },
                {
                    "type": "filter",
                    "path": "categories",
                },
            ]
        },
    },
    {
        "name": "interactions_embedding",
        "collection": "interactions",
        "database": HODARI_DB,
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 768,
                    "similarity": "cosine",
                },
                {
                    "type": "filter",
                    "path": "user_id",
                },
            ]
        },
    },
]

# ── Manual instructions ──────────────────────────────────────────────────────

MANUAL_INSTRUCTIONS = """
╔══════════════════════════════════════════════════════════════════════════════╗
║         ATLAS VECTOR SEARCH INDEXES — MANUAL CREATION INSTRUCTIONS         ║
╚══════════════════════════════════════════════════════════════════════════════╝

If programmatic creation fails (or you prefer the UI), create these two indexes
via the Atlas UI:

  1. Go to: https://cloud.mongodb.com
  2. Navigate to your cluster → "Atlas Search" tab
  3. Click "Create Search Index" → choose "Atlas Vector Search" (JSON editor)

────────────────────────────────────────────────────────────────────────────────
INDEX 1: places_embedding
  Database   : {db}
  Collection : places
  Index Name : places_embedding

  JSON Definition:
{places_json}

────────────────────────────────────────────────────────────────────────────────
INDEX 2: interactions_embedding
  Database   : {db}
  Collection : interactions
  Index Name : interactions_embedding

  JSON Definition:
{interactions_json}

────────────────────────────────────────────────────────────────────────────────
Note: the interactions_embedding index may already exist if you ran the MVP
setup. If Atlas reports "index already exists", that is fine — no action needed.
"""


def print_manual_instructions() -> None:
    places_idx = INDEXES[0]
    interactions_idx = INDEXES[1]
    print(
        MANUAL_INSTRUCTIONS.format(
            db=HODARI_DB,
            places_json=json.dumps(places_idx["definition"], indent=4),
            interactions_json=json.dumps(interactions_idx["definition"], indent=4),
        )
    )


# ── Atlas Admin API programmatic creation ────────────────────────────────────

def _create_index_via_api(
    public_key: str,
    private_key: str,
    group_id: str,
    cluster_name: str,
    index_spec: dict,
) -> bool:
    """
    Attempt to create a single Atlas Vector Search index via the Admin API.
    Returns True on success, False if the index already exists, raises on other errors.
    """
    try:
        from requests.auth import HTTPDigestAuth
        import requests
    except ImportError:
        logger.error("'requests' package is required for Atlas API calls.")
        return False

    url = (
        f"https://cloud.mongodb.com/api/atlas/v2"
        f"/groups/{group_id}/clusters/{cluster_name}/search/indexes"
    )

    payload = {
        "name": index_spec["name"],
        "database": index_spec["database"],
        "collectionName": index_spec["collection"],
        "type": "vectorSearch",
        "definition": index_spec["definition"],
    }

    resp = requests.post(
        url,
        json=payload,
        auth=HTTPDigestAuth(public_key, private_key),
        headers={
            "Accept": "application/vnd.atlas.2023-02-01+json",
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    if resp.status_code == 200 or resp.status_code == 201:
        logger.info(
            "Created index '%s' on %s.%s",
            index_spec["name"],
            index_spec["database"],
            index_spec["collection"],
        )
        return True

    body = {}
    try:
        body = resp.json()
    except Exception:
        pass

    error_code = body.get("errorCode", "")

    # Gracefully handle duplicate index
    if resp.status_code == 409 or error_code in (
        "INDEX_ALREADY_EXISTS",
        "DUPLICATE_INDEX_NAME",
    ):
        logger.info(
            "Index '%s' already exists on %s.%s — skipping.",
            index_spec["name"],
            index_spec["database"],
            index_spec["collection"],
        )
        return True

    logger.error(
        "Atlas API returned %s for index '%s': %s",
        resp.status_code,
        index_spec["name"],
        body,
    )
    return False


def try_programmatic_creation() -> None:
    public_key = os.getenv("MONGODB_ATLAS_PUBLIC_KEY", "").strip()
    private_key = os.getenv("MONGODB_ATLAS_PRIVATE_KEY", "").strip()
    group_id = os.getenv("MONGODB_ATLAS_GROUP_ID", "").strip()
    cluster_name = os.getenv("MONGODB_ATLAS_CLUSTER_NAME", "").strip()

    missing = [
        name
        for name, val in [
            ("MONGODB_ATLAS_PUBLIC_KEY", public_key),
            ("MONGODB_ATLAS_PRIVATE_KEY", private_key),
            ("MONGODB_ATLAS_GROUP_ID", group_id),
            ("MONGODB_ATLAS_CLUSTER_NAME", cluster_name),
        ]
        if not val
    ]

    if missing:
        logger.info(
            "Atlas API credentials not set (%s). Skipping programmatic creation.\n"
            "Set these env vars to enable automatic index creation.",
            ", ".join(missing),
        )
        return

    logger.info(
        "Atlas API credentials found. Attempting programmatic index creation "
        "(cluster: %s, project: %s)...",
        cluster_name,
        group_id,
    )

    all_ok = True
    for index_spec in INDEXES:
        try:
            ok = _create_index_via_api(
                public_key, private_key, group_id, cluster_name, index_spec
            )
            if not ok:
                all_ok = False
        except Exception as exc:
            logger.error(
                "Exception creating index '%s': %s", index_spec["name"], exc
            )
            all_ok = False

    if all_ok:
        logger.info("All indexes created or already exist.")
    else:
        logger.warning(
            "One or more indexes could not be created programmatically. "
            "Use the manual instructions above to create them in the Atlas UI."
        )


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print_manual_instructions()
    try_programmatic_creation()
