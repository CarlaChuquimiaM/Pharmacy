from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


class Usuario(db.Model, UserMixin):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    rol = db.Column(
        db.String(20),
        nullable=False
    )  # "admin" o "cajero"

    debe_cambiar_password = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    activo = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    creado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    creado_en = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    modificado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    modificado_en = db.Column(
        db.DateTime,
        nullable=True
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(
            self.password_hash,
            password
        )

    @property
    def is_active(self):
        return self.activo


class Cliente(db.Model):
    __tablename__ = "clientes"

    __table_args__ = (
        db.UniqueConstraint(
            "tipo_documento",
            "numero_documento",
            name="uq_cliente_documento"
        ),
    )

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    tipo_documento = db.Column(
        db.String(10),
        nullable=False
    )

    numero_documento = db.Column(
        db.String(30),
        nullable=False,
        index=True
    )

    nombre = db.Column(
        db.String(100),
        nullable=False
    )

    apellido = db.Column(
        db.String(100),
        nullable=True
    )

    telefono = db.Column(
        db.String(30),
        nullable=True
    )

    puntos = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    activo = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    creado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    creado_en = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    modificado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    modificado_en = db.Column(
        db.DateTime,
        nullable=True
    )

    movimientos = db.relationship(
        "MovimientoPuntos",
        backref="cliente",
        order_by="MovimientoPuntos.fecha.desc()",
    )


class MovimientoPuntos(db.Model):
    __tablename__ = "movimientos_puntos"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    cliente_id = db.Column(
        db.Integer,
        db.ForeignKey("clientes.id"),
        nullable=False
    )

    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False
    )

    tipo = db.Column(
        db.String(20),
        nullable=False
    )  # "acumulado" o "canjeado"

    puntos = db.Column(
        db.Integer,
        nullable=False
    )

    monto_compra = db.Column(
        db.Numeric(10, 2),
        nullable=True
    )

    # Nula cuando el movimiento es un canje de premio (no viene de una venta).
    venta_id = db.Column(
        db.Integer,
        db.ForeignKey("ventas.id"),
        nullable=True
    )

    nota = db.Column(
        db.String(255),
        nullable=True
    )

    fecha = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    usuario = db.relationship("Usuario")


class Premio(db.Model):
    __tablename__ = "premios"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    nombre = db.Column(
        db.String(120),
        nullable=False
    )

    descripcion = db.Column(
        db.String(255),
        nullable=True
    )

    # Nombre del archivo de imagen guardado en uploads/premios
    imagen = db.Column(
        db.String(255),
        nullable=True
    )

    puntos_requeridos = db.Column(
        db.Integer,
        nullable=False
    )

    stock = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    activo = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    creado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    creado_en = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )


class Producto(db.Model):
    __tablename__ = "productos"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    codigo = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        index=True
    )

    nombre = db.Column(
        db.String(150),
        nullable=False
    )

    marca = db.Column(
        db.String(100),
        nullable=True
    )

    precio_compra = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    porcentaje_ganancia = db.Column(
        db.Numeric(6, 2),
        nullable=False,
        default=0
    )

    precio_venta = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    stock = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    stock_minimo = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    vencimiento = db.Column(
        db.Date,
        nullable=True
    )

    # Listo para fase 2 (subida de foto de producto), sin usar en fase 1.
    foto_path = db.Column(
        db.String(255),
        nullable=True
    )

    activo = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    creado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    creado_en = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    modificado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    modificado_en = db.Column(
        db.DateTime,
        nullable=True
    )

    def calcular_precio_venta(self):
        precio_compra = self.precio_compra or 0
        porcentaje = self.porcentaje_ganancia or 0
        self.precio_venta = precio_compra * (1 + porcentaje / 100)
        return self.precio_venta


class MetodoPago(db.Model):
    __tablename__ = "metodos_pago"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    nombre = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    activo = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    creado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=True
    )

    creado_en = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )


class ConfiguracionFidelizacion(db.Model):
    __tablename__ = "configuracion_fidelizacion"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    activa = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    puntos_por_bs = db.Column(
        db.Numeric(6, 2),
        default=1,
        nullable=False
    )

    @classmethod
    def obtener(cls):
        configuracion = cls.query.first()

        if configuracion is None:
            configuracion = cls(activa=True, puntos_por_bs=1)
            db.session.add(configuracion)
            db.session.commit()

        return configuracion


class Venta(db.Model):
    __tablename__ = "ventas"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False
    )

    cliente_id = db.Column(
        db.Integer,
        db.ForeignKey("clientes.id"),
        nullable=True
    )

    metodo_pago_id = db.Column(
        db.Integer,
        db.ForeignKey("metodos_pago.id"),
        nullable=False
    )

    total = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    ganancia = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    fecha = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    usuario = db.relationship("Usuario")
    cliente = db.relationship("Cliente")
    metodo_pago = db.relationship("MetodoPago")

    detalles = db.relationship(
        "VentaDetalle",
        backref="venta",
        order_by="VentaDetalle.id",
    )


class VentaDetalle(db.Model):
    __tablename__ = "venta_detalles"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    venta_id = db.Column(
        db.Integer,
        db.ForeignKey("ventas.id"),
        nullable=False
    )

    producto_id = db.Column(
        db.Integer,
        db.ForeignKey("productos.id"),
        nullable=False
    )

    cantidad = db.Column(
        db.Integer,
        nullable=False
    )

    # Precios "congelados" al momento de la venta: si el producto
    # cambia de precio después, el histórico de esta venta no se altera.
    precio_unitario_venta = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    precio_unitario_compra = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    subtotal = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    producto = db.relationship("Producto")