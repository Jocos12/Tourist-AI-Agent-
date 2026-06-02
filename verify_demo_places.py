import os

from dotenv import load_dotenv
from pymongo import MongoClient


SEED_BATCH = "demo_places_gemini_200_v1"


def env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def main() -> None:
    load_dotenv()
    client = MongoClient(
        os.getenv("MONGODB_URI"),
        serverSelectionTimeoutMS=20_000,
        tlsAllowInvalidCertificates=env_flag("MONGODB_TLS_ALLOW_INVALID_CERTIFICATES"),
    )
    places = client["hodari"]["places"]
    query = {"seed_batch": SEED_BATCH}

    total = places.count_documents(query)
    non_null_embeddings = places.count_documents(
        {**query, "embedding": {"$type": "array", "$ne": []}}
    )
    dimensions_768 = places.count_documents(
        {
            **query,
            "embedding.767": {"$exists": True},
            "embedding.768": {"$exists": False},
        }
    )
    model_counts = list(
        places.aggregate(
            [
                {"$match": query},
                {"$group": {"_id": "$embedding_model", "count": {"$sum": 1}}},
            ]
        )
    )
    coordinate_indexes = [
        index["name"]
        for index in places.list_indexes()
        if index["key"].to_dict() == {"coordinates": "2dsphere"}
    ]

    print(f"total={total}")
    print(f"non_null_embeddings={non_null_embeddings}")
    print(f"dimensions_768={dimensions_768}")
    print(f"model_counts={model_counts}")
    print(f"coordinate_indexes={coordinate_indexes}")

    if total != 200 or non_null_embeddings != 200 or dimensions_768 != 200:
        raise SystemExit("Verification failed")
    if not coordinate_indexes:
        raise SystemExit("Missing 2dsphere index on coordinates")

    client.close()


if __name__ == "__main__":
    main()
