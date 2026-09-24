from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from ..extensions import db
from ..models import Producto


productos_bp = Blueprint("productos", __name__)


# Un producto por vencer avisa cuando falten estos días o menos.
DIAS_POR_VENCER = 30


# ======================================================
# FUNCIONES AUXILIARES
# ======================================================

def producto_a_dict(producto):
    hoy = date.today()
    dias_para_vencer = (
        (producto.vencimiento - hoy).days
        if producto.vencimiento
        else None
    )

    return {
        "id": producto.id,
        "codigo": producto.codigo,
        "nombre": producto.nombre,
        "marca": producto.marca,
        "precio_compra": float(producto.precio_compra),
        "porcentaje_ganancia": float(producto.porcentaje_ganancia),
        "precio_venta": float(producto.precio_venta),
        "stock": producto.stock,
        "stock_minimo": producto.stock_minimo,
        "vencimiento": (
            producto.vencimiento.isoformat()
            if producto.vencimiento
            else None
        ),
        "dias_para_vencer": dias_para_vencer,
        "stock_bajo": producto.stock <= producto.stock_minimo,
        "vencido": dias_para_vencer is not None and dias_para_vencer < 0,
        "por_vencer": (
            dias_para_vencer is not None
            and 0 <= dias_para_vencer <= DIAS_POR_VENCER
        ),
        "activo": producto.activo,
    }


def parsear_vencimiento(valor):
    if not valor:
        return None

    try:
        return datetime.strptime(valor, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("La fecha de vencimiento debe tener formato AAAA-MM-DD")


def leer_datos_producto(datos, producto_existente=None):
    """Valida y devuelve los campos de un producto a partir del JSON recibido."""

    codigo = (datos.get("codigo") or "").strip()
    nombre = (datos.get("nombre") or "").strip()
    marca = (datos.get("marca") or "").strip() or None

    if not codigo:
        raise ValueError("El código es obligatorio")

    if not nombre:
        raise ValueError("El nombre es obligatorio")

    try:
        precio_compra = float(datos.get("precio_compra"))
    except (TypeError, ValueError):
        raise ValueError("El precio de compra no es válido")

    if precio_compra < 0:
        raise ValueError("El precio de compra no puede ser negativo")

    try:
        porcentaje_ganancia = float(datos.get("porcentaje_ganancia") or 0)
    except (TypeError, ValueError):
        raise ValueError("El porcentaje de ganancia no es válido")

    if porcentaje_ganancia < 0:
        raise ValueError("El porcentaje de ganancia no puede ser negativo")

    try:
        stock = int(datos.get("stock") or 0)
        stock_minimo = int(datos.get("stock_minimo") or 0)
    except (TypeError, ValueError):
        raise ValueError("El stock y el stock mínimo deben ser números enteros")

    if stock < 0:
        raise ValueError("El stock no puede ser negativo")

    if stock_minimo < 0:
        raise ValueError("El stock mínimo no puede ser negativo")

    vencimiento = parsear_vencimiento(datos.get("vencimiento"))

    consulta_duplicado = Producto.query.filter(Producto.codigo == codigo)

    if producto_existente is not None:
        consulta_duplicado = consulta_duplicado.filter(
            Producto.id != producto_existente.id
        )

    if consulta_duplicado.first() is not None:
        raise ValueError("Ya existe un producto con ese código")

    return {
        "codigo": codigo,
        "nombre": nombre,
        "marca": marca,
        "precio_compra": precio_compra,
        "porcentaje_ganancia": porcentaje_ganancia,
        "stock": stock,
        "stock_minimo": stock_minimo,
        "vencimiento": vencimiento,
    }


# ======================================================
# LISTAR / BUSCAR PRODUCTOS
# ======================================================

@productos_bp.get("")
@login_required
def listar_productos():
    texto = (request.args.get("q") or "").strip()

    consulta = Producto.query.filter_by(activo=True)

    if texto:
        patron = f"%{texto}%"
        consulta = consulta.filter(
            db.or_(
                Producto.codigo.ilike(patron),
                Producto.nombre.ilike(patron),
                Producto.marca.ilike(patron),
            )
        )

    productos = consulta.order_by(Producto.nombre).all()

    return jsonify([producto_a_dict(producto) for producto in productos])


# ======================================================
# ALERTAS: STOCK BAJO Y VENCIMIENTO
# ======================================================

@productos_bp.get("/alertas")
@login_required
def alertas_productos():
    productos = Producto.query.filter_by(activo=True).all()

    datos = [producto_a_dict(producto) for producto in productos]

    return jsonify({
        "stock_bajo": [d for d in datos if d["stock_bajo"]],
        "vencidos": [d for d in datos if d["vencido"]],
        "por_vencer": [d for d in datos if d["por_vencer"]],
    })


# ======================================================
# DETALLE DE UN PRODUCTO
# ======================================================

@productos_bp.get("/<int:producto_id>")
@login_required
def detalle_producto(producto_id):
    producto = Producto.query.get_or_404(producto_id)
    return jsonify(producto_a_dict(producto))


# ======================================================
# CREAR PRODUCTO
# ======================================================

@productos_bp.post("")
@login_required
def crear_producto():
    datos = request.get_json(silent=True) or {}

    try:
        campos = leer_datos_producto(datos)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    producto = Producto(
        creado_por_id=current_user.id,
        **campos,
    )
    producto.calcular_precio_venta()

    db.session.add(producto)
    db.session.commit()

    return jsonify(producto_a_dict(producto)), 201


# ======================================================
# EDITAR PRODUCTO
# ======================================================

@productos_bp.put("/<int:producto_id>")
@login_required
def editar_producto(producto_id):
    producto = Producto.query.get_or_404(producto_id)
    datos = request.get_json(silent=True) or {}

    try:
        campos = leer_datos_producto(datos, producto_existente=producto)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    for campo, valor in campos.items():
        setattr(producto, campo, valor)

    producto.calcular_precio_venta()
    producto.modificado_por_id = current_user.id
    producto.modificado_en = datetime.utcnow()

    db.session.commit()

    return jsonify(producto_a_dict(producto))


# ======================================================
# DESACTIVAR PRODUCTO
# ======================================================

@productos_bp.delete("/<int:producto_id>")
@login_required
def desactivar_producto(producto_id):
    producto = Producto.query.get_or_404(producto_id)

    if not producto.activo:
        return jsonify({"error": "Este producto ya está desactivado"}), 400

    producto.activo = False
    producto.modificado_por_id = current_user.id
    producto.modificado_en = datetime.utcnow()

    db.session.commit()

    return jsonify({"mensaje": "Producto desactivado correctamente"})
