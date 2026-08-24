"""Propagación del resultado de un partido a los cruces que dependen de él.

Un `StageSlot` de tipo WINNER_OF/LOSER_OF es una casilla del cuadro que dice
"aquí juega el ganador de aquel partido". Al finalizar el partido de origen hay
que escribir ese equipo en el partido de destino.

Lo que este módulo agrega es que esa escritura se pueda REHACER. Antes el cruce
se resolvía una sola vez —los slots ya resueltos quedaban fuera de la consulta—
así que si el árbitro corregía el marcador de una semifinal, el equipo que ya
había subido a la final se quedaba ahí: el torneo seguía con el finalista
equivocado y no había forma de arreglarlo desde la aplicación. Ahora el cruce
se recalcula con el resultado actual, y si el partido vuelve a estar sin
terminar (se corrige un estado, se aplaza) la casilla se vacía.

El cambio se propaga hacia adelante: si cambia un finalista, el ganador de la
final también puede cambiar, y con él lo que dependa de la final.
"""
from typing import Any, Optional, Set

from sqlalchemy.orm import Session

from app.db.models import Match, MatchStatus, SlotType, StageSlot


def _terminado(match: Match) -> bool:
    """El partido tiene un resultado del que se pueda deducir un ganador."""
    estado = match.status.value if hasattr(match.status, "value") else match.status
    return (
        str(estado) == MatchStatus.FINISHED.value
        and match.home_score is not None
        and match.away_score is not None
    )


def equipo_del_slot(match: Match, slot_type: Any) -> Optional[Any]:
    """Ganador (o perdedor) de `match`, o None si todavía no se sabe.

    El empate lo resuelve el local, igual que antes: en eliminación directa el
    marcador de un partido definido por penales lo carga el árbitro con el
    ganador arriba.
    """
    if not _terminado(match):
        return None
    gana_local = match.home_score >= match.away_score
    ganador = match.home_team_id if gana_local else match.away_team_id
    perdedor = match.away_team_id if gana_local else match.home_team_id
    return ganador if slot_type == SlotType.WINNER_OF else perdedor


def propagar_resultado(
    db: Session, match: Match, _visitados: Optional[Set[str]] = None
) -> int:
    """Sincroniza los cruces que dependen de `match` con su resultado actual.

    Devuelve cuántas casillas cambiaron de equipo. No hace commit: lo hace el
    endpoint que lo llama. `_visitados` corta la recursión si un cuadro mal
    armado apunta en círculo.
    """
    visitados = _visitados if _visitados is not None else set()
    if str(match.id) in visitados:
        return 0
    visitados.add(str(match.id))

    slots = (
        db.query(StageSlot)
        .filter(
            StageSlot.source_match_id == match.id,
            StageSlot.slot_type.in_([SlotType.WINNER_OF, SlotType.LOSER_OF]),
        )
        .all()
    )
    cambios = 0
    for slot in slots:
        equipo = equipo_del_slot(match, slot.slot_type)
        destino = db.query(Match).filter(Match.id == slot.match_id).first()
        if not destino:
            continue
        actual = destino.home_team_id if slot.is_home else destino.away_team_id
        # `resolved` se reescribe siempre: un cruce que se queda sin equipo
        # vuelve a estar pendiente y lo debe recoger la resolución automática.
        slot.resolved = equipo is not None
        if str(actual) == str(equipo):
            continue
        if slot.is_home:
            destino.home_team_id = equipo
        else:
            destino.away_team_id = equipo
        cambios += 1
        # El destino cambió de equipo: si ya tenía marcador, su propio ganador
        # es otro, así que la corrección tiene que seguir bajando por el cuadro.
        cambios += propagar_resultado(db, destino, visitados)
    return cambios
