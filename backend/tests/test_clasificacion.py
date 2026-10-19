"""Sistemas de clasificación: presets, repesca, desempate entre grupos y cuadro."""
from .conftest import API


def _configurar(client, admin, fase_id, **config):
    r = client.put(
        f"{API}/tournaments/stages/{fase_id}", json={"config": config}, headers=admin
    )
    assert r.status_code == 200, r.text


def _clasificados(client, fase_id):
    return client.get(f"{API}/tournaments/stages/{fase_id}/qualifiers").json()


def test_presets_expuestos(client):
    r = client.get(f"{API}/tournaments/qualification_presets")
    assert r.status_code == 200
    data = r.json()
    assert data["presets"] and all("label" in p for p in data["presets"])
    # El enfrentamiento directo no aplica entre equipos que nunca se cruzaron.
    assert "PARTIDO_DIRECTO" not in [o["value"] for o in data["cross_tiebreaker_options"]]


def test_preset_dos_por_grupo_completa_el_cuadro(client, admin, fase_jugada):
    """3 grupos × 2 = 6 directos; la repesca automática completa a 8."""
    _configurar(client, admin, fase_jugada["id"], preset="dos_por_grupo")
    q = _clasificados(client, fase_jugada["id"])
    assert len(q["direct"]) == 6
    assert q["extras_needed"] == 2
    assert q["bracket_size"] == 8


def test_preset_solo_campeones(client, admin, fase_jugada):
    _configurar(client, admin, fase_jugada["id"], preset="campeones_de_grupo")
    q = _clasificados(client, fase_jugada["id"])
    assert q["qualifiers_per_group"] == 1
    assert q["extras_needed"] == 0
    assert q["bracket_size"] == 3


def test_config_manual_pisa_el_preset(client, admin, fase_jugada):
    _configurar(
        client, admin, fase_jugada["id"], preset="dos_por_grupo", qualifiers_per_group=1
    )
    q = _clasificados(client, fase_jugada["id"])
    assert q["qualifiers_per_group"] == 1


def test_repescados_marcados(client, admin, fase_jugada):
    _configurar(client, admin, fase_jugada["id"], preset="dos_por_grupo")
    q = _clasificados(client, fase_jugada["id"])
    assert sum(1 for e in q["extras"] if e["qualifies"]) == q["extras_needed"]


def test_desempate_entre_grupos_configurable(client, admin, fase_jugada):
    _configurar(
        client,
        admin,
        fase_jugada["id"],
        preset="dos_por_grupo",
        cross_tiebreakers=["GOLES_FAVOR", "PUNTOS"],
    )
    q = _clasificados(client, fase_jugada["id"])
    assert q["cross_tiebreakers"] == ["GOLES_FAVOR", "PUNTOS"]
    goles = [e["points_scored"] for e in q["extras"]]
    assert goles == sorted(goles, reverse=True)


def test_vista_previa_del_cuadro(client, admin, fase_jugada):
    _configurar(client, admin, fase_jugada["id"], preset="dos_por_grupo")
    bp = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/bracket_preview").json()
    assert bp["bracket_size"] == 8
    assert len(bp["pairings"]) == 4
    assert bp["es_potencia_de_dos"] is True
    assert bp["byes"] == []
    # Siembra por mérito y en el ORDEN DEL CUADRO: los locales salen 1, 4, 2, 3,
    # que es lo que deja al 1 y al 2 en mitades distintas —solo pueden cruzarse
    # en la final—. Los visitantes pueden haberse intercambiado entre llaves
    # para evitar que dos del mismo grupo se reencuentren.
    assert [c["home_seed"] for c in bp["pairings"]] == [1, 4, 2, 3]
    assert sorted(c["away_seed"] for c in bp["pairings"]) == [5, 6, 7, 8]
    for c in bp["pairings"]:
        assert c["home_group"] != c["away_group"] or bp["avisos"]


def test_el_cuadro_que_no_cierra_se_completa_con_byes(client, admin, fase_jugada):
    """Tres campeones de grupo no son potencia de 2, y eso ya no es un problema.

    Antes el tamaño se achicaba a la potencia anterior y el tercer clasificado
    simplemente desaparecía del cuadro; ahora clasifican los tres y el mejor
    sembrado espera en la ronda siguiente.
    """
    _configurar(client, admin, fase_jugada["id"], preset="campeones_de_grupo")
    bp = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/bracket_preview").json()
    assert bp["bracket_size"] == 3
    assert bp["es_potencia_de_dos"] is False
    assert len(bp["byes"]) == 1 and bp["byes"][0]["seed"] == 1
    assert len(bp["pairings"]) == 1


def test_repescados_siguen_al_corte(client, admin, fase_jugada):
    """Con 1 por grupo los repescados son los segundos, no los terceros."""
    _configurar(client, admin, fase_jugada["id"], qualifiers_per_group=1)
    q = _clasificados(client, fase_jugada["id"])
    posiciones = {e["position"] for e in q["extras"]}
    assert posiciones == {2}
