"""Leer y escribir planillas de Excel (.xlsx) con la librería estándar.

Un .xlsx es un zip de XML, y para lo que hace falta aquí —leer la primera hoja
de una nómina y escribir tablas con un encabezado en negrita— alcanza con
`zipfile` y `xml.etree`. Es la misma regla que `correo.py` con `smtplib` y
`contentful.py` con `urllib`: ninguna dependencia nueva para una función que
la mitad de las ligas no va a usar.

Dos guardas, porque el archivo lo sube cualquiera:

- **Tamaños.** Un zip de 1 MB puede descomprimir en gigas (zip bomb): se mira
  el tamaño declarado de cada parte antes de leerla.
- **Nada de DOCTYPE.** Un .xlsx legítimo nunca declara entidades, y las
  entidades son la puerta del «billion laughs». Se rechaza el XML que las
  traiga antes de entregárselo al parser.

Al escribir, todo texto va como `inlineStr`: Excel lo muestra como texto y no
lo evalúa, así que un nombre de equipo que empiece por «=» no se convierte en
una fórmula en la computadora de quien descarga la tabla.
"""
import csv
import io
import re
import zipfile
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable, List, Optional, Sequence, Tuple
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

MAX_ARCHIVO = 5 * 1024 * 1024  # lo que se acepta subir
MAX_PARTE = 50 * 1024 * 1024  # lo que puede ocupar descomprimida una hoja
MAX_FILAS = 5000


class PlanillaInvalida(ValueError):
    """El archivo no se puede leer; el mensaje va tal cual a la pantalla."""


# --------------------------------------------------------------------------- #
#  Lectura
# --------------------------------------------------------------------------- #
def _local(tag: str) -> str:
    """El nombre de la etiqueta sin el espacio de nombres (hay dos: el de
    Excel y el de OOXML estricto, y no vale la pena distinguirlos)."""
    return tag.rsplit("}", 1)[-1]


def _parte(z: zipfile.ZipFile, nombre: str) -> Optional[ET.Element]:
    try:
        info = z.getinfo(nombre)
    except KeyError:
        return None
    if info.file_size > MAX_PARTE:
        raise PlanillaInvalida("La planilla es demasiado grande para importarla")
    crudo = z.read(info)
    if b"<!DOCTYPE" in crudo[:2048].upper() or b"<!ENTITY" in crudo.upper():
        raise PlanillaInvalida("El archivo no es una planilla de Excel válida")
    try:
        return ET.fromstring(crudo)
    except ET.ParseError:
        raise PlanillaInvalida("El archivo está dañado: no se pudo leer la planilla")


def _columna(ref: str) -> int:
    """«C7» → 2 (base 0)."""
    letras = re.match(r"[A-Za-z]+", ref or "")
    if not letras:
        return -1
    n = 0
    for ch in letras.group(0).upper():
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def _numero(texto: str) -> str:
    """El número como lo escribió la persona: 1023456789 y no 1.023456789E9,
    7 y no 7.0. Un documento de identidad guardado como número es el caso
    típico, y en la nómina tiene que volver tal cual."""
    try:
        d = Decimal(texto)
    except InvalidOperation:
        return texto
    if d == d.to_integral_value():
        return str(d.quantize(Decimal(1)))
    return format(d.normalize(), "f")


def _primera_hoja(z: zipfile.ZipFile) -> str:
    """La ruta de la primera hoja según el libro (no siempre es sheet1.xml)."""
    libro = _parte(z, "xl/workbook.xml")
    rels = _parte(z, "xl/_rels/workbook.xml.rels")
    if libro is not None and rels is not None:
        destinos = {
            r.get("Id"): r.get("Target")
            for r in rels.iter()
            if _local(r.tag) == "Relationship"
        }
        for hoja in libro.iter():
            if _local(hoja.tag) != "sheet":
                continue
            rid = next(
                (v for k, v in hoja.attrib.items() if _local(k) == "id"), None
            )
            destino = destinos.get(rid)
            if destino:
                destino = destino.lstrip("/")
                return destino if destino.startswith("xl/") else f"xl/{destino}"
            break
    return "xl/worksheets/sheet1.xml"


def _leer_xlsx(contenido: bytes) -> List[List[str]]:
    try:
        z = zipfile.ZipFile(io.BytesIO(contenido))
    except zipfile.BadZipFile:
        raise PlanillaInvalida(
            "El archivo no es un .xlsx. Si es un .xls antiguo, ábrelo y "
            "guárdalo como «Libro de Excel (.xlsx)» o como CSV."
        )
    with z:
        compartidas: List[str] = []
        sst = _parte(z, "xl/sharedStrings.xml")
        if sst is not None:
            for si in sst:
                if _local(si.tag) != "si":
                    continue
                # Un texto con formato mixto viene partido en varios <r><t>;
                # los <rPh> son la guía fonética japonesa y no son texto.
                partes = []
                for nodo in si.iter():
                    if _local(nodo.tag) == "rPh":
                        break
                    if _local(nodo.tag) == "t" and nodo.text:
                        partes.append(nodo.text)
                compartidas.append("".join(partes))

        hoja = _parte(z, _primera_hoja(z))
        if hoja is None:
            raise PlanillaInvalida("La planilla no tiene hojas")
        filas: List[List[str]] = []
        for fila in hoja.iter():
            if _local(fila.tag) != "row":
                continue
            if len(filas) >= MAX_FILAS:
                raise PlanillaInvalida(f"La planilla supera las {MAX_FILAS} filas")
            # Las filas vacías no vienen en el XML: se respeta su número para
            # que el error diga «fila 14» y sea la fila 14 que ve la persona.
            numero = int(fila.get("r") or len(filas) + 1)
            while len(filas) < numero - 1:
                filas.append([])
            valores: List[str] = []
            for i, celda in enumerate(c for c in fila if _local(c.tag) == "c"):
                col = _columna(celda.get("r")) if celda.get("r") else i
                tipo = celda.get("t")
                valor = ""
                if tipo == "inlineStr":
                    valor = "".join(
                        n.text or "" for n in celda.iter() if _local(n.tag) == "t"
                    )
                else:
                    v = next((n for n in celda if _local(n.tag) == "v"), None)
                    crudo = (v.text or "") if v is not None else ""
                    if tipo == "s":
                        try:
                            valor = compartidas[int(crudo)]
                        except (ValueError, IndexError):
                            valor = ""
                    elif tipo == "b":
                        valor = "VERDADERO" if crudo == "1" else "FALSO"
                    elif tipo in ("str", "e"):
                        valor = crudo
                    else:
                        valor = _numero(crudo) if crudo else ""
                while len(valores) < col:
                    valores.append("")
                valores.append(valor.strip())
            filas.append(valores)
        return filas


def _leer_csv(contenido: bytes) -> List[List[str]]:
    for codificacion in ("utf-8-sig", "cp1252"):
        try:
            texto = contenido.decode(codificacion)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise PlanillaInvalida("No se pudo leer el CSV (codificación desconocida)")
    muestra = texto[:4096]
    # Excel en español guarda el CSV con «;» porque la coma es el decimal.
    try:
        dialecto = csv.Sniffer().sniff(muestra, delimiters=";,\t")
    except csv.Error:
        separador = ";" if muestra.count(";") > muestra.count(",") else ","
        dialecto = type("Separado", (csv.excel,), {"delimiter": separador})
    filas = []
    for fila in csv.reader(io.StringIO(texto), dialecto):
        if len(filas) >= MAX_FILAS:
            raise PlanillaInvalida(f"El archivo supera las {MAX_FILAS} filas")
        filas.append([c.strip() for c in fila])
    return filas


def leer(contenido: bytes, nombre: Optional[str]) -> List[List[str]]:
    """Las filas de la primera hoja como texto, de un .xlsx o un .csv."""
    if not contenido:
        raise PlanillaInvalida("El archivo llegó vacío")
    if len(contenido) > MAX_ARCHIVO:
        raise PlanillaInvalida(
            f"El archivo supera los {MAX_ARCHIVO // (1024 * 1024)} MB"
        )
    nombre = (nombre or "").lower()
    if contenido[:2] == b"PK":
        return _leer_xlsx(contenido)
    if contenido[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        raise PlanillaInvalida(
            "Es un .xls de Excel antiguo. Ábrelo y guárdalo como "
            "«Libro de Excel (.xlsx)» o como CSV, y vuelve a subirlo."
        )
    if nombre.endswith((".csv", ".txt")) or b"\x00" not in contenido[:1024]:
        return _leer_csv(contenido)
    raise PlanillaInvalida("Sube la nómina como .xlsx o .csv")


# --------------------------------------------------------------------------- #
#  Escritura
# --------------------------------------------------------------------------- #
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
_PROHIBIDOS_HOJA = re.compile(r"[\[\]:*?/\\]")
_EPOCA = datetime(1899, 12, 30)

# Índices de estilo de `_ESTILOS`: 0 normal, 1 encabezado, 2 fecha y hora,
# 3 título de bloque (el nombre del grupo dentro de la hoja de posiciones).
NORMAL, ENCABEZADO, FECHA, TITULO = 0, 1, 2, 3

_ESTILOS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/></numFmts>
<fonts count="3">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF070910"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>"""


class Celda:
    """Un valor con estilo propio (el encabezado, el título de un grupo)."""

    __slots__ = ("valor", "estilo")

    def __init__(self, valor: Any, estilo: int = NORMAL):
        self.valor = valor
        self.estilo = estilo


def _letra(col: int) -> str:
    out = ""
    col += 1
    while col:
        col, resto = divmod(col - 1, 26)
        out = chr(65 + resto) + out
    return out


def _celda_xml(ref: str, valor: Any, estilo: int) -> Tuple[str, int]:
    """(xml, ancho aproximado en caracteres)."""
    s = f' s="{estilo}"' if estilo else ""
    if valor is None or valor == "":
        return (f'<c r="{ref}"{s}/>' if estilo else ""), 0
    if isinstance(valor, bool):
        valor = "Sí" if valor else "No"
    if isinstance(valor, (int, float, Decimal)) and not isinstance(valor, bool):
        texto = format(valor, "f") if isinstance(valor, float) else str(valor)
        if isinstance(valor, float):
            texto = texto.rstrip("0").rstrip(".") or "0"
        return f'<c r="{ref}"{s}><v>{texto}</v></c>', len(texto)
    if isinstance(valor, (datetime, date)):
        if not isinstance(valor, datetime):
            valor = datetime(valor.year, valor.month, valor.day)
        delta = valor - _EPOCA
        serial = delta.days + delta.seconds / 86400
        return f'<c r="{ref}" s="{FECHA}"><v>{serial:.10f}</v></c>', 16
    texto = _CONTROL.sub("", str(valor))
    return (
        f'<c r="{ref}"{s} t="inlineStr"><is><t xml:space="preserve">{escape(texto)}</t></is></c>',
        len(texto),
    )


def _hoja_xml(filas: Sequence[Sequence[Any]], congelar: bool) -> str:
    anchos: List[int] = []
    filas_xml = []
    for i, fila in enumerate(filas, start=1):
        celdas = []
        for j, valor in enumerate(fila):
            estilo = NORMAL
            if isinstance(valor, Celda):
                valor, estilo = valor.valor, valor.estilo
            xml, ancho = _celda_xml(f"{_letra(j)}{i}", valor, estilo)
            if xml:
                celdas.append(xml)
            while len(anchos) <= j:
                anchos.append(0)
            if estilo != TITULO:  # el título ocupa la fila y no ensancha la columna
                anchos[j] = max(anchos[j], ancho)
        filas_xml.append(f'<row r="{i}">{"".join(celdas)}</row>')
    cols = "".join(
        f'<col min="{j + 1}" max="{j + 1}" width="{min(max(a + 2, 6), 60)}" customWidth="1"/>'
        for j, a in enumerate(anchos)
    )
    panel = (
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" '
        'activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        if congelar
        else '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"{panel}"
        + (f"<cols>{cols}</cols>" if cols else "")
        + f'<sheetData>{"".join(filas_xml)}</sheetData></worksheet>'
    )


def _nombre_hoja(nombre: str, usados: set) -> str:
    base = " ".join(_PROHIBIDOS_HOJA.sub(" ", nombre or "Hoja").split())[:31] or "Hoja"
    candidato, n = base, 2
    while candidato.lower() in usados:
        sufijo = f" ({n})"
        candidato = base[: 31 - len(sufijo)] + sufijo
        n += 1
    usados.add(candidato.lower())
    return candidato


def escribir(hojas: Iterable[Tuple[str, Sequence[Sequence[Any]], bool]]) -> bytes:
    """Un libro con una hoja por tabla.

    Cada hoja es `(nombre, filas, congelar_encabezado)`. Una fila es una lista
    de valores (texto, número, fecha o `Celda` con estilo). Una lista de hojas
    vacía produce un libro con una hoja en blanco: Excel no abre un libro sin
    hojas.
    """
    hojas = list(hojas) or [("Hoja", [], False)]
    usados: set = set()
    nombres = [_nombre_hoja(n, usados) for n, _, _ in hojas]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            + "".join(
                f'<Override PartName="/xl/worksheets/sheet{i}.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                for i in range(1, len(hojas) + 1)
            )
            + "</Types>",
        )
        z.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>",
        )
        z.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
            + "".join(
                f'<sheet name="{escape(n, {chr(34): "&quot;"})}" sheetId="{i}" r:id="rId{i}"/>'
                for i, n in enumerate(nombres, start=1)
            )
            + "</sheets></workbook>",
        )
        z.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(
                f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>'
                for i in range(1, len(hojas) + 1)
            )
            + f'<Relationship Id="rId{len(hojas) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            "</Relationships>",
        )
        z.writestr("xl/styles.xml", _ESTILOS)
        for i, (_, filas, congelar) in enumerate(hojas, start=1):
            z.writestr(f"xl/worksheets/sheet{i}.xml", _hoja_xml(filas, congelar))
    return buf.getvalue()


def encabezado(*titulos: str) -> List[Celda]:
    return [Celda(t, ENCABEZADO) for t in titulos]


def titulo(texto: str) -> List[Celda]:
    return [Celda(texto, TITULO)]


MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
