"""Lógica de puntuación por deporte y cálculo de tabla de posiciones."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

TIEBREAKER_LABELS = {
    "PUNTOS": "Points",
    "DIF_GOLES": "Goal Difference",
    "GOLES_FAVOR": "Goals Scored",
    "GOLES_CONTRA": "Goals Conceded (fewer)",
    "FAIR_PLAY": "Fair Play Score",
    "PARTIDO_DIRECTO": "Head-to-Head",
}

DEFAULT_TIEBREAKERS = ["PUNTOS", "DIF_GOLES", "GOLES_FAVOR", "PARTIDO_DIRECTO"]

# Penalización de fair play por tipo de tarjeta (menos = mejor).
FAIR_PLAY_WEIGHTS = {"yellow": 1, "blue": 2, "red": 3}

# Deportes que puntúan como fútbol (victoria / empate / derrota).
FOOTBALL_LIKE_SPORTS = ("football", "micro", "banquitas")

# Valores por defecto de cada disciplina; se aplican al crear el torneo solo
# para los campos que el organizador no envía. Coinciden con los fallbacks ya
# usados al calcular puntos y al generar el calendario.
SPORT_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "football": {
        "points_config": {"win": 3, "draw": 1, "loss": 0},
        "match_duration": 60,
        "waiting_time": 0,
    },
    "micro": {
        "points_config": {"win": 3, "draw": 1, "loss": 0},
        "match_duration": 60,
        "waiting_time": 0,
    },
    "basketball": {
        "points_config": {"win": 2, "loss": 1},
        "match_duration": 60,
        "waiting_time": 0,
    },
    # Banquitas: partidos cortos por tiempo, con empate posible y rotación
    # rápida de canchas, así que el descanso entre partidos viene activado.
    "banquitas": {
        "points_config": {"win": 3, "draw": 1, "loss": 0},
        "match_duration": 20,
        "waiting_time": 5,
    },
}


class SportStrategy(ABC):
    @abstractmethod
    def calculate_points(
        self, home_score: int, away_score: int, rules: Dict
    ) -> tuple:
        ...


class FootballStrategy(SportStrategy):
    def calculate_points(self, home_score, away_score, rules):
        win = rules.get("win", 3)
        draw = rules.get("draw", 1)
        loss = rules.get("loss", 0)
        if home_score > away_score:
            return win, loss
        if home_score < away_score:
            return loss, win
        return draw, draw


class BasketballStrategy(SportStrategy):
    def calculate_points(self, home_score, away_score, rules):
        win = rules.get("win", 2)
        loss = rules.get("loss", 1)
        if home_score >= away_score:
            return win, loss
        return loss, win


class StrategyFactory:
    @staticmethod
    def get_strategy(sport_type: str) -> SportStrategy:
        if sport_type == "basketball":
            return BasketballStrategy()
        if sport_type in FOOTBALL_LIKE_SPORTS:
            return FootballStrategy()
        raise ValueError(f"Deporte no soportado: {sport_type}")


def _rule_value(team: Dict, rule: str) -> float:
    """Devuelve el valor numérico de un criterio para un equipo (mayor = mejor)."""
    if rule == "PUNTOS":
        return team.get("league_points", 0)
    if rule == "DIF_GOLES":
        return team.get("points_scored", 0) - team.get("points_conceded", 0)
    if rule == "GOLES_FAVOR":
        return team.get("points_scored", 0)
    if rule == "GOLES_CONTRA":
        return -team.get("points_conceded", 0)
    if rule == "FAIR_PLAY":
        return -team.get("fair_play_penalty", 0)
    return 0


def _sort_key(team: Dict, rules: List[str]) -> tuple:
    return tuple(_rule_value(team, r) for r in rules if r != "PARTIDO_DIRECTO")


# Criterios por defecto para comparar equipos de grupos distintos (repescados).
# PARTIDO_DIRECTO no aplica: no se enfrentaron entre sí.
DEFAULT_CROSS_TIEBREAKERS = ["PUNTOS", "DIF_GOLES", "GOLES_FAVOR", "GOLES_CONTRA"]


def cross_group_sort_key(team: Dict, rules: Optional[List[str]] = None) -> tuple:
    """Clave de orden (mayor = mejor) para rankear equipos de grupos distintos."""
    return _sort_key(team, rules or DEFAULT_CROSS_TIEBREAKERS)


def _h2h_mini_standings(tied_ids: set, all_matches: List[Dict]) -> Dict:
    """Calcula mini-tabla de enfrentamiento directo entre los equipos empatados."""
    h2h = {tid: {"pts": 0, "gf": 0, "ga": 0} for tid in tied_ids}
    for m in all_matches:
        home = m.get("home_team_id")
        away = m.get("away_team_id")
        if home not in tied_ids or away not in tied_ids:
            continue
        hs = m.get("home_score")
        away_s = m.get("away_score")
        if hs is None or away_s is None:
            continue
        hs, away_s = int(hs), int(away_s)
        h2h[home]["gf"] += hs
        h2h[home]["ga"] += away_s
        h2h[away]["gf"] += away_s
        h2h[away]["ga"] += hs
        if hs > away_s:
            h2h[home]["pts"] += 3
        elif hs < away_s:
            h2h[away]["pts"] += 3
        else:
            h2h[home]["pts"] += 1
            h2h[away]["pts"] += 1
    return h2h


def _h2h_key(stats: Dict) -> tuple:
    return (
        stats.get("pts", 0),
        stats.get("gf", 0) - stats.get("ga", 0),
        stats.get("gf", 0),
    )


def calculate_standings(
    matches: List[Dict],
    sport_type: str,
    tiebreaker_rules: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Calcula la tabla de posiciones aplicando los criterios de desempate
    en el orden definido por `tiebreaker_rules`.

    Criterios soportados:
        PUNTOS           – puntos de liga (siempre recomendado como 1º)
        DIF_GOLES        – diferencia de goles / puntos
        GOLES_FAVOR      – goles / puntos anotados
        GOLES_CONTRA     – goles / puntos recibidos (menos = mejor)
        FAIR_PLAY        – penalización por tarjetas (menos = mejor)
        PARTIDO_DIRECTO  – enfrentamiento directo entre equipos empatados
    """
    rules = tiebreaker_rules or DEFAULT_TIEBREAKERS
    strategy = StrategyFactory.get_strategy(sport_type)

    team_ids = set()
    for m in matches:
        if m.get("home_team_id"):
            team_ids.add(m["home_team_id"])
        if m.get("away_team_id"):
            team_ids.add(m["away_team_id"])

    table = {
        tid: {
            "team_id": tid,
            "team_name": None,
            "matches_played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "league_points": 0,
            "points_scored": 0,
            "points_conceded": 0,
            "fair_play_penalty": 0,
        }
        for tid in team_ids
    }

    for m in matches:
        home = m.get("home_team_id")
        away = m.get("away_team_id")
        if not home or not away:
            continue
        if m.get("home_team_name") and table[home]["team_name"] is None:
            table[home]["team_name"] = m.get("home_team_name")
        if m.get("away_team_name") and table[away]["team_name"] is None:
            table[away]["team_name"] = m.get("away_team_name")

        hs = m.get("home_score")
        away_s = m.get("away_score")
        if hs is None or away_s is None:
            continue
        hs, away_s = int(hs), int(away_s)

        hp, ap = strategy.calculate_points(hs, away_s, m.get("rules") or {})
        table[home]["league_points"] += hp
        table[away]["league_points"] += ap
        table[home]["points_scored"] += hs
        table[home]["points_conceded"] += away_s
        table[away]["points_scored"] += away_s
        table[away]["points_conceded"] += hs
        table[home]["matches_played"] += 1
        table[away]["matches_played"] += 1
        if hs > away_s:
            table[home]["wins"] += 1
            table[away]["losses"] += 1
        elif hs < away_s:
            table[away]["wins"] += 1
            table[home]["losses"] += 1
        else:
            table[home]["draws"] += 1
            table[away]["draws"] += 1

        for ev in (m.get("events") or []):
            data = ev.get("event_data") or {}
            etype = (ev.get("event_type") or data.get("type") or "").upper()
            side = data.get("team")
            target = home if side == "home" else (away if side == "away" else None)
            if target is None:
                continue
            if etype in ("AMARILLA", "YELLOW"):
                table[target]["fair_play_penalty"] += FAIR_PLAY_WEIGHTS["yellow"]
            elif etype in ("AZUL", "BLUE"):
                table[target]["fair_play_penalty"] += FAIR_PLAY_WEIGHTS["blue"]
            elif etype in ("ROJA", "RED"):
                table[target]["fair_play_penalty"] += FAIR_PLAY_WEIGHTS["red"]

    standings = list(table.values())
    standings.sort(key=lambda t: _sort_key(t, rules), reverse=True)

    # Desempate por enfrentamiento directo entre equipos con la misma clave.
    if "PARTIDO_DIRECTO" in rules:
        i, n = 0, len(standings)
        while i < n:
            j = i + 1
            while j < n and _sort_key(standings[j], rules) == _sort_key(
                standings[i], rules
            ):
                j += 1
            if j - i > 1:
                tied = standings[i:j]
                tied_ids = {t["team_id"] for t in tied}
                mini = _h2h_mini_standings(tied_ids, matches)
                tied.sort(key=lambda t: _h2h_key(mini[t["team_id"]]), reverse=True)
                standings[i:j] = tied
            i = j

    for idx, row in enumerate(standings, start=1):
        row["position"] = idx
        row["diff"] = row["points_scored"] - row["points_conceded"]
    return standings
