from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# La cadena del pooler de Supabase suele traer "?pgbouncer=true", una opción de
# Prisma que psycopg2 no entiende. La quitamos para que la URL sea válida.
if SQLALCHEMY_DATABASE_URL and "pgbouncer" in SQLALCHEMY_DATABASE_URL:
    _p = urlsplit(SQLALCHEMY_DATABASE_URL)
    _q = [(k, v) for k, v in parse_qsl(_p.query, keep_blank_values=True) if k != "pgbouncer"]
    SQLALCHEMY_DATABASE_URL = urlunsplit(
        (_p.scheme, _p.netloc, _p.path, urlencode(_q), _p.fragment)
    )

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_sqlite_migrations():
    """Agrega columnas faltantes a tablas existentes (SQLite y PostgreSQL).

    Workaround ligero (no hay historial de Alembic): para cada tabla ya creada,
    compara las columnas del modelo con las de la base y agrega con ALTER TABLE
    las que falten (siempre nullable, así no rompe filas existentes).
    """
    is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

    with engine.connect() as conn:
        for table in Base.metadata.sorted_tables:
            if is_sqlite:
                rows = conn.execute(
                    text(f"PRAGMA table_info({table.name})")
                ).fetchall()
                existing = {row[1] for row in rows}
                table_exists = bool(rows)
            else:
                rows = conn.execute(
                    text(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name = :t AND table_schema = current_schema()"
                    ),
                    {"t": table.name},
                ).fetchall()
                existing = {row[0] for row in rows}
                table_exists = bool(rows)
            if not table_exists:
                # La tabla aún no existe; create_all() se encarga de crearla.
                continue
            for column in table.columns:
                if column.name not in existing:
                    coltype = column.type.compile(dialect=engine.dialect)
                    conn.execute(
                        text(
                            f"ALTER TABLE {table.name} "
                            f"ADD COLUMN {column.name} {coltype}"
                        )
                    )
            conn.commit()
