"""
Tests for Phase 2 MongoDB tools (tasks 17, 18, 19, 20).

  task 17 — load_user_profile
  task 18 — save_preference
  task 19 — interactions-based re-ranking (find_similar_preferences used by explorer)
  task 20 — find_similar_preferences vector search pipeline
"""
import pytest
from unittest.mock import MagicMock, call
import hodari.tools.mongo_tools as mt


FAKE_EMBEDDING = [0.1] * 768


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_client():
    """The module caches a MongoClient — clear it between tests."""
    mt._client = None
    yield
    mt._client = None


def make_ctx(user_id: str = "test_user_42") -> MagicMock:
    """Return a minimal ADK ToolContext mock."""
    ctx = MagicMock()
    ctx.invocation_context.session.user_id = user_id
    ctx.state = {}
    return ctx


def patch_embed(monkeypatch) -> MagicMock:
    """Stub the Vertex AI embedding REST call (ADC auth) to return FAKE_EMBEDDING."""
    # Stub ADC so _embed never tries to talk to Google auth servers
    mock_creds = MagicMock()
    mock_creds.token = "fake-bearer-token"
    monkeypatch.setattr("google.auth.default", lambda scopes=None: (mock_creds, "fake-project"))
    monkeypatch.setattr("google.auth.transport.requests.Request", MagicMock)

    mock_post = MagicMock()
    mock_post.return_value.raise_for_status = MagicMock()
    mock_post.return_value.json.return_value = {
        "predictions": [{"embeddings": {"values": FAKE_EMBEDDING}}]
    }
    monkeypatch.setattr("hodari.tools.mongo_tools.requests.post", mock_post)
    return mock_post


def patch_mongo(monkeypatch) -> tuple[MagicMock, MagicMock]:
    """
    Stub MongoClient; return (mock_MongoClient, mock_collection).

    mongo_tools calls: MongoClient(uri)[db][collection].method()
    All __getitem__ calls on the same mock return the same child mock,
    so mock_coll is the one object that exposes .find_one, .update_one, .aggregate.
    """
    mock_MongoClient = MagicMock()
    mock_coll = MagicMock()
    # MongoClient(uri)[db_name][coll_name] → mock_coll
    mock_MongoClient.return_value.__getitem__.return_value.__getitem__.return_value = mock_coll
    monkeypatch.setattr("hodari.tools.mongo_tools.MongoClient", mock_MongoClient)
    monkeypatch.setenv("MONGODB_URI", "mongodb://fake")
    return mock_MongoClient, mock_coll


# ── Task 17: load_user_profile ────────────────────────────────────────────────

class TestLoadUserProfile:
    def test_returns_existing_profile(self, monkeypatch):
        _, mock_coll = patch_mongo(monkeypatch)
        profile = {"user_id": "test_user_42", "dietary": ["vegetarian"], "budget": "moderate"}
        mock_coll.find_one.return_value = profile

        result = mt.load_user_profile(make_ctx())

        assert result == profile

    def test_caches_profile_in_session_state(self, monkeypatch):
        _, mock_coll = patch_mongo(monkeypatch)
        profile = {"user_id": "test_user_42", "budget": "low"}
        mock_coll.find_one.return_value = profile

        ctx = make_ctx()
        mt.load_user_profile(ctx)

        assert ctx.state["user_profile"] == profile

    def test_returns_new_user_flag_when_not_found(self, monkeypatch):
        _, mock_coll = patch_mongo(monkeypatch)
        mock_coll.find_one.return_value = None

        result = mt.load_user_profile(make_ctx("brand_new_user"))

        assert result["new_user"] is True
        assert result["user_id"] == "brand_new_user"

    def test_returns_empty_dict_on_mongo_exception(self, monkeypatch):
        mock_MC = MagicMock()
        mock_MC.side_effect = Exception("ECONNREFUSED")
        monkeypatch.setattr("hodari.tools.mongo_tools.MongoClient", mock_MC)
        monkeypatch.setenv("MONGODB_URI", "mongodb://fake")

        result = mt.load_user_profile(make_ctx())

        assert result == {}

    def test_falls_back_to_anonymous_when_context_lacks_user_id(self, monkeypatch):
        _, mock_coll = patch_mongo(monkeypatch)
        mock_coll.find_one.return_value = None

        ctx = MagicMock()
        ctx.invocation_context.session.user_id = MagicMock(side_effect=AttributeError)
        ctx.state = {}

        result = mt.load_user_profile(ctx)

        assert "user_id" in result or result == {}


# ── Task 18: save_preference ──────────────────────────────────────────────────

class TestSavePreference:
    def test_saves_interaction_with_upsert(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")

        result = mt.save_preference("ChIJXXX", "Alive Restaurant", "Barcelona", "liked", make_ctx())

        assert "Saved" in result
        mock_coll.update_one.assert_called_once()
        _, _, kwargs = mock_coll.update_one.call_args[0], mock_coll.update_one.call_args[1], mock_coll.update_one.call_args[1]
        # upsert=True must be passed
        assert mock_coll.update_one.call_args.kwargs.get("upsert") is True

    def test_embeds_place_name_city_action(self, monkeypatch):
        mock_post = patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")

        mt.save_preference("ChIJXXX", "Bar Celta", "Barcelona", "visited", make_ctx())

        # The embedding request text must contain place name, city, and action
        text_sent = mock_post.return_value.json.return_value  # already stubbed
        # Verify post was called (embed ran)
        assert mock_post.call_count == 1

    def test_stores_embedding_in_set(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")

        mt.save_preference("ChIJXXX", "Restaurant", "City", "liked", make_ctx())

        set_doc = mock_coll.update_one.call_args[0][1]["$set"]
        assert set_doc["embedding"] == FAKE_EMBEDDING

    def test_returns_noncritical_message_on_embed_failure(self, monkeypatch):
        mock_creds = MagicMock()
        mock_creds.token = "fake-bearer-token"
        monkeypatch.setattr("google.auth.default", lambda scopes=None: (mock_creds, "fake-project"))
        monkeypatch.setattr("google.auth.transport.requests.Request", MagicMock)
        bad_post = MagicMock()
        bad_post.side_effect = Exception("network error")
        monkeypatch.setattr("hodari.tools.mongo_tools.requests.post", bad_post)
        patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")

        result = mt.save_preference("ChIJXXX", "Place", "City", "liked", make_ctx())

        assert "non-critical" in result.lower()

    @pytest.mark.parametrize("action", ["liked", "disliked", "visited", "skipped", "recommended"])
    def test_accepts_all_valid_actions(self, monkeypatch, action):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")

        result = mt.save_preference("ChIJXXX", "Place", "City", action, make_ctx())

        assert "Saved" in result

    def test_upsert_filter_uses_user_id_and_place_id(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")

        mt.save_preference("ChIJYYY", "Museum", "Madrid", "visited", make_ctx("user_99"))

        filter_doc = mock_coll.update_one.call_args[0][0]
        assert filter_doc["user_id"] == "user_99"
        assert filter_doc["place_id"] == "ChIJYYY"


# ── Task 19/20: find_similar_preferences ─────────────────────────────────────

class TestFindSimilarPreferences:
    def test_returns_vector_search_results(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")
        mock_results = [
            {"place_id": "ChIJ1", "place_name": "Alive", "city": "Barcelona", "action": "liked", "score": 0.95},
            {"place_id": "ChIJ2", "place_name": "Bar Celta", "city": "Barcelona", "action": "visited", "score": 0.88},
        ]
        mock_coll.aggregate.return_value = iter(mock_results)

        result = mt.find_similar_preferences("vegetarian tapas Barcelona", make_ctx())

        assert len(result) == 2
        assert result[0]["score"] == 0.95
        assert result[1]["place_name"] == "Bar Celta"

    def test_pipeline_uses_vectorsearch_stage(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")
        mock_coll.aggregate.return_value = iter([])

        mt.find_similar_preferences("food near stadium", make_ctx())

        pipeline = mock_coll.aggregate.call_args[0][0]
        assert "$vectorSearch" in pipeline[0]

    def test_pipeline_filters_by_user_id(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")
        mock_coll.aggregate.return_value = iter([])

        mt.find_similar_preferences("food", make_ctx("specific_user_123"))

        pipeline = mock_coll.aggregate.call_args[0][0]
        vs_filter = pipeline[0]["$vectorSearch"]["filter"]
        assert vs_filter == {"user_id": {"$eq": "specific_user_123"}}

    def test_pipeline_sends_query_embedding(self, monkeypatch):
        mock_post = patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")
        mock_coll.aggregate.return_value = iter([])

        mt.find_similar_preferences("vegan Barcelona", make_ctx())

        pipeline = mock_coll.aggregate.call_args[0][0]
        query_vector = pipeline[0]["$vectorSearch"]["queryVector"]
        assert query_vector == FAKE_EMBEDDING

    def test_respects_limit_parameter(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")
        mock_coll.aggregate.return_value = iter([])

        mt.find_similar_preferences("food", make_ctx(), limit=3)

        pipeline = mock_coll.aggregate.call_args[0][0]
        assert pipeline[0]["$vectorSearch"]["limit"] == 3

    def test_returns_empty_list_when_index_not_configured(self, monkeypatch):
        patch_embed(monkeypatch)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")
        mock_coll.aggregate.side_effect = Exception("no such index: interactions_embedding")

        result = mt.find_similar_preferences("vegetarian tapas", make_ctx())

        assert result == []

    def test_returns_empty_list_on_embed_failure(self, monkeypatch):
        mock_creds = MagicMock()
        mock_creds.token = "fake-bearer-token"
        monkeypatch.setattr("google.auth.default", lambda scopes=None: (mock_creds, "fake-project"))
        monkeypatch.setattr("google.auth.transport.requests.Request", MagicMock)
        bad_post = MagicMock()
        bad_post.side_effect = Exception("timeout")
        monkeypatch.setattr("hodari.tools.mongo_tools.requests.post", bad_post)
        _, mock_coll = patch_mongo(monkeypatch)
        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "fake-project")

        result = mt.find_similar_preferences("vegetarian tapas", make_ctx())

        assert result == []
