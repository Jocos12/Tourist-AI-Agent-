from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    gemini_model: str = "gemini-2.0-flash"  # use gemini-3 when available in hackathon GCP
    google_api_key: str = ""
    mongodb_mcp_url: str = "http://localhost:3000"
    maps_api_key: str = ""
    routes_api_key: str = ""
    log_level: str = "INFO"
    mock_agents: bool = True  # set MOCK_AGENTS=false in Cloud Run prod


settings = Settings()
