from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-insecure-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12 h: cubre una jornada completa de torneo
    DATABASE_URL: str = "sqlite:///./champion_hive_local.db"

    # Admin inicial sembrado al arrancar (si no existe). Cambia esto en .env.
    ADMIN_EMAIL: str = "admin@championhive.com"
    ADMIN_PASSWORD: str = "admin1234"

    # Nivel del log de la aplicación (DEBUG, INFO, WARNING, ERROR). Los logs
    # salen por stdout, que es de donde los recoge docker/supervisor.
    LOG_LEVEL: str = "INFO"

    # De dónde cuelga el enlace que se manda por correo (el frontend). Sin
    # esto el enlace de recuperación apuntaría a ninguna parte.
    APP_BASE_URL: str = "http://localhost:5173"

    # --- Correo saliente (recuperación de contraseña) ---------------------- #
    # Sin SMTP_HOST el envío queda desactivado y la plataforma sigue igual que
    # antes: el soporte resetea la clave a mano desde el panel.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_STARTTLS: bool = True
    # Minutos que vive el enlace de recuperación. Corto a propósito: es una
    # llave que llega a un buzón y ahí se queda.
    RESET_TOKEN_MINUTES: int = 60

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
