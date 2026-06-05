from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql://localhost:5432/groupwork"
    JWT_SECRET: str
    JWT_ACCESS_TTL: int = 900
    JWT_REFRESH_TTL: int = 604800
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"
    SES_SENDER_EMAIL: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
