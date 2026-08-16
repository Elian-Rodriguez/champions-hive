import random
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user_optional,
    puede_administrar,
    require_staff,
)
from app.db.database import get_db
from app.db.models import Player, Team, TeamPlayer, Tournament, TournamentTeam, User
from app.schemas import (
    GroupAssignment,
    PlayerCreate,
    PlayerResponse,
    ShuffleGroupsRequest,
    TeamBase,
    TeamCreate,
    TeamResponse,
)

router = APIRouter()


def _torneo_administrable(db: Session, tournament_id, user: User) -> Tournament:
    """Carga el torneo y verifica que el usuario pueda administrarlo."""
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if not puede_administrar(user, t):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )
    return t


def _team_payload(team: Team, link: TournamentTeam | None) -> dict:
    return {
        "id": team.id,
        "name": team.name,
        "logo_url": team.logo_url,
        "photo_url": team.photo_url,
        "color": team.color,
        "colors": team.colors or ([team.color] if team.color else []),
        "group_name": link.group_name if link else None,
        "status": link.status if link else None,
    }


# --------------------------------------------------------------------------- #
#  Equipos dentro de un torneo
# --------------------------------------------------------------------------- #
@router.post(
    "/tournaments/{tournament_id}/teams",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_team_in_tournament(
    tournament_id: UUID,
    team: TeamCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    colors = team.colors or ([team.color] if team.color else None)
    obj = Team(
        name=team.name,
        logo_url=team.logo_url,
        photo_url=team.photo_url,
        color=(colors[0] if colors else None),
        colors=colors,
    )
    db.add(obj)
    db.flush()
    link = TournamentTeam(
        tournament_id=tournament_id,
        team_id=obj.id,
        group_name=team.group_name,
        status="approved",
    )
    db.add(link)
    db.commit()
    db.refresh(obj)
    return _team_payload(obj, link)


@router.get("/tournaments/{tournament_id}/teams", response_model=List[TeamResponse])
def get_teams_in_tournament(tournament_id: UUID, db: Session = Depends(get_db)):
    links = (
        db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == tournament_id)
        .all()
    )
    result = []
    for link in links:
        team = db.query(Team).filter(Team.id == link.team_id).first()
        if team:
            result.append(_team_payload(team, link))
    return result


@router.post("/tournaments/{tournament_id}/teams/shuffle_groups")
def shuffle_teams_into_groups(
    tournament_id: UUID,
    payload_in: ShuffleGroupsRequest,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    links = (
        db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == tournament_id)
        .all()
    )
    if not links:
        raise HTTPException(status_code=400, detail="No hay equipos en el torneo")
    num_groups = max(1, payload_in.num_groups)
    random.shuffle(links)
    labels = [chr(ord("A") + i) for i in range(num_groups)]
    for idx, link in enumerate(links):
        link.group_name = labels[idx % num_groups]
    db.commit()
    return {
        "message": f"{len(links)} equipo(s) repartidos en {num_groups} grupo(s)",
        "groups": labels,
    }


@router.put(
    "/tournaments/{tournament_id}/teams/{team_id}/group", response_model=TeamResponse
)
def update_team_group(
    tournament_id: UUID,
    team_id: UUID,
    payload_in: GroupAssignment,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    link = (
        db.query(TournamentTeam)
        .filter(
            TournamentTeam.tournament_id == tournament_id,
            TournamentTeam.team_id == team_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Equipo no inscrito en el torneo")
    link.group_name = payload_in.group_name
    db.commit()
    team = db.query(Team).filter(Team.id == team_id).first()
    return _team_payload(team, link)


@router.put("/teams/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: UUID,
    payload_in: TeamBase,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    for key, value in payload_in.model_dump(exclude_unset=True).items():
        setattr(team, key, value)
    if team.colors:
        team.color = team.colors[0]
    db.commit()
    db.refresh(team)
    return _team_payload(team, None)


@router.delete(
    "/tournaments/{tournament_id}/teams/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_team_from_tournament(
    tournament_id: UUID,
    team_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    link = (
        db.query(TournamentTeam)
        .filter(
            TournamentTeam.tournament_id == tournament_id,
            TournamentTeam.team_id == team_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Equipo no inscrito en el torneo")
    db.delete(link)
    db.commit()


# --------------------------------------------------------------------------- #
#  Jugadores dentro de un equipo
# --------------------------------------------------------------------------- #
@router.post(
    "/teams/{team_id}/players",
    response_model=PlayerResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_player_in_team(
    team_id: UUID,
    player: PlayerCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    if not db.query(Team).filter(Team.id == team_id).first():
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    obj = Player(
        name=player.name,
        email=player.email,
        identification_number=player.identification_number,
        photo_url=player.photo_url,
    )
    db.add(obj)
    db.flush()
    link = TeamPlayer(team_id=team_id, player_id=obj.id, number=player.number)
    db.add(link)
    db.commit()
    db.refresh(obj)
    data = PlayerResponse.model_validate(obj).model_dump()
    data["number"] = player.number
    return data


@router.get("/teams/{team_id}/players", response_model=List[PlayerResponse])
def get_players_in_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """Nómina del equipo.

    Si TODOS los torneos donde juega el equipo tienen las nóminas ocultas, solo
    la ve quien administra alguno de ellos. Basta que un torneo la publique para
    que la nómina siga siendo pública.
    """
    torneos = [
        t
        for t in db.query(Tournament)
        .join(TournamentTeam, TournamentTeam.tournament_id == Tournament.id)
        .filter(TournamentTeam.team_id == team_id)
        .all()
    ]
    if torneos and not any((t.visibility or {}).get("nominas", True) for t in torneos):
        if not any(puede_administrar(current, t) for t in torneos):
            raise HTTPException(
                status_code=403,
                detail="El organizador no publica las nóminas de este torneo",
            )
    links = db.query(TeamPlayer).filter(TeamPlayer.team_id == team_id).all()
    result = []
    for link in links:
        player = db.query(Player).filter(Player.id == link.player_id).first()
        if player:
            data = PlayerResponse.model_validate(player).model_dump()
            data["number"] = link.number
            result.append(data)
    return result


@router.put("/teams/{team_id}/players/{player_id}", response_model=PlayerResponse)
def update_player(
    team_id: UUID,
    player_id: UUID,
    payload_in: PlayerCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    fields = payload_in.model_dump(exclude_unset=True)
    number = fields.pop("number", None)
    for key, value in fields.items():
        setattr(player, key, value)
    link = (
        db.query(TeamPlayer)
        .filter(TeamPlayer.team_id == team_id, TeamPlayer.player_id == player_id)
        .first()
    )
    if link and number is not None:
        link.number = number
    db.commit()
    db.refresh(player)
    data = PlayerResponse.model_validate(player).model_dump()
    data["number"] = link.number if link else None
    return data


@router.delete(
    "/teams/{team_id}/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_player_from_team(
    team_id: UUID,
    player_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    link = (
        db.query(TeamPlayer)
        .filter(TeamPlayer.team_id == team_id, TeamPlayer.player_id == player_id)
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Jugador no está en el equipo")
    db.delete(link)
    db.commit()
