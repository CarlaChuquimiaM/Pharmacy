# Guía para desarrolladores

Este documento es para quien continúe el desarrollo del sistema (no para instalarlo en la farmacia — eso está en `README.md` — ni para el personal que lo usa — eso está en `MANUAL_DE_USO.md`).

## Estado actual

Lo que existe hoy es un **recorte funcional** del sistema completo: solo el módulo de fidelización (clientes + puntos + canje) con login y gestión de usuarios. Es la base real de la Fase 1, no un prototipo descartable — se construye encima de esto, no se reescribe.

El alcance completo (Fase 1 y Fase 2) está documentado en `/home/carlita/.claude/plans/happy-scribbling-ladybug.md`: ahí están las decisiones de arquitectura, el modelo de datos completo (incluye tablas que todavía no existen en código: `Producto`, `Venta`, `VentaDetalle`, `MetodoPago`, `Premio`, y en fase 2 `Sorteo`, `Cupon`), y las reglas de negocio ya acordadas con el cliente. Léelo antes de agregar módulos nuevos.

Existe también `interfaz_farmacia_backup.py` en la raíz del proyecto: es el script viejo en Tkinter que se está reemplazando. Ya no se usa ni se edita, pero sirve como referencia de reglas de negocio ya validadas (ej. criterio de stock bajo, vencimiento ≤30 días) al construir el módulo de inventario.

## Arquitectura

- **Backend y frontend totalmente separados**, por decisión explícita del proyecto (no combinar lógica de servidor con generación de HTML). El backend nunca devuelve HTML, solo JSON bajo `/api/...`.
- **Backend**: Flask + Flask-SQLAlchemy + Flask-Login, sirviendo también los archivos estáticos de `frontend/` (mismo proceso, mismo puerto, para no tener que lidiar con CORS). Ver `backend/app/__init__.py`.
- **Frontend**: HTML + CSS + JavaScript plano, sin build step ni framework. Cada página tiene su propio `.js` en `frontend/js/`. `frontend/js/api.js` es el wrapper de `fetch()` que usan todas las páginas — reusar `apiFetch()`, no llamar a `fetch()` directo.
- **Base de datos**: SQLite en modo WAL (una sola sucursal, sin necesidad de Postgres). El archivo `farmacia.db` se crea en `backend/` y **no** debe subirse a git (agregar a `.gitignore` si se inicializa un repo).
- **Sesión**: cookies vía Flask-Login (no JWT) porque frontend y backend comparten origen.
- **Servidor**: `waitress`, no el servidor de desarrollo de Flask (ver `backend/run.py`).

## Estructura de carpetas

```
backend/
  app/
    __init__.py          # create_app(): registra blueprints, sirve frontend/, crea tablas y activa WAL
    extensions.py        # instancias compartidas: db, login_manager
    models.py            # todos los modelos SQLAlchemy
    auth/routes.py        # blueprint /api/auth — login, logout, /me, gestión de usuarios
    fidelizacion/routes.py# blueprint /api/fidelizacion — clientes y puntos
  seed.py                 # crea las tablas + usuario admin inicial (admin/admin123)
  run.py                  # arranca waitress en 0.0.0.0:8000
frontend/
  index.html              # login
  fidelizacion.html        # pantalla principal de puntos
  usuarios.html             # gestión de usuarios (solo admin)
  css/estilo.css
  js/api.js                # apiFetch() + carga de la barra superior (usuario logueado, logout)
  js/auth.js, fidelizacion.js, usuarios.js
```

## Convenciones a seguir

- **Todo en español**: nombres de modelos, campos, rutas de blueprint, variables JS, mensajes de error que ve el usuario. Es consistente con el resto del código y con quien lo va a mantener después.
- **Auditoría por tabla**: cualquier tabla nueva que el usuario cree/edite desde la interfaz debe llevar `creado_por_id`, `creado_en`, `modificado_por_id`, `modificado_en`, `activo` (inhabilitar, no borrar). Ver cómo están en `Usuario` y `Cliente` en `models.py` — no se armó un mixin porque con dos modelos no valía la pena la abstracción, pero si se agregan 3+ modelos más con este patrón (Producto, Venta, Premio...), sí conviene extraer un `AuditMixin` en ese momento.
- **Snapshots en ventas**: cuando se implemente `VentaDetalle`, el precio de compra y venta se guardan en la fila de la venta (no se recalculan desde `Producto`), para que la ganancia histórica no cambie si después se edita el precio del producto. Ver el modelo de datos en el plan.
- **Blueprints por módulo**: cada área de negocio (productos, ventas, clientes, fidelización, reportes) es un blueprint con su propio `routes.py`, montado bajo `/api/<módulo>`. Seguir el mismo patrón de `auth/` y `fidelizacion/` al agregar `productos/`, `ventas/`, etc.
- **Frontend**: una página `.html` + un `.js` por módulo, sin mezclar lógica de varios módulos en un mismo archivo JS. `apiFetch()` ya maneja sesión expirada (redirige a `index.html` en 401) y errores (lee `{"error": "..."}` del backend) — no reimplementar eso en cada página.

## Autenticación: detalles que hay que respetar al tocar otros módulos

- `Usuario.debe_cambiar_password` (default `True`) fuerza que cualquier usuario nuevo, o cualquiera al que el admin le resetee la clave, tenga que definir una contraseña propia antes de usar el resto del sistema. Esto se aplica con un `before_request` global en `app/__init__.py` (`exigir_cambio_password`) que bloquea cualquier ruta `/api/...` que no esté en `RUTAS_LIBRES_CAMBIO_PASSWORD`. **Si se agrega un blueprint nuevo, no hace falta tocar nada ahí** — el bloqueo ya cubre cualquier ruta bajo `/api/`, solo hay que agregar la ruta a esa lista blanca si en algún momento se necesita otra excepción.
- La sesión expira sola a los 20 minutos de inactividad (`DURACION_SESION` en `app/__init__.py`, más `session.permanent = True` en el login). Es manejo de sesión del lado del servidor vía cookie, no un timer en JavaScript — no hay nada que mantener en el frontend para que esto funcione.
- En el frontend, `apiFetch()` (en `js/api.js`) ya intercepta el 403 con `debe_cambiar_password: true` y redirige sola a `cambiar-password.html`. Cualquier página nueva que use `apiFetch()` hereda este comportamiento automáticamente, no hay que replicarlo.

## Cómo correr en local para desarrollar

```bash
cd backend
python -m venv venv
source venv/bin/activate   # en Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed.py              # crea admin / admin123
python run.py                # http://localhost:8000
```

No hay recarga automática (waitress no la tiene). Para desarrollar con autoreload, se puede correr `flask --app app:create_app run --debug` en vez de `run.py` mientras se itera, y volver a `run.py` para probar como quedaría en producción.

## Pruebas

No hay suite de tests formal todavía. La forma en que se verificó el flujo de fidelización fue con el cliente de pruebas de Flask (`app.test_client()`) ejercitando login, alta de cliente, suma de puntos, canje y expiración de sesión de punta a punta — visto en la sesión de desarrollo, no versionado. Si se agrega `pytest`, ese es un buen punto de partida para el primer archivo de tests (`tests/test_fidelizacion.py`).

## Próximo trabajo

Seguir el orden del plan (`happy-scribbling-ladybug.md`): productos/inventario (con import de Excel — el cliente aún no entregó el archivo real, el mapeo de columnas del script viejo es el punto de partida) y ventas son lo que falta para cerrar la Fase 1. Los puntos por venta ya no se sumarían manualmente como ahora, sino automáticamente al confirmar una venta con cliente asociado — eso implica ajustar `fidelizacion/routes.py` para que la suma de puntos también pueda dispararse desde el módulo de ventas, no solo desde su propio endpoint.
