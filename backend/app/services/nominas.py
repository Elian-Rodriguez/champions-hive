"""Importar equipos y nóminas desde una planilla.

Veinte equipos de quince jugadores son trescientos formularios, y el
organizador ya tiene la lista: se la mandaron los delegados en Excel. Aquí se
lee esa planilla tal como suele llegar, no como a un programador le gustaría:

- **Los encabezados se reconocen por sinónimos** y sin tildes ni mayúsculas:
  «Cédula», «C.C.», «Documento» y «Identificación» son la misma columna. La
  fila de encabezados puede no ser la primera (hay planillas con el nombre de
  la liga arriba).
- **El equipo se arrastra hacia abajo.** Es lo que pasa con una celda
  combinada: el nombre del equipo está en la primera fila y las demás llegan
  vacías.
- **Lo que ya existe se actualiza, no se duplica.** El equipo se busca por
  nombre dentro del campeonato y el jugador por documento (o por nombre si no
  trae documento) dentro de su equipo: subir la misma planilla dos veces deja
  todo igual.

Siempre se valida primero (`dry_run`) y se muestra el resultado: el error de
la fila 14 se corrige en el Excel antes de que exista nada a medias. Con un
solo error no se importa nada.
"""
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import Player, Team, TeamPlayer, Tournament, TournamentTeam

# Sinónimos de cada columna, ya normalizados (sin tildes, minúsculas, solo
# letras y números).
COLUMNAS: Dict[str, Tuple[str, ...]] = {
    "equipo": ("equipo", "team", "club", "nombreequipo", "nombredelequipo"),
    "grupo": ("grupo", "group", "zona"),
    "jugador": (
        "jugador", "nombre", "nombres", "nombrecompleto", "nombreyapellido",
        "nombresyapellidos", "player", "deportista", "integrante",
    ),
    "apellido": ("apellido", "apellidos"),
    "documento": (
        "documento", "cedula", "cc", "identificacion", "doc", "numerodocumento",
        "nodocumento", "numerodeidentificacion", "dni", "ti", "id",
    ),
    "dorsal": ("dorsal", "numero", "camiseta", "no", "n", "nro", "num", "camisa"),
    "correo": ("correo", "email", "mail", "correoelectronico", "emailjugador"),
}

MAX_EQUIPOS = 200
MAX_JUGADORES = 4000
_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalizar(texto: Any) -> str:
    """«Cédula N°» → «cedulan»: para comparar encabezados y nombres."""
    s = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _nombre_comparable(texto: str) -> str:
    """Nombres de equipo y jugador: sin tildes, sin mayúsculas, espacios
    colapsados. «Atlético  San José» y «atletico san jose» son el mismo."""
    s = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode()
    return " ".join(s.lower().split())


def _limpio(texto: Any) -> str:
    return " ".join(str(texto or "").split())


def _mapear_encabezados(fila: List[str]) -> Dict[str, int]:
    indices: Dict[str, int] = {}
    for i, celda in enumerate(fila):
        clave = normalizar(celda)
        if not clave:
            continue
        for campo, sinonimos in COLUMNAS.items():
            if campo not in indices and clave in sinonimos:
                indices[campo] = i
                break
    return indices


def _encontrar_encabezados(filas: List[List[str]]) -> Tuple[int, Dict[str, int]]:
    for n, fila in enumerate(filas[:15]):
        indices = _mapear_encabezados(fila)
        if "equipo" in indices:
            return n, indices
    raise ValueError(
        "No encontré la columna «Equipo». La primera fila de la planilla tiene "
        "que tener los títulos: Equipo, Jugador, Documento, Dorsal (descarga la "
        "plantilla para ver el formato)."
    )


def analizar(
    db: Session, torneo: Tournament, filas: List[List[str]]
) -> Dict[str, Any]:
    """Lee la planilla y dice qué haría, sin tocar nada.

    Devuelve `plan` (lo que `aplicar` necesita) más el resumen para la
    pantalla: equipos nuevos y existentes, jugadores nuevos y actualizados,
    errores (bloquean) y avisos (no bloquean).
    """
    inicio, col = _encontrar_encabezados(filas)

    def valor(fila: List[str], campo: str) -> str:
        i = col.get(campo)
        return _limpio(fila[i]) if i is not None and i < len(fila) else ""

    # Lo que ya hay en el campeonato.
    enlaces = (
        db.query(TournamentTeam).filter(TournamentTeam.tournament_id == torneo.id).all()
    )
    equipos_db = {
        str(t.id): t
        for t in db.query(Team).filter(Team.id.in_([l.team_id for l in enlaces])).all()
    } if enlaces else {}
    grupo_db = {str(l.team_id): l.group_name for l in enlaces}
    por_nombre = {_nombre_comparable(t.name): t for t in equipos_db.values()}
    nominas_db: Dict[str, List[Tuple[TeamPlayer, Player]]] = {}
    if equipos_db:
        links = db.query(TeamPlayer).filter(
            TeamPlayer.team_id.in_([t.id for t in equipos_db.values()])
        ).all()
        jugadores = {
            str(p.id): p
            for p in db.query(Player).filter(Player.id.in_([l.player_id for l in links])).all()
        } if links else {}
        for l in links:
            p = jugadores.get(str(l.player_id))
            if p:
                nominas_db.setdefault(str(l.team_id), []).append((l, p))
    # Documento → equipo en este campeonato: un jugador no juega en dos.
    doc_en_torneo = {
        normalizar(p.identification_number): (tid, p.name)
        for tid, lista in nominas_db.items()
        for _, p in lista
        if p.identification_number
    }

    errores: List[Dict[str, Any]] = []
    avisos: List[Dict[str, Any]] = []
    equipos: Dict[str, Dict[str, Any]] = {}
    orden: List[str] = []
    docs_archivo: Dict[str, Tuple[int, str]] = {}
    equipo_actual = ""
    filas_leidas = 0

    for n, fila in enumerate(filas[inicio + 1:], start=inicio + 2):
        if not any(_limpio(c) for c in fila):
            continue
        filas_leidas += 1
        nombre_equipo = valor(fila, "equipo") or equipo_actual
        jugador = valor(fila, "jugador")
        apellido = valor(fila, "apellido")
        if apellido:
            jugador = f"{jugador} {apellido}".strip()
        if not nombre_equipo:
            errores.append({"row": n, "message": "Falta el nombre del equipo"})
            continue
        if len(nombre_equipo) > 120:
            errores.append({"row": n, "message": "El nombre del equipo es demasiado largo"})
            continue
        equipo_actual = nombre_equipo
        clave = _nombre_comparable(nombre_equipo)
        if clave not in equipos:
            if len(equipos) >= MAX_EQUIPOS:
                errores.append({"row": n, "message": f"La planilla supera los {MAX_EQUIPOS} equipos"})
                break
            existente = por_nombre.get(clave)
            equipos[clave] = {
                "name": existente.name if existente else nombre_equipo,
                "team_id": str(existente.id) if existente else None,
                "exists": existente is not None,
                "group": None,
                "group_before": grupo_db.get(str(existente.id)) if existente else None,
                "players": [],
                "_dorsales": {},
                "_nombres": {},
            }
            orden.append(clave)
        eq = equipos[clave]

        grupo = valor(fila, "grupo")
        if grupo:
            if len(grupo) > 40:
                errores.append({"row": n, "message": "El grupo es demasiado largo"})
            elif eq["group"] and eq["group"] != grupo:
                avisos.append({
                    "row": n,
                    "message": f"{eq['name']} aparece en el grupo «{eq['group']}» y en «{grupo}»; queda en «{eq['group']}»",
                })
            else:
                eq["group"] = grupo

        if not jugador:
            if valor(fila, "documento") or valor(fila, "dorsal"):
                errores.append({"row": n, "message": "Falta el nombre del jugador"})
            continue  # fila solo con el equipo: inscribe el equipo sin jugadores
        if len(jugador) > 120:
            errores.append({"row": n, "message": "El nombre del jugador es demasiado largo"})
            continue

        documento = valor(fila, "documento")
        doc_clave = normalizar(documento)
        if documento and len(documento) > 30:
            errores.append({"row": n, "message": "El documento es demasiado largo"})
            continue

        dorsal: Optional[int] = None
        dorsal_txt = valor(fila, "dorsal")
        if dorsal_txt:
            try:
                dorsal = int(float(dorsal_txt.replace(",", ".")))
                if not 0 <= dorsal <= 999:
                    raise ValueError
            except ValueError:
                errores.append({"row": n, "message": f"El dorsal «{dorsal_txt}» no es un número de camiseta"})
                continue

        correo = valor(fila, "correo") or None
        if correo and not _CORREO.match(correo):
            avisos.append({"row": n, "message": f"«{correo}» no parece un correo; se importa sin correo"})
            correo = None

        if doc_clave:
            if doc_clave in docs_archivo:
                fila_previa, eq_previo = docs_archivo[doc_clave]
                errores.append({
                    "row": n,
                    "message": f"El documento {documento} ya está en la fila {fila_previa} ({eq_previo})",
                })
                continue
            docs_archivo[doc_clave] = (n, eq["name"])
            previo = doc_en_torneo.get(doc_clave)
            if previo and previo[0] != eq["team_id"]:
                otro = equipos_db.get(previo[0])
                errores.append({
                    "row": n,
                    "message": (
                        f"El documento {documento} ya está inscrito en "
                        f"{otro.name if otro else 'otro equipo'} ({previo[1]}): "
                        "un jugador no puede jugar en dos equipos del campeonato"
                    ),
                })
                continue

        nombre_clave = _nombre_comparable(jugador)
        if nombre_clave in eq["_nombres"] and not doc_clave:
            avisos.append({
                "row": n,
                "message": f"{jugador} aparece dos veces en {eq['name']} sin documento; se toma una sola vez",
            })
            continue
        eq["_nombres"][nombre_clave] = n

        if dorsal is not None:
            if dorsal in eq["_dorsales"]:
                avisos.append({
                    "row": n,
                    "message": f"El dorsal {dorsal} se repite en {eq['name']} (fila {eq['_dorsales'][dorsal]})",
                })
            else:
                eq["_dorsales"][dorsal] = n

        # ¿Ya está en la nómina? Por documento primero, por nombre si no trae.
        existente = None
        for link, p in nominas_db.get(eq["team_id"] or "", []):
            if doc_clave and normalizar(p.identification_number) == doc_clave:
                existente = (link, p)
                break
        if existente is None:
            for link, p in nominas_db.get(eq["team_id"] or "", []):
                if _nombre_comparable(p.name) == nombre_clave and (
                    not doc_clave or not p.identification_number
                ):
                    existente = (link, p)
                    break

        cambios: Dict[str, Any] = {}
        if existente:
            link, p = existente
            if jugador != p.name:
                cambios["name"] = jugador
            if documento and documento != (p.identification_number or ""):
                cambios["identification_number"] = documento
            if dorsal is not None and dorsal != link.number:
                cambios["number"] = dorsal
            if correo and correo != (p.email or ""):
                cambios["email"] = correo
        eq["players"].append({
            "row": n,
            "name": jugador,
            "identification_number": documento or None,
            "number": dorsal,
            "email": correo,
            "player_id": str(existente[1].id) if existente else None,
            "action": ("update" if cambios else "same") if existente else "new",
            "changes": cambios,
        })

    total_jugadores = sum(len(e["players"]) for e in equipos.values())
    if total_jugadores > MAX_JUGADORES:
        errores.append({"row": None, "message": f"La planilla supera los {MAX_JUGADORES} jugadores"})
    if not equipos and not errores:
        errores.append({"row": None, "message": "La planilla no trae ningún equipo"})

    lista = []
    for clave in orden:
        e = equipos[clave]
        lista.append({
            "name": e["name"],
            "team_id": e["team_id"],
            "exists": e["exists"],
            "group": e["group"],
            "group_changes": bool(e["group"]) and e["group"] != e["group_before"],
            "players": e["players"],
            "players_new": sum(1 for p in e["players"] if p["action"] == "new"),
            "players_updated": sum(1 for p in e["players"] if p["action"] == "update"),
        })
    return {
        "columns": sorted(col.keys()),
        "rows": filas_leidas,
        "teams": lista,
        "errors": errores,
        "warnings": avisos,
        "summary": {
            "teams_new": sum(1 for e in lista if not e["exists"]),
            "teams_existing": sum(1 for e in lista if e["exists"]),
            "players_new": sum(e["players_new"] for e in lista),
            "players_updated": sum(e["players_updated"] for e in lista),
            "players_same": sum(
                1 for e in lista for p in e["players"] if p["action"] == "same"
            ),
        },
    }


def aplicar(db: Session, torneo: Tournament, analisis: Dict[str, Any]) -> Dict[str, int]:
    """Escribe lo que `analizar` dijo. No hace commit: lo hace el endpoint, así
    la importación entera entra o no entra."""
    creados_eq = creados_jug = actualizados = 0
    for e in analisis["teams"]:
        if e["team_id"]:
            team_id = e["team_id"]
            if e["group"] and e["group_changes"]:
                link = (
                    db.query(TournamentTeam)
                    .filter(
                        TournamentTeam.tournament_id == torneo.id,
                        TournamentTeam.team_id == team_id,
                    )
                    .first()
                )
                if link:
                    link.group_name = e["group"]
        else:
            team = Team(name=e["name"])
            db.add(team)
            db.flush()
            db.add(
                TournamentTeam(
                    tournament_id=torneo.id,
                    team_id=team.id,
                    group_name=e["group"],
                    status="approved",
                )
            )
            team_id = team.id
            creados_eq += 1
        for p in e["players"]:
            if p["action"] == "new":
                jugador = Player(
                    name=p["name"],
                    identification_number=p["identification_number"],
                    email=p["email"],
                )
                db.add(jugador)
                db.flush()
                db.add(TeamPlayer(team_id=team_id, player_id=jugador.id, number=p["number"]))
                creados_jug += 1
            elif p["action"] == "update":
                jugador = db.query(Player).filter(Player.id == p["player_id"]).first()
                if not jugador:
                    continue
                for campo in ("name", "identification_number", "email"):
                    if campo in p["changes"]:
                        setattr(jugador, campo, p["changes"][campo])
                if "number" in p["changes"]:
                    link = (
                        db.query(TeamPlayer)
                        .filter(TeamPlayer.team_id == team_id, TeamPlayer.player_id == jugador.id)
                        .first()
                    )
                    if link:
                        link.number = p["changes"]["number"]
                actualizados += 1
    db.flush()
    return {
        "teams_created": creados_eq,
        "players_created": creados_jug,
        "players_updated": actualizados,
    }
