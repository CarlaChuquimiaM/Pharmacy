from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from ..extensions import db
from ..models import Cliente, MovimientoPuntos

fidelizacion_bp = Blueprint("fidelizacion", __name__)


def cliente_a_dict(cliente):
    return {
        "id": cliente.id,
        "nombre": cliente.nombre,
        "apellido": cliente.apellido,
        "telefono": cliente.telefono,
        "puntos": cliente.puntos,
    }


def movimiento_a_dict(movimiento):
    return {
        "id": movimiento.id,
        "tipo": movimiento.tipo,
        "puntos": movimiento.puntos,
        "monto_compra": float(movimiento.monto_compra) if movimiento.monto_compra is not None else None,
        "nota": movimiento.nota,
        "usuario": movimiento.usuario.username if movimiento.usuario else None,
        "fecha": movimiento.fecha.isoformat(),
    }


@fidelizacion_bp.get("/clientes")
@login_required
def buscar_clientes():
    texto = (request.args.get("q") or "").strip()

    consulta = Cliente.query.filter_by(activo=True)
    if texto:
        patron = f"%{texto}%"
        consulta = consulta.filter(
            db.or_(Cliente.nombre.ilike(patron), Cliente.apellido.ilike(patron))
        )

    clientes = consulta.order_by(Cliente.nombre).limit(50).all()
    return jsonify([cliente_a_dict(c) for c in clientes])


@fidelizacion_bp.post("/clientes")
@login_required
def crear_cliente():
    datos = request.get_json(silent=True) or {}
    nombre = (datos.get("nombre") or "").strip()
    apellido = (datos.get("apellido") or "").strip() or None
    telefono = (datos.get("telefono") or "").strip() or None

    if not nombre:
        return jsonify({"error": "El nombre es obligatorio"}), 400

    cliente = Cliente(
        nombre=nombre,
        apellido=apellido,
        telefono=telefono,
        creado_por_id=current_user.id,
    )
    db.session.add(cliente)
    db.session.commit()

    return jsonify(cliente_a_dict(cliente)), 201


@fidelizacion_bp.get("/clientes/<int:cliente_id>")
@login_required
def detalle_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    historial = (
        MovimientoPuntos.query.filter_by(cliente_id=cliente.id)
        .order_by(MovimientoPuntos.fecha.desc())
        .limit(20)
        .all()
    )

    datos = cliente_a_dict(cliente)
    datos["historial"] = [movimiento_a_dict(m) for m in historial]
    return jsonify(datos)


@fidelizacion_bp.post("/clientes/<int:cliente_id>/sumar")
@login_required
def sumar_puntos(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    datos = request.get_json(silent=True) or {}

    try:
        monto = float(datos.get("monto_compra"))
    except (TypeError, ValueError):
        return jsonify({"error": "El monto de compra no es válido"}), 400

    if monto <= 0:
        return jsonify({"error": "El monto de compra debe ser mayor a 0"}), 400

    puntos_ganados = int(round(monto))
    cliente.puntos += puntos_ganados

    movimiento = MovimientoPuntos(
        cliente_id=cliente.id,
        usuario_id=current_user.id,
        tipo="acumulado",
        puntos=puntos_ganados,
        monto_compra=monto,
        fecha=datetime.utcnow(),
    )
    db.session.add(movimiento)
    db.session.commit()

    return jsonify(cliente_a_dict(cliente))


@fidelizacion_bp.post("/clientes/<int:cliente_id>/canjear")
@login_required
def canjear_puntos(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    datos = request.get_json(silent=True) or {}
    nota = (datos.get("nota") or "").strip()

    if not nota:
        return jsonify({"error": "Escribe qué premio se entregó"}), 400

    if cliente.puntos <= 0:
        return jsonify({"error": "Este cliente no tiene puntos acumulados"}), 400

    movimiento = MovimientoPuntos(
        cliente_id=cliente.id,
        usuario_id=current_user.id,
        tipo="canjeado",
        puntos=-cliente.puntos,
        nota=nota,
        fecha=datetime.utcnow(),
    )
    cliente.puntos = 0

    db.session.add(movimiento)
    db.session.commit()

    return jsonify(cliente_a_dict(cliente))
