"""Suspensiones por acumulación de tarjetas, que son OPCIONALES.

Tres amarillas son una fecha en casi cualquier liga, pero hay torneos que
llevan la disciplina en un comité y no quieren que el sistema marque a nadie, y
hay campeonatos ya empezados donde encender esto a mitad de camino cambiaría el
reglamento con la pelota rodando. Por eso lo primero que se fija aquí es que
apagado no pase absolutamente nada, y lo segundo que el cálculo salga de los
eventos —una tarjeta corregida el domingo por la mañana tiene que mover la
suspensión al instante, no dejarla escrita en piedra—.
"""
from datetime import datetime, timedelta

import pytest

from .conftest import API

BASE = datetime(2027, 2, 6, 10, 0)


@pytest.fixture
def liga(client, admin, cancha):
    """Seis equipos con fixture y fechas en orden.

    Seis y no cuatro para que cada equipo juegue cinco fechas: con tres
    partidos no quedaría ninguno DESPUÉS de la tercera amarilla y no se podría
    comprobar ni qué partido se pierde ni cuándo queda cumplida.
    """
    torneo = client.post(
        f"{API}/tournaments",
        json={"name": "Copa Disciplina", "sport_type": "football"},
        headers=admin,
    ).json()
    equipos = []
    for i in range(6):
        e = client.post(
            f"{API}/tournaments/{torneo['id']}/teams",
            json={"name": f"Club {i}"},
            headers=admin,
        ).json()
        e["players"] = [
            client.post(
                f"{API}/teams/{e['id']}/players",
                json={"name": f"Jugador {i}-{j}", "number": j + 1},
                headers=admin,
            ).json()
            for j in range(3)
        ]
        equipos.append(e)
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Liga", "type": "league"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    # Fechas en orden: el motor ordena los partidos por fecha para saber qué
    # jornada viene después de la tarjeta.
    for i, m in enumerate(partidos):
        client.put(
            f"{API}/matches/{m['id']}/schedule",
            json={"scheduled_start": (BASE + timedelta(days=i)).isoformat()},
            headers=admin,
        )
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    partidos.sort(key=lambda m: m["scheduled_start"])
    return {"torneo": torneo, "equipos": equipos, "fase": fase, "partidos": partidos}


def _encender(client, admin, torneo_id, **cfg):
    cuerpo = {"enabled": True, **cfg}
    r = client.put(
        f"{API}/tournaments/{torneo_id}",
        json={"discipline_config": cuerpo},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _disciplina(client, torneo_id, headers=None):
    r = client.get(f"{API}/tournaments/{torneo_id}/discipline", headers=headers or {})
    assert r.status_code == 200, r.text
    return r.json()


def _tarjeta(client, admin, match, player, tipo="AMARILLA", lado="home"):
    r = client.post(
        f"{API}/matches/events",
        json={
            "match_id": match["id"],
            "player_id": player["id"],
            "event_type": tipo,
            "event_data": {"team": lado, "kind": "card", "minute": 20},
        },
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _finalizar(client, admin, match):
    r = client.put(
        f"{API}/matches/{match['id']}/status",
        json={"status": "finished", "home_score": 1, "away_score": 0},
        headers=admin,
    )
    assert r.status_code == 200, r.text


def _partidos_de(liga, equipo_id):
    """Los partidos de un equipo, en orden de fecha."""
    return [
        m
        for m in liga["partidos"]
        if equipo_id in (m["home_team_id"], m["away_team_id"])
    ]


def _lado(match, equipo_id):
    return "home" if match["home_team_id"] == equipo_id else "away"


def _amonestar(client, admin, liga, equipo, jugador, cuantos, tipo="AMARILLA"):
    """Le saca `cuantos` tarjetas en partidos distintos, ya terminados."""
    usados = []
    for m in _partidos_de(liga, equipo["id"])[:cuantos]:
        _tarjeta(client, admin, m, jugador, tipo, _lado(m, equipo["id"]))
        _finalizar(client, admin, m)
        usados.append(m)
    return usados


# --------------------------------------------------------------------------- #
#  Apagado: la plataforma sigue como estaba
# --------------------------------------------------------------------------- #
def test_apagado_no_suspende_a_nadie(client, admin, liga):
    equipo = liga["equipos"][0]
    _amonestar(client, admin, liga, equipo, equipo["players"][0], 3)
    datos = _disciplina(client, liga["torneo"]["id"])
    assert datos["enabled"] is False
    assert datos["sanctions"] == [] and datos["at_risk"] == []


def test_encenderlo_es_una_decision_del_organizador(client, admin, liga):
    """Y se puede volver a apagar sin perder nada: no hay estado guardado."""
    equipo = liga["equipos"][0]
    _amonestar(client, admin, liga, equipo, equipo["players"][0], 3)
    _encender(client, admin, liga["torneo"]["id"])
    assert len(_disciplina(client, liga["torneo"]["id"])["sanctions"]) == 1

    client.put(
        f"{API}/tournaments/{liga['torneo']['id']}",
        json={"discipline_config": {"enabled": False}},
        headers=admin,
    )
    assert _disciplina(client, liga["torneo"]["id"])["sanctions"] == []


# --------------------------------------------------------------------------- #
#  La acumulación
# --------------------------------------------------------------------------- #
def test_tres_amarillas_una_fecha(client, admin, liga):
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    jugador = equipo["players"][0]
    _encender(client, admin, torneo)
    _amonestar(client, admin, liga, equipo, jugador, 3)

    datos = _disciplina(client, torneo)
    assert len(datos["sanctions"]) == 1, datos
    s = datos["sanctions"][0]
    assert s["player_name"] == jugador["name"]
    assert s["reason"] == "3 amarillas"
    assert s["pending"] == 1 and s["served"] == 0
    # Y dice qué partido se pierde, que es la pregunta del sábado.
    assert s["next_match"] is not None


def test_dos_amarillas_todavia_no(client, admin, liga):
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    _encender(client, admin, torneo)
    _amonestar(client, admin, liga, equipo, equipo["players"][0], 2)
    datos = _disciplina(client, torneo)
    assert datos["sanctions"] == []
    # Pero avisa que está a una, que es lo que el capitán agradece ANTES.
    assert len(datos["at_risk"]) == 1
    assert datos["at_risk"][0]["yellows"] == 2


def test_el_limite_es_configurable(client, admin, liga):
    """Hay ligas largas que suspenden a las cinco."""
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    _encender(client, admin, torneo, yellow_limit=5)
    _amonestar(client, admin, liga, equipo, equipo["players"][0], 3)
    assert _disciplina(client, torneo)["sanctions"] == []


def test_la_suspension_se_cumple_con_el_siguiente_partido(client, admin, liga):
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    jugador = equipo["players"][0]
    _encender(client, admin, torneo)
    usados = _amonestar(client, admin, liga, equipo, jugador, 3)
    assert _disciplina(client, torneo)["sanctions"][0]["pending"] == 1

    # El equipo juega la fecha siguiente: la suspensión queda cumplida.
    siguientes = [
        m for m in _partidos_de(liga, equipo["id"]) if m not in usados
    ]
    _finalizar(client, admin, siguientes[0])
    assert _disciplina(client, torneo)["sanctions"] == []


def test_dos_fechas_necesitan_dos_partidos(client, admin, liga):
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    _encender(client, admin, torneo, yellow_matches=2)
    usados = _amonestar(client, admin, liga, equipo, equipo["players"][0], 3)
    siguientes = [m for m in _partidos_de(liga, equipo["id"]) if m not in usados]

    _finalizar(client, admin, siguientes[0])
    datos = _disciplina(client, torneo)
    assert datos["sanctions"][0]["pending"] == 1
    assert datos["sanctions"][0]["served"] == 1


# --------------------------------------------------------------------------- #
#  Expulsiones
# --------------------------------------------------------------------------- #
def test_la_roja_suspende_de_una(client, admin, liga):
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    _encender(client, admin, torneo)
    _amonestar(client, admin, liga, equipo, equipo["players"][0], 1, tipo="ROJA")
    datos = _disciplina(client, torneo)
    assert len(datos["sanctions"]) == 1
    assert datos["sanctions"][0]["reason"] == "Roja directa"


def test_la_doble_amarilla_no_vuelve_a_cobrarse_en_la_acumulacion(
    client, admin, liga
):
    """Ya se paga como expulsión; contarlas otra vez sería cobrar dos veces."""
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    jugador = equipo["players"][0]
    _encender(client, admin, torneo)
    partidos = _partidos_de(liga, equipo["id"])

    primero = partidos[0]
    lado = _lado(primero, equipo["id"])
    _tarjeta(client, admin, primero, jugador, "AMARILLA", lado)
    _tarjeta(client, admin, primero, jugador, "AMARILLA", lado)
    _finalizar(client, admin, primero)

    datos = _disciplina(client, torneo)
    assert [s["reason"] for s in datos["sanctions"]] == ["Doble amarilla"]
    # Las dos de la expulsión no dejaron al jugador a una de la acumulación.
    assert datos["at_risk"] == []


# --------------------------------------------------------------------------- #
#  Se calcula, no se guarda
# --------------------------------------------------------------------------- #
def test_borrar_la_tarjeta_levanta_la_suspension(client, admin, liga):
    """El árbitro se equivocó de jugador y lo corrige el domingo temprano."""
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    jugador = equipo["players"][0]
    _encender(client, admin, torneo)
    partidos = _partidos_de(liga, equipo["id"])
    ultimo = None
    for m in partidos[:3]:
        ultimo = _tarjeta(client, admin, m, jugador, "AMARILLA", _lado(m, equipo["id"]))
        _finalizar(client, admin, m)
    assert _disciplina(client, torneo)["sanctions"]

    client.delete(f"{API}/matches/events/{ultimo['id']}", headers=admin)
    assert _disciplina(client, torneo)["sanctions"] == []


def test_la_tarjeta_de_un_partido_en_vivo_todavia_no_cuenta(client, admin, liga):
    equipo, torneo = liga["equipos"][0], liga["torneo"]["id"]
    jugador = equipo["players"][0]
    _encender(client, admin, torneo)
    partidos = _partidos_de(liga, equipo["id"])
    for m in partidos[:2]:
        _tarjeta(client, admin, m, jugador, "AMARILLA", _lado(m, equipo["id"]))
        _finalizar(client, admin, m)
    # La tercera es de un partido que todavía se está jugando.
    en_curso = partidos[2]
    client.put(
        f"{API}/matches/{en_curso['id']}/status", json={"status": "live"}, headers=admin
    )
    _tarjeta(client, admin, en_curso, jugador, "AMARILLA", _lado(en_curso, equipo["id"]))
    assert _disciplina(client, torneo)["sanctions"] == []

    _finalizar(client, admin, en_curso)
    assert _disciplina(client, torneo)["sanctions"]


# --------------------------------------------------------------------------- #
#  Configuración y publicación
# --------------------------------------------------------------------------- #
def test_la_configuracion_valida_los_numeros(client, admin, liga):
    r = client.put(
        f"{API}/tournaments/{liga['torneo']['id']}",
        json={"discipline_config": {"enabled": True, "yellow_limit": 999}},
        headers=admin,
    )
    assert r.status_code == 422, r.text


def test_la_configuracion_viaja_en_el_torneo(client, admin, liga):
    datos = _encender(client, admin, liga["torneo"]["id"], yellow_limit=4)
    assert datos["discipline_config"]["yellow_limit"] == 4
    assert _disciplina(client, liga["torneo"]["id"])["config"]["yellow_limit"] == 4


def test_sigue_el_interruptor_de_publicacion(client, admin, liga):
    """Si el organizador no publica sanciones, esto tampoco se publica."""
    torneo = liga["torneo"]["id"]
    _encender(client, admin, torneo)
    client.put(
        f"{API}/tournaments/{torneo}",
        json={"visibility": {"sanciones": False}},
        headers=admin,
    )
    assert client.get(f"{API}/tournaments/{torneo}/discipline").status_code == 403
    # El dueño lo sigue viendo: es su reglamento.
    assert (
        client.get(f"{API}/tournaments/{torneo}/discipline", headers=admin).status_code
        == 200
    )


def test_otro_torneo_no_se_mezcla(client, admin, liga, torneo, fase_jugada):
    """Las tarjetas de un campeonato no suspenden en otro."""
    equipo = liga["equipos"][0]
    _encender(client, admin, liga["torneo"]["id"])
    _amonestar(client, admin, liga, equipo, equipo["players"][0], 3)
    _encender(client, admin, torneo["id"])
    assert _disciplina(client, torneo["id"])["sanctions"] == []
