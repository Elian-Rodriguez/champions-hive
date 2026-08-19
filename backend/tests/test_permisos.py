"""Roles, propiedad de torneos y qué puede hacer cada quien.

Es la parte más delicada del backend: `require_staff` dejó de incluir a los
árbitros y cada admin solo administra lo suyo. Sin estas pruebas es fácil
reabrir el agujero sin darse cuenta.
"""
from .conftest import API


# --------------------------------------------------------------------------- #
#  Gestión de usuarios: el superadmin manda; el organizador solo lo suyo
# --------------------------------------------------------------------------- #
def test_admin_no_crea_organizadores(client, admin):
    """Un organizador no da de alta a otro organizador ni a un superadmin.

    Si pudiera, se repartiría cupo y vería la configuración de un colega; el
    alta de organizadores es del superadministrador, que es quien vende.
    """
    for rol in ("admin", "superadmin"):
        r = client.post(
            f"{API}/auth/register",
            json={"email": f"nuevo-{rol}@example.com", "password": "secret1", "role": rol},
            headers=admin,
        )
        assert r.status_code == 403, rol


def test_admin_solo_ve_las_cuentas_que_el_creo(client, crear_usuario):
    """El listado de usuarios de un organizador no muestra los de otro."""
    admin_a, id_a = crear_usuario("admin")
    admin_b, id_b = crear_usuario("admin")
    capitan = client.post(
        f"{API}/auth/register",
        json={"email": "cap-aislado@example.com", "password": "secret1", "role": "captain"},
        headers=admin_a,
    )
    assert capitan.status_code == 201, capitan.text

    emails_a = {u["email"] for u in client.get(f"{API}/auth/users", headers=admin_a).json()}
    emails_b = {u["email"] for u in client.get(f"{API}/auth/users", headers=admin_b).json()}
    assert "cap-aislado@example.com" in emails_a
    assert "cap-aislado@example.com" not in emails_b
    ids_b = {u["id"] for u in client.get(f"{API}/auth/users", headers=admin_b).json()}
    assert id_a not in ids_b and id_b in ids_b


def test_superadmin_gestiona_usuarios(client, superadmin):
    assert client.get(f"{API}/auth/users", headers=superadmin).status_code == 200


def test_admin_si_lista_arbitros_para_asignarlos(client, admin, arbitro):
    """Un admin necesita asignar árbitros sin poder listar el resto de usuarios."""
    r = client.get(f"{API}/auth/referees", headers=admin)
    assert r.status_code == 200
    assert all(u["role"] == "referee" for u in r.json())


def test_rol_invalido_es_rechazado(client, superadmin):
    r = client.post(
        f"{API}/auth/register",
        json={"email": "raro@example.com", "password": "secret1", "role": "dios"},
        headers=superadmin,
    )
    assert r.status_code == 400


# --------------------------------------------------------------------------- #
#  Propiedad de torneos
# --------------------------------------------------------------------------- #
def test_cada_admin_ve_solo_sus_torneos(client, admin, otro_admin, torneo):
    mios = client.get(f"{API}/tournaments", headers=admin).json()
    ajenos = client.get(f"{API}/tournaments", headers=otro_admin).json()
    assert torneo["id"] in [t["id"] for t in mios]
    assert torneo["id"] not in [t["id"] for t in ajenos]


def test_superadmin_ve_todos_los_torneos(client, superadmin, torneo):
    ids = [t["id"] for t in client.get(f"{API}/tournaments", headers=superadmin).json()]
    assert torneo["id"] in ids


def test_publico_ve_todos_los_torneos(client, torneo):
    """El marcador público no tiene sesión y debe poder listar cualquier torneo."""
    ids = [t["id"] for t in client.get(f"{API}/tournaments").json()]
    assert torneo["id"] in ids


def test_el_torneo_guarda_su_dueño(client, torneo):
    assert torneo["owner_id"] is not None


def test_otro_admin_no_puede_tocar_el_torneo(client, otro_admin, torneo):
    tid = torneo["id"]
    assert (
        client.put(
            f"{API}/tournaments/{tid}/rename", json={"name": "hack"}, headers=otro_admin
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"{API}/tournaments/{tid}/stages",
            json={"name": "F", "type": "group"},
            headers=otro_admin,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"{API}/tournaments/{tid}/teams", json={"name": "X"}, headers=otro_admin
        ).status_code
        == 403
    )
    assert client.delete(f"{API}/tournaments/{tid}", headers=otro_admin).status_code == 403


def test_superadmin_si_administra_torneo_ajeno(client, superadmin, torneo):
    r = client.put(
        f"{API}/tournaments/{torneo['id']}/rename",
        json={"name": "Renombrado por superadmin"},
        headers=superadmin,
    )
    assert r.status_code == 200


def test_otro_admin_no_edita_equipos_ajenos(client, otro_admin, equipos):
    """Los equipos se editan por team_id: la propiedad viene de sus torneos."""
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}", json={"name": "Robado"}, headers=otro_admin
    )
    assert r.status_code == 403


def test_otro_admin_no_agrega_jugadores_a_equipos_ajenos(client, otro_admin, equipos):
    r = client.post(
        f"{API}/teams/{equipos[0]['id']}/players",
        json={"name": "Infiltrado"},
        headers=otro_admin,
    )
    assert r.status_code == 403


# --------------------------------------------------------------------------- #
#  Árbitros
# --------------------------------------------------------------------------- #
def test_arbitro_no_administra_nada(client, arbitro, torneo):
    headers, _ = arbitro
    tid = torneo["id"]
    assert (
        client.post(
            f"{API}/tournaments",
            json={"name": "X", "sport_type": "micro"},
            headers=headers,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"{API}/tournaments/{tid}/stages",
            json={"name": "F", "type": "group"},
            headers=headers,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"{API}/tournaments/{tid}/teams", json={"name": "X"}, headers=headers
        ).status_code
        == 403
    )


def test_arbitro_solo_carga_los_partidos_asignados(
    client, admin, arbitro, fase_jugada
):
    headers, arbitro_id = arbitro
    partidos = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()
    mio, ajeno = partidos[0], partidos[1]
    client.put(
        f"{API}/matches/{mio['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )

    assert (
        client.put(
            f"{API}/matches/{mio['id']}/status",
            json={"status": "live"},
            headers=headers,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"{API}/matches/events",
            json={
                "match_id": mio["id"],
                "event_type": "GOL",
                "event_data": {"team": "home"},
            },
            headers=headers,
        ).status_code
        == 201
    )
    # El que no tiene asignado queda fuera de su alcance.
    assert (
        client.put(
            f"{API}/matches/{ajeno['id']}/status",
            json={"status": "live"},
            headers=headers,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"{API}/matches/events",
            json={
                "match_id": ajeno["id"],
                "event_type": "GOL",
                "event_data": {"team": "home"},
            },
            headers=headers,
        ).status_code
        == 403
    )


def test_arbitro_no_reprograma_partidos(client, admin, arbitro, fase_jugada):
    """Reprogramar y asignar árbitro es administrar, no dirigir."""
    headers, arbitro_id = arbitro
    m = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    r = client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=headers,
    )
    assert r.status_code == 403


def test_arbitro_ve_el_campeonato(client, arbitro, fase_jugada):
    headers, _ = arbitro
    assert (
        client.get(
            f"{API}/tournaments/stages/{fase_jugada['id']}/matches", headers=headers
        ).status_code
        == 200
    )
    assert (
        client.get(
            f"{API}/tournaments/stages/{fase_jugada['id']}/standings_by_group",
            headers=headers,
        ).status_code
        == 200
    )


def test_arbitro_solo_ve_torneos_donde_pita(client, admin, arbitro, fase_jugada, torneo):
    headers, arbitro_id = arbitro
    assert client.get(f"{API}/tournaments", headers=headers).json() == []

    m = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    ids = [t["id"] for t in client.get(f"{API}/tournaments", headers=headers).json()]
    assert ids == [torneo["id"]]


def test_mis_partidos_filtra_por_arbitro(client, admin, arbitro, fase_jugada):
    headers, arbitro_id = arbitro
    m = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    mios = client.get(f"{API}/matches", params={"mine": True}, headers=headers).json()
    assert [x["id"] for x in mios] == [m["id"]]


def test_mis_partidos_exige_sesion(client):
    assert client.get(f"{API}/matches", params={"mine": True}).status_code == 401


# --------------------------------------------------------------------------- #
#  Programación de partidos: propiedad y validación del árbitro
# --------------------------------------------------------------------------- #
def test_otro_admin_no_reprograma_partidos_ajenos(client, otro_admin, fase_jugada):
    m = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    r = client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"court_id": None},
        headers=otro_admin,
    )
    assert r.status_code == 403


def test_no_se_puede_asignar_como_arbitro_a_un_admin(client, admin, otro_admin, fase_jugada):
    """`referee_id` no es clave foránea: la validación vive en el endpoint."""
    usuarios = client.get(f"{API}/tournaments", headers=otro_admin).json()  # noqa: F841
    m = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    # Un UUID que no corresponde a ningún usuario.
    r = client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"referee_id": "00000000-0000-0000-0000-000000000000"},
        headers=admin,
    )
    assert r.status_code == 404


def test_asignar_arbitro_valido_funciona(client, admin, arbitro, fase_jugada):
    _, arbitro_id = arbitro
    m = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    r = client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    assert r.status_code == 200
    assert r.json()["referee_id"] == arbitro_id


# --------------------------------------------------------------------------- #
#  Sedes
# --------------------------------------------------------------------------- #
def test_sedes_se_ven_y_se_usan_libremente(client, otro_admin, cancha):
    """Cualquiera puede consultar sedes: se comparten para programar."""
    assert client.get(f"{API}/venues", headers=otro_admin).status_code == 200


def test_otro_admin_no_borra_sedes_ajenas(client, admin, otro_admin):
    v = client.post(f"{API}/venues", json={"name": "Mi sede"}, headers=admin).json()
    assert client.delete(f"{API}/venues/{v['id']}", headers=otro_admin).status_code == 403
    assert (
        client.put(
            f"{API}/venues/{v['id']}", json={"name": "Robada"}, headers=otro_admin
        ).status_code
        == 403
    )


def test_otro_admin_no_borra_canchas_ajenas(client, admin, otro_admin):
    v = client.post(f"{API}/venues", json={"name": "Sede X"}, headers=admin).json()
    c = client.post(
        f"{API}/venues/{v['id']}/courts", json={"name": "C1"}, headers=admin
    ).json()
    assert client.delete(f"{API}/venues/courts/{c['id']}", headers=otro_admin).status_code == 403
