"""Correo saliente. Hoy solo lo usa la recuperación de contraseña.

La plataforma nunca dependió de un servicio de correo: el soporte reseteaba la
clave a mano y le dictaba una temporal al usuario. Eso funciona con veinte
cuentas y deja de funcionar con doscientas, así que aquí está la salida —
`smtplib` de la librería estándar, sin dependencia nueva.

**Si no hay SMTP configurado, no falla: no envía.** `SMTP_HOST` vacío deja la
plataforma exactamente como estaba, y el endpoint que pide el enlace responde
igual que siempre (nunca revela si la cuenta existe, así que tampoco puede
revelar que el correo no salió).
"""
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.core.config import settings
from app.core.log import logger


def correo_configurado() -> bool:
    """Sin servidor no hay envío; todo lo demás tiene valor por defecto."""
    return bool(settings.SMTP_HOST)


def remitente() -> str:
    return settings.SMTP_FROM or settings.SMTP_USER or "no-reply@championhive.app"


def enviar_correo(
    destino: str, asunto: str, texto: str, html: Optional[str] = None
) -> bool:
    """Manda un correo. Devuelve si salió; nunca lanza.

    Quien lo llama está atendiendo una petición web y no puede caerse porque el
    servidor de correo esté lento o mal configurado.
    """
    if not correo_configurado():
        logger.warning("correo sin enviar (SMTP no configurado): «%s»", asunto)
        return False
    mensaje = EmailMessage()
    mensaje["Subject"] = asunto
    mensaje["From"] = remitente()
    mensaje["To"] = destino
    mensaje.set_content(texto)
    if html:
        mensaje.add_alternative(html, subtype="html")
    try:
        # El puerto 465 es SSL directo; el 587 (y el resto) abren en claro y
        # suben a TLS con STARTTLS, que es lo que piden Gmail y compañía.
        if settings.SMTP_PORT == 465:
            servidor = smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=15
            )
        else:
            servidor = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        with servidor as s:
            if settings.SMTP_PORT != 465 and settings.SMTP_STARTTLS:
                s.starttls()
            if settings.SMTP_USER:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.send_message(mensaje)
        logger.info("correo enviado a %s: «%s»", destino, asunto)
        return True
    except Exception:  # noqa: BLE001 - el envío es best-effort
        logger.exception("falló el envío de correo a %s: «%s»", destino, asunto)
        return False


def enviar_recuperacion(destino: str, nombre: Optional[str], enlace: str) -> bool:
    """El correo con el enlace para poner una contraseña nueva."""
    minutos = settings.RESET_TOKEN_MINUTES
    saludo = f"Hola {nombre}," if nombre else "Hola,"
    texto = (
        f"{saludo}\n\n"
        "Pediste recuperar el acceso a tu cuenta de Champion Hive.\n"
        "Abre este enlace para poner una contraseña nueva:\n\n"
        f"{enlace}\n\n"
        f"El enlace sirve una sola vez y vence en {minutos} minutos.\n"
        "Si no fuiste tú, ignora este correo: tu contraseña sigue igual.\n\n"
        "Champion Hive"
    )
    html = (
        '<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0f172a">'
        f"<p>{saludo}</p>"
        "<p>Pediste recuperar el acceso a tu cuenta de <b>Champion Hive</b>.</p>"
        f'<p><a href="{enlace}" style="display:inline-block;background:#16a34a;'
        'color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;'
        'font-weight:600">Poner una contraseña nueva</a></p>'
        f"<p style='color:#475569;font-size:13px'>El enlace sirve una sola vez y "
        f"vence en {minutos} minutos. Si no fuiste tú, ignora este correo: tu "
        "contraseña sigue igual.</p>"
        f"<p style='color:#94a3b8;font-size:12px'>{enlace}</p>"
        "</div>"
    )
    return enviar_correo(destino, "Recupera tu contraseña · Champion Hive", texto, html)
