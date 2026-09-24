import math
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from ..extensions import db
from ..models import (
    Cliente,
    ConfiguracionFidelizacion,
    MetodoPago,
    MovimientoPuntos,
    Producto,
    Venta,
    VentaDetalle,
)


ventas_bp = Blueprint("ventas", __name__)


def requiere_admin():
    return current_user.is_authenticated and current_user.rol == "admin"


# ======================================================
# SERIALIZACIÓN
# ======================================================

def metodo_pago_a_dict(metodo):
    return {
        "id": metodo.id,
        "nombre": metodo.nombre,
        "activo": metodo.activo,
    }


def detalle_a_dict(detalle):
    return {
        "producto_id": detalle.producto_id,
        "producto_nombre": detalle.producto.nombre if detalle.producto else None,
        "cantidad": detalle.cantidad,
        "precio_unitario_venta": float(detalle.precio_unitario_venta),
        "precio_unitario_compra": float(detalle.precio_unitario_compra),
        "subtotal": float(detalle.subtotal),
    }


def venta_a_dict(venta, con_detalles=False):
    datos = {
        "id": venta.id,
        "usuario": venta.usuario.username if venta.usuario else None,
        "cliente_id": venta.cliente_id,
        "cliente_nombre": (
            f"{venta.cliente.nombre} {venta.cliente.apellido or ''}".strip()
            if venta.cliente
            else None
        ),
        "metodo_pago": venta.metodo_pago.nombre if venta.metodo_pago else None,
        "total": float(venta.total),
        "ganancia": float(venta.ganancia),
        "fecha": venta.fecha.isoformat(),
    }

    if con_detalles:
        datos["detalles"] = [detalle_a_dict(detalle) for detalle in venta.detalles]

    return datos


# ======================================================
# MÉTODOS DE PAGO
# ======================================================

@ventas_bp.get("/metodos-pago")
@login_required
def listar_metodos_pago():
    metodos = (
        MetodoPago.query
        .filter_by(activo=True)
        .order_by(MetodoPago.nombre)
        .all()
    )
    return jsonify([metodo_pago_a_dict(m) for m in metodos])


@ventas_bp.post("/metodos-pago")
@login_required
def crear_metodo_pago():
    if not requiere_admin():
        return jsonify({"error": "Solo el administrador puede crear métodos de pago"}), 403

    datos = request.get_json(silent=True) or {}
    nombre = (datos.get("nombre") or "").strip()

    if not nombre:
        return jsonify({"error": "El nombre del método de pago es obligatorio"}), 400

    if MetodoPago.query.filter_by(nombre=nombre).first() is not None:
        return jsonify({"error": "Ya existe un método de pago con ese nombre"}), 409

    metodo = MetodoPago(nombre=nombre, creado_por_id=current_user.id)
    db.session.add(metodo)
    db.session.commit()

    return jsonify(metodo_pago_a_dict(metodo)), 201


# ======================================================
# RESUMEN DEL DÍA
# ======================================================

@ventas_bp.get("/resumen-hoy")
@login_required
def resumen_hoy():
    # Los campos "fecha" se guardan en UTC (datetime.utcnow), así que
    # "hoy" también se calcula en UTC para que coincidan los rangos.
    hoy = datetime.utcnow().date()
    inicio = datetime.combine(hoy, datetime.min.time())
    fin = datetime.combine(hoy, datetime.max.time())

    ventas_hoy = Venta.query.filter(
        Venta.fecha >= inicio,
        Venta.fecha <= fin,
    ).all()

    return jsonify({
        "cantidad_ventas": len(ventas_hoy),
        "total_vendido": sum(float(v.total) for v in ventas_hoy),
        "ganancia": sum(float(v.ganancia) for v in ventas_hoy),
    })


# ======================================================
# LISTAR / DETALLE DE VENTAS
# ======================================================

@ventas_bp.get("")
@login_required
def listar_ventas():
    ventas = (
        Venta.query
        .order_by(Venta.fecha.desc())
        .limit(50)
        .all()
    )
    return jsonify([venta_a_dict(v) for v in ventas])


@ventas_bp.get("/<int:venta_id>")
@login_required
def detalle_venta(venta_id):
    venta = Venta.query.get_or_404(venta_id)
    return jsonify(venta_a_dict(venta, con_detalles=True))


# ======================================================
# REGISTRAR VENTA (checkout)
# ======================================================

@ventas_bp.post("")
@login_required
def crear_venta():
    datos = request.get_json(silent=True) or {}

    items = datos.get("items") or []
    metodo_pago_id = datos.get("metodo_pago_id")
    cliente_id = datos.get("cliente_id")

    if not items:
        return jsonify({"error": "Agrega al menos un producto a la venta"}), 400

    if not metodo_pago_id:
        return jsonify({"error": "Selecciona un método de pago"}), 400

    metodo_pago = MetodoPago.query.filter_by(id=metodo_pago_id, activo=True).first()
    if metodo_pago is None:
        return jsonify({"error": "Método de pago no válido"}), 400

    cliente = None
    if cliente_id:
        cliente = Cliente.query.filter_by(id=cliente_id, activo=True).first()
        if cliente is None:
            return jsonify({"error": "Cliente no válido"}), 400

    # ------------------------------------------------
    # VALIDAR ITEMS Y STOCK ANTES DE TOCAR LA BASE
    # ------------------------------------------------

    lineas = []

    for item in items:
        try:
            producto_id = int(item.get("producto_id"))
            cantidad = int(item.get("cantidad"))
        except (TypeError, ValueError):
            return jsonify({"error": "Cada línea debe tener producto y cantidad válidos"}), 400

        if cantidad <= 0:
            return jsonify({"error": "La cantidad debe ser mayor a 0"}), 400

        producto = Producto.query.filter_by(id=producto_id, activo=True).first()
        if producto is None:
            return jsonify({"error": f"El producto #{producto_id} no existe o está inactivo"}), 400

        if producto.stock < cantidad:
            return jsonify({
                "error": f"Stock insuficiente para \"{producto.nombre}\" (disponible: {producto.stock})"
            }), 400

        lineas.append((producto, cantidad))

    # ------------------------------------------------
    # CREAR VENTA + DETALLES + DESCONTAR STOCK
    # ------------------------------------------------

    try:
        total = 0
        ganancia = 0

        venta = Venta(
            usuario_id=current_user.id,
            cliente_id=cliente.id if cliente else None,
            metodo_pago_id=metodo_pago.id,
            total=0,
            ganancia=0,
        )
        db.session.add(venta)
        db.session.flush()  # asigna venta.id sin cerrar la transacción

        for producto, cantidad in lineas:
            precio_venta = producto.precio_venta
            precio_compra = producto.precio_compra
            subtotal = precio_venta * cantidad

            db.session.add(VentaDetalle(
                venta_id=venta.id,
                producto_id=producto.id,
                cantidad=cantidad,
                precio_unitario_venta=precio_venta,
                precio_unitario_compra=precio_compra,
                subtotal=subtotal,
            ))

            producto.stock -= cantidad

            total += subtotal
            ganancia += (precio_venta - precio_compra) * cantidad

        venta.total = total
        venta.ganancia = ganancia

        puntos_ganados = 0
        if cliente is not None:
            configuracion = ConfiguracionFidelizacion.obtener()
            if configuracion.activa:
                puntos_ganados = math.floor(float(total) * float(configuracion.puntos_por_bs))

                if puntos_ganados > 0:
                    cliente.puntos += puntos_ganados
                    db.session.add(MovimientoPuntos(
                        cliente_id=cliente.id,
                        usuario_id=current_user.id,
                        tipo="acumulado",
                        puntos=puntos_ganados,
                        monto_compra=total,
                        venta_id=venta.id,
                        nota=f"Venta #{venta.id}",
                        fecha=datetime.utcnow(),
                    ))

        db.session.commit()

    except Exception:
        db.session.rollback()
        return jsonify({"error": "No se pudo registrar la venta"}), 500

    respuesta = venta_a_dict(venta, con_detalles=True)
    respuesta["puntos_ganados"] = puntos_ganados

    return jsonify(respuesta), 201
