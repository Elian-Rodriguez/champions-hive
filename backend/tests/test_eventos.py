"""Corrección y borrado de eventos del partido.

El árbitro carga en vivo, con el partido corriendo: se equivoca de jugador, de
equipo o de minuto, o toca el botón de más. Sin estas rutas la única salida era
pedirle al organizador que tocara la base de datos, así que lo que se fija aquí
es que corregir tenga exactamente el mismo alcance que cargar.
"""
from .conftest import API


def _evento(client, headers, match_id, **extra):
    payload = {
        "match_id": match_id,
        "event_type": "GOL",
        "event_data": {"team": "home", "kind": "goal", "minute": 10},
    }
    payload.update(extra)
    r = client.post(f"{API}/matches/events", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def _partido_del_arbitro(client, admin, arbitro, fase_jugada):
    """Un partido de la fase con el árbitro asignado, y otro sin asignar."""
    headers, arbitro_id = arbitro
    partidos = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()
    mio, ajeno = partidos[0], partidos[1]
    client.put(
        f"{API}/matches/{mio['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    return mio, ajeno


# --------------------------------------------------------------------------- #
#  Corregir
# --------------------------------------------------------------------------- #
def test_el_arbitro_corrige_su_evento(client, admin, arbitro, fase_jugada):
    headers, _ = arbitro
    mio, _ = _partido_del_arbitro(client, admin, arbitro, fase_jugada)
    ev = _evento(client, headers, mio["id"])

    r = client.put(
        f"{API}/matches/events/{ev['id']}",
        json={"event_type": "AMARILLA", "event_data": {"kind": "card", "minute": 33}},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    corregido = r.json()
    assert corregido["event_type"] == "AMARILLA"
    assert corregido["event_data"]["minute"] == 33
    # La mezcla es lo que evita que corregir el minuto borre el equipo.
    assert corregido["event_data"]["team"] == "home"


def test_corregir_el_equipo_del_gol(client, admin, arbitro, fase_jugada):
    """El error más común en cancha: el gol quedó cargado al equipo contrario."""
    headers, _ = arbitro
    mio, _ = _partido_del_arbitro(client, admin, arbitro, fase_jugada)
    ev = _evento(client, headers, mio["id"])

    r = client.put(
        f"{API}/matches/events/{ev['id']}",
        json={"event_data": {"team": "away"}},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["event_data"] == {"team": "away", "kind": "goal", "minute": 10}


def test_quitar_el_jugador_de_un_evento(client, admin, arbitro, equipos, fase_jugada):
    """`player_id: null` explícito sí borra; omitirlo deja lo que había."""
    headers, _ = arbitro
    mio, _ = _partido_del_arbitro(client, admin, arbitro, fase_jugada)
    jugador = client.post(
        f"{API}/teams/{equipos[0]['id']}/players", json={"name": "Ariel"}, headers=admin
    ).json()
    ev = _evento(client, headers, mio["id"], player_id=jugador["id"])

    solo_minuto = client.put(
        f"{API}/matches/events/{ev['id']}",
        json={"event_data": {"minute": 44}},
        headers=headers,
    ).json()
    assert solo_minuto["player_id"] == jugador["id"]

    sin_jugador = client.put(
        f"{API}/matches/events/{ev['id']}", json={"player_id": None}, headers=headers
    ).json()
    assert sin_jugador["player_id"] is None


# --------------------------------------------------------------------------- #
#  Borrar
# --------------------------------------------------------------------------- #
def test_el_arbitro_borra_su_evento(client, admin, arbitro, fase_jugada):
    headers, _ = arbitro
    mio, _ = _partido_del_arbitro(client, admin, arbitro, fase_jugada)
    ev = _evento(client, headers, mio["id"])

    r = client.delete(f"{API}/matches/events/{ev['id']}", headers=headers)
    assert r.status_code == 204
    assert client.get(f"{API}/matches/{mio['id']}/events").json() == []


def test_borrar_un_gol_lo_saca_de_goleadores(
    client, admin, arbitro, torneo, equipos, fase_jugada
):
    """El evento borrado deja de contar donde se agrega: la tabla de goleadores."""
    headers, _ = arbitro
    mio, _ = _partido_del_arbitro(client, admin, arbitro, fase_jugada)
    jugador = client.post(
        f"{API}/teams/{equipos[0]['id']}/players", json={"name": "Ariel"}, headers=admin
    ).json()
    uno = _evento(client, headers, mio["id"], player_id=jugador["id"])
    _evento(client, headers, mio["id"], player_id=jugador["id"])

    def goles():
        stats = client.get(f"{API}/tournaments/{torneo['id']}/player_stats").json()
        return {x["player_name"]: x["goals"] for x in stats}.get("Ariel", 0)

    assert goles() == 2
    client.delete(f"{API}/matches/events/{uno['id']}", headers=headers)
    assert goles() == 1


# --------------------------------------------------------------------------- #
#  Alcance: corregir es dirigir
# --------------------------------------------------------------------------- #
def test_el_arbitro_no_toca_eventos_de_un_partido_ajeno(
    client, admin, arbitro, fase_jugada
):
    headers, _ = arbitro
    _, ajeno = _partido_del_arbitro(client, admin, arbitro, fase_jugada)
    ev = _evento(client, admin, ajeno["id"])

    assert (
        client.put(
            f"{API}/matches/events/{ev['id']}",
            json={"event_type": "ROJA"},
            headers=headers,
        ).status_code
        == 403
    )
    assert client.delete(f"{API}/matches/events/{ev['id']}", headers=headers).status_code == 403


def test_otro_organizador_no_toca_eventos_ajenos(
    client, admin, otro_admin, fase_jugada
):
    partido = client.get(
        f"{API}/tournaments/stages/{fase_jugada['id']}/matches"
    ).json()[0]
    ev = _evento(client, admin, partido["id"])

    assert (
        client.put(
            f"{API}/matches/events/{ev['id']}",
            json={"event_type": "ROJA"},
            headers=otro_admin,
        ).status_code
        == 403
    )
    assert (
        client.delete(f"{API}/matches/events/{ev['id']}", headers=otro_admin).status_code
        == 403
    )


def test_evento_inexistente_da_404(client, admin):
    inexistente = "00000000-0000-0000-0000-000000000000"
    assert (
        client.put(
            f"{API}/matches/events/{inexistente}",
            json={"event_type": "ROJA"},
            headers=admin,
        ).status_code
        == 404
    )
    assert client.delete(f"{API}/matches/events/{inexistente}", headers=admin).status_code == 404


def test_sin_sesion_no_se_corrigen_eventos(client, admin, fase_jugada):
    partido = client.get(
        f"{API}/tournaments/stages/{fase_jugada['id']}/matches"
    ).json()[0]
    ev = _evento(client, admin, partido["id"])

    assert client.put(f"{API}/matches/events/{ev['id']}", json={"event_type": "ROJA"}).status_code == 401
    assert client.delete(f"{API}/matches/events/{ev['id']}").status_code == 401
