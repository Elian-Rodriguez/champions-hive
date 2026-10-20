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

    # --- Mejores jugadas (video) ------------------------------------------ #
    # Los clips NO van en la base como los escudos: un escudo pesa 2-10 KB y
    # una jugada de 20 segundos pesa megabytes. Van a disco, bajo esta carpeta,
    # y la base guarda solo la ficha. En la imagen combinada apunta a /data,
    # que es el volumen que ya persiste (ver deploy/docker-compose.yml).
    MEDIA_ROOT: str = "./media"
    # Tope por clip. Una jugada son 10-20 segundos grabados con el celular;
    # más que esto es un partido entero subido por equivocación. nginx tiene
    # que permitir al menos lo mismo (client_max_body_size).
    MAX_VIDEO_MB: int = 40

    # --- Contentful (opcional, apagado por defecto) ------------------------ #
    # Espejo de los clips en un CDN. Apagado, la plataforma funciona completa
    # sirviendo el video desde disco; encendido, cada jugada se sube además a
    # Contentful y el reproductor usa la URL del CDN. Igual que el correo: si
    # no está configurado NO falla, no sube.
    CONTENTFUL_ENABLED: bool = False
    CONTENTFUL_SPACE_ID: str = ""
    CONTENTFUL_ENVIRONMENT: str = "master"
    # Token de la Content Management API (el que puede escribir assets). El de
    # entrega (CDA) solo lee y aquí no sirve.
    CONTENTFUL_MANAGEMENT_TOKEN: str = ""
    CONTENTFUL_LOCALE: str = "en-US"

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
