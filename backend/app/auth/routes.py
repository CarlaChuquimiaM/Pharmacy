from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from ..extensions import db
from ..models import Usuario

auth_bp = Blueprint("auth", __name__)


def usuario_a_dict(usuario):
    return {
        "id": usuario.id,
        "username": usuario.username,
        "rol": usuario.rol,
        "activo": usuario.activo,
    }


def requiere_admin():
    return current_user.is_authenticated and current_user.rol == "admin"


@auth_bp.post("/login")
def login():
    datos = request.get_json(silent=True) or {}
    username = (datos.get("username") or "").strip()
    password = datos.get("password") or ""

    usuario = Usuario.query.filter_by(username=username).first()

    if usuario is None or not usuario.check_password(password):
        return jsonify({"error": "Usuario o contraseña incorrectos"}), 401

    if not usuario.activo:
        return jsonify({"error": "Este usuario está inhabilitado"}), 403

    login_user(usuario)
    return jsonify(usuario_a_dict(usuario))


@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True})


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(usuario_a_dict(current_user))


@auth_bp.get("/usuarios")
@login_required
def listar_usuarios():
    if not requiere_admin():
        return jsonify({"error": "Solo el administrador puede ver usuarios"}), 403

    usuarios = Usuario.query.order_by(Usuario.username).all()
    return jsonify([usuario_a_dict(u) for u in usuarios])


@auth_bp.post("/usuarios")
@login_required
def crear_usuario():
    if not requiere_admin():
        return jsonify({"error": "Solo el administrador puede crear usuarios"}), 403

    datos = request.get_json(silent=True) or {}
    username = (datos.get("username") or "").strip()
    password = datos.get("password") or ""
    rol = datos.get("rol") or "cajero"

    if not username or not password:
        return jsonify({"error": "Usuario y contraseña son obligatorios"}), 400

    if rol not in ("admin", "cajero"):
        return jsonify({"error": "Rol inválido"}), 400

    if Usuario.query.filter_by(username=username).first() is not None:
        return jsonify({"error": "Ese nombre de usuario ya existe"}), 409

    usuario = Usuario(username=username, rol=rol, creado_por_id=current_user.id)
    usuario.set_password(password)
    db.session.add(usuario)
    db.session.commit()

    return jsonify(usuario_a_dict(usuario)), 201


@auth_bp.patch("/usuarios/<int:usuario_id>")
@login_required
def actualizar_usuario(usuario_id):
    if not requiere_admin():
        return jsonify({"error": "Solo el administrador puede modificar usuarios"}), 403

    usuario = Usuario.query.get_or_404(usuario_id)
    datos = request.get_json(silent=True) or {}

    if "activo" in datos:
        usuario.activo = bool(datos["activo"])

    if datos.get("password"):
        usuario.set_password(datos["password"])

    usuario.modificado_por_id = current_user.id
    usuario.modificado_en = datetime.utcnow()

    db.session.commit()
    return jsonify(usuario_a_dict(usuario))
