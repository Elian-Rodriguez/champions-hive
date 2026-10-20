"""El gobierno del campeonato: sanciones del comité, informe arbitral y reclamos.

La suspensión por acumulación (`services/disciplina.py`) era lo único que la
plataforma sabía del reglamento, y es la parte que menos discusión genera: tres
amarillas son tres amarillas. Lo que de verdad se discute un martes en el
comité es otra cosa —la agresión del minuto 70, la alineación indebida, el
resultado que un equipo no acepta— y eso vivía en papel y en WhatsApp. Aquí
están los tres eslabones de esa cadena:

1. **El informe arbitral** (`MatchReport`): el árbitro deja constancia de las
   incidencias y lo firma. Firmado, ya no lo toca: solo el organizador lo
   reabre, y queda en el historial.
2. **La sanción manual** (`PlayerSanction`): el comité decide fechas y motivo,
   opcionalmente colgando de una incidencia del informe. Sale en la misma lista
   que las automáticas y la planilla del árbitro la marca igual.
3. **El reclamo** (`Claim`): el equipo reclama con el clip como prueba y el
   organizador resuelve. La resolución se publica solo si él lo decide.

Los catálogos viven aquí (como `JUGADAS_POR_DEPORTE` en `strategy.py`) y su
mitad del frontend en `utils/gobierno.ts`, con las etiquetas.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.db.models import (
    Claim,
    Match,
    MatchHighlight,
    MatchReport,
    Player,
    PlayerSanction,
    Stage,
    Team,
    TeamPlayer,
    Tournament,
    TournamentTeam,
    User,
)
from app.services.disciplina import _partidos_del_torneo, estado_de_sancion
from app.services.notifications import capitanes_de_equipos, crear_notificacion

# Qué puede anotar el árbitro. `otro` existe por lo mismo que la jugada `OTRA`:
# la incidencia que no encaja siempre aparece, y rechazarla es peor que
# guardarla en un cajón genérico.
INCIDENCIAS: Dict[str, str] = {
    "agresion": "Agresión",
    "conducta_antideportiva": "Conducta antideportiva",
    "insulto_arbitro": "Insultos al árbitro",
    "alineacion_indebida": "Alineación indebida",
    "invasion": "Invasión de campo / público",
    "retraso": "Retraso o falta de presentación",
    "lesion": "Lesión",
    "instalaciones": "Instalaciones o seguridad",
    "otro": "Otra incidencia",
}

TIPOS_RECLAMO: Dict[str, str] = {
    "resultado": "Resultado del partido",
    "alineacion_indebida": "Alineación indebida",
    "arbitraje": "Arbitraje",
    "sancion": "Apelación de una sanción",
    "otro": "Otro",
}

RECLAMO_ABIERTO = "open"
RECLAMO_EN_REVISION = "in_review"
RECLAMO_ACEPTADO = "accepted"
RECLAMO_RECHAZADO = "rejected"
RECLAMO_RETIRADO = "withdrawn"
RECLAMO_PENDIENTE = (RECLAMO_ABIERTO, RECLAMO_EN_REVISION)
RECLAMO_RESUELTO = (RECLAMO_ACEPTADO, RECLAMO_RECHAZADO)

ESTADO_RECLAMO: Dict[str, str] = {
    RECLAMO_ABIERTO: "Recibido",
    RECLAMO_EN_REVISION: "En revisión",
    RECLAMO_ACEPTADO: "Aceptado",
    RECLAMO_RECHAZADO: "Rechazado",
    RECLAMO_RETIRADO: "Retirado",
}

SANCION_ACTIVA = "active"
SANCION_ANULADA = "annulled"

# Topes defensivos: un informe de cincuenta incidencias no es un informe, y una
# suspensión de más de cincuenta fechas es un dedo pegado en el teclado (la
# expulsión del torneo se hace dando de baja al jugador).
MAX_INCIDENCIAS = 50
MAX_FECHAS = 50
MAX_TEXTO = 2000

# Tipos de aviso (el frontend elige icono y color con esta clave).
TIPO_SANCION = "sancion_jugador"
TIPO_INFORME = "informe_arbitral"
TIPO_RECLAMO_NUEVO = "reclamo_nuevo"
TIPO_RECLAMO_RESUELTO = "reclamo_resuelto"


class Invalido(ValueError):
    """Dato rechazado; el mensaje va tal cual a la pantalla."""


# --------------------------------------------------------------------------- #
#  Lecturas comunes
# --------------------------------------------------------------------------- #
def torneo_del_partido(db: Session, match: Match) -> Optional[Tournament]:
    stage = db.query(Stage).filter(Stage.id == match.stage_id).first()
    if not stage:
        return None
    return db.query(Tournament).filter(Tournament.id == stage.tournament_id).first()


def partido_del_torneo(db: Session, torneo: Tournament, match_id) -> Optional[Match]:
    """El partido, verificando que sea de ESE torneo (si no, 400 y no 404: el
    id existe, pero mezclar campeonatos es un error de quien lo manda)."""
    if not match_id:
        return None
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise Invalido("El partido no existe")
    stage = db.query(Stage).filter(Stage.id == match.stage_id).first()
    if not stage or str(stage.tournament_id) != str(torneo.id):
        raise Invalido("Ese partido no es de este campeonato")
    return match


def rotulos_de_partidos(db: Session, matches: Iterable[Match]) -> Dict[str, str]:
    """{match_id: «Local vs Visitante»} con una sola consulta de equipos."""
    lista = [m for m in matches if m]
    ids = {t for m in lista for t in (m.home_team_id, m.away_team_id) if t}
    nombres = (
        {str(t.id): t.name for t in db.query(Team).filter(Team.id.in_(list(ids))).all()}
        if ids
        else {}
    )
    return {
        str(m.id): (
            f"{nombres.get(str(m.home_team_id), 'Por definir')} vs "
            f"{nombres.get(str(m.away_team_id), 'Por definir')}"
        )
        for m in lista
    }


def _nombres(db: Session, modelo, ids: Iterable[Any]) -> Dict[str, str]:
    lista = [i for i in ids if i]
    if not lista:
        return {}
    return {
        str(f.id): f.name for f in db.query(modelo).filter(modelo.id.in_(lista)).all()
    }


def _emails(db: Session, ids: Iterable[Any]) -> Dict[str, str]:
    lista = [i for i in ids if i]
    if not lista:
        return {}
    return {
        str(u.id): u.email for u in db.query(User).filter(User.id.in_(lista)).all()
    }


def nomina(db: Session, team_id) -> set:
    """Ids de los jugadores inscritos en el equipo."""
    if not team_id:
        return set()
    return {
        str(tp.player_id)
        for tp in db.query(TeamPlayer).filter(TeamPlayer.team_id == team_id).all()
    }


def texto(valor: Optional[str], campo: str, *, obligatorio: bool = False) -> Optional[str]:
    limpio = (valor or "").strip()
    if not limpio:
        if obligatorio:
            raise Invalido(f"Falta {campo}")
        return None
    if len(limpio) > MAX_TEXTO:
        raise Invalido(f"{campo[:1].upper()}{campo[1:]} es demasiado largo")
    return limpio


# --------------------------------------------------------------------------- #
#  Informe arbitral
# --------------------------------------------------------------------------- #
def validar_incidencias(
    db: Session, match: Match, incidencias: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Deja las incidencias listas para guardar, o lanza `Invalido`.

    Conserva el `id` de las que ya existían: es lo que mantiene enganchada la
    sanción que el comité colgó de una incidencia cuando el árbitro corrige el
    minuto de otra.
    """
    if len(incidencias) > MAX_INCIDENCIAS:
        raise Invalido(f"Un informe admite hasta {MAX_INCIDENCIAS} incidencias")
    equipos = {"home": match.home_team_id, "away": match.away_team_id}
    nominas = {lado: nomina(db, tid) for lado, tid in equipos.items()}
    jugadores = _nombres(
        db, Player, [i.get("player_id") for i in incidencias if i.get("player_id")]
    )
    limpias: List[Dict[str, Any]] = []
    vistos = set()
    for n, inc in enumerate(incidencias, start=1):
        tipo = (inc.get("kind") or "").strip().lower()
        if tipo not in INCIDENCIAS:
            raise Invalido(
                f"Incidencia {n}: «{inc.get('kind')}» no es un tipo válido. "
                f"Tipos: {', '.join(INCIDENCIAS.values())}"
            )
        lado = inc.get("team")
        if lado not in (None, "", "home", "away"):
            raise Invalido(f"Incidencia {n}: el equipo debe ser local o visitante")
        lado = lado or None
        jugador = str(inc["player_id"]) if inc.get("player_id") else None
        if jugador:
            if lado and jugador not in nominas[lado]:
                raise Invalido(
                    f"Incidencia {n}: {jugadores.get(jugador, 'ese jugador')} no "
                    "está en la nómina de ese equipo"
                )
            if not lado:
                lado = next((l for l, ids in nominas.items() if jugador in ids), None)
                if not lado:
                    raise Invalido(
                        f"Incidencia {n}: {jugadores.get(jugador, 'ese jugador')} no "
                        "juega en ninguno de los dos equipos"
                    )
        minuto = inc.get("minute")
        if minuto is not None:
            try:
                minuto = int(minuto)
            except (TypeError, ValueError):
                raise Invalido(f"Incidencia {n}: el minuto debe ser un número")
            if not 0 <= minuto <= 200:
                raise Invalido(f"Incidencia {n}: el minuto debe estar entre 0 y 200")
        ident = str(inc.get("id") or "").strip()[:40] or uuid.uuid4().hex
        if ident in vistos:
            ident = uuid.uuid4().hex
        vistos.add(ident)
        limpias.append(
            {
                "id": ident,
                "kind": tipo,
                "minute": minuto,
                "team": lado,
                "player_id": jugador,
                "description": texto(inc.get("description"), "la descripción"),
            }
        )
    return limpias


def payload_informe(
    db: Session,
    match: Match,
    informe: Optional[MatchReport],
    *,
    con_sanciones: bool = False,
) -> Dict[str, Any]:
    """El informe con nombres resueltos. Sin informe, el esqueleto vacío: la
    pantalla del árbitro arranca a escribir sobre él."""
    incidencias = list((informe.incidents if informe else None) or [])
    jugadores = _nombres(db, Player, [i.get("player_id") for i in incidencias])
    equipos = {"home": match.home_team_id, "away": match.away_team_id}
    nombres_equipo = _nombres(db, Team, equipos.values())
    sanciones: Dict[str, Dict[str, Any]] = {}
    if con_sanciones and incidencias:
        for s in (
            db.query(PlayerSanction)
            .filter(PlayerSanction.match_id == match.id, PlayerSanction.incident_id.isnot(None))
            .all()
        ):
            sanciones[s.incident_id] = {
                "id": str(s.id),
                "matches": s.matches,
                "status": s.status,
            }
    return {
        "match_id": str(match.id),
        "exists": informe is not None,
        "observations": (informe.observations if informe else None) or "",
        "incidents": [
            {
                **i,
                "kind_label": INCIDENCIAS.get(i.get("kind"), i.get("kind")),
                "player_name": jugadores.get(str(i.get("player_id"))),
                "team_id": (
                    str(equipos[i["team"]]) if i.get("team") in equipos and equipos[i["team"]] else None
                ),
                "team_name": nombres_equipo.get(str(equipos.get(i.get("team")))),
                "sanction": sanciones.get(i.get("id")),
            }
            for i in incidencias
        ],
        "author_email": informe.author_email if informe else None,
        "submitted_at": informe.submitted_at if informe else None,
        "updated_at": informe.updated_at if informe else None,
    }


# --------------------------------------------------------------------------- #
#  Sanciones manuales
# --------------------------------------------------------------------------- #
def payload_sanciones(
    db: Session, torneo: Tournament, filas: List[PlayerSanction]
) -> List[Dict[str, Any]]:
    if not filas:
        return []
    partidos = _partidos_del_torneo(db, torneo)
    por_id = {str(m.id): m for m in partidos}
    rotulos = rotulos_de_partidos(
        db, [por_id.get(str(s.match_id)) for s in filas if s.match_id]
    )
    jugadores = _nombres(db, Player, [s.player_id for s in filas])
    equipos = _nombres(db, Team, [s.team_id for s in filas])
    autores = _emails(db, [s.created_by_id for s in filas])
    out = []
    for s in filas:
        estado = estado_de_sancion(s, partidos)
        partido = por_id.get(str(s.match_id)) if s.match_id else None
        out.append(
            {
                "id": str(s.id),
                "tournament_id": str(s.tournament_id),
                "player_id": str(s.player_id) if s.player_id else None,
                "player_name": jugadores.get(str(s.player_id), "—"),
                "team_id": str(s.team_id) if s.team_id else None,
                "team_name": equipos.get(str(s.team_id)),
                "matches": s.matches or 0,
                "reason": s.reason,
                "match_id": str(s.match_id) if s.match_id else None,
                "match_label": rotulos.get(str(s.match_id)),
                "match_date": partido.scheduled_start if partido else None,
                "incident_id": s.incident_id,
                "status": s.status or SANCION_ACTIVA,
                "served": estado["served"],
                "pending": estado["pending"],
                "next_match": estado["next_match"],
                "created_by_email": autores.get(str(s.created_by_id)),
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            }
        )
    out.sort(key=lambda r: (r["status"] != SANCION_ACTIVA, -(r["pending"] or 0), r["player_name"]))
    return out


def equipo_del_jugador_en_torneo(db: Session, torneo: Tournament, player_id) -> Optional[str]:
    """El equipo del torneo en cuya nómina está el jugador (el primero, si
    estuviera en dos: la sanción va contra el jugador en este campeonato)."""
    inscritos = {
        str(l.team_id)
        for l in db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == torneo.id)
        .all()
    }
    for tp in db.query(TeamPlayer).filter(TeamPlayer.player_id == player_id).all():
        if str(tp.team_id) in inscritos:
            return str(tp.team_id)
    return None


def avisar_sancion(db: Session, torneo: Tournament, s: PlayerSanction, nombre: str) -> int:
    """Avisa a los capitanes del equipo: es lo que necesitan saber antes de
    armar la planilla del sábado."""
    creados = 0
    fechas = s.matches or 0
    for user_id in capitanes_de_equipos(db, [s.team_id]).get(str(s.team_id), []):
        crear_notificacion(
            db,
            user_id,
            tipo=TIPO_SANCION,
            title=(
                f"Sanción: {nombre}, {fechas} fecha(s)"
                if fechas
                else f"Amonestación: {nombre}"
            ),
            body=f"{torneo.name} · {s.reason}",
            team_id=s.team_id,
            tournament_id=torneo.id,
            match_id=s.match_id,
            data={"sanction_id": str(s.id), "matches": fechas},
        )
        creados += 1
    return creados


# --------------------------------------------------------------------------- #
#  Reclamos
# --------------------------------------------------------------------------- #
def payload_reclamos(
    db: Session,
    filas: List[Claim],
    *,
    publico: bool = False,
) -> List[Dict[str, Any]]:
    """Los reclamos con nombres resueltos.

    `publico` recorta lo que no sale al marcador: quién lo escribió y la prueba
    propia del equipo (el video que grabó el delegado es suyo; la jugada
    oficial, si está publicada, sí se muestra).
    """
    if not filas:
        return []
    matches = (
        db.query(Match).filter(Match.id.in_([c.match_id for c in filas if c.match_id])).all()
        if any(c.match_id for c in filas)
        else []
    )
    por_id = {str(m.id): m for m in matches}
    rotulos = rotulos_de_partidos(db, matches)
    equipos = _nombres(db, Team, [c.team_id for c in filas])
    jugadas = {
        str(h.id): h
        for h in db.query(MatchHighlight)
        .filter(MatchHighlight.id.in_([c.highlight_id for c in filas if c.highlight_id]))
        .all()
    } if any(c.highlight_id for c in filas) else {}
    sanciones = {
        str(s.id): s
        for s in db.query(PlayerSanction)
        .filter(PlayerSanction.id.in_([c.sanction_id for c in filas if c.sanction_id]))
        .all()
    } if any(c.sanction_id for c in filas) else {}
    sancionados = _nombres(db, Player, [s.player_id for s in sanciones.values()])
    autores = (
        {} if publico else _emails(db, [c.created_by_id for c in filas] + [c.resolved_by_id for c in filas])
    )
    out = []
    for c in filas:
        jugada = jugadas.get(str(c.highlight_id)) if c.highlight_id else None
        if jugada and publico and not jugada.published:
            jugada = None
        sancion = sanciones.get(str(c.sanction_id)) if c.sanction_id else None
        partido = por_id.get(str(c.match_id)) if c.match_id else None
        fila = {
            "id": str(c.id),
            "tournament_id": str(c.tournament_id),
            "match_id": str(c.match_id) if c.match_id else None,
            "match_label": rotulos.get(str(c.match_id)),
            "match_date": partido.scheduled_start if partido else None,
            "team_id": str(c.team_id) if c.team_id else None,
            "team_name": equipos.get(str(c.team_id)),
            "kind": c.kind,
            "kind_label": TIPOS_RECLAMO.get(c.kind, c.kind),
            "description": c.description,
            "sanction": (
                {
                    "id": str(sancion.id),
                    "player_name": sancionados.get(str(sancion.player_id), "—"),
                    "matches": sancion.matches,
                    "reason": sancion.reason,
                    "status": sancion.status,
                }
                if sancion
                else None
            ),
            "highlight": (
                {
                    "id": str(jugada.id),
                    "title": jugada.title,
                    "play_type": jugada.play_type,
                    "storage": jugada.storage,
                    "video_url": jugada.external_url or jugada.video_url,
                    "poster_url": jugada.poster_url,
                    "minute": jugada.minute,
                }
                if jugada
                else None
            ),
            "evidence": (
                {
                    "storage": c.evidence_storage,
                    "url": c.evidence_url,
                    "mime_type": c.evidence_mime,
                    "size_bytes": c.evidence_size,
                }
                if c.evidence_url and not publico
                else None
            ),
            "status": c.status,
            "status_label": ESTADO_RECLAMO.get(c.status, c.status),
            "resolution": c.resolution,
            "resolved_at": c.resolved_at,
            "published": bool(c.published),
            "created_at": c.created_at,
        }
        if not publico:
            fila["created_by_email"] = autores.get(str(c.created_by_id))
            fila["resolved_by_email"] = autores.get(str(c.resolved_by_id))
        out.append(fila)
    return out


def avisar_reclamo_nuevo(db: Session, torneo: Tournament, c: Claim, equipo: str) -> int:
    """Al organizador: un reclamo sin leer es un reclamo que se resuelve tarde."""
    if not torneo.owner_id or str(torneo.owner_id) == str(c.created_by_id):
        return 0
    crear_notificacion(
        db,
        torneo.owner_id,
        tipo=TIPO_RECLAMO_NUEVO,
        title=f"Reclamo de {equipo}: {TIPOS_RECLAMO.get(c.kind, c.kind)}",
        body=f"{torneo.name} · {c.description[:160]}",
        team_id=c.team_id,
        tournament_id=torneo.id,
        match_id=c.match_id,
        data={"claim_id": str(c.id)},
    )
    return 1


def avisar_reclamo_resuelto(db: Session, torneo: Tournament, c: Claim) -> int:
    """A los capitanes del equipo que reclamó (y a quien lo escribió, si ya no
    fuera capitán): la resolución es lo que estaban esperando."""
    destino = {str(u) for u in capitanes_de_equipos(db, [c.team_id]).get(str(c.team_id), [])}
    if c.created_by_id and str(c.created_by_id) != str(c.resolved_by_id):
        destino.add(str(c.created_by_id))
    destino.discard(str(c.resolved_by_id))
    estado = ESTADO_RECLAMO.get(c.status, c.status).lower()
    for user_id in destino:
        crear_notificacion(
            db,
            uuid.UUID(user_id),
            tipo=TIPO_RECLAMO_RESUELTO,
            title=f"Reclamo {estado}: {TIPOS_RECLAMO.get(c.kind, c.kind)}",
            body=f"{torneo.name} · {(c.resolution or '')[:200]}",
            team_id=c.team_id,
            tournament_id=torneo.id,
            match_id=c.match_id,
            data={"claim_id": str(c.id), "status": c.status},
        )
    return len(destino)


def avisar_informe(db: Session, torneo: Tournament, match: Match, informe: MatchReport, actor: User) -> int:
    """Al organizador, solo si el informe trae incidencias: un informe limpio
    no es noticia, y un aviso por partido taparía los que sí importan."""
    n = len(informe.incidents or [])
    if not n or not torneo.owner_id or str(torneo.owner_id) == str(actor.id):
        return 0
    rotulo = rotulos_de_partidos(db, [match]).get(str(match.id), "un partido")
    crear_notificacion(
        db,
        torneo.owner_id,
        tipo=TIPO_INFORME,
        title=f"Informe arbitral con {n} incidencia(s)",
        body=f"{torneo.name} · {rotulo}",
        tournament_id=torneo.id,
        match_id=match.id,
        data={"incidents": n},
    )
    return 1


def ahora() -> datetime:
    return datetime.utcnow()
