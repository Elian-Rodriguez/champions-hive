"""Tejo: la disciplina que no se juega por tiempo ni suma de a un gol.

Es la primera disciplina del catálogo donde el marcador no se mueve de a uno:
la mano vale 1, la mecha 3, la embocinada 6 y la moñona 9. Y como la partida
termina cuando alguien llega a 21 y no cuando suena el pito, no hay empate que
repartir ni punto que regalarle al que pierde —que es justo donde el tejo se
separa del baloncesto, que en la FIBA sí le da uno—.

Lo que se fija aquí es eso: que el torneo nace con el reglamento puesto, que
la tabla no reparte empates, que el que no se presenta pierde 21-0, y que el
ranking de anotadores suma PUNTOS y no eventos, porque contar una moñona igual
que una mano es exactamente el error que haría inútil la tabla.
"""
import pytest

from app.services.strategy import (
    StrategyFactory,
    TejoStrategy,
    calculate_standings,
    marcador_walkover,
    puntos_del_evento,
)

from .conftest import API


@pytest.fixture
def cancha_tejo(client, admin):
    v = client.post(f"{API}/venues", json={"name": "Cancha de tejo"}, headers=admin).json()
    c = client.post(
        f"{API}/venues/{v['id']}/courts", json={"name": "Cajón 1"}, headers=admin
    ).json()
    return c["id"]


@pytest.fixture
def liga_tejo(client, admin, cancha_tejo):
    """Cuatro equipos de tejo con jugadores, fase y fixture generado."""
    torneo = client.post(
        f"{API}/tournaments",
        json={"name": "Copa Bocín", "sport_type": "tejo"},
        headers=admin,
    ).json()
    equipos = []
    for i in range(4):
        e = client.post(
            f"{API}/tournaments/{torneo['id']}/teams",
            json={"name": f"Cancha {i}"},
            headers=admin,
        ).json()
        e["players"] = [
            client.post(
                f"{API}/teams/{e['id']}/players",
                json={"name": f"Tejero {i}-{j}", "number": j + 1},
                headers=admin,
            ).json()
            for j in range(2)
        ]
        equipos.append(e)
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Liga", "type": "league"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    return {"torneo": torneo, "equipos": equipos, "fase": fase, "partidos": partidos}


def _tabla(client, torneo_id):
    r = client.get(f"{API}/tournaments/{torneo_id}/team_stats")
    assert r.status_code == 200, r.text
    return {fila["team_id"]: fila for fila in r.json()}


def _anotar(client, headers, match, player, tipo, lado="home"):
    r = client.post(
        f"{API}/matches/events",
        json={
            "match_id": match["id"],
            "player_id": player["id"],
            "event_type": tipo,
            "event_data": {"team": lado, "kind": "goal", "minute": 5},
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


# --------------------------------------------------------------------------- #
#  El reglamento de la disciplina
# --------------------------------------------------------------------------- #
def test_el_torneo_de_tejo_nace_con_su_reglamento(client, admin):
    """Sin que el organizador escriba nada: 2 puntos por ganar, 0 por perder."""
    r = client.post(
        f"{API}/tournaments",
        json={"name": "Copa Mecha", "sport_type": "tejo"},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    t = r.json()
    assert t["sport_type"] == "tejo"
    assert t["points_config"] == {"win": 2, "loss": 0}
    assert t["match_duration"] == 45
    assert t["waiting_time"] == 10


def test_lo_que_el_organizador_manda_le_gana_al_reglamento(client, admin):
    """Los valores por defecto solo rellenan lo que no viene en la petición."""
    t = client.post(
        f"{API}/tournaments",
        json={
            "name": "Copa Propia",
            "sport_type": "tejo",
            "points_config": {"win": 3, "loss": 1},
        },
        headers=admin,
    ).json()
    assert t["points_config"] == {"win": 3, "loss": 1}


def test_en_tejo_no_hay_empate_que_repartir():
    """La partida se juega a 21: siempre hay un ganador y el otro no suma."""
    estrategia = StrategyFactory.get_strategy("tejo")
    assert isinstance(estrategia, TejoStrategy)
    assert estrategia.calculate_points(21, 18, {}) == (2, 0)
    assert estrategia.calculate_points(15, 21, {}) == (0, 2)
    # Y el que pierde no suma, a diferencia del baloncesto, que en la FIBA da 1.
    assert estrategia.puntos_por_derrota({}) == 0
    assert StrategyFactory.get_strategy("basketball").puntos_por_derrota({}) == 1


def test_la_derrota_no_suma_en_la_tabla(client, admin, liga_tejo):
    """Dos partidas ganadas son 4 puntos; perder no acerca a nadie a nada."""
    partidos = liga_tejo["partidos"]
    for m in partidos:
        client.put(
            f"{API}/matches/{m['id']}/status",
            json={"status": "finished", "home_score": 21, "away_score": 13},
            headers=admin,
        )
    tabla = _tabla(client, liga_tejo["torneo"]["id"])
    for fila in tabla.values():
        assert fila["draws"] == 0
        assert fila["league_points"] == fila["wins"] * 2
        assert fila["losses"] * 0 == 0  # perder no suma nada


# --------------------------------------------------------------------------- #
#  El que no se presenta
# --------------------------------------------------------------------------- #
def test_el_wo_de_tejo_es_21_0(client, admin, liga_tejo):
    """El marcador del que no llegó lo pone el reglamento de la disciplina."""
    assert marcador_walkover("tejo", "away") == (21, 0)
    assert marcador_walkover("tejo", "home") == (0, 21)
    m = liga_tejo["partidos"][0]
    r = client.put(
        f"{API}/matches/{m['id']}/status",
        json={"status": "finished", "walkover": "away"},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    assert (r.json()["home_score"], r.json()["away_score"]) == (21, 0)


def test_el_doble_wo_es_derrota_de_los_dos(client, admin, liga_tejo):
    """0-0 sería empate, y un empate le daría puntos a quien no apareció."""
    m = liga_tejo["partidos"][0]
    r = client.put(
        f"{API}/matches/{m['id']}/status",
        json={"status": "finished", "walkover": "both"},
        headers=admin,
    )
    assert (r.json()["home_score"], r.json()["away_score"]) == (0, 0)
    tabla = _tabla(client, liga_tejo["torneo"]["id"])
    for lado in ("home_team_id", "away_team_id"):
        fila = tabla[m[lado]]
        assert fila["losses"] == 1
        assert fila["draws"] == 0
        assert fila["league_points"] == 0


# --------------------------------------------------------------------------- #
#  Las jugadas valen distinto
# --------------------------------------------------------------------------- #
def test_cada_jugada_vale_lo_suyo():
    assert puntos_del_evento("MANO") == 1
    assert puntos_del_evento("MECHA") == 3
    assert puntos_del_evento("EMBOCINADA") == 6
    assert puntos_del_evento("MOÑONA") == 9
    # El gol de siempre sigue valiendo 1, y una tarjeta no anota nada.
    assert puntos_del_evento("GOL") == 1
    assert puntos_del_evento("AMARILLA") == 0
    assert puntos_del_evento(None) == 0


def test_el_ranking_suma_puntos_y_no_jugadas(client, admin, liga_tejo):
    """Contar una moñona igual que una mano es lo que haría inútil la tabla."""
    m = liga_tejo["partidos"][0]
    local = next(e for e in liga_tejo["equipos"] if e["id"] == m["home_team_id"])
    figura, segundo = local["players"][0], local["players"][1]
    _anotar(client, admin, m, figura, "MOÑONA")  # 9
    _anotar(client, admin, m, figura, "MECHA")  # 3
    _anotar(client, admin, m, segundo, "MANO")  # 1
    _anotar(client, admin, m, segundo, "EMBOCINADA")  # 6
    client.put(
        f"{API}/matches/{m['id']}/status",
        json={"status": "finished", "home_score": 19, "away_score": 12},
        headers=admin,
    )
    stats = {
        f["player_id"]: f
        for f in client.get(
            f"{API}/tournaments/{liga_tejo['torneo']['id']}/player_stats"
        ).json()
    }
    assert stats[figura["id"]]["goals"] == 12
    assert stats[segundo["id"]]["goals"] == 7
    # Y el ranking los ordena por puntos, no por cuántas veces tiraron.
    orden = [f["player_id"] for f in client.get(
        f"{API}/tournaments/{liga_tejo['torneo']['id']}/player_stats"
    ).json()]
    assert orden[0] == figura["id"]


def test_la_falta_de_linea_no_anota(client, admin, liga_tejo):
    """En tejo no hay tarjetas: lo que se anota es la falta, y no suma puntos."""
    m = liga_tejo["partidos"][0]
    local = next(e for e in liga_tejo["equipos"] if e["id"] == m["home_team_id"])
    jugador = local["players"][0]
    r = client.post(
        f"{API}/matches/events",
        json={
            "match_id": m["id"],
            "player_id": jugador["id"],
            "event_type": "FALTA",
            "event_data": {"team": "home", "kind": "card", "minute": 8},
        },
        headers=admin,
    )
    assert r.status_code == 201, r.text
    client.put(
        f"{API}/matches/{m['id']}/status",
        json={"status": "finished", "home_score": 21, "away_score": 9},
        headers=admin,
    )
    fila = next(
        f
        for f in client.get(
            f"{API}/tournaments/{liga_tejo['torneo']['id']}/player_stats"
        ).json()
        if f["player_id"] == jugador["id"]
    )
    assert fila["goals"] == 0
    assert fila["fouls"] == 1


def test_la_falta_no_suspende_a_nadie(client, admin, liga_tejo):
    """Con el reglamento disciplinario encendido, la falta no acumula fechas:
    el tejo no lleva tarjetas y suspender por una falta de línea sería
    inventarle un reglamento a la disciplina."""
    torneo_id = liga_tejo["torneo"]["id"]
    client.put(
        f"{API}/tournaments/{torneo_id}",
        json={"discipline_config": {"enabled": True, "yellow_limit": 1}},
        headers=admin,
    )
    m = liga_tejo["partidos"][0]
    local = next(e for e in liga_tejo["equipos"] if e["id"] == m["home_team_id"])
    for _ in range(3):
        client.post(
            f"{API}/matches/events",
            json={
                "match_id": m["id"],
                "player_id": local["players"][0]["id"],
                "event_type": "FALTA",
                "event_data": {"team": "home", "kind": "card"},
            },
            headers=admin,
        )
    client.put(
        f"{API}/matches/{m['id']}/status",
        json={"status": "finished", "home_score": 21, "away_score": 5},
        headers=admin,
    )
    d = client.get(f"{API}/tournaments/{torneo_id}/discipline", headers=admin).json()
    assert d["sanctions"] == []
    assert d["at_risk"] == []


def test_la_tabla_del_tejo_se_calcula_con_su_estrategia():
    """Sin pasar por la API: la misma lista de partidos, otro reglamento."""
    partidos = [
        {
            "home_team_id": "a",
            "away_team_id": "b",
            "home_score": 21,
            "away_score": 20,
            "status": "finished",
        }
    ]
    tejo = {f["team_id"]: f for f in calculate_standings(partidos, "tejo")}
    cesta = {f["team_id"]: f for f in calculate_standings(partidos, "basketball")}
    assert (tejo["a"]["league_points"], tejo["b"]["league_points"]) == (2, 0)
    assert (cesta["a"]["league_points"], cesta["b"]["league_points"]) == (2, 1)
