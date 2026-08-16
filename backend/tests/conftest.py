"""Fixtures compartidas de la suite.

La base de datos se apunta a un archivo temporal ANTES de importar la app,
porque `app.core.config` lee DATABASE_URL al importarse y `app.main` siembra el
superadministrador en cuanto se carga el módulo.
"""
import os
import tempfile
import uuid

import pytest

_TMP_DB = os.path.join(tempfile.mkdtemp(prefix="champion-hive-tests-"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ.setdefault("ADMIN_EMAIL", "super@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "super1234")

from fastapi.testclient import TestClient  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.limiter import limiter  # noqa: E402
from app.main import app  # noqa: E402

# El login está limitado a 10/minuto; la suite hace muchos más al crear
# usuarios por test, así que el limitador se apaga durante las pruebas.
limiter.enabled = False

API = "/api/v1"


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


def _headers(client, email, password):
    r = client.post(
        f"{API}/auth/login", data={"username": email, "password": password}
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def superadmin(client):
    """El usuario sembrado desde el .env, promovido a superadmin al arrancar."""
    return _headers(client, settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD)


@pytest.fixture
def crear_usuario(client, superadmin):
    """Crea un usuario con email único y devuelve (headers, user_id)."""

    def _crear(rol):
        email = f"{rol}-{uuid.uuid4().hex[:8]}@example.com"
        r = client.post(
            f"{API}/auth/register",
            json={"email": email, "password": "secret1", "role": rol},
            headers=superadmin,
        )
        assert r.status_code == 201, r.text
        return _headers(client, email, "secret1"), r.json()["id"]

    return _crear


@pytest.fixture
def admin(crear_usuario):
    headers, _ = crear_usuario("admin")
    return headers


@pytest.fixture
def otro_admin(crear_usuario):
    headers, _ = crear_usuario("admin")
    return headers


@pytest.fixture
def arbitro(crear_usuario):
    return crear_usuario("referee")  # (headers, user_id)


@pytest.fixture
def cancha(client, admin):
    """Una cancha para poder generar fixtures."""
    v = client.post(f"{API}/venues", json={"name": "Sede"}, headers=admin).json()
    c = client.post(
        f"{API}/venues/{v['id']}/courts", json={"name": "Cancha 1"}, headers=admin
    ).json()
    return c["id"]


@pytest.fixture
def torneo(client, admin, cancha):
    """Torneo de banquitas listo para inscribir equipos."""
    r = client.post(
        f"{API}/tournaments",
        json={"name": "Copa Test", "sport_type": "banquitas"},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def equipos(client, admin, torneo):
    """Doce equipos repartidos en tres grupos."""
    creados = []
    for i in range(12):
        e = client.post(
            f"{API}/tournaments/{torneo['id']}/teams",
            json={"name": f"Equipo {i:02d}"},
            headers=admin,
        ).json()
        client.put(
            f"{API}/tournaments/{torneo['id']}/teams/{e['id']}/group",
            json={"group_name": "ABC"[i % 3]},
            headers=admin,
        )
        creados.append(e)
    return creados


@pytest.fixture
def fase_jugada(client, admin, torneo, equipos):
    """Fase de grupos con el fixture generado y todos los partidos terminados."""
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Grupos", "type": "group"},
        headers=admin,
    ).json()
    client.post(
        f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin
    )
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    for i, m in enumerate(partidos):
        client.put(
            f"{API}/matches/{m['id']}/status",
            json={"status": "finished", "home_score": (i * 3) % 5, "away_score": i % 3},
            headers=admin,
        )
    return fase
