"""Rastro de quién cambió qué: el historial del campeonato.

El marcador de un partido es una columna que se sobrescribe, así que hasta
ahora «alguien me cambió un resultado» no tenía respuesta: ni quién, ni cuándo,
ni qué decía antes. Cada escritura que puede terminar en discusión —el
marcador, un evento corregido, la planilla, la sanción de puntos, una
reprogramación, un reseteo de contraseña— deja aquí una línea con el actor, el
valor anterior y una frase lista para leer.

Tres decisiones de este módulo:

- **Armar el rastro no puede tumbar la operación.** Si algo falla al construir
  la fila, el gol igual se guarda: el fallo va al log y se sigue. Un historial
  que tumba el registro en vivo un domingo es peor que no tener historial.
- **Va en la misma transacción que el cambio**, a propósito: así el rastro
  existe si y solo si el cambio ocurrió. Un historial en transacción aparte
  terminaría anotando cosas que se revirtieron, que es peor que no anotarlas.
- **Escribe en los dos lados.** La base responde desde el panel; el log por
  stdout sobrevive a que la base se pierda o a que el commit no llegue.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.log import logger
from app.db.models import AuditLog, User

# Tipos de acción. La clave viaja al frontend, que elige icono y color.
ACCION_MARCADOR = "marcador"
ACCION_EVENTO = "evento"
ACCION_PLANILLA = "planilla"
ACCION_PROGRAMACION = "programacion"
ACCION_SANCION = "sancion"
ACCION_CUENTA = "cuenta"
ACCION_TORNEO = "torneo"

ACCION_LABELS: Dict[str, str] = {
    ACCION_MARCADOR: "Marcador y estado",
    ACCION_EVENTO: "Eventos del partido",
    ACCION_PLANILLA: "Planilla",
    ACCION_PROGRAMACION: "Programación",
    ACCION_SANCION: "Sanciones",
    ACCION_CUENTA: "Cuentas",
    ACCION_TORNEO: "Torneo",
}


def _plano(valor: Any) -> Any:
    """Deja el valor listo para la columna JSON (UUID y fechas no lo están)."""
    if isinstance(valor, (UUID,)):
        return str(valor)
    if isinstance(valor, datetime):
        return valor.isoformat()
    if isinstance(valor, dict):
        return {k: _plano(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [_plano(v) for v in valor]
    if hasattr(valor, "value"):  # enums (MatchStatus, SportType…)
        return valor.value
    return valor


def diferencias(antes: Dict[str, Any], despues: Dict[str, Any]) -> Dict[str, Any]:
    """`{campo: {antes, despues}}` solo con los campos que cambiaron.

    Guardar el objeto entero llenaría el historial de ruido: lo que se lee es
    «el marcador pasó de 1-0 a 2-0», no las veinte columnas del partido.
    """
    out: Dict[str, Any] = {}
    for campo, nuevo in despues.items():
        previo = _plano(antes.get(campo))
        nuevo = _plano(nuevo)
        if previo != nuevo:
            out[campo] = {"antes": previo, "despues": nuevo}
    return out


def registrar(
    db: Session,
    actor: Optional[User],
    accion: str,
    *,
    resumen: str,
    tournament_id: Any = None,
    match_id: Any = None,
    team_id: Any = None,
    datos: Optional[Dict[str, Any]] = None,
) -> Optional[AuditLog]:
    """Anota un cambio. No hace commit: lo hace el endpoint que lo llama.

    Devuelve la fila creada, o None si algo falló al anotarla — y en ese caso
    la operación auditada sigue su curso igual.
    """
    email = getattr(actor, "email", None)
    try:
        fila = AuditLog(
            created_at=datetime.utcnow(),
            user_id=getattr(actor, "id", None),
            user_email=email,
            user_role=getattr(actor, "role", None),
            action=accion,
            tournament_id=tournament_id,
            match_id=match_id,
            team_id=team_id,
            summary=resumen,
            data=_plano(datos or {}),
        )
        db.add(fila)
        logger.info("auditoria %s | %s | %s", accion, email or "sistema", resumen)
        return fila
    except Exception:  # noqa: BLE001 - el rastro no puede tumbar la operación
        logger.exception(
            "no se pudo anotar la auditoria (%s | %s | %s)", accion, email, resumen
        )
        return None


def historial(
    db: Session,
    *,
    tournament_id: Any = None,
    solo_plataforma: bool = False,
    match_id: Any = None,
    accion: Optional[str] = None,
    limite: int = 200,
) -> List[Dict[str, Any]]:
    """Lee el rastro, de lo más nuevo a lo más viejo.

    `solo_plataforma` trae lo que no cuelga de ningún torneo (altas de cuentas,
    reseteos de contraseña), que es lo que mira el superadministrador.
    """
    q = db.query(AuditLog)
    if solo_plataforma:
        q = q.filter(AuditLog.tournament_id.is_(None))
    elif tournament_id is not None:
        q = q.filter(AuditLog.tournament_id == tournament_id)
    if match_id is not None:
        q = q.filter(AuditLog.match_id == match_id)
    if accion:
        q = q.filter(AuditLog.action == accion)
    filas = q.order_by(AuditLog.created_at.desc()).limit(max(1, min(limite, 500))).all()
    return [
        {
            "id": str(f.id),
            "created_at": f.created_at,
            "user_id": str(f.user_id) if f.user_id else None,
            "user_email": f.user_email,
            "user_role": f.user_role,
            "action": f.action,
            "action_label": ACCION_LABELS.get(f.action, f.action),
            "tournament_id": str(f.tournament_id) if f.tournament_id else None,
            "match_id": str(f.match_id) if f.match_id else None,
            "team_id": str(f.team_id) if f.team_id else None,
            "summary": f.summary,
            "data": f.data or {},
        }
        for f in filas
    ]
