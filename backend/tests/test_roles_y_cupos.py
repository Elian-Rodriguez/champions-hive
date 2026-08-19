"""Cupo de campeonatos, gestión de cuentas, panel del capitán y avisos.

Son las reglas que hacen vendible la plataforma: el superadministrador reparte
cupo y da soporte, el organizador no ve nada de otro organizador, y el capitán
solo alcanza lo de su equipo. Todo lo que se afloje aquí se afloja en producción.
"""
import uuid
from datetime import datetime, timedelta

import pytest

from .conftest import API


def _login(client, email, password):
    r = client.post(f"{API}/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def equipo_con_capitan(client, admin, torneo):
    """Un equipo del torneo con su capitán dado de alta por el organizador."""
    equipo = client.post(
        f"{API}/tournaments/{torneo['id']}/teams",
        json={"name": "Equipo del capitán"},
        headers=admin,
    ).json()
    email = f"cap-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        f"{API}/teams/{equipo['id']}/managers",
        json={"email": email, "name": "Capitán Test"},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    manager = r.json()
    sesion = _login(client, email, manager["temp_password"])
    return {
        "team": equipo,
        "email": email,
        "password": manager["temp_password"],
        "headers": _headers(sesion["access_token"]),
        "manager": manager,
    }


# --------------------------------------------------------------------------- #
#  Cupo de campeonatos por organizador
# --------------------------------------------------------------------------- #
def test_el_cupo_limita_cuantos_campeonatos_crea_el_organizador(client, superadmin):
    email = f"cupo-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        f"{API}/auth/register",
        json={"email": email, "password": "secret1", "role": "admin", "max_tournaments": 1},
        headers=superadmin,
    )
    assert r.status_code == 201, r.text
    assert r.json()["max_tournaments"] == 1
    organizador = _headers(_login(client, email, "secret1")["access_token"])

    primero = client.post(
        f"{API}/tournaments",
        json={"name": "Copa 1", "sport_type": "micro"},
        headers=organizador,
    )
    assert primero.status_code == 201
    segundo = client.post(
        f"{API}/tournaments",
        json={"name": "Copa 2", "sport_type": "micro"},
        headers=organizador,
    )
    assert segundo.status_code == 403
    assert "límite" in segundo.json()["detail"]


def test_sin_cupo_asignado_no_hay_limite(client, admin):
    """Las cuentas existentes (max_tournaments NULL) siguen sin tope."""
    for i in range(3):
        r = client.post(
            f"{API}/tournaments",
            json={"name": f"Sin tope {i}", "sport_type": "football"},
            headers=admin,
        )
        assert r.status_code == 201


def test_el_perfil_reporta_cupo_y_uso(client, superadmin):
    email = f"perfil-{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        f"{API}/auth/register",
        json={"email": email, "password": "secret1", "role": "admin", "max_tournaments": 5},
        headers=superadmin,
    )
    org = _headers(_login(client, email, "secret1")["access_token"])
    client.post(
        f"{API}/tournaments", json={"name": "Uno", "sport_type": "micro"}, headers=org
    )
    me = client.get(f"{API}/auth/me", headers=org).json()
    assert me["max_tournaments"] == 5
    assert me["tournaments_count"] == 1


def test_el_organizador_no_se_amplia_el_cupo(client, crear_usuario):
    organizador, uid = crear_usuario("admin")
    r = client.put(
        f"{API}/auth/users/{uid}", json={"max_tournaments": 99}, headers=organizador
    )
    assert r.status_code == 403


def test_el_organizador_no_se_asciende_de_rol(client, crear_usuario):
    organizador, uid = crear_usuario("admin")
    r = client.put(
        f"{API}/auth/users/{uid}", json={"role": "superadmin"}, headers=organizador
    )
    assert r.status_code == 403


# --------------------------------------------------------------------------- #
#  Contraseñas: cambio propio y reseteo de soporte
# --------------------------------------------------------------------------- #
def test_reset_devuelve_clave_temporal_y_obliga_a_cambiarla(
    client, superadmin, crear_usuario
):
    _, uid = crear_usuario("referee")
    r = client.post(f"{API}/auth/users/{uid}/reset_password", json={}, headers=superadmin)
    assert r.status_code == 200, r.text
    temporal = r.json()["temp_password"]
    assert len(temporal) >= 6

    sesion = _login(client, r.json()["email"], temporal)
    assert sesion["must_change_password"] is True

    cambio = client.post(
        f"{API}/auth/change_password",
        json={"current_password": temporal, "new_password": "nuevaclave"},
        headers=_headers(sesion["access_token"]),
    )
    assert cambio.status_code == 200
    assert _login(client, r.json()["email"], "nuevaclave")["must_change_password"] is False


def test_el_superadmin_puede_fijar_la_clave_del_reset(client, superadmin, crear_usuario):
    _, uid = crear_usuario("captain")
    r = client.post(
        f"{API}/auth/users/{uid}/reset_password",
        json={"new_password": "soporte123"},
        headers=superadmin,
    )
    assert r.status_code == 200
    assert r.json()["temp_password"] == "soporte123"


def test_un_organizador_no_resetea_la_cuenta_de_otro(client, crear_usuario):
    """El reseteo es soporte: solo del superadmin o del dueño de la cuenta."""
    admin_a, _ = crear_usuario("admin")
    _, id_b = crear_usuario("admin")
    r = client.post(f"{API}/auth/users/{id_b}/reset_password", json={}, headers=admin_a)
    assert r.status_code == 403


def test_el_organizador_si_resetea_a_su_capitan(client, admin, equipo_con_capitan):
    uid = equipo_con_capitan["manager"]["user_id"]
    r = client.post(f"{API}/auth/users/{uid}/reset_password", json={}, headers=admin)
    assert r.status_code == 200
    assert _login(client, equipo_con_capitan["email"], r.json()["temp_password"])


def test_la_cuenta_desactivada_no_inicia_sesion(client, superadmin, crear_usuario):
    _, uid = crear_usuario("captain")
    email = client.get(f"{API}/auth/users", headers=superadmin).json()
    email = next(u["email"] for u in email if u["id"] == uid)
    assert (
        client.put(
            f"{API}/auth/users/{uid}", json={"is_active": False}, headers=superadmin
        ).status_code
        == 200
    )
    r = client.post(f"{API}/auth/login", data={"username": email, "password": "secret1"})
    assert r.status_code == 403


def test_no_se_borra_el_ultimo_superadministrador(client, superadmin):
    usuarios = client.get(f"{API}/auth/users", headers=superadmin).json()
    supers = [u for u in usuarios if u["role"] == "superadmin"]
    if len(supers) == 1:
        r = client.delete(f"{API}/auth/users/{supers[0]['id']}", headers=superadmin)
        # Es su propia cuenta: se rechaza antes por eso.
        assert r.status_code == 400


# --------------------------------------------------------------------------- #
#  Capitanes: alta desde el equipo y alcance de lo que ven
# --------------------------------------------------------------------------- #
def test_el_organizador_da_de_alta_al_capitan_de_su_equipo(client, equipo_con_capitan):
    assert equipo_con_capitan["manager"]["role"] == "captain"
    assert equipo_con_capitan["manager"]["temp_password"]


def test_otro_organizador_no_pone_capitanes_en_equipos_ajenos(
    client, otro_admin, equipo_con_capitan
):
    r = client.post(
        f"{API}/teams/{equipo_con_capitan['team']['id']}/managers",
        json={"email": "intruso@example.com"},
        headers=otro_admin,
    )
    assert r.status_code == 403


def test_el_capitan_ve_su_equipo_y_solo_el_suyo(
    client, admin, torneo, equipo_con_capitan
):
    equipos = client.get(f"{API}/captain/teams", headers=equipo_con_capitan["headers"]).json()
    assert len(equipos) == 1
    assert equipos[0]["team_id"] == equipo_con_capitan["team"]["id"]
    assert equipos[0]["tournament_id"] == torneo["id"]

    ajeno = client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Ajeno"}, headers=admin
    ).json()
    r = client.get(
        f"{API}/captain/teams/{ajeno['id']}/summary",
        headers=equipo_con_capitan["headers"],
    )
    assert r.status_code == 403


def test_el_panel_del_capitan_no_es_del_arbitro(client, arbitro):
    """El árbitro tiene su propio panel; el del capitán no es suyo."""
    headers, _ = arbitro
    assert client.get(f"{API}/captain/teams", headers=headers).status_code == 403
    assert client.get(f"{API}/captain/matches", headers=headers).status_code == 403


def test_el_capitan_no_administra_nada(client, torneo, equipo_con_capitan):
    cap = equipo_con_capitan["headers"]
    assert (
        client.post(
            f"{API}/tournaments", json={"name": "Mío", "sport_type": "micro"}, headers=cap
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"{API}/tournaments/{torneo['id']}/teams", json={"name": "X"}, headers=cap
        ).status_code
        == 403
    )
    assert client.get(f"{API}/auth/users", headers=cap).status_code == 403


def test_el_resumen_trae_record_y_posicion(client, admin, superadmin, torneo):
    """El capitán ve cómo va su equipo, no solo el calendario."""
    locales = client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Local FC"}, headers=admin
    ).json()
    visitante = client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Visita FC"}, headers=admin
    ).json()
    for e in (locales, visitante):
        client.put(
            f"{API}/tournaments/{torneo['id']}/teams/{e['id']}/group",
            json={"group_name": "A"},
            headers=admin,
        )
    email = f"cap-{uuid.uuid4().hex[:8]}@example.com"
    manager = client.post(
        f"{API}/teams/{locales['id']}/managers", json={"email": email}, headers=admin
    ).json()
    cap = _headers(_login(client, email, manager["temp_password"])["access_token"])

    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Grupos", "type": "group"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    mio = next(
        m
        for m in partidos
        if locales["id"] in (m["home_team_id"], m["away_team_id"])
    )
    es_local = mio["home_team_id"] == locales["id"]
    client.put(
        f"{API}/matches/{mio['id']}/status",
        json={
            "status": "finished",
            "home_score": 3 if es_local else 0,
            "away_score": 0 if es_local else 3,
        },
        headers=admin,
    )

    resumen = client.get(f"{API}/captain/teams/{locales['id']}/summary", headers=cap)
    assert resumen.status_code == 200, resumen.text
    data = resumen.json()
    assert data["record"]["played"] == 1
    assert data["record"]["wins"] == 1
    assert data["record"]["goals_for"] == 3
    assert data["record"]["form"] == ["G"]
    assert any(p["group_name"] == "A" and p["position"] >= 1 for p in data["standings"])


# --------------------------------------------------------------------------- #
#  Notificaciones de reprogramación
# --------------------------------------------------------------------------- #
def _partido_del_equipo(client, admin, torneo, team_id):
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Fase avisos", "type": "league"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    return next(
        m for m in partidos if team_id in (m["home_team_id"], m["away_team_id"])
    )


def test_reprogramar_un_partido_avisa_a_los_capitanes(
    client, admin, torneo, cancha, equipo_con_capitan
):
    client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Rival FC"}, headers=admin
    )
    partido = _partido_del_equipo(
        client, admin, torneo, equipo_con_capitan["team"]["id"]
    )
    cap = equipo_con_capitan["headers"]

    # Primera programación: es "ya hay calendario", no un aplazamiento.
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"scheduled_start": "2026-04-11T15:00:00", "court_id": cancha},
        headers=admin,
    )
    avisos = client.get(f"{API}/notifications", headers=cap).json()
    assert avisos and avisos[0]["type"] == "partido_programado"

    # Se corre una semana: aviso de reprogramación con el antes y el después.
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"scheduled_start": "2026-04-18T17:00:00"},
        headers=admin,
    )
    avisos = client.get(f"{API}/notifications", headers=cap).json()
    assert avisos[0]["type"] == "partido_reprogramado"
    assert "aplazado" in avisos[0]["title"]
    assert avisos[0]["data"]["antes"]["fecha"]
    assert avisos[0]["data"]["ahora"]["fecha"]


def test_cambiar_solo_la_cancha_avisa_el_cambio_de_cancha(
    client, admin, torneo, cancha, equipo_con_capitan
):
    client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Rival 2"}, headers=admin
    )
    partido = _partido_del_equipo(
        client, admin, torneo, equipo_con_capitan["team"]["id"]
    )
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"scheduled_start": "2026-05-02T10:00:00", "court_id": cancha},
        headers=admin,
    )
    otra = client.post(
        f"{API}/venues/{client.post(f'{API}/venues', json={'name': 'Sede 2'}, headers=admin).json()['id']}/courts",
        json={"name": "Cancha B"},
        headers=admin,
    ).json()
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"court_id": otra["id"]},
        headers=admin,
    )
    avisos = client.get(f"{API}/notifications", headers=equipo_con_capitan["headers"]).json()
    assert avisos[0]["type"] == "partido_cancha"
    assert "Cancha B" in avisos[0]["body"]


def test_el_marcador_final_le_llega_al_capitan(
    client, admin, torneo, equipo_con_capitan
):
    client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Rival 3"}, headers=admin
    )
    partido = _partido_del_equipo(
        client, admin, torneo, equipo_con_capitan["team"]["id"]
    )
    client.put(
        f"{API}/matches/{partido['id']}/status",
        json={"status": "finished", "home_score": 2, "away_score": 1},
        headers=admin,
    )
    avisos = client.get(f"{API}/notifications", headers=equipo_con_capitan["headers"]).json()
    assert avisos[0]["type"] == "partido_resultado"
    assert "2 - 1" in avisos[0]["title"]


def test_los_avisos_son_de_cada_capitan(client, admin, torneo, cancha, crear_usuario):
    """El capitán de un equipo no ve los avisos del equipo de otro torneo."""
    otro = client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Sin avisos"}, headers=admin
    ).json()
    email = f"cap-{uuid.uuid4().hex[:8]}@example.com"
    manager = client.post(
        f"{API}/teams/{otro['id']}/managers", json={"email": email}, headers=admin
    ).json()
    solitario = _headers(_login(client, email, manager["temp_password"])["access_token"])
    assert client.get(f"{API}/notifications", headers=solitario).json() == []
    assert client.get(f"{API}/notifications/unread_count", headers=solitario).json() == {
        "unread": 0
    }


def test_marcar_leidos_baja_el_contador(client, admin, torneo, equipo_con_capitan):
    client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Rival 4"}, headers=admin
    )
    partido = _partido_del_equipo(
        client, admin, torneo, equipo_con_capitan["team"]["id"]
    )
    cap = equipo_con_capitan["headers"]
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"scheduled_start": "2026-06-01T09:00:00"},
        headers=admin,
    )
    assert client.get(f"{API}/notifications/unread_count", headers=cap).json()["unread"] > 0
    client.post(f"{API}/notifications/read_all", headers=cap)
    assert client.get(f"{API}/notifications/unread_count", headers=cap).json()["unread"] == 0


def test_el_aviso_manual_del_organizador_llega_a_sus_capitanes(
    client, admin, otro_admin, torneo, equipo_con_capitan
):
    r = client.post(
        f"{API}/notifications/broadcast/{torneo['id']}",
        json={"title": "Reunión de delegados", "body": "Jueves 7pm en la sede"},
        headers=admin,
    )
    assert r.status_code == 200 and r.json()["sent"] >= 1
    avisos = client.get(f"{API}/notifications", headers=equipo_con_capitan["headers"]).json()
    assert avisos[0]["title"] == "Reunión de delegados"
    # Y un organizador ajeno no puede usar el torneo para mandar avisos.
    assert (
        client.post(
            f"{API}/notifications/broadcast/{torneo['id']}",
            json={"title": "Spam"},
            headers=otro_admin,
        ).status_code
        == 403
    )


def test_el_capitan_ve_cuando_y_donde_juega(
    client, admin, torneo, cancha, equipo_con_capitan
):
    client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "Rival 5"}, headers=admin
    )
    partido = _partido_del_equipo(
        client, admin, torneo, equipo_con_capitan["team"]["id"]
    )
    # Fecha futura calculada: "próximos" se define contra el reloj, así que una
    # fecha fija dejaría de ser próxima cuando llegue.
    cuando = (datetime.utcnow() + timedelta(days=30)).replace(microsecond=0)
    client.put(
        f"{API}/matches/{partido['id']}/schedule",
        json={"scheduled_start": cuando.isoformat(), "court_id": cancha},
        headers=admin,
    )
    agenda = client.get(f"{API}/captain/matches", headers=equipo_con_capitan["headers"]).json()
    proximo = agenda["upcoming"][0]
    assert proximo["scheduled_start"].startswith(cuando.strftime("%Y-%m-%dT%H:%M"))
    assert proximo["court_name"] == "Cancha 1"
    assert proximo["venue_name"] == "Sede"
    assert proximo["rival_name"]


# --------------------------------------------------------------------------- #
#  Aislamiento de la configuración entre organizadores
# --------------------------------------------------------------------------- #
def test_las_sedes_de_otro_organizador_no_salen_en_el_panel(client, crear_usuario):
    admin_a, _ = crear_usuario("admin")
    admin_b, _ = crear_usuario("admin")
    sede = client.post(
        f"{API}/venues", json={"name": "Sede privada de A"}, headers=admin_a
    ).json()
    nombres = {v["name"] for v in client.get(f"{API}/venues", headers=admin_b).json()}
    assert "Sede privada de A" not in nombres
    mias = {v["id"] for v in client.get(f"{API}/venues", headers=admin_a).json()}
    assert sede["id"] in mias


def test_el_superadmin_ve_las_sedes_de_todos(client, superadmin, crear_usuario):
    admin_a, _ = crear_usuario("admin")
    client.post(f"{API}/venues", json={"name": "Sede soporte"}, headers=admin_a)
    nombres = {v["name"] for v in client.get(f"{API}/venues", headers=superadmin).json()}
    assert "Sede soporte" in nombres


# --------------------------------------------------------------------------- #
#  Limpieza: los avisos y los capitanes no quedan huérfanos
# --------------------------------------------------------------------------- #
def test_borrar_el_torneo_se_lleva_avisos_y_capitanes(
    client, admin, superadmin, torneo, equipo_con_capitan
):
    """Sin esto, PostgreSQL rechaza el borrado por las claves foráneas."""
    client.post(
        f"{API}/notifications/broadcast/{torneo['id']}",
        json={"title": "Aviso previo"},
        headers=admin,
    )
    cap = equipo_con_capitan["headers"]
    assert client.get(f"{API}/notifications", headers=cap).json()

    r = client.delete(f"{API}/tournaments/{torneo['id']}", headers=admin)
    assert r.status_code == 204, r.text
    # La cuenta del capitán sobrevive (puede llevar equipos de otro torneo),
    # pero su bandeja de ese torneo queda vacía y el equipo ya no existe.
    assert client.get(f"{API}/notifications", headers=cap).json() == []
    assert client.get(f"{API}/captain/teams", headers=cap).json() == []


def test_borrar_al_capitan_se_lleva_su_bandeja(
    client, admin, superadmin, torneo, equipo_con_capitan
):
    client.post(
        f"{API}/notifications/broadcast/{torneo['id']}",
        json={"title": "Aviso al capitán"},
        headers=admin,
    )
    uid = equipo_con_capitan["manager"]["user_id"]
    assert client.delete(f"{API}/auth/users/{uid}", headers=superadmin).status_code == 204
    # Y el equipo se queda sin responsables, no borrado.
    equipo = equipo_con_capitan["team"]["id"]
    assert client.get(f"{API}/teams/{equipo}/managers", headers=admin).json() == []
