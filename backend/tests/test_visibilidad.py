"""Interruptores de publicación del marcador público.

Regla: si el organizador no dice nada, todo es público (los torneos que ya
existían no deben perder nada al actualizar).
"""
from .conftest import API


def _ocultar(client, admin, tid, **flags):
    r = client.put(f"{API}/tournaments/{tid}", json={"visibility": flags}, headers=admin)
    assert r.status_code == 200, r.text
    return r.json()


def test_por_defecto_todo_es_publico(client, torneo, equipos):
    tid = torneo["id"]
    assert client.get(f"{API}/tournaments/{tid}/fairplay").status_code == 200
    assert client.get(f"{API}/tournaments/{tid}/metrics").status_code == 200
    assert client.get(f"{API}/teams/{equipos[0]['id']}/players").status_code == 200


def test_sanciones_ocultas(client, admin, torneo):
    tid = torneo["id"]
    _ocultar(client, admin, tid, sanciones=False)
    assert client.get(f"{API}/tournaments/{tid}/fairplay").status_code == 403
    assert client.get(f"{API}/tournaments/{tid}/fairplay", headers=admin).status_code == 200


def test_metricas_ocultas(client, admin, torneo):
    tid = torneo["id"]
    _ocultar(client, admin, tid, metricas=False)
    assert client.get(f"{API}/tournaments/{tid}/metrics").status_code == 403
    assert client.get(f"{API}/tournaments/{tid}/metrics", headers=admin).status_code == 200


def test_nominas_ocultas(client, admin, torneo, equipos):
    _ocultar(client, admin, torneo["id"], nominas=False)
    equipo = equipos[0]["id"]
    assert client.get(f"{API}/teams/{equipo}/players").status_code == 403
    assert client.get(f"{API}/teams/{equipo}/players", headers=admin).status_code == 200


def test_superadmin_ve_lo_oculto(client, admin, superadmin, torneo):
    tid = torneo["id"]
    _ocultar(client, admin, tid, sanciones=False, metricas=False)
    assert client.get(f"{API}/tournaments/{tid}/fairplay", headers=superadmin).status_code == 200
    assert client.get(f"{API}/tournaments/{tid}/metrics", headers=superadmin).status_code == 200


def test_otro_admin_no_ve_lo_oculto(client, admin, otro_admin, torneo):
    tid = torneo["id"]
    _ocultar(client, admin, tid, sanciones=False)
    assert client.get(f"{API}/tournaments/{tid}/fairplay", headers=otro_admin).status_code == 403


def test_lo_siempre_publico_no_se_puede_ocultar(client, admin, torneo, fase_jugada):
    """Posiciones, goleadores y valla son públicos por diseño."""
    tid = torneo["id"]
    _ocultar(client, admin, tid, sanciones=False, nominas=False, metricas=False)
    assert client.get(f"{API}/tournaments/{tid}/player_stats").status_code == 200
    assert client.get(f"{API}/tournaments/{tid}/team_stats").status_code == 200
    assert client.get(f"{API}/tournaments/{tid}/valla").status_code == 200
    assert client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/standings_by_group").status_code == 200
