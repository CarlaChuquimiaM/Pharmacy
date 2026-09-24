// ======================================================
// UTILIDADES
// ======================================================

function formatearBs(numero) {
  return `Bs ${Number(numero).toFixed(2)}`;
}

function formatearFecha(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function escaparHTML(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ======================================================
// LISTADO / BÚSQUEDA
// ======================================================

async function cargarClientes() {
  const cuerpo = document.getElementById("cuerpo-clientes");
  const texto = document.getElementById("buscar-cliente").value.trim();

  try {
    const ruta = texto
      ? `/fidelizacion/clientes?q=${encodeURIComponent(texto)}`
      : "/fidelizacion/clientes";

    const clientes = await apiFetch(ruta);
    cuerpo.innerHTML = "";

    if (clientes.length === 0) {
      cuerpo.innerHTML = `<tr><td colspan="5">No se encontraron clientes.</td></tr>`;
      return;
    }

    clientes.forEach((cliente) => {
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${escaparHTML(cliente.nombre)} ${escaparHTML(cliente.apellido || "")}</td>
        <td>${escaparHTML(cliente.tipo_documento)} ${escaparHTML(cliente.numero_documento)}</td>
        <td>${escaparHTML(cliente.telefono || "—")}</td>
        <td>${cliente.puntos}</td>
        <td></td>
      `;

      const celdaAcciones = fila.querySelector("td:last-child");
      celdaAcciones.style.display = "flex";
      celdaAcciones.style.gap = "6px";

      const botonEditar = document.createElement("button");
      botonEditar.className = "boton-secundario";
      botonEditar.textContent = "Ver / Editar";
      botonEditar.addEventListener("click", () => abrirEdicionCliente(cliente.id));
      celdaAcciones.appendChild(botonEditar);

      const botonDesactivar = document.createElement("button");
      botonDesactivar.className = "boton-rojo";
      botonDesactivar.textContent = "Desactivar";
      botonDesactivar.addEventListener("click", () => desactivarCliente(cliente));
      celdaAcciones.appendChild(botonDesactivar);

      cuerpo.appendChild(fila);
    });

  } catch (error) {
    cuerpo.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
  }
}


// ======================================================
// CREAR CLIENTE
// ======================================================

async function crearCliente() {
  const errorEl = document.getElementById("error-crear-cliente");
  const exitoEl = document.getElementById("exito-crear-cliente");
  errorEl.textContent = "";
  exitoEl.textContent = "";

  const datos = {
    tipo_documento: document.getElementById("cliente-tipo-documento").value,
    numero_documento: document.getElementById("cliente-numero-documento").value.trim(),
    nombre: document.getElementById("cliente-nombre").value.trim(),
    apellido: document.getElementById("cliente-apellido").value.trim(),
    telefono: document.getElementById("cliente-telefono").value.trim(),
  };

  try {
    await apiFetch("/fidelizacion/clientes", { method: "POST", body: datos });

    exitoEl.textContent = "Cliente registrado correctamente.";
    ["numero-documento", "nombre", "apellido", "telefono"].forEach((campo) => {
      document.getElementById(`cliente-${campo}`).value = "";
    });

    await cargarClientes();
  } catch (error) {
    errorEl.textContent = error.message;
  }
}


// ======================================================
// EDITAR CLIENTE + HISTORIALES
// ======================================================

async function abrirEdicionCliente(clienteId) {
  const panel = document.getElementById("panel-editar-cliente");
  const errorEl = document.getElementById("error-editar-cliente");
  const exitoEl = document.getElementById("exito-editar-cliente");
  errorEl.textContent = "";
  exitoEl.textContent = "";

  try {
    const cliente = await apiFetch(`/fidelizacion/clientes/${clienteId}`);

    document.getElementById("editar-cliente-id").value = cliente.id;
    document.getElementById("editar-cliente-tipo-documento").value = cliente.tipo_documento;
    document.getElementById("editar-cliente-numero-documento").value = cliente.numero_documento;
    document.getElementById("editar-cliente-nombre").value = cliente.nombre;
    document.getElementById("editar-cliente-apellido").value = cliente.apellido || "";
    document.getElementById("editar-cliente-telefono").value = cliente.telefono || "";

    const cuerpoCompras = document.getElementById("cuerpo-compras-cliente");
    cuerpoCompras.innerHTML = cliente.compras.length
      ? cliente.compras.map((compra) => `
          <tr>
            <td>${formatearFecha(compra.fecha)}</td>
            <td>${escaparHTML(compra.metodo_pago || "—")}</td>
            <td>${compra.cantidad_items}</td>
            <td>${formatearBs(compra.total)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4">Sin compras registradas.</td></tr>`;

    const cuerpoPuntos = document.getElementById("cuerpo-puntos-cliente");
    cuerpoPuntos.innerHTML = cliente.historial.length
      ? cliente.historial.map((mov) => `
          <tr>
            <td>${formatearFecha(mov.fecha)}</td>
            <td>${mov.tipo === "acumulado" ? "Acumulado" : "Canjeado"}</td>
            <td>${mov.puntos > 0 ? "+" : ""}${mov.puntos}</td>
            <td>${escaparHTML(mov.nota || "—")}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4">Sin movimientos de puntos.</td></tr>`;

    panel.classList.remove("oculto");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (error) {
    alert(error.message);
  }
}

function cerrarEdicionCliente() {
  document.getElementById("panel-editar-cliente").classList.add("oculto");
}

async function guardarEdicionCliente() {
  const errorEl = document.getElementById("error-editar-cliente");
  const exitoEl = document.getElementById("exito-editar-cliente");
  errorEl.textContent = "";
  exitoEl.textContent = "";

  const id = document.getElementById("editar-cliente-id").value;

  const datos = {
    tipo_documento: document.getElementById("editar-cliente-tipo-documento").value,
    numero_documento: document.getElementById("editar-cliente-numero-documento").value.trim(),
    nombre: document.getElementById("editar-cliente-nombre").value.trim(),
    apellido: document.getElementById("editar-cliente-apellido").value.trim(),
    telefono: document.getElementById("editar-cliente-telefono").value.trim(),
  };

  try {
    await apiFetch(`/fidelizacion/clientes/${id}`, { method: "PUT", body: datos });

    exitoEl.textContent = "Cliente actualizado correctamente.";
    await cargarClientes();
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

async function desactivarCliente(cliente) {
  const confirmar = confirm(`¿Desactivar al cliente "${cliente.nombre} ${cliente.apellido || ""}"?`);
  if (!confirmar) {
    return;
  }

  try {
    await apiFetch(`/fidelizacion/clientes/${cliente.id}`, { method: "DELETE" });
    cerrarEdicionCliente();
    await cargarClientes();
  } catch (error) {
    alert(error.message);
  }
}


// ======================================================
// INICIAR
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("boton-crear-cliente").addEventListener("click", crearCliente);
  document.getElementById("boton-guardar-cliente").addEventListener("click", guardarEdicionCliente);
  document.getElementById("boton-cancelar-editar-cliente").addEventListener("click", cerrarEdicionCliente);

  let temporizadorBusqueda = null;
  document.getElementById("buscar-cliente").addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(cargarClientes, 300);
  });

  cargarClientes();
});
