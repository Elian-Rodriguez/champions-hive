"""Planilla del partido: quiénes jugaron ESE día.

El acta se firma en la cancha para dejar constancia de quién estuvo en el
partido, pero imprimía la nómina completa del equipo, que no prueba nada: un
jugador que no fue aparecía igual. Estas pruebas fijan que la planilla se cargue
por equipo, que reemplace a la anterior, que solo la toque quien puede dirigir
el partido y que un jugador que no está inscrito en el equipo no pueda entrar,
que es donde empieza el control de elegibilidad.
"""
import pytest

from .conftest import API


@pytest.fixture
def partido_con_nominas(client, admin, torneo, equipos):
    """Un partido con seis jugadores inscritos en cada equipo."""
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Grupos", "type": "group"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    partido = partidos[0]

    nominas = {}
    for lado in ("home_team_id", "away_team_id"):
        equipo = partido[lado]
        nominas[equipo] = [
            client.post(
                f"{API}/teams/{equipo}/players",
                json={"name": f"Jugador {equipo[:4]}-{i}", "number": 10 + i},
                headers=admin,
            ).json()
            for i in range(6)
        ]
    return partido, nominas


def _cargar(client, headers, match_id, team_id, jugadores):
    return client.put(
        f"{API}/matches/{match_id}/lineup",
        json={"team_id": team_id, "players": jugadores},
        headers=headers,
    )


def _planilla(client, match_id):
    r = client.get(f"{API}/matches/{match_id}/lineup")
    assert r.status_code == 200, r.text
    return r.json()


def test_el_organizador_carga_la_planilla(client, admin, partido_con_nominas):
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    jugadores = nominas[equipo]
    r = _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": j["id"], "is_starter": i < 4, "is_captain": i == 0}
         for i, j in enumerate(jugadores[:5])],
    )
    assert r.status_code == 200, r.text
    filas = r.json()
    assert len(filas) == 5
    assert sum(1 for f in filas if f["is_starter"]) == 4
    assert sum(1 for f in filas if f["is_captain"]) == 1
    # El nombre viaja resuelto: el acta se arma con esto y no puede pedir otra
    # consulta por jugador.
    assert all(f["player_name"] for f in filas)


def test_el_dorsal_sale_de_la_nomina_si_no_lo_mandan(client, admin, partido_con_nominas):
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    jugador = nominas[equipo][2]  # se inscribió con el 12
    r = _cargar(client, admin, partido["id"], equipo, [{"player_id": jugador["id"]}])
    assert r.json()[0]["number"] == 12


def test_el_dorsal_del_dia_manda_sobre_el_de_la_nomina(client, admin, partido_con_nominas):
    """En cancha se juega con la camiseta que hay, y el acta dice esa."""
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    jugador = nominas[equipo][2]
    r = _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": jugador["id"], "number": 7}],
    )
    assert r.json()[0]["number"] == 7


def test_la_planilla_reemplaza_a_la_anterior(client, admin, partido_con_nominas):
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    jugadores = nominas[equipo]
    _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": j["id"]} for j in jugadores[:5]],
    )
    r = _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": j["id"]} for j in jugadores[:2]],
    )
    assert len(r.json()) == 2
    assert len([f for f in _planilla(client, partido["id"]) if f["team_id"] == equipo]) == 2


def test_cargar_un_equipo_no_toca_la_del_otro(client, admin, partido_con_nominas):
    """Cada delegado entrega la suya cuando llega, nunca los dos a la vez."""
    partido, nominas = partido_con_nominas
    local, visitante = partido["home_team_id"], partido["away_team_id"]
    _cargar(
        client, admin, partido["id"], local,
        [{"player_id": j["id"]} for j in nominas[local][:5]],
    )
    _cargar(
        client, admin, partido["id"], visitante,
        [{"player_id": j["id"]} for j in nominas[visitante][:3]],
    )
    filas = _planilla(client, partido["id"])
    assert len([f for f in filas if f["team_id"] == local]) == 5
    assert len([f for f in filas if f["team_id"] == visitante]) == 3


def test_vaciar_la_planilla(client, admin, partido_con_nominas):
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": j["id"]} for j in nominas[equipo][:5]],
    )
    r = _cargar(client, admin, partido["id"], equipo, [])
    assert r.status_code == 200, r.text
    assert r.json() == []


def test_el_jugador_de_otro_equipo_no_entra(client, admin, partido_con_nominas):
    """Ahí empieza la elegibilidad: en el acta solo figura quien está inscrito."""
    partido, nominas = partido_con_nominas
    local, visitante = partido["home_team_id"], partido["away_team_id"]
    ajeno = nominas[visitante][0]
    r = _cargar(client, admin, partido["id"], local, [{"player_id": ajeno["id"]}])
    assert r.status_code == 400, r.text
    assert ajeno["name"] in r.json()["detail"]


def test_el_jugador_repetido_se_rechaza(client, admin, partido_con_nominas):
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    jugador = nominas[equipo][0]
    r = _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": jugador["id"]}, {"player_id": jugador["id"]}],
    )
    assert r.status_code == 400, r.text


def test_un_equipo_que_no_juega_ese_partido(client, admin, partido_con_nominas, equipos):
    partido, _ = partido_con_nominas
    ajeno = next(
        e for e in equipos
        if e["id"] not in (partido["home_team_id"], partido["away_team_id"])
    )
    r = _cargar(client, admin, partido["id"], ajeno["id"], [])
    assert r.status_code == 400, r.text


def test_el_arbitro_asignado_carga_la_planilla(
    client, admin, arbitro, partido_con_nominas
):
    headers, arbitro_id = arbitro
    partido, nominas = partido_con_nominas
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    equipo = partido["home_team_id"]
    r = _cargar(
        client, headers, partido["id"], equipo,
        [{"player_id": j["id"]} for j in nominas[equipo][:5]],
    )
    assert r.status_code == 200, r.text


def test_el_arbitro_de_otro_partido_no_la_carga(
    client, admin, arbitro, partido_con_nominas
):
    headers, _ = arbitro  # sin asignar a este partido
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    r = _cargar(
        client, headers, partido["id"], equipo,
        [{"player_id": nominas[equipo][0]["id"]}],
    )
    assert r.status_code == 403, r.text


def test_otro_organizador_no_la_carga(client, otro_admin, partido_con_nominas):
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    r = _cargar(
        client, otro_admin, partido["id"], equipo,
        [{"player_id": nominas[equipo][0]["id"]}],
    )
    assert r.status_code == 403, r.text


def test_sin_sesion_no_se_carga(client, partido_con_nominas):
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    r = client.put(
        f"{API}/matches/{partido['id']}/lineup",
        json={"team_id": equipo, "players": [{"player_id": nominas[equipo][0]["id"]}]},
    )
    assert r.status_code == 401, r.text


def test_borrar_el_torneo_se_lleva_la_planilla(
    client, admin, torneo, partido_con_nominas
):
    """El borrado del torneo va hijo->padre a mano (las claves foráneas de
    Postgres lo exigen): la planilla tiene que ir en esa lista."""
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": j["id"]} for j in nominas[equipo][:3]],
    )
    r = client.delete(f"{API}/tournaments/{torneo['id']}", headers=admin)
    assert r.status_code == 204, r.text
    assert _planilla(client, partido["id"]) == []


def test_la_planilla_se_lee_sin_sesion(client, admin, partido_con_nominas):
    """El acta circula por toda la liga; leerla no pide cuenta."""
    partido, nominas = partido_con_nominas
    equipo = partido["home_team_id"]
    _cargar(
        client, admin, partido["id"], equipo,
        [{"player_id": j["id"]} for j in nominas[equipo][:5]],
    )
    assert len(_planilla(client, partido["id"])) == 5
