"""Espejo opcional de los clips en Contentful.

**Viene apagado.** Sin `CONTENTFUL_ENABLED` (y sin espacio y token) este módulo
no hace nada y la plataforma funciona completa sirviendo el video desde disco.
Es la misma regla que el correo: si no está configurado NO falla, no sube. Eso
es a propósito y no una comodidad técnica — una liga de barrio no tiene por qué
contratar un CDN para publicar el gol del domingo, y quien sí lo tiene gana que
el video salga desde la red de Contentful y no desde el disco del servidor.

Se habla con la Content Management API por `urllib` de la librería estándar,
sin dependencia nueva, por lo mismo que `services/correo.py` usa `smtplib`.

Subir un asset a Contentful son cinco pasos, no uno (la API los separa porque
el procesamiento del video es asíncrono):

1. `POST /uploads` con los bytes      → queda un upload temporal
2. `POST /assets` apuntando al upload → nace el asset, sin archivo todavía
3. `PUT  /assets/{id}/files/{loc}/process` → Contentful procesa el video
4. `GET  /assets/{id}` hasta que aparezca la URL (el paso 3 no es inmediato)
5. `PUT  /assets/{id}/published`      → queda público en el CDN

Por eso el espejo corre en una tarea de fondo y no dentro de la petición: son
cinco viajes más el tiempo de procesamiento, y el organizador que acaba de
subir un clip de 30 MB desde la tribuna no puede quedarse esperando a que un
CDN ajeno responda.
"""
import json
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.log import logger

API = "https://api.contentful.com"
UPLOAD = "https://upload.contentful.com"

# Cuántas veces se pregunta si el video ya se procesó, y cada cuánto. Un clip
# corto tarda unos segundos; el tope es para no dejar la tarea colgada si
# Contentful nunca termina.
INTENTOS_PROCESO = 20
ESPERA_PROCESO = 1.5
TIMEOUT = 60


def contentful_configurado() -> bool:
    """Sin las tres cosas no hay espejo, y eso es un estado válido."""
    return bool(
        settings.CONTENTFUL_ENABLED
        and settings.CONTENTFUL_SPACE_ID
        and settings.CONTENTFUL_MANAGEMENT_TOKEN
    )


def estado() -> Dict[str, Any]:
    """Lo que el panel necesita para decidir si muestra el botón."""
    return {
        "enabled": bool(settings.CONTENTFUL_ENABLED),
        "configured": contentful_configurado(),
        "space_id": settings.CONTENTFUL_SPACE_ID or None,
        "environment": settings.CONTENTFUL_ENVIRONMENT,
    }


def _base() -> str:
    return (
        f"{API}/spaces/{settings.CONTENTFUL_SPACE_ID}"
        f"/environments/{settings.CONTENTFUL_ENVIRONMENT}"
    )


def _pedir(
    url: str,
    metodo: str = "GET",
    cuerpo: Optional[bytes] = None,
    tipo: Optional[str] = None,
    version: Optional[int] = None,
) -> Dict[str, Any]:
    """Una llamada a la API. Devuelve el JSON, o {} si la respuesta no trae."""
    cabeceras = {
        "Authorization": f"Bearer {settings.CONTENTFUL_MANAGEMENT_TOKEN}",
    }
    if tipo:
        cabeceras["Content-Type"] = tipo
    if version is not None:
        cabeceras["X-Contentful-Version"] = str(version)
    peticion = urllib.request.Request(
        url, data=cuerpo, headers=cabeceras, method=metodo
    )
    with urllib.request.urlopen(peticion, timeout=TIMEOUT) as respuesta:
        crudo = respuesta.read()
    return json.loads(crudo) if crudo else {}


def _locale() -> str:
    return settings.CONTENTFUL_LOCALE or "en-US"


def subir_asset(
    ruta_archivo,
    nombre: str,
    content_type: str,
    titulo: str,
    descripcion: str = "",
) -> Optional[Dict[str, str]]:
    """Sube el archivo y lo deja publicado. Devuelve {id, url} o None.

    Nunca lanza: quien llama ya guardó el clip en disco y la jugada existe con
    o sin espejo. Un fallo del CDN no puede hacer desaparecer la jugada.
    """
    if not contentful_configurado():
        logger.info("contentful desactivado: el clip «%s» no se espeja", titulo)
        return None
    locale = _locale()
    try:
        # 1. Los bytes. Se manda el archivo abierto, no leído a memoria: son
        # decenas de MB y urllib sabe transmitir un objeto con read().
        with open(ruta_archivo, "rb") as f:
            upload = _pedir(
                f"{UPLOAD}/spaces/{settings.CONTENTFUL_SPACE_ID}/uploads",
                "POST",
                cuerpo=f,
                tipo="application/octet-stream",
            )
        upload_id = (upload.get("sys") or {}).get("id")
        if not upload_id:
            logger.error("contentful: el upload no devolvió id (%s)", titulo)
            return None

        # 2. El asset, que todavía no tiene archivo procesado.
        cuerpo = {
            "fields": {
                "title": {locale: titulo[:255]},
                "description": {locale: (descripcion or "")[:500]},
                "file": {
                    locale: {
                        "contentType": content_type,
                        "fileName": nombre,
                        "uploadFrom": {
                            "sys": {
                                "type": "Link",
                                "linkType": "Upload",
                                "id": upload_id,
                            }
                        },
                    }
                },
            }
        }
        asset = _pedir(
            f"{_base()}/assets",
            "POST",
            cuerpo=json.dumps(cuerpo).encode(),
            tipo="application/vnd.contentful.management.v1+json",
        )
        asset_id = (asset.get("sys") or {}).get("id")
        version = (asset.get("sys") or {}).get("version")
        if not asset_id:
            logger.error("contentful: el asset no devolvió id (%s)", titulo)
            return None

        # 3. Procesar el archivo (responde 204 y sigue trabajando por detrás).
        _pedir(
            f"{_base()}/assets/{asset_id}/files/{locale}/process",
            "PUT",
            version=version,
        )

        # 4. Esperar a que la URL exista. El paso anterior es asíncrono: sin
        # esta espera se publicaría un asset sin archivo.
        url = None
        for _ in range(INTENTOS_PROCESO):
            time.sleep(ESPERA_PROCESO)
            asset = _pedir(f"{_base()}/assets/{asset_id}")
            version = (asset.get("sys") or {}).get("version", version)
            archivo = ((asset.get("fields") or {}).get("file") or {}).get(locale) or {}
            if archivo.get("url"):
                url = archivo["url"]
                break
        if not url:
            logger.error(
                "contentful: el video «%s» no terminó de procesarse (asset %s)",
                titulo,
                asset_id,
            )
            return None

        # 5. Publicar. Sin esto la URL existe pero no se sirve al público.
        _pedir(f"{_base()}/assets/{asset_id}/published", "PUT", version=version)

        # Contentful devuelve la URL sin esquema («//videos.ctfassets.net/…»),
        # que en un <video src> funciona pero no al compartirla por fuera.
        if url.startswith("//"):
            url = "https:" + url
        logger.info("contentful: clip «%s» publicado en %s", titulo, url)
        return {"id": asset_id, "url": url}
    except urllib.error.HTTPError as e:
        detalle = ""
        try:
            detalle = e.read().decode("utf-8", "replace")[:500]
        except Exception:  # noqa: BLE001
            pass
        logger.error(
            "contentful rechazó el clip «%s»: %s %s", titulo, e.code, detalle
        )
        return None
    except Exception:  # noqa: BLE001 - el espejo es best-effort
        logger.exception("falló el espejo del clip «%s» en contentful", titulo)
        return None


def espejar_jugada(highlight_id) -> None:
    """Sube a Contentful el clip de una jugada ya guardada y anota el resultado.

    Corre en una tarea de fondo, así que abre su propia sesión: la del endpoint
    ya se cerró cuando esto arranca. No lanza nunca.
    """
    if not contentful_configurado():
        return
    # Importación local: este módulo lo importa el router, y traer la base
    # arriba crearía un ciclo al revés del que ya existe.
    from app.db.database import SessionLocal
    from app.db.models import MatchHighlight
    from app.services import media

    db = SessionLocal()
    try:
        fila = (
            db.query(MatchHighlight)
            .filter(MatchHighlight.id == highlight_id)
            .first()
        )
        if not fila or not fila.media_path:
            return
        ruta = media.ruta_absoluta(fila.media_path)
        if not ruta or not ruta.exists():
            logger.warning(
                "contentful: la jugada %s no tiene archivo en disco", highlight_id
            )
            return
        resultado = subir_asset(
            ruta,
            ruta.name,
            fila.mime_type or "video/mp4",
            fila.title or "Mejor jugada",
            descripcion="Champion Hive",
        )
        if not resultado:
            return
        fila.external_id = resultado["id"]
        fila.external_url = resultado["url"]
        db.commit()
    except Exception:  # noqa: BLE001
        logger.exception("no se pudo espejar la jugada %s", highlight_id)
    finally:
        db.close()
