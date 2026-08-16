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
    # Siembra por mérito: el mejor contra el peor.
    assert (bp["pairings"][0]["home_seed"], bp["pairings"][0]["away_seed"]) == (1, 8)
    assert (bp["pairings"][-1]["home_seed"], bp["pairings"][-1]["away_seed"]) == (4, 5)


def test_vista_previa_avisa_si_el_cuadro_no_cierra(client, admin, fase_jugada):
    _configurar(client, admin, fase_jugada["id"], preset="campeones_de_grupo")
    bp = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/bracket_preview").json()
    assert bp["bracket_size"] == 3
    assert bp["es_potencia_de_dos"] is False


def test_repescados_siguen_al_corte(client, admin, fase_jugada):
    """Con 1 por grupo los repescados son los segundos, no los terceros."""
    _configurar(client, admin, fase_jugada["id"], qualifiers_per_group=1)
    q = _clasificados(client, fase_jugada["id"])
    posiciones = {e["position"] for e in q["extras"]}
    assert posiciones == {2}
