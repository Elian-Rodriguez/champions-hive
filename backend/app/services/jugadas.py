"""Cómo se arma la ficha de una jugada destacada para el cliente.

Vive en `services/` y no dentro de un router porque lo necesitan dos: el reel
público y del organizador (`api/highlight_routes.py`) y el panel del capitán
(`api/captain_routes.py`). Importar un `_payload` con guion bajo de un router a
otro sería decir que es privado y usarlo igual; duplicarlo sería dos verdades
que se separan la primera vez que alguien agrega un campo.

Lo que resuelve es nombres: el reel es una grilla de tarjetas, y resolver
jugador, equipo y rótulo del partido tarjeta por tarjeta serían tres consultas
por clip. Aquí se piden todos de una vez.

**Trabaja con varios torneos a la vez a propósito.** El organizador mira un
campeonato, pero el capitán puede llevar equipos en dos —y de disciplinas
distintas—, así que la etiqueta de la jugada («Moñona», «Atajada») se busca en
el catálogo del torneo de CADA fila y no en uno solo.
"""
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.db.models import Match, MatchHighlight, Team, Tournament
from app.services.strategy import jugadas_de


def deporte_de(torneo: Optional[Tournament]) -> str:
    """La disciplina como texto; el enum no sirve para buscar en el catálogo."""
    deporte = getattr(torneo, "sport_type", None)
    return str(getattr(deporte, "value", deporte) or "")


def ordenadas(filas: Iterable[MatchHighlight]) -> List[MatchHighlight]:
    """Primero lo que el organizador puso arriba, después lo más nuevo."""
    return sorted(
        filas,
        key=lambda f: (
            -(f.order_index or 0),
            -(f.created_at.timestamp() if f.created_at else 0),
        ),
    )


def payload_jugadas(
    db: Session,
    filas: List[MatchHighlight],
    torneos: Optional[Dict[str, Tournament]] = None,
    *,
    equipos_propios: Optional[Iterable[Any]] = None,
) -> List[Dict[str, Any]]:
    """Las jugadas listas para pintar, con los nombres ya resueltos.

    `torneos` evita una consulta cuando quien llama ya tiene el torneo en la
    mano (el caso del organizador). `equipos_propios` marca cada fila con
    `is_mine` (True, False o None si no tiene equipo etiquetado), que es lo que
    permite al capitán distinguir el golazo de su equipo del que le hicieron en
    el mismo partido.
    """
    if not filas:
        return []

    # --- Torneos (para saber qué catálogo de jugadas aplica a cada fila) ---
    cache: Dict[str, Tournament] = dict(torneos or {})
    faltantes = {
        str(f.tournament_id)
        for f in filas
        if f.tournament_id and str(f.tournament_id) not in cache
    }
    if faltantes:
        for t in db.query(Tournament).filter(Tournament.id.in_(list(faltantes))).all():
            cache[str(t.id)] = t
    catalogos = {tid: jugadas_de(deporte_de(t)) for tid, t in cache.items()}

    # --- Jugadores ---
    from app.db.models import Player  # local: evita un ciclo al importar

    ids_jugador = {f.player_id for f in filas if f.player_id}
    jugadores = (
        {
            str(p.id): p.name
            for p in db.query(Player).filter(Player.id.in_(ids_jugador)).all()
        }
        if ids_jugador
        else {}
    )

    # --- Partidos y equipos ---
    ids_partido = {f.match_id for f in filas if f.match_id}
    partidos = (
        {str(m.id): m for m in db.query(Match).filter(Match.id.in_(ids_partido)).all()}
        if ids_partido
        else {}
    )

    ids_equipo = {f.team_id for f in filas if f.team_id}
    for m in partidos.values():
        ids_equipo.update({m.home_team_id, m.away_team_id})
    ids_equipo.discard(None)
    equipos = (
        {
            str(t.id): t.name
            for t in db.query(Team).filter(Team.id.in_(ids_equipo)).all()
        }
        if ids_equipo
        else {}
    )

    mios = {str(e) for e in (equipos_propios or [])}

    def rotulo(match_id) -> Optional[str]:
        m = partidos.get(str(match_id)) if match_id else None
        if not m:
            return None
        local = equipos.get(str(m.home_team_id), "Por definir")
        visita = equipos.get(str(m.away_team_id), "Por definir")
        return f"{local} vs {visita}"

    salida = []
    for f in filas:
        catalogo = catalogos.get(str(f.tournament_id), {})
        torneo = cache.get(str(f.tournament_id))
        ficha = {
            "id": f.id,
            "tournament_id": f.tournament_id,
            "match_id": f.match_id,
            "team_id": f.team_id,
            "player_id": f.player_id,
            "play_type": f.play_type,
            "play_label": catalogo.get(f.play_type or "", f.play_type),
            "title": f.title,
            "minute": f.minute,
            "storage": f.storage,
            # El espejo en el CDN manda si existe: es más rápido que el disco
            # del servidor y es para lo que se configuró.
            "video_url": f.external_url or f.video_url,
            "poster_url": f.poster_url,
            "mime_type": f.mime_type,
            "size_bytes": f.size_bytes,
            "duration_seconds": f.duration_seconds,
            "external_url": f.external_url,
            "published": bool(f.published),
            "order_index": f.order_index or 0,
            "created_at": f.created_at,
            "player_name": jugadores.get(str(f.player_id)) if f.player_id else None,
            "team_name": equipos.get(str(f.team_id)) if f.team_id else None,
            "match_label": rotulo(f.match_id),
            # Contexto del campeonato: el capitán lista varios a la vez y sin
            # esto no sabría de cuál es cada clip (ni el marco qué nombre y qué
            # logo pintar).
            "tournament_name": getattr(torneo, "name", None),
            "tournament_logo_url": getattr(torneo, "logo_url", None),
            "sport_type": deporte_de(torneo) or None,
        }
        if equipos_propios is not None:
            # Tres estados y no dos: una jugada SIN equipo etiquetado —la del
            # partido que nadie atribuyó— no es mía ni del rival, y decir
            # `false` haría que la pantalla la rotulara «del rival», que es
            # sencillamente falso.
            ficha["is_mine"] = (str(f.team_id) in mios) if f.team_id else None
        salida.append(ficha)
    return salida
