"""Sanciones del comité, informe arbitral y reclamos (ver `services/gobierno.py`).

Quién puede qué, en una tabla:

| | organizador | árbitro del partido | capitán | público |
|---|---|---|---|---|
| sanción manual | crea, corrige, anula | — | la ve en /discipline | ídem |
| informe arbitral | lee, reabre | escribe y firma | lee el firmado de sus partidos | — |
| reclamo | resuelve y publica | — | presenta, adjunta prueba, retira | lee lo publicado |

Va en `/api/v1` (como teams y highlights) porque cuelga a la vez de
`/tournaments/{id}/…`, `/matches/{id}/…`, `/sanctions/{id}` y `/claims/{id}`.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import (
    ROL_CAPTAIN,
    ROL_REFEREE,
    get_current_user,
    get_current_user_optional,
    puede_administrar,
    require_staff,
)
from app.db.database import get_db
from app.db.models import (
    Claim,
    Match,
    MatchHighlight,
    MatchReport,
    Player,
    PlayerSanction,
    Team,
    TeamManager,
    Tournament,
    TournamentTeam,
    User,
)
from app.schemas import (
    ClaimCreate,
    ClaimDecision,
    ClaimPublish,
    MatchReportUpdate,
    SanctionCreate,
    SanctionUpdate,
)
from app.services import auditoria, gobierno, media
from app.services.disciplina import _partidos_del_torneo
from app.services.gobierno import Invalido

router = APIRouter()


# --------------------------------------------------------------------------- #
#  Ayudas
# --------------------------------------------------------------------------- #
def _torneo(db: Session, tournament_id) -> Tournament:
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return t


def _torneo_administrable(db: Session, tournament_id, user: User) -> Tournament:
    t = _torneo(db, tournament_id)
    if not puede_administrar(user, t):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )
    return t


def _partido(db: Session, match_id) -> Match:
    m = db.query(Match).filter(Match.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return m


def _equipos_propios(db: Session, user: Optional[User]) -> set:
    if user is None:
        return set()
    return {
        str(l.team_id)
        for l in db.query(TeamManager).filter(TeamManager.user_id == user.id).all()
    }


def _equipos_del_torneo(db: Session, torneo: Tournament) -> set:
    return {
        str(l.team_id)
        for l in db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == torneo.id)
        .all()
    }


def _es_arbitro_del_partido(user: User, match: Match) -> bool:
    return (
        user is not None
        and user.role == ROL_REFEREE
        and match.referee_id is not None
        and str(match.referee_id) == str(user.id)
    )


def _400(e: Exception):
    raise HTTPException(status_code=400, detail=str(e))


# --------------------------------------------------------------------------- #
#  Sanciones manuales
# --------------------------------------------------------------------------- #
def _validar_fechas(valor: int) -> int:
    if valor is None or not 0 <= int(valor) <= gobierno.MAX_FECHAS:
        raise HTTPException(
            status_code=400,
            detail=f"Las fechas de suspensión van de 0 a {gobierno.MAX_FECHAS}",
        )
    return int(valor)


def _sancion_administrable(db: Session, sanction_id, user: User):
    s = db.query(PlayerSanction).filter(PlayerSanction.id == sanction_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sanción no encontrada")
    torneo = _torneo_administrable(db, s.tournament_id, user)
    return s, torneo


def _texto_sancion(nombre: str, s: PlayerSanction) -> str:
    fechas = s.matches or 0
    return f"{nombre}: {fechas} fecha(s) — {s.reason}" if fechas else f"{nombre}: amonestación — {s.reason}"


@router.get("/tournaments/{tournament_id}/sanctions")
def list_sanctions(
    tournament_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Todas las sanciones del comité, también las cumplidas y las anuladas.

    Es la vista del organizador. El público y el capitán ven las vigentes en
    `/tournaments/{id}/discipline`, junto a las automáticas.
    """
    torneo = _torneo_administrable(db, tournament_id, current)
    filas = (
        db.query(PlayerSanction).filter(PlayerSanction.tournament_id == torneo.id).all()
    )
    return gobierno.payload_sanciones(db, torneo, filas)


@router.post("/tournaments/{tournament_id}/sanctions", status_code=status.HTTP_201_CREATED)
def create_sanction(
    tournament_id: UUID,
    payload_in: SanctionCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    torneo = _torneo_administrable(db, tournament_id, current)
    jugador = db.query(Player).filter(Player.id == payload_in.player_id).first()
    if not jugador:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    try:
        motivo = gobierno.texto(payload_in.reason, "el motivo", obligatorio=True)
        partido = gobierno.partido_del_torneo(db, torneo, payload_in.match_id)
    except Invalido as e:
        _400(e)
    fechas = _validar_fechas(payload_in.matches)

    equipo = str(payload_in.team_id) if payload_in.team_id else None
    if equipo:
        if equipo not in _equipos_del_torneo(db, torneo):
            raise HTTPException(status_code=400, detail="Ese equipo no juega este campeonato")
        if str(jugador.id) not in gobierno.nomina(db, equipo):
            raise HTTPException(
                status_code=400,
                detail=f"{jugador.name} no está en la nómina de ese equipo",
            )
    else:
        equipo = gobierno.equipo_del_jugador_en_torneo(db, torneo, jugador.id)
        if not equipo:
            raise HTTPException(
                status_code=400,
                detail=f"{jugador.name} no está en la nómina de ningún equipo del campeonato",
            )
    if partido and equipo not in (str(partido.home_team_id), str(partido.away_team_id)):
        raise HTTPException(
            status_code=400, detail="El equipo del jugador no jugó ese partido"
        )

    s = PlayerSanction(
        tournament_id=torneo.id,
        player_id=jugador.id,
        team_id=UUID(equipo),
        matches=fechas,
        reason=motivo,
        match_id=partido.id if partido else None,
        incident_id=(payload_in.incident_id or "").strip()[:40] or None,
        status=gobierno.SANCION_ACTIVA,
        created_by_id=current.id,
        created_at=gobierno.ahora(),
        updated_at=gobierno.ahora(),
    )
    db.add(s)
    db.flush()
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_SANCION,
        resumen=f"Sancionó a {_texto_sancion(jugador.name, s)}",
        tournament_id=torneo.id,
        match_id=s.match_id,
        team_id=s.team_id,
        datos={"despues": {"fechas": fechas, "motivo": motivo}},
    )
    gobierno.avisar_sancion(db, torneo, s, jugador.name)
    db.commit()
    db.refresh(s)
    return gobierno.payload_sanciones(db, torneo, [s])[0]


@router.put("/sanctions/{sanction_id}")
def update_sanction(
    sanction_id: UUID,
    payload_in: SanctionUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    s, torneo = _sancion_administrable(db, sanction_id, current)
    cambios = payload_in.model_dump(exclude_unset=True)
    antes = {"fechas": s.matches, "motivo": s.reason, "estado": s.status, "partido": s.match_id}
    if "matches" in cambios:
        s.matches = _validar_fechas(cambios["matches"])
    if "reason" in cambios:
        try:
            s.reason = gobierno.texto(cambios["reason"], "el motivo", obligatorio=True)
        except Invalido as e:
            _400(e)
    if "match_id" in cambios:
        try:
            partido = gobierno.partido_del_torneo(db, torneo, cambios["match_id"])
        except Invalido as e:
            _400(e)
        if partido and str(s.team_id) not in (str(partido.home_team_id), str(partido.away_team_id)):
            raise HTTPException(status_code=400, detail="El equipo del jugador no jugó ese partido")
        s.match_id = partido.id if partido else None
    if "status" in cambios:
        if cambios["status"] not in (gobierno.SANCION_ACTIVA, gobierno.SANCION_ANULADA):
            raise HTTPException(status_code=400, detail="El estado es «active» o «annulled»")
        s.status = cambios["status"]
    despues = {"fechas": s.matches, "motivo": s.reason, "estado": s.status, "partido": s.match_id}
    detalle = auditoria.diferencias(antes, despues)
    if detalle:
        s.updated_at = gobierno.ahora()
        jugador = db.query(Player).filter(Player.id == s.player_id).first()
        nombre = jugador.name if jugador else "un jugador"
        verbo = (
            "Anuló la sanción de"
            if detalle.get("estado", {}).get("despues") == gobierno.SANCION_ANULADA
            else "Corrigió la sanción de"
        )
        auditoria.registrar(
            db,
            current,
            auditoria.ACCION_SANCION,
            resumen=f"{verbo} {_texto_sancion(nombre, s)}",
            tournament_id=torneo.id,
            match_id=s.match_id,
            team_id=s.team_id,
            datos=detalle,
        )
    db.commit()
    db.refresh(s)
    return gobierno.payload_sanciones(db, torneo, [s])[0]


@router.delete("/sanctions/{sanction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sanction(
    sanction_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Borra una sanción cargada por error. La que cayó en un reclamo no se
    borra: se anula (`PUT` con `status: annulled`), que deja constancia."""
    s, torneo = _sancion_administrable(db, sanction_id, current)
    jugador = db.query(Player).filter(Player.id == s.player_id).first()
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_SANCION,
        resumen=f"Borró la sanción de {_texto_sancion(jugador.name if jugador else 'un jugador', s)}",
        tournament_id=torneo.id,
        match_id=s.match_id,
        team_id=s.team_id,
        datos={"antes": {"fechas": s.matches, "motivo": s.reason}},
    )
    db.query(Claim).filter(Claim.sanction_id == s.id).update(
        {Claim.sanction_id: None}, synchronize_session=False
    )
    db.delete(s)
    db.commit()


# --------------------------------------------------------------------------- #
#  Informe arbitral
# --------------------------------------------------------------------------- #
def _puede_leer_informe(db: Session, user: User, match: Match, torneo, informe) -> bool:
    if puede_administrar(user, torneo) or _es_arbitro_del_partido(user, match):
        return True
    # El capitán lee el informe firmado de los partidos de su equipo: es la
    # prueba contra la que va a reclamar, y un borrador todavía puede cambiar.
    if user.role == ROL_CAPTAIN and informe is not None and informe.submitted_at:
        propios = _equipos_propios(db, user)
        return bool(propios & {str(match.home_team_id), str(match.away_team_id)})
    return False


def _asegurar_puede_escribir_informe(db: Session, user: User, match: Match, torneo) -> None:
    """La misma potestad que cargar el resultado: el árbitro asignado o el
    dueño del torneo."""
    if user.role == ROL_REFEREE:
        if not _es_arbitro_del_partido(user, match):
            raise HTTPException(
                status_code=403,
                detail="Solo puedes firmar el informe de los partidos que tienes asignados",
            )
        return
    if not puede_administrar(user, torneo):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )


def _informe_de(db: Session, match: Match) -> Optional[MatchReport]:
    return db.query(MatchReport).filter(MatchReport.match_id == match.id).first()


@router.get("/matches/{match_id}/report")
def get_match_report(
    match_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    match = _partido(db, match_id)
    torneo = gobierno.torneo_del_partido(db, match)
    informe = _informe_de(db, match)
    if not _puede_leer_informe(db, current, match, torneo, informe):
        raise HTTPException(status_code=403, detail="No puedes ver el informe de este partido")
    return gobierno.payload_informe(
        db, match, informe, con_sanciones=puede_administrar(current, torneo)
    )


@router.put("/matches/{match_id}/report")
def save_match_report(
    match_id: UUID,
    payload_in: MatchReportUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Guarda el borrador del informe (reemplaza las incidencias enteras).

    Firmado, ya no se toca —ni siquiera el organizador—: un informe que se
    puede editar después de firmado no prueba nada. Para corregirlo, el
    organizador lo reabre y queda en el historial.
    """
    match = _partido(db, match_id)
    torneo = gobierno.torneo_del_partido(db, match)
    _asegurar_puede_escribir_informe(db, current, match, torneo)
    informe = _informe_de(db, match)
    if informe and informe.submitted_at:
        raise HTTPException(
            status_code=409,
            detail="El informe ya está firmado. Pide al organizador que lo reabra para corregirlo.",
        )
    try:
        incidencias = gobierno.validar_incidencias(
            db, match, [i.model_dump(mode="json") for i in payload_in.incidents]
        )
        observaciones = gobierno.texto(payload_in.observations, "las observaciones")
    except Invalido as e:
        _400(e)
    if informe is None:
        informe = MatchReport(match_id=match.id, created_at=gobierno.ahora())
        db.add(informe)
    informe.author_id = current.id
    informe.author_email = current.email
    informe.observations = observaciones
    informe.incidents = incidencias
    informe.updated_at = gobierno.ahora()
    db.commit()
    db.refresh(informe)
    return gobierno.payload_informe(
        db, match, informe, con_sanciones=puede_administrar(current, torneo)
    )


@router.post("/matches/{match_id}/report/submit")
def submit_match_report(
    match_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Firma el informe. Desde aquí lo leen los capitanes y ya no cambia."""
    match = _partido(db, match_id)
    torneo = gobierno.torneo_del_partido(db, match)
    _asegurar_puede_escribir_informe(db, current, match, torneo)
    informe = _informe_de(db, match)
    if informe is None:
        # Firmar sin incidencias es un informe válido: «sin novedad».
        informe = MatchReport(
            match_id=match.id,
            incidents=[],
            author_id=current.id,
            author_email=current.email,
            created_at=gobierno.ahora(),
        )
        db.add(informe)
    if informe.submitted_at:
        raise HTTPException(status_code=409, detail="El informe ya estaba firmado")
    informe.submitted_at = gobierno.ahora()
    informe.updated_at = informe.submitted_at
    db.flush()
    rotulo = gobierno.rotulos_de_partidos(db, [match]).get(str(match.id))
    n = len(informe.incidents or [])
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_INFORME,
        resumen=(
            f"Firmó el informe arbitral de {rotulo} "
            + (f"con {n} incidencia(s)" if n else "sin novedad")
        ),
        tournament_id=torneo.id if torneo else None,
        match_id=match.id,
        datos={"incidencias": n},
    )
    if torneo:
        gobierno.avisar_informe(db, torneo, match, informe, current)
    db.commit()
    db.refresh(informe)
    return gobierno.payload_informe(
        db, match, informe, con_sanciones=puede_administrar(current, torneo)
    )


@router.post("/matches/{match_id}/report/reopen")
def reopen_match_report(
    match_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Devuelve el informe a borrador. Solo el organizador, y queda anotado:
    reabrir un informe firmado es justo lo que alguien va a preguntar después."""
    match = _partido(db, match_id)
    torneo = gobierno.torneo_del_partido(db, match)
    if not puede_administrar(current, torneo):
        raise HTTPException(status_code=403, detail="Este torneo pertenece a otro administrador")
    informe = _informe_de(db, match)
    if not informe or not informe.submitted_at:
        raise HTTPException(status_code=409, detail="El informe no está firmado")
    firmado = informe.submitted_at
    informe.submitted_at = None
    informe.updated_at = gobierno.ahora()
    rotulo = gobierno.rotulos_de_partidos(db, [match]).get(str(match.id))
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_INFORME,
        resumen=f"Reabrió el informe arbitral de {rotulo} (firmado por {informe.author_email or 'el árbitro'})",
        tournament_id=torneo.id,
        match_id=match.id,
        datos={"antes": {"firmado": firmado}, "despues": {"firmado": None}},
    )
    db.commit()
    db.refresh(informe)
    return gobierno.payload_informe(db, match, informe, con_sanciones=True)


@router.get("/tournaments/{tournament_id}/reports")
def list_tournament_reports(
    tournament_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Los informes del campeonato, lo más nuevo arriba: la mesa del comité.

    `pending` cuenta las incidencias con jugador que todavía no tienen sanción
    colgada, que es lo que el comité tiene por resolver.
    """
    torneo = _torneo_administrable(db, tournament_id, current)
    partidos = {str(m.id): m for m in _partidos_del_torneo(db, torneo)}
    if not partidos:
        return []
    informes = (
        db.query(MatchReport)
        .filter(MatchReport.match_id.in_([m.id for m in partidos.values()]))
        .all()
    )
    out = []
    for inf in informes:
        m = partidos[str(inf.match_id)]
        datos = gobierno.payload_informe(db, m, inf, con_sanciones=True)
        datos["match_label"] = gobierno.rotulos_de_partidos(db, [m]).get(str(m.id))
        datos["match_date"] = m.scheduled_start
        datos["pending"] = sum(
            1 for i in datos["incidents"] if i.get("player_id") and not i.get("sanction")
        )
        out.append(datos)
    out.sort(key=lambda r: (r["submitted_at"] is None, -(r["updated_at"].timestamp() if r["updated_at"] else 0)))
    return out


# --------------------------------------------------------------------------- #
#  Reclamos
# --------------------------------------------------------------------------- #
def _reclamo(db: Session, claim_id) -> Claim:
    c = db.query(Claim).filter(Claim.id == claim_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Reclamo no encontrado")
    return c


def _puede_ver_reclamo(db: Session, user: User, c: Claim, torneo) -> bool:
    if puede_administrar(user, torneo):
        return True
    return str(c.team_id) in _equipos_propios(db, user)


def _asegurar_puede_presentar(db: Session, user: User, torneo, team_id: str) -> None:
    """Reclama el capitán del equipo, o el organizador en su nombre (el
    reclamo que llegó en papel también tiene que quedar)."""
    if puede_administrar(user, torneo):
        return
    if user.role == ROL_CAPTAIN and team_id in _equipos_propios(db, user):
        return
    raise HTTPException(
        status_code=403, detail="Solo el capitán del equipo puede presentar este reclamo"
    )


@router.post("/tournaments/{tournament_id}/claims", status_code=status.HTTP_201_CREATED)
def create_claim(
    tournament_id: UUID,
    payload_in: ClaimCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    torneo = _torneo(db, tournament_id)
    equipo = str(payload_in.team_id)
    if equipo not in _equipos_del_torneo(db, torneo):
        raise HTTPException(status_code=400, detail="Ese equipo no juega este campeonato")
    _asegurar_puede_presentar(db, current, torneo, equipo)

    tipo = (payload_in.kind or "otro").strip().lower()
    if tipo not in gobierno.TIPOS_RECLAMO:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de reclamo no válido. Tipos: {', '.join(gobierno.TIPOS_RECLAMO.values())}",
        )
    try:
        descripcion = gobierno.texto(payload_in.description, "la descripción del reclamo", obligatorio=True)
        partido = gobierno.partido_del_torneo(db, torneo, payload_in.match_id)
    except Invalido as e:
        _400(e)
    if partido and equipo not in (str(partido.home_team_id), str(partido.away_team_id)):
        raise HTTPException(status_code=400, detail="Tu equipo no jugó ese partido")

    sancion = None
    if payload_in.sanction_id:
        sancion = db.query(PlayerSanction).filter(PlayerSanction.id == payload_in.sanction_id).first()
        if not sancion or str(sancion.tournament_id) != str(torneo.id):
            raise HTTPException(status_code=400, detail="Esa sanción no es de este campeonato")
        if str(sancion.team_id) != equipo:
            raise HTTPException(status_code=400, detail="Solo se apelan las sanciones del propio equipo")
        tipo = "sancion"

    jugada = None
    if payload_in.highlight_id:
        jugada = db.query(MatchHighlight).filter(MatchHighlight.id == payload_in.highlight_id).first()
        if not jugada or str(jugada.tournament_id) != str(torneo.id):
            raise HTTPException(status_code=400, detail="Esa jugada no es de este campeonato")
        if partido and jugada.match_id and str(jugada.match_id) != str(partido.id):
            raise HTTPException(status_code=400, detail="La jugada es de otro partido")
        # El capitán solo cita lo que puede ver: una jugada sin publicar no
        # le llega, y que la pueda adjuntar sería una forma de descubrirla.
        if not jugada.published and not puede_administrar(current, torneo):
            raise HTTPException(status_code=400, detail="Esa jugada no está publicada")

    c = Claim(
        tournament_id=torneo.id,
        match_id=partido.id if partido else (jugada.match_id if jugada else (sancion.match_id if sancion else None)),
        team_id=payload_in.team_id,
        sanction_id=sancion.id if sancion else None,
        kind=tipo,
        description=descripcion,
        highlight_id=jugada.id if jugada else None,
        evidence_storage="link" if payload_in.evidence_url else None,
        evidence_url=payload_in.evidence_url,
        status=gobierno.RECLAMO_ABIERTO,
        published=False,
        created_by_id=current.id,
        created_at=gobierno.ahora(),
        updated_at=gobierno.ahora(),
    )
    db.add(c)
    db.flush()
    nombre_equipo = gobierno._nombres(db, Team, [c.team_id]).get(equipo, "un equipo")
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_RECLAMO,
        resumen=f"{nombre_equipo} presentó un reclamo: {gobierno.TIPOS_RECLAMO[tipo]}",
        tournament_id=torneo.id,
        match_id=c.match_id,
        team_id=c.team_id,
        datos={"despues": {"tipo": tipo, "estado": c.status}},
    )
    gobierno.avisar_reclamo_nuevo(db, torneo, c, nombre_equipo)
    db.commit()
    db.refresh(c)
    return gobierno.payload_reclamos(db, [c])[0]


@router.get("/tournaments/{tournament_id}/claims")
def list_claims(
    tournament_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """El organizador ve todos; el capitán, los de sus equipos."""
    torneo = _torneo(db, tournament_id)
    q = db.query(Claim).filter(Claim.tournament_id == torneo.id)
    if not puede_administrar(current, torneo):
        propios = _equipos_propios(db, current) & _equipos_del_torneo(db, torneo)
        if not propios:
            raise HTTPException(status_code=403, detail="No puedes ver los reclamos de este campeonato")
        q = q.filter(Claim.team_id.in_([UUID(t) for t in propios]))
    filas = q.order_by(Claim.created_at.desc()).all()
    return gobierno.payload_reclamos(db, filas)


@router.get("/claims/mine")
def list_my_claims(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Los reclamos de los equipos que capitanea, en todos sus campeonatos."""
    propios = _equipos_propios(db, current)
    if not propios:
        return []
    filas = (
        db.query(Claim)
        .filter(Claim.team_id.in_([UUID(t) for t in propios]))
        .order_by(Claim.created_at.desc())
        .all()
    )
    return gobierno.payload_reclamos(db, filas)


@router.get("/claims/{claim_id}")
def get_claim(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    c = _reclamo(db, claim_id)
    torneo = _torneo(db, c.tournament_id)
    if not _puede_ver_reclamo(db, current, c, torneo):
        raise HTTPException(status_code=403, detail="No puedes ver este reclamo")
    return gobierno.payload_reclamos(db, [c])[0]


@router.post("/claims/{claim_id}/evidence")
def upload_claim_evidence(
    claim_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Adjunta el video propio del equipo como prueba (reemplaza el anterior).

    Mismas guardas que el clip de una jugada (`services/media.py`): el
    servidor elige el nombre, la extensión manda el Content-Type y se leen los
    primeros bytes. Va a su propia carpeta porque no es una jugada del reel.
    """
    c = _reclamo(db, claim_id)
    torneo = _torneo(db, c.tournament_id)
    _asegurar_puede_presentar(db, current, torneo, str(c.team_id))
    if c.status not in gobierno.RECLAMO_PENDIENTE:
        raise HTTPException(status_code=409, detail="El reclamo ya está cerrado")
    try:
        ruta, peso, extension = media.guardar_video(file, carpeta=media.CARPETA_RECLAMOS)
    except media.ArchivoRechazado as e:
        raise HTTPException(status_code=400, detail=str(e))
    if c.evidence_path:
        media.borrar(c.evidence_path)
    c.evidence_storage = "local"
    c.evidence_path = ruta
    c.evidence_url = media.url_publica(ruta)
    c.evidence_mime = file.content_type or f"video/{extension.lstrip('.')}"
    c.evidence_size = peso
    c.updated_at = gobierno.ahora()
    db.commit()
    db.refresh(c)
    return gobierno.payload_reclamos(db, [c])[0]


@router.post("/claims/{claim_id}/withdraw")
def withdraw_claim(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """El equipo retira el reclamo antes de que se resuelva."""
    c = _reclamo(db, claim_id)
    torneo = _torneo(db, c.tournament_id)
    _asegurar_puede_presentar(db, current, torneo, str(c.team_id))
    if c.status not in gobierno.RECLAMO_PENDIENTE:
        raise HTTPException(status_code=409, detail="El reclamo ya está cerrado")
    c.status = gobierno.RECLAMO_RETIRADO
    c.updated_at = gobierno.ahora()
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_RECLAMO,
        resumen=f"Retiró el reclamo «{gobierno.TIPOS_RECLAMO.get(c.kind, c.kind)}»",
        tournament_id=torneo.id,
        match_id=c.match_id,
        team_id=c.team_id,
        datos={"antes": {"estado": gobierno.RECLAMO_ABIERTO}, "despues": {"estado": c.status}},
    )
    db.commit()
    db.refresh(c)
    return gobierno.payload_reclamos(db, [c])[0]


@router.put("/claims/{claim_id}")
def decide_claim(
    claim_id: UUID,
    payload_in: ClaimDecision,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Pasa el reclamo a revisión o lo resuelve.

    Resolver exige el texto de la resolución: «rechazado» a secas es lo que
    hace que el equipo vuelva a reclamar el martes. Si el reclamo apela una
    sanción del comité, `sanction_matches` la deja en ese número de fechas (0
    la anula), en la misma operación y con su línea en el historial.
    """
    c = _reclamo(db, claim_id)
    torneo = _torneo_administrable(db, c.tournament_id, current)
    nuevo = payload_in.status
    if nuevo not in (gobierno.RECLAMO_EN_REVISION, *gobierno.RECLAMO_RESUELTO):
        raise HTTPException(
            status_code=400, detail="El estado es «in_review», «accepted» o «rejected»"
        )
    if c.status == gobierno.RECLAMO_RETIRADO:
        raise HTTPException(status_code=409, detail="El equipo retiró este reclamo")
    try:
        resolucion = gobierno.texto(
            payload_in.resolution,
            "el texto de la resolución",
            obligatorio=nuevo in gobierno.RECLAMO_RESUELTO,
        )
    except Invalido as e:
        _400(e)

    antes = {"estado": c.status, "resolucion": c.resolution, "publicada": bool(c.published)}
    c.status = nuevo
    if resolucion is not None:
        c.resolution = resolucion
    if nuevo in gobierno.RECLAMO_RESUELTO:
        c.resolved_by_id = current.id
        c.resolved_at = gobierno.ahora()
    else:
        c.resolved_by_id = None
        c.resolved_at = None
    if payload_in.published is not None:
        c.published = bool(payload_in.published) and nuevo in gobierno.RECLAMO_RESUELTO
    elif nuevo not in gobierno.RECLAMO_RESUELTO:
        c.published = False
    c.updated_at = gobierno.ahora()

    if payload_in.sanction_matches is not None:
        if nuevo not in gobierno.RECLAMO_RESUELTO:
            raise HTTPException(status_code=400, detail="La sanción se ajusta al resolver el reclamo")
        s = (
            db.query(PlayerSanction).filter(PlayerSanction.id == c.sanction_id).first()
            if c.sanction_id
            else None
        )
        if not s:
            raise HTTPException(status_code=400, detail="Este reclamo no apela una sanción del comité")
        fechas = _validar_fechas(payload_in.sanction_matches)
        antes_s = {"fechas": s.matches, "estado": s.status}
        if fechas == 0:
            s.status = gobierno.SANCION_ANULADA
        else:
            s.matches = fechas
            s.status = gobierno.SANCION_ACTIVA
        s.updated_at = gobierno.ahora()
        jugador = db.query(Player).filter(Player.id == s.player_id).first()
        nombre = jugador.name if jugador else "un jugador"
        auditoria.registrar(
            db,
            current,
            auditoria.ACCION_SANCION,
            resumen=(
                f"Anuló por reclamo la sanción de {nombre}"
                if fechas == 0
                else f"Ajustó por reclamo la sanción de {nombre} a {fechas} fecha(s)"
            ),
            tournament_id=torneo.id,
            match_id=s.match_id,
            team_id=s.team_id,
            datos=auditoria.diferencias(antes_s, {"fechas": s.matches, "estado": s.status}),
        )

    despues = {"estado": c.status, "resolucion": c.resolution, "publicada": bool(c.published)}
    detalle = auditoria.diferencias(antes, despues)
    if detalle:
        auditoria.registrar(
            db,
            current,
            auditoria.ACCION_RECLAMO,
            resumen=(
                f"Reclamo «{gobierno.TIPOS_RECLAMO.get(c.kind, c.kind)}»: "
                f"{gobierno.ESTADO_RECLAMO.get(antes['estado'], antes['estado']).lower()} → "
                f"{gobierno.ESTADO_RECLAMO.get(c.status, c.status).lower()}"
                + (" (publicado)" if c.published else "")
            ),
            tournament_id=torneo.id,
            match_id=c.match_id,
            team_id=c.team_id,
            datos=detalle,
        )
    if nuevo in gobierno.RECLAMO_RESUELTO and antes["estado"] not in gobierno.RECLAMO_RESUELTO:
        gobierno.avisar_reclamo_resuelto(db, torneo, c)
    db.commit()
    db.refresh(c)
    return gobierno.payload_reclamos(db, [c])[0]


@router.put("/claims/{claim_id}/publish")
def publish_claim(
    claim_id: UUID,
    payload_in: ClaimPublish,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Publica u oculta la resolución en el marcador. Solo las resueltas: un
    reclamo en revisión publicado sería anunciar una discusión sin final."""
    c = _reclamo(db, claim_id)
    torneo = _torneo_administrable(db, c.tournament_id, current)
    if payload_in.published and c.status not in gobierno.RECLAMO_RESUELTO:
        raise HTTPException(status_code=409, detail="Solo se publica un reclamo resuelto")
    if bool(c.published) != payload_in.published:
        c.published = payload_in.published
        c.updated_at = gobierno.ahora()
        auditoria.registrar(
            db,
            current,
            auditoria.ACCION_RECLAMO,
            resumen=(
                ("Publicó" if c.published else "Despublicó")
                + f" la resolución del reclamo «{gobierno.TIPOS_RECLAMO.get(c.kind, c.kind)}»"
            ),
            tournament_id=torneo.id,
            match_id=c.match_id,
            team_id=c.team_id,
            datos={"publicada": {"antes": not c.published, "despues": c.published}},
        )
    db.commit()
    db.refresh(c)
    return gobierno.payload_reclamos(db, [c])[0]


@router.delete("/claims/{claim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_claim(
    claim_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Borra un reclamo (el duplicado, el de prueba) junto con su video."""
    c = _reclamo(db, claim_id)
    torneo = _torneo_administrable(db, c.tournament_id, current)
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_RECLAMO,
        resumen=f"Borró el reclamo «{gobierno.TIPOS_RECLAMO.get(c.kind, c.kind)}»",
        tournament_id=torneo.id,
        match_id=c.match_id,
        team_id=c.team_id,
        datos={"antes": {"estado": c.status, "descripcion": c.description}},
    )
    ruta = c.evidence_path
    db.delete(c)
    db.commit()
    media.borrar(ruta)


@router.get("/tournaments/{tournament_id}/resolutions")
def list_public_resolutions(
    tournament_id: UUID,
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """Las resoluciones que el organizador decidió publicar.

    Es la respuesta a «¿por qué le dieron los puntos?» para toda la liga, no
    solo para los dos equipos. Sale sin el autor y sin el video propio del
    equipo (`payload_reclamos(publico=True)`).
    """
    torneo = _torneo(db, tournament_id)
    filas = (
        db.query(Claim)
        .filter(
            Claim.tournament_id == torneo.id,
            Claim.published.is_(True),
            Claim.status.in_(gobierno.RECLAMO_RESUELTO),
        )
        .order_by(Claim.resolved_at.desc())
        .all()
    )
    return gobierno.payload_reclamos(db, filas, publico=True)
