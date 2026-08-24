"""W.O., partido aplazado y sanción de puntos: la otra mitad del reglamento.

El estado de un partido solo podía ser programado, en vivo o terminado, así que
lo que no se jugó no existía: el equipo que no se presentó se anotaba como un
3-0 escrito a mano, indistinguible de un partido jugado, y la fecha suspendida
por lluvia se quedaba en el calendario chocando con todo. La sanción de puntos
no existía en absoluto, y castigar a un equipo obligaba a mentirle a la tabla
tocándole los resultados. Estas pruebas fijan las tres cosas.
"""
from datetime import datetime, timedelta

import pytest

from .conftest import API

BASE = datetime(2027, 5, 9, 10, 0)


def _iso(delta_min: int) -> str:
    return (BASE + timedelta(minutes=delta_min)).isoformat()


def _tabla(client, torneo_id):
    r = client.get(f"{API}/tournaments/{torneo_id}/team_stats")
    assert r.status_code == 200, r.text
    return {fila["team_id"]: fila for fila in r.json()}


def _estado(client, headers, match_id, **cuerpo):
    r = client.put(f"{API}/matches/{match_id}/status", json=cuerpo, headers=headers)
    return r


@pytest.fixture
def fase(client, admin, torneo, equipos):
    """Fase de grupos con el fixture generado y sin resultados."""
    f = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Grupos", "type": "group"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{f['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{f['id']}/matches").json()
    assert partidos
    return f, partidos


# --------------------------------------------------------------------------- #
#  W.O.
# --------------------------------------------------------------------------- #
def test_el_wo_pone_el_marcador_del_reglamento(client, admin, fase):
    """No se presentó el visitante: 3-0 sin que nadie escriba el marcador."""
    _, partidos = fase
    r = _estado(client, admin, partidos[0]["id"], status="finished", walkover="away")
    assert r.status_code == 200, r.text
    assert (r.json()["home_score"], r.json()["away_score"]) == (3, 0)
    assert r.json()["walkover"] == "away"

    r = _estado(client, admin, partidos[1]["id"], status="finished", walkover="home")
    assert (r.json()["home_score"], r.json()["away_score"]) == (0, 3)


def test_el_marcador_que_manda_el_arbitro_gana(client, admin, fase):
    """El reglamento del torneo puede decir otra cosa; el que carga decide."""
    _, partidos = fase
    r = _estado(
        client, admin, partidos[0]["id"],
        status="finished", walkover="away", home_score=2, away_score=0,
    )
    assert (r.json()["home_score"], r.json()["away_score"]) == (2, 0)


def test_el_wo_de_baloncesto_es_20_0(client, admin, cancha):
    """Cada disciplina tiene el suyo: 20-0 como en FIBA."""
    t = client.post(
        f"{API}/tournaments",
        json={"name": "Copa Cesta", "sport_type": "basketball"},
        headers=admin,
    ).json()
    for i in range(2):
        client.post(
            f"{API}/tournaments/{t['id']}/teams",
            json={"name": f"Cesta {i}"},
            headers=admin,
        )
    f = client.post(
        f"{API}/tournaments/{t['id']}/stages",
        json={"name": "Liga", "type": "league"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{f['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{f['id']}/matches").json()

    r = _estado(client, admin, partidos[0]["id"], status="finished", walkover="away")
    assert (r.json()["home_score"], r.json()["away_score"]) == (20, 0)


def test_quitar_el_wo_deja_el_partido_como_jugado(client, admin, fase):
    _, partidos = fase
    partido = partidos[0]["id"]
    _estado(client, admin, partido, status="finished", walkover="away")
    r = _estado(
        client, admin, partido,
        status="finished", walkover=None, home_score=1, away_score=1,
    )
    assert r.json()["walkover"] is None
    assert (r.json()["home_score"], r.json()["away_score"]) == (1, 1)


def test_el_wo_no_se_pierde_al_corregir_otra_cosa(client, admin, fase):
    """Omitir walkover lo deja como estaba; solo mandarlo en null lo borra."""
    _, partidos = fase
    partido = partidos[0]["id"]
    _estado(client, admin, partido, status="finished", walkover="home")
    r = _estado(client, admin, partido, status="finished", home_score=0, away_score=5)
    assert r.json()["walkover"] == "home"


def test_el_doble_wo_es_derrota_de_los_dos(client, admin, torneo, fase):
    """0-0 sería un empate y les daría un punto a cada uno por no aparecer."""
    _, partidos = fase
    partido = partidos[0]
    r = _estado(client, admin, partido["id"], status="finished", walkover="both")
    assert (r.json()["home_score"], r.json()["away_score"]) == (0, 0)

    tabla = _tabla(client, torneo["id"])
    for lado in ("home_team_id", "away_team_id"):
        fila = tabla[partido[lado]]
        assert fila["losses"] == 1, fila
        assert fila["draws"] == 0, fila
        assert fila["league_points"] == 0, fila


def test_el_walkover_solo_acepta_los_tres_valores(client, admin, fase):
    _, partidos = fase
    r = _estado(client, admin, partidos[0]["id"], status="finished", walkover="nadie")
    assert r.status_code == 422, r.text


# --------------------------------------------------------------------------- #
#  Aplazado
# --------------------------------------------------------------------------- #
def test_el_partido_aplazado_no_cuenta_en_la_tabla(client, admin, torneo, fase):
    _, partidos = fase
    partido = partidos[0]
    _estado(client, admin, partido["id"], status="finished", home_score=4, away_score=0)
    assert _tabla(client, torneo["id"])[partido["home_team_id"]]["matches_played"] == 1

    r = _estado(client, admin, partido["id"], status="postponed")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "postponed"
    fila = _tabla(client, torneo["id"])[partido["home_team_id"]]
    assert fila["matches_played"] == 0 and fila["league_points"] == 0


def test_el_partido_aplazado_no_choca_con_nadie(client, admin, torneo, cancha, fase):
    """Suspender media fecha por lluvia no puede llenar el panel de errores."""
    _, partidos = fase
    for m in partidos[:2]:
        client.put(
            f"{API}/matches/{m['id']}/schedule",
            json={"scheduled_start": _iso(0), "court_id": cancha},
            headers=admin,
        )
    data = client.get(
        f"{API}/tournaments/{torneo['id']}/schedule_conflicts", headers=admin
    ).json()
    assert any(c["type"] == "cancha_ocupada" for c in data["conflicts"])

    _estado(client, admin, partidos[0]["id"], status="postponed")
    data = client.get(
        f"{API}/tournaments/{torneo['id']}/schedule_conflicts", headers=admin
    ).json()
    assert not any(c["type"] == "cancha_ocupada" for c in data["conflicts"])


def test_ponerle_fecha_nueva_lo_devuelve_al_calendario(client, admin, cancha, fase):
    """Reprogramar un aplazado es exactamente eso: si no volviera a estar
    programado se quedaría aplazado para siempre, fuera de la tabla."""
    _, partidos = fase
    partido = partidos[0]["id"]
    _estado(client, admin, partido, status="postponed")
    r = client.put(
        f"{API}/matches/{partido}/schedule",
        json={"scheduled_start": _iso(60), "court_id": cancha},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "scheduled"


def test_cambiarle_la_cancha_no_lo_desaplaza(client, admin, cancha, fase):
    """Solo la fecha nueva lo reactiva; tocar la cancha no es reprogramar."""
    _, partidos = fase
    partido = partidos[0]["id"]
    _estado(client, admin, partido, status="postponed")
    r = client.put(
        f"{API}/matches/{partido}/schedule", json={"court_id": cancha}, headers=admin
    )
    assert r.json()["status"] == "postponed"


def test_el_partido_aplazado_no_reclama_fecha(client, admin, torneo, fase):
    """Estar sin fecha es justamente lo que significa aplazado."""
    _, partidos = fase
    _estado(client, admin, partidos[0]["id"], status="postponed")
    data = client.get(
        f"{API}/tournaments/{torneo['id']}/schedule_conflicts", headers=admin
    ).json()
    sin_fecha = [c for c in data["conflicts"] if c["type"] == "sin_fecha"]
    for c in sin_fecha:
        assert partidos[0]["id"] not in c["match_ids"]


# --------------------------------------------------------------------------- #
#  Sanción de puntos
# --------------------------------------------------------------------------- #
def _sancionar(client, headers, torneo_id, team_id, puntos, motivo=None):
    return client.put(
        f"{API}/tournaments/{torneo_id}/teams/{team_id}/points_adjustment",
        json={"points_adjustment": puntos, "points_adjustment_reason": motivo},
        headers=headers,
    )


def test_el_descuento_baja_al_equipo_en_la_tabla(
    client, admin, torneo, fase_jugada
):
    tabla = _tabla(client, torneo["id"])
    lider = min(tabla.values(), key=lambda f: f["position"])
    assert lider["position"] == 1
    puntos_antes = lider["league_points"]

    r = _sancionar(
        client, admin, torneo["id"], lider["team_id"], -50, "Jugador no inscrito"
    )
    assert r.status_code == 200, r.text
    assert r.json()["points_adjustment"] == -50

    fila = _tabla(client, torneo["id"])[lider["team_id"]]
    assert fila["league_points"] == puntos_antes - 50
    assert fila["points_adjustment"] == -50
    # La sanción tiene que mover la tabla; si no, no es una sanción: el líder
    # con 50 puntos menos termina último.
    assert fila["position"] == len(tabla)


def test_el_descuento_tambien_cuenta_en_la_tabla_del_grupo(
    client, admin, torneo, fase_jugada
):
    """La clasificación sale de la tabla por grupo: si el descuento no llega
    ahí, el equipo sancionado clasifica igual."""
    grupos = client.get(
        f"{API}/tournaments/stages/{fase_jugada['id']}/standings_by_group"
    ).json()
    grupo = next(g for g in grupos.values() if g)
    equipo = grupo[0]
    puntos_antes = equipo["league_points"]

    _sancionar(client, admin, torneo["id"], equipo["team_id"], -6, "Agresión")
    grupos = client.get(
        f"{API}/tournaments/stages/{fase_jugada['id']}/standings_by_group"
    ).json()
    fila = next(
        f for g in grupos.values() for f in g if f["team_id"] == equipo["team_id"]
    )
    assert fila["league_points"] == puntos_antes - 6


def test_el_motivo_se_guarda_con_el_equipo(client, admin, torneo, equipos):
    _sancionar(client, admin, torneo["id"], equipos[0]["id"], -1, "Llegada tarde")
    lista = client.get(f"{API}/tournaments/{torneo['id']}/teams").json()
    equipo = next(e for e in lista if e["id"] == equipos[0]["id"])
    assert equipo["points_adjustment"] == -1
    assert equipo["points_adjustment_reason"] == "Llegada tarde"


def test_quitar_la_sancion_borra_el_motivo(client, admin, torneo, equipos):
    _sancionar(client, admin, torneo["id"], equipos[0]["id"], -3, "Agresión")
    r = _sancionar(client, admin, torneo["id"], equipos[0]["id"], 0, "Agresión")
    assert r.json()["points_adjustment"] == 0
    assert r.json()["points_adjustment_reason"] is None


def test_la_bonificacion_tambien_vale(client, admin, torneo, equipos, fase_jugada):
    """Positiva suma: hay reglamentos que premian el fair play."""
    r = _sancionar(client, admin, torneo["id"], equipos[0]["id"], 2, "Fair play")
    assert r.status_code == 200, r.text
    assert _tabla(client, torneo["id"])[equipos[0]["id"]]["points_adjustment"] == 2


def test_otro_organizador_no_sanciona(client, otro_admin, torneo, equipos):
    r = _sancionar(client, otro_admin, torneo["id"], equipos[0]["id"], -3, "Nada")
    assert r.status_code == 403, r.text


def test_el_arbitro_no_sanciona(client, arbitro, torneo, equipos):
    headers, _ = arbitro
    r = _sancionar(client, headers, torneo["id"], equipos[0]["id"], -3, "Nada")
    assert r.status_code == 403, r.text


def test_el_ajuste_tiene_tope(client, admin, torneo, equipos):
    """Un descuento es de unos pocos puntos; 5000 es un dedo pegado."""
    r = _sancionar(client, admin, torneo["id"], equipos[0]["id"], -5000, "Ups")
    assert r.status_code == 422, r.text


def test_sancionar_un_equipo_que_no_esta_en_el_torneo(client, admin, torneo, equipos):
    otro = client.post(
        f"{API}/tournaments", json={"name": "Otra", "sport_type": "micro"},
        headers=admin,
    ).json()
    r = _sancionar(client, admin, otro["id"], equipos[0]["id"], -3, "Nada")
    assert r.status_code == 404, r.text
