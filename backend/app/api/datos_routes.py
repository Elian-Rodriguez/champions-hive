"""Datos que entran y salen en Excel: la nómina que llega y las tablas que se van.

- `GET  /datos/plantilla_nomina.xlsx` — la plantilla para los delegados.
- `POST /tournaments/{id}/import/roster` — sube la nómina (`dry_run` primero;
  ver `services/nominas.py`).
- `GET  /tournaments/{id}/export.xlsx` — posiciones, calendario, goleadores,
  valla y, si se publican, juego limpio, sanciones y nóminas.

La exportación respeta los mismos interruptores que el marcador público: lo
que el organizador oculta no sale en el Excel de nadie más que él. Y el
documento de identidad solo va en la exportación del organizador: el Excel
circula por toda la liga y la cédula de un jugador no es dato de la tabla.
"""
import re
import unicodedata
from datetime import timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app.api.tournament_routes import (
    fairplay,
    get_player_stats,
    get_stage_matches,
    get_stage_standings_by_group,
    get_team_stats,
    get_valla,
)
from app.core.config import settings
from app.core.deps import get_current_user_optional, puede_administrar, require_staff
from app.db.database import get_db
from app.db.models import (
    Player,
    Stage,
    Team,
    TeamPlayer,
    Tournament,
    TournamentTeam,
    User,
)
from app.services import auditoria, disciplina, excel, nominas
from app.services.excel import encabezado, titulo

router = APIRouter()

# Cómo se nombra cada cosa en cada disciplina, la mitad del backend de
# `scorersLabel` / `defenseLabel` en sports.ts.
ROTULOS: Dict[str, Dict[str, str]] = {
    "basketball": {"anotadores": "Anotadores", "anota": "Puntos", "favor": "PF", "contra": "PC", "defensa": "Mejor defensa"},
    "tejo": {"anotadores": "Anotadores", "anota": "Puntos", "favor": "PF", "contra": "PC", "defensa": "Menos puntos recibidos"},
}
ROTULOS_FUTBOL = {"anotadores": "Goleadores", "anota": "Goles", "favor": "GF", "contra": "GC", "defensa": "Valla menos vencida"}
# Las disciplinas sin empate no muestran la columna: una columna de ceros con
# aire de estadística es peor que no tenerla (lo mismo que `drawsPossible`).
SIN_EMPATE = {"basketball", "tejo"}

ESTADOS = {
    "scheduled": "Programado",
    "live": "En vivo",
    "finished": "Finalizado",
    "postponed": "Aplazado",
}
WO = {"home": "No se presentó el local", "away": "No se presentó el visitante", "both": "No se presentó ninguno"}


def _deporte(t: Tournament) -> str:
    return str(getattr(t.sport_type, "value", t.sport_type))


def _publica(t: Tournament, seccion: str, user) -> bool:
    return bool((t.visibility or {}).get(seccion, True)) or puede_administrar(user, t)


def _archivo(nombre: str) -> str:
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower() or "campeonato"


def _xlsx(contenido: bytes, nombre: str) -> Response:
    return Response(
        content=contenido,
        media_type=excel.MIME_XLSX,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{_archivo(nombre)}.xlsx"; '
                f"filename*=UTF-8''{quote(nombre)}.xlsx"
            ),
            "Cache-Control": "no-store",
        },
    )


# --------------------------------------------------------------------------- #
#  Importar
# --------------------------------------------------------------------------- #
@router.get("/datos/plantilla_nomina.xlsx")
def roster_template():
    """La plantilla que el organizador reparte entre los delegados."""
    nomina = [
        encabezado("Equipo", "Grupo", "Jugador", "Documento", "Dorsal", "Correo"),
        ["Atlético San José", "A", "Juan Pérez", "1023456789", 10, "juan@correo.com"],
        ["", "", "Carlos Gómez", "1098765432", 7, ""],
        ["Deportivo La 40", "B", "Andrés Ruiz", "79123456", 1, ""],
    ]
    instrucciones = [
        encabezado("Cómo llenar la nómina"),
        ["Una fila por jugador. Solo «Equipo» y «Jugador» son obligatorios."],
        ["Si el nombre del equipo queda vacío, se toma el de la fila de arriba (sirve con celdas combinadas)."],
        ["El documento identifica al jugador: subir la planilla de nuevo actualiza, no duplica."],
        ["Un jugador no puede estar en dos equipos del mismo campeonato."],
        ["«Grupo» es opcional: si va, el equipo queda en ese grupo."],
        ["Una fila con solo el equipo inscribe el equipo sin jugadores."],
        ["Se acepta .xlsx o .csv (separado por ; o ,)."],
    ]
    return _xlsx(
        excel.escribir([("Nómina", nomina, True), ("Instrucciones", instrucciones, False)]),
        "Plantilla de nómina",
    )


@router.post("/tournaments/{tournament_id}/import/roster")
def import_roster(
    tournament_id: UUID,
    file: UploadFile = File(...),
    dry_run: bool = True,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Importa equipos y jugadores desde la planilla.

    Con `dry_run=true` (el valor por defecto, a propósito) solo dice lo que
    haría. Con `false` lo hace, y solo si la planilla no tiene errores: o entra
    todo o no entra nada.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if not puede_administrar(current, torneo):
        raise HTTPException(status_code=403, detail="Este torneo pertenece a otro administrador")

    contenido = file.file.read(excel.MAX_ARCHIVO + 1)
    try:
        filas = excel.leer(contenido, file.filename)
        analisis = nominas.analizar(db, torneo, filas)
    except (excel.PlanillaInvalida, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    analisis["dry_run"] = dry_run
    if dry_run:
        return analisis
    if analisis["errors"]:
        raise HTTPException(
            status_code=400,
            detail=(
                f"La planilla tiene {len(analisis['errors'])} error(es); "
                "corrígelos y vuelve a subirla. No se importó nada."
            ),
        )
    resultado = nominas.aplicar(db, torneo, analisis)
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_IMPORTACION,
        resumen=(
            f"Importó la nómina desde «{file.filename or 'planilla'}»: "
            f"{resultado['teams_created']} equipo(s) nuevo(s), "
            f"{resultado['players_created']} jugador(es) nuevo(s), "
            f"{resultado['players_updated']} actualizado(s)"
        ),
        tournament_id=torneo.id,
        datos={"archivo": file.filename, **resultado},
    )
    db.commit()
    return {**analisis, "result": resultado}


# --------------------------------------------------------------------------- #
#  Exportar
# --------------------------------------------------------------------------- #
def _local(dt):
    """La hora del campeonato: en el Excel no hay navegador que la convierta."""
    return dt + timedelta(minutes=settings.TIMEZONE_OFFSET_MINUTES) if dt else None


def _hoja_posiciones(db: Session, torneo: Tournament, fases: List[Stage], r: Dict[str, str]) -> List[list]:
    con_empate = _deporte(torneo) not in SIN_EMPATE
    cols = ["#", "Equipo", "PJ", "G"] + (["E"] if con_empate else []) + ["P", r["favor"], r["contra"], "Dif", "Pts", "Ajuste"]
    filas: List[list] = []

    def bloque(nombre: str, tabla: List[Dict[str, Any]]):
        if not tabla:
            return
        if filas:
            filas.append([])
        filas.append(titulo(nombre))
        filas.append(encabezado(*cols))
        for row in tabla:
            filas.append(
                [row.get("position"), row.get("team_name") or "—", row.get("matches_played"), row.get("wins")]
                + ([row.get("draws")] if con_empate else [])
                + [
                    row.get("losses"),
                    row.get("points_scored"),
                    row.get("points_conceded"),
                    row.get("diff", (row.get("points_scored") or 0) - (row.get("points_conceded") or 0)),
                    row.get("league_points"),
                    row.get("points_adjustment") or None,
                ]
            )

    for fase in fases:
        tipo = str(getattr(fase.type, "value", fase.type))
        if tipo == "knockout":
            continue
        if tipo == "group":
            grupos = get_stage_standings_by_group(fase.id, db)
            for grupo in sorted(grupos):
                etiqueta = fase.name if grupo == "Sin Grupo" else f"{fase.name} · Grupo {grupo}"
                bloque(etiqueta, grupos[grupo])
        else:
            bloque(fase.name, get_team_stats(torneo.id, fase.id, "only", db))
    return filas


def _hoja_calendario(db: Session, fases: List[Stage]) -> List[list]:
    filas = [encabezado("Fase", "Grupo", "Fecha (hora local)", "Local", "Marcador", "Visitante", "Estado", "Penales", "Observación", "Cancha", "Sede", "Árbitro")]
    partidos = []
    for fase in fases:
        partidos.extend(get_stage_matches(fase.id, db))
    partidos.sort(key=lambda m: (m.get("scheduled_start") is None, m.get("scheduled_start") or 0, m.get("stage_name") or ""))
    for m in partidos:
        jugado = m.get("status") in ("finished", "live")
        penales = (
            f"{m['home_penalties']}-{m['away_penalties']}"
            if m.get("home_penalties") is not None and m.get("away_penalties") is not None
            else None
        )
        nota = WO.get(m.get("walkover")) if m.get("walkover") else None
        if m.get("leg"):
            nota = ((nota + " · ") if nota else "") + ("Ida" if m["leg"] == 1 else "Vuelta")
        filas.append([
            m.get("stage_name"),
            m.get("group_name"),
            _local(m.get("scheduled_start")),
            m.get("home_team_name") or "Por definir",
            f"{m.get('home_score')}-{m.get('away_score')}" if jugado else None,
            m.get("away_team_name") or "Por definir",
            ESTADOS.get(m.get("status"), m.get("status")),
            penales,
            nota,
            m.get("court_name"),
            m.get("venue_name"),
            m.get("referee_name"),
        ])
    return filas


@router.get("/tournaments/{tournament_id}/export.xlsx")
def export_tournament(
    tournament_id: UUID,
    stage_id: Optional[UUID] = None,
    mode: str = "from",
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """El campeonato en un libro de Excel, una hoja por tabla.

    `stage_id` + `mode` acotan goleadores, valla y juego limpio igual que el
    filtro «Cuentan desde» del marcador; las posiciones van siempre por fase.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    r = ROTULOS.get(_deporte(torneo), ROTULOS_FUTBOL)
    duenio = puede_administrar(current, torneo)
    fases = sorted(
        db.query(Stage).filter(Stage.tournament_id == torneo.id).all(),
        key=lambda s: (s.order_index is None, s.order_index or 0, s.name or ""),
    )
    hojas = []

    posiciones = _hoja_posiciones(db, torneo, fases, r)
    if posiciones:
        hojas.append(("Posiciones", posiciones, False))
    hojas.append(("Calendario", _hoja_calendario(db, fases), True))

    goleadores = [encabezado("#", "Jugador", "Equipo", r["anota"], "PJ")]
    for i, p in enumerate(
        [p for p in get_player_stats(torneo.id, stage_id, mode, db) if p["goals"]], start=1
    ):
        goleadores.append([i, p["player_name"], p["team_name"], p["goals"], p["matches"]])
    hojas.append((r["anotadores"], goleadores, True))

    valla = [encabezado("#", "Equipo", "PJ", "En contra", "Promedio", "Sin recibir")]
    for v in get_valla(torneo.id, stage_id, mode, db):
        valla.append([v["position"], v["team_name"], v["matches_played"], v["conceded"], v["conceded_avg"], v["clean_sheets"]])
    hojas.append((r["defensa"], valla, True))

    if _publica(torneo, "sanciones", current):
        limpio = [encabezado("#", "Equipo", "PJ", "Amarillas", "Azules", "Rojas", "Faltas", "Puntos")]
        for f in fairplay(torneo.id, stage_id, mode, db, current):
            limpio.append([f["position"], f["team_name"], f["matches_played"], f["yellow"], f["blue"], f["red"], f["fouls"], f["penalty"]])
        hojas.append(("Juego limpio", limpio, True))

        datos = disciplina.calcular(db, torneo)
        if datos["sanctions"] or datos["at_risk"]:
            sanc = [encabezado("Jugador", "Equipo", "Motivo", "Origen", "Fechas", "Cumplidas", "Pendientes")]
            for s in datos["sanctions"]:
                sanc.append([
                    s["player_name"], s["team_name"], s["reason"],
                    "Comité" if s.get("source") == "manual" else "Acumulación",
                    s["matches"], s["served"], s["pending"],
                ])
            if datos["at_risk"]:
                sanc.append([])
                sanc.append(titulo("A una amarilla de la suspensión"))
                for a in datos["at_risk"]:
                    sanc.append([a["player_name"], a["team_name"], f"{a['yellows']} amarilla(s)"])
            hojas.append(("Sanciones", sanc, True))

    if _publica(torneo, "nominas", current):
        enlaces = db.query(TournamentTeam).filter(TournamentTeam.tournament_id == torneo.id).all()
        equipos = {
            str(t.id): t
            for t in db.query(Team).filter(Team.id.in_([l.team_id for l in enlaces])).all()
        } if enlaces else {}
        grupos = {str(l.team_id): l.group_name for l in enlaces}
        cols = ["Equipo", "Grupo", "Dorsal", "Jugador"] + (["Documento", "Correo"] if duenio else [])
        nom = [encabezado(*cols)]
        if equipos:
            links = db.query(TeamPlayer).filter(TeamPlayer.team_id.in_([t.id for t in equipos.values()])).all()
            jugadores = {
                str(p.id): p
                for p in db.query(Player).filter(Player.id.in_([l.player_id for l in links])).all()
            } if links else {}
            filas_nom = []
            for l in links:
                p = jugadores.get(str(l.player_id))
                t = equipos.get(str(l.team_id))
                if not p or not t:
                    continue
                filas_nom.append(
                    [t.name, grupos.get(str(t.id)), l.number, p.name]
                    + ([p.identification_number, p.email] if duenio else [])
                )
            filas_nom.sort(key=lambda f: (f[0].lower(), f[2] if f[2] is not None else 10_000, f[3].lower()))
            nom.extend(filas_nom)
        hojas.append(("Nóminas", nom, True))

    return _xlsx(excel.escribir(hojas), torneo.name)
