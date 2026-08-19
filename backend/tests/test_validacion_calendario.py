"""Validador del calendario: choques de cancha, de equipo, de árbitro y orden.

La programación automática no se pisa sola; el problema aparece en cuanto el
organizador mueve una hora a mano. Estas pruebas fijan qué se considera error
(imposible de jugar) y qué es solo un aviso, porque el validador no bloquea
nada y su unico valor es que lo que reporta sea cierto.
"""
from datetime import datetime, timedelta

import pytest

from .conftest import API

BASE = datetime(2027, 3, 6, 9, 0)


def _iso(delta_min: int) -> str:
    return (BASE + timedelta(minutes=delta_min)).isoformat()


def _conflictos(client, headers, torneo_id, **params):
    r = client.get(
        f"{API}/tournaments/{torneo_id}/schedule_conflicts",
        headers=headers,
        params=params,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _tipos(data) -> set:
    return {c["type"] for c in data["conflicts"]}


@pytest.fixture
def fase_con_partidos(client, admin, torneo, equipos):
    """Fase de grupos con fixture generado, sin fechas todavía."""
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Grupos", "type": "group"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    assert partidos
    return fase, partidos


def _programar(client, admin, match_id, inicio, court_id=None, referee_id=None):
    cuerpo = {"scheduled_start": inicio}
    if court_id:
        cuerpo["court_id"] = court_id
    if referee_id:
        cuerpo["referee_id"] = referee_id
    r = client.put(f"{API}/matches/{match_id}/schedule", json=cuerpo, headers=admin)
    assert r.status_code == 200, r.text
    return r.json()


def test_dos_partidos_en_la_misma_cancha_a_la_misma_hora(
    client, admin, torneo, cancha, fase_con_partidos
):
    _, partidos = fase_con_partidos
    _programar(client, admin, partidos[0]["id"], _iso(0), cancha)
    _programar(client, admin, partidos[1]["id"], _iso(5), cancha)

    data = _conflictos(client, admin, torneo["id"])
    choques = [c for c in data["conflicts"] if c["type"] == "cancha_ocupada"]
    assert choques, data
    assert choques[0]["severity"] == "error"
    assert data["errors"] >= 1 and data["ok"] is False
    assert partidos[0]["id"] in choques[0]["match_ids"]
    assert partidos[1]["id"] in choques[0]["match_ids"]


def test_partidos_seguidos_en_la_misma_cancha_no_chocan(
    client, admin, torneo, cancha, fase_con_partidos
):
    """El torneo de la fixture dura 20 min: a los 30 ya está libre."""
    _, partidos = fase_con_partidos
    _programar(client, admin, partidos[0]["id"], _iso(0), cancha)
    _programar(client, admin, partidos[1]["id"], _iso(30), cancha)

    data = _conflictos(client, admin, torneo["id"])
    assert "cancha_ocupada" not in _tipos(data)


def test_un_equipo_no_puede_jugar_dos_partidos_a_la_vez(
    client, admin, torneo, cancha, fase_con_partidos
):
    _, partidos = fase_con_partidos
    primero = partidos[0]
    # Otro partido del mismo equipo local, en otra cancha pero a la misma hora.
    otro = next(
        m
        for m in partidos[1:]
        if primero["home_team_id"] in (m["home_team_id"], m["away_team_id"])
    )
    v = client.post(f"{API}/venues", json={"name": "Sede B"}, headers=admin).json()
    cancha_b = client.post(
        f"{API}/venues/{v['id']}/courts", json={"name": "Cancha B"}, headers=admin
    ).json()["id"]
    _programar(client, admin, primero["id"], _iso(0), cancha)
    _programar(client, admin, otro["id"], _iso(10), cancha_b)

    data = _conflictos(client, admin, torneo["id"])
    solapados = [c for c in data["conflicts"] if c["type"] == "equipo_solapado"]
    assert solapados, data
    assert solapados[0]["severity"] == "error"
    assert solapados[0]["team_id"] == primero["home_team_id"]


def test_poco_descanso_entre_partidos_es_aviso_no_error(
    client, admin, torneo, cancha, fase_con_partidos
):
    _, partidos = fase_con_partidos
    primero = partidos[0]
    otro = next(
        m
        for m in partidos[1:]
        if primero["home_team_id"] in (m["home_team_id"], m["away_team_id"])
    )
    v = client.post(f"{API}/venues", json={"name": "Sede C"}, headers=admin).json()
    cancha_c = client.post(
        f"{API}/venues/{v['id']}/courts", json={"name": "Cancha C"}, headers=admin
    ).json()["id"]
    # Banquitas dura 20 min: el segundo arranca 5 min despues de terminar.
    _programar(client, admin, primero["id"], _iso(0), cancha)
    _programar(client, admin, otro["id"], _iso(25), cancha_c)

    data = _conflictos(client, admin, torneo["id"])
    avisos = [c for c in data["conflicts"] if c["type"] == "equipo_sin_descanso"]
    assert avisos, data
    assert avisos[0]["severity"] == "aviso"
    assert "5 min" in avisos[0]["title"]

    # Con un descanso minimo mas laxo, deja de reportarse.
    relajado = _conflictos(client, admin, torneo["id"], min_rest_minutes=5)
    assert "equipo_sin_descanso" not in _tipos(relajado)


def test_el_mismo_arbitro_en_dos_partidos_a_la_vez(
    client, admin, torneo, cancha, arbitro, fase_con_partidos
):
    _, partidos = fase_con_partidos
    headers_arbitro, arbitro_id = arbitro
    v = client.post(f"{API}/venues", json={"name": "Sede D"}, headers=admin).json()
    cancha_d = client.post(
        f"{API}/venues/{v['id']}/courts", json={"name": "Cancha D"}, headers=admin
    ).json()["id"]
    _programar(client, admin, partidos[0]["id"], _iso(0), cancha, arbitro_id)
    _programar(client, admin, partidos[1]["id"], _iso(10), cancha_d, arbitro_id)

    data = _conflictos(client, admin, torneo["id"])
    choques = [c for c in data["conflicts"] if c["type"] == "arbitro_ocupado"]
    assert choques, data
    assert choques[0]["referee_id"] == arbitro_id


def test_los_partidos_sin_fecha_y_sin_cancha_se_reportan(
    client, admin, torneo, cancha, fase_con_partidos
):
    _, partidos = fase_con_partidos
    # generate_fixture ya reparte canchas: hay que quitarsela a proposito para
    # dejar un partido con hora pero sin donde jugarse. El resto sigue sin fecha.
    r = client.put(
        f"{API}/matches/{partidos[0]['id']}/schedule",
        json={"scheduled_start": _iso(0), "court_id": None},
        headers=admin,
    )
    assert r.status_code == 200 and r.json()["court_id"] is None, r.text

    data = _conflictos(client, admin, torneo["id"])
    tipos = _tipos(data)
    assert "sin_fecha" in tipos and "sin_cancha" in tipos
    assert all(
        c["severity"] == "aviso"
        for c in data["conflicts"]
        if c["type"] in ("sin_fecha", "sin_cancha")
    )


def test_un_calendario_bien_armado_no_reporta_errores(
    client, admin, torneo, cancha, fase_con_partidos
):
    """La programación automática no se pisa a sí misma."""
    r = client.post(
        f"{API}/tournaments/{torneo['id']}/schedule",
        json={"start": BASE.isoformat()},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    data = _conflictos(client, admin, torneo["id"])
    assert data["errors"] == 0, [c["title"] for c in data["conflicts"]]


def test_el_validador_es_del_dueño_del_torneo(client, otro_admin, arbitro, torneo):
    assert (
        client.get(
            f"{API}/tournaments/{torneo['id']}/schedule_conflicts", headers=otro_admin
        ).status_code
        == 403
    )
    headers_arbitro, _ = arbitro
    assert (
        client.get(
            f"{API}/tournaments/{torneo['id']}/schedule_conflicts",
            headers=headers_arbitro,
        ).status_code
        == 403
    )


def test_mover_la_hora_a_mano_recalcula_el_fin(client, admin, cancha, fase_con_partidos):
    """Sin esto el fin quedaba viejo y el validador medía ventanas falsas."""
    _, partidos = fase_con_partidos
    m = _programar(client, admin, partidos[0]["id"], _iso(0), cancha)
    assert m["scheduled_end"], m
    fin_inicial = m["scheduled_end"]
    movido = _programar(client, admin, partidos[0]["id"], _iso(180))
    assert movido["scheduled_end"] != fin_inicial
    assert movido["scheduled_end"] > movido["scheduled_start"]
