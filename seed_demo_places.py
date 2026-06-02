import hashlib
import http.client
import json
import os
import random
import ssl
import time
import urllib.error
import urllib.request
from typing import Any

import certifi
import dns.resolver
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection


SEED_BATCH = "demo_places_gemini_200_v1"
PLACE_COUNT = 200
EMBEDDING_DIMENSIONS = 768
DEFAULT_GEMINI_MODEL = "text-embedding-004"


CITIES = [
    ("Kigali", 30.0619, -1.9441),
    ("Musanze", 29.6350, -1.4998),
    ("Rubavu", 29.2564, -1.6792),
    ("Huye", 29.7394, -2.5967),
    ("Nyanza", 29.7500, -2.3519),
    ("Muhanga", 29.7564, -2.0845),
    ("Rwamagana", 30.4347, -1.9487),
    ("Nyagatare", 30.3275, -1.2969),
    ("Karongi", 29.3739, -2.0636),
    ("Rusizi", 28.9075, -2.4846),
]

CATEGORY_SETS = [
    ["cafe", "coffee", "brunch"],
    ["restaurant", "local_food", "family_friendly"],
    ["museum", "culture", "history"],
    ["market", "shopping", "local_crafts"],
    ["park", "nature", "walking"],
    ["hotel", "lodging", "business_travel"],
    ["coworking", "wifi", "workspace"],
    ["nightlife", "music", "drinks"],
    ["wellness", "spa", "relaxation"],
    ["viewpoint", "photography", "outdoors"],
]

NAME_PATTERNS = [
    "{city} Garden Cafe",
    "The {city} Table",
    "{city} Heritage House",
    "Imigongo {city} Market",
    "{city} Green Walk",
    "Hodari Stay {city}",
    "{city} Work Loft",
    "Evening Lights {city}",
    "{city} Wellness Studio",
    "Hilltop View {city}",
]

DESCRIPTION_TEMPLATES = [
    "A welcoming {kind} in {city} known for {detail}, friendly service, and easy access for visitors exploring the area.",
    "A locally loved {kind} in {city} offering {detail}, relaxed seating, and a helpful stop for travelers planning their day.",
    "A practical {kind} in {city} with {detail}, good neighborhood connections, and a warm atmosphere for small groups.",
    "A memorable {kind} in {city} featuring {detail}, simple navigation, and a comfortable setting for first-time guests.",
]

DETAILS = [
    "fresh Rwandan ingredients",
    "quiet corners for remote work",
    "locally made crafts",
    "lake and hill views",
    "guided cultural stories",
    "affordable lunch options",
    "vegetarian-friendly choices",
    "reliable Wi-Fi and charging points",
    "family-friendly outdoor space",
    "sunset photo spots",
]


def configure_dns() -> None:
    servers = [
        server.strip()
        for server in os.getenv("DNS_SERVERS", "").split(",")
        if server.strip()
    ]
    if not servers:
        resolver = dns.resolver.get_default_resolver()
        current = list(resolver.nameservers)
        local_only = current and all(
            server == "127.0.0.1" or server == "::1" or server.startswith("127.")
            for server in current
        )
        if local_only:
            servers = ["8.8.8.8", "1.1.1.1"]

    if servers:
        resolver = dns.resolver.Resolver(configure=False)
        resolver.nameservers = servers
        dns.resolver.default_resolver = resolver
        print(f"Using DNS servers for SRV lookup: {', '.join(servers)}")


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is not set in .env")
    return value


def get_gemini_key() -> str:
    key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not key:
        raise RuntimeError("Set GEMINI_API_KEY or GOOGLE_API_KEY in .env")
    return key


def get_embedding_model() -> str:
    return os.getenv("GEMINI_EMBEDDING_MODEL", DEFAULT_GEMINI_MODEL)


def env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def embed_description(description: str, api_key: str, model: str) -> list[float]:
    model_name = model.removeprefix("models/")
    payload = {
        "model": f"models/{model_name}",
        "content": {"parts": [{"text": description}]},
        "taskType": "RETRIEVAL_DOCUMENT",
        "outputDimensionality": EMBEDDING_DIMENSIONS,
    }
    data = json.dumps(payload).encode("utf-8")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model_name}:embedContent?key={api_key}"
    )
    ssl_context = (
        ssl._create_unverified_context()
        if env_flag("HTTPS_ALLOW_INVALID_CERTIFICATES")
        else None
    )

    for attempt in range(5):
        request = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=30,
                context=ssl_context,
            ) as response:
                body = json.loads(response.read().decode("utf-8"))
            values = body["embedding"]["values"]
            if len(values) != EMBEDDING_DIMENSIONS:
                raise RuntimeError(
                    f"Expected {EMBEDDING_DIMENSIONS} embedding values, got {len(values)}"
                )
            return values
        except urllib.error.HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 4:
                detail = exc.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Gemini embedding request failed: {detail}") from exc
        except (
            urllib.error.URLError,
            TimeoutError,
            http.client.RemoteDisconnected,
            ConnectionResetError,
        ) as exc:
            if attempt == 4:
                raise RuntimeError("Gemini embedding request failed after retries") from exc
            print(f"Embedding request retry {attempt + 1}/5: {exc}")

        time.sleep(2**attempt)

    raise RuntimeError("Gemini embedding request failed")


def google_place_id(index: int, name: str, city: str) -> str:
    digest = hashlib.sha1(f"{index}:{name}:{city}".encode("utf-8")).hexdigest()[:23]
    return f"ChIJ{digest}"


def build_place(index: int, embedding: list[float], embedding_model: str) -> dict[str, Any]:
    city, lng, lat = CITIES[index % len(CITIES)]
    categories = CATEGORY_SETS[index % len(CATEGORY_SETS)]
    name = NAME_PATTERNS[index % len(NAME_PATTERNS)].format(city=city)
    variant = index // len(NAME_PATTERNS) + 1
    if variant > 1:
        name = f"{name} {variant}"

    kind = categories[0].replace("_", " ")
    detail = DETAILS[index % len(DETAILS)]
    description = DESCRIPTION_TEMPLATES[index % len(DESCRIPTION_TEMPLATES)].format(
        kind=kind,
        city=city,
        detail=detail,
    )

    jitter_lng = random.Random(index).uniform(-0.035, 0.035)
    jitter_lat = random.Random(index + 10_000).uniform(-0.035, 0.035)

    return {
        "place_id": f"demo_place_{index + 1:03d}",
        "google_place_id": google_place_id(index, name, city),
        "name": name,
        "city": city,
        "coordinates": {
            "type": "Point",
            "coordinates": [round(lng + jitter_lng, 6), round(lat + jitter_lat, 6)],
        },
        "categories": categories,
        "price_level": (index % 4) + 1,
        "description": description,
        "embedding": embedding,
        "embedding_model": embedding_model,
        "seed_batch": SEED_BATCH,
    }


def create_indexes(places: Collection) -> None:
    places.create_index("place_id", unique=True)
    places.create_index("google_place_id", unique=True)
    places.create_index([("coordinates", "2dsphere")])
    places.create_index("seed_batch")


def verify_seed(places: Collection) -> None:
    total = places.count_documents({"seed_batch": SEED_BATCH})
    embedded = places.count_documents(
        {
            "seed_batch": SEED_BATCH,
            "embedding": {"$type": "array", "$ne": []},
            "embedding.767": {"$exists": True},
            "embedding.768": {"$exists": False},
        }
    )
    missing = places.count_documents(
        {
            "seed_batch": SEED_BATCH,
            "$or": [{"embedding": None}, {"embedding": {"$exists": False}}],
        }
    )

    print(f"Seeded demo places: {total}")
    print(f"Places with 768-dimensional embeddings: {embedded}")
    print(f"Places with null/missing embeddings: {missing}")

    if total != PLACE_COUNT or embedded != PLACE_COUNT or missing != 0:
        raise RuntimeError("Verification failed for seeded demo places")


def main() -> None:
    load_dotenv()
    configure_dns()

    mongo_uri = require_env("MONGODB_URI")
    gemini_key = get_gemini_key()
    embedding_model = get_embedding_model()
    allow_invalid_tls = env_flag("MONGODB_TLS_ALLOW_INVALID_CERTIFICATES")
    if allow_invalid_tls:
        print("Warning: MongoDB TLS certificate verification is disabled for this run.")
    if env_flag("HTTPS_ALLOW_INVALID_CERTIFICATES"):
        print("Warning: HTTPS certificate verification is disabled for Gemini calls.")

    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=20_000,
        tlsCAFile=None if allow_invalid_tls else certifi.where(),
        tlsAllowInvalidCertificates=allow_invalid_tls,
    )
    places = client["hodari"]["places"]

    try:
        client.admin.command("ping")
        create_indexes(places)

        documents = []
        for index in range(PLACE_COUNT):
            city = CITIES[index % len(CITIES)][0]
            categories = CATEGORY_SETS[index % len(CATEGORY_SETS)]
            kind = categories[0].replace("_", " ")
            detail = DETAILS[index % len(DETAILS)]
            description = DESCRIPTION_TEMPLATES[index % len(DESCRIPTION_TEMPLATES)].format(
                kind=kind,
                city=city,
                detail=detail,
            )
            embedding = embed_description(description, gemini_key, embedding_model)
            documents.append(build_place(index, embedding, embedding_model))
            if (index + 1) % 25 == 0:
                print(f"Generated embeddings: {index + 1}/{PLACE_COUNT}", flush=True)

        delete_result = places.delete_many({"seed_batch": SEED_BATCH})
        print(f"Deleted previous demo places: {delete_result.deleted_count}", flush=True)
        places.insert_many(documents, ordered=True)
        verify_seed(places)
    finally:
        client.close()


if __name__ == "__main__":
    main()
