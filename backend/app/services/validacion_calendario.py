"""Validador del calendario: choques de cancha, de equipo, de árbitro y huecos.

La programación automática reparte los turnos sin pisarse, pero en cuanto el
organizador mueve una hora a mano nada le impide dejar dos partidos en la misma
cancha al mismo tiempo, o hacer jugar a un equipo dos veces a la vez. Este
módulo revisa el calendario completo y devuelve lo que está mal, separado entre
lo imposible (`error`) y lo que solo conviene mirar (`aviso`).

No bloquea nada: el organizador a veces sabe algo que el sistema no (una cancha
prestada, un partido que se juega igual). El panel avisa y él decide.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import (
    Court,
    Match,
    MatchStatus,
    SlotType,
    Stage,
    StageSlot,
    Team,
    Tournament,
    User,
    Venue,
)

# Tipos de conflicto (el frontend elige icono y color con esta clave).
TIPO_CANCHA_OCUPADA = "cancha_ocupada"
TIPO_EQUIPO_SOLAPADO = "equipo_solapado"
TIPO_EQUIPO_SIN_DESCANSO = "equipo_sin_descanso"
TIPO_ARBITRO_OCUPADO = "arbitro_ocupado"
TIPO_ORDEN_DE_LLAVE = "orden_de_llave"
TIPO_SIN_FECHA = "sin_fecha"
TIPO_SIN_CANCHA = "sin_cancha"

SEVERIDAD_ERROR = "error"  # imposible de jugar tal como está
SEVERIDAD_AVISO = "aviso"  # se puede jugar, pero conviene revisarlo

DURACION_POR_DEFECTO = 60  # minutos, si el torneo no la define


def _duracion(tournament: Tournament) -> int:
    return tournament.match_duration or DURACION_POR_DEFECTO


def _ventana(match: Match, duracion: int) -> Optional[Tuple[datetime, datetime]]:
    """Inicio y fin reales del partido.

    `scheduled_end` solo lo escribe la programación automática y puede quedar
    viejo tras mover la fecha a mano, así que solo se usa si es posterior al
    inicio; si no, el fin se deduce de la duración del torneo.
    """
    if not match.scheduled_start:
        return None
    fin = match.scheduled_end
    if not fin or fin <= match.scheduled_start:
        fin = match.scheduled_start + timedelta(minutes=duracion)
    return match.scheduled_start, fin


def _estado(match: Match) -> str:
    s = match.status
    return s.value if hasattr(s, "value") else str(s)


def _solapan(a: Tuple[datetime, datetime], b: Tuple[datetime, datetime]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def _hhmm(dt: datetime) -> str:
    return f"{dt.day:02d}/{dt.month:02d} {dt.hour:02d}:{dt.minute:02d}"


def _conflicto(
    tipo: str,
    severidad: str,
    title: str,
    detail: str,
    match_ids: List[Any],
    **extra,
) -> Dict[str, Any]:
    return {
        "type": tipo,
        "severity": severidad,
        "title": title,
        "detail": detail,
        "match_ids": [str(m) for m in match_ids],
        **extra,
    }


def detectar_conflictos(
    db: Session,
    tournament: Tournament,
    *,
    descanso_minimo: Optional[int] = None,
    puede_ver_otros_torneos: bool = False,
) -> List[Dict[str, Any]]:
    """Revisa el calendario del torneo y devuelve todos los conflictos.

    `descanso_minimo` son los minutos que debería descansar un equipo entre dos
    partidos suyos; por defecto, lo que dura un partido de esa disciplina.
    `puede_ver_otros_torneos` (superadmin) decide si un choque de cancha con
    otro campeonato se nombra o se reporta sin identificarlo.
    """
    duracion = _duracion(tournament)
    if descanso_minimo is None:
        descanso_minimo = duracion

    stage_ids = [s.id for s in db.query(Stage).filter(Stage.tournament_id == tournament.id).all()]
    if not stage_ids:
        return []
    partidos = db.query(Match).filter(Match.stage_id.in_(stage_ids)).all()
    # Un partido aplazado no se va a jugar: no choca con nadie ni le falta
    # fecha, precisamente porque está esperando una nueva.
    partidos = [m for m in partidos if _estado(m) != "postponed"]
    if not partidos:
        return []

    nombres = {
        str(t.id): t.name
        for t in db.query(Team)
        .filter(
            Team.id.in_(
                [m.home_team_id for m in partidos if m.home_team_id]
                + [m.away_team_id for m in partidos if m.away_team_id]
            )
        )
        .all()
    }

    def rotulo(m: Match) -> str:
        local = nombres.get(str(m.home_team_id), "Por definir")
        visitante = nombres.get(str(m.away_team_id), "Por definir")
        return f"{local} vs {visitante}"

    canchas = {
        str(c.id): c
        for c in db.query(Court)
        .filter(Court.id.in_([m.court_id for m in partidos if m.court_id]))
        .all()
    }
    sedes = {
        str(v.id): v.name
        for v in db.query(Venue)
        .filter(Venue.id.in_([c.venue_id for c in canchas.values() if c.venue_id]))
        .all()
    }

    def cancha_label(court_id) -> str:
        cancha = canchas.get(str(court_id))
        if not cancha:
            return "la cancha"
        sede = sedes.get(str(cancha.venue_id))
        return f"{sede} · {cancha.name}" if sede else cancha.name

    ventanas = {str(m.id): _ventana(m, duracion) for m in partidos}
    conflictos: List[Dict[str, Any]] = []

    # --- 1. Dos partidos en la misma cancha a la misma hora -----------------
    por_cancha: Dict[str, List[Match]] = {}
    for m in partidos:
        if m.court_id and ventanas[str(m.id)]:
            por_cancha.setdefault(str(m.court_id), []).append(m)
    for court_id, lista in por_cancha.items():
        lista.sort(key=lambda m: m.scheduled_start)
        for i, a in enumerate(lista):
            for b in lista[i + 1 :]:
                va, vb = ventanas[str(a.id)], ventanas[str(b.id)]
                if vb[0] >= va[1]:
                    break  # ordenados por hora: los que siguen tampoco chocan
                if _solapan(va, vb):
                    conflictos.append(
                        _conflicto(
                            TIPO_CANCHA_OCUPADA,
                            SEVERIDAD_ERROR,
                            f"Cancha ocupada: {cancha_label(court_id)}",
                            f"«{rotulo(a)}» ({_hhmm(va[0])}) y «{rotulo(b)}» "
                            f"({_hhmm(vb[0])}) se cruzan en la misma cancha.",
                            [a.id, b.id],
                        )
                    )

    # --- 2. Un equipo jugando dos partidos a la vez (y sin descanso) --------
    por_equipo: Dict[str, List[Match]] = {}
    for m in partidos:
        if not ventanas[str(m.id)]:
            continue
        for tid in (m.home_team_id, m.away_team_id):
            if tid:
                por_equipo.setdefault(str(tid), []).append(m)
    for team_id, lista in por_equipo.items():
        lista.sort(key=lambda m: m.scheduled_start)
        equipo = nombres.get(team_id, "El equipo")
        for i, a in enumerate(lista):
            for b in lista[i + 1 :]:
                va, vb = ventanas[str(a.id)], ventanas[str(b.id)]
                if _solapan(va, vb):
                    conflictos.append(
                        _conflicto(
                            TIPO_EQUIPO_SOLAPADO,
                            SEVERIDAD_ERROR,
                            f"{equipo} juega dos partidos a la vez",
                            f"«{rotulo(a)}» ({_hhmm(va[0])}) y «{rotulo(b)}» "
                            f"({_hhmm(vb[0])}) se cruzan.",
                            [a.id, b.id],
                            team_id=team_id,
                        )
                    )
                    continue
                descanso = int((vb[0] - va[1]).total_seconds() // 60)
                if 0 <= descanso < descanso_minimo:
                    conflictos.append(
                        _conflicto(
                            TIPO_EQUIPO_SIN_DESCANSO,
                            SEVERIDAD_AVISO,
                            f"{equipo} descansa solo {descanso} min",
                            f"Termina «{rotulo(a)}» a las {_hhmm(va[1])} y empieza "
                            f"«{rotulo(b)}» a las {_hhmm(vb[0])} "
                            f"(mínimo sugerido: {descanso_minimo} min).",
                            [a.id, b.id],
                            team_id=team_id,
                        )
                    )
                break  # solo se compara con el partido siguiente del equipo

    # --- 3. El mismo árbitro en dos partidos a la vez -----------------------
    por_arbitro: Dict[str, List[Match]] = {}
    for m in partidos:
        if m.referee_id and ventanas[str(m.id)]:
            por_arbitro.setdefault(str(m.referee_id), []).append(m)
    arbitros = {
        str(u.id): (u.name or u.email)
        for u in db.query(User).filter(User.id.in_(list(por_arbitro.keys()))).all()
    } if por_arbitro else {}
    for referee_id, lista in por_arbitro.items():
        lista.sort(key=lambda m: m.scheduled_start)
        quien = arbitros.get(referee_id, "El árbitro")
        for i, a in enumerate(lista):
            for b in lista[i + 1 :]:
                va, vb = ventanas[str(a.id)], ventanas[str(b.id)]
                if vb[0] >= va[1]:
                    break
                if _solapan(va, vb):
                    conflictos.append(
                        _conflicto(
                            TIPO_ARBITRO_OCUPADO,
                            SEVERIDAD_ERROR,
                            f"{quien} tiene dos partidos a la vez",
                            f"«{rotulo(a)}» ({_hhmm(va[0])}) y «{rotulo(b)}» "
                            f"({_hhmm(vb[0])}) se cruzan.",
                            [a.id, b.id],
                            referee_id=referee_id,
                        )
                    )

    # --- 4. La cancha ocupada por OTRO campeonato ---------------------------
    court_ids = [cid for cid in por_cancha.keys()]
    if court_ids:
        ajenos = (
            db.query(Match)
            .filter(
                Match.court_id.in_(court_ids),
                Match.scheduled_start.isnot(None),
                Match.status != MatchStatus.POSTPONED,
                ~Match.stage_id.in_(stage_ids),
            )
            .all()
        )
        if ajenos:
            fases_ajenas = {
                str(s.id): s
                for s in db.query(Stage)
                .filter(Stage.id.in_([m.stage_id for m in ajenos if m.stage_id]))
                .all()
            }
            torneos_ajenos = {
                str(t.id): t
                for t in db.query(Tournament)
                .filter(
                    Tournament.id.in_([s.tournament_id for s in fases_ajenas.values()])
                )
                .all()
            }
            for otro in ajenos:
                fase = fases_ajenas.get(str(otro.stage_id))
                torneo_otro = (
                    torneos_ajenos.get(str(fase.tournament_id)) if fase else None
                )
                vo = _ventana(otro, _duracion(torneo_otro) if torneo_otro else duracion)
                if not vo:
                    continue
                for m in por_cancha.get(str(otro.court_id), []):
                    vm = ventanas[str(m.id)]
                    if not _solapan(vm, vo):
                        continue
                    # Sin permiso sobre el otro torneo no se revela cuál es:
                    # el organizador necesita saber que la cancha está tomada,
                    # no la programación de un colega.
                    de_quien = (
                        f"«{torneo_otro.name}»"
                        if (torneo_otro and puede_ver_otros_torneos)
                        else "otro campeonato"
                    )
                    conflictos.append(
                        _conflicto(
                            TIPO_CANCHA_OCUPADA,
                            SEVERIDAD_ERROR,
                            f"Cancha tomada por otro campeonato: "
                            f"{cancha_label(otro.court_id)}",
                            f"«{rotulo(m)}» ({_hhmm(vm[0])}) coincide con un partido "
                            f"de {de_quien} a las {_hhmm(vo[0])}.",
                            [m.id],
                        )
                    )

    # --- 5. Una llave programada antes de saberse quién la juega ------------
    slots = (
        db.query(StageSlot)
        .filter(
            StageSlot.stage_id.in_(stage_ids),
            StageSlot.slot_type.in_([SlotType.WINNER_OF, SlotType.LOSER_OF]),
            StageSlot.source_match_id.isnot(None),
        )
        .all()
    )
    for slot in slots:
        destino = ventanas.get(str(slot.match_id))
        origen = ventanas.get(str(slot.source_match_id))
        if not destino or not origen or destino[0] >= origen[1]:
            continue
        objetivo = next((m for m in partidos if str(m.id) == str(slot.match_id)), None)
        fuente = next(
            (m for m in partidos if str(m.id) == str(slot.source_match_id)), None
        )
        if not objetivo or not fuente:
            continue
        conflictos.append(
            _conflicto(
                TIPO_ORDEN_DE_LLAVE,
                SEVERIDAD_ERROR,
                "Llave programada antes de que se defina el clasificado",
                f"«{rotulo(objetivo)}» empieza el {_hhmm(destino[0])}, antes de que "
                f"termine «{rotulo(fuente)}» ({_hhmm(origen[1])}), de donde sale uno "
                f"de sus equipos.",
                [objetivo.id, fuente.id],
            )
        )

    # --- 6. Lo que falta por programar --------------------------------------
    sin_fecha = [m for m in partidos if not m.scheduled_start]
    if sin_fecha:
        conflictos.append(
            _conflicto(
                TIPO_SIN_FECHA,
                SEVERIDAD_AVISO,
                f"{len(sin_fecha)} partido(s) sin fecha",
                "Nadie recibe aviso ni los ve en el calendario público hasta que "
                "tengan hora.",
                [m.id for m in sin_fecha],
            )
        )
    sin_cancha = [m for m in partidos if m.scheduled_start and not m.court_id]
    if sin_cancha:
        conflictos.append(
            _conflicto(
                TIPO_SIN_CANCHA,
                SEVERIDAD_AVISO,
                f"{len(sin_cancha)} partido(s) con hora pero sin cancha",
                "Los equipos saben cuándo juegan, pero no dónde.",
                [m.id for m in sin_cancha],
            )
        )

    # Primero lo que impide jugar, después lo que solo conviene revisar.
    conflictos.sort(key=lambda c: 0 if c["severity"] == SEVERIDAD_ERROR else 1)
    return conflictos
