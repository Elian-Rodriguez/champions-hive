"""Propagación del resultado de una llave a los cruces que dependen de ella.

Un `StageSlot` de tipo WINNER_OF/LOSER_OF es una casilla del cuadro que dice
"aquí juega el ganador de aquello". Al quedar definido hay que escribir ese
equipo en el partido de destino.

Lo primero que agrega este módulo es que esa escritura se pueda REHACER. Antes
el cruce se resolvía una sola vez —los slots ya resueltos quedaban fuera de la
consulta— así que si el árbitro corregía el marcador de una semifinal, el
equipo que ya había subido a la final se quedaba ahí: el torneo seguía con el
finalista equivocado y no había forma de arreglarlo desde la aplicación. Ahora
el cruce se recalcula con el resultado actual, y si el partido vuelve a estar
sin terminar (se corrige un estado, se aplaza) la casilla se vacía. El cambio
se propaga hacia adelante: si cambia un finalista, el ganador de la final
también puede cambiar, y con él lo que dependa de la final.

Lo segundo es que "aquello" ya no es forzosamente UN partido. Una llave puede
jugarse a ida y vuelta —lo normal en una final de fútbol aficionado— y ahí lo
que decide es el GLOBAL, no el último marcador. Los dos partidos comparten
`tie_id` y se distinguen por `leg`; la llave se resuelve cuando los dos están
terminados y con el global de los dos.

Y lo tercero son los penales. Antes la única manera de dejar constancia de una
tanda era cargar el marcador con el ganador arriba, así que un 2-2 definido
4-3 se guardaba como 3-2: el acta imprimía un resultado que no ocurrió y la
tabla —si esa fase alimentaba una— sumaba goles que nadie hizo. Ahora la tanda
va en sus propias columnas y el marcador del partido queda como terminó.

El orden de desempate de una llave es el del reglamento: global, gol de
visitante (si la fase lo activa), penales y, como último recurso, el local.
Ese último recurso es el comportamiento viejo y se mantiene a propósito: hay
torneos cargados donde el árbitro puso al ganador arriba y no hay tanda que
leer; sin él esas llaves se quedarían sin resolver.
"""
from typing import Any, Dict, List, Optional, Set

from sqlalchemy.orm import Session

from app.db.models import Match, MatchStatus, SlotType, Stage, StageSlot

# Motivos por los que una llave quedó definida, para poder explicarla en
# pantalla y en el acta: "Gana X 4-3 en penales" dice algo; un 3-2 inventado no.
POR_MARCADOR = "marcador"
POR_GLOBAL = "global"
POR_GOL_VISITANTE = "gol_visitante"
POR_PENALES = "penales"
POR_LOCALIA = "localia"


def _terminado(match: Match) -> bool:
    """El partido tiene un resultado del que se pueda deducir un ganador."""
    estado = match.status.value if hasattr(match.status, "value") else match.status
    return (
        str(estado) == MatchStatus.FINISHED.value
        and match.home_score is not None
        and match.away_score is not None
    )


def _hay_penales(match: Match) -> bool:
    return (
        getattr(match, "home_penalties", None) is not None
        and getattr(match, "away_penalties", None) is not None
        and match.home_penalties != match.away_penalties
    )


def legs_de_llave(db: Session, match: Match) -> List[Match]:
    """Los partidos que definen la misma llave, de la ida a la vuelta.

    Sin `tie_id` la llave es el propio partido, que es el caso de todo lo que
    ya estaba creado y de cualquier cuadro a partido único.
    """
    tie_id = getattr(match, "tie_id", None)
    if not tie_id:
        return [match]
    legs = db.query(Match).filter(Match.tie_id == tie_id).order_by(Match.leg).all()
    return legs or [match]


def _away_goals(db: Session, match: Match) -> bool:
    """¿El gol de visitante desempata el global en esta fase?

    Es del reglamento de la fase y va apagado salvo que se encienda: es una
    regla que muchas ligas (y la propia UEFA desde 2021) dejaron de usar.
    """
    if not match.stage_id:
        return False
    stage = db.query(Stage).filter(Stage.id == match.stage_id).first()
    return bool((getattr(stage, "config", None) or {}).get("away_goals"))


def resolver_llave(db: Session, match: Match) -> Optional[Dict[str, Any]]:
    """Quién gana la llave a la que pertenece `match`, y por qué.

    Devuelve None mientras falte jugar algo: una llave a ida y vuelta con la
    ida terminada todavía no tiene ganador, y una casilla vacía es mejor que
    un equipo que no ganó nada.
    """
    legs = legs_de_llave(db, match)
    if not all(_terminado(m) for m in legs):
        return None

    # La llave se mira desde el último partido: en una ida y vuelta, el local
    # de la vuelta es el que cierra en casa.
    decisivo = legs[-1]
    local, visitante = decisivo.home_team_id, decisivo.away_team_id
    if not local or not visitante:
        return None

    def _fin(ganador, perdedor, motivo, global_local, global_visitante):
        return {
            "ganador": ganador,
            "perdedor": perdedor,
            "motivo": motivo,
            "global_local": global_local,
            "global_visitante": global_visitante,
            "legs": len(legs),
        }

    if len(legs) == 1:
        m = legs[0]
        if m.home_score != m.away_score:
            gana_local = m.home_score > m.away_score
            return _fin(
                local if gana_local else visitante,
                visitante if gana_local else local,
                POR_MARCADOR,
                m.home_score,
                m.away_score,
            )
        if _hay_penales(m):
            gana_local = m.home_penalties > m.away_penalties
            return _fin(
                local if gana_local else visitante,
                visitante if gana_local else local,
                POR_PENALES,
                m.home_score,
                m.away_score,
            )
        # Empate sin tanda cargada: el local, que es el comportamiento viejo.
        return _fin(local, visitante, POR_LOCALIA, m.home_score, m.away_score)

    # Ida y vuelta: el global se acumula por equipo, no por columna, porque la
    # localía se invierte entre los dos partidos.
    total: Dict[str, int] = {str(local): 0, str(visitante): 0}
    fuera: Dict[str, int] = {str(local): 0, str(visitante): 0}
    for m in legs:
        if str(m.home_team_id) not in total or str(m.away_team_id) not in total:
            # Un partido de la llave con otros equipos: el cuadro está mal
            # armado y no hay global que calcular.
            return None
        total[str(m.home_team_id)] += m.home_score
        total[str(m.away_team_id)] += m.away_score
        fuera[str(m.away_team_id)] += m.away_score

    g_local, g_visitante = total[str(local)], total[str(visitante)]
    if g_local != g_visitante:
        gana_local = g_local > g_visitante
        return _fin(
            local if gana_local else visitante,
            visitante if gana_local else local,
            POR_GLOBAL,
            g_local,
            g_visitante,
        )

    if _away_goals(db, decisivo) and fuera[str(local)] != fuera[str(visitante)]:
        gana_local = fuera[str(local)] > fuera[str(visitante)]
        return _fin(
            local if gana_local else visitante,
            visitante if gana_local else local,
            POR_GOL_VISITANTE,
            g_local,
            g_visitante,
        )

    if _hay_penales(decisivo):
        gana_local = decisivo.home_penalties > decisivo.away_penalties
        return _fin(
            local if gana_local else visitante,
            visitante if gana_local else local,
            POR_PENALES,
            g_local,
            g_visitante,
        )

    return _fin(local, visitante, POR_LOCALIA, g_local, g_visitante)


def equipo_del_slot(db: Session, match: Match, slot_type: Any) -> Optional[Any]:
    """Ganador (o perdedor) de la llave de `match`, o None si no se sabe aún."""
    resultado = resolver_llave(db, match)
    if not resultado:
        return None
    return (
        resultado["ganador"]
        if slot_type == SlotType.WINNER_OF
        else resultado["perdedor"]
    )


def propagar_resultado(
    db: Session, match: Match, _visitados: Optional[Set[str]] = None
) -> int:
    """Sincroniza los cruces que dependen de `match` con su resultado actual.

    Devuelve cuántas casillas cambiaron de equipo. No hace commit: lo hace el
    endpoint que lo llama. `_visitados` corta la recursión si un cuadro mal
    armado apunta en círculo.

    Los cruces se buscan por CUALQUIER partido de la llave, no solo por este:
    una casilla "ganador de" apunta a la vuelta, pero terminar la ida también
    puede cambiar el global, así que las dos tienen que disparar el repaso.
    """
    visitados = _visitados if _visitados is not None else set()
    if str(match.id) in visitados:
        return 0
    visitados.add(str(match.id))

    ids = [m.id for m in legs_de_llave(db, match)]
    slots = (
        db.query(StageSlot)
        .filter(
            StageSlot.source_match_id.in_(ids),
            StageSlot.slot_type.in_([SlotType.WINNER_OF, SlotType.LOSER_OF]),
        )
        .all()
    )
    cambios = 0
    for slot in slots:
        equipo = equipo_del_slot(db, match, slot.slot_type)
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
        # Los dos partidos de una llave a ida y vuelta tienen cada uno su
        # casilla apuntando al mismo origen (con la localía invertida), así que
        # el bucle de arriba ya escribe los dos: no hace falta tocar al hermano.
        cambios += propagar_resultado(db, destino, visitados)
    return cambios
