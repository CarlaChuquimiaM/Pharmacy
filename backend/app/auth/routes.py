from datetime import datetime

from flask import Blueprint, jsonify, request, session
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
        "debe_cambiar_password": usuario.debe_cambiar_password,
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
    session.permanent = True
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
        usuario.debe_cambiar_password = True

    usuario.modificado_por_id = current_user.id
    usuario.modificado_en = datetime.utcnow()

    db.session.commit()
    return jsonify(usuario_a_dict(usuario))


@auth_bp.post("/cambiar-password")
@login_required
def cambiar_password():
    datos = request.get_json(silent=True) or {}
    password_actual = datos.get("password_actual") or ""
    password_nueva = datos.get("password_nueva") or ""

    if not current_user.check_password(password_actual):
        return jsonify({"error": "La contraseña actual no es correcta"}), 400

    if len(password_nueva) < 6:
        return jsonify({"error": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

    current_user.set_password(password_nueva)
    current_user.debe_cambiar_password = False
    current_user.modificado_por_id = current_user.id
    current_user.modificado_en = datetime.utcnow()

    db.session.commit()
    return jsonify(usuario_a_dict(current_user))
