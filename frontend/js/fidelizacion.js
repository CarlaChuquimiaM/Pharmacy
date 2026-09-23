// ======================================================
// FIDELIZACIÓN DE CLIENTES
// ======================================================

let clienteSeleccionadoId = null;
let documentoBuscado = null;
let tipoDocumentoBuscado = "CI";


// ======================================================
// ELEMENTOS PRINCIPALES
// ======================================================

const panelClienteNuevo = document.getElementById("panel-cliente-nuevo");
const panelClienteDetalle = document.getElementById("panel-cliente-detalle");

const tipoDocumentoInput = document.getElementById("tipo-documento");
const numeroDocumentoInput = document.getElementById("numero-documento");

const botonBuscarDocumento = document.getElementById("boton-buscar-documento");
const botonCrearCliente = document.getElementById("boton-crear-cliente");
const botonSumar = document.getElementById("boton-sumar");


// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function formatearFecha(iso) {
  if (!iso) return "";

  const fecha = new Date(iso);

  return fecha.toLocaleString("es-BO", {
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


function limpiarMensajes() {
  const ids = [
    "error-busqueda-documento",
    "error-crear-cliente",
    "error-sumar",
    "exito-sumar",
    "error-canjear",
    "exito-canjear",
  ];

  ids.forEach((id) => {
    const elemento = document.getElementById(id);

    if (elemento) {
      elemento.textContent = "";
    }
  });
}


function limpiarFormularioClienteNuevo() {
  const nombre = document.getElementById("nuevo-nombre");
  const apellido = document.getElementById("nuevo-apellido");
  const telefono = document.getElementById("nuevo-telefono");

  if (nombre) nombre.value = "";
  if (apellido) apellido.value = "";
  if (telefono) telefono.value = "";
}


// ======================================================
// BUSCAR CLIENTE POR DOCUMENTO
// ======================================================

async function buscarPorDocumento() {
  const tipo = tipoDocumentoInput.value.trim().toUpperCase();
  const numero = numeroDocumentoInput.value.trim();

  const elementoError = document.getElementById(
    "error-busqueda-documento"
  );

  elementoError.textContent = "";

  if (!numero) {
    elementoError.textContent = "Ingresa el número de CI o NIT.";
    numeroDocumentoInput.focus();
    return;
  }

  documentoBuscado = numero;
  tipoDocumentoBuscado = tipo;

  limpiarMensajes();

  try {
    const resultado = await apiFetch(
      `/fidelizacion/cliente-documento?tipo=${encodeURIComponent(
        tipo
      )}&numero=${encodeURIComponent(numero)}`
    );

    // --------------------------------------
    // CLIENTE EXISTENTE
    // --------------------------------------

    if (resultado.encontrado) {
      panelClienteNuevo.classList.add("oculto");

      limpiarFormularioClienteNuevo();

      await mostrarDetalleCliente(resultado.cliente.id);

      return;
    }

    // --------------------------------------
    // CLIENTE NO REGISTRADO
    // --------------------------------------

    clienteSeleccionadoId = null;

    panelClienteDetalle.classList.add("oculto");

    limpiarFormularioClienteNuevo();

    const documentoNuevo = document.getElementById(
      "documento-nuevo-cliente"
    );

    if (documentoNuevo) {
      documentoNuevo.textContent = `${tipo} ${numero}`;
    }

    panelClienteNuevo.classList.remove("oculto");

    const nuevoNombre = document.getElementById("nuevo-nombre");

    if (nuevoNombre) {
      nuevoNombre.focus();
    }

    panelClienteNuevo.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  } catch (error) {
    elementoError.textContent = error.message;
  }
}


// ======================================================
// MOSTRAR DETALLE DEL CLIENTE
// ======================================================

async function mostrarDetalleCliente(clienteId) {
  try {
    const cliente = await apiFetch(
      `/fidelizacion/clientes/${clienteId}`
    );

    clienteSeleccionadoId = cliente.id;

    // --------------------------------------
    // INFORMACIÓN DEL CLIENTE
    // --------------------------------------

    const nombreCompleto = `${cliente.nombre} ${
      cliente.apellido || ""
    }`.trim();

    document.getElementById("detalle-nombre").textContent =
      nombreCompleto;

    const detalleTelefono = document.getElementById(
      "detalle-telefono"
    );

    if (detalleTelefono) {
      detalleTelefono.textContent = cliente.telefono
        ? `Teléfono: ${cliente.telefono}`
        : "Sin teléfono registrado";
    }

    const detalleDocumento = document.getElementById(
      "detalle-documento"
    );

    if (detalleDocumento) {
      detalleDocumento.textContent =
        cliente.numero_documento
          ? `${cliente.tipo_documento || "CI"}: ${
              cliente.numero_documento
            }`
          : "";
    }

    document.getElementById("detalle-puntos").textContent =
      cliente.puntos;

    // --------------------------------------
    // LIMPIAR COMPRA
    // --------------------------------------

    const montoCompra = document.getElementById("monto-compra");

    if (montoCompra) {
      montoCompra.value = "";
    }

    // --------------------------------------
    // HISTORIAL
    // --------------------------------------

    cargarHistorial(cliente.historial || []);

    // --------------------------------------
    // PREMIOS
    // --------------------------------------

    await cargarPremiosCliente(cliente.id);

    // --------------------------------------
    // MOSTRAR PANEL
    // --------------------------------------

    panelClienteNuevo.classList.add("oculto");
    panelClienteDetalle.classList.remove("oculto");

    panelClienteDetalle.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  } catch (error) {
    console.error(error);

    const elementoError = document.getElementById(
      "error-busqueda-documento"
    );

    if (elementoError) {
      elementoError.textContent = error.message;
    }
  }
}


// ======================================================
// HISTORIAL
// ======================================================

function cargarHistorial(historial) {
  const cuerpoHistorial = document.getElementById(
    "cuerpo-historial"
  );

  if (!cuerpoHistorial) return;

  cuerpoHistorial.innerHTML = "";

  if (!historial || historial.length === 0) {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td colspan="5">
        No hay movimientos registrados todavía.
      </td>
    `;

    cuerpoHistorial.appendChild(fila);

    return;
  }

  historial.forEach((movimiento) => {
    const fila = document.createElement("tr");

    let detalle = "";

    if (movimiento.tipo === "acumulado") {
      detalle = `Compra de Bs ${Number(
        movimiento.monto_compra || 0
      ).toFixed(2)}`;
    } else {
      detalle = movimiento.nota || "Canje de premio";
    }

    const tipoTexto =
      movimiento.tipo === "acumulado"
        ? "Sumó"
        : movimiento.tipo === "canjeado"
        ? "Canjeó"
        : movimiento.tipo;

    fila.innerHTML = `
      <td>
        ${escaparHTML(formatearFecha(movimiento.fecha))}
      </td>

      <td>
        ${escaparHTML(tipoTexto)}
      </td>

      <td>
        ${
          movimiento.puntos > 0
            ? "+"
            : ""
        }${escaparHTML(movimiento.puntos)}
      </td>

      <td>
        ${escaparHTML(detalle)}
      </td>

      <td>
        ${escaparHTML(movimiento.usuario || "")}
      </td>
    `;

    cuerpoHistorial.appendChild(fila);
  });
}


// ======================================================
// REGISTRAR CLIENTE NUEVO
// ======================================================

async function registrarCliente() {
  const nombre = document
    .getElementById("nuevo-nombre")
    .value
    .trim();

  const apellido = document
    .getElementById("nuevo-apellido")
    .value
    .trim();

  const telefono = document
    .getElementById("nuevo-telefono")
    .value
    .trim();

  const elementoError = document.getElementById(
    "error-crear-cliente"
  );

  elementoError.textContent = "";

  if (!documentoBuscado) {
    elementoError.textContent =
      "Primero debes buscar un CI o NIT.";
    return;
  }

  if (!nombre) {
    elementoError.textContent =
      "El nombre del cliente es obligatorio.";

    document.getElementById("nuevo-nombre").focus();

    return;
  }

  try {
    const cliente = await apiFetch(
      "/fidelizacion/clientes",
      {
        method: "POST",

        body: {
          tipo_documento: tipoDocumentoBuscado,
          numero_documento: documentoBuscado,
          nombre,
          apellido,
          telefono,
        },
      }
    );

    panelClienteNuevo.classList.add("oculto");

    limpiarFormularioClienteNuevo();

    await mostrarDetalleCliente(cliente.id);

  } catch (error) {
    elementoError.textContent = error.message;
  }
}


// ======================================================
// SUMAR PUNTOS POR COMPRA
// ======================================================

async function sumarPuntos() {
  const inputMonto = document.getElementById("monto-compra");

  const monto = inputMonto.value;

  const elementoError = document.getElementById(
    "error-sumar"
  );

  const elementoExito = document.getElementById(
    "exito-sumar"
  );

  elementoError.textContent = "";
  elementoExito.textContent = "";

  if (!clienteSeleccionadoId) {
    elementoError.textContent =
      "Primero selecciona un cliente.";
    return;
  }

  if (!monto || Number(monto) <= 0) {
    elementoError.textContent =
      "Ingresa un monto de compra válido.";

    inputMonto.focus();

    return;
  }

  try {
    const cliente = await apiFetch(
      `/fidelizacion/clientes/${clienteSeleccionadoId}/sumar`,
      {
        method: "POST",

        body: {
          monto_compra: monto,
        },
      }
    );

    const puntosAntes = Number(
      document.getElementById("detalle-puntos").textContent
    ) || 0;

    const puntosGanados =
      Number(cliente.puntos) - puntosAntes;

    await mostrarDetalleCliente(cliente.id);

    const nuevoElementoExito = document.getElementById(
      "exito-sumar"
    );

    nuevoElementoExito.textContent =
      `Compra registrada correctamente. +${puntosGanados} puntos.`;

  } catch (error) {
    elementoError.textContent = error.message;
  }
}


// ======================================================
// CARGAR PREMIOS DEL CLIENTE
// ======================================================

async function cargarPremiosCliente(clienteId) {

  const contenedor =
    document.getElementById(
      "lista-premios"
    );


  if (!contenedor) {
    return;
  }


  contenedor.innerHTML = `
    <p>
      Cargando premios...
    </p>
  `;


  try {


    const premios =
      await apiFetch(
        `/fidelizacion/clientes/${clienteId}/premios`
      );



    contenedor.innerHTML = "";



    if (!premios || premios.length === 0) {


      contenedor.innerHTML = `
        <p>
          No hay premios disponibles.
        </p>
      `;


      return;

    }



    premios.forEach((premio)=>{


      const tarjeta =
        document.createElement(
          "div"
        );


      tarjeta.className =
        "premio-cliente-card";



      let estado = "";



      if(premio.stock <= 0){


        estado = `
          <p class="premio-no-disponible">
            Sin stock
          </p>
        `;


      }


      else if(premio.puede_canjear){


        estado = `

          <p class="premio-disponible">
            ✓ Puede canjear
          </p>


          <button

          class="boton-verde boton-canjear-premio"

          data-id="${premio.id}"

          data-nombre="${escaparHTML(
            premio.nombre
          )}"

          data-puntos="${premio.puntos_requeridos}"

          >

          Canjear premio

          </button>

        `;


      }


      else {


        estado = `

          <p class="premio-faltan-puntos">

          Faltan

          <strong>
          ${premio.puntos_faltantes}
          </strong>

          puntos

          </p>

        `;


      }



      tarjeta.innerHTML = `


        ${
          premio.imagen_url

          ?

          `

          <img

          src="${premio.imagen_url}"

          class="imagen-premio"

          >

          `

          :

          `

          <div class="imagen-premio-vacia">

          Sin imagen

          </div>

          `

        }



        <div class="premio-cliente-contenido">



          <h3>

          ${escaparHTML(
            premio.nombre
          )}

          </h3>




          ${
            premio.descripcion

            ?

            `

            <p>

            ${escaparHTML(
              premio.descripcion
            )}

            </p>

            `

            :

            ""

          }




          <p class="puntos-premio">

          ⭐ ${premio.puntos_requeridos}
          puntos

          </p>



          <p>

          Stock:
          ${premio.stock}

          </p>




          ${estado}



        </div>


      `;



      contenedor.appendChild(
        tarjeta
      );


    });



    document
      .querySelectorAll(
        ".boton-canjear-premio"
      )
      .forEach((boton)=>{


        boton.addEventListener(
          "click",
          ()=>{


            canjearPremio(

              boton.dataset.id,

              boton.dataset.nombre,

              boton.dataset.puntos

            );


          }
        );


      });



  }

  catch(error){


    contenedor.innerHTML =
    `

    <p class="mensaje-error">

    ${escaparHTML(
      error.message
    )}

    </p>

    `;


  }

}

// ======================================================
// CANJEAR PREMIO
// ======================================================

async function canjearPremio(
  premioId,
  nombrePremio,
  puntosPremio
) {
  const elementoError = document.getElementById(
    "error-canjear"
  );

  const elementoExito = document.getElementById(
    "exito-canjear"
  );

  elementoError.textContent = "";
  elementoExito.textContent = "";

  if (!clienteSeleccionadoId) {
    elementoError.textContent =
      "Primero selecciona un cliente.";
    return;
  }

  const puntosActuales =
    Number(
      document.getElementById(
        "detalle-puntos"
      ).textContent
    ) || 0;

  const puntosDespues =
    puntosActuales - Number(puntosPremio);

  const confirmar = confirm(
    `¿Confirmar canje?\n\n` +
    `Premio: ${nombrePremio}\n` +
    `Costo: ${puntosPremio} puntos\n\n` +
    `Puntos actuales: ${puntosActuales}\n` +
    `Puntos después del canje: ${puntosDespues}`
  );

  if (!confirmar) {
    return;
  }

  try {
    const resultado = await apiFetch(
      `/fidelizacion/clientes/${clienteSeleccionadoId}/canjear`,
      {
        method: "POST",

        body: {
          premio_id: Number(premioId),
        },
      }
    );

    await mostrarDetalleCliente(
      resultado.cliente.id
    );

    const nuevoElementoExito =
      document.getElementById(
        "exito-canjear"
      );

    nuevoElementoExito.textContent =
      `Premio "${nombrePremio}" canjeado correctamente. ` +
      `Quedan ${resultado.cliente.puntos} puntos.`;

  } catch (error) {
    elementoError.textContent = error.message;
  }
}


// ======================================================
// EVENTOS
// ======================================================


// ------------------------------------------------------
// BUSCAR CLIENTE
// ------------------------------------------------------

if (botonBuscarDocumento) {
  botonBuscarDocumento.addEventListener(
    "click",
    buscarPorDocumento
  );
}


if (numeroDocumentoInput) {
  numeroDocumentoInput.addEventListener(
    "keydown",
    (evento) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        buscarPorDocumento();
      }
    }
  );
}


// ------------------------------------------------------
// REGISTRAR CLIENTE
// ------------------------------------------------------

if (botonCrearCliente) {
  botonCrearCliente.addEventListener(
    "click",
    registrarCliente
  );
}


// ------------------------------------------------------
// ENTER EN DATOS DEL CLIENTE
// ------------------------------------------------------

[
  "nuevo-nombre",
  "nuevo-apellido",
  "nuevo-telefono",
].forEach((id) => {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.addEventListener(
      "keydown",
      (evento) => {
        if (evento.key === "Enter") {
          evento.preventDefault();
          registrarCliente();
        }
      }
    );
  }
});


// ------------------------------------------------------
// SUMAR PUNTOS
// ------------------------------------------------------

if (botonSumar) {
  botonSumar.addEventListener(
    "click",
    sumarPuntos
  );
}


const montoCompraInput =
  document.getElementById("monto-compra");

if (montoCompraInput) {
  montoCompraInput.addEventListener(
    "keydown",
    (evento) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        sumarPuntos();
      }
    }
  );
}