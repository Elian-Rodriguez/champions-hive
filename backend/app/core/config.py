from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-insecure-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str = "sqlite:///./champion_hive_local.db"

    # Admin inicial sembrado al arrancar (si no existe). Cambia esto en .env.
    ADMIN_EMAIL: str = "admin@championhive.com"
    ADMIN_PASSWORD: str = "admin1234"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
