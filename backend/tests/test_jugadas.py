"""Mejores jugadas: el clip pegado al partido y a la jugada que fue.

Lo que se fija aquí es lo que se rompe en silencio:

- **Que el tipo de jugada esté acoplado a la disciplina.** Es la razón de ser
  del catálogo: una moñona en un torneo de fútbol no existe, y un error que no
  diga qué jugadas sí hay obliga a adivinar. Si esto se rompe, el reel de tejo
  se llena de «goles» y el filtro deja de servir para nada.
- **Que el archivo exista y se sirva.** La ficha vive en la base y el video en
  disco: son dos cosas que se pueden desincronizar, así que se comprueban las
  dos puntas —que el GET devuelva los bytes y que borrar la jugada borre el
  archivo—.
- **Que no entre cualquier archivo.** Esto se sirve de vuelta desde el mismo
  origen que la aplicación, así que un .html renombrado a .mp4 sería un XSS
  almacenado.
- **Que el reparto de permisos sea el mismo que para cargar el resultado**: el
  árbitro del partido sí, el de otro partido no, el organizador ajeno no.
- **Que Contentful apagado no rompa nada**, que es el estado por defecto.
"""
import os

from app.services import media

from .conftest import API

# mp4 mínimo que pasa la comprobación de firma: la caja `ftyp` en el byte 4.
# No es reproducible, pero el servidor no lo reproduce: lo guarda y lo sirve.
MP4 = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2avc1mp41" + b"\x00" * 1024

PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _subir(client, headers, tid, *, archivo=MP4, nombre="gol.mp4", tipo="video/mp4", **campos):
    return client.post(
        f"{API}/tournaments/{tid}/highlights",
        files={"file": (nombre, archivo, tipo)},
        data={k: v for k, v in campos.items() if v is not None},
        headers=headers,
    )


def _torneo_de(client, headers, deporte):
    r = client.post(
        f"{API}/tournaments",
        json={"name": f"Copa {deporte}", "sport_type": deporte},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


# --------------------------------------------------------------------------- #
#  El catálogo va atado a la disciplina
# --------------------------------------------------------------------------- #
def test_cada_disciplina_tiene_sus_jugadas(client, admin):
    """Fútbol tiene atajada y tejo tiene moñona; no es el mismo catálogo."""
    futbol = _torneo_de(client, admin, "football")
    tejo = _torneo_de(client, admin, "tejo")
    basket = _torneo_de(client, admin, "basketball")

    def tipos(t):
        r = client.get(f"{API}/tournaments/{t['id']}/highlight_plays")
        assert r.status_code == 200, r.text
        return [p["type"] for p in r.json()["plays"]]

    assert "ATAJADA" in tipos(futbol) and "MOÑONA" not in tipos(futbol)
    assert "MOÑONA" in tipos(tejo) and "ATAJADA" not in tipos(tejo)
    assert "CLAVADA" in tipos(basket)
    # El cajón genérico está en todas: siempre existe el clip que no es
    # ninguna de las anteriores.
    for t in (futbol, tejo, basket):
        assert "OTRA" in tipos(t)


def test_una_jugada_de_otra_disciplina_se_rechaza_nombrando_las_que_hay(client, admin):
    futbol = _torneo_de(client, admin, "football")
    r = _subir(client, admin, futbol["id"], play_type="MOÑONA")
    assert r.status_code == 400, r.text
    detalle = r.json()["detail"]
    # El error tiene que servir para corregir sin adivinar.
    assert "Atajada" in detalle and "Regate" in detalle


def test_la_moñona_si_entra_en_un_torneo_de_tejo(client, admin):
    tejo = _torneo_de(client, admin, "tejo")
    r = _subir(client, admin, tejo["id"], play_type="moñona", title="La moñona de Hugo")
    assert r.status_code == 201, r.text
    jugada = r.json()
    assert jugada["play_type"] == "MOÑONA"
    # La etiqueta viene resuelta para la tarjeta del reel.
    assert jugada["play_label"] == "Moñona"


def test_sin_tipo_la_jugada_cae_en_el_cajon_generico(client, admin, torneo):
    r = _subir(client, admin, torneo["id"], title="La hinchada")
    assert r.status_code == 201, r.text
    assert r.json()["play_type"] == "OTRA"


# --------------------------------------------------------------------------- #
#  El archivo: que se guarde, se sirva y se borre
# --------------------------------------------------------------------------- #
def test_el_clip_se_guarda_en_disco_y_se_sirve(client, admin, torneo):
    r = _subir(client, admin, torneo["id"], play_type="GOL", title="Golazo", minute="23")
    assert r.status_code == 201, r.text
    jugada = r.json()
    assert jugada["storage"] == "local"
    assert jugada["size_bytes"] == len(MP4)
    assert jugada["minute"] == 23

    # La URL que viaja al frontend tiene que devolver los bytes de verdad.
    assert jugada["video_url"].startswith("/api/v1/media/jugadas/")
    descarga = client.get(jugada["video_url"])
    assert descarga.status_code == 200
    assert descarga.content == MP4


def test_borrar_la_jugada_borra_el_archivo(client, admin, torneo):
    jugada = _subir(client, admin, torneo["id"], play_type="GOL").json()
    relativa = jugada["video_url"].split("/api/v1/media/", 1)[1]
    en_disco = media.ruta_absoluta(relativa)
    assert en_disco and os.path.exists(en_disco)

    r = client.delete(f"{API}/highlights/{jugada['id']}", headers=admin)
    assert r.status_code == 204, r.text
    # Sin esto el disco se llena de clips huérfanos que nadie va a encontrar.
    assert not os.path.exists(en_disco)
    assert client.get(jugada["video_url"]).status_code == 404


def test_un_archivo_que_no_es_video_se_rechaza(client, admin, torneo):
    """Un .html renombrado a .mp4 se serviría desde nuestro propio dominio."""
    r = _subir(client, admin, torneo["id"], archivo=b"<html><script>1</script></html>")
    assert r.status_code == 400, r.text
    assert "video" in r.json()["detail"].lower()


def test_un_tipo_de_archivo_ajeno_se_rechaza_antes_de_mirar_el_contenido(
    client, admin, torneo
):
    r = _subir(client, admin, torneo["id"], nombre="nomina.pdf", tipo="application/pdf")
    assert r.status_code == 400
    assert "MP4" in r.json()["detail"]


def test_un_clip_demasiado_grande_se_rechaza_con_el_tope(client, admin, torneo):
    grande = MP4 + b"\x00" * (media.max_bytes() + 1)
    r = _subir(client, admin, torneo["id"], archivo=grande)
    assert r.status_code == 400
    assert str(media.max_bytes() // (1024 * 1024)) in r.json()["detail"]


def test_la_portada_pasa_por_la_misma_puerta_que_los_escudos(client, admin, torneo):
    ok = _subir(client, admin, torneo["id"], play_type="GOL", poster_url=PNG)
    assert ok.status_code == 201, ok.text
    assert ok.json()["poster_url"] == PNG

    mal = _subir(client, admin, torneo["id"], play_type="GOL", poster_url="javascript:x")
    assert mal.status_code == 400


# --------------------------------------------------------------------------- #
#  Jugada enlazada (la liga que ya publica en otra parte)
# --------------------------------------------------------------------------- #
def test_una_jugada_puede_ser_solo_un_enlace(client, admin, torneo):
    r = client.post(
        f"{API}/tournaments/{torneo['id']}/highlights/link",
        json={
            "video_url": "https://www.youtube.com/watch?v=abc",
            "play_type": "GOL",
            "title": "El gol de la fecha",
        },
        headers=admin,
    )
    assert r.status_code == 201, r.text
    jugada = r.json()
    assert jugada["storage"] == "link"
    assert jugada["video_url"] == "https://www.youtube.com/watch?v=abc"
    # Sin archivo: no consume almacenamiento.
    assert jugada["size_bytes"] is None


def test_un_enlace_que_no_es_http_se_rechaza(client, admin, torneo):
    r = client.post(
        f"{API}/tournaments/{torneo['id']}/highlights/link",
        json={"video_url": "javascript:alert(1)"},
        headers=admin,
    )
    assert r.status_code == 422


# --------------------------------------------------------------------------- #
#  Quién puede subir: el mismo reparto que para cargar el resultado
# --------------------------------------------------------------------------- #
def _partido_con_arbitro(client, admin, fase, arbitro_id):
    partidos = client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    m = partidos[0]
    r = client.put(
        f"{API}/matches/{m['id']}/schedule",
        json={"referee_id": arbitro_id},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    return m, partidos[1]


def test_el_arbitro_del_partido_puede_subir_la_jugada(
    client, admin, torneo, fase_jugada, arbitro
):
    cabeceras, arbitro_id = arbitro
    mio, _ = _partido_con_arbitro(client, admin, fase_jugada, arbitro_id)
    r = _subir(
        client, cabeceras, torneo["id"], play_type="GOL", match_id=mio["id"]
    )
    assert r.status_code == 201, r.text
    assert r.json()["match_id"] == mio["id"]
    # Y el rótulo del partido viene resuelto: el reel no lo va a consultar.
    assert " vs " in r.json()["match_label"]


def test_el_arbitro_no_puede_subir_al_partido_de_otro(
    client, admin, torneo, fase_jugada, arbitro
):
    cabeceras, arbitro_id = arbitro
    _, ajeno = _partido_con_arbitro(client, admin, fase_jugada, arbitro_id)
    r = _subir(client, cabeceras, torneo["id"], play_type="GOL", match_id=ajeno["id"])
    assert r.status_code == 403


def test_el_arbitro_sin_partido_no_puede_subir_nada(client, torneo, arbitro):
    """Sin partido no hay nada que lo autorice: el permiso del árbitro ES el
    partido asignado."""
    cabeceras, _ = arbitro
    r = _subir(client, cabeceras, torneo["id"], play_type="GOL")
    assert r.status_code == 403
    assert "partido" in r.json()["detail"].lower()


def test_otro_organizador_no_puede_subir_ni_borrar(client, admin, otro_admin, torneo):
    assert _subir(client, otro_admin, torneo["id"], play_type="GOL").status_code == 403
    mia = _subir(client, admin, torneo["id"], play_type="GOL").json()
    assert (
        client.delete(f"{API}/highlights/{mia['id']}", headers=otro_admin).status_code
        == 403
    )


def test_el_publico_no_puede_subir(client, torneo):
    assert _subir(client, {}, torneo["id"], play_type="GOL").status_code == 401


def test_un_partido_de_otro_campeonato_se_rechaza(client, admin, torneo, fase_jugada):
    """Si no, un clip aparecería en el reel de un campeonato ajeno."""
    otro = _torneo_de(client, admin, "football")
    partido = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    r = _subir(client, admin, otro["id"], play_type="GOL", match_id=partido["id"])
    assert r.status_code == 400
    assert "no pertenece" in r.json()["detail"]


# --------------------------------------------------------------------------- #
#  Qué ve el público
# --------------------------------------------------------------------------- #
def test_una_jugada_sin_publicar_no_sale_al_marcador(client, admin, torneo):
    oculta = _subir(
        client, admin, torneo["id"], play_type="GOL", title="A revisar", published="false"
    ).json()
    assert oculta["published"] is False

    publicas = client.get(f"{API}/tournaments/{torneo['id']}/highlights").json()
    assert oculta["id"] not in [j["id"] for j in publicas]

    # El dueño sí la ve, que es lo que le permite mirarla con el marco puesto
    # antes de decidir si sale.
    propias = client.get(
        f"{API}/tournaments/{torneo['id']}/highlights?include_unpublished=true",
        headers=admin,
    ).json()
    assert oculta["id"] in [j["id"] for j in propias]


def test_publicar_una_jugada_guardada(client, admin, torneo):
    jugada = _subir(
        client, admin, torneo["id"], play_type="GOL", published="false"
    ).json()
    r = client.put(
        f"{API}/highlights/{jugada['id']}",
        json={"published": True, "title": "Golazo de media cancha"},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    assert r.json()["published"] is True
    publicas = client.get(f"{API}/tournaments/{torneo['id']}/highlights").json()
    assert jugada["id"] in [j["id"] for j in publicas]


def test_el_interruptor_de_visibilidad_oculta_el_reel(client, admin, torneo):
    _subir(client, admin, torneo["id"], play_type="GOL")
    assert client.get(f"{API}/tournaments/{torneo['id']}/highlights").status_code == 200

    client.put(
        f"{API}/tournaments/{torneo['id']}",
        json={"visibility": {"jugadas": False}},
        headers=admin,
    )
    # 403 al público y 200 al dueño, igual que el resto de las secciones.
    assert client.get(f"{API}/tournaments/{torneo['id']}/highlights").status_code == 403
    assert (
        client.get(
            f"{API}/tournaments/{torneo['id']}/highlights", headers=admin
        ).status_code
        == 200
    )


def test_se_filtra_por_partido_y_por_tipo(client, admin, torneo, fase_jugada):
    partido = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/matches").json()[0]
    _subir(client, admin, torneo["id"], play_type="GOL", match_id=partido["id"])
    _subir(client, admin, torneo["id"], play_type="ATAJADA", match_id=partido["id"])
    _subir(client, admin, torneo["id"], play_type="GOL")

    base = f"{API}/tournaments/{torneo['id']}/highlights"
    del_partido = client.get(f"{base}?match_id={partido['id']}").json()
    assert len(del_partido) == 2
    atajadas = client.get(f"{base}?play_type=ATAJADA").json()
    assert len(atajadas) == 1 and atajadas[0]["play_type"] == "ATAJADA"


# --------------------------------------------------------------------------- #
#  Contentful apagado: el estado por defecto
# --------------------------------------------------------------------------- #
def test_contentful_viene_apagado(client):
    r = client.get(f"{API}/highlights/config")
    assert r.status_code == 200
    assert r.json()["contentful"] == {
        "enabled": False,
        "configured": False,
        "space_id": None,
        "environment": "master",
    }


def test_con_contentful_apagado_subir_funciona_igual(client, admin, torneo):
    """Es la mitad del punto de que sea opcional: sin CDN, la plataforma entera
    sigue funcionando con el video en disco."""
    jugada = _subir(client, admin, torneo["id"], play_type="GOL").json()
    assert jugada["external_url"] is None
    assert client.get(jugada["video_url"]).status_code == 200


def test_el_espejo_manual_explica_que_falta_configurar(client, admin, torneo):
    jugada = _subir(client, admin, torneo["id"], play_type="GOL").json()
    r = client.post(f"{API}/highlights/{jugada['id']}/mirror", headers=admin)
    assert r.status_code == 400
    # El mensaje nombra las variables: un «no configurado» a secas obliga a
    # ir a buscar en el código cuáles son.
    assert "CONTENTFUL_ENABLED" in r.json()["detail"]


def test_una_jugada_enlazada_no_se_puede_espejar(client, admin, torneo):
    jugada = client.post(
        f"{API}/tournaments/{torneo['id']}/highlights/link",
        json={"video_url": "https://youtu.be/x"},
        headers=admin,
    ).json()
    r = client.post(f"{API}/highlights/{jugada['id']}/mirror", headers=admin)
    assert r.status_code == 400


# --------------------------------------------------------------------------- #
#  Rastro
# --------------------------------------------------------------------------- #
def test_subir_y_borrar_queda_en_el_historial(client, admin, torneo):
    jugada = _subir(
        client, admin, torneo["id"], play_type="GOL", title="Golazo de Hugo"
    ).json()
    client.delete(f"{API}/highlights/{jugada['id']}", headers=admin)

    historial = client.get(
        f"{API}/tournaments/{torneo['id']}/audit?action=jugada", headers=admin
    ).json()
    frases = [h["summary"] for h in historial]
    assert any("Subió la jugada «Golazo de Hugo»" in f for f in frases)
    assert any("Borró la jugada «Golazo de Hugo»" in f for f in frases)
    assert all(h["action_label"] == "Mejores jugadas" for h in historial)


def test_el_arbitro_no_lee_el_historial(client, admin, torneo, arbitro):
    cabeceras, _ = arbitro
    _subir(client, admin, torneo["id"], play_type="GOL")
    r = client.get(f"{API}/tournaments/{torneo['id']}/audit", headers=cabeceras)
    assert r.status_code == 403
