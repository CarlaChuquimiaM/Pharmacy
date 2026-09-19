# Sistema de Farmacia — Fase 1 (ahora) y Fase 2 (post-lanzamiento)

## Contexto

El archivo actual (`interfaz_farmacia_backup.py`) es un script Tkinter + SQLite de un solo archivo, hecho por alguien sin experiencia: tiene una función duplicada (`agregar_producto` se sobreescribe a sí misma perdiendo el campo de vencimiento), `except:` desnudos que ocultan errores, y — el problema de fondo — SQLite como archivo local no sirve para el requisito real: **varias PCs de la misma farmacia deben compartir el mismo inventario, ventas y clientes en tiempo real por la red local**.

El proyecto es para un cliente real ("el jefe") con lanzamiento el **1 de octubre de 2026** (quedan ~13 días desde hoy, 18 de septiembre). El alcance completo pedido por el cliente es grande. Se acordó dividirlo en dos fases; este documento las cubre ambas, pero **solo se implementa la Fase 1 ahora**.

El sistema se reconstruye desde cero (no se reutiliza el script Tkinter, salvo como referencia de reglas de negocio ya validadas: stock bajo, vencimiento ≤30 días, etc.), con **backend y frontend completamente separados** en dos carpetas independientes — el backend no genera HTML, solo expone una API; el frontend es HTML/CSS/JS plano que consume esa API.

## Arquitectura

- **Un único proceso servidor Flask, corriendo en una PC Windows de la farmacia**, accesible por las demás PCs vía navegador a `http://<ip-del-servidor>:8000`. No requiere instalar nada en las PCs secundarias, solo en la que hace de servidor.
- **Backend = API JSON pura** (`backend/`): Flask + Flask-SQLAlchemy + Flask-Login. Ninguna ruta del backend devuelve HTML; todas devuelven JSON (`/api/...`). Esto es lo que pediste al separar la lógica: el backend no sabe nada de cómo se ve la pantalla, solo de datos y reglas de negocio.
- **Frontend = HTML/CSS/JS plano** (`frontend/`): páginas estáticas que llaman a la API con `fetch()`. Sin frameworks ni paso de build (npm), para no arriesgar el plazo del 1 de octubre y porque nadie en el equipo tiene experiencia en frameworks de JS.
- **Un solo puerto, mismo origen**: Flask sirve los archivos estáticos de `frontend/` además de la API, así el navegador no tiene problemas de CORS y solo hay que abrir un puerto en Windows. El login usa cookies de sesión (Flask-Login) porque frontend y backend comparten origen — no hace falta manejar tokens JWT, que complicaría el frontend plano sin aportar nada aquí.
- **Base de datos: SQLite en modo WAL** (Write-Ahead Logging), que soporta lectores/escritor concurrentes razonablemente bien para el volumen de una sola farmacia. No se justifica Postgres para una sola sucursal.
- **Servidor de aplicación: `waitress`** (WSGI puro Python, estable en Windows) en vez del servidor de desarrollo de Flask.
- **Lenguajes**: Python (backend) y HTML/CSS/JavaScript (frontend) — es la combinación estándar para este tipo de sistema y sí sirve perfectamente para lo que se pide; no hace falta ningún otro lenguaje.
- **Autenticación:** `werkzeug.security` para hash de contraseñas. Dos roles: `admin` (gestiona usuarios cajeros, además de todo lo demás) y `cajero` (opera inventario/ventas/clientes, sin gestión de usuarios).

## Estructura de carpetas

```
farmacia/
  backend/
    app/
      __init__.py          # create_app(): registra blueprints de API + sirve frontend/ como estático
      extensions.py        # db = SQLAlchemy(), login_manager = LoginManager()
      models.py            # todos los modelos + AuditMixin
      auth/routes.py        # /api/auth/... login, logout, gestión de usuarios (solo admin)
      productos/routes.py   # /api/productos/... CRUD, alertas, import Excel
      ventas/routes.py      # /api/ventas/... carrito, cobro, ganancia del día
      clientes/routes.py    # /api/clientes/... CRUD, historial
      fidelizacion/routes.py# /api/fidelizacion/... activar/desactivar, premios, canje
      reportes/routes.py    # /api/reportes/... dashboard
    seed.py                 # crea las tablas y el primer usuario admin
    requirements.txt
    run.py                  # arranca waitress en 0.0.0.0:8000
  frontend/
    index.html               # login
    productos.html
    ventas.html
    clientes.html
    fidelizacion.html
    reportes.html
    css/estilo.css
    js/
      api.js                 # wrapper de fetch() con manejo de sesión/errores, usado por todas las páginas
      productos.js
      ventas.js
      clientes.js
      fidelizacion.js
      reportes.js
  README.md                  # cómo iniciar el servidor y conectarse desde otras PCs
  instalar_y_arrancar.bat    # doble clic en Windows: crea venv, instala deps, corre run.py
```

## Modelo de datos (SQLAlchemy) — Fase 1

Todas las tablas con campos de auditoría (`creado_por_id`, `creado_en`, `modificado_por_id`, `modificado_en`, `activo`) vía un mixin común `AuditMixin`.

- **Usuario**: username, password_hash, rol (admin/cajero), + auditoría.
- **Producto**: codigo, nombre, marca, precio_compra, porcentaje_ganancia, precio_venta (calculado: `precio_compra * (1 + porcentaje_ganancia/100)`), stock, stock_minimo, vencimiento, foto_path (nullable, campo listo para fase 2 pero sin usar en fase 1) + auditoría.
- **Cliente**: nombre, telefono/CI, + auditoría. Historial de compras vía relación con Venta.
- **MetodoPago**: nombre (ej. Efectivo, Tarjeta, Transferencia) — tabla administrable en vez de lista fija en código, porque el usuario indicó que los métodos "los tendrán ellos por detrás".
- **Venta**: usuario_id (cajero), cliente_id (nullable), metodo_pago_id, total, ganancia (calculada), fecha.
- **VentaDetalle**: venta_id, producto_id, cantidad, precio_unitario_venta, precio_unitario_compra (snapshot al momento de la venta), subtotal.
- **ConfiguracionFidelizacion**: activa (bool), puntos_por_bs (default 1) — un solo registro de configuración.
- **MovimientoPuntos**: cliente_id, venta_id (nullable si es canje), puntos (positivo=acumulado, negativo=canjeado), tipo, fecha.
- **Premio**: nombre, puntos_requeridos, activo.
- **Canje**: cliente_id, premio_id, usuario_id, puntos_usados, fecha.

## Reglas de negocio clave — Fase 1

- **Stock bajo**: alerta cuando `stock <= stock_minimo` (configurable por producto, no fijo en 10 como en el script viejo).
- **Vencimiento**: mismo criterio ya validado (vencido si `dias < 0`, por vencer si `dias <= 30`).
- **Ganancia por venta**: `(precio_venta - precio_compra) * cantidad` por línea, usando el snapshot guardado en `VentaDetalle`, no el precio actual del producto.
- **Puntos de fidelización**: si `ConfiguracionFidelizacion.activa` y la venta tiene cliente asociado, acumular `floor(total * puntos_por_bs)` puntos al confirmar la venta. Si no está activa, el cliente igual se registra y guarda historial de compras, solo sin puntos.
- **Canje de premio**: verificar puntos suficientes antes de canjear; descontar puntos y registrar `Canje` + `MovimientoPuntos` negativo en la misma transacción.
- **Importación de Excel**: reutiliza la lógica de mapeo de columnas del script viejo (`openpyxl`) como punto de partida; actualiza por código si ya existe o inserta si es nuevo. El Excel real de la farmacia aún no fue entregado, así que el mapeo de columnas queda en un solo lugar, fácil de ajustar cuando llegue el archivo.
- **Auditoría**: cada creación/edición de Producto, Cliente, Usuario y Premio registra qué usuario logueado la hizo y cuándo, y permite marcar `activo=False` en vez de borrar físicamente.

## Fase 2 — post-lanzamiento (documentado ahora, no se implementa todavía)

Se construye sobre la misma base de Fase 1 sin rehacer arquitectura:

- **Sorteos**: nueva tabla `Sorteo` (premios grandes, requisito de puntos — el jefe mencionó 3.000–4.000 como ejemplo, **pendiente de definir el valor exacto**) y `ParticipacionSorteo` (cliente, sorteo, fecha). Al alcanzar el umbral de puntos, el cliente entra a la lista de participantes; el sorteo en sí (elegir ganador) puede ser manual por el admin o con un botón de "sortear" aleatorio — a definir con el cliente.
- **Cupones**: reglas de negocio aún no definidas por el cliente (¿por monto fijo? ¿por producto? ¿vencen?) — se necesita una reunión de definición antes de diseñar la tabla `Cupon`.
- **Fotos de producto**: el campo `foto_path` ya existe desde fase 1; falta el endpoint de subida de imagen en el backend (`/api/productos/<id>/foto`) y el `<input type="file">` en el frontend.
- **Identidad de marca en el frontend**: reemplazar `css/estilo.css` con los colores/logo del manual de identidad que entregará el cliente. Como frontend y backend ya están separados, este cambio no toca el backend en absoluto.
- **Facturación electrónica**: fuera de alcance por ahora, el cliente indicó que no se contempla en la primera versión por su complejidad.
- **Plataforma web pública**: posible migración futura de "solo LAN" a acceso por internet — requeriría hosting, HTTPS y revisar el modelo de autenticación (hoy basado en cookies de sesión, que sigue sirviendo pero necesitaría configurarse con dominio propio).

## Verificación (Fase 1)

1. `seed.py` crea la base y un usuario admin inicial; login funciona con ese usuario.
2. Como admin: crear un cajero, inhabilitarlo, confirmar que no puede loguearse inhabilitado.
3. Como cajero: crear producto con precio de compra + % ganancia, confirmar que el precio de venta se calcula bien; bajar el stock_minimo y confirmar que aparece en alertas.
4. Importar un Excel de prueba (mismo formato que el script viejo) y confirmar altas/actualizaciones.
5. Hacer una venta con cliente asociado, fidelización activa: confirmar puntos acumulados correctos y que la ganancia del día se actualiza.
6. Desactivar fidelización, repetir venta: cliente se registra en historial pero sin puntos.
7. Canjear un premio con puntos suficientes y con puntos insuficientes (debe rechazar el segundo caso).
8. Arrancar el servidor (`run.py` vía waitress) y confirmar acceso desde otra PC de la misma red usando la IP local del servidor, cargando el frontend y operando contra la API.
