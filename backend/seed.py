"""Crea la base de datos (si no existe) y el usuario administrador inicial."""

from app import create_app
from app.extensions import db
from app.models import Usuario

app = create_app()

with app.app_context():
    if Usuario.query.filter_by(username="admin").first() is None:
        admin = Usuario(username="admin", rol="admin")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print("Usuario admin creado -> usuario: admin / clave: admin123")
        print("Cambia esta clave apenas entres al sistema.")
    else:
        print("El usuario admin ya existe, no se creó ninguno nuevo.")
