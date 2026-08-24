"""Corrección de un resultado que ya movió el cuadro.

El cruce «ganador de la semifinal» se resolvía una sola vez: el equipo subía a
la final y la casilla quedaba marcada como resuelta para siempre. Si el árbitro
había cargado el marcador al revés y lo corregía, el finalista seguía siendo el
equipo equivocado y no había forma de arreglarlo desde la aplicación. Lo que se
fija aquí es que el cuadro se recalcule con el resultado que hay ahora, que la
corrección baje por todas las rondas y que un partido que deja de estar
terminado vacíe la casilla que había llenado.
"""
from .conftest import API


def _partidos(client, fase_id):
    return client.get(f"{API}/tournaments/stages/{fase_id}/matches").json()


def _partido(client, fase_id, match_id):
    return next(m for m in _partidos(client, fase_id) if m["id"] == match_id)


def _equipos_de(match):
    return {match["home_team_id"], match["away_team_id"]} - {None}


def _finalizar(client, admin, match_id, local, visitante):
    r = client.put(
        f"{API}/matches/{match_id}/status",
        json={"status": "finished", "home_score": local, "away_score": visitante},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _sembrar(client, admin, torneo, fase_jugada, cruces, third_place=False):
    """Fase eliminatoria sembrada desde los grupos, con los cruces ya resueltos."""
    llave = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Eliminatoria", "type": "knockout"},
        headers=admin,
    ).json()
    r = client.post(
        f"{API}/tournaments/stages/{llave['id']}/seed_bracket",
        json={
            "source_stage_id": fase_jugada["id"],
            "round1": cruces,
            "third_place": third_place,
        },
        headers=admin,
    )
    assert r.status_code == 200, r.text
    client.post(
        f"{API}/tournaments/stages/{llave['id']}/resolve_position_slots",
        headers=admin,
    )
    return llave


def _cuadro_de_dos(client, admin, torneo, fase_jugada, third_place=False):
    """Dos semifinales y una final (más el tercer puesto si se pide)."""
    llave = _sembrar(
        client, admin, torneo, fase_jugada,
        [
            {"home_group": "A", "home_position": 1,
             "away_group": "B", "away_position": 2},
            {"home_group": "B", "home_position": 1,
             "away_group": "A", "away_position": 2},
        ],
        third_place=third_place,
    )
    partidos = _partidos(client, llave["id"])
    semis = [m for m in partidos if m["bracket_round"] == 1]
    finales = [m for m in partidos if m["bracket_round"] == 2]
    assert len(semis) == 2 and len(finales) == (2 if third_place else 1)
    return llave, semis, finales


def test_corregir_el_marcador_cambia_al_finalista(
    client, admin, torneo, fase_jugada
):
    """El caso que estaba roto: el marcador al revés dejaba al equipo que
    perdió jugando la final."""
    llave, semis, (final,) = _cuadro_de_dos(client, admin, torneo, fase_jugada)
    uno, dos = semis
    _finalizar(client, admin, uno["id"], 2, 1)  # gana el local
    _finalizar(client, admin, dos["id"], 3, 0)

    ganadores = {uno["home_team_id"], dos["home_team_id"]}
    assert _equipos_de(_partido(client, llave["id"], final["id"])) == ganadores

    # El árbitro había cargado al revés el primer partido.
    _finalizar(client, admin, uno["id"], 1, 2)
    esperado = {uno["away_team_id"], dos["home_team_id"]}
    assert _equipos_de(_partido(client, llave["id"], final["id"])) == esperado


def test_devolver_el_partido_a_en_vivo_vacia_el_cruce(
    client, admin, torneo, fase_jugada
):
    """Si el partido deja de estar terminado, la final se queda esperando: es
    preferible una casilla vacía a un equipo que no ganó nada."""
    llave, semis, (final,) = _cuadro_de_dos(client, admin, torneo, fase_jugada)
    uno = semis[0]
    _finalizar(client, admin, uno["id"], 2, 1)
    assert len(_equipos_de(_partido(client, llave["id"], final["id"]))) == 1

    r = client.put(
        f"{API}/matches/{uno['id']}/status", json={"status": "live"}, headers=admin
    )
    assert r.status_code == 200, r.text
    assert _equipos_de(_partido(client, llave["id"], final["id"])) == set()


def test_aplazar_un_partido_ya_terminado_tambien_vacia_el_cruce(
    client, admin, torneo, fase_jugada
):
    llave, semis, (final,) = _cuadro_de_dos(client, admin, torneo, fase_jugada)
    uno = semis[0]
    _finalizar(client, admin, uno["id"], 2, 1)
    client.put(
        f"{API}/matches/{uno['id']}/status",
        json={"status": "postponed"},
        headers=admin,
    )
    assert _equipos_de(_partido(client, llave["id"], final["id"])) == set()


def test_la_correccion_baja_por_todo_el_cuadro(client, admin, torneo, fase_jugada):
    """Cambiar un cuarto de final cambia al semifinalista, y con él al finalista."""
    llave = _sembrar(
        client, admin, torneo, fase_jugada,
        [
            {"home_group": "A", "home_position": 1,
             "away_group": "B", "away_position": 4},
            {"home_group": "B", "home_position": 1,
             "away_group": "A", "away_position": 4},
            {"home_group": "A", "home_position": 2,
             "away_group": "B", "away_position": 3},
            {"home_group": "B", "home_position": 2,
             "away_group": "A", "away_position": 3},
        ],
    )
    partidos = _partidos(client, llave["id"])
    cuartos = [m for m in partidos if m["bracket_round"] == 1]
    final = next(m for m in partidos if m["bracket_round"] == 3)
    assert len(cuartos) == 4

    for c in cuartos:
        _finalizar(client, admin, c["id"], 2, 0)  # gana el local en todos
    semis = [m for m in _partidos(client, llave["id"]) if m["bracket_round"] == 2]
    for s in semis:
        _finalizar(client, admin, s["id"], 3, 0)  # y en las semis también

    perdio = cuartos[0]["away_team_id"]
    gano = cuartos[0]["home_team_id"]
    assert gano in _equipos_de(_partido(client, llave["id"], final["id"]))

    # Se corrige el primer cuarto de final: la corrección tiene que llegar
    # hasta la final, dos rondas más abajo.
    _finalizar(client, admin, cuartos[0]["id"], 0, 2)
    equipos_final = _equipos_de(_partido(client, llave["id"], final["id"]))
    assert perdio in equipos_final
    assert gano not in equipos_final


def test_el_tercer_puesto_sigue_al_perdedor(client, admin, torneo, fase_jugada):
    """El cruce «perdedor de» se recalcula igual que el del ganador."""
    llave, semis, finales = _cuadro_de_dos(
        client, admin, torneo, fase_jugada, third_place=True
    )
    uno, dos = semis
    _finalizar(client, admin, uno["id"], 2, 1)
    _finalizar(client, admin, dos["id"], 2, 1)

    ganadores = {uno["home_team_id"], dos["home_team_id"]}
    perdedores = {uno["away_team_id"], dos["away_team_id"]}
    actuales = [_partido(client, llave["id"], f["id"]) for f in finales]
    tercero = next(m for m in actuales if _equipos_de(m) == perdedores)
    assert next(m for m in actuales if _equipos_de(m) == ganadores)

    _finalizar(client, admin, uno["id"], 1, 2)
    esperado = {uno["home_team_id"], dos["away_team_id"]}
    assert _equipos_de(_partido(client, llave["id"], tercero["id"])) == esperado


def test_resolver_cruces_repara_un_cuadro_viejo(client, admin, torneo, fase_jugada):
    """El botón de resolver cruces también corrige lo ya resuelto.

    Es la salida para los torneos que ya quedaron con el cuadro torcido por el
    comportamiento anterior, que aquí se reproduce a mano: un finalista que no
    corresponde al resultado, con su casilla marcada como resuelta.
    """
    from app.db.database import SessionLocal
    from app.db.models import Match, StageSlot

    llave, semis, (final,) = _cuadro_de_dos(client, admin, torneo, fase_jugada)
    uno, dos = semis
    _finalizar(client, admin, uno["id"], 2, 1)
    _finalizar(client, admin, dos["id"], 2, 1)

    intruso = uno["away_team_id"]  # el que perdió la primera semifinal
    db = SessionLocal()
    try:
        partido = db.query(Match).filter(Match.id == final["id"]).first()
        slot = (
            db.query(StageSlot)
            .filter(
                StageSlot.match_id == partido.id,
                StageSlot.source_match_id == uno["id"],
            )
            .first()
        )
        if slot.is_home:
            partido.home_team_id = intruso
        else:
            partido.away_team_id = intruso
        slot.resolved = True
        db.commit()
    finally:
        db.close()
    assert intruso in _equipos_de(_partido(client, llave["id"], final["id"]))

    r = client.post(
        f"{API}/tournaments/stages/{llave['id']}/resolve_position_slots",
        headers=admin,
    )
    assert r.status_code == 200, r.text
    esperado = {uno["home_team_id"], dos["home_team_id"]}
    assert _equipos_de(_partido(client, llave["id"], final["id"])) == esperado
