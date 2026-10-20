"""El gobierno del campeonato: sanción del comité, informe arbitral y reclamo.

Son los tres eslabones de la discusión del martes —qué pasó, qué se decidió y
qué dijo el equipo que no estaba de acuerdo— y lo que se fija aquí es que la
cadena aguante:

- **La sanción manual va por fuera del interruptor**: la liga que no quiere el
  contador automático es justamente la que más sanciona a mano. Sale en la
  misma lista que las automáticas, se cumple con los partidos que el equipo
  termina después del hecho y la anulada deja de suspender sin desaparecer.
- **El informe firmado no se toca**, ni siquiera el organizador: lo reabre, y
  eso queda en el historial. El capitán lee el firmado, nunca el borrador.
- **El reclamo lo presenta el capitán de su equipo** con el clip como prueba,
  lo resuelve el organizador con un texto (un «rechazado» a secas no sirve) y
  lo publica solo si quiere. Si apela una sanción, resolverlo la ajusta.
"""
import uuid
from datetime import datetime, timedelta

import pytest

from .conftest import API

BASE = datetime(2027, 3, 6, 10, 0)
MP4 = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 512


def _login(client, email, password):
    r = client.post(f"{API}/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _capitan_de(client, admin, equipo_id):
    email = f"cap-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        f"{API}/teams/{equipo_id}/managers",
        json={"email": email, "name": "Capitán"},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    return _login(client, email, r.json()["temp_password"])


@pytest.fixture
def liga(client, admin, cancha):
    """Cuatro equipos con nómina, fixture y fechas en orden."""
    torneo = client.post(
        f"{API}/tournaments",
        json={"name": "Copa Comité", "sport_type": "football"},
        headers=admin,
    ).json()
    equipos = []
    for i in range(4):
        e = client.post(
            f"{API}/tournaments/{torneo['id']}/teams",
            json={"name": f"Club {i}"},
            headers=admin,
        ).json()
        e["players"] = [
            client.post(
                f"{API}/teams/{e['id']}/players",
                json={"name": f"Jugador {i}-{j}", "number": j + 1},
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
    for i, m in enumerate(partidos):
        client.put(
            f"{API}/matches/{m['id']}/schedule",
            json={"scheduled_start": (BASE + timedelta(days=i)).isoformat()},
            headers=admin,
        )
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    partidos.sort(key=lambda m: m["scheduled_start"])
    return {"torneo": torneo, "equipos": equipos, "partidos": partidos}


def _de(liga, equipo):
    return [
        m for m in liga["partidos"] if equipo["id"] in (m["home_team_id"], m["away_team_id"])
    ]


def _finalizar(client, admin, m):
    r = client.put(
        f"{API}/matches/{m['id']}/status",
        json={"status": "finished", "home_score": 1, "away_score": 0},
        headers=admin,
    )
    assert r.status_code == 200, r.text


def _sancionar(client, admin, liga, jugador, **extra):
    r = client.post(
        f"{API}/tournaments/{liga['torneo']['id']}/sanctions",
        json={"player_id": jugador["id"], "reason": "Agresión al rival", **extra},
        headers=admin,
    )
    return r


def _disciplina(client, tid):
    r = client.get(f"{API}/tournaments/{tid}/discipline")
    assert r.status_code == 200, r.text
    return r.json()


# --------------------------------------------------------------------------- #
#  Sanción manual
# --------------------------------------------------------------------------- #
def test_la_sancion_manual_suspende_con_el_reglamento_apagado(client, admin, liga):
    equipo = liga["equipos"][0]
    primero = _de(liga, equipo)[0]
    _finalizar(client, admin, primero)
    r = _sancionar(client, admin, liga, equipo["players"][0], matches=2, match_id=primero["id"])
    assert r.status_code == 201, r.text
    s = r.json()
    # El equipo se deduce de la nómina: el comité sanciona al jugador.
    assert s["team_id"] == equipo["id"] and s["pending"] == 2

    datos = _disciplina(client, liga["torneo"]["id"])
    assert datos["enabled"] is False  # el contador automático sigue apagado
    assert len(datos["sanctions"]) == 1
    fila = datos["sanctions"][0]
    assert fila["source"] == "manual" and fila["reason"] == "Agresión al rival"
    assert fila["next_match"]["id"] == _de(liga, equipo)[1]["id"]


def test_se_cumple_con_los_partidos_posteriores(client, admin, liga):
    equipo = liga["equipos"][0]
    partidos = _de(liga, equipo)
    _finalizar(client, admin, partidos[0])
    s = _sancionar(client, admin, liga, equipo["players"][0], matches=1, match_id=partidos[0]["id"]).json()
    _finalizar(client, admin, partidos[1])
    assert _disciplina(client, liga["torneo"]["id"])["sanctions"] == []
    lista = client.get(f"{API}/tournaments/{liga['torneo']['id']}/sanctions", headers=admin).json()
    # Cumplida no es borrada: el organizador la sigue viendo en su lista.
    assert [x["id"] for x in lista] == [s["id"]] and lista[0]["served"] == 1


def test_la_anulada_deja_de_suspender_sin_desaparecer(client, admin, liga):
    jugador = liga["equipos"][0]["players"][0]
    s = _sancionar(client, admin, liga, jugador, matches=3).json()
    r = client.put(f"{API}/sanctions/{s['id']}", json={"status": "annulled"}, headers=admin)
    assert r.status_code == 200, r.text
    assert _disciplina(client, liga["torneo"]["id"])["sanctions"] == []
    lista = client.get(f"{API}/tournaments/{liga['torneo']['id']}/sanctions", headers=admin).json()
    assert lista[0]["status"] == "annulled"
    historial = client.get(f"{API}/tournaments/{liga['torneo']['id']}/audit", headers=admin).json()
    assert any("Anuló la sanción" in h["summary"] for h in historial)


def test_jugador_ajeno_y_partido_ajeno_se_rechazan(client, admin, liga):
    equipo, otro = liga["equipos"][0], liga["equipos"][1]
    r = _sancionar(client, admin, liga, equipo["players"][0], team_id=otro["id"])
    assert r.status_code == 400 and "nómina" in r.json()["detail"]
    sin_el = next(
        m for m in liga["partidos"] if equipo["id"] not in (m["home_team_id"], m["away_team_id"])
    )
    r = _sancionar(client, admin, liga, equipo["players"][0], match_id=sin_el["id"])
    assert r.status_code == 400
    assert _sancionar(client, admin, liga, equipo["players"][0], reason="  ").status_code == 400
    assert _sancionar(client, admin, liga, equipo["players"][0], matches=99).status_code == 400


def test_solo_el_organizador_sanciona(client, admin, otro_admin, liga):
    jugador = liga["equipos"][0]["players"][0]
    assert _sancionar(client, otro_admin, liga, jugador).status_code == 403
    capitan = _capitan_de(client, admin, liga["equipos"][0]["id"])
    assert _sancionar(client, capitan, liga, jugador).status_code == 403


def test_avisa_al_capitan_del_equipo(client, admin, liga):
    equipo = liga["equipos"][0]
    capitan = _capitan_de(client, admin, equipo["id"])
    _sancionar(client, admin, liga, equipo["players"][0], matches=2)
    avisos = client.get(f"{API}/notifications", headers=capitan).json()
    assert any(a["type"] == "sancion_jugador" for a in avisos), avisos


# --------------------------------------------------------------------------- #
#  Informe arbitral
# --------------------------------------------------------------------------- #
@pytest.fixture
def partido_dirigido(client, admin, arbitro, liga):
    headers, arbitro_id = arbitro
    m = liga["partidos"][0]
    client.put(f"{API}/matches/{m['id']}/schedule", json={"referee_id": arbitro_id}, headers=admin)
    return m, headers


def _incidencia(m, liga, **extra):
    local = next(e for e in liga["equipos"] if e["id"] == m["home_team_id"])
    return {
        "kind": "agresion",
        "minute": 70,
        "team": "home",
        "player_id": local["players"][0]["id"],
        "description": "Golpe al rival con el balón detenido",
        **extra,
    }


def test_el_arbitro_escribe_y_firma(client, admin, liga, partido_dirigido):
    m, arbitro = partido_dirigido
    r = client.put(
        f"{API}/matches/{m['id']}/report",
        json={"observations": "Partido caliente", "incidents": [_incidencia(m, liga)]},
        headers=arbitro,
    )
    assert r.status_code == 200, r.text
    inc = r.json()["incidents"][0]
    assert inc["kind_label"] == "Agresión" and inc["player_name"] and inc["team_name"]
    r = client.post(f"{API}/matches/{m['id']}/report/submit", headers=arbitro)
    assert r.status_code == 200 and r.json()["submitted_at"]

    # Firmado, ya no se toca: ni el árbitro ni el organizador.
    for quien in (arbitro, admin):
        r = client.put(f"{API}/matches/{m['id']}/report", json={"incidents": []}, headers=quien)
        assert r.status_code == 409
    # El organizador lo reabre y queda anotado.
    assert client.post(f"{API}/matches/{m['id']}/report/reopen", headers=admin).status_code == 200
    assert client.post(f"{API}/matches/{m['id']}/report/reopen", headers=arbitro).status_code == 403
    historial = client.get(f"{API}/tournaments/{liga['torneo']['id']}/audit", headers=admin).json()
    assert any("Reabrió el informe" in h["summary"] for h in historial)


def test_los_ids_de_las_incidencias_sobreviven_la_correccion(client, liga, partido_dirigido):
    m, arbitro = partido_dirigido
    primero = client.put(
        f"{API}/matches/{m['id']}/report",
        json={"incidents": [_incidencia(m, liga)]},
        headers=arbitro,
    ).json()["incidents"][0]
    corregido = client.put(
        f"{API}/matches/{m['id']}/report",
        json={"incidents": [{**_incidencia(m, liga), "id": primero["id"], "minute": 72}]},
        headers=arbitro,
    ).json()["incidents"][0]
    assert corregido["id"] == primero["id"] and corregido["minute"] == 72


def test_incidencias_invalidas(client, liga, partido_dirigido):
    m, arbitro = partido_dirigido
    visitante = next(e for e in liga["equipos"] if e["id"] == m["away_team_id"])
    malas = [
        _incidencia(m, liga, kind="pelea_de_gallos"),
        _incidencia(m, liga, player_id=visitante["players"][0]["id"]),  # no es del local
        _incidencia(m, liga, minute=500),
    ]
    for inc in malas:
        r = client.put(f"{API}/matches/{m['id']}/report", json={"incidents": [inc]}, headers=arbitro)
        assert r.status_code == 400, inc
    # Sin lado, el jugador se ubica solo en su equipo.
    r = client.put(
        f"{API}/matches/{m['id']}/report",
        json={"incidents": [_incidencia(m, liga, team=None, player_id=visitante["players"][0]["id"])]},
        headers=arbitro,
    )
    assert r.status_code == 200 and r.json()["incidents"][0]["team"] == "away"


def test_otro_arbitro_no_escribe(client, crear_usuario, partido_dirigido):
    m, _ = partido_dirigido
    otro, _ = crear_usuario("referee")
    r = client.put(f"{API}/matches/{m['id']}/report", json={"incidents": []}, headers=otro)
    assert r.status_code == 403
    assert client.get(f"{API}/matches/{m['id']}/report", headers=otro).status_code == 403


def test_el_capitan_lee_solo_el_firmado(client, admin, liga, partido_dirigido):
    m, arbitro = partido_dirigido
    capitan = _capitan_de(client, admin, m["home_team_id"])
    client.put(f"{API}/matches/{m['id']}/report", json={"incidents": [_incidencia(m, liga)]}, headers=arbitro)
    assert client.get(f"{API}/matches/{m['id']}/report", headers=capitan).status_code == 403
    client.post(f"{API}/matches/{m['id']}/report/submit", headers=arbitro)
    assert client.get(f"{API}/matches/{m['id']}/report", headers=capitan).status_code == 200
    ajeno = next(e for e in liga["equipos"] if e["id"] not in (m["home_team_id"], m["away_team_id"]))
    capitan_ajeno = _capitan_de(client, admin, ajeno["id"])
    assert client.get(f"{API}/matches/{m['id']}/report", headers=capitan_ajeno).status_code == 403


def test_la_sancion_colgada_de_una_incidencia(client, admin, liga, partido_dirigido):
    """La mesa del comité: la incidencia dice «sancionado» y deja de estar
    pendiente."""
    m, arbitro = partido_dirigido
    inc = client.put(
        f"{API}/matches/{m['id']}/report", json={"incidents": [_incidencia(m, liga)]}, headers=arbitro
    ).json()["incidents"][0]
    client.post(f"{API}/matches/{m['id']}/report/submit", headers=arbitro)
    informes = client.get(f"{API}/tournaments/{liga['torneo']['id']}/reports", headers=admin).json()
    assert informes[0]["pending"] == 1
    r = _sancionar(
        client, admin, liga, {"id": inc["player_id"]}, matches=2, match_id=m["id"], incident_id=inc["id"]
    )
    assert r.status_code == 201, r.text
    informes = client.get(f"{API}/tournaments/{liga['torneo']['id']}/reports", headers=admin).json()
    assert informes[0]["pending"] == 0
    assert informes[0]["incidents"][0]["sanction"]["matches"] == 2


# --------------------------------------------------------------------------- #
#  Reclamos
# --------------------------------------------------------------------------- #
def _reclamar(client, headers, liga, equipo_id, **extra):
    return client.post(
        f"{API}/tournaments/{liga['torneo']['id']}/claims",
        json={
            "team_id": equipo_id,
            "kind": "resultado",
            "description": "El gol del empate fue en fuera de juego",
            **extra,
        },
        headers=headers,
    )


def test_el_capitan_reclama_con_el_clip_y_el_organizador_resuelve(client, admin, liga):
    m = liga["partidos"][0]
    equipo = m["home_team_id"]
    capitan = _capitan_de(client, admin, equipo)
    jugada = client.post(
        f"{API}/tournaments/{liga['torneo']['id']}/highlights",
        files={"file": ("j.mp4", MP4, "video/mp4")},
        data={"play_type": "GOL", "match_id": m["id"]},
        headers=admin,
    ).json()

    r = _reclamar(client, capitan, liga, equipo, match_id=m["id"], highlight_id=jugada["id"])
    assert r.status_code == 201, r.text
    reclamo = r.json()
    assert reclamo["status"] == "open" and reclamo["highlight"]["id"] == jugada["id"]
    # El organizador se entera por su bandeja.
    avisos = client.get(f"{API}/notifications", headers=admin).json()
    assert any(a["type"] == "reclamo_nuevo" for a in avisos)

    # Resolver sin texto no vale.
    r = client.put(f"{API}/claims/{reclamo['id']}", json={"status": "rejected"}, headers=admin)
    assert r.status_code == 400
    r = client.put(
        f"{API}/claims/{reclamo['id']}",
        json={"status": "rejected", "resolution": "El video muestra que estaba habilitado.", "published": True},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "rejected" and r.json()["published"] is True

    avisos = client.get(f"{API}/notifications", headers=capitan).json()
    assert any(a["type"] == "reclamo_resuelto" for a in avisos)
    publico = client.get(f"{API}/tournaments/{liga['torneo']['id']}/resolutions").json()
    assert len(publico) == 1
    # Lo público no dice quién lo escribió.
    assert "created_by_email" not in publico[0] and publico[0]["highlight"]["id"] == jugada["id"]


def test_la_resolucion_no_se_publica_sola(client, admin, liga):
    m = liga["partidos"][0]
    capitan = _capitan_de(client, admin, m["home_team_id"])
    reclamo = _reclamar(client, capitan, liga, m["home_team_id"], match_id=m["id"]).json()
    client.put(
        f"{API}/claims/{reclamo['id']}",
        json={"status": "accepted", "resolution": "Se repite el partido."},
        headers=admin,
    )
    assert client.get(f"{API}/tournaments/{liga['torneo']['id']}/resolutions").json() == []
    # Y un reclamo sin resolver no se puede publicar.
    otro = _reclamar(client, capitan, liga, m["home_team_id"]).json()
    r = client.put(f"{API}/claims/{otro['id']}/publish", json={"published": True}, headers=admin)
    assert r.status_code == 409


def test_el_capitan_solo_reclama_por_su_equipo(client, admin, liga):
    m = liga["partidos"][0]
    capitan = _capitan_de(client, admin, m["home_team_id"])
    assert _reclamar(client, capitan, liga, m["away_team_id"]).status_code == 403
    ajeno = next(
        p for p in liga["partidos"] if m["home_team_id"] not in (p["home_team_id"], p["away_team_id"])
    )
    r = _reclamar(client, capitan, liga, m["home_team_id"], match_id=ajeno["id"])
    assert r.status_code == 400


def test_el_capitan_ve_los_suyos_y_no_los_del_rival(client, admin, liga):
    m = liga["partidos"][0]
    local = _capitan_de(client, admin, m["home_team_id"])
    visita = _capitan_de(client, admin, m["away_team_id"])
    mio = _reclamar(client, local, liga, m["home_team_id"]).json()
    _reclamar(client, visita, liga, m["away_team_id"])
    ids = [c["id"] for c in client.get(f"{API}/tournaments/{liga['torneo']['id']}/claims", headers=local).json()]
    assert ids == [mio["id"]]
    assert [c["id"] for c in client.get(f"{API}/claims/mine", headers=local).json()] == [mio["id"]]
    assert client.get(f"{API}/claims/{mio['id']}", headers=visita).status_code == 403
    assert len(client.get(f"{API}/tournaments/{liga['torneo']['id']}/claims", headers=admin).json()) == 2


def test_la_prueba_propia_se_sube_y_no_sale_al_publico(client, admin, liga):
    m = liga["partidos"][0]
    capitan = _capitan_de(client, admin, m["home_team_id"])
    reclamo = _reclamar(client, capitan, liga, m["home_team_id"], match_id=m["id"]).json()
    r = client.post(
        f"{API}/claims/{reclamo['id']}/evidence",
        files={"file": ("prueba.mp4", MP4, "video/mp4")},
        headers=capitan,
    )
    assert r.status_code == 200, r.text
    url = r.json()["evidence"]["url"]
    assert url.startswith("/api/v1/media/reclamos/")
    assert client.get(url).status_code == 200
    # Un archivo que no es video se rechaza por sus primeros bytes.
    r = client.post(
        f"{API}/claims/{reclamo['id']}/evidence",
        files={"file": ("x.mp4", b"MZ\x90\x00" * 64, "video/mp4")},
        headers=capitan,
    )
    assert r.status_code == 400
    client.put(
        f"{API}/claims/{reclamo['id']}",
        json={"status": "accepted", "resolution": "Procede.", "published": True},
        headers=admin,
    )
    publico = client.get(f"{API}/tournaments/{liga['torneo']['id']}/resolutions").json()
    assert publico[0]["evidence"] is None


def test_apelar_una_sancion_y_bajarla_al_resolver(client, admin, liga):
    equipo = liga["equipos"][0]
    capitan = _capitan_de(client, admin, equipo["id"])
    s = _sancionar(client, admin, liga, equipo["players"][0], matches=4).json()
    r = _reclamar(client, capitan, liga, equipo["id"], kind="otro", sanction_id=s["id"])
    assert r.status_code == 201 and r.json()["kind"] == "sancion"
    reclamo = r.json()
    r = client.put(
        f"{API}/claims/{reclamo['id']}",
        json={"status": "accepted", "resolution": "Se reduce a una fecha.", "sanction_matches": 1},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    assert _disciplina(client, liga["torneo"]["id"])["sanctions"][0]["matches"] == 1
    # La sanción de otro equipo no se apela.
    ajena = _sancionar(client, admin, liga, liga["equipos"][1]["players"][0]).json()
    assert _reclamar(client, capitan, liga, equipo["id"], sanction_id=ajena["id"]).status_code == 400


def test_retirar_y_ya_no_resolver(client, admin, liga):
    m = liga["partidos"][0]
    capitan = _capitan_de(client, admin, m["home_team_id"])
    reclamo = _reclamar(client, capitan, liga, m["home_team_id"]).json()
    assert client.post(f"{API}/claims/{reclamo['id']}/withdraw", headers=capitan).json()["status"] == "withdrawn"
    r = client.put(f"{API}/claims/{reclamo['id']}", json={"status": "in_review"}, headers=admin)
    assert r.status_code == 409
    # Y el capitán no resuelve el suyo.
    otro = _reclamar(client, capitan, liga, m["home_team_id"]).json()
    r = client.put(f"{API}/claims/{otro['id']}", json={"status": "accepted", "resolution": "x"}, headers=capitan)
    assert r.status_code == 403
