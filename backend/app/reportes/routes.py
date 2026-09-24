from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from flask_login import login_required
from sqlalchemy import func

from ..extensions import db
from ..models import Cliente, MetodoPago, MovimientoPuntos, Producto, Venta, VentaDetalle


reportes_bp = Blueprint("reportes", __name__)


DIAS_POR_VENCER = 30


# ======================================================
# FUNCIONES AUXILIARES
# ======================================================

def resumen_ventas(desde, hasta):
    cantidad, total, ganancia = (
        db.session.query(
            func.count(Venta.id),
            func.coalesce(func.sum(Venta.total), 0),
            func.coalesce(func.sum(Venta.ganancia), 0),
        )
        .filter(Venta.fecha >= desde, Venta.fecha <= hasta)
        .first()
    )

    return {
        "cantidad_ventas": cantidad,
        "total_vendido": float(total),
        "ganancia": float(ganancia),
    }


def top_productos_vendidos(desde, limite=5):
    filas = (
        db.session.query(
            Producto.id,
            Producto.nombre,
            func.sum(VentaDetalle.cantidad).label("cantidad_vendida"),
            func.sum(VentaDetalle.subtotal).label("total_vendido"),
        )
        .join(VentaDetalle, VentaDetalle.producto_id == Producto.id)
        .join(Venta, Venta.id == VentaDetalle.venta_id)
        .filter(Venta.fecha >= desde)
        .group_by(Producto.id, Producto.nombre)
        .order_by(func.sum(VentaDetalle.cantidad).desc())
        .limit(limite)
        .all()
    )

    return [
        {
            "producto_id": fila.id,
            "nombre": fila.nombre,
            "cantidad_vendida": int(fila.cantidad_vendida),
            "total_vendido": float(fila.total_vendido),
        }
        for fila in filas
    ]


def ventas_por_metodo_pago(desde):
    filas = (
        db.session.query(
            MetodoPago.nombre,
            func.count(Venta.id),
            func.coalesce(func.sum(Venta.total), 0),
        )
        .join(Venta, Venta.metodo_pago_id == MetodoPago.id)
        .filter(Venta.fecha >= desde)
        .group_by(MetodoPago.nombre)
        .order_by(func.coalesce(func.sum(Venta.total), 0).desc())
        .all()
    )

    return [
        {"metodo": nombre, "cantidad_ventas": cantidad, "total": float(total)}
        for nombre, cantidad, total in filas
    ]


def resumen_inventario():
    productos = Producto.query.filter_by(activo=True).all()
    hoy = datetime.utcnow().date()

    stock_bajo = 0
    vencidos = 0
    por_vencer = 0

    for producto in productos:
        if producto.stock <= producto.stock_minimo:
            stock_bajo += 1

        if producto.vencimiento:
            dias = (producto.vencimiento - hoy).days
            if dias < 0:
                vencidos += 1
            elif dias <= DIAS_POR_VENCER:
                por_vencer += 1

    return {
        "total_productos": len(productos),
        "stock_bajo": stock_bajo,
        "vencidos": vencidos,
        "por_vencer": por_vencer,
    }


def resumen_fidelizacion():
    total_clientes = Cliente.query.filter_by(activo=True).count()

    puntos_acumulados = db.session.query(
        func.coalesce(func.sum(MovimientoPuntos.puntos), 0)
    ).filter(MovimientoPuntos.tipo == "acumulado").scalar()

    puntos_canjeados = db.session.query(
        func.coalesce(func.sum(MovimientoPuntos.puntos), 0)
    ).filter(MovimientoPuntos.tipo == "canjeado").scalar()

    top_clientes = (
        Cliente.query
        .filter(Cliente.activo.is_(True), Cliente.puntos > 0)
        .order_by(Cliente.puntos.desc())
        .limit(5)
        .all()
    )

    return {
        "total_clientes": total_clientes,
        "puntos_acumulados_total": int(puntos_acumulados),
        "puntos_canjeados_total": int(abs(puntos_canjeados)),
        "top_clientes": [
            {
                "id": cliente.id,
                "nombre": f"{cliente.nombre} {cliente.apellido or ''}".strip(),
                "puntos": cliente.puntos,
            }
            for cliente in top_clientes
        ],
    }


# ======================================================
# DASHBOARD
# ======================================================

@reportes_bp.get("/dashboard")
@login_required
def dashboard():
    ahora = datetime.utcnow()
    inicio_hoy = datetime.combine(ahora.date(), datetime.min.time())
    fin_hoy = datetime.combine(ahora.date(), datetime.max.time())
    inicio_semana = ahora - timedelta(days=7)
    inicio_mes = ahora - timedelta(days=30)

    return jsonify({
        "ventas": {
            "hoy": resumen_ventas(inicio_hoy, fin_hoy),
            "ultimos_7_dias": resumen_ventas(inicio_semana, ahora),
            "ultimos_30_dias": resumen_ventas(inicio_mes, ahora),
        },
        "top_productos": top_productos_vendidos(inicio_mes),
        "ventas_por_metodo_pago": ventas_por_metodo_pago(inicio_mes),
        "inventario": resumen_inventario(),
        "fidelizacion": resumen_fidelizacion(),
    })
