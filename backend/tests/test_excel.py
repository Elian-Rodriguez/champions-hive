"""Nóminas que entran por Excel y tablas que salen en Excel.

La planilla la escribe un delegado, no un programador, así que lo que se fija
es que se lea como llega: encabezados con tilde o con sinónimos, el equipo en
una celda combinada, el documento guardado como número. Y que nunca quede
nada a medias: con un error no se importa nada, y subir la misma planilla dos
veces deja todo igual.

Del lado de la exportación, que el Excel respete los mismos interruptores que
el marcador público y que la cédula del jugador solo la vea el organizador.
"""
import io
import zipfile

from app.services import excel

from .conftest import API


def _xlsx(filas):
    return excel.escribir([("Hoja", filas, False)])


def _importar(client, headers, tid, contenido, nombre="nomina.xlsx", dry_run=True):
    return client.post(
        f"{API}/tournaments/{tid}/import/roster?dry_run={'true' if dry_run else 'false'}",
        files={"file": (nombre, contenido, "application/octet-stream")},
        headers=headers,
    )


NOMINA = [
    ["Liga del barrio — inscripciones"],  # título arriba de los encabezados
    ["Nombre del equipo", "Grupo", "Nombres", "Cédula", "N°", "E-mail"],
    ["Atlético Norte", "A", "Ana Ruiz", 1023456789, 10, "ana@correo.com"],
    ["", "", "Luis Paz", 79123456, 7, ""],  # celda combinada: el equipo de arriba
    ["Real Sur", "B", "Pedro Gil", 52111222, 1, "esto-no-es-correo"],
    ["Equipo Sin Gente", "", "", "", "", ""],
]


def test_lee_la_planilla_como_llega(client, admin, torneo):
    r = _importar(client, admin, torneo["id"], _xlsx(NOMINA))
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["dry_run"] is True and datos["errors"] == []
    equipos = {e["name"]: e for e in datos["teams"]}
    assert set(equipos) == {"Atlético Norte", "Real Sur", "Equipo Sin Gente"}
    norte = equipos["Atlético Norte"]
    assert [p["name"] for p in norte["players"]] == ["Ana Ruiz", "Luis Paz"]
    # El documento guardado como número vuelve tal cual, sin «.0» ni notación
    # científica.
    assert norte["players"][0]["identification_number"] == "1023456789"
    assert norte["players"][1]["number"] == 7
    # El correo que no es correo se avisa pero no bloquea.
    assert any("no parece un correo" in a["message"] for a in datos["warnings"])
    # Validar no escribe nada.
    assert client.get(f"{API}/tournaments/{torneo['id']}/teams").json() == []


def test_importa_y_la_segunda_vez_no_duplica(client, admin, torneo):
    r = _importar(client, admin, torneo["id"], _xlsx(NOMINA), dry_run=False)
    assert r.status_code == 200, r.text
    assert r.json()["result"] == {"teams_created": 3, "players_created": 3, "players_updated": 0}
    equipos = client.get(f"{API}/tournaments/{torneo['id']}/teams").json()
    norte = next(e for e in equipos if e["name"] == "Atlético Norte")
    assert norte["group_name"] == "A"
    jugadores = client.get(f"{API}/teams/{norte['id']}/players", headers=admin).json()
    assert {j["identification_number"] for j in jugadores} == {"1023456789", "79123456"}

    # Misma planilla con un dorsal cambiado: actualiza ese, no crea nada.
    otra = [fila[:] for fila in NOMINA]
    otra[3][4] = 9
    r = _importar(client, admin, torneo["id"], _xlsx(otra), dry_run=False)
    assert r.json()["result"] == {"teams_created": 0, "players_created": 0, "players_updated": 1}
    jugadores = client.get(f"{API}/teams/{norte['id']}/players", headers=admin).json()
    assert len(jugadores) == 2
    assert next(j for j in jugadores if j["name"] == "Luis Paz")["number"] == 9

    historial = client.get(f"{API}/tournaments/{torneo['id']}/audit", headers=admin).json()
    assert any(h["action"] == "importacion" for h in historial)


def test_con_un_error_no_entra_nada(client, admin, torneo):
    filas = [
        ["Equipo", "Jugador", "Documento", "Dorsal"],
        ["Uno", "Ana", "111", "10"],
        ["Dos", "Beto", "111", "4"],  # documento repetido
        ["Dos", "Caro", "222", "diez"],  # dorsal que no es número
    ]
    datos = _importar(client, admin, torneo["id"], _xlsx(filas)).json()
    filas_con_error = sorted(e["row"] for e in datos["errors"])
    assert filas_con_error == [3, 4]
    r = _importar(client, admin, torneo["id"], _xlsx(filas), dry_run=False)
    assert r.status_code == 400
    assert client.get(f"{API}/tournaments/{torneo['id']}/teams").json() == []


def test_un_jugador_no_juega_en_dos_equipos(client, admin, torneo):
    _importar(client, admin, torneo["id"], _xlsx([["Equipo", "Jugador", "Documento"], ["Uno", "Ana", "555"]]), dry_run=False)
    datos = _importar(
        client, admin, torneo["id"], _xlsx([["Equipo", "Jugador", "Documento"], ["Dos", "Ana", "555"]])
    ).json()
    assert len(datos["errors"]) == 1 and "dos equipos" in datos["errors"][0]["message"]


def test_csv_con_punto_y_coma(client, admin, torneo):
    contenido = "Equipo;Jugador;Dorsal\nLos Pumas;Sofía Díaz;5\n".encode("cp1252")
    datos = _importar(client, admin, torneo["id"], contenido, nombre="nomina.csv").json()
    assert datos["teams"][0]["players"][0]["name"] == "Sofía Díaz"


def test_archivos_que_no_son_planillas(client, admin, torneo):
    xls_viejo = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 100
    r = _importar(client, admin, torneo["id"], xls_viejo, nombre="nomina.xls")
    assert r.status_code == 400 and ".xlsx" in r.json()["detail"]
    r = _importar(client, admin, torneo["id"], _xlsx([["Jugador"], ["Ana"]]))
    assert r.status_code == 400 and "Equipo" in r.json()["detail"]
    # Un XML con entidades no se le entrega al parser.
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("xl/worksheets/sheet1.xml", '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "a">]><x/>')
    r = _importar(client, admin, torneo["id"], buf.getvalue())
    assert r.status_code == 400


def test_solo_el_organizador_importa(client, otro_admin, torneo):
    assert _importar(client, otro_admin, torneo["id"], _xlsx(NOMINA)).status_code == 403


def test_la_plantilla_se_lee_con_el_mismo_importador(client, admin, torneo):
    r = client.get(f"{API}/datos/plantilla_nomina.xlsx")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith(excel.MIME_XLSX)
    datos = _importar(client, admin, torneo["id"], r.content).json()
    assert datos["errors"] == [] and len(datos["teams"]) == 2


# --------------------------------------------------------------------------- #
#  Exportar
# --------------------------------------------------------------------------- #
def _hojas(contenido):
    with zipfile.ZipFile(io.BytesIO(contenido)) as z:
        libro = z.read("xl/workbook.xml").decode()
        textos = {n: z.read(n).decode() for n in z.namelist() if n.startswith("xl/worksheets/")}
    return libro, "".join(textos.values())


def test_exporta_el_campeonato(client, admin, torneo, fase_jugada):
    equipos = client.get(f"{API}/tournaments/{torneo['id']}/teams").json()
    client.post(
        f"{API}/teams/{equipos[0]['id']}/players",
        json={"name": "Jugadora Privada", "identification_number": "CC-998877"},
        headers=admin,
    )
    r = client.get(f"{API}/tournaments/{torneo['id']}/export.xlsx")
    assert r.status_code == 200
    assert "attachment" in r.headers["content-disposition"]
    libro, texto = _hojas(r.content)
    for hoja in ("Posiciones", "Calendario", "Goleadores", "Valla menos vencida", "Juego limpio", "Nóminas"):
        assert hoja in libro, hoja
    assert "Grupo A" in texto and "Jugadora Privada" in texto
    # La cédula no sale en el Excel del público…
    assert "CC-998877" not in texto
    # …pero sí en el del organizador.
    _, texto = _hojas(client.get(f"{API}/tournaments/{torneo['id']}/export.xlsx", headers=admin).content)
    assert "CC-998877" in texto


def test_lo_oculto_no_sale_en_el_excel(client, admin, torneo, fase_jugada):
    client.put(
        f"{API}/tournaments/{torneo['id']}",
        json={"visibility": {"sanciones": False, "nominas": False}},
        headers=admin,
    )
    libro, _ = _hojas(client.get(f"{API}/tournaments/{torneo['id']}/export.xlsx").content)
    assert "Juego limpio" not in libro and "Nóminas" not in libro
    libro, _ = _hojas(client.get(f"{API}/tournaments/{torneo['id']}/export.xlsx", headers=admin).content)
    assert "Juego limpio" in libro and "Nóminas" in libro


def test_un_nombre_con_igual_no_es_una_formula(client, admin, torneo):
    equipo = client.post(
        f"{API}/tournaments/{torneo['id']}/teams", json={"name": "=HYPERLINK(\"x\")"}, headers=admin
    ).json()
    client.post(f"{API}/teams/{equipo['id']}/players", json={"name": "+cmd|calc"}, headers=admin)
    _, texto = _hojas(client.get(f"{API}/tournaments/{torneo['id']}/export.xlsx").content)
    assert "HYPERLINK" in texto and "+cmd|calc" in texto
    assert "<f>" not in texto and 't="inlineStr"' in texto
