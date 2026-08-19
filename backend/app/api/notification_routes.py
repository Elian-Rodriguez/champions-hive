"""Bandeja de avisos del usuario autenticado.

Los avisos los genera `services/notifications.py` cuando el organizador mueve
un partido; aquí solo se consultan y se marcan como leídos. Cualquier rol tiene
bandeja (al organizador le sirve para su propio aviso manual), pero en la
práctica quien la usa es el capitán.
"""
from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.tournament_routes import _torneo_administrable
from app.core.deps import get_current_user, require_staff
from app.db.database import get_db
from app.db.models import Notification, TournamentTeam, User
from app.schemas import NotificationBroadcast, NotificationResponse
from app.services.notifications import (
    TIPO_GENERAL,
    capitanes_de_equipos,
    crear_notificacion,
)

router = APIRouter()


@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Avisos del usuario, del más reciente al más viejo."""
    q = db.query(Notification).filter(Notification.user_id == current.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return (
        q.order_by(Notification.created_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )


@router.get("/unread_count")
def unread_count(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
):
    """Contador para la campana del encabezado."""
    total = (
        db.query(Notification)
        .filter(Notification.user_id == current.id, Notification.read_at.is_(None))
        .count()
    )
    return {"unread": total}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    aviso = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current.id)
        .first()
    )
    if not aviso:
        raise HTTPException(status_code=404, detail="Aviso no encontrado")
    if aviso.read_at is None:
        aviso.read_at = datetime.utcnow()
        db.commit()
        db.refresh(aviso)
    return aviso


@router.post("/read_all")
def mark_all_read(
    db: Session = Depends(get_db), current: User = Depends(get_current_user)
):
    ahora = datetime.utcnow()
    n = (
        db.query(Notification)
        .filter(Notification.user_id == current.id, Notification.read_at.is_(None))
        .update({Notification.read_at: ahora}, synchronize_session=False)
    )
    db.commit()
    return {"message": f"{n} aviso(s) marcados como leídos", "updated": n}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    aviso = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current.id)
        .first()
    )
    if not aviso:
        raise HTTPException(status_code=404, detail="Aviso no encontrado")
    db.delete(aviso)
    db.commit()


@router.post("/broadcast/{tournament_id}")
def broadcast(
    tournament_id: UUID,
    payload: NotificationBroadcast,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Aviso manual del organizador a los capitanes de su torneo.

    Sin `team_ids` va a todos los equipos inscritos; con la lista, solo a esos.
    Sirve para lo que no dispara un cambio de partido: reunión de delegados,
    cambio de reglamento, suspensión por lluvia de toda una fecha.
    """
    torneo = _torneo_administrable(db, tournament_id, current)
    equipos: List = [
        tt.team_id
        for tt in db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == torneo.id)
        .all()
    ]
    if payload.team_ids:
        pedidos = {str(t) for t in payload.team_ids}
        equipos = [t for t in equipos if str(t) in pedidos]
    destinatarios = capitanes_de_equipos(db, equipos)
    enviados = 0
    for team_id, user_ids in destinatarios.items():
        for user_id in user_ids:
            crear_notificacion(
                db,
                user_id,
                tipo=TIPO_GENERAL,
                title=payload.title,
                body=payload.body or "",
                team_id=team_id,
                tournament_id=torneo.id,
                data={"torneo": torneo.name},
            )
            enviados += 1
    db.commit()
    return {
        "message": (
            f"{enviados} aviso(s) enviados"
            if enviados
            else "Ningún equipo de este torneo tiene capitán registrado"
        ),
        "sent": enviados,
    }
