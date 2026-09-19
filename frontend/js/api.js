const API_BASE = "/api";

async function apiFetch(ruta, opciones = {}) {
  const config = {
    method: opciones.method || "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
  };

  if (opciones.body !== undefined) {
    config.body = JSON.stringify(opciones.body);
  }

  const respuesta = await fetch(API_BASE + ruta, config);

  if (respuesta.status === 401) {
    window.location.href = "index.html";
    throw new Error("No autenticado");
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.error || "Ocurrió un error inesperado");
  }

  return datos;
}

async function cerrarSesion() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "index.html";
  }
}

async function cargarBarraSuperior() {
  const contenedor = document.getElementById("usuario-info");
  if (!contenedor) return;

  try {
    const usuario = await apiFetch("/auth/me");
    contenedor.innerHTML = `
      <span>${usuario.username} (${usuario.rol})</span>
      <button class="boton-secundario" id="boton-cerrar-sesion">Salir</button>
    `;
    document.getElementById("boton-cerrar-sesion").addEventListener("click", cerrarSesion);

    if (usuario.rol === "admin") {
      const enlaceUsuarios = document.getElementById("enlace-usuarios");
      if (enlaceUsuarios) enlaceUsuarios.classList.remove("oculto");
    }
  } catch (e) {
    // apiFetch ya redirige a index.html si no hay sesión
  }
}

document.addEventListener("DOMContentLoaded", cargarBarraSuperior);
