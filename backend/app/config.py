from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-5-5"
    jwt_secret: str
    jwt_minutes: int = 720
    upload_dir: str = "uploads"
    max_upload_mb: int = 50
    cors_origins: list[str] = ["http://localhost:4200"]
    agent_max_steps: int = 8


settings = Settings()
