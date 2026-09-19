let clienteSeleccionadoId = null;

const inputBusqueda = document.getElementById("texto-busqueda");
const cuerpoResultados = document.getElementById("cuerpo-resultados");
const sinResultados = document.getElementById("sin-resultados");
const panelClienteNuevo = document.getElementById("panel-cliente-nuevo");
const panelClienteDetalle = document.getElementById("panel-cliente-detalle");

function formatearFecha(iso) {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-BO", { dateStyle: "short", timeStyle: "short" });
}

async function buscarClientes() {
  const texto = inputBusqueda.value.trim();
  const clientes = await apiFetch(`/fidelizacion/clientes?q=${encodeURIComponent(texto)}`);

  cuerpoResultados.innerHTML = "";
  panelClienteNuevo.classList.add("oculto");

  if (clientes.length === 0) {
    sinResultados.classList.remove("oculto");
    if (texto) {
      document.getElementById("nuevo-nombre").value = texto;
      panelClienteNuevo.classList.remove("oculto");
    }
    return;
  }

  sinResultados.classList.add("oculto");

  clientes.forEach((cliente) => {
    const fila = document.createElement("tr");
    fila.className = "fila-clickeable";
    fila.innerHTML = `
      <td>${cliente.nombre}</td>
      <td>${cliente.apellido || ""}</td>
      <td>${cliente.telefono || ""}</td>
      <td>${cliente.puntos}</td>
    `;
    fila.addEventListener("click", () => mostrarDetalleCliente(cliente.id));
    cuerpoResultados.appendChild(fila);
  });
}

async function mostrarDetalleCliente(clienteId) {
  const cliente = await apiFetch(`/fidelizacion/clientes/${clienteId}`);
  clienteSeleccionadoId = cliente.id;

  document.getElementById("detalle-nombre").textContent = `${cliente.nombre} ${cliente.apellido || ""}`.trim();
  document.getElementById("detalle-telefono").textContent = cliente.telefono || "";
  document.getElementById("detalle-puntos").textContent = cliente.puntos;

  document.getElementById("monto-compra").value = "";
  document.getElementById("nota-canje").value = "";
  document.getElementById("error-sumar").textContent = "";
  document.getElementById("exito-sumar").textContent = "";
  document.getElementById("error-canjear").textContent = "";
  document.getElementById("exito-canjear").textContent = "";

  const cuerpoHistorial = document.getElementById("cuerpo-historial");
  cuerpoHistorial.innerHTML = "";
  cliente.historial.forEach((mov) => {
    const fila = document.createElement("tr");
    const detalle = mov.tipo === "acumulado"
      ? `Compra de Bs ${mov.monto_compra}`
      : (mov.nota || "");
    fila.innerHTML = `
      <td>${formatearFecha(mov.fecha)}</td>
      <td>${mov.tipo === "acumulado" ? "Sumó" : "Canjeó"}</td>
      <td>${mov.puntos > 0 ? "+" : ""}${mov.puntos}</td>
      <td>${detalle}</td>
      <td>${mov.usuario || ""}</td>
    `;
    cuerpoHistorial.appendChild(fila);
  });

  panelClienteDetalle.classList.remove("oculto");
  panelClienteDetalle.scrollIntoView({ behavior: "smooth" });
}

document.getElementById("boton-buscar").addEventListener("click", buscarClientes);
inputBusqueda.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    buscarClientes();
  }
});

document.getElementById("boton-crear-cliente").addEventListener("click", async () => {
  const nombre = document.getElementById("nuevo-nombre").value.trim();
  const apellido = document.getElementById("nuevo-apellido").value.trim();
  const telefono = document.getElementById("nuevo-telefono").value.trim();
  const elementoError = document.getElementById("error-crear-cliente");
  elementoError.textContent = "";

  try {
    const cliente = await apiFetch("/fidelizacion/clientes", {
      method: "POST",
      body: { nombre, apellido, telefono },
    });
    panelClienteNuevo.classList.add("oculto");
    inputBusqueda.value = "";
    await mostrarDetalleCliente(cliente.id);
  } catch (error) {
    elementoError.textContent = error.message;
  }
});

document.getElementById("boton-sumar").addEventListener("click", async () => {
  const monto = document.getElementById("monto-compra").value;
  const elementoError = document.getElementById("error-sumar");
  const elementoExito = document.getElementById("exito-sumar");
  elementoError.textContent = "";
  elementoExito.textContent = "";

  try {
    const cliente = await apiFetch(`/fidelizacion/clientes/${clienteSeleccionadoId}/sumar`, {
      method: "POST",
      body: { monto_compra: monto },
    });
    document.getElementById("detalle-puntos").textContent = cliente.puntos;
    document.getElementById("monto-compra").value = "";
    elementoExito.textContent = "Puntos sumados correctamente.";
    await mostrarDetalleCliente(cliente.id);
  } catch (error) {
    elementoError.textContent = error.message;
  }
});

document.getElementById("boton-canjear").addEventListener("click", async () => {
  const nota = document.getElementById("nota-canje").value.trim();
  const elementoError = document.getElementById("error-canjear");
  const elementoExito = document.getElementById("exito-canjear");
  elementoError.textContent = "";
  elementoExito.textContent = "";

  if (!confirm("¿Confirmas que el cliente reclamó su premio y se reinician sus puntos a cero?")) {
    return;
  }

  try {
    const cliente = await apiFetch(`/fidelizacion/clientes/${clienteSeleccionadoId}/canjear`, {
      method: "POST",
      body: { nota },
    });
    document.getElementById("detalle-puntos").textContent = cliente.puntos;
    document.getElementById("nota-canje").value = "";
    elementoExito.textContent = "Puntos canjeados y reiniciados a cero.";
    await mostrarDetalleCliente(cliente.id);
  } catch (error) {
    elementoError.textContent = error.message;
  }
});
