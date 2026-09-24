// ======================================================
// UTILIDADES
// ======================================================

function calcularPrecioVenta(precioCompra, porcentajeGanancia) {
  const compra = parseFloat(precioCompra) || 0;
  const porcentaje = parseFloat(porcentajeGanancia) || 0;
  return compra * (1 + porcentaje / 100);
}

function formatearBs(numero) {
  return `Bs ${Number(numero).toFixed(2)}`;
}

function pastillaStock(producto) {
  if (producto.stock_bajo) {
    return `<span class="pastilla-estado pastilla-alerta">Stock bajo</span>`;
  }
  return `<span class="pastilla-estado pastilla-ok">${producto.stock}</span>`;
}

function pastillaVencimiento(producto) {
  if (!producto.vencimiento) {
    return `<span class="texto-ayuda">Sin vencimiento</span>`;
  }
  if (producto.vencido) {
    return `<span class="pastilla-estado pastilla-peligro">Vencido</span>`;
  }
  if (producto.por_vencer) {
    return `<span class="pastilla-estado pastilla-alerta">Por vencer</span>`;
  }
  return `<span class="pastilla-estado pastilla-ok">${producto.vencimiento}</span>`;
}


// ======================================================
// PREVISUALIZACIÓN DE PRECIO DE VENTA
// ======================================================

function conectarPreviewPrecio(idCompra, idPorcentaje, idPreview) {
  const compra = document.getElementById(idCompra);
  const porcentaje = document.getElementById(idPorcentaje);
  const preview = document.getElementById(idPreview);

  function actualizar() {
    preview.value = formatearBs(calcularPrecioVenta(compra.value, porcentaje.value));
  }

  compra.addEventListener("input", actualizar);
  porcentaje.addEventListener("input", actualizar);
}


// ======================================================
// ALERTAS
// ======================================================

async function cargarAlertas() {
  try {
    const alertas = await apiFetch("/productos/alertas");
    document.getElementById("contador-stock-bajo").textContent = alertas.stock_bajo.length;
    document.getElementById("contador-vencidos").textContent = alertas.vencidos.length;
    document.getElementById("contador-por-vencer").textContent = alertas.por_vencer.length;
  } catch (error) {
    console.error("Error cargando alertas:", error);
  }
}


// ======================================================
// LISTADO / BÚSQUEDA
// ======================================================

async function cargarProductos() {
  const cuerpo = document.getElementById("cuerpo-productos");
  const texto = document.getElementById("buscar-producto").value.trim();

  try {
    const ruta = texto
      ? `/productos?q=${encodeURIComponent(texto)}`
      : "/productos";

    const productos = await apiFetch(ruta);
    cuerpo.innerHTML = "";

    if (productos.length === 0) {
      cuerpo.innerHTML = `<tr><td colspan="7">No se encontraron productos.</td></tr>`;
      return;
    }

    productos.forEach((producto) => {
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${producto.codigo}</td>
        <td>${producto.nombre}</td>
        <td>${producto.marca || "—"}</td>
        <td>${formatearBs(producto.precio_venta)}</td>
        <td>${pastillaStock(producto)}</td>
        <td>${pastillaVencimiento(producto)}</td>
        <td></td>
      `;

      const celdaAcciones = fila.querySelector("td:last-child");
      celdaAcciones.style.display = "flex";
      celdaAcciones.style.gap = "6px";

      const botonEditar = document.createElement("button");
      botonEditar.className = "boton-secundario";
      botonEditar.textContent = "Editar";
      botonEditar.addEventListener("click", () => abrirEdicionProducto(producto));
      celdaAcciones.appendChild(botonEditar);

      const botonDesactivar = document.createElement("button");
      botonDesactivar.className = "boton-rojo";
      botonDesactivar.textContent = "Desactivar";
      botonDesactivar.addEventListener("click", () => desactivarProducto(producto));
      celdaAcciones.appendChild(botonDesactivar);

      cuerpo.appendChild(fila);
    });

  } catch (error) {
    cuerpo.innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
  }
}


// ======================================================
// CREAR PRODUCTO
// ======================================================

function leerFormularioProducto(prefijo) {
  return {
    codigo: document.getElementById(`${prefijo}-codigo`).value.trim(),
    nombre: document.getElementById(`${prefijo}-nombre`).value.trim(),
    marca: document.getElementById(`${prefijo}-marca`).value.trim(),
    precio_compra: document.getElementById(`${prefijo}-precio-compra`).value,
    porcentaje_ganancia: document.getElementById(`${prefijo}-porcentaje`).value,
    stock: document.getElementById(`${prefijo}-stock`).value,
    stock_minimo: document.getElementById(`${prefijo}-stock-minimo`).value,
    vencimiento: document.getElementById(`${prefijo}-vencimiento`).value || null,
  };
}

function limpiarFormularioProducto(prefijo) {
  ["codigo", "nombre", "marca", "precio-compra", "porcentaje", "stock", "stock-minimo", "vencimiento"]
    .forEach((campo) => {
      document.getElementById(`${prefijo}-${campo}`).value = "";
    });

  const preview = document.getElementById(`${prefijo}-precio-venta-preview`);
  if (preview) {
    preview.value = "";
  }
}

async function crearProducto() {
  const errorEl = document.getElementById("error-crear-producto");
  const exitoEl = document.getElementById("exito-crear-producto");
  errorEl.textContent = "";
  exitoEl.textContent = "";

  try {
    const datos = leerFormularioProducto("producto");
    await apiFetch("/productos", { method: "POST", body: datos });

    exitoEl.textContent = "Producto registrado correctamente.";
    limpiarFormularioProducto("producto");
    await Promise.all([cargarProductos(), cargarAlertas()]);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}


// ======================================================
// EDITAR PRODUCTO
// ======================================================

function abrirEdicionProducto(producto) {
  document.getElementById("editar-producto-id").value = producto.id;
  document.getElementById("editar-producto-codigo").value = producto.codigo;
  document.getElementById("editar-producto-nombre").value = producto.nombre;
  document.getElementById("editar-producto-marca").value = producto.marca || "";
  document.getElementById("editar-producto-precio-compra").value = producto.precio_compra;
  document.getElementById("editar-producto-porcentaje").value = producto.porcentaje_ganancia;
  document.getElementById("editar-producto-precio-venta-preview").value = formatearBs(producto.precio_venta);
  document.getElementById("editar-producto-stock").value = producto.stock;
  document.getElementById("editar-producto-stock-minimo").value = producto.stock_minimo;
  document.getElementById("editar-producto-vencimiento").value = producto.vencimiento || "";
  document.getElementById("error-editar-producto").textContent = "";
  document.getElementById("exito-editar-producto").textContent = "";

  document.getElementById("panel-editar-producto").classList.remove("oculto");
  document.getElementById("panel-editar-producto").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cerrarEdicionProducto() {
  document.getElementById("panel-editar-producto").classList.add("oculto");
}

async function guardarEdicionProducto() {
  const errorEl = document.getElementById("error-editar-producto");
  const exitoEl = document.getElementById("exito-editar-producto");
  errorEl.textContent = "";
  exitoEl.textContent = "";

  const id = document.getElementById("editar-producto-id").value;

  try {
    const datos = leerFormularioProducto("editar-producto");
    await apiFetch(`/productos/${id}`, { method: "PUT", body: datos });

    exitoEl.textContent = "Producto actualizado correctamente.";
    await Promise.all([cargarProductos(), cargarAlertas()]);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

async function desactivarProducto(producto) {
  const confirmar = confirm(`¿Desactivar el producto "${producto.nombre}"?`);
  if (!confirmar) {
    return;
  }

  try {
    await apiFetch(`/productos/${producto.id}`, { method: "DELETE" });
    await Promise.all([cargarProductos(), cargarAlertas()]);
  } catch (error) {
    alert(error.message);
  }
}


// ======================================================
// INICIAR
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  conectarPreviewPrecio("producto-precio-compra", "producto-porcentaje", "producto-precio-venta-preview");
  conectarPreviewPrecio("editar-producto-precio-compra", "editar-producto-porcentaje", "editar-producto-precio-venta-preview");

  document.getElementById("boton-crear-producto").addEventListener("click", crearProducto);
  document.getElementById("boton-guardar-producto").addEventListener("click", guardarEdicionProducto);
  document.getElementById("boton-cancelar-editar-producto").addEventListener("click", cerrarEdicionProducto);

  let temporizadorBusqueda = null;
  document.getElementById("buscar-producto").addEventListener("input", () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(cargarProductos, 300);
  });

  cargarProductos();
  cargarAlertas();
});
