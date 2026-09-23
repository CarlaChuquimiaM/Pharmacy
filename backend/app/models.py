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