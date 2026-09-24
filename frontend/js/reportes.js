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

function pintarPeriodo(prefijo, datos) {
  document.getElementById(`${prefijo}-cantidad`).textContent = datos.cantidad_ventas;
  document.getElementById(`${prefijo}-total`).textContent = formatearBs(datos.total_vendido);
  document.getElementById(`${prefijo}-ganancia`).textContent = formatearBs(datos.ganancia);
}

async function cargarDashboard() {
  try {
    const datos = await apiFetch("/reportes/dashboard");

    pintarPeriodo("hoy", datos.ventas.hoy);
    pintarPeriodo("semana", datos.ventas.ultimos_7_dias);
    pintarPeriodo("mes", datos.ventas.ultimos_30_dias);

    document.getElementById("inventario-stock-bajo").textContent = datos.inventario.stock_bajo;
    document.getElementById("inventario-vencidos").textContent = datos.inventario.vencidos;
    document.getElementById("inventario-por-vencer").textContent = datos.inventario.por_vencer;

    const cuerpoTopProductos = document.getElementById("cuerpo-top-productos");
    cuerpoTopProductos.innerHTML = datos.top_productos.length
      ? datos.top_productos.map((p) => `
          <tr>
            <td>${escaparHTML(p.nombre)}</td>
            <td>${p.cantidad_vendida}</td>
            <td>${formatearBs(p.total_vendido)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="3">Sin ventas en este período.</td></tr>`;

    const cuerpoMetodos = document.getElementById("cuerpo-metodos-pago");
    cuerpoMetodos.innerHTML = datos.ventas_por_metodo_pago.length
      ? datos.ventas_por_metodo_pago.map((m) => `
          <tr>
            <td>${escaparHTML(m.metodo)}</td>
            <td>${m.cantidad_ventas}</td>
            <td>${formatearBs(m.total)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="3">Sin ventas en este período.</td></tr>`;

    document.getElementById("fidelizacion-clientes").textContent = datos.fidelizacion.total_clientes;
    document.getElementById("fidelizacion-acumulados").textContent = datos.fidelizacion.puntos_acumulados_total;
    document.getElementById("fidelizacion-canjeados").textContent = datos.fidelizacion.puntos_canjeados_total;

    const ranking = document.getElementById("ranking-clientes");
    ranking.innerHTML = datos.fidelizacion.top_clientes.length
      ? datos.fidelizacion.top_clientes.map((cliente, indice) => `
          <div class="ranking-item">
            <div class="ranking-posicion">${indice + 1}</div>
            <div class="ranking-nombre">${escaparHTML(cliente.nombre)}</div>
            <div class="ranking-valor">${cliente.puntos} pts</div>
          </div>
        `).join("")
      : `<p class="texto-ayuda">Todavía no hay clientes con puntos acumulados.</p>`;

  } catch (error) {
    console.error("Error cargando el dashboard:", error);
  }
}

document.addEventListener("DOMContentLoaded", cargarDashboard);
