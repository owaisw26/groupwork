from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ACCESS_TTL: int = 900
    JWT_REFRESH_TTL: int = 604800
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_ENDPOINT_URL: str = ""
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    SES_SENDER_EMAIL: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173"
    COOKIE_SECURE: bool = True
    ENVIRONMENT: str = "development"
    REQUIRE_EMAIL_VERIFICATION: bool = False

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @model_validator(mode="after")
    def require_secure_cookies_in_production(self) -> "Settings":
        if self.is_production and not self.COOKIE_SECURE:
            raise ValueError("COOKIE_SECURE must be true when ENVIRONMENT=production")
        return self

    @model_validator(mode="after")
    def require_strong_jwt_secret_in_production(self) -> "Settings":
        if self.is_production and len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters in production")
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
