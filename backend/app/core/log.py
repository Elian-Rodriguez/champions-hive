"""Log de la aplicación.

Hasta ahora el backend no escribía una sola línea propia: lo único que quedaba
de un domingo entero era el log de acceso de uvicorn, donde un `PUT /status
200` no dice quién cambió qué. Este módulo configura el logger y `services/
auditoria.py` escribe por él además de en la base, para que el rastro exista en
los dos lados: la base responde "quién cambió este marcador" desde el panel, y
stdout (que es lo que recoge docker/supervisor) sobrevive aunque la base se
pierda o el commit se caiga.
"""
import logging
import sys

logger = logging.getLogger("champion_hive")

_FORMATO = "%(asctime)s %(levelname)-7s %(name)s | %(message)s"
_FECHA = "%Y-%m-%d %H:%M:%S"


def configurar_logging(nivel: str = "INFO") -> None:
    """Deja el logger escribiendo por stdout, una sola vez.

    Se llama al arrancar la app. Es idempotente porque en desarrollo el
    recargador de uvicorn vuelve a importar el módulo y si no, cada línea
    saldría repetida.
    """
    if logger.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_FORMATO, datefmt=_FECHA))
    logger.addHandler(handler)
    logger.setLevel(getattr(logging, str(nivel).upper(), logging.INFO))
    # El log propio no se propaga al root para no salir dos veces cuando
    # uvicorn ya tiene su propio handler configurado.
    logger.propagate = False
