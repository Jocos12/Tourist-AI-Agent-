"""Tests for map_control tool."""

import json

from hodari.tools.map_control import map_control


class _FakeState(dict):
    """Minimal stand-in for ADK State (dict-like assignment)."""

    def __getitem__(self, key):
        return super().__getitem__(key)

    def __setitem__(self, key, value):
        super().__setitem__(key, value)

    def get(self, key, default=None):
        return super().get(key, default)


class _FakeToolContext:
    def __init__(self):
        self.state = _FakeState()


def test_map_control_writes_valid_actions():
    ctx = _FakeToolContext()
    result = json.loads(
        map_control(
            [
                {"op": "hide_user_location"},
                {"op": "clear_route"},
            ],
            ctx,
        )
    )
    assert result["ok"] is True
    assert len(result["actions"]) == 2
    stored = json.loads(ctx.state["map_actions"])
    assert stored[0]["op"] == "hide_user_location"


def test_map_control_route_action():
    ctx = _FakeToolContext()
    map_control(
        [
            {
                "op": "route",
                "from": "landmark",
                "landmark": "Musée du Louvre, Paris",
                "to_place_name": "Omusubi Gonbei",
                "mode": "WALK",
            }
        ],
        ctx,
    )
    stored = json.loads(ctx.state["map_actions"])
    assert stored[0]["landmark"] == "Musée du Louvre, Paris"
    assert stored[0]["mode"] == "WALK"


def test_map_control_rejects_invalid_ops():
    ctx = _FakeToolContext()
    result = json.loads(
        map_control([{"op": "fly_to_moon"}, {"op": "hide_user_location"}], ctx)
    )
    assert result["ok"] is True
    stored = json.loads(ctx.state["map_actions"])
    assert len(stored) == 1
    assert stored[0]["op"] == "hide_user_location"


def test_suppress_gps_context_flag():
    ctx = _FakeToolContext()
    map_control([{"op": "suppress_gps_context"}], ctx)
    assert ctx.state["suppress_gps_context"] == "1"
    map_control([{"op": "show_user_location"}], ctx)
    assert ctx.state.get("suppress_gps_context") == ""
