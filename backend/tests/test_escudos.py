"""Escudo del equipo: qué se acepta guardar en `logo_url` y quién puede.

El escudo llega como data URI porque se sube desde el panel y se guarda con la
base, no como archivo en el servidor. Eso mete una imagen dentro de una columna
de texto que después termina en un `<img src>`, así que lo que se fija aquí es
el borde: qué esquemas entran, cuánto puede pesar y que editar una sola cosa del
equipo no obligue a reenviar el resto.
"""
from .conftest import API

# 1x1 png transparente, el escudo más chico que existe.
PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _equipo(client, admin, torneo, **extra):
    payload = {"name": "Leones"}
    payload.update(extra)
    r = client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json=payload, headers=admin
    )
    assert r.status_code == 201, r.text
    return r.json()


# --------------------------------------------------------------------------- #
#  Subir el escudo
# --------------------------------------------------------------------------- #
def test_subir_escudo_al_crear_el_equipo(client, admin, torneo):
    equipo = _equipo(client, admin, torneo, logo_url=PNG)
    assert equipo["logo_url"] == PNG


def test_subir_escudo_a_un_equipo_existente(client, admin, torneo, equipos):
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}", json={"logo_url": PNG}, headers=admin
    )
    assert r.status_code == 200, r.text
    assert r.json()["logo_url"] == PNG
    # Y viaja en el listado, que es de donde lo leen el marcador y el acta.
    listado = client.get(f"{API}/tournaments/{torneo['id']}/teams").json()
    assert {e["id"]: e["logo_url"] for e in listado}[equipos[0]["id"]] == PNG


def test_un_enlace_tambien_vale(client, admin, torneo):
    equipo = _equipo(client, admin, torneo, logo_url="https://cdn.example.com/e.png")
    assert equipo["logo_url"] == "https://cdn.example.com/e.png"


def test_quitar_el_escudo(client, admin, torneo, equipos):
    client.put(f"{API}/teams/{equipos[0]['id']}", json={"logo_url": PNG}, headers=admin)
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}", json={"logo_url": None}, headers=admin
    )
    assert r.status_code == 200
    assert r.json()["logo_url"] is None


# --------------------------------------------------------------------------- #
#  Lo que no entra
# --------------------------------------------------------------------------- #
def test_rechaza_lo_que_no_es_imagen(client, admin, torneo, equipos):
    """`logo_url` termina en un <img src>: solo http(s) o imagen en base64."""
    for malo in (
        "javascript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "/etc/passwd",
        "data:image/png,no-es-base64",
    ):
        r = client.put(
            f"{API}/teams/{equipos[0]['id']}", json={"logo_url": malo}, headers=admin
        )
        assert r.status_code == 422, f"{malo} deberia rechazarse: {r.text}"


def test_rechaza_una_imagen_enorme(client, admin, torneo, equipos):
    """El navegador la reduce antes de mandarla; el tope es la red de seguridad."""
    gigante = "data:image/png;base64," + ("A" * 500_000)
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}", json={"logo_url": gigante}, headers=admin
    )
    assert r.status_code == 422


def test_otro_organizador_no_le_pone_escudo_a_un_equipo_ajeno(
    client, otro_admin, equipos
):
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}", json={"logo_url": PNG}, headers=otro_admin
    )
    assert r.status_code == 403


# --------------------------------------------------------------------------- #
#  Edición parcial (lo que rompía el selector de uniformes)
# --------------------------------------------------------------------------- #
def test_cambiar_solo_los_uniformes_sin_reenviar_el_nombre(client, admin, equipos):
    """Con `TeamBase` en el PUT esto respondía 422 y el panel no guardaba nada."""
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}",
        json={"colors": ["#ff0000", "#0000ff"]},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    assert r.json()["colors"] == ["#ff0000", "#0000ff"]
    assert r.json()["color"] == "#ff0000"
    assert r.json()["name"] == equipos[0]["name"]


def test_el_escudo_no_se_pierde_al_cambiar_otra_cosa(client, admin, equipos):
    client.put(f"{API}/teams/{equipos[0]['id']}", json={"logo_url": PNG}, headers=admin)
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}", json={"name": "Leones FC"}, headers=admin
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Leones FC"
    assert r.json()["logo_url"] == PNG


def test_el_nombre_no_puede_quedar_vacio(client, admin, equipos):
    r = client.put(
        f"{API}/teams/{equipos[0]['id']}", json={"name": "   "}, headers=admin
    )
    assert r.status_code == 422
