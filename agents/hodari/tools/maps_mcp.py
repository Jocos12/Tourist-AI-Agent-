import os
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

MAPS_MCP_URL = "https://mapstools.googleapis.com/mcp"


def create_maps_toolset(tools: list[str] | None = None) -> McpToolset:
    """
    Returns a McpToolset connected to Maps Grounding Lite.

    Available tools: search_places, compute_routes, lookup_weather
    Pass `tools` to restrict which ones the agent can use.
    """
    params = StreamableHTTPConnectionParams(
        url=MAPS_MCP_URL,
        headers={
            "X-Goog-Api-Key": os.environ["GOOGLE_MAPS_API_KEY"],
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
    )
    if tools:
        return McpToolset(connection_params=params, tool_filter=tools)
    return McpToolset(connection_params=params)
