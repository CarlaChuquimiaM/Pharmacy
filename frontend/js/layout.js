// ======================================================
// SIDEBAR — navegación compartida por todas las páginas
// internas (cubre módulos de Fase 1 y Fase 2 del plan)
// ======================================================

const MODULOS_SIDEBAR = [
  {
    grupo: "Fase 1",
    items: [
      { pagina: "fidelizacion", href: "fidelizacion.html", icono: "img/usuario.svg", texto: "Fidelización" },
      { pagina: "productos", href: "productos.html", icono: "📦", texto: "Productos" },
      { pagina: "ventas", href: "ventas.html", icono: "🧾", texto: "Ventas" },
      { pagina: "clientes", href: "clientes.html", icono: "🧑‍🤝‍🧑", texto: "Clientes" },
      { pagina: "premios", href: "premios.html", icono: "img/regalo.svg", texto: "Premios", soloAdmin: true },
      { pagina: "usuarios", href: "usuarios.html", icono: "img/grupo.svg", texto: "Usuarios", soloAdmin: true },
      { pagina: "reportes", href: "reportes.html", icono: "📊", texto: "Reportes" },
    ],
  },
  {
    grupo: "Fase 2",
    items: [
      { pagina: "sorteos", texto: "Sorteos", icono: "🎟️", bloqueado: true },
      { pagina: "cupones", texto: "Cupones", icono: "🏷️", bloqueado: true },
    ],
  },
];


function iconoSidebar(icono) {
  if (icono && icono.startsWith("img/")) {
    return `<span class="menu-icono"><img src="${icono}" alt=""></span>`;
  }
  return `<span class="menu-icono">${icono || ""}</span>`;
}


function itemSidebarHtml(item, paginaActiva) {
  const activo = item.pagina === paginaActiva ? "sidebar-activo" : "";
  const ocultoAdmin = item.soloAdmin ? "oculto" : "";

  if (item.bloqueado) {
    return `
      <a href="#" class="sidebar-link sidebar-bloqueado" title="Todavía no disponible">
        ${iconoSidebar(item.icono)}
        ${item.texto}
        <span class="sidebar-badge">Próximamente</span>
      </a>
    `;
  }

  return `
    <a
      href="${item.href}"
      class="sidebar-link ${activo} ${ocultoAdmin}"
      id="enlace-${item.pagina}"
    >
      ${iconoSidebar(item.icono)}
      ${item.texto}
    </a>
  `;
}


function sidebarHtml(paginaActiva) {
  const grupos = MODULOS_SIDEBAR.map((grupo) => `
    <div class="sidebar-grupo">
      <div class="sidebar-grupo-titulo">${grupo.grupo}</div>
      ${grupo.items.map((item) => itemSidebarHtml(item, paginaActiva)).join("")}
    </div>
  `).join("");

  return `
    <div class="sidebar-marca">
      <img src="img/logo-biofar.png" alt="Farmacia Biofar" class="sidebar-logo">
    </div>

    <nav class="sidebar-nav">
      ${grupos}
    </nav>

    <div class="sidebar-pie" id="usuario-info"></div>
  `;
}


async function cargarSidebar(paginaActiva) {
  const contenedor = document.getElementById("sidebar");

  if (!contenedor) {
    return;
  }

  contenedor.innerHTML = sidebarHtml(paginaActiva);

  const usuarioInfo = document.getElementById("usuario-info");

  try {
    const usuario = await apiFetch("/auth/me");

    usuarioInfo.innerHTML = `
      <span>${usuario.username} (${usuario.rol})</span>
      <button class="boton-secundario" id="boton-cerrar-sesion">Salir</button>
    `;

    document
      .getElementById("boton-cerrar-sesion")
      .addEventListener("click", cerrarSesion);

    if (usuario.rol === "admin") {
      MODULOS_SIDEBAR
        .flatMap((grupo) => grupo.items)
        .filter((item) => item.soloAdmin)
        .forEach((item) => {
          const enlace = document.getElementById(`enlace-${item.pagina}`);
          if (enlace) {
            enlace.classList.remove("oculto");
          }
        });
    }

  } catch (error) {
    // apiFetch ya redirige a index.html si no hay sesión.
    console.error("Error cargando sidebar:", error);
  }
}
