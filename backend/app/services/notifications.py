"""Avisos a los capitanes cuando cambia algo que le afecta a su equipo.

El disparador natural es la reprogramación: el organizador mueve la hora o la
cancha de un partido y los dos equipos implicados tienen que enterarse. Como el
producto no depende de un servicio externo de correo o push, el aviso se guarda
en la tabla `notifications` y el panel del capitán lo consulta; el día que haya
push o WhatsApp, este módulo es el único punto que hay que tocar.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import (
    Court,
    Match,
    Notification,
    Stage,
    Team,
    TeamManager,
    Tournament,
    Venue,
)

# Tipos de aviso (el frontend elige icono y color con esta clave).
TIPO_REPROGRAMADO = "partido_reprogramado"
TIPO_CANCHA = "partido_cancha"
TIPO_PROGRAMADO = "partido_programado"
TIPO_RESULTADO = "partido_resultado"
TIPO_EN_VIVO = "partido_en_vivo"
TIPO_APLAZADO = "partido_aplazado"
TIPO_ARBITRO = "partido_arbitro"
TIPO_GENERAL = "general"

_DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
_MESES = (
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
)


def formato_fecha(dt: Optional[datetime]) -> str:
    """`sábado 12 de abril, 15:30` — legible en el aviso, sin librerías extra.

    Los partidos se guardan en UTC; el texto se arma en el huso del campeonato
    (`TIMEZONE_OFFSET_MINUTES`) porque a diferencia del frontend, aquí no hay
    dispositivo del que sacar la zona horaria.
    """
    if not dt:
        return "sin fecha"
    dt = dt + timedelta(minutes=settings.TIMEZONE_OFFSET_MINUTES)
    return (
        f"{_DIAS[dt.weekday()]} {dt.day} de {_MESES[dt.month - 1]}, "
        f"{dt.hour:02d}:{dt.minute:02d}"
    )


def capitanes_de_equipos(db: Session, team_ids: Iterable[Any]) -> Dict[str, List[Any]]:
    """{team_id: [user_id, …]} de los responsables activos de esos equipos."""
    ids = [t for t in team_ids if t]
    if not ids:
        return {}
    destino: Dict[str, List[Any]] = {}
    for link in db.query(TeamManager).filter(TeamManager.team_id.in_(ids)).all():
        destino.setdefault(str(link.team_id), []).append(link.user_id)
    return destino


def _cancha(db: Session, court_id) -> str:
    if not court_id:
        return "sin cancha"
    court = db.query(Court).filter(Court.id == court_id).first()
    if not court:
        return "sin cancha"
    venue = db.query(Venue).filter(Venue.id == court.venue_id).first()
    return f"{venue.name} · {court.name}" if venue else court.name


def _contexto(db: Session, match: Match) -> Dict[str, Any]:
    stage = db.query(Stage).filter(Stage.id == match.stage_id).first()
    torneo = (
        db.query(Tournament).filter(Tournament.id == stage.tournament_id).first()
        if stage
        else None
    )
    nombres = {
        str(t.id): t.name
        for t in db.query(Team)
        .filter(Team.id.in_([i for i in (match.home_team_id, match.away_team_id) if i]))
        .all()
    }
    local = nombres.get(str(match.home_team_id), "Por definir")
    visitante = nombres.get(str(match.away_team_id), "Por definir")
    return {
        "stage": stage,
        "tournament": torneo,
        "local": local,
        "visitante": visitante,
        "enfrentamiento": f"{local} vs {visitante}",
    }


def crear_notificacion(
    db: Session,
    user_id,
    *,
    tipo: str,
    title: str,
    body: str = "",
    team_id=None,
    tournament_id=None,
    match_id=None,
    data: Optional[Dict[str, Any]] = None,
) -> Notification:
    aviso = Notification(
        user_id=user_id,
        team_id=team_id,
        tournament_id=tournament_id,
        match_id=match_id,
        type=tipo,
        title=title,
        body=body,
        data=data or {},
    )
    db.add(aviso)
    return aviso


def _avisar_a_los_dos_equipos(
    db: Session,
    match: Match,
    ctx: Dict[str, Any],
    *,
    tipo: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> int:
    """Crea el mismo aviso para los capitanes del local y del visitante."""
    por_equipo = capitanes_de_equipos(db, [match.home_team_id, match.away_team_id])
    torneo = ctx.get("tournament")
    creados = 0
    for team_id, user_ids in por_equipo.items():
        for user_id in user_ids:
            crear_notificacion(
                db,
                user_id,
                tipo=tipo,
                title=title,
                body=body,
                team_id=team_id,
                tournament_id=torneo.id if torneo else None,
                match_id=match.id,
                data=data,
            )
            creados += 1
    return creados


def notificar_cambio_de_partido(db: Session, match: Match, antes: Dict[str, Any]) -> int:
    """Compara el partido con su estado anterior y avisa lo que cambió.

    `antes` es el diccionario que devuelve `snapshot_partido()` tomado ANTES de
    aplicar los cambios. Devuelve cuántos avisos se crearon (0 si no cambió
    nada relevante), y no hace commit: lo hace el endpoint que lo llama.
    """
    hora_antes, hora_ahora = antes.get("scheduled_start"), match.scheduled_start
    cancha_antes, cancha_ahora = antes.get("court_id"), match.court_id
    cambio_hora = hora_antes != hora_ahora
    cambio_cancha = str(cancha_antes) != str(cancha_ahora)
    if not cambio_hora and not cambio_cancha:
        return 0

    ctx = _contexto(db, match)
    torneo = ctx.get("tournament")
    nombre_torneo = torneo.name if torneo else "el torneo"
    donde = _cancha(db, cancha_ahora)
    cuando = formato_fecha(hora_ahora)
    data = {
        "antes": {
            "fecha": formato_fecha(hora_antes) if hora_antes else None,
            "iso": hora_antes.isoformat() if hora_antes else None,
            "cancha": _cancha(db, cancha_antes) if cancha_antes else None,
        },
        "ahora": {
            "fecha": cuando,
            "iso": hora_ahora.isoformat() if hora_ahora else None,
            "cancha": donde,
        },
        "enfrentamiento": ctx["enfrentamiento"],
        "torneo": nombre_torneo,
    }

    if cambio_hora and hora_antes is None:
        # Primera programación: no es un aplazamiento, es "ya hay calendario".
        return _avisar_a_los_dos_equipos(
            db, match, ctx,
            tipo=TIPO_PROGRAMADO,
            title=f"Partido programado: {ctx['enfrentamiento']}",
            body=f"{nombre_torneo} · {cuando} en {donde}.",
            data=data,
        )
    if cambio_hora:
        aplazado = hora_ahora is None or (
            hora_antes is not None and hora_ahora > hora_antes
        )
        title = (
            f"Partido {'aplazado' if aplazado else 'adelantado'}: "
            f"{ctx['enfrentamiento']}"
        )
        detalle = (
            f"Pasa del {formato_fecha(hora_antes)} al {cuando}."
            if hora_ahora
            else f"Se quitó del calendario (estaba el {formato_fecha(hora_antes)})."
        )
        if cambio_cancha:
            detalle += f" Nueva cancha: {donde}."
        return _avisar_a_los_dos_equipos(
            db, match, ctx,
            tipo=TIPO_REPROGRAMADO,
            title=title,
            body=f"{nombre_torneo} · {detalle}",
            data=data,
        )
    return _avisar_a_los_dos_equipos(
        db, match, ctx,
        tipo=TIPO_CANCHA,
        title=f"Cambio de cancha: {ctx['enfrentamiento']}",
        body=(
            f"{nombre_torneo} · {cuando}. Se juega en {donde}"
            + (f" (antes {_cancha(db, cancha_antes)})." if cancha_antes else ".")
        ),
        data=data,
    )


def notificar_estado_de_partido(db: Session, match: Match, antes: Dict[str, Any]) -> int:
    """Avisa el arranque y el resultado final del partido."""
    estado_antes = antes.get("status")
    estado_ahora = match.status.value if hasattr(match.status, "value") else match.status
    estado_antes = (
        estado_antes.value if hasattr(estado_antes, "value") else estado_antes
    )
    if estado_antes == estado_ahora:
        return 0

    ctx = _contexto(db, match)
    torneo = ctx.get("tournament")
    nombre_torneo = torneo.name if torneo else "el torneo"
    if estado_ahora == "live":
        return _avisar_a_los_dos_equipos(
            db, match, ctx,
            tipo=TIPO_EN_VIVO,
            title=f"Empieza el partido: {ctx['enfrentamiento']}",
            body=f"{nombre_torneo} · {_cancha(db, match.court_id)}.",
            data={"enfrentamiento": ctx["enfrentamiento"]},
        )
    if estado_ahora == "postponed":
        # Aplazado no es lo mismo que reprogramado: todavía no hay fecha nueva,
        # y para el capitán la diferencia es si el domingo juega o no.
        return _avisar_a_los_dos_equipos(
            db, match, ctx,
            tipo=TIPO_APLAZADO,
            title=f"Partido aplazado: {ctx['enfrentamiento']}",
            body=(
                f"{nombre_torneo} · el partido del {formato_fecha(match.scheduled_start)} "
                "no se juega. Te avisamos cuando tenga fecha nueva."
            ),
            data={"enfrentamiento": ctx["enfrentamiento"]},
        )
    if estado_ahora == "finished":
        marcador = f"{match.home_score or 0} - {match.away_score or 0}"
        # W.O.: el resultado existe pero el partido no se jugó, y el capitán
        # tiene que enterarse de eso y no solo del marcador.
        if match.walkover == "both":
            detalle = "no se presentó ninguno de los dos equipos (doble W.O.)."
        elif match.walkover:
            ausente = ctx["local"] if match.walkover == "home" else ctx["visitante"]
            detalle = f"{ausente} no se presentó (W.O.)."
        else:
            detalle = "partido finalizado."
        return _avisar_a_los_dos_equipos(
            db, match, ctx,
            tipo=TIPO_RESULTADO,
            title=f"Resultado: {ctx['local']} {marcador} {ctx['visitante']}",
            body=f"{nombre_torneo} · {detalle}",
            data={
                "marcador": marcador,
                "enfrentamiento": ctx["enfrentamiento"],
                "walkover": match.walkover,
            },
        )
    return 0


def snapshot_partido(match: Match) -> Dict[str, Any]:
    """Foto de los campos que disparan aviso, para comparar después del cambio."""
    return {
        "scheduled_start": match.scheduled_start,
        "court_id": match.court_id,
        "status": match.status,
        "referee_id": match.referee_id,
    }
