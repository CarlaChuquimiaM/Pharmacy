from pathlib import Path

from flask import Flask, send_from_directory
from sqlalchemy import text

from .extensions import db, login_manager
from .models import Usuario

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
DB_PATH = Path(__file__).resolve().parent.parent / "farmacia.db"


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
    app.config["SECRET_KEY"] = "cambiar-esta-clave-en-produccion"

    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(Usuario, int(user_id))

    @login_manager.unauthorized_handler
    def no_autenticado():
        return {"error": "Necesitas iniciar sesión"}, 401

    from .auth.routes import auth_bp
    from .fidelizacion.routes import fidelizacion_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(fidelizacion_bp, url_prefix="/api/fidelizacion")

    @app.route("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/<path:filename>")
    def frontend_files(filename):
        return send_from_directory(FRONTEND_DIR, filename)

    with app.app_context():
        db.create_all()
        with db.engine.connect() as conexion:
            conexion.execute(text("PRAGMA journal_mode=WAL"))
            conexion.commit()

    return app
