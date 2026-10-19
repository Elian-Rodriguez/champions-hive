"""El sorteo: bombos, separaciones y la siembra del cuadro.

Dos cosas que el azar puro no resuelve:

- **El sorteo de grupos** repartía la lista entera al azar, así que los cuatro
  candidatos podían caer en el mismo grupo con total naturalidad y el torneo
  quedaba roto antes de empezar. Los bombos son la respuesta de siempre: cada
  bombo se reparte uno por grupo y lo que se sortea es en qué grupo cae cada
  cabeza de serie. `keep_apart` resuelve la otra mitad —dos equipos del mismo
  club que no deben compartir grupo—.
- **La siembra del cuadro** ordenaba por mérito pero después emparejaba el
  primer cruce con el segundo, así que el 1 y el 2 se encontraban en
  semifinales: la siembra no servía de nada. Y nada impedía que dos equipos
  que acababan de jugar en el mismo grupo se reencontraran en primera ronda.
"""
import pytest

from app.api.tournament_routes import _evitar_reencuentros, _orden_siembra

from .conftest import API


def _grupos(client, torneo_id, admin):
    """De cada grupo, el conjunto de equipos que quedó dentro."""
    equipos = client.get(f"{API}/tournaments/{torneo_id}/teams", headers=admin).json()
    por_grupo = {}
    for e in equipos:
        por_grupo.setdefault(e.get("group_name"), set()).add(e["id"])
    return por_grupo


def _sortear(client, admin, torneo_id, **payload):
    r = client.post(
        f"{API}/tournaments/{torneo_id}/teams/shuffle_groups",
        json=payload,
        headers=admin,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _grupo_de(por_grupo, team_id):
    return next(g for g, ids in por_grupo.items() if team_id in ids)


# --------------------------------------------------------------------------- #
#  Sorteo de grupos
# --------------------------------------------------------------------------- #
def test_sin_bombos_sigue_siendo_el_sorteo_de_siempre(client, admin, torneo, equipos):
    _sortear(client, admin, torneo["id"], num_groups=3)
    por_grupo = _grupos(client, torneo["id"], admin)
    assert sorted(por_grupo) == ["A", "B", "C"]
    tamanos = sorted(len(ids) for ids in por_grupo.values())
    assert tamanos == [4, 4, 4]


def test_los_grupos_quedan_parejos_aunque_no_divida(client, admin, torneo, equipos):
    _sortear(client, admin, torneo["id"], num_groups=5)
    tamanos = sorted(len(ids) for ids in _grupos(client, torneo["id"], admin).values())
    # Doce en cinco: nadie se lleva dos equipos más que otro.
    assert max(tamanos) - min(tamanos) <= 1


def test_los_cabezas_de_serie_caen_en_grupos_distintos(
    client, admin, torneo, equipos
):
    """Toda la gracia del bombo: el bombo 1 se reparte uno por grupo."""
    cabezas = [e["id"] for e in equipos[:3]]
    _sortear(client, admin, torneo["id"], num_groups=3, pots=[cabezas])
    por_grupo = _grupos(client, torneo["id"], admin)
    assert len({_grupo_de(por_grupo, t) for t in cabezas}) == 3


def test_cada_bombo_se_reparte_por_separado(client, admin, torneo, equipos):
    """Dos bombos de tres: ningún grupo recibe dos del mismo bombo."""
    bombo1 = [e["id"] for e in equipos[:3]]
    bombo2 = [e["id"] for e in equipos[3:6]]
    _sortear(client, admin, torneo["id"], num_groups=3, pots=[bombo1, bombo2])
    por_grupo = _grupos(client, torneo["id"], admin)
    for bombo in (bombo1, bombo2):
        assert len({_grupo_de(por_grupo, t) for t in bombo}) == 3


def test_los_que_no_estan_en_ningun_bombo_tambien_se_reparten(
    client, admin, torneo, equipos
):
    """Se pueden sembrar solo los cabezas y dejar el resto al azar."""
    cabezas = [e["id"] for e in equipos[:3]]
    resultado = _sortear(client, admin, torneo["id"], num_groups=3, pots=[cabezas])
    por_grupo = _grupos(client, torneo["id"], admin)
    assert sum(len(ids) for ids in por_grupo.values()) == 12
    assert None not in por_grupo
    assert "bombo" in resultado["message"]


def test_dos_equipos_del_mismo_club_no_comparten_grupo(client, admin, torneo, equipos):
    del_club = [equipos[0]["id"], equipos[1]["id"]]
    resultado = _sortear(
        client, admin, torneo["id"], num_groups=3, keep_apart=[del_club]
    )
    por_grupo = _grupos(client, torneo["id"], admin)
    assert _grupo_de(por_grupo, del_club[0]) != _grupo_de(por_grupo, del_club[1])
    assert resultado["avisos"] == []


def test_si_no_hay_forma_de_separarlos_avisa_y_no_bloquea(
    client, admin, torneo, equipos
):
    """Tres equipos que no pueden juntarse y solo dos grupos: no hay solución.

    El organizador sabrá qué hacer; lo que no puede pasar es que el sorteo se
    niegue a terminar, igual que el validador de calendario nunca bloquea.
    """
    trio = [e["id"] for e in equipos[:3]]
    resultado = _sortear(client, admin, torneo["id"], num_groups=2, keep_apart=[trio])
    assert resultado["avisos"], "tenía que avisar que no pudo separarlos"
    por_grupo = _grupos(client, torneo["id"], admin)
    assert sum(len(ids) for ids in por_grupo.values()) == 12


def test_los_bombos_y_las_separaciones_conviven(client, admin, torneo, equipos):
    cabezas = [e["id"] for e in equipos[:3]]
    del_club = [equipos[0]["id"], equipos[5]["id"]]
    _sortear(
        client, admin, torneo["id"], num_groups=3,
        pots=[cabezas], keep_apart=[del_club],
    )
    por_grupo = _grupos(client, torneo["id"], admin)
    assert len({_grupo_de(por_grupo, t) for t in cabezas}) == 3
    assert _grupo_de(por_grupo, del_club[0]) != _grupo_de(por_grupo, del_club[1])


def test_un_equipo_ajeno_en_un_bombo_se_ignora(client, admin, torneo, equipos):
    """Un id que no está inscrito no puede tumbar el sorteo."""
    import uuid as _uuid

    _sortear(
        client, admin, torneo["id"], num_groups=3,
        pots=[[str(_uuid.uuid4()), equipos[0]["id"]]],
    )
    por_grupo = _grupos(client, torneo["id"], admin)
    assert sum(len(ids) for ids in por_grupo.values()) == 12


# --------------------------------------------------------------------------- #
#  Siembra del cuadro
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "size,esperado",
    [
        (2, [1, 2]),
        (4, [1, 4, 2, 3]),
        (8, [1, 8, 4, 5, 2, 7, 3, 6]),
    ],
)
def test_el_orden_de_siembra_es_el_de_cualquier_copa(size, esperado):
    assert _orden_siembra(size) == esperado


def test_el_uno_y_el_dos_solo_pueden_cruzarse_en_la_final():
    """Lo que el árbol viejo no respetaba.

    Con cruces 1-8, 2-7, 3-6 y 4-5 emparejados en ese orden, el ganador de
    1-8 jugaba contra el de 2-7 en semifinales: los dos mejores se eliminaban
    una ronda antes de la final y la siembra por mérito no servía de nada.
    """
    orden = _orden_siembra(8)
    mitad = len(orden) // 2
    assert orden.index(1) < mitad <= orden.index(2)


def test_la_siembra_evita_el_reencuentro_de_grupo():
    cruces = [
        {"match": 1, "home_group": "A", "away_group": "A",
         "away_seed": 8, "away_team_id": "a4", "away_team_name": "A4"},
        {"match": 2, "home_group": "B", "away_group": "B",
         "away_seed": 5, "away_team_id": "b4", "away_team_name": "B4"},
    ]
    avisos = _evitar_reencuentros(cruces)
    assert avisos == []
    assert [(c["home_group"], c["away_group"]) for c in cruces] == [("A", "B"), ("B", "A")]
    # El intercambio se lleva el equipo entero, no solo la etiqueta del grupo.
    assert cruces[0]["away_team_id"] == "b4"


def test_si_el_reencuentro_es_inevitable_lo_dice():
    """Cuando todos los clasificados salen del mismo grupo no hay nada que hacer."""
    cruces = [
        {"match": 1, "home_group": "A", "away_group": "A",
         "away_seed": 4, "away_team_id": "a4", "away_team_name": "A4"},
        {"match": 2, "home_group": "A", "away_group": "A",
         "away_seed": 3, "away_team_id": "a3", "away_team_name": "A3"},
    ]
    avisos = _evitar_reencuentros(cruces)
    assert len(avisos) == 2
    assert "grupo A" in avisos[0]


def test_la_vista_previa_no_cruza_equipos_del_mismo_grupo(
    client, admin, torneo, equipos
):
    """Con dos grupos y cuatro clasificados por grupo siempre hay solución."""
    for i, e in enumerate(equipos[:8]):
        client.put(
            f"{API}/tournaments/{torneo['id']}/teams/{e['id']}/group",
            json={"group_name": "AB"[i % 2]},
            headers=admin,
        )
    for e in equipos[8:]:
        client.delete(
            f"{API}/tournaments/{torneo['id']}/teams/{e['id']}", headers=admin
        )
    fase = client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": "Grupos", "type": "group",
              "config": {"qualifiers_per_group": 4, "best_thirds_count": 0}},
        headers=admin,
    ).json()
    client.post(f"{API}/tournaments/stages/{fase['id']}/generate_fixture", headers=admin)
    for i, m in enumerate(
        client.get(f"{API}/tournaments/stages/{fase['id']}/matches").json()
    ):
        client.put(
            f"{API}/matches/{m['id']}/status",
            json={"status": "finished", "home_score": (i * 2) % 4, "away_score": i % 3},
            headers=admin,
        )
    bp = client.get(f"{API}/tournaments/stages/{fase['id']}/bracket_preview").json()
    assert bp["bracket_size"] == 8
    assert bp["avisos"] == []
    assert all(c["home_group"] != c["away_group"] for c in bp["pairings"])
