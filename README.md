# Sistema de Farmacia — Fidelización (entrega urgente)

Primera parte funcionando del sistema completo (ver `/home/carlita/.claude/plans/happy-scribbling-ladybug.md` para el plan de las fases 1 y 2). Por ahora incluye:

- Login con usuarios y roles (administrador / cajero)
- Gestión de usuarios (solo el administrador puede crear/inhabilitar cajeros)
- Registro de clientes
- Acumulación de puntos por compra (1 Bs = 1 punto, se ingresa el monto manualmente)
- Consulta de puntos por cliente
- Canje de premio: reinicia los puntos a cero y guarda una nota de qué se entregó

Funciona en red: una PC hace de servidor, las demás PCs de la farmacia lo usan desde el navegador.

## Instalación (en la PC que hará de servidor)

1. Instalar [Python](https://www.python.org/downloads/) (marcar la casilla "Add Python to PATH" durante la instalación).
2. Hacer doble clic en `instalar_y_arrancar.bat`.
   - La primera vez instala todo lo necesario y crea la base de datos.
   - Al terminar, deja el sistema corriendo y muestra dos direcciones:
     - `http://localhost:8000` — para usar en esa misma PC.
     - `http://<IP>:8000` — para usar desde las demás PCs de la farmacia (misma red Wi-Fi/cable).
3. Dejar esa ventana abierta mientras se use el sistema. Cerrarla apaga el servidor.

## Primer ingreso

- Usuario: `admin`
- Contraseña: `admin123`

Entrar como admin, ir a "Usuarios" y crear un usuario por cada cajero. Se recomienda luego cambiar la contraseña del admin (por ahora se cambia creando el usuario admin de nuevo con otra clave desde esa misma pantalla, o pidiendo el cambio para la próxima entrega).

## Uso desde las otras PCs

En cualquier PC de la misma red, abrir el navegador e ingresar a `http://<IP-del-servidor>:8000`. No hace falta instalar nada en esas PCs.

## Próximos pasos (fase 1 completa y fase 2)

Ver el plan completo en `/home/carlita/.claude/plans/happy-scribbling-ladybug.md`: inventario, ventas, catálogo de premios con puntos requeridos, sorteos, cupones, fotos de producto e identidad de marca.
