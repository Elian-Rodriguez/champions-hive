"""Archivos en disco: hoy, los clips de las mejores jugadas.

**Por qué esto no se parece a los escudos.** El escudo del equipo se guarda
dentro de la base como data URI a propósito (pesa 2-10 KB, viaja con el backup
y entra a un canvas sin CORS, que es lo que necesita el acta). Un clip de
veinte segundos pesa entre 3 y 30 MB: meterlo en una columna sería un backup
inmanejable y una consulta que se trae el video entero para listar una grilla.
Así que el archivo va a disco bajo `MEDIA_ROOT` y la base guarda la ficha.

Tres cosas que este módulo cuida porque el archivo se sirve de vuelta desde el
mismo origen que la aplicación:

- **El nombre lo pone el servidor**, nunca el cliente: un uuid más una
  extensión de la lista blanca. Un `../../etc/passwd` como nombre de archivo no
  llega a ninguna parte porque el nombre que mandó el navegador se descarta.
- **La extensión decide el Content-Type** con que se sirve, así que no puede
  salir de lo que mandó el usuario. Si saliera, un .html subido como video se
  serviría como html en nuestro propio dominio, que es un XSS almacenado.
- **Se miran los primeros bytes.** Un .exe renombrado a .mp4 pasa cualquier
  comprobación de extensión; el contenedor real se reconoce por su firma.

El tope de tamaño se aplica MIENTRAS se escribe, no al final: comprobarlo
después de guardar significa haber escrito ya el archivo de 2 GB en el disco.
"""
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple

from app.core.config import settings
from app.core.log import logger

# Carpeta de los clips dentro de MEDIA_ROOT. Separada para que mañana otra
# cosa (audios, actas firmadas) no se mezcle con los videos.
CARPETA_JUGADAS = "jugadas"

# Contenedores que acepta. El .mov está porque es lo que graba un iPhone y es
# la mitad de los videos que va a recibir esto; el .mp4 es lo que graba Android
# y lo único que reproduce cualquier navegador sin discusión.
EXTENSION_POR_TIPO = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/x-m4v": ".mp4",
}

# Firmas de los contenedores aceptados. mp4/mov/m4v son ISO-BMFF: llevan
# "ftyp" en el byte 4. webm (y mkv) empiezan con la cabecera de EBML. ogg
# empieza por "OggS".
_FIRMA_ISOBMFF = b"ftyp"
_FIRMA_EBML = b"\x1a\x45\xdf\xa3"
_FIRMA_OGG = b"OggS"

# Cuánto se lee de una vez. 1 MB: suficiente para que subir 30 MB no sean
# treinta mil vueltas, y poco para no cargarse la memoria con varias subidas
# simultáneas.
TROZO = 1024 * 1024


def raiz() -> Path:
    """Carpeta base de los archivos, creada si no existe."""
    base = Path(settings.MEDIA_ROOT).expanduser().resolve()
    base.mkdir(parents=True, exist_ok=True)
    return base


def max_bytes() -> int:
    return max(1, int(settings.MAX_VIDEO_MB)) * 1024 * 1024


def ruta_absoluta(relativa: Optional[str]) -> Optional[Path]:
    """Resuelve una ruta guardada en la base, sin dejar salir de MEDIA_ROOT.

    La ruta sale de nuestra propia base, pero igual se comprueba: una fila
    editada a mano o una migración mal hecha no pueden terminar en un
    `os.remove` fuera de la carpeta de archivos.
    """
    if not relativa:
        return None
    base = raiz()
    destino = (base / str(relativa).lstrip("/")).resolve()
    try:
        destino.relative_to(base)
    except ValueError:
        logger.warning("ruta de archivo fuera de MEDIA_ROOT, ignorada: %s", relativa)
        return None
    return destino


def _firma_valida(cabecera: bytes, extension: str) -> bool:
    """Si los primeros bytes son del contenedor que dice la extensión."""
    if extension in (".mp4", ".mov"):
        return _FIRMA_ISOBMFF in cabecera[:16]
    if extension == ".webm":
        return cabecera.startswith(_FIRMA_EBML)
    if extension == ".ogv":
        return cabecera.startswith(_FIRMA_OGG)
    return False


def extension_de(content_type: Optional[str], nombre: Optional[str]) -> Optional[str]:
    """Extensión que le toca al archivo, o None si el tipo no se acepta.

    Se mira primero el Content-Type que declaró el navegador y, si no sirve
    (hay clientes que mandan application/octet-stream), la extensión del nombre
    original — pero solo para ELEGIR de la lista blanca, nunca para copiarla.
    """
    tipo = (content_type or "").split(";")[0].strip().lower()
    if tipo in EXTENSION_POR_TIPO:
        return EXTENSION_POR_TIPO[tipo]
    sufijo = Path(nombre or "").suffix.lower()
    if sufijo in (".mp4", ".m4v"):
        return ".mp4"
    if sufijo == ".mov":
        return ".mov"
    if sufijo == ".webm":
        return ".webm"
    if sufijo in (".ogv", ".ogg"):
        return ".ogv"
    return None


class ArchivoRechazado(Exception):
    """El archivo no se puede guardar; el mensaje va tal cual al organizador."""


def guardar_video(archivo, content_type: Optional[str] = None) -> Tuple[str, int, str]:
    """Guarda el clip y devuelve (ruta relativa, bytes, extensión).

    `archivo` es el `UploadFile` de FastAPI (cualquier objeto con `.file`,
    `.filename` y `.content_type` sirve). Lanza `ArchivoRechazado` con una
    frase lista para mostrar.
    """
    extension = extension_de(content_type or getattr(archivo, "content_type", None),
                             getattr(archivo, "filename", None))
    if not extension:
        raise ArchivoRechazado(
            "El archivo no es un video admitido. Sube un MP4, MOV o WEBM "
            "(el MP4 es el que reproduce cualquier teléfono)."
        )

    tope = max_bytes()
    destino_rel = f"{CARPETA_JUGADAS}/{uuid.uuid4().hex}{extension}"
    destino = raiz() / destino_rel
    destino.parent.mkdir(parents=True, exist_ok=True)

    fuente = getattr(archivo, "file", archivo)
    escritos = 0
    cabecera = b""
    try:
        with open(destino, "wb") as salida:
            while True:
                trozo = fuente.read(TROZO)
                if not trozo:
                    break
                if not cabecera:
                    cabecera = trozo[:32]
                    # Se comprueba la firma con el primer trozo y se corta ahí:
                    # no tiene sentido escribir 30 MB de un archivo que no es
                    # un video.
                    if not _firma_valida(cabecera, extension):
                        raise ArchivoRechazado(
                            "El archivo no parece un video (su contenido no "
                            "coincide con la extensión). Vuelve a exportarlo "
                            "desde la galería del teléfono."
                        )
                escritos += len(trozo)
                if escritos > tope:
                    raise ArchivoRechazado(
                        f"El clip supera los {settings.MAX_VIDEO_MB} MB. "
                        "Recórtalo a la jugada: diez o quince segundos bastan."
                    )
                salida.write(trozo)
        if not escritos:
            raise ArchivoRechazado("El archivo llegó vacío; vuelve a intentarlo.")
    except ArchivoRechazado:
        borrar(destino_rel)
        raise
    except Exception:  # noqa: BLE001 - disco lleno, permisos, conexión cortada
        borrar(destino_rel)
        logger.exception("no se pudo guardar el video en %s", destino)
        raise ArchivoRechazado(
            "No se pudo guardar el video en el servidor. Inténtalo de nuevo."
        )
    logger.info("video guardado | %s | %d bytes", destino_rel, escritos)
    return destino_rel, escritos, extension


def borrar(relativa: Optional[str]) -> None:
    """Borra un archivo. Nunca lanza: perder el archivo no puede tumbar el
    borrado de la fila, y una fila que apunta a un archivo que no está es un
    problema menor que una jugada que no se puede borrar."""
    destino = ruta_absoluta(relativa)
    if not destino:
        return
    try:
        os.remove(destino)
    except FileNotFoundError:
        pass
    except Exception:  # noqa: BLE001
        logger.exception("no se pudo borrar el archivo %s", destino)


def url_publica(relativa: Optional[str]) -> Optional[str]:
    """URL con la que el navegador pide el archivo.

    Cuelga de /api/v1 a propósito y no de una ruta propia: así la sirve el
    mismo `location /api/` que ya tiene nginx delante y el mismo proxy del
    servidor de desarrollo de Vite, sin un archivo de configuración más que
    alguien tenga que recordar al desplegar.
    """
    if not relativa:
        return None
    return f"/api/v1/media/{str(relativa).lstrip('/')}"
