from pathlib import Path

from flask import Flask, send_from_directory
from sqlalchemy import text

from .extensions import db, login_manager
from .models import Usuario


FRONTEND_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "frontend"
)

DB_PATH = (
    Path(__file__).resolve().parent.parent
    / "farmacia.db"
)


UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
PREMIOS_UPLOAD_DIR = UPLOADS_DIR / "premios"


def create_app():
    
    app = Flask(
        __name__,
        static_folder=None
    )

    app.config[
        "SQLALCHEMY_DATABASE_URI"
    ] = f"sqlite:///{DB_PATH}"

    app.config[
        "SECRET_KEY"
    ] = "cambiar-esta-clave-en-produccion"

    # Máximo permitido para una subida:
    # 5 MB
    app.config[
        "MAX_CONTENT_LENGTH"
    ] = 5 * 1024 * 1024

    # ==================================================
    # EXTENSIONES
    # ==================================================

    PREMIOS_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
    )

    app.config["PREMIOS_UPLOAD_DIR"] = str(PREMIOS_UPLOAD_DIR)

    
    db.init_app(app)
    login_manager.init_app(app)


    # ==================================================
    # FLASK LOGIN
    # ==================================================

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(
            Usuario,
            int(user_id)
        )


    @login_manager.unauthorized_handler
    def no_autenticado():
        return {
            "error": "Necesitas iniciar sesión"
        }, 401


    # ==================================================
    # BLUEPRINTS
    # ==================================================

    from .auth.routes import auth_bp
    from .fidelizacion.routes import fidelizacion_bp

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    app.register_blueprint(
        fidelizacion_bp,
        url_prefix="/api/fidelizacion"
    )


    # ==================================================
    # FRONTEND
    # ==================================================

    @app.route("/")
    def index():
        return send_from_directory(
            FRONTEND_DIR,
            "index.html"
        )

    @app.route("/uploads/premios/<path:filename>")
    def premio_imagen(filename):
        return send_from_directory(
        PREMIOS_UPLOAD_DIR,
        filename
    )

    @app.route("/<path:filename>")
    def frontend_files(filename):
        return send_from_directory(
            FRONTEND_DIR,
            filename
        )


    # ==================================================
    # BASE DE DATOS
    # ==================================================

    with app.app_context():

        # Crear todas las tablas que no existan
        db.create_all()


        # ----------------------------------------------
        # CREAR ADMIN INICIAL
        # ----------------------------------------------

        admin = Usuario.query.filter_by(
            username="admin"
        ).first()

        if not admin:

            admin = Usuario(
                username="admin",
                rol="admin",
                activo=True
            )

            admin.set_password(
                "admin123"
            )

            db.session.add(admin)
            db.session.commit()

            print(
                "Usuario administrador inicial creado."
            )


        # ----------------------------------------------
        # SQLITE WAL
        # ----------------------------------------------

        with db.engine.connect() as conexion:
            conexion.execute(
                text(
                    "PRAGMA journal_mode=WAL"
                )
            )

            conexion.commit()


    return app