"""Mejores jugadas en el panel del capitán: qué alcanza a ver.

El capitán es el rol con la frontera más estrecha de la plataforma —toda
consulta arranca en `_equipos_del_usuario` y un equipo que no está ahí es un
403—, así que lo que se fija aquí es exactamente dónde cae esa línea para los
clips:

- **Ve los de su equipo y los de los partidos que jugó**, incluido el golazo
  que le hizo el rival. El reel de un partido es la historia del partido, y
  recortarlo a un solo lado lo deja contando la mitad; `is_mine` los separa.
- **No ve los de un equipo ajeno** que nunca enfrentó: esa es la frontera.
- **Una jugada sin publicar no le llega.** El organizador la sube, la mira con
  el marco puesto y después decide; hasta entonces no existe para nadie más.
- **El interruptor `jugadas` apagado FILTRA, no responde 403**, y eso es una
  decisión, no un descuido: la consulta cruza todos los campeonatos del
  capitán, así que un 403 por uno solo le dejaría la pantalla vacía sin poder
  ver los otros.
"""
import uuid

import pytest

from .conftest import API

MP4 = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 512


def _login(client, email, password):
    r = client.post(f"{API}/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _capitan_de(client, admin, equipo):
    """Da de alta al capitán de ese equipo y devuelve sus cabeceras."""
    email = f"cap-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        f"{API}/teams/{equipo['id']}/managers",
        json={"email": email, "name": "Capitán Test"},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return _login(client, email, r.json()["temp_password"])


def _subir(client, headers, tid, **campos):
    r = client.post(
        f"{API}/tournaments/{tid}/highlights",
        files={"file": ("j.mp4", MP4, "video/mp4")},
        data={k: v for k, v in campos.items() if v is not None},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def partido_con_capitan(client, admin, torneo, cancha):
    """Dos equipos que se enfrentan, con capitán en el local.

    Hace falta un partido de verdad (no solo equipos) porque la mitad de lo que
    se comprueba es que el capitán alcanza las jugadas DEL PARTIDO y no solo
    las etiquetadas a su equipo.
    """
    local = client.post(
        f"{API}/tournaments/{torneo['id']}/teams",
        json={"name": "Local FC"},
        headers=admin,
    ).json()
    visita = client.post(
        f"{API}/tournaments/{torneo['id']}/teams",
        json={"name": "Visita FC"},
        headers=admin,
    ).json()
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Grupos", "type": "group"},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    partido = next(
        m
        for m in partidos
        if {str(m["home_team_id"]), str(m["away_team_id"])}
        == {local["id"], visita["id"]}
    )
    return {
        "local": local,
        "visita": visita,
        "match": partido,
        "cap": _capitan_de(client, admin, local),
    }


# --------------------------------------------------------------------------- #
#  Lo que ve
# --------------------------------------------------------------------------- #
def test_ve_la_jugada_de_su_equipo(client, admin, torneo, partido_con_capitan):
    p = partido_con_capitan
    jugada = _subir(
        client,
        admin,
        torneo["id"],
        play_type="GOL",
        title="Golazo del capitán",
        team_id=p["local"]["id"],
        match_id=p["match"]["id"],
    )
    mias = client.get(f"{API}/captain/highlights", headers=p["cap"]).json()
    assert [j["id"] for j in mias] == [jugada["id"]]
    assert mias[0]["is_mine"] is True
    # El contexto del campeonato viaja: el capitán lista varios a la vez y el
    # marco necesita saber qué nombre y qué logo pintar.
    assert mias[0]["tournament_name"] == torneo["name"]
    assert mias[0]["sport_type"] == torneo["sport_type"]


def test_ve_tambien_la_del_rival_en_el_partido_que_jugo(
    client, admin, torneo, partido_con_capitan
):
    """El reel de un partido es la historia del partido, no la de un lado."""
    p = partido_con_capitan
    _subir(
        client,
        admin,
        torneo["id"],
        play_type="GOL",
        title="Gol del rival",
        team_id=p["visita"]["id"],
        match_id=p["match"]["id"],
    )
    mias = client.get(f"{API}/captain/highlights", headers=p["cap"]).json()
    assert len(mias) == 1
    # Pero queda dicho que no es suya, para que la pantalla pueda separarlas.
    assert mias[0]["is_mine"] is False
    assert mias[0]["team_name"] == "Visita FC"


def test_no_ve_la_de_un_equipo_que_nunca_enfrento(
    client, admin, torneo, partido_con_capitan
):
    p = partido_con_capitan
    ajeno = client.post(
        f"{API}/tournaments/{torneo['id']}/teams",
        json={"name": "Ajeno FC"},
        headers=admin,
    ).json()
    _subir(
        client,
        admin,
        torneo["id"],
        play_type="GOL",
        title="Gol ajeno",
        team_id=ajeno["id"],
    )
    mias = client.get(f"{API}/captain/highlights", headers=p["cap"]).json()
    assert mias == []


def test_una_jugada_sin_publicar_no_le_llega(client, admin, torneo, partido_con_capitan):
    p = partido_con_capitan
    _subir(
        client,
        admin,
        torneo["id"],
        play_type="GOL",
        title="A revisar",
        team_id=p["local"]["id"],
        published="false",
    )
    assert client.get(f"{API}/captain/highlights", headers=p["cap"]).json() == []


def test_el_interruptor_apagado_la_saca_de_la_lista_sin_403(
    client, admin, torneo, partido_con_capitan
):
    """Filtra en vez de bloquear: la consulta cruza todos sus campeonatos."""
    p = partido_con_capitan
    _subir(
        client,
        admin,
        torneo["id"],
        play_type="GOL",
        team_id=p["local"]["id"],
    )
    assert len(client.get(f"{API}/captain/highlights", headers=p["cap"]).json()) == 1

    client.put(
        f"{API}/tournaments/{torneo['id']}",
        json={"visibility": {"jugadas": False}},
        headers=admin,
    )
    r = client.get(f"{API}/captain/highlights", headers=p["cap"])
    assert r.status_code == 200
    assert r.json() == []


def test_filtra_por_equipo_y_rechaza_uno_ajeno(
    client, admin, torneo, partido_con_capitan
):
    p = partido_con_capitan
    _subir(
        client, admin, torneo["id"], play_type="GOL", team_id=p["local"]["id"]
    )
    mias = client.get(
        f"{API}/captain/highlights?team_id={p['local']['id']}", headers=p["cap"]
    ).json()
    assert len(mias) == 1
    # Un equipo que no lleva es la frontera del rol, igual que en el resumen.
    r = client.get(
        f"{API}/captain/highlights?team_id={p['visita']['id']}", headers=p["cap"]
    )
    assert r.status_code == 403


def test_una_jugada_sin_equipo_no_es_de_nadie(client, admin, torneo, partido_con_capitan):
    """`is_mine` es None, no False.

    Un clip del partido que nadie atribuyó a un equipo —el ambiente, la
    hinchada, un gol que el organizador no etiquetó— no es del capitán ni del
    rival. Devolver False haría que la pantalla lo rotulara «Del rival», que es
    sencillamente falso, y esa etiqueta puesta sobre el gol propio es el tipo
    de error que un capitán reclama.
    """
    p = partido_con_capitan
    _subir(
        client,
        admin,
        torneo["id"],
        play_type="OTRA",
        title="La hinchada",
        match_id=p["match"]["id"],
    )
    mias = client.get(f"{API}/captain/highlights", headers=p["cap"]).json()
    assert len(mias) == 1
    assert mias[0]["is_mine"] is None


# --------------------------------------------------------------------------- #
#  Lo que NO puede hacer
# --------------------------------------------------------------------------- #
def test_el_capitan_no_sube_ni_borra_jugadas(
    client, admin, torneo, partido_con_capitan
):
    """Leer es suyo; cargar sigue siendo del organizador y del árbitro."""
    p = partido_con_capitan
    r = client.post(
        f"{API}/tournaments/{torneo['id']}/highlights",
        files={"file": ("j.mp4", MP4, "video/mp4")},
        data={"play_type": "GOL"},
        headers=p["cap"],
    )
    assert r.status_code == 403

    jugada = _subir(
        client, admin, torneo["id"], play_type="GOL", team_id=p["local"]["id"]
    )
    assert (
        client.delete(f"{API}/highlights/{jugada['id']}", headers=p["cap"]).status_code
        == 403
    )
    assert (
        client.put(
            f"{API}/highlights/{jugada['id']}",
            json={"title": "mío"},
            headers=p["cap"],
        ).status_code
        == 403
    )


def test_el_arbitro_no_entra_por_la_puerta_del_capitan(client, arbitro):
    headers, _ = arbitro
    assert client.get(f"{API}/captain/highlights", headers=headers).status_code == 403


def test_el_publico_no_entra(client):
    assert client.get(f"{API}/captain/highlights").status_code == 401
