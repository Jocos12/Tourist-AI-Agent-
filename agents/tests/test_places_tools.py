"""Tests for places_tools seeded-city guard."""

from unittest.mock import MagicMock

import hodari.tools.places_tools as pt


def make_ctx() -> MagicMock:
    return MagicMock()


class TestSeededCityGuard:
    def test_barcelona_not_seeded(self):
        assert pt.is_seeded_city("Barcelona") is False

    def test_dallas_is_seeded(self):
        assert pt.is_seeded_city("Dallas") is True

    def test_alias_resolves_to_seeded_city(self):
        assert pt.is_seeded_city("Camp Nou area") is False
        assert pt.is_seeded_city("near AT&T Stadium") is True

    def test_find_places_by_vector_skips_unseeded_without_embed(self, monkeypatch):
        embed = MagicMock(side_effect=AssertionError("_embed should not run"))
        mcp = MagicMock(side_effect=AssertionError("_mcp_tool should not run"))
        monkeypatch.setattr(pt, "_embed", embed)
        monkeypatch.setattr(pt, "_mcp_tool", mcp)

        result = pt.find_places_by_vector(
            "vegetarian lunch",
            "Barcelona",
            make_ctx(),
        )

        assert result == []
        embed.assert_not_called()
        mcp.assert_not_called()
