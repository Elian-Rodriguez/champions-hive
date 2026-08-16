"""Fases: orden, edición, equipos por fase e ida y vuelta."""
from .conftest import API


def _crear_fase(client, admin, tid, nombre, tipo="group", config=None):
    r = client.post(
        f"{API}/tournaments/{tid}/stages",
        json={"name": nombre, "type": tipo, "config": config},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_las_fases_se_crean_al_final(client, admin, torneo):
    tid = torneo["id"]
    a = _crear_fase(client, admin, tid, "Grupos")
    b = _crear_fase(client, admin, tid, "Semis", "knockout")
    assert [a["order_index"], b["order_index"]] == [0, 1]


def test_reordenar_fases(client, admin, torneo):
    tid = torneo["id"]
    a = _crear_fase(client, admin, tid, "Grupos")
    b = _crear_fase(client, admin, tid, "Semis", "knockout")
    c = _crear_fase(client, admin, tid, "Final", "knockout")
    r = client.post(
        f"{API}/tournaments/{tid}/stages/reorder",
        json={"stage_ids": [c["id"], a["id"], b["id"]]},
        headers=admin,
    )
    assert r.status_code == 200
    assert [s["name"] for s in r.json()] == ["Final", "Grupos", "Semis"]


def test_reorder_rechaza_fases_de_otro_torneo(client, admin, torneo):
    r = client.post(
        f"{API}/tournaments/{torneo['id']}/stages/reorder",
        json={"stage_ids": ["00000000-0000-0000-0000-000000000000"]},
        headers=admin,
    )
    assert r.status_code == 400


def test_renombrar_fase(client, admin, torneo):
    fase = _crear_fase(client, admin, torneo["id"], "Grupos")
    r = client.put(
        f"{API}/tournaments/stages/{fase['id']}", json={"name": "Fase 1"}, headers=admin
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Fase 1"


def test_no_se_cambia_el_tipo_con_partidos_jugados(client, admin, fase_jugada):
    """Cambiar el tipo invalidaría los partidos ya disputados."""
    r = client.put(
        f"{API}/tournaments/stages/{fase_jugada['id']}",
        json={"type": "swiss"},
        headers=admin,
    )
    assert r.status_code == 400


def test_fixture_ida_y_vuelta(client, admin, torneo, equipos):
    tid = torneo["id"]
    ida = _crear_fase(client, admin, tid, "Ida")
    client.post(f"{API}/tournaments/stages/{ida['id']}/generate_fixture", headers=admin)
    simple = len(client.get(f"{API}/tournaments/stages/{ida['id']}/matches").json())

    client.put(
        f"{API}/tournaments/stages/{ida['id']}",
        json={"config": {"double_round": True}},
        headers=admin,
    )
    client.post(f"{API}/tournaments/stages/{ida['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{ida['id']}/matches").json()
    assert len(partidos) == simple * 2

    pares = [(m["home_team_id"], m["away_team_id"]) for m in partidos]
    assert all((b, a) in pares for a, b in pares), "cada cruce debe tener su revancha"


def test_equipos_por_fase(client, admin, torneo, equipos):
    """Si la fase define team_ids, el fixture ignora al resto del torneo."""
    subconjunto = [e["id"] for e in equipos[:6]]
    fase = _crear_fase(
        client, admin, torneo["id"], "Segunda", config={"team_ids": subconjunto}
    )
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    jugando = {m["home_team_id"] for m in partidos} | {m["away_team_id"] for m in partidos}
    assert jugando <= set(subconjunto)


def test_no_se_regenera_el_fixture_con_partidos_jugados(client, admin, fase_jugada):
    r = client.post(
        f"{API}/tournaments/stages/{fase_jugada['id']}/generate_fixture", headers=admin
    )
    assert r.status_code == 400
