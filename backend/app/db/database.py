from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

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
    """Agrega columnas faltantes a tablas existentes en SQLite.

    Workaround ligero (no hay historial de Alembic): para cada tabla ya creada,
    compara las columnas del modelo con las de la base y agrega las que falten.
    """
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        return

    with engine.connect() as conn:
        for table in Base.metadata.sorted_tables:
            rows = conn.execute(text(f"PRAGMA table_info({table.name})")).fetchall()
            if not rows:
                # La tabla aún no existe; create_all() se encarga de crearla.
                continue
            existing = {row[1] for row in rows}
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
