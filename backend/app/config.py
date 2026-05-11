from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str
    database_url: str
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fallback_model: str = "llama-3.3-70b-versatile"


settings = Settings()
