"""Suspensiones por acumulación de tarjetas. **Opcional por torneo.**

Es la mitad del reglamento que faltaba: el árbitro cargaba la amarilla y ahí
moría. Tres amarillas son una fecha en casi cualquier liga, y la pregunta que
importa el sábado —«¿quién no puede jugar mañana?»— no tenía respuesta.

Va apagado salvo que el organizador lo encienda, y esa es una decisión de
producto, no una comodidad técnica: hay ligas que llevan la disciplina en un
comité y no quieren que el sistema marque a nadie, y hay torneos ya empezados
donde encenderlo a mitad de camino cambiaría el reglamento con el campeonato
andando. Sin `discipline_config.enabled` esto no existe para ese torneo.

Como la tabla de posiciones, **no se guarda nada**: se recalcula desde los
eventos. Una tarjeta corregida o borrada por el árbitro mueve la suspensión al
instante, que es justo lo que hace falta cuando el error se descubre el domingo
por la mañana.

Las **sanciones manuales** (`PlayerSanction`) son la otra mitad y van por
fuera del interruptor: las decide el comité —la agresión del informe arbitral,
la alineación indebida— y una liga que no quiere el contador automático es
justamente la que más las usa. Lo que se guarda es la decisión (fechas y
motivo); las fechas cumplidas se recalculan igual que las de la acumulación,
así que salen en la misma lista y la planilla del árbitro las marca igual.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import (
    Match,
    MatchStat,
    Player,
    PlayerSanction,
    Stage,
    Team,
    TeamPlayer,
    Tournament,
)

# Tarjetas que suman para la acumulación y tarjetas que expulsan de una vez.
# La técnica de baloncesto acumula como una amarilla y la antideportiva pesa
# como una roja: son los equivalentes de esa disciplina.
ACUMULAN = {"AMARILLA": "yellow", "YELLOW": "yellow", "TECNICA": "yellow"}
AZULES = {"AZUL", "BLUE"}
EXPULSAN = {"ROJA", "RED", "ANTIDEPORTIVA"}

# Valores por defecto del reglamento cuando el organizador lo enciende. Solo se
# usan si no fija los suyos: 3 amarillas y una fecha es lo más común en fútbol.
DEFAULTS: Dict[str, Any] = {
    "enabled": False,
    "yellow_limit": 3,  # amarillas que cuestan una suspensión
    "yellow_matches": 1,  # fechas por acumulación de amarillas
    "red_matches": 1,  # fechas por roja directa
    "double_yellow_matches": 1,  # fechas por doble amarilla (expulsión)
    "blue_limit": 0,  # 0 = las azules no acumulan
    "blue_matches": 1,
    # Desde qué fase vuelven a contarse las tarjetas. Es la regla de «las
    # amarillas se borran para la fase final»; null = cuentan todas.
    "reset_stage_id": None,
}

# Topes defensivos de la configuración: un reglamento habla de unas pocas
# tarjetas y unas pocas fechas; más que esto es un dedo pegado en el teclado.
LIMITES = {
    "yellow_limit": (1, 20),
    "yellow_matches": (0, 10),
    "red_matches": (0, 10),
    "double_yellow_matches": (0, 10),
    "blue_limit": (0, 20),
    "blue_matches": (0, 10),
}


def config_de(tournament: Tournament) -> Dict[str, Any]:
    """La configuración efectiva del torneo, con los valores por defecto."""
    cfg = dict(DEFAULTS)
    cfg.update(tournament.discipline_config or {})
    return cfg


def esta_activa(tournament: Tournament) -> bool:
    return bool((tournament.discipline_config or {}).get("enabled"))


def validar_config(cfg: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Deja pasar solo claves conocidas y números con sentido."""
    if cfg is None:
        return None
    if not isinstance(cfg, dict):
        raise ValueError("La configuración disciplinaria debe ser un objeto")
    limpio: Dict[str, Any] = {"enabled": bool(cfg.get("enabled"))}
    for clave, (minimo, maximo) in LIMITES.items():
        if cfg.get(clave) is None:
            continue
        try:
            valor = int(cfg[clave])
        except (TypeError, ValueError):
            raise ValueError(f"«{clave}» debe ser un número entero")
        if not minimo <= valor <= maximo:
            raise ValueError(f"«{clave}» debe estar entre {minimo} y {maximo}")
        limpio[clave] = valor
    if cfg.get("reset_stage_id"):
        limpio["reset_stage_id"] = str(cfg["reset_stage_id"])
    return limpio


def _clave_orden(m: Match):
    """Orden cronológico de los partidos, con los que no tienen fecha al final."""
    return (m.scheduled_start is None, m.scheduled_start or datetime.min, str(m.id))


def _estado(m: Match) -> str:
    return getattr(m.status, "value", m.status)


def _fases_que_cuentan(db: Session, tournament: Tournament, cfg: Dict) -> List:
    """Fases desde las que cuentan las tarjetas (`reset_stage_id` en adelante)."""
    fases = sorted(
        db.query(Stage).filter(Stage.tournament_id == tournament.id).all(),
        key=lambda s: (s.order_index or 0),
    )
    desde = cfg.get("reset_stage_id")
    if desde:
        corte = next(
            (s.order_index or 0 for s in fases if str(s.id) == str(desde)), None
        )
        if corte is not None:
            fases = [s for s in fases if (s.order_index or 0) >= corte]
    return [s.id for s in fases]


def _cumplimiento(
    siguientes: List[Match], fechas: int
) -> Tuple[int, int, Optional[Match]]:
    """(cumplidas, faltan, próximo partido) de una suspensión de `fechas`.

    Se cumple con los partidos que el equipo TERMINÓ después del hecho. No se
    mira quién estuvo en la planilla a propósito: si el suspendido jugó igual,
    eso es una alineación indebida y la resuelve el organizador, no un contador.
    """
    cumplidas = min(sum(1 for m in siguientes if _estado(m) == "finished"), fechas)
    proximo = next(
        (m for m in siguientes if _estado(m) in ("scheduled", "live")), None
    )
    return cumplidas, fechas - cumplidas, proximo


def _proximo_payload(proximo: Optional[Match]) -> Optional[Dict[str, Any]]:
    if not proximo:
        return None
    return {"id": str(proximo.id), "scheduled_start": proximo.scheduled_start}


def sanciones_manuales(db: Session, tournament: Tournament) -> List[PlayerSanction]:
    """Las sanciones del comité vigentes (las anuladas no suspenden a nadie)."""
    return (
        db.query(PlayerSanction)
        .filter(
            PlayerSanction.tournament_id == tournament.id,
            PlayerSanction.status != "annulled",
        )
        .all()
    )


def _partidos_del_torneo(db: Session, tournament: Tournament) -> List[Match]:
    stage_ids = [
        s.id for s in db.query(Stage).filter(Stage.tournament_id == tournament.id).all()
    ]
    if not stage_ids:
        return []
    partidos = db.query(Match).filter(Match.stage_id.in_(stage_ids)).all()
    partidos.sort(key=_clave_orden)
    return partidos


def estado_de_sancion(
    s: PlayerSanction, partidos: List[Match]
) -> Dict[str, Any]:
    """Fechas cumplidas y pendientes de una sanción manual.

    Cuentan los partidos del equipo posteriores al partido donde ocurrió, o —si
    la sanción no dice partido— los que se juegan desde que se cargó. Los
    partidos sin fecha van al final del calendario, así que cuentan como
    posteriores: es lo que pasa en una liga que nunca carga horarios.
    """
    equipo = str(s.team_id) if s.team_id else None
    del_equipo = [
        m
        for m in partidos
        if equipo and equipo in (str(m.home_team_id), str(m.away_team_id))
    ]
    if s.match_id:
        ids = [str(m.id) for m in del_equipo]
        corte = ids.index(str(s.match_id)) + 1 if str(s.match_id) in ids else 0
        siguientes = del_equipo[corte:]
    else:
        desde = s.created_at or datetime.min
        siguientes = [
            m for m in del_equipo
            if m.scheduled_start is None or m.scheduled_start >= desde
        ]
    fechas = int(s.matches or 0)
    cumplidas, faltan, proximo = _cumplimiento(siguientes, fechas)
    return {
        "served": cumplidas,
        "pending": faltan if s.status != "annulled" else 0,
        "next_match": _proximo_payload(proximo) if faltan > 0 else None,
    }


def calcular(db: Session, tournament: Tournament) -> Dict[str, Any]:
    """Quién está suspendido y quién está a una tarjeta de estarlo.

    Devuelve siempre la misma forma; con el reglamento apagado y sin sanciones
    del comité, las listas van vacías y el frontend no dibuja la sección.
    `enabled` habla solo del contador automático; cada sanción dice de dónde
    sale en `source` (`auto` o `manual`).
    """
    cfg = config_de(tournament)
    vacio = {"enabled": False, "config": cfg, "sanctions": [], "at_risk": []}
    manuales = sanciones_manuales(db, tournament)
    if not cfg.get("enabled") and not manuales:
        return vacio

    sanciones: List[Dict[str, Any]] = []
    en_riesgo: List[Dict[str, Any]] = []
    if cfg.get("enabled"):
        sanciones, en_riesgo = _automaticas(db, tournament, cfg)
    if manuales:
        sanciones.extend(_manuales_payload(db, tournament, manuales))

    sanciones.sort(key=lambda s: (s["team_name"] or "", s["player_name"]))
    en_riesgo.sort(key=lambda s: (s["team_name"] or "", s["player_name"]))
    return {
        "enabled": bool(cfg.get("enabled")),
        "config": cfg,
        "sanctions": sanciones,
        "at_risk": en_riesgo,
    }


def _manuales_payload(
    db: Session, tournament: Tournament, manuales: List[PlayerSanction]
) -> List[Dict[str, Any]]:
    """Las sanciones del comité que todavía dejan a alguien sin jugar."""
    partidos = _partidos_del_torneo(db, tournament)
    jugadores = {
        str(p.id): p.name
        for p in db.query(Player).filter(
            Player.id.in_([s.player_id for s in manuales if s.player_id])
        ).all()
    }
    equipos = {
        str(t.id): t.name
        for t in db.query(Team).filter(
            Team.id.in_([s.team_id for s in manuales if s.team_id])
        ).all()
    }
    out: List[Dict[str, Any]] = []
    for s in manuales:
        if not s.matches:
            continue  # amonestación: queda registrada pero no suspende
        estado = estado_de_sancion(s, partidos)
        if estado["pending"] <= 0:
            continue
        out.append(
            {
                "player_id": str(s.player_id),
                "player_name": jugadores.get(str(s.player_id), "—"),
                "team_id": str(s.team_id) if s.team_id else None,
                "team_name": equipos.get(str(s.team_id)),
                "reason": s.reason,
                "matches": s.matches,
                "served": estado["served"],
                "pending": estado["pending"],
                "since_match_id": str(s.match_id) if s.match_id else None,
                "next_match": estado["next_match"],
                "source": "manual",
                "sanction_id": str(s.id),
            }
        )
    return out


def _automaticas(
    db: Session, tournament: Tournament, cfg: Dict[str, Any]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """(sanciones, en riesgo) que salen de contar tarjetas."""
    stage_ids = _fases_que_cuentan(db, tournament, cfg)
    if not stage_ids:
        return [], []
    partidos = db.query(Match).filter(Match.stage_id.in_(stage_ids)).all()
    if not partidos:
        return [], []

    partidos.sort(key=_clave_orden)
    posicion = {str(m.id): i for i, m in enumerate(partidos)}
    por_equipo: Dict[str, List[Match]] = {}
    for m in partidos:
        for tid in (m.home_team_id, m.away_team_id):
            if tid:
                por_equipo.setdefault(str(tid), []).append(m)

    # Solo las tarjetas de partidos terminados: una amarilla de un partido en
    # curso todavía puede corregirse, y suspender a alguien por ella sería
    # llegar antes que el acta.
    ids_terminados = [m.id for m in partidos if _estado(m) == "finished"]
    if not ids_terminados:
        return [], []
    eventos = (
        db.query(MatchStat)
        .filter(
            MatchStat.match_id.in_(ids_terminados),
            MatchStat.player_id.isnot(None),
        )
        .all()
    )
    if not eventos:
        return [], []

    partido_por_id = {str(m.id): m for m in partidos}

    # Tarjetas por jugador y por partido, en orden cronológico.
    tarjetas: Dict[str, Dict[str, List[MatchStat]]] = {}
    for e in eventos:
        tipo = (e.event_type or "").upper()
        if tipo not in ACUMULAN and tipo not in EXPULSAN and tipo not in AZULES:
            continue
        tarjetas.setdefault(str(e.player_id), {}).setdefault(
            str(e.match_id), []
        ).append(e)

    nombres_jugador = {
        str(p.id): p.name
        for p in db.query(Player).filter(Player.id.in_(list(tarjetas.keys()))).all()
    } if tarjetas else {}
    nombres_equipo = {
        str(t.id): t.name for t in db.query(Team).filter(Team.id.in_(
            [tid for tid in por_equipo.keys()]
        )).all()
    } if por_equipo else {}
    # Equipo de respaldo cuando el evento no dice de qué lado fue la tarjeta.
    equipo_de_nomina = {
        str(l.player_id): str(l.team_id)
        for l in db.query(TeamPlayer)
        .filter(TeamPlayer.player_id.in_(list(tarjetas.keys())))
        .all()
    } if tarjetas else {}

    def equipo_del_evento(ev: MatchStat, match: Match) -> Optional[str]:
        lado = (ev.event_data or {}).get("team")
        if lado == "home" and match.home_team_id:
            return str(match.home_team_id)
        if lado == "away" and match.away_team_id:
            return str(match.away_team_id)
        return equipo_de_nomina.get(str(ev.player_id))

    sanciones: List[Dict[str, Any]] = []
    en_riesgo: List[Dict[str, Any]] = []

    for pid, por_partido in tarjetas.items():
        amarillas = 0
        azules = 0
        equipo_actual = equipo_de_nomina.get(pid)
        pendientes: List[Dict[str, Any]] = []
        for mid in sorted(por_partido, key=lambda x: posicion.get(x, 0)):
            match = partido_por_id.get(mid)
            if not match:
                continue
            del_partido = por_partido[mid]
            equipo = equipo_del_evento(del_partido[0], match) or equipo_actual
            equipo_actual = equipo or equipo_actual
            tipos = [(e.event_type or "").upper() for e in del_partido]
            amarillas_aqui = sum(1 for t in tipos if t in ACUMULAN)
            azules_aqui = sum(1 for t in tipos if t in AZULES)
            rojas_aqui = sum(1 for t in tipos if t in EXPULSAN)

            if rojas_aqui:
                pendientes.append(
                    {
                        "motivo": "Roja directa",
                        "matches": cfg["red_matches"],
                        "match_id": mid,
                        "team_id": equipo,
                    }
                )
            elif amarillas_aqui >= 2:
                # Doble amarilla: ya se paga como expulsión, así que esas dos
                # no vuelven a cobrarse en la acumulación.
                pendientes.append(
                    {
                        "motivo": "Doble amarilla",
                        "matches": cfg["double_yellow_matches"],
                        "match_id": mid,
                        "team_id": equipo,
                    }
                )
            else:
                amarillas += amarillas_aqui
                while cfg["yellow_limit"] and amarillas >= cfg["yellow_limit"]:
                    amarillas -= cfg["yellow_limit"]
                    pendientes.append(
                        {
                            "motivo": f"{cfg['yellow_limit']} amarillas",
                            "matches": cfg["yellow_matches"],
                            "match_id": mid,
                            "team_id": equipo,
                        }
                    )
            if cfg["blue_limit"]:
                azules += azules_aqui
                while azules >= cfg["blue_limit"]:
                    azules -= cfg["blue_limit"]
                    pendientes.append(
                        {
                            "motivo": f"{cfg['blue_limit']} azules",
                            "matches": cfg["blue_matches"],
                            "match_id": mid,
                            "team_id": equipo,
                        }
                    )

        for s in pendientes:
            equipo = s["team_id"]
            if not equipo or not s["matches"]:
                continue
            desde = posicion.get(s["match_id"], 0)
            siguientes = [
                m for m in por_equipo.get(equipo, []) if posicion[str(m.id)] > desde
            ]
            cumplidas, faltan, proximo = _cumplimiento(siguientes, s["matches"])
            if faltan <= 0:
                continue
            sanciones.append(
                {
                    "player_id": pid,
                    "player_name": nombres_jugador.get(pid, "—"),
                    "team_id": equipo,
                    "team_name": nombres_equipo.get(equipo),
                    "reason": s["motivo"],
                    "matches": s["matches"],
                    "served": cumplidas,
                    "pending": faltan,
                    "since_match_id": s["match_id"],
                    "next_match": _proximo_payload(proximo),
                    "source": "auto",
                    "sanction_id": None,
                }
            )

        # A una tarjeta de la suspensión: es el aviso que el capitán agradece
        # antes del partido, no después.
        if cfg["yellow_limit"] > 1 and amarillas == cfg["yellow_limit"] - 1:
            en_riesgo.append(
                {
                    "player_id": pid,
                    "player_name": nombres_jugador.get(pid, "—"),
                    "team_id": equipo_actual,
                    "team_name": nombres_equipo.get(str(equipo_actual)),
                    "yellows": amarillas,
                    "missing": 1,
                }
            )

    return sanciones, en_riesgo


def suspendidos_por_equipo(db: Session, tournament: Tournament) -> Dict[str, set]:
    """{team_id: {player_id, …}} de quienes no pueden jugar el próximo partido.

    Es lo que consulta la planilla del árbitro para avisar antes de que el
    suspendido entre a la cancha.
    """
    datos = calcular(db, tournament)
    fuera: Dict[str, set] = {}
    for s in datos["sanctions"]:
        fuera.setdefault(str(s["team_id"]), set()).add(str(s["player_id"]))
    return fuera
