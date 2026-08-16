"""Estadísticas: filtro por fase, ranking de valla y puntuación por disciplina."""
import pytest

from app.services.strategy import SPORT_DEFAULTS, StrategyFactory, calculate_standings

from .conftest import API


# --------------------------------------------------------------------------- #
#  Filtro "cuentan desde"
# --------------------------------------------------------------------------- #
@pytest.fixture
def dos_fases_con_goles(client, admin, torneo, equipos):
    """Grupos con goles del jugador A y una segunda fase con goles del B."""
    tid = torneo["id"]
    a = client.post(
        f"{API}/teams/{equipos[0]['id']}/players", json={"name": "Ariel"}, headers=admin
    ).json()
    b = client.post(
        f"{API}/teams/{equipos[1]['id']}/players", json={"name": "Bruno"}, headers=admin
    ).json()

    fases = {}
    for nombre, jugador, goles in (("Grupos", a, 4), ("Final", b, 1)):
        fase = client.post(
            f"{API}/tournaments/{tid}/stages",
            json={"name": nombre, "type": "group"},
            headers=admin,
        ).json()
        client.post(
            f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin
        )
        m = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()[0]
        client.put(
            f"{API}/matches/{m['id']}/status",
            json={"status": "finished", "home_score": goles, "away_score": 0},
            headers=admin,
        )
        for _ in range(goles):
            client.post(
                f"{API}/matches/events",
                json={
                    "match_id": m["id"],
                    "event_type": "GOL",
                    "player_id": jugador["id"],
                    "event_data": {"team": "home"},
                },
                headers=admin,
            )
        fases[nombre] = fase
    return fases


def _goleadores(client, tid, **params):
    r = client.get(f"{API}/tournaments/{tid}/player_stats", params=params)
    assert r.status_code == 200
    return {x["player_name"]: x["goals"] for x in r.json()}


def test_sin_filtro_cuenta_todo_el_torneo(client, torneo, dos_fases_con_goles):
    assert _goleadores(client, torneo["id"]) == {"Ariel": 4, "Bruno": 1}


def test_solo_esa_fase(client, torneo, dos_fases_con_goles):
    grupos = dos_fases_con_goles["Grupos"]["id"]
    assert _goleadores(client, torneo["id"], stage_id=grupos, mode="only") == {"Ariel": 4}


def test_desde_esa_fase_en_adelante(client, torneo, dos_fases_con_goles):
    final = dos_fases_con_goles["Final"]["id"]
    assert _goleadores(client, torneo["id"], stage_id=final, mode="from") == {"Bruno": 1}


def test_fase_inexistente_da_404(client, torneo):
    r = client.get(
        f"{API}/tournaments/{torneo['id']}/player_stats",
        params={"stage_id": "00000000-0000-0000-0000-000000000000"},
    )
    assert r.status_code == 404


# --------------------------------------------------------------------------- #
#  Valla menos vencida
# --------------------------------------------------------------------------- #
def test_valla_es_un_ranking(client, torneo, fase_jugada):
    filas = client.get(f"{API}/tournaments/{torneo['id']}/valla").json()
    assert filas
    assert [f["position"] for f in filas] == list(range(1, len(filas) + 1))
    recibidos = [f["conceded"] for f in filas]
    assert recibidos == sorted(recibidos), "ordena por menos goles en contra"


def test_valla_trae_promedio_y_vallas_invictas(client, torneo, fase_jugada):
    fila = client.get(f"{API}/tournaments/{torneo['id']}/valla").json()[0]
    assert "conceded_avg" in fila and "clean_sheets" in fila
    assert fila["clean_sheets"] <= fila["matches_played"]


def test_valla_acepta_filtro_de_fase(client, torneo, fase_jugada):
    r = client.get(
        f"{API}/tournaments/{torneo['id']}/valla",
        params={"stage_id": fase_jugada["id"], "mode": "only"},
    )
    assert r.status_code == 200


# --------------------------------------------------------------------------- #
#  Puntuación por disciplina
# --------------------------------------------------------------------------- #
def test_banquitas_puntua_como_futbol():
    assert StrategyFactory.get_strategy("banquitas").calculate_points(2, 2, {}) == (1, 1)
    assert StrategyFactory.get_strategy("banquitas").calculate_points(3, 1, {}) == (3, 0)


def test_baloncesto_no_tiene_empate():
    local, visita = StrategyFactory.get_strategy("basketball").calculate_points(80, 80, {})
    assert (local, visita) == (2, 1)


def test_deporte_desconocido_falla():
    with pytest.raises(ValueError):
        StrategyFactory.get_strategy("ajedrez")


def test_banquitas_trae_partidos_cortos(client, torneo):
    assert SPORT_DEFAULTS["banquitas"]["match_duration"] == 20
    assert torneo["match_duration"] == 20
    assert torneo["points_config"] == {"win": 3, "draw": 1, "loss": 0}


def test_la_tarjeta_azul_pesa_el_doble_en_fair_play():
    partidos = [
        {
            "home_team_id": "A",
            "away_team_id": "B",
            "home_team_name": "A",
            "away_team_name": "B",
            "home_score": 1,
            "away_score": 0,
            "events": [
                {"event_type": "AMARILLA", "event_data": {"team": "home"}},
                {"event_type": "AZUL", "event_data": {"team": "away"}},
            ],
        }
    ]
    tabla = {r["team_id"]: r for r in calculate_standings(partidos, "banquitas")}
    assert tabla["A"]["fair_play_penalty"] == 1
    assert tabla["B"]["fair_play_penalty"] == 2
