// ======================================================
// ESTADO
// ======================================================

let carrito = []; // [{producto_id, nombre, precio_venta, stock, cantidad}]
let clienteSeleccionado = null; // {id, nombre, apellido}


// ======================================================
// UTILIDADES
// ======================================================

function formatearBs(numero) {
  return `Bs ${Number(numero).toFixed(2)}`;
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
// BÚSQUEDA DE PRODUCTOS
// ======================================================

async function buscarProductosVenta() {
  const texto = document.getElementById("buscar-producto-venta").value.trim();
  const contenedor = document.getElementById("resultados-producto-venta");
  const errorEl = document.getElementById("error-agregar-producto");

  errorEl.textContent = "";

  if (!texto) {
    contenedor.classList.add("oculto");
    contenedor.innerHTML = "";
    return;
  }

  try {
    const productos = await apiFetch(`/productos?q=${encodeURIComponent(texto)}`);

    if (productos.length === 0) {
      contenedor.innerHTML = `<div class="lista-resultados"><div class="item-resultado item-resultado-deshabilitado">Sin resultados.</div></div>`;
      contenedor.classList.remove("oculto");
      return;
    }

    contenedor.innerHTML = `
      <div class="lista-resultados">
        ${productos.map((producto) => `
          <div class="item-resultado" data-id="${producto.id}">
            <span>${escaparHTML(producto.nombre)} <span class="item-resultado-secundario">(${escaparHTML(producto.codigo)})</span></span>
            <span class="item-resultado-secundario">${formatearBs(producto.precio_venta)} · stock ${producto.stock}</span>
          </div>
        `).join("")}
      </div>
    `;
    contenedor.classList.remove("oculto");

    contenedor.querySelectorAll(".item-resultado[data-id]").forEach((el) => {
      const producto = productos.find((p) => String(p.id) === el.dataset.id);
      el.addEventListener("click", () => agregarAlCarrito(producto));
    });

  } catch (error) {
    errorEl.textContent = error.message;
  }
}

function agregarAlCarrito(producto) {
  const errorEl = document.getElementById("error-agregar-producto");
  errorEl.textContent = "";

  if (producto.stock <= 0) {
    errorEl.textContent = `"${producto.nombre}" no tiene stock disponible.`;
    return;
  }

  const existente = carrito.find((linea) => linea.producto_id === producto.id);

  if (existente) {
    if (existente.cantidad + 1 > producto.stock) {
      errorEl.textContent = `No hay más stock disponible de "${producto.nombre}".`;
      return;
    }
    existente.cantidad += 1;
  } else {
    carrito.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio_venta: producto.precio_venta,
      stock: producto.stock,
      cantidad: 1,
    });
  }

  document.getElementById("buscar-producto-venta").value = "";
  document.getElementById("resultados-producto-venta").classList.add("oculto");
  document.getElementById("resultados-producto-venta").innerHTML = "";

  renderizarCarrito();
}


// ======================================================
// CARRITO
// ======================================================

function cambiarCantidad(productoId, delta) {
  const linea = carrito.find((l) => l.producto_id === productoId);
  if (!linea) return;

  const nuevaCantidad = linea.cantidad + delta;

  if (nuevaCantidad <= 0) {
    carrito = carrito.filter((l) => l.producto_id !== productoId);
  } else if (nuevaCantidad > linea.stock) {
    document.getElementById("error-agregar-producto").textContent =
      `No hay más stock disponible de "${linea.nombre}".`;
    return;
  } else {
    linea.cantidad = nuevaCantidad;
  }

  renderizarCarrito();
}

function quitarDelCarrito(productoId) {
  carrito = carrito.filter((l) => l.producto_id !== productoId);
  renderizarCarrito();
}

function renderizarCarrito() {
  const cuerpo = document.getElementById("cuerpo-carrito");

  if (carrito.length === 0) {
    cuerpo.innerHTML = `<tr><td colspan="5">El carrito está vacío.</td></tr>`;
  } else {
    cuerpo.innerHTML = carrito.map((linea) => `
      <tr>
        <td>${escaparHTML(linea.nombre)}</td>
        <td>
          <button type="button" class="boton-secundario" data-accion="restar" data-id="${linea.producto_id}" style="min-height:30px; padding:4px 10px;">−</button>
          ${linea.cantidad}
          <button type="button" class="boton-secundario" data-accion="sumar" data-id="${linea.producto_id}" style="min-height:30px; padding:4px 10px;">+</button>
        </td>
        <td>${formatearBs(linea.precio_venta)}</td>
        <td>${formatearBs(linea.precio_venta * linea.cantidad)}</td>
        <td><button type="button" class="boton-rojo" data-accion="quitar" data-id="${linea.producto_id}">Quitar</button></td>
      </tr>
    `).join("");

    cuerpo.querySelectorAll("button[data-accion]").forEach((boton) => {
      const productoId = parseInt(boton.dataset.id, 10);
      boton.addEventListener("click", () => {
        if (boton.dataset.accion === "sumar") cambiarCantidad(productoId, 1);
        else if (boton.dataset.accion === "restar") cambiarCantidad(productoId, -1);
        else quitarDelCarrito(productoId);
      });
    });
  }

  const total = carrito.reduce((suma, l) => suma + l.precio_venta * l.cantidad, 0);
  document.getElementById("total-carrito").textContent = formatearBs(total);
}


// ======================================================
// BÚSQUEDA DE CLIENTE
// ======================================================

async function buscarClientesVenta() {
  const texto = document.getElementById("buscar-cliente-venta").value.trim();
  const contenedor = document.getElementById("resultados-cliente-venta");

  if (!texto) {
    contenedor.classList.add("oculto");
    contenedor.innerHTML = "";
    return;
  }

  try {
    const clientes = await apiFetch(`/fidelizacion/clientes?q=${encodeURIComponent(texto)}`);

    if (clientes.length === 0) {
      contenedor.innerHTML = `<div class="lista-resultados"><div class="item-resultado item-resultado-deshabilitado">Sin resultados.</div></div>`;
      contenedor.classList.remove("oculto");
      return;
    }

    contenedor.innerHTML = `
      <div class="lista-resultados">
        ${clientes.map((cliente) => `
          <div class="item-resultado" data-id="${cliente.id}">
            <span>${escaparHTML(cliente.nombre)} ${escaparHTML(cliente.apellido || "")}</span>
            <span class="item-resultado-secundario">${escaparHTML(cliente.tipo_documento)} ${escaparHTML(cliente.numero_documento)}</span>
          </div>
        `).join("")}
      </div>
    `;
    contenedor.classList.remove("oculto");

    contenedor.querySelectorAll(".item-resultado[data-id]").forEach((el) => {
      const cliente = clientes.find((c) => String(c.id) === el.dataset.id);
      el.addEventListener("click", () => seleccionarCliente(cliente));
    });

  } catch (error) {
    console.error("Error buscando clientes:", error);
  }
}

function seleccionarCliente(cliente) {
  clienteSeleccionado = cliente;

  document.getElementById("buscar-cliente-venta").value = "";
  document.getElementById("resultados-cliente-venta").classList.add("oculto");
  document.getElementById("resultados-cliente-venta").innerHTML = "";

  const chip = document.getElementById("cliente-seleccionado-venta");
  chip.innerHTML = `
    <span>${escaparHTML(cliente.nombre)} ${escaparHTML(cliente.apellido || "")} — ${cliente.puntos} pts</span>
    <button type="button" id="boton-quitar-cliente">×</button>
  `;
  chip.classList.remove("oculto");

  document.getElementById("boton-quitar-cliente").addEventListener("click", quitarClienteSeleccionado);
}

function quitarClienteSeleccionado() {
  clienteSeleccionado = null;
  const chip = document.getElementById("cliente-seleccionado-venta");
  chip.classList.add("oculto");
  chip.innerHTML = "";
}


// ======================================================
// MÉTODOS DE PAGO
// ======================================================

async function cargarMetodosPago() {
  const select = document.getElementById("metodo-pago-venta");

  try {
    const metodos = await apiFetch("/ventas/metodos-pago");
    select.innerHTML = metodos.map((m) => `<option value="${m.id}">${escaparHTML(m.nombre)}</option>`).join("");
  } catch (error) {
    select.innerHTML = `<option>${error.message}</option>`;
  }
}


// ======================================================
// RESUMEN DEL DÍA
// ======================================================

async function cargarResumenHoy() {
  try {
    const resumen = await apiFetch("/ventas/resumen-hoy");
    document.getElementById("resumen-cantidad-ventas").textContent = resumen.cantidad_ventas;
    document.getElementById("resumen-total-vendido").textContent = formatearBs(resumen.total_vendido);
    document.getElementById("resumen-ganancia").textContent = formatearBs(resumen.ganancia);
  } catch (error) {
    console.error("Error cargando resumen del día:", error);
  }
}


// ======================================================
// CONFIRMAR VENTA
// ======================================================

async function confirmarVenta() {
  const errorEl = document.getElementById("error-confirmar-venta");
  const exitoEl = document.getElementById("exito-confirmar-venta");
  errorEl.textContent = "";
  exitoEl.textContent = "";

  if (carrito.length === 0) {
    errorEl.textContent = "Agrega al menos un producto al carrito.";
    return;
  }

  const metodoPagoId = document.getElementById("metodo-pago-venta").value;

  try {
    const resultado = await apiFetch("/ventas", {
      method: "POST",
      body: {
        cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null,
        metodo_pago_id: parseInt(metodoPagoId, 10),
        items: carrito.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad })),
      },
    });

    let mensaje = `Venta #${resultado.id} registrada por ${formatearBs(resultado.total)}.`;
    if (resultado.puntos_ganados > 0) {
      mensaje += ` El cliente ganó ${resultado.puntos_ganados} puntos.`;
    }
    exitoEl.textContent = mensaje;

    carrito = [];
    renderizarCarrito();
    quitarClienteSeleccionado();

    await cargarResumenHoy();

  } catch (error) {
    errorEl.textContent = error.message;
  }
}


// ======================================================
// INICIAR
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  renderizarCarrito();
  cargarMetodosPago();
  cargarResumenHoy();

  let temporizadorProducto = null;
  document.getElementById("buscar-producto-venta").addEventListener("input", () => {
    clearTimeout(temporizadorProducto);
    temporizadorProducto = setTimeout(buscarProductosVenta, 250);
  });

  let temporizadorCliente = null;
  document.getElementById("buscar-cliente-venta").addEventListener("input", () => {
    clearTimeout(temporizadorCliente);
    temporizadorCliente = setTimeout(buscarClientesVenta, 250);
  });

  document.getElementById("boton-confirmar-venta").addEventListener("click", confirmarVenta);
});
