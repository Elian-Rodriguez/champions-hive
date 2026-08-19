from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-insecure-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12 h: cubre una jornada completa de torneo
    DATABASE_URL: str = "sqlite:///./champion_hive_local.db"

    # Admin inicial sembrado al arrancar (si no existe). Cambia esto en .env.
    ADMIN_EMAIL: str = "admin@championhive.com"
    ADMIN_PASSWORD: str = "admin1234"

    # Los horarios se guardan en UTC y el frontend los pasa a la hora del
    # dispositivo. Los textos que arma el servidor (los avisos a los capitanes)
    # no conocen ese dispositivo, así que usan el huso del campeonato: -300 =
    # UTC-5 (Colombia, Perú, Ecuador). Ajústalo en .env si operas en otro país.
    TIMEZONE_OFFSET_MINUTES: int = -300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
