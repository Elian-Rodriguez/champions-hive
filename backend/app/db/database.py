from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import Enum as SQLEnum, create_engine, text
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


def enums_del_modelo():
    """Mapa {nombre_del_tipo: etiquetas} de los enums nativos del modelo.

    SQLAlchemy guarda los NOMBRES de los miembros (FOOTBALL, SWISS…), no sus
    valores en minúscula; son esas etiquetas las que viven en el tipo ENUM de
    PostgreSQL.
    """
    tipos = {}
    for table in Base.metadata.sorted_tables:
        for column in table.columns:
            t = column.type
            if isinstance(t, SQLEnum) and t.native_enum and t.name:
                tipos.setdefault(t.name, list(t.enums))
    return tipos


def _sincronizar_enums_postgres():
    """Agrega a los tipos ENUM de PostgreSQL los valores nuevos del modelo.

    create_all() nunca altera un tipo ya creado: al sumar una disciplina (como
    `banquitas` en SportType) las bases existentes rechazan el INSERT con un
    error de dato inválido. ALTER TYPE ... ADD VALUE exige correr fuera de una
    transacción (en Postgres < 12; en los demás el valor no sería usable dentro
    de la misma), por eso la conexión va en AUTOCOMMIT.
    """
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for tipo, etiquetas in enums_del_modelo().items():
            existentes = {
                row[0]
                for row in conn.execute(
                    text(
                        "SELECT e.enumlabel FROM pg_enum e "
                        "JOIN pg_type t ON t.oid = e.enumtypid "
                        "WHERE t.typname = :tipo"
                    ),
                    {"tipo": tipo},
                )
            }
            if not existentes:
                # El tipo aún no existe; create_all() lo crea ya completo.
                continue
            for etiqueta in etiquetas:
                if etiqueta not in existentes:
                    conn.execute(
                        text(f"ALTER TYPE {tipo} ADD VALUE IF NOT EXISTS '{etiqueta}'")
                    )


def run_sqlite_migrations():
    """Agrega columnas y valores de enum faltantes (SQLite y PostgreSQL).

    Workaround ligero (no hay historial de Alembic): para cada tabla ya creada,
    compara las columnas del modelo con las de la base y agrega con ALTER TABLE
    las que falten (siempre nullable, así no rompe filas existentes). En
    PostgreSQL además sincroniza los tipos ENUM nativos con los del modelo.
    """
    is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

    if not is_sqlite:
        _sincronizar_enums_postgres()

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
