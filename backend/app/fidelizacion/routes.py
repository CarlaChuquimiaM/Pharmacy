from datetime import datetime
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

from ..extensions import db
from ..models import Cliente, MovimientoPuntos, Premio, Venta


fidelizacion_bp = Blueprint("fidelizacion", __name__)


# ======================================================
# CONFIGURACIÓN DE IMÁGENES
# ======================================================

EXTENSIONES_IMAGEN_PERMITIDAS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


# ======================================================
# FUNCIONES AUXILIARES
# ======================================================

def cliente_a_dict(cliente):
    return {
        "id": cliente.id,
        "tipo_documento": cliente.tipo_documento,
        "numero_documento": cliente.numero_documento,
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
        "monto_compra": (
            float(movimiento.monto_compra)
            if movimiento.monto_compra is not None
            else None
        ),
        "nota": movimiento.nota,
        "usuario": (
            movimiento.usuario.username
            if movimiento.usuario
            else None
        ),
        "fecha": movimiento.fecha.isoformat(),
    }


def premio_a_dict(premio, puntos_cliente=None):
    datos = {
        "id": premio.id,
        "nombre": premio.nombre,
        "descripcion": premio.descripcion,
        "imagen": premio.imagen,
        "imagen_url": (
            f"/uploads/premios/{premio.imagen}"
            if premio.imagen
            else None
        ),
        "puntos_requeridos": premio.puntos_requeridos,
        "stock": premio.stock,
        "activo": premio.activo,
    }

    if puntos_cliente is not None:
        datos["puede_canjear"] = (
            premio.activo
            and premio.stock > 0
            and puntos_cliente >= premio.puntos_requeridos
        )

        datos["puntos_faltantes"] = max(
            0,
            premio.puntos_requeridos - puntos_cliente
        )

    return datos


def validar_admin():
    return (
        current_user.is_authenticated
        and current_user.rol == "admin"
    )


# ======================================================
# FUNCIONES DE IMAGEN
# ======================================================

def extension_imagen_valida(nombre_archivo):
    if not nombre_archivo:
        return False

    extension = Path(
        nombre_archivo
    ).suffix.lower()

    return (
        extension
        in EXTENSIONES_IMAGEN_PERMITIDAS
    )


def guardar_imagen_premio(archivo):
    if not archivo or not archivo.filename:
        raise ValueError(
            "Selecciona una foto del premio"
        )

    if not extension_imagen_valida(
        archivo.filename
    ):
        raise ValueError(
            "La imagen debe ser JPG, JPEG, PNG o WEBP"
        )

    if (
        archivo.mimetype
        and not archivo.mimetype.startswith(
            "image/"
        )
    ):
        raise ValueError(
            "El archivo seleccionado no parece ser una imagen"
        )

    extension = Path(
        archivo.filename
    ).suffix.lower()

    nombre_archivo = (
        f"{uuid4().hex}{extension}"
    )

    carpeta = Path(
        current_app.config[
            "PREMIOS_UPLOAD_DIR"
        ]
    )

    carpeta.mkdir(
        parents=True,
        exist_ok=True
    )

    ruta_destino = (
        carpeta
        / nombre_archivo
    )

    archivo.save(
        ruta_destino
    )

    return nombre_archivo


def eliminar_imagen_premio(
    nombre_archivo
):
    if not nombre_archivo:
        return

    carpeta = Path(
        current_app.config[
            "PREMIOS_UPLOAD_DIR"
        ]
    )

    ruta = (
        carpeta
        / nombre_archivo
    )

    try:
        if (
            ruta.exists()
            and ruta.is_file()
        ):
            ruta.unlink()

    except OSError:
        pass


# ======================================================
# CLIENTES
# ======================================================

@fidelizacion_bp.get("/clientes")
@login_required
def buscar_clientes():
    texto = (
        request.args.get("q")
        or ""
    ).strip()

    consulta = Cliente.query.filter_by(
        activo=True
    )

    if texto:
        patron = f"%{texto}%"

        consulta = consulta.filter(
            db.or_(
                Cliente.nombre.ilike(
                    patron
                ),
                Cliente.apellido.ilike(
                    patron
                ),
                Cliente.numero_documento.ilike(
                    patron
                ),
            )
        )

    clientes = (
        consulta
        .order_by(
            Cliente.nombre
        )
        .limit(50)
        .all()
    )

    return jsonify([
        cliente_a_dict(cliente)
        for cliente in clientes
    ])


# ======================================================
# BUSCAR CLIENTE POR CI / NIT
# ======================================================

@fidelizacion_bp.get(
    "/cliente-documento"
)
@login_required
def buscar_cliente_documento():
    tipo = (
        request.args.get("tipo")
        or "CI"
    ).strip().upper()

    numero = (
        request.args.get("numero")
        or ""
    ).strip()

    if not numero:
        return jsonify({
            "error": (
                "Ingresa un número de documento"
            )
        }), 400

    cliente = Cliente.query.filter(
        Cliente.activo.is_(True),
        Cliente.tipo_documento
        == tipo,
        Cliente.numero_documento
        == numero,
    ).first()

    if not cliente:
        return jsonify({
            "encontrado": False
        })

    return jsonify({
        "encontrado": True,
        "cliente": cliente_a_dict(
            cliente
        ),
    })


# ======================================================
# CREAR CLIENTE
# ======================================================

@fidelizacion_bp.post("/clientes")
@login_required
def crear_cliente():
    datos = (
        request.get_json(
            silent=True
        )
        or {}
    )

    tipo_documento = (
        datos.get(
            "tipo_documento"
        )
        or "CI"
    ).strip().upper()

    numero_documento = (
        datos.get(
            "numero_documento"
        )
        or ""
    ).strip()

    nombre = (
        datos.get("nombre")
        or ""
    ).strip()

    apellido = (
        datos.get("apellido")
        or ""
    ).strip() or None

    telefono = (
        datos.get("telefono")
        or ""
    ).strip() or None

    if tipo_documento not in (
        "CI",
        "NIT",
    ):
        return jsonify({
            "error": (
                "Tipo de documento no válido"
            )
        }), 400

    if not numero_documento:
        return jsonify({
            "error": (
                "El CI o NIT es obligatorio"
            )
        }), 400

    if not nombre:
        return jsonify({
            "error": (
                "El nombre es obligatorio"
            )
        }), 400

    existente = Cliente.query.filter(
        Cliente.tipo_documento
        == tipo_documento,
        Cliente.numero_documento
        == numero_documento,
    ).first()

    if existente:
        return jsonify({
            "error": (
                "Ya existe un cliente registrado "
                "con este documento"
            )
        }), 409

    cliente = Cliente(
        tipo_documento=tipo_documento,
        numero_documento=numero_documento,
        nombre=nombre,
        apellido=apellido,
        telefono=telefono,
        puntos=0,
        creado_por_id=current_user.id,
    )

    db.session.add(cliente)
    db.session.commit()

    return jsonify(
        cliente_a_dict(cliente)
    ), 201


# ======================================================
# DETALLE DEL CLIENTE
# ======================================================

@fidelizacion_bp.get(
    "/clientes/<int:cliente_id>"
)
@login_required
def detalle_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(
        cliente_id
    )

    historial = (
        MovimientoPuntos.query
        .filter_by(
            cliente_id=cliente.id
        )
        .order_by(
            MovimientoPuntos.fecha.desc()
        )
        .limit(50)
        .all()
    )

    compras = (
        Venta.query
        .filter_by(
            cliente_id=cliente.id
        )
        .order_by(
            Venta.fecha.desc()
        )
        .limit(50)
        .all()
    )

    datos = cliente_a_dict(
        cliente
    )

    datos["historial"] = [
        movimiento_a_dict(
            movimiento
        )
        for movimiento in historial
    ]

    datos["compras"] = [
        {
            "id": venta.id,
            "total": float(venta.total),
            "metodo_pago": venta.metodo_pago.nombre if venta.metodo_pago else None,
            "cantidad_items": len(venta.detalles),
            "fecha": venta.fecha.isoformat(),
        }
        for venta in compras
    ]

    return jsonify(datos)


# ======================================================
# EDITAR CLIENTE
# ======================================================

@fidelizacion_bp.put(
    "/clientes/<int:cliente_id>"
)
@login_required
def editar_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    datos = request.get_json(silent=True) or {}

    tipo_documento = (
        datos.get("tipo_documento") or cliente.tipo_documento
    ).strip().upper()

    numero_documento = (
        datos.get("numero_documento") or cliente.numero_documento
    ).strip()

    nombre = (datos.get("nombre") or "").strip()
    apellido = (datos.get("apellido") or "").strip() or None
    telefono = (datos.get("telefono") or "").strip() or None

    if tipo_documento not in ("CI", "NIT"):
        return jsonify({"error": "Tipo de documento no válido"}), 400

    if not numero_documento:
        return jsonify({"error": "El CI o NIT es obligatorio"}), 400

    if not nombre:
        return jsonify({"error": "El nombre es obligatorio"}), 400

    duplicado = Cliente.query.filter(
        Cliente.tipo_documento == tipo_documento,
        Cliente.numero_documento == numero_documento,
        Cliente.id != cliente.id,
    ).first()

    if duplicado:
        return jsonify({
            "error": "Ya existe otro cliente registrado con este documento"
        }), 409

    cliente.tipo_documento = tipo_documento
    cliente.numero_documento = numero_documento
    cliente.nombre = nombre
    cliente.apellido = apellido
    cliente.telefono = telefono
    cliente.modificado_por_id = current_user.id
    cliente.modificado_en = datetime.utcnow()

    db.session.commit()

    return jsonify(cliente_a_dict(cliente))


# ======================================================
# DESACTIVAR CLIENTE
# ======================================================

@fidelizacion_bp.delete(
    "/clientes/<int:cliente_id>"
)
@login_required
def desactivar_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)

    if not cliente.activo:
        return jsonify({"error": "Este cliente ya está desactivado"}), 400

    cliente.activo = False
    cliente.modificado_por_id = current_user.id
    cliente.modificado_en = datetime.utcnow()

    db.session.commit()

    return jsonify({"mensaje": "Cliente desactivado correctamente"})


# ======================================================
# SUMAR PUNTOS
# ======================================================

@fidelizacion_bp.post(
    "/clientes/<int:cliente_id>/sumar"
)
@login_required
def sumar_puntos(cliente_id):
    cliente = Cliente.query.get_or_404(
        cliente_id
    )

    datos = (
        request.get_json(
            silent=True
        )
        or {}
    )

    try:
        monto = float(
            datos.get(
                "monto_compra"
            )
        )
    except (
        TypeError,
        ValueError,
    ):
        return jsonify({
            "error": (
                "El monto de compra no es válido"
            )
        }), 400

    if monto <= 0:
        return jsonify({
            "error": (
                "El monto debe ser mayor a 0"
            )
        }), 400

    puntos_ganados = int(monto)

    if puntos_ganados <= 0:
        return jsonify({
            "error": (
                "La compra debe ser de al menos "
                "Bs 1 para generar puntos"
            )
        }), 400

    cliente.puntos += (
        puntos_ganados
    )

    movimiento = MovimientoPuntos(
        cliente_id=cliente.id,
        usuario_id=current_user.id,
        tipo="acumulado",
        puntos=puntos_ganados,
        monto_compra=monto,
        nota=None,
        fecha=datetime.utcnow(),
    )

    db.session.add(
        movimiento
    )

    db.session.commit()

    return jsonify(
        cliente_a_dict(
            cliente
        )
    )


# ======================================================
# LISTAR PREMIOS
# ======================================================

@fidelizacion_bp.get(
    "/premios"
)
@login_required
def listar_premios():
    premios = (
        Premio.query
        .filter_by(
            activo=True
        )
        .order_by(
            Premio.puntos_requeridos.asc()
        )
        .all()
    )

    return jsonify([
        premio_a_dict(
            premio
        )
        for premio in premios
    ])


# ======================================================
# CREAR PREMIO
# ======================================================

@fidelizacion_bp.post(
    "/premios"
)
@login_required
def crear_premio():
    if not validar_admin():
        return jsonify({
            "error": (
                "Solo el administrador "
                "puede crear premios"
            )
        }), 403

    nombre = (
        request.form.get("nombre")
        or ""
    ).strip()

    descripcion = (
        request.form.get(
            "descripcion"
        )
        or ""
    ).strip() or None

    archivo_imagen = (
        request.files.get(
            "imagen"
        )
    )

    try:
        puntos = int(
            request.form.get(
                "puntos_requeridos"
            )
        )

        stock = int(
            request.form.get(
                "stock"
            )
        )

    except (
        TypeError,
        ValueError,
    ):
        return jsonify({
            "error": (
                "Los puntos y el stock "
                "deben ser números válidos"
            )
        }), 400

    if not nombre:
        return jsonify({
            "error": (
                "El nombre del premio "
                "es obligatorio"
            )
        }), 400

    if puntos <= 0:
        return jsonify({
            "error": (
                "Los puntos deben ser "
                "mayores a cero"
            )
        }), 400

    if stock < 0:
        return jsonify({
            "error": (
                "El stock no puede "
                "ser negativo"
            )
        }), 400

    if (
        not archivo_imagen
        or not archivo_imagen.filename
    ):
        return jsonify({
            "error": (
                "Debes seleccionar "
                "una foto del premio"
            )
        }), 400

    try:
        nombre_imagen = (
            guardar_imagen_premio(
                archivo_imagen
            )
        )

    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 400

    premio = Premio(
        nombre=nombre,
        descripcion=descripcion,
        imagen=nombre_imagen,
        puntos_requeridos=puntos,
        stock=stock,
        activo=True,
        creado_por_id=current_user.id,
    )

    try:
        db.session.add(
            premio
        )

        db.session.commit()

    except Exception:
        db.session.rollback()

        eliminar_imagen_premio(
            nombre_imagen
        )

        return jsonify({
            "error": (
                "No se pudo crear el premio"
            )
        }), 500

    return jsonify(
        premio_a_dict(
            premio
        )
    ), 201


# ======================================================
# EDITAR PREMIO
# ======================================================

@fidelizacion_bp.put(
    "/premios/<int:premio_id>"
)
@login_required
def editar_premio(premio_id):
    if not validar_admin():
        return jsonify({
            "error": (
                "Solo el administrador "
                "puede editar premios"
            )
        }), 403

    premio = Premio.query.get_or_404(
        premio_id
    )

    nombre = (
        request.form.get(
            "nombre"
        )
        or ""
    ).strip()

    descripcion = (
        request.form.get(
            "descripcion"
        )
        or ""
    ).strip() or None

    nueva_imagen = (
        request.files.get(
            "imagen"
        )
    )

    try:
        puntos = int(
            request.form.get(
                "puntos_requeridos"
            )
        )

        stock = int(
            request.form.get(
                "stock"
            )
        )

    except (
        TypeError,
        ValueError,
    ):
        return jsonify({
            "error": (
                "Los puntos y el stock "
                "deben ser números válidos"
            )
        }), 400

    if not nombre:
        return jsonify({
            "error": (
                "El nombre del premio "
                "es obligatorio"
            )
        }), 400

    if puntos <= 0:
        return jsonify({
            "error": (
                "Los puntos deben ser "
                "mayores a cero"
            )
        }), 400

    if stock < 0:
        return jsonify({
            "error": (
                "El stock no puede "
                "ser negativo"
            )
        }), 400

    imagen_anterior = (
        premio.imagen
    )

    nueva_imagen_guardada = (
        None
    )

    if (
        nueva_imagen
        and nueva_imagen.filename
    ):
        try:
            nueva_imagen_guardada = (
                guardar_imagen_premio(
                    nueva_imagen
                )
            )

        except ValueError as error:
            return jsonify({
                "error": str(error)
            }), 400

        premio.imagen = (
            nueva_imagen_guardada
        )

    premio.nombre = nombre
    premio.descripcion = descripcion
    premio.puntos_requeridos = puntos
    premio.stock = stock

    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        if nueva_imagen_guardada:
            eliminar_imagen_premio(
                nueva_imagen_guardada
            )

        return jsonify({
            "error": (
                "No se pudo actualizar "
                "el premio"
            )
        }), 500

    if (
        nueva_imagen_guardada
        and imagen_anterior
        and imagen_anterior
        != nueva_imagen_guardada
    ):
        eliminar_imagen_premio(
            imagen_anterior
        )

    return jsonify(
        premio_a_dict(
            premio
        )
    )


# ======================================================
# DESACTIVAR PREMIO
# ======================================================

@fidelizacion_bp.delete(
    "/premios/<int:premio_id>"
)
@login_required
def desactivar_premio(
    premio_id
):
    if not validar_admin():
        return jsonify({
            "error": (
                "Solo el administrador "
                "puede desactivar premios"
            )
        }), 403

    premio = Premio.query.get_or_404(
        premio_id
    )

    if not premio.activo:
        return jsonify({
            "error": (
                "Este premio ya está "
                "desactivado"
            )
        }), 400

    premio.activo = False

    db.session.commit()

    return jsonify({
        "mensaje": (
            "Premio desactivado correctamente"
        )
    })


# ======================================================
# PREMIOS DE UN CLIENTE
# ======================================================

@fidelizacion_bp.get(
    "/clientes/<int:cliente_id>/premios"
)
@login_required
def premios_cliente(
    cliente_id
):
    cliente = Cliente.query.get_or_404(
        cliente_id
    )

    premios = (
        Premio.query
        .filter_by(
            activo=True
        )
        .order_by(
            Premio.puntos_requeridos.asc()
        )
        .all()
    )

    return jsonify([
        premio_a_dict(
            premio,
            cliente.puntos
        )
        for premio in premios
    ])


# ======================================================
# CANJEAR PREMIO
# ======================================================

@fidelizacion_bp.post(
    "/clientes/<int:cliente_id>/canjear"
)
@login_required
def canjear_puntos(
    cliente_id
):
    cliente = Cliente.query.get_or_404(
        cliente_id
    )

    datos = (
        request.get_json(
            silent=True
        )
        or {}
    )

    premio_id = (
        datos.get(
            "premio_id"
        )
    )

    if not premio_id:
        return jsonify({
            "error": (
                "Selecciona un premio"
            )
        }), 400

    try:
        premio_id = int(
            premio_id
        )
    except (
        TypeError,
        ValueError,
    ):
        return jsonify({
            "error": (
                "Premio no válido"
            )
        }), 400

    premio = Premio.query.get_or_404(
        premio_id
    )

    if not premio.activo:
        return jsonify({
            "error": (
                "Este premio ya no "
                "está disponible"
            )
        }), 400

    if premio.stock <= 0:
        return jsonify({
            "error": (
                "Este premio no tiene "
                "stock disponible"
            )
        }), 400

    if (
        cliente.puntos
        < premio.puntos_requeridos
    ):
        faltan = (
            premio.puntos_requeridos
            - cliente.puntos
        )

        return jsonify({
            "error": (
                f"Al cliente le faltan "
                f"{faltan} puntos"
            )
        }), 400

    cliente.puntos -= (
        premio.puntos_requeridos
    )

    premio.stock -= 1

    movimiento = MovimientoPuntos(
        cliente_id=cliente.id,
        usuario_id=current_user.id,
        tipo="canjeado",
        puntos=-premio.puntos_requeridos,
        monto_compra=None,
        nota=f"Premio: {premio.nombre}",
        fecha=datetime.utcnow(),
    )

    db.session.add(
        movimiento
    )

    db.session.commit()

    return jsonify({
        "cliente": cliente_a_dict(
            cliente
        ),
        "premio": premio_a_dict(
            premio
        ),
        "mensaje": (
            "Premio canjeado correctamente"
        ),
    })