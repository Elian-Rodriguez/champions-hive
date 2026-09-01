"""Recuperación de contraseña por correo.

Hasta ahora la única salida de un usuario que perdía la clave era llamar al
soporte para que se la reseteara a mano: sirve con veinte cuentas y deja de
servir con doscientas. Lo que se fija aquí es que el enlace sea de un solo uso,
que venza, que no se guarde en claro y —lo que más importa— que el endpoint
responda lo mismo exista o no la cuenta, porque si no sería una forma cómoda de
averiguar quién tiene cuenta en la plataforma.
"""
from datetime import datetime, timedelta

import pytest

from app.services import correo

from .conftest import API


@pytest.fixture
def buzon(monkeypatch):
    """Intercepta los correos en vez de mandarlos, y guarda el enlace."""
    enviados = []

    def falso_enviar(destino, nombre, enlace):
        enviados.append({"destino": destino, "nombre": nombre, "enlace": enlace})
        return True

    monkeypatch.setattr(correo, "enviar_recuperacion", falso_enviar)
    return enviados


@pytest.fixture
def cuenta(client, superadmin):
    """Una cuenta con correo y contraseña conocidos."""
    import uuid

    email = f"olvidadizo-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(
        f"{API}/auth/register",
        json={"email": email, "password": "secret1", "role": "captain", "name": "Ana"},
        headers=superadmin,
    )
    assert r.status_code == 201, r.text
    return {"email": email, "password": "secret1", "id": r.json()["id"]}


def _pedir(client, email):
    r = client.post(f"{API}/auth/forgot_password", json={"email": email})
    assert r.status_code == 200, r.text
    return r.json()["message"]


def _token(buzon):
    assert buzon, "no se envió ningún correo"
    return buzon[-1]["enlace"].split("reset=")[1]


def _canjear(client, token, password):
    return client.post(
        f"{API}/auth/reset_password_confirm",
        json={"token": token, "new_password": password},
    )


def _login(client, email, password):
    return client.post(
        f"{API}/auth/login", data={"username": email, "password": password}
    )


def test_el_enlace_llega_y_deja_entrar_con_la_clave_nueva(client, cuenta, buzon):
    _pedir(client, cuenta["email"])
    assert buzon[0]["destino"] == cuenta["email"]
    assert buzon[0]["nombre"] == "Ana"

    r = _canjear(client, _token(buzon), "clavenueva1")
    assert r.status_code == 200, r.text
    assert r.json()["email"] == cuenta["email"]

    assert _login(client, cuenta["email"], "clavenueva1").status_code == 200
    assert _login(client, cuenta["email"], cuenta["password"]).status_code == 401


def test_el_enlace_sirve_una_sola_vez(client, cuenta, buzon):
    _pedir(client, cuenta["email"])
    token = _token(buzon)
    assert _canjear(client, token, "clavenueva1").status_code == 200
    r = _canjear(client, token, "otraclave1")
    assert r.status_code == 400, r.text
    assert "ya no sirve" in r.json()["detail"]


def test_pedir_otro_enlace_mata_el_anterior(client, cuenta, buzon):
    """El enlace viejo se queda en el buzón; lo que no puede quedarse es su poder."""
    _pedir(client, cuenta["email"])
    viejo = _token(buzon)
    _pedir(client, cuenta["email"])
    nuevo = _token(buzon)
    assert viejo != nuevo
    assert _canjear(client, viejo, "clavenueva1").status_code == 400
    assert _canjear(client, nuevo, "clavenueva1").status_code == 200


def test_no_revela_si_la_cuenta_existe(client, buzon):
    conocido = _pedir(client, "nadie-en-absoluto@example.com")
    assert "Si esa cuenta existe" in conocido
    assert buzon == []


def test_el_mensaje_es_identico_exista_o_no(client, cuenta, buzon):
    assert _pedir(client, cuenta["email"]) == _pedir(client, "nadie@example.com")


def test_el_token_no_se_guarda_en_claro(client, cuenta, buzon):
    from app.db.database import SessionLocal
    from app.db.models import PasswordResetToken

    _pedir(client, cuenta["email"])
    token = _token(buzon)
    db = SessionLocal()
    try:
        filas = db.query(PasswordResetToken).all()
        assert filas
        for f in filas:
            assert f.token_hash != token
            assert token not in (f.token_hash or "")
    finally:
        db.close()


def test_el_enlace_vencido_no_sirve(client, cuenta, buzon):
    from app.db.database import SessionLocal
    from app.core.security import hash_token
    from app.db.models import PasswordResetToken

    _pedir(client, cuenta["email"])
    token = _token(buzon)
    db = SessionLocal()
    try:
        fila = (
            db.query(PasswordResetToken)
            .filter(PasswordResetToken.token_hash == hash_token(token))
            .first()
        )
        fila.expires_at = datetime.utcnow() - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()
    assert _canjear(client, token, "clavenueva1").status_code == 400


def test_un_token_inventado_no_sirve(client):
    assert _canjear(client, "esto-no-es-un-token", "clavenueva1").status_code == 400


def test_la_clave_corta_se_rechaza_y_el_enlace_sigue_vivo(client, cuenta, buzon):
    """Equivocarse con la longitud no puede costar el enlace."""
    _pedir(client, cuenta["email"])
    token = _token(buzon)
    assert _canjear(client, token, "123").status_code == 400
    assert _canjear(client, token, "clavenueva1").status_code == 200


def test_la_cuenta_desactivada_no_recibe_enlace(client, superadmin, cuenta, buzon):
    r = client.put(
        f"{API}/auth/users/{cuenta['id']}",
        json={"is_active": False},
        headers=superadmin,
    )
    assert r.status_code == 200, r.text
    _pedir(client, cuenta["email"])
    assert buzon == []


def test_recuperar_levanta_la_obligacion_de_cambiar(client, superadmin, cuenta, buzon):
    """Si venía de un reseteo de soporte, la clave nueva la eligió el dueño."""
    r = client.post(
        f"{API}/auth/users/{cuenta['id']}/reset_password", json={}, headers=superadmin
    )
    assert r.json()["must_change_password"] is True

    _pedir(client, cuenta["email"])
    assert _canjear(client, _token(buzon), "clavenueva1").status_code == 200
    entrada = _login(client, cuenta["email"], "clavenueva1")
    assert entrada.status_code == 200
    assert entrada.json()["must_change_password"] is False


def test_el_correo_no_configurado_no_rompe_nada(client, cuenta):
    """Sin SMTP la plataforma sigue igual: responde lo mismo y no falla."""
    assert "Si esa cuenta existe" in _pedir(client, cuenta["email"])
