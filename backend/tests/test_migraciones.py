"""El shim de migraciones de arranque y el contrato de los enums nativos.

En PostgreSQL los enums viven como tipos nativos creados con las etiquetas del
primer despliegue; `create_all()` nunca los altera, así que un valor nuevo del
modelo (como `banquitas` en SportType) rompe las bases existentes salvo que
`_sincronizar_enums_postgres()` lo agregue al arrancar. Estas pruebas fijan el
mapa tipo→etiquetas del que depende esa sincronización: si un miembro cambia de
nombre o el Enum deja de guardar nombres, la migración dejaría de encontrar (o
de agregar) las etiquetas correctas en silencio.
"""
from app.db.database import enums_del_modelo


def test_enums_del_modelo_cubre_todos_los_tipos():
    tipos = enums_del_modelo()
    assert set(tipos) == {"sporttype", "stagetype", "matchstatus", "slottype"}


def test_las_etiquetas_son_los_nombres_de_los_miembros():
    """SQLAlchemy persiste los NOMBRES (FOOTBALL), no los valores (football)."""
    tipos = enums_del_modelo()
    assert tipos["sporttype"] == ["FOOTBALL", "MICRO", "BASKETBALL", "BANQUITAS"]
    assert tipos["stagetype"] == ["GROUP", "KNOCKOUT", "LEAGUE", "SWISS"]
    assert tipos["matchstatus"] == ["SCHEDULED", "LIVE", "FINISHED", "POSTPONED"]


def test_los_valores_nuevos_van_al_final():
    """ALTER TYPE ... ADD VALUE agrega al final: mientras los valores nuevos se
    declaren al final del enum, las bases viejas y las nuevas quedan con el
    mismo orden de etiquetas."""
    assert enums_del_modelo()["sporttype"][-1] == "BANQUITAS"
    # POSTPONED (aplazado) se declaró después de FINISHED por lo mismo: la base
    # que ya existe recibe la etiqueta al final y no cambia el orden.
    assert enums_del_modelo()["matchstatus"][-1] == "POSTPONED"
