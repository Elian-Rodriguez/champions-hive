"""Mejores jugadas: el clip del gol, del regate, de la atajada.

Qué resuelve esto que no resolvía nada más: el organizador graba la jugada con
el celular y la manda por WhatsApp, donde a los dos días no la encuentra nadie.
Aquí queda pegada al partido y a la jugada que fue, y sale al marcador público
dentro de un marco con el nombre del campeonato, su logo y los patrocinadores
—que es la parte que de verdad importa, porque el clip no se ve donde se ve la
aplicación: se ve en un grupo de WhatsApp o en una historia de Instagram, y ahí
el logo del patrocinador es la publicidad más barata que tiene la liga.

Tres decisiones del módulo:

- **El tipo de jugada está acoplado a la disciplina.** Las de fútbol son gol,
  regate y atajada; las de tejo son moñona, embocinada y mecha. Una jugada que
  esa disciplina no tiene se rechaza nombrando las que sí (ver `validar_jugada`
  en services/strategy.py). Un catálogo único obligaría al organizador de tejo
  a etiquetar una moñona como «gol» y ahí el filtro del reel deja de servir.
- **El árbitro puede subir**, no solo el organizador: el que está en la cancha
  con el video en el teléfono es él. Rige el mismo permiso que para cargar el
  resultado (`Match.referee_id`), no uno nuevo.
- **El video no entra en la cola offline.** Todo lo demás del panel del árbitro
  se encola sin señal, pero un clip de 20 MB en el almacenamiento del navegador
  es cómo se corrompe la cola entera. Subir una jugada necesita conexión y el
  panel lo dice en pantalla.
"""
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.tournament_routes import _asegurar_visible
from app.core.deps import (
    ROL_REFEREE,
    get_current_user,
    get_current_user_optional,
    puede_administrar,
)
from app.db.database import get_db
from app.db.models import (
    Match,
    MatchHighlight,
    Player,
    Stage,
    Team,
    Tournament,
    TournamentTeam,
    User,
)
from app.schemas import (
    HighlightLinkCreate,
    HighlightResponse,
    HighlightUpdate,
    validar_imagen,
)
from app.services import auditoria, media
from app.services.contentful import contentful_configurado, espejar_jugada, estado
from app.services.strategy import jugadas_de, validar_jugada

router = APIRouter()

# Sección del marcador público a la que pertenece el reel. Como el resto de
# los interruptores, ausente = público: los torneos que ya existían publican
# todo, y el que no quiera mostrar videos lo apaga.
SECCION = "jugadas"


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #
def _uuid_opt(valor: Optional[str]) -> Optional[UUID]:
    """UUID que llega por formulario. Un campo vacío es «nada», no un error.

    El panel manda el formulario completo aunque el organizador no haya elegido
    jugador, y un `player_id=""` tiene que valer lo mismo que no mandarlo.
    """
    if valor is None:
        return None
    limpio = str(valor).strip()
    if not limpio or limpio in ("null", "undefined"):
        return None
    try:
        return UUID(limpio)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail="Identificador inválido")


def _torneo(db: Session, tournament_id: UUID) -> Tournament:
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return torneo


def _deporte(torneo: Tournament) -> str:
    deporte = getattr(torneo, "sport_type", None)
    return str(getattr(deporte, "value", deporte) or "")


def _partido_del_torneo(
    db: Session, torneo: Tournament, match_id: Optional[UUID]
) -> Optional[Match]:
    """El partido existe y es de ESTE torneo.

    Sin esta comprobación un organizador podría colgar un clip del partido de
    otro campeonato y el reel ajeno lo mostraría.
    """
    if match_id is None:
        return None
    partido = db.query(Match).filter(Match.id == match_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    fase = db.query(Stage).filter(Stage.id == partido.stage_id).first()
    if not fase or str(fase.tournament_id) != str(torneo.id):
        raise HTTPException(
            status_code=400, detail="Ese partido no pertenece a este campeonato"
        )
    return partido


def _asegurar_puede_cargar(
    db: Session, user: User, torneo: Tournament, partido: Optional[Match]
) -> None:
    """Quién puede subir o tocar una jugada.

    Es el mismo reparto que para cargar el resultado: el dueño del torneo y el
    árbitro del partido. El árbitro necesita el partido —sin él no hay nada que
    lo autorice—, que es justo lo que se le pide.
    """
    if user.role == ROL_REFEREE:
        if partido is None:
            raise HTTPException(
                status_code=403,
                detail="Elige el partido: solo puedes subir jugadas de los que diriges",
            )
        if not partido.referee_id or str(partido.referee_id) != str(user.id):
            raise HTTPException(
                status_code=403,
                detail="Solo puedes subir jugadas de los partidos que tienes asignados",
            )
        return
    if not puede_administrar(user, torneo):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )


def _validar_equipo(db: Session, torneo: Tournament, team_id: Optional[UUID]) -> None:
    if team_id is None:
        return
    inscrito = (
        db.query(TournamentTeam)
        .filter(
            TournamentTeam.tournament_id == torneo.id,
            TournamentTeam.team_id == team_id,
        )
        .first()
    )
    if not inscrito:
        raise HTTPException(
            status_code=400, detail="Ese equipo no está inscrito en este campeonato"
        )


def _validar_jugador(db: Session, player_id: Optional[UUID]) -> None:
    """Solo que exista. Atar el clip a la nómina vigente borraría del reel la
    jugada del que se fue del equipo, y esa jugada ocurrió igual."""
    if player_id is None:
        return
    if not db.query(Player).filter(Player.id == player_id).first():
        raise HTTPException(status_code=404, detail="Jugador no encontrado")


def _jugada_validada(torneo: Tournament, play_type: Optional[str]) -> str:
    try:
        return validar_jugada(_deporte(torneo), play_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _portada_validada(poster_url: Optional[str]) -> Optional[str]:
    """La portada pasa por la misma puerta que los escudos: es un data URI que
    termina en un `<img src>`."""
    try:
        return validar_imagen(poster_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _payload(db: Session, filas: List[MatchHighlight], torneo: Tournament) -> List[Dict[str, Any]]:
    """Resuelve nombres de una vez para toda la lista.

    El reel es una grilla de tarjetas: resolver jugador, equipo y rótulo del
    partido tarjeta por tarjeta serían tres consultas por clip.
    """
    catalogo = jugadas_de(_deporte(torneo))

    ids_jugador = {f.player_id for f in filas if f.player_id}
    jugadores = (
        {
            str(p.id): p.name
            for p in db.query(Player).filter(Player.id.in_(ids_jugador)).all()
        }
        if ids_jugador
        else {}
    )

    ids_partido = {f.match_id for f in filas if f.match_id}
    partidos = (
        {str(m.id): m for m in db.query(Match).filter(Match.id.in_(ids_partido)).all()}
        if ids_partido
        else {}
    )

    # Los equipos que hacen falta: el de la jugada y los dos de cada partido.
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

    def rotulo(match_id) -> Optional[str]:
        m = partidos.get(str(match_id)) if match_id else None
        if not m:
            return None
        local = equipos.get(str(m.home_team_id), "Por definir")
        visita = equipos.get(str(m.away_team_id), "Por definir")
        return f"{local} vs {visita}"

    salida = []
    for f in filas:
        salida.append(
            {
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
                # El espejo en el CDN manda si existe: es más rápido que el
                # disco del servidor y es para lo que se configuró.
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
            }
        )
    return salida


def _ordenadas(filas: List[MatchHighlight]) -> List[MatchHighlight]:
    """Primero lo que el organizador puso arriba, después lo más nuevo."""
    return sorted(
        filas,
        key=lambda f: (
            -(f.order_index or 0),
            -(f.created_at.timestamp() if f.created_at else 0),
        ),
    )


def _jugada(db: Session, highlight_id: UUID) -> MatchHighlight:
    fila = db.query(MatchHighlight).filter(MatchHighlight.id == highlight_id).first()
    if not fila:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    return fila


def _resumen(fila: MatchHighlight, catalogo: Dict[str, str]) -> str:
    etiqueta = catalogo.get(fila.play_type or "", fila.play_type or "jugada")
    return fila.title or etiqueta


# --------------------------------------------------------------------------- #
#  Configuración (qué jugadas hay y si el espejo está encendido)
# --------------------------------------------------------------------------- #
@router.get("/highlights/config")
def highlights_config():
    """Lo que el panel necesita antes de mostrar el formulario.

    `contentful.enabled` es lo que decide si aparece el botón de subir al CDN:
    un botón que responde 400 porque la integración está apagada es peor que no
    tener botón.
    """
    return {
        "max_video_mb": media.max_bytes() // (1024 * 1024),
        "contentful": estado(),
    }


@router.get("/tournaments/{tournament_id}/highlight_plays")
def highlight_plays(tournament_id: UUID, db: Session = Depends(get_db)):
    """Jugadas destacadas de la disciplina de ESTE torneo, en orden."""
    torneo = _torneo(db, tournament_id)
    catalogo = jugadas_de(_deporte(torneo))
    return {
        "sport_type": _deporte(torneo),
        "plays": [{"type": k, "label": v} for k, v in catalogo.items()],
    }


# --------------------------------------------------------------------------- #
#  Lectura
# --------------------------------------------------------------------------- #
@router.get("/tournaments/{tournament_id}/highlights", response_model=List[HighlightResponse])
def list_highlights(
    tournament_id: UUID,
    match_id: Optional[UUID] = None,
    play_type: Optional[str] = None,
    include_unpublished: bool = False,
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """El reel del campeonato, filtrable por partido y por tipo de jugada.

    Es público (lo pinta el marcador) y respeta el interruptor `jugadas`. Las
    no publicadas solo las ve quien administra el torneo: el organizador sube
    el clip, lo mira con el marco puesto y después decide si sale.
    """
    torneo = _torneo(db, tournament_id)
    _asegurar_visible(torneo, SECCION, current)

    q = db.query(MatchHighlight).filter(MatchHighlight.tournament_id == tournament_id)
    if match_id:
        q = q.filter(MatchHighlight.match_id == match_id)
    if play_type:
        q = q.filter(MatchHighlight.play_type == play_type.strip().upper())
    filas = q.all()

    if not (include_unpublished and puede_administrar(current, torneo)):
        filas = [f for f in filas if f.published]

    return _payload(db, _ordenadas(filas), torneo)


# --------------------------------------------------------------------------- #
#  Alta
# --------------------------------------------------------------------------- #
def _crear(
    db: Session,
    torneo: Tournament,
    actor: User,
    *,
    play_type: str,
    title: Optional[str],
    match_id: Optional[UUID],
    team_id: Optional[UUID],
    player_id: Optional[UUID],
    minute: Optional[int],
    poster_url: Optional[str],
    published: bool,
    storage: str,
    video_url: Optional[str],
    media_path: Optional[str] = None,
    mime_type: Optional[str] = None,
    size_bytes: Optional[int] = None,
    duration_seconds: Optional[int] = None,
) -> MatchHighlight:
    """Inserta la fila y deja el rastro. No hace commit."""
    fila = MatchHighlight(
        tournament_id=torneo.id,
        match_id=match_id,
        team_id=team_id,
        player_id=player_id,
        play_type=play_type,
        title=(title or "").strip() or None,
        minute=minute,
        storage=storage,
        video_url=video_url,
        media_path=media_path,
        mime_type=mime_type,
        size_bytes=size_bytes,
        duration_seconds=duration_seconds,
        poster_url=poster_url,
        published=bool(published),
        created_by_id=actor.id,
    )
    db.add(fila)
    db.flush()
    auditoria.registrar(
        db,
        actor,
        auditoria.ACCION_JUGADA,
        resumen=f"Subió la jugada «{_resumen(fila, jugadas_de(_deporte(torneo)))}»",
        tournament_id=torneo.id,
        match_id=match_id,
        team_id=team_id,
        datos={"tipo": play_type, "origen": storage},
    )
    return fila


@router.post(
    "/tournaments/{tournament_id}/highlights",
    response_model=HighlightResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_highlight(
    tournament_id: UUID,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    play_type: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    match_id: Optional[str] = Form(None),
    team_id: Optional[str] = Form(None),
    player_id: Optional[str] = Form(None),
    minute: Optional[int] = Form(None),
    duration_seconds: Optional[int] = Form(None),
    poster_url: Optional[str] = Form(None),
    published: bool = Form(True),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Sube el clip. Multipart, porque el video no cabe en un JSON.

    Es `def` y no `async def` a propósito: FastAPI lo corre en un hilo aparte y
    así escribir treinta megas en disco no bloquea el bucle de eventos —con
    `async` el servidor entero se quedaría quieto mientras sube un clip.
    """
    torneo = _torneo(db, tournament_id)
    partido = _partido_del_torneo(db, torneo, _uuid_opt(match_id))
    _asegurar_puede_cargar(db, current, torneo, partido)

    equipo = _uuid_opt(team_id)
    jugador = _uuid_opt(player_id)
    _validar_equipo(db, torneo, equipo)
    _validar_jugador(db, jugador)
    tipo = _jugada_validada(torneo, play_type)
    portada = _portada_validada(poster_url)

    try:
        ruta_rel, bytes_escritos, extension = media.guardar_video(file)
    except media.ArchivoRechazado as e:
        raise HTTPException(status_code=400, detail=str(e))

    fila = _crear(
        db,
        torneo,
        current,
        play_type=tipo,
        title=title,
        match_id=partido.id if partido else None,
        team_id=equipo,
        player_id=jugador,
        minute=minute,
        poster_url=portada,
        published=published,
        storage="local",
        video_url=media.url_publica(ruta_rel),
        media_path=ruta_rel,
        mime_type=file.content_type or f"video/{extension.lstrip('.')}",
        size_bytes=bytes_escritos,
        duration_seconds=duration_seconds,
    )
    db.commit()
    db.refresh(fila)

    # El espejo en el CDN va por detrás: son cinco viajes a Contentful más el
    # procesamiento del video, y el organizador no puede esperar eso con el
    # teléfono en la mano. Si está apagado, la tarea no hace nada.
    if contentful_configurado():
        background.add_task(espejar_jugada, fila.id)

    return _payload(db, [fila], torneo)[0]


@router.post(
    "/tournaments/{tournament_id}/highlights/link",
    response_model=HighlightResponse,
    status_code=status.HTTP_201_CREATED,
)
def link_highlight(
    tournament_id: UUID,
    payload_in: HighlightLinkCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Registra una jugada que ya está publicada en otra parte.

    La liga que sube sus goles a YouTube o Instagram no tiene por qué volver a
    subirlos acá, y pegar el enlace no cuesta almacenamiento. El marco no se
    puede pintar sobre un video de otro dominio (el navegador no deja leerlo en
    un canvas), así que estas jugadas se enlazan pero no se exportan con marco;
    el panel lo advierte.
    """
    torneo = _torneo(db, tournament_id)
    partido = _partido_del_torneo(db, torneo, payload_in.match_id)
    _asegurar_puede_cargar(db, current, torneo, partido)
    _validar_equipo(db, torneo, payload_in.team_id)
    _validar_jugador(db, payload_in.player_id)
    tipo = _jugada_validada(torneo, payload_in.play_type)

    fila = _crear(
        db,
        torneo,
        current,
        play_type=tipo,
        title=payload_in.title,
        match_id=partido.id if partido else None,
        team_id=payload_in.team_id,
        player_id=payload_in.player_id,
        minute=payload_in.minute,
        poster_url=payload_in.poster_url,
        published=payload_in.published,
        storage="link",
        video_url=payload_in.video_url,
    )
    db.commit()
    db.refresh(fila)
    return _payload(db, [fila], torneo)[0]


# --------------------------------------------------------------------------- #
#  Edición y borrado
# --------------------------------------------------------------------------- #
@router.put("/highlights/{highlight_id}", response_model=HighlightResponse)
def update_highlight(
    highlight_id: UUID,
    payload_in: HighlightUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Corrige la ficha de una jugada o la saca del marcador público.

    El archivo no se reemplaza: para eso se borra y se sube otro. Lo que se
    corrige es lo que se escribió mal y si sale o no.
    """
    fila = _jugada(db, highlight_id)
    torneo = _torneo(db, fila.tournament_id)
    partido_actual = (
        db.query(Match).filter(Match.id == fila.match_id).first()
        if fila.match_id
        else None
    )
    _asegurar_puede_cargar(db, current, torneo, partido_actual)

    cambios = payload_in.model_dump(exclude_unset=True)
    catalogo = jugadas_de(_deporte(torneo))
    antes = {
        "tipo": catalogo.get(fila.play_type or "", fila.play_type),
        "titulo": fila.title,
        "minuto": fila.minute,
        "publicada": bool(fila.published),
    }

    if "match_id" in cambios:
        nuevo = _partido_del_torneo(db, torneo, cambios["match_id"])
        # Mover la jugada a otro partido exige poder con el partido de destino,
        # no solo con el de origen: si no, un árbitro podría colgar su clip en
        # el partido de otro.
        _asegurar_puede_cargar(db, current, torneo, nuevo)
        fila.match_id = nuevo.id if nuevo else None
    if "team_id" in cambios:
        _validar_equipo(db, torneo, cambios["team_id"])
        fila.team_id = cambios["team_id"]
    if "player_id" in cambios:
        _validar_jugador(db, cambios["player_id"])
        fila.player_id = cambios["player_id"]
    if "play_type" in cambios:
        fila.play_type = _jugada_validada(torneo, cambios["play_type"])
    if "title" in cambios:
        fila.title = (cambios["title"] or "").strip() or None
    if "minute" in cambios:
        fila.minute = cambios["minute"]
    if "poster_url" in cambios:
        fila.poster_url = cambios["poster_url"]
    if "published" in cambios:
        fila.published = bool(cambios["published"])
    if "order_index" in cambios:
        fila.order_index = cambios["order_index"]

    db.flush()
    despues = {
        "tipo": catalogo.get(fila.play_type or "", fila.play_type),
        "titulo": fila.title,
        "minuto": fila.minute,
        "publicada": bool(fila.published),
    }
    detalle = auditoria.diferencias(antes, despues)
    if detalle:
        auditoria.registrar(
            db,
            current,
            auditoria.ACCION_JUGADA,
            resumen=f"Editó la jugada «{_resumen(fila, catalogo)}»",
            tournament_id=torneo.id,
            match_id=fila.match_id,
            team_id=fila.team_id,
            datos=detalle,
        )
    db.commit()
    db.refresh(fila)
    return _payload(db, [fila], torneo)[0]


@router.delete("/highlights/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_highlight(
    highlight_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Borra la jugada y su archivo.

    El archivo se borra DESPUÉS del commit: si se borrara antes y la
    transacción fallara, quedaría una fila apuntando a un video que ya no está.
    Al revés el peor caso es un archivo huérfano en disco, que no se le nota a
    nadie.
    """
    fila = _jugada(db, highlight_id)
    torneo = _torneo(db, fila.tournament_id)
    partido = (
        db.query(Match).filter(Match.id == fila.match_id).first()
        if fila.match_id
        else None
    )
    _asegurar_puede_cargar(db, current, torneo, partido)

    ruta = fila.media_path
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_JUGADA,
        resumen=f"Borró la jugada «{_resumen(fila, jugadas_de(_deporte(torneo)))}»",
        tournament_id=torneo.id,
        match_id=fila.match_id,
        team_id=fila.team_id,
        datos={"tipo": fila.play_type, "origen": fila.storage},
    )
    db.delete(fila)
    db.commit()
    media.borrar(ruta)


@router.post("/highlights/{highlight_id}/mirror", response_model=HighlightResponse)
def mirror_highlight(
    highlight_id: UUID,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Vuelve a intentar el espejo en Contentful de una jugada ya subida.

    Existe porque el espejo corre por detrás y puede fallar (el CDN estaba
    caído, el token venció): sin esto habría que borrar la jugada y volver a
    subir el video para reintentarlo.
    """
    fila = _jugada(db, highlight_id)
    torneo = _torneo(db, fila.tournament_id)
    partido = (
        db.query(Match).filter(Match.id == fila.match_id).first()
        if fila.match_id
        else None
    )
    _asegurar_puede_cargar(db, current, torneo, partido)

    if not contentful_configurado():
        raise HTTPException(
            status_code=400,
            detail=(
                "Contentful no está configurado en este servidor. Se habilita "
                "con CONTENTFUL_ENABLED, CONTENTFUL_SPACE_ID y "
                "CONTENTFUL_MANAGEMENT_TOKEN."
            ),
        )
    if fila.storage != "local" or not fila.media_path:
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden espejar las jugadas cuyo video está en este servidor",
        )
    background.add_task(espejar_jugada, fila.id)
    return _payload(db, [fila], torneo)[0]
