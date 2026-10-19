"""La llave: penales, ida y vuelta, byes y repechaje.

Cuatro huecos del reglamento que la aplicación no tenía y que se caen el mismo
domingo:

- La **tanda de penales** no existía. La única forma de dejar constancia era
  cargar el marcador con el ganador arriba, así que un 2-2 definido 4-3 se
  guardaba como 3-2: el acta imprimía un resultado que no ocurrió. Ahora la
  tanda va en sus propias columnas y el marcador queda como terminó.
- La **llave a ida y vuelta** —lo normal en una final de fútbol aficionado— no
  se podía modelar: una final era un partido y listo. Ahora son dos partidos
  que comparten `tie_id` y lo que decide es el global.
- Un **cuadro que no es potencia de 2** no se podía armar: seed_bracket exigía
  una cantidad par de cruces y el cálculo de clasificados achicaba el cuadro
  dejando equipos afuera. Ahora los mejores sembrados entran con bye.
- El **repechaje** era un ranking en papel. Ahora el ganador de un partido de
  otra fase entra al cuadro como un clasificado más.
"""
from .conftest import API


def _partidos(client, fase_id):
    return client.get(f"{API}/tournaments/stages/{fase_id}/matches").json()


def _partido(client, fase_id, match_id):
    return next(m for m in _partidos(client, fase_id) if m["id"] == match_id)


def _equipos_de(match):
    return {match["home_team_id"], match["away_team_id"]} - {None}


def _finalizar(client, admin, match_id, local, visitante, **extra):
    r = client.put(
        f"{API}/matches/{match_id}/status",
        json={"status": "finished", "home_score": local, "away_score": visitante, **extra},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    return r.json()


def _configurar(client, admin, fase_id, **config):
    r = client.put(
        f"{API}/tournaments/stages/{fase_id}", json={"config": config}, headers=admin
    )
    assert r.status_code == 200, r.text


def _crear_fase(client, admin, torneo, nombre="Eliminatoria", config=None):
    return client.post(
        f"{API}/tournaments/{torneo['id']}/stages",
        json={"name": nombre, "type": "knockout", "config": config or {}},
        headers=admin,
    ).json()


def _sembrar(client, admin, fase, origen_id, round1, **extra):
    r = client.post(
        f"{API}/tournaments/stages/{fase['id']}/seed_bracket",
        json={"source_stage_id": origen_id, "round1": round1, **extra},
        headers=admin,
    )
    return r


def _resolver(client, admin, fase):
    client.post(
        f"{API}/tournaments/stages/{fase['id']}/resolve_position_slots", headers=admin
    )


def _cuadro(client, admin, torneo, fase_jugada, config=None, **extra):
    """Dos semifinales y una final, sembradas desde los grupos."""
    fase = _crear_fase(client, admin, torneo, config=config)
    r = _sembrar(
        client, admin, fase, fase_jugada["id"],
        [
            {"home_group": "A", "home_position": 1,
             "away_group": "B", "away_position": 2},
            {"home_group": "B", "home_position": 1,
             "away_group": "A", "away_position": 2},
        ],
        **extra,
    )
    assert r.status_code == 200, r.text
    _resolver(client, admin, fase)
    return fase


def _por_ronda(client, fase_id, ronda):
    return [m for m in _partidos(client, fase_id) if m["bracket_round"] == ronda]


def _legs(partidos):
    """Los partidos agrupados por llave, cada uno de ida a vuelta."""
    llaves = {}
    for m in partidos:
        llaves.setdefault(m["tie_id"], []).append(m)
    for legs in llaves.values():
        legs.sort(key=lambda m: m["leg"] or 0)
    return list(llaves.values())


# --------------------------------------------------------------------------- #
#  Penales
# --------------------------------------------------------------------------- #
def test_la_tanda_no_toca_el_marcador(client, admin, torneo, fase_jugada):
    """Un penal de la tanda no es un gol: el 2-2 sigue siendo 2-2."""
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    r = _finalizar(client, admin, semi["id"], 2, 2, home_penalties=3, away_penalties=4)
    assert (r["home_score"], r["away_score"]) == (2, 2)
    assert (r["home_penalties"], r["away_penalties"]) == (3, 4)


def test_el_que_gana_la_tanda_es_el_que_sube(client, admin, torneo, fase_jugada):
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    local, visitante = semi["home_team_id"], semi["away_team_id"]
    _finalizar(client, admin, semi["id"], 2, 2, home_penalties=3, away_penalties=5)
    final = _por_ronda(client, fase["id"], 2)[0]
    assert visitante in _equipos_de(final)
    assert local not in _equipos_de(final)


def test_sin_tanda_el_empate_lo_sigue_ganando_el_local(
    client, admin, torneo, fase_jugada
):
    """El comportamiento viejo se mantiene: hay torneos cargados así.

    Antes de que existiera la tanda, el árbitro resolvía los penales poniendo
    al ganador arriba en el marcador. Un empate sin tanda tiene que seguir
    resolviéndose por el local o esas llaves se quedarían sin definir.
    """
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    local = semi["home_team_id"]
    _finalizar(client, admin, semi["id"], 1, 1)
    assert local in _equipos_de(_por_ronda(client, fase["id"], 2)[0])


def test_corregir_la_tanda_cambia_al_finalista(client, admin, torneo, fase_jugada):
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    local, visitante = semi["home_team_id"], semi["away_team_id"]
    _finalizar(client, admin, semi["id"], 0, 0, home_penalties=5, away_penalties=4)
    assert local in _equipos_de(_por_ronda(client, fase["id"], 2)[0])
    # El árbitro anotó la tanda al revés y la corrige.
    _finalizar(client, admin, semi["id"], 0, 0, home_penalties=4, away_penalties=5)
    assert visitante in _equipos_de(_por_ronda(client, fase["id"], 2)[0])


def test_la_tanda_empatada_no_define_nada(client, admin, torneo, fase_jugada):
    """4-4 en penales es un dato incompleto, no un ganador."""
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    local = semi["home_team_id"]
    _finalizar(client, admin, semi["id"], 1, 1, home_penalties=4, away_penalties=4)
    # Cae al último recurso (el local), no a un ganador inventado.
    assert local in _equipos_de(_por_ronda(client, fase["id"], 2)[0])


def test_la_tanda_queda_en_el_historial(client, admin, torneo, fase_jugada):
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    _finalizar(client, admin, semi["id"], 1, 1, home_penalties=5, away_penalties=3)
    rastro = client.get(
        f"{API}/tournaments/{torneo['id']}/audit", headers=admin
    ).json()
    assert any("penales 5-3" in (e["summary"] or "") for e in rastro)


def test_el_cuadro_cuenta_como_quedo_definida_la_llave(
    client, admin, torneo, fase_jugada
):
    """«2-2» no explica nada; «pasa X 4-3 en penales» sí."""
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    _finalizar(client, admin, semi["id"], 2, 2, home_penalties=4, away_penalties=3)
    arbol = client.get(f"{API}/tournaments/stages/{fase['id']}/bracket_tree").json()
    jugado = next(
        m for r in arbol["rounds"] for m in r["matches"] if m["match_id"] == semi["id"]
    )
    assert jugado["llave"]["motivo"] == "penales"
    assert jugado["llave"]["ganador_id"] == semi["home_team_id"]


# --------------------------------------------------------------------------- #
#  Ida y vuelta
# --------------------------------------------------------------------------- #
def test_la_llave_a_ida_y_vuelta_son_dos_partidos_con_localia_invertida(
    client, admin, torneo, fase_jugada
):
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    primera = _por_ronda(client, fase["id"], 1)
    assert len(primera) == 4  # dos llaves de dos partidos
    for ida, vuelta in _legs(primera):
        assert (ida["leg"], vuelta["leg"]) == (1, 2)
        assert ida["home_team_id"] == vuelta["away_team_id"]
        assert ida["away_team_id"] == vuelta["home_team_id"]
    # La final también: la fase entera se juega a dos partidos.
    assert len(_por_ronda(client, fase["id"], 2)) == 2


def test_la_ida_sola_no_define_la_llave(client, admin, torneo, fase_jugada):
    """Una casilla en blanco es mejor que un equipo que todavía no ganó nada."""
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    ida, _vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    _finalizar(client, admin, ida["id"], 3, 0)
    finales = _por_ronda(client, fase["id"], 2)
    assert all(not _equipos_de(f) for f in finales)


def test_el_global_decide_la_llave(client, admin, torneo, fase_jugada):
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    ida, vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    uno, otro = ida["home_team_id"], ida["away_team_id"]
    _finalizar(client, admin, ida["id"], 1, 0)      # uno 1 - otro 0
    _finalizar(client, admin, vuelta["id"], 2, 0)   # otro 2 - uno 0  → global 2-1
    final = _por_ronda(client, fase["id"], 2)[0]
    assert otro in _equipos_de(final)
    assert uno not in _equipos_de(final)


def test_corregir_la_ida_reescribe_el_cuadro(client, admin, torneo, fase_jugada):
    """El global cambia aunque lo corregido sea el partido que no cierra."""
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    ida, vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    uno, otro = ida["home_team_id"], ida["away_team_id"]
    _finalizar(client, admin, ida["id"], 0, 1)
    _finalizar(client, admin, vuelta["id"], 0, 0)   # global 1-0 para otro
    assert otro in _equipos_de(_por_ronda(client, fase["id"], 2)[0])
    _finalizar(client, admin, ida["id"], 3, 1)      # global 3-2 para uno
    assert uno in _equipos_de(_por_ronda(client, fase["id"], 2)[0])


def test_el_gol_de_visitante_va_apagado(client, admin, torneo, fase_jugada):
    """Es una regla que muchas ligas (y la UEFA desde 2021) ya no usan."""
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    ida, vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    _finalizar(client, admin, ida["id"], 1, 1)
    _finalizar(client, admin, vuelta["id"], 2, 2)   # global 3-3
    # Sin gol de visitante ni tanda, decide el local de la vuelta.
    assert vuelta["home_team_id"] in _equipos_de(_por_ronda(client, fase["id"], 2)[0])


def test_el_gol_de_visitante_desempata_si_la_fase_lo_enciende(
    client, admin, torneo, fase_jugada
):
    fase = _cuadro(
        client, admin, torneo, fase_jugada,
        config={"two_legged": True, "away_goals": True},
    )
    ida, vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    visita_en_la_ida = ida["away_team_id"]
    _finalizar(client, admin, ida["id"], 1, 1)
    _finalizar(client, admin, vuelta["id"], 2, 2)   # global 3-3
    # El que fue visitante en la vuelta hizo 2 fuera contra 1 del otro.
    assert vuelta["away_team_id"] in _equipos_de(_por_ronda(client, fase["id"], 2)[0])
    assert visita_en_la_ida == vuelta["home_team_id"]


def test_el_global_empatado_se_define_por_la_tanda_de_la_vuelta(
    client, admin, torneo, fase_jugada
):
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    ida, vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    _finalizar(client, admin, ida["id"], 1, 0)
    _finalizar(
        client, admin, vuelta["id"], 1, 0, home_penalties=3, away_penalties=5
    )   # global 1-1, la tanda la gana el visitante de la vuelta
    assert vuelta["away_team_id"] in _equipos_de(_por_ronda(client, fase["id"], 2)[0])


def test_el_global_se_informa_en_el_cuadro(client, admin, torneo, fase_jugada):
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    ida, vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    _finalizar(client, admin, ida["id"], 1, 0)
    _finalizar(client, admin, vuelta["id"], 3, 0)
    arbol = client.get(f"{API}/tournaments/stages/{fase['id']}/bracket_tree").json()
    cerrada = next(
        m for r in arbol["rounds"] for m in r["matches"] if m["match_id"] == vuelta["id"]
    )
    assert cerrada["llave"]["legs"] == 2
    assert cerrada["llave"]["motivo"] == "global"
    # El global se orienta a la vuelta: el local de la vuelta hizo 3, el otro 1.
    assert (
        cerrada["llave"]["global_local"],
        cerrada["llave"]["global_visitante"],
    ) == (3, 1)


# --------------------------------------------------------------------------- #
#  Byes
# --------------------------------------------------------------------------- #
def test_los_clasificados_ya_no_se_descartan(client, admin, fase_jugada):
    """Seis campeones sin repesca posible eran un cuadro de cuatro."""
    _configurar(client, admin, fase_jugada["id"], qualifiers_per_group=2,
                best_thirds_count=0)
    q = client.get(f"{API}/tournaments/stages/{fase_jugada['id']}/qualifiers").json()
    assert q["bracket_size"] == 6
    assert q["byes"] == 2


def test_el_cuadro_de_seis_se_arma_con_dos_byes(client, admin, torneo, fase_jugada):
    _configurar(client, admin, fase_jugada["id"], qualifiers_per_group=2,
                best_thirds_count=0)
    fase = _crear_fase(client, admin, torneo)
    r = _sembrar(
        client, admin, fase, fase_jugada["id"],
        [
            {"home_group": "A", "home_position": 2,
             "away_group": "C", "away_position": 2},
            {"home_group": "B", "home_position": 2,
             "away_group": "C", "away_position": 1},
        ],
        byes=[{"group": "A", "position": 1}, {"group": "B", "position": 1}],
    )
    assert r.status_code == 200, r.text
    assert r.json()["byes"] == 2
    assert len(_por_ronda(client, fase["id"], 1)) == 2
    assert len(_por_ronda(client, fase["id"], 2)) == 2
    assert len(_por_ronda(client, fase["id"], 3)) == 1


def test_el_sembrado_con_bye_espera_en_la_segunda_ronda(
    client, admin, torneo, fase_jugada
):
    """El premio por ganar el grupo es no jugar la primera ronda."""
    fase = _crear_fase(client, admin, torneo)
    _sembrar(
        client, admin, fase, fase_jugada["id"],
        [{"home_group": "B", "home_position": 1, "away_group": "C", "away_position": 1}],
        byes=[{"group": "A", "position": 1}],
    )
    _resolver(client, admin, fase)
    grupos = client.get(
        f"{API}/tournaments/stages/{fase_jugada['id']}/standings_by_group"
    ).json()
    campeon_a = grupos["A"][0]["team_id"]
    semifinal = _por_ronda(client, fase["id"], 2)[0]
    assert campeon_a in _equipos_de(semifinal)
    # Y no jugó la primera ronda.
    assert all(campeon_a not in _equipos_de(m) for m in _por_ronda(client, fase["id"], 1))


def test_el_cuadro_dice_cuantos_byes_faltan(client, admin, torneo, fase_jugada):
    """El error tiene que traer los números, no un «no se puede»."""
    fase = _crear_fase(client, admin, torneo)
    r = _sembrar(
        client, admin, fase, fase_jugada["id"],
        [
            {"home_group": "A", "home_position": 1,
             "away_group": "B", "away_position": 2},
            {"home_group": "B", "home_position": 1,
             "away_group": "C", "away_position": 2},
            {"home_group": "C", "home_position": 1,
             "away_group": "A", "away_position": 2},
        ],
    )
    assert r.status_code == 400
    detalle = r.json()["detail"]
    assert "8" in detalle and "2 bye(s)" in detalle


# --------------------------------------------------------------------------- #
#  Repechaje
# --------------------------------------------------------------------------- #
def test_el_ganador_del_repechaje_entra_al_cuadro(client, admin, torneo, fase_jugada):
    """La repesca deja de ser un ranking en papel y pasa a jugarse."""
    repechaje = _crear_fase(client, admin, torneo, nombre="Repechaje")
    r = _sembrar(
        client, admin, repechaje, fase_jugada["id"],
        [{"home_group": "A", "home_position": 3, "away_group": "B", "away_position": 3}],
    )
    assert r.status_code == 200, r.text
    _resolver(client, admin, repechaje)
    play_in = _por_ronda(client, repechaje["id"], 1)[0]
    ganador = play_in["away_team_id"]
    _finalizar(client, admin, play_in["id"], 0, 2)

    cuadro = _crear_fase(client, admin, torneo, nombre="Semifinales")
    r = _sembrar(
        client, admin, cuadro, fase_jugada["id"],
        [
            {"home_group": "A", "home_position": 1, "away_winner_of": play_in["id"]},
            {"home_group": "B", "home_position": 1,
             "away_group": "C", "away_position": 1},
        ],
    )
    assert r.status_code == 200, r.text
    _resolver(client, admin, cuadro)
    primera = _por_ronda(client, cuadro["id"], 1)
    assert any(ganador in _equipos_de(m) for m in primera)


def test_corregir_el_repechaje_cambia_quien_entra(client, admin, torneo, fase_jugada):
    repechaje = _crear_fase(client, admin, torneo, nombre="Repechaje")
    _sembrar(
        client, admin, repechaje, fase_jugada["id"],
        [{"home_group": "A", "home_position": 3, "away_group": "B", "away_position": 3}],
    )
    _resolver(client, admin, repechaje)
    play_in = _por_ronda(client, repechaje["id"], 1)[0]
    uno, otro = play_in["home_team_id"], play_in["away_team_id"]
    _finalizar(client, admin, play_in["id"], 2, 0)

    cuadro = _crear_fase(client, admin, torneo, nombre="Semifinales")
    _sembrar(
        client, admin, cuadro, fase_jugada["id"],
        [
            {"home_group": "A", "home_position": 1, "away_winner_of": play_in["id"]},
            {"home_group": "B", "home_position": 1,
             "away_group": "C", "away_position": 1},
        ],
    )
    _resolver(client, admin, cuadro)
    assert any(uno in _equipos_de(m) for m in _por_ronda(client, cuadro["id"], 1))
    _finalizar(client, admin, play_in["id"], 0, 2)
    assert any(otro in _equipos_de(m) for m in _por_ronda(client, cuadro["id"], 1))


# --------------------------------------------------------------------------- #
#  La llave en el calendario
# --------------------------------------------------------------------------- #
def test_el_calendario_avisa_si_la_vuelta_va_antes_que_la_ida(
    client, admin, torneo, fase_jugada
):
    """Los dos partidos de una llave no dependen uno del otro por `StageSlot`
    —los dos salen del mismo origen— así que el control de orden de llave no
    los veía, y una vuelta antes que su ida es igual de injugable."""
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    ida, vuelta = _legs(_por_ronda(client, fase["id"], 1))[0]
    client.put(
        f"{API}/matches/{ida['id']}/schedule",
        json={"scheduled_start": "2026-11-20T18:00:00"},
        headers=admin,
    )
    client.put(
        f"{API}/matches/{vuelta['id']}/schedule",
        json={"scheduled_start": "2026-11-13T18:00:00"},
        headers=admin,
    )
    r = client.get(
        f"{API}/tournaments/{torneo['id']}/schedule_conflicts", headers=admin
    ).json()
    assert any(
        c["type"] == "orden_de_llave" and "vuelta" in c["title"].lower()
        for c in r["conflicts"]
    )


def test_la_programacion_automatica_pone_la_ida_primero(
    client, admin, torneo, fase_jugada
):
    fase = _cuadro(client, admin, torneo, fase_jugada, config={"two_legged": True})
    r = client.post(
        f"{API}/tournaments/{torneo['id']}/schedule",
        json={"start": "2026-11-01T09:00:00", "parallel_courts": False},
        headers=admin,
    )
    assert r.status_code == 200, r.text
    for ida, vuelta in _legs(_por_ronda(client, fase["id"], 1)):
        assert ida["scheduled_start"] < vuelta["scheduled_start"]


def test_los_penales_no_entran_en_la_tabla(client, admin, torneo, fase_jugada):
    """Un penal de la tanda no es un gol: ni suma en la tabla ni en goleadores.

    Es la razón de fondo para que la tanda tenga columnas propias en vez de
    resolverse escribiendo al ganador arriba del marcador.
    """
    fase = _cuadro(client, admin, torneo, fase_jugada)
    semi = _por_ronda(client, fase["id"], 1)[0]
    antes = client.get(
        f"{API}/tournaments/stages/{fase_jugada['id']}/standings_by_group"
    ).json()
    _finalizar(client, admin, semi["id"], 1, 1, home_penalties=9, away_penalties=0)
    despues = client.get(
        f"{API}/tournaments/stages/{fase_jugada['id']}/standings_by_group"
    ).json()
    assert antes == despues
    goleadores = client.get(f"{API}/tournaments/{torneo['id']}/player_stats").json()
    assert all(g.get("goals", 0) < 9 for g in goleadores)
