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


// La carga del sidebar (usuario, logout, visibilidad por rol)
// vive en layout.js — cada página la dispara pasando su propio
// nombre de página activa.