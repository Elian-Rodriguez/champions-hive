"""Historial: quién cambió qué y qué decía antes.

El marcador es una columna que se sobrescribe, así que cuando el organizador
dice «alguien me cambió un resultado» no había nada que responderle. Lo que se
fija aquí es que cada cambio que puede terminar en discusión deje constancia
con nombre y con el valor anterior, y que ese historial no lo pueda leer
cualquiera: es del dueño del campeonato, no del árbitro ni del público.
"""
from .conftest import API


def _historial(client, headers, torneo_id, **params):
    r = client.get(
        f"{API}/tournaments/{torneo_id}/audit", headers=headers, params=params
    )
    assert r.status_code == 200, r.text
    return r.json()


def _partidos(client, fase_id):
    return client.get(f"{API}/tournaments/stages/{fase_id}/matches").json()


def _finalizar(client, headers, match_id, local, visita):
    r = client.put(
        f"{API}/matches/{match_id}/status",
        json={"status": "finished", "home_score": local, "away_score": visita},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    return r.json()


# --------------------------------------------------------------------------- #
#  El marcador
# --------------------------------------------------------------------------- #
def test_el_marcador_deja_rastro_con_nombre(client, admin, torneo, fase_jugada):
    partido = _partidos(client, fase_jugada["id"])[0]
    _finalizar(client, admin, partido["id"], 2, 1)

    filas = _historial(client, admin, torneo["id"], match_id=partido["id"])
    marcador = [f for f in filas if f["action"] == "marcador"]
    assert marcador, filas
    ultimo = marcador[0]
    assert ultimo["user_email"]
    assert "2-1" in ultimo["summary"]
    assert ultimo["data"]["local"]["despues"] == 2


def test_guarda_lo_que_el_marcador_decia_antes(client, admin, torneo, fase_jugada):
    """Es la mitad que hace útil el historial: sin el valor anterior no se
    puede saber qué se cambió ni deshacerlo."""
    partido = _partidos(client, fase_jugada["id"])[0]
    _finalizar(client, admin, partido["id"], 2, 1)
    _finalizar(client, admin, partido["id"], 5, 0)

    filas = _historial(client, admin, torneo["id"], match_id=partido["id"])
    ultimo = [f for f in filas if f["action"] == "marcador"][0]
    assert ultimo["data"]["local"] == {"antes": 2, "despues": 5}
    assert "2-1 → 5-0" in ultimo["summary"]


def test_queda_el_arbitro_que_lo_cargo(client, admin, arbitro, torneo, fase_jugada):
    headers, arbitro_id = arbitro
    partido = _partidos(client, fase_jugada["id"])[0]
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    _finalizar(client, headers, partido["id"], 3, 3)

    correo_arbitro = client.get(f"{API}/auth/me", headers=headers).json()["email"]
    filas = _historial(client, admin, torneo["id"], match_id=partido["id"])
    marcador = [f for f in filas if f["action"] == "marcador"][0]
    assert marcador["user_email"] == correo_arbitro
    assert marcador["user_role"] == "referee"


def test_el_wo_y_el_aplazado_quedan_dichos(client, admin, torneo, fase_jugada):
    partido = _partidos(client, fase_jugada["id"])[0]
    client.put(
        f"{API}/matches/{partido['id']}/status",
        json={"status": "finished", "walkover": "away"},
        headers=admin,
    )
    filas = _historial(client, admin, torneo["id"], match_id=partido["id"])
    assert "W.O." in filas[0]["summary"]

    client.put(
        f"{API}/matches/{partido['id']}/status",
        json={"status": "postponed"},
        headers=admin,
    )
    filas = _historial(client, admin, torneo["id"], match_id=partido["id"])
    assert "aplazado" in filas[0]["summary"]


def test_guardar_lo_mismo_no_ensucia_el_historial(client, admin, torneo, fase_jugada):
    partido = _partidos(client, fase_jugada["id"])[0]
    _finalizar(client, admin, partido["id"], 1, 1)
    antes = len(_historial(client, admin, torneo["id"], match_id=partido["id"]))
    _finalizar(client, admin, partido["id"], 1, 1)
    assert len(_historial(client, admin, torneo["id"], match_id=partido["id"])) == antes


# --------------------------------------------------------------------------- #
#  Eventos, planilla y sanciones
# --------------------------------------------------------------------------- #
def test_el_gol_cargado_y_borrado_queda_anotado(client, admin, torneo, fase_jugada):
    partido = _partidos(client, fase_jugada["id"])[0]
    ev = client.post(
        f"{API}/matches/events",
        json={
            "match_id": partido["id"],
            "event_type": "GOL",
            "event_data": {"team": "home", "minute": 12},
        },
        headers=admin,
    ).json()
    filas = _historial(client, admin, torneo["id"], action="evento")
    assert any("Cargó GOL" in f["summary"] for f in filas), filas

    client.delete(f"{API}/matches/events/{ev['id']}", headers=admin)
    filas = _historial(client, admin, torneo["id"], action="evento")
    assert any("Borró GOL" in f["summary"] for f in filas), filas


def test_la_sancion_de_puntos_queda_con_su_motivo(client, admin, torneo, equipos):
    client.put(
        f"{API}/tournaments/{torneo['id']}/teams/{equipos[0]['id']}/points_adjustment",
        json={"points_adjustment": -3, "points_adjustment_reason": "Agresión"},
        headers=admin,
    )
    filas = _historial(client, admin, torneo["id"], action="sancion")
    assert filas
    assert "-3" in filas[0]["summary"] and "Agresión" in filas[0]["summary"]
    assert filas[0]["data"]["despues"] == -3


def test_la_reprogramacion_queda_anotada(client, admin, torneo, cancha, fase_jugada):
    partido = _partidos(client, fase_jugada["id"])[0]
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"scheduled_start": "2027-04-10T15:00:00", "court_id": cancha},
        headers=admin,
    )
    filas = _historial(client, admin, torneo["id"], action="programacion")
    assert filas and "Reprogramó" in filas[0]["summary"]


# --------------------------------------------------------------------------- #
#  Quién puede leerlo
# --------------------------------------------------------------------------- #
def test_otro_organizador_no_ve_el_historial(client, otro_admin, torneo):
    r = client.get(f"{API}/tournaments/{torneo['id']}/audit", headers=otro_admin)
    assert r.status_code == 403, r.text


def test_el_arbitro_no_ve_el_historial(client, arbitro, torneo):
    headers, _ = arbitro
    r = client.get(f"{API}/tournaments/{torneo['id']}/audit", headers=headers)
    assert r.status_code == 403, r.text


def test_el_publico_no_ve_el_historial(client, torneo):
    assert client.get(f"{API}/tournaments/{torneo['id']}/audit").status_code == 401


# --------------------------------------------------------------------------- #
#  Historial de la plataforma (cuentas)
# --------------------------------------------------------------------------- #
def test_el_reseteo_queda_anotado_sin_la_contraseña(client, superadmin, crear_usuario):
    _, user_id = crear_usuario("captain")
    r = client.post(
        f"{API}/auth/users/{user_id}/reset_password", json={}, headers=superadmin
    )
    temporal = r.json()["temp_password"]

    filas = client.get(f"{API}/auth/audit", headers=superadmin).json()
    reseteos = [f for f in filas if "Restableció" in (f["summary"] or "")]
    assert reseteos
    # La contraseña no puede aparecer en el rastro por ningún lado.
    crudo = str(filas)
    assert temporal not in crudo


def test_el_alta_de_cuenta_queda_anotada(client, superadmin, crear_usuario):
    headers, user_id = crear_usuario("referee")
    correo = client.get(f"{API}/auth/me", headers=headers).json()["email"]
    filas = client.get(f"{API}/auth/audit", headers=superadmin).json()
    assert any(correo in (f["summary"] or "") for f in filas)


def test_el_historial_de_plataforma_es_solo_del_superadmin(client, admin):
    assert client.get(f"{API}/auth/audit", headers=admin).status_code == 403


def test_lo_del_torneo_no_se_mezcla_con_lo_de_la_plataforma(
    client, superadmin, admin, torneo, fase_jugada
):
    partido = _partidos(client, fase_jugada["id"])[0]
    _finalizar(client, admin, partido["id"], 4, 0)
    plataforma = client.get(f"{API}/auth/audit", headers=superadmin).json()
    assert all(f["action"] != "marcador" for f in plataforma)
