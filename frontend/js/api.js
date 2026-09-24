const API_BASE = "/api";


// ======================================================
// PETICIONES A LA API
// ======================================================

async function apiFetch(ruta, opciones = {}) {

  const config = {
    method: opciones.method || "GET",
    credentials: "same-origin",
    headers: {},
  };


  // ==================================================
  // FORMULARIO CON ARCHIVOS
  // ==================================================

  if (
    opciones.body instanceof FormData
  ) {

    config.body = opciones.body;

    // IMPORTANTE:
    // No ponemos Content-Type manualmente.
    // El navegador añade automáticamente:
    //
    // multipart/form-data; boundary=...
    //

  }


  // ==================================================
  // JSON NORMAL
  // ==================================================

  else if (
    opciones.body !== undefined
  ) {

    config.headers[
      "Content-Type"
    ] = "application/json";

    config.body = JSON.stringify(
      opciones.body
    );

  }


  // ==================================================
  // PETICIÓN
  // ==================================================

  const respuesta = await fetch(
    API_BASE + ruta,
    config
  );


  if (respuesta.status === 401) {

    window.location.href =
      "index.html";

    throw new Error(
      "No autenticado"
    );

  }


  const datos = await respuesta
    .json()
    .catch(() => ({}));


  if (respuesta.status === 403 && datos.debe_cambiar_password) {
    if (!window.location.pathname.endsWith("cambiar-password.html")) {
      window.location.href = "cambiar-password.html";
    }
    throw new Error(datos.error || "Debes cambiar tu contraseña");
  }

  if (!respuesta.ok) {

    throw new Error(
      datos.error ||
      "Ocurrió un error inesperado"
    );

  }


  return datos;
}


// ======================================================
// CERRAR SESIÓN
// ======================================================

async function cerrarSesion() {
  try {
    await apiFetch(
      "/auth/logout",
      {
        method: "POST",
      }
    );
  } finally {
    window.location.href = "index.html";
  }
}


// ======================================================
// CARGAR BARRA SUPERIOR
// ======================================================

async function cargarBarraSuperior() {
  const contenedor =
    document.getElementById("usuario-info");

  if (!contenedor) {
    return;
  }

  try {
    const usuario = await apiFetch(
      "/auth/me"
    );

    // --------------------------------------
    // MOSTRAR USUARIO
    // --------------------------------------

    contenedor.innerHTML = `
      <span>
        ${usuario.username}
        (${usuario.rol})
      </span>

      <button
        class="boton-secundario"
        id="boton-cerrar-sesion"
      >
        Salir
      </button>
    `;


    // --------------------------------------
    // BOTÓN CERRAR SESIÓN
    // --------------------------------------

    const botonCerrarSesion =
      document.getElementById(
        "boton-cerrar-sesion"
      );

    if (botonCerrarSesion) {
      botonCerrarSesion.addEventListener(
        "click",
        cerrarSesion
      );
    }


    // --------------------------------------
    // OPCIONES SOLO PARA ADMINISTRADOR
    // --------------------------------------

    if (usuario.rol === "admin") {

      // Usuarios
      const enlaceUsuarios =
        document.getElementById(
          "enlace-usuarios"
        );

      if (enlaceUsuarios) {
        enlaceUsuarios.classList.remove(
          "oculto"
        );
      }


      // Premios
      const enlacePremios =
        document.getElementById(
          "enlace-premios"
        );

      if (enlacePremios) {
        enlacePremios.classList.remove(
          "oculto"
        );
      }
    }

  } catch (error) {
    // apiFetch ya redirige automáticamente
    // a index.html si no hay sesión.
    console.error(
      "Error cargando usuario:",
      error
    );
  }
}


// ======================================================
// INICIAR
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  cargarBarraSuperior
);