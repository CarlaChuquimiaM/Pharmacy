// ======================================================
// ADMINISTRACIÓN DE PREMIOS
// ======================================================

let premiosActuales = [];


// ======================================================
// ELEMENTOS
// ======================================================

const listaPremiosAdmin =
  document.getElementById("lista-premios-admin");

const panelEditarPremio =
  document.getElementById("panel-editar-premio");

const botonCrearPremio =
  document.getElementById("boton-crear-premio");

const botonGuardarPremio =
  document.getElementById("boton-guardar-premio");

const botonCancelarEdicion =
  document.getElementById("boton-cancelar-edicion");


// ======================================================
// AUXILIARES
// ======================================================

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



function limpiarFormularioNuevo() {

  document.getElementById(
    "premio-nombre"
  ).value = "";

  document.getElementById(
    "premio-descripcion"
  ).value = "";

  document.getElementById(
    "premio-puntos"
  ).value = "";

  document.getElementById(
    "premio-stock"
  ).value = "";


  const inputImagen =
    document.getElementById(
      "premio-imagen"
    );

  if (inputImagen) {
    inputImagen.value = "";
  }


  const preview =
    document.getElementById(
      "vista-previa-premio"
    );


  if (preview) {

    preview.src = "";

    preview.classList.add(
      "oculto"
    );
  }

}



function limpiarMensajes() {

  const ids = [

    "error-crear-premio",
    "exito-crear-premio",

    "error-editar-premio",
    "exito-editar-premio"

  ];


  ids.forEach((id)=>{

    const elemento =
      document.getElementById(id);


    if(elemento){

      elemento.textContent = "";

    }

  });

}



// ======================================================
// VISTA PREVIA IMAGEN CREACIÓN
// ======================================================

const inputImagenPremio =
document.getElementById(
  "premio-imagen"
);



if(inputImagenPremio){

  inputImagenPremio.addEventListener(
    "change",
    ()=>{


      const archivo =
      inputImagenPremio.files[0];


      const preview =
      document.getElementById(
        "vista-previa-premio"
      );


      if(!archivo){

        preview.classList.add(
          "oculto"
        );

        return;
      }


      preview.src =
      URL.createObjectURL(
        archivo
      );


      preview.classList.remove(
        "oculto"
      );


    }
  );

}



// ======================================================
// CARGAR PREMIOS
// ======================================================

async function cargarPremios(){

  listaPremiosAdmin.innerHTML =
  "<p>Cargando premios...</p>";


  try{

    const premios =
    await apiFetch(
      "/fidelizacion/premios"
    );


    premiosActuales = premios;


    mostrarPremios(
      premios
    );


  }catch(error){

    listaPremiosAdmin.innerHTML =
    `
    <p class="mensaje-error">
      ${escaparHTML(error.message)}
    </p>
    `;

  }

}



// ======================================================
// MOSTRAR PREMIOS
// ======================================================

function mostrarPremios(premios) {

  listaPremiosAdmin.innerHTML = "";


  if (!premios || premios.length === 0) {

    listaPremiosAdmin.innerHTML = `
      <div class="estado-vacio-premios">

        <div class="estado-vacio-premios-icono">
          🎁
        </div>

        <h3>
          Todavía no hay premios
        </h3>

        <p>
          Crea tu primer premio para comenzar
          a construir el catálogo Biofar.
        </p>

      </div>
    `;

    return;
  }


  premios.forEach((premio) => {

    const tarjeta =
      document.createElement("article");


    tarjeta.className =
      "premio-admin-card";


    const nombre =
      escaparHTML(premio.nombre);


    const descripcion =
      escaparHTML(
        premio.descripcion || "Sin descripción"
      );


    const puntos =
      Number(premio.puntos_requeridos || 0);


    const stock =
      Number(premio.stock || 0);


    const stockClase =
      stock > 0
        ? "stock-disponible"
        : "stock-agotado";


    const stockTexto =
      stock > 0
        ? `En stock (${stock})`
        : "Sin stock";


    tarjeta.innerHTML = `

      <div class="premio-admin-imagen">

        ${
          premio.imagen_url
            ?
            `
              <img
                src="${premio.imagen_url}"
                alt="${nombre}"
              >
            `
            :
            `
              <div class="premio-admin-sin-imagen">

                <span>
                  🎁
                </span>

                <small>
                  Sin imagen
                </small>

              </div>
            `
        }

      </div>


      <div class="premio-admin-contenido">


        <div class="premio-admin-superior">

          <span class="premio-etiqueta">
            Premio Biofar
          </span>

          <span class="${stockClase}">
            ${stockTexto}
          </span>

        </div>


        <h3>
          ${nombre}
        </h3>


        <p class="premio-admin-descripcion">
          ${descripcion}
        </p>


        <div class="premio-admin-puntos">

          <span class="estrella-puntos">
            ★
          </span>

          <strong>
            ${puntos.toLocaleString("es-BO")}
          </strong>

          <span>
            puntos
          </span>

        </div>


        <div class="premio-admin-detalles">

          <div>

            <span class="detalle-label">
              Requerimiento
            </span>

            <strong>
              ${puntos.toLocaleString("es-BO")} pts
            </strong>

          </div>


          <div>

            <span class="detalle-label">
              Unidades
            </span>

            <strong>
              ${stock}
            </strong>

          </div>

        </div>


        <div class="premio-admin-acciones">

          <button
            type="button"
            class="
              boton-secundario
              boton-editar-premio
            "
            data-id="${premio.id}"
          >
            ✎ Editar
          </button>


          <button
            type="button"
            class="
              boton-desactivar-premio
              boton-desactivar-biofar
            "
            data-id="${premio.id}"
            data-nombre="${nombre}"
          >
            Desactivar
          </button>

        </div>


      </div>

    `;


    listaPremiosAdmin.appendChild(
      tarjeta
    );

  });


  activarBotonesPremios();

}


// ======================================================
// CREAR PREMIO
// ======================================================

async function crearPremio(){


const nombre =
document.getElementById(
"premio-nombre"
).value.trim();



const descripcion =
document.getElementById(
"premio-descripcion"
).value.trim();



const puntos =
document.getElementById(
"premio-puntos"
).value;



const stock =
document.getElementById(
"premio-stock"
).value;



const archivo =
document.getElementById(
"premio-imagen"
).files[0];



const error =
document.getElementById(
"error-crear-premio"
);



const exito =
document.getElementById(
"exito-crear-premio"
);



error.textContent="";
exito.textContent="";



if(!nombre){

error.textContent =
"El nombre es obligatorio.";

return;

}



if(!archivo){

error.textContent =
"Debes seleccionar una imagen.";

return;

}



const formulario =
new FormData();



formulario.append(
"nombre",
nombre
);


formulario.append(
"descripcion",
descripcion
);


formulario.append(
"puntos_requeridos",
Number(puntos)
);


formulario.append(
"stock",
Number(stock)
);


formulario.append(
"imagen",
archivo
);



try{


await apiFetch(
"/fidelizacion/premios",
{
method:"POST",
body:formulario
}
);



limpiarFormularioNuevo();



exito.textContent =
"Premio creado correctamente.";



await cargarPremios();



}catch(errorPeticion){

error.textContent =
errorPeticion.message;

}


}



// ======================================================
// ABRIR EDICIÓN
// ======================================================

function abrirEdicion(id){


const premio =
premiosActuales.find(
p=>Number(p.id)===Number(id)
);



if(!premio)return;



document.getElementById(
"editar-premio-id"
).value =
premio.id;



document.getElementById(
"editar-premio-nombre"
).value =
premio.nombre;



document.getElementById(
"editar-premio-descripcion"
).value =
premio.descripcion || "";



document.getElementById(
"editar-premio-puntos"
).value =
premio.puntos_requeridos;



document.getElementById(
"editar-premio-stock"
).value =
premio.stock;



const imagen =
document.getElementById(
"editar-vista-imagen"
);



if(imagen){


if(premio.imagen_url){

imagen.src =
premio.imagen_url;


imagen.classList.remove(
"oculto"
);


}else{


imagen.classList.add(
"oculto"
);


}

}



panelEditarPremio.classList.remove(
"oculto"
);


}



// ======================================================
// GUARDAR EDICIÓN
// ======================================================

async function guardarEdicion(){


const premioId =
document.getElementById(
"editar-premio-id"
).value;



const formulario =
new FormData();



formulario.append(
"nombre",
document.getElementById(
"editar-premio-nombre"
).value.trim()
);



formulario.append(
"descripcion",
document.getElementById(
"editar-premio-descripcion"
).value.trim()
);



formulario.append(
"puntos_requeridos",
Number(
document.getElementById(
"editar-premio-puntos"
).value
)
);



formulario.append(
"stock",
Number(
document.getElementById(
"editar-premio-stock"
).value
)
);



const nuevaImagen =
document.getElementById(
"editar-premio-imagen"
);



if(nuevaImagen && nuevaImagen.files[0]){


formulario.append(
"imagen",
nuevaImagen.files[0]
);

}



try{


await apiFetch(
`/fidelizacion/premios/${premioId}`,
{
method:"PUT",
body:formulario
}
);



await cargarPremios();



panelEditarPremio.classList.add(
"oculto"
);



}catch(error){

alert(
error.message
);

}


}



// ======================================================
// DESACTIVAR
// ======================================================

async function desactivarPremio(id,nombre){


if(!confirm(
`¿Desactivar "${nombre}"?`
)){

return;

}



await apiFetch(
`/fidelizacion/premios/${id}`,
{
method:"DELETE"
}
);



await cargarPremios();


}



// ======================================================
// BOTONES
// ======================================================

function activarBotonesPremios(){


document
.querySelectorAll(
".boton-editar-premio"
)
.forEach(btn=>{


btn.onclick=()=>{

abrirEdicion(
btn.dataset.id
);

};


});



document
.querySelectorAll(
".boton-desactivar-premio"
)
.forEach(btn=>{


btn.onclick=()=>{

desactivarPremio(
btn.dataset.id,
btn.dataset.nombre
);

};


});


}



// ======================================================
// EVENTOS
// ======================================================


if(botonCrearPremio){

botonCrearPremio.addEventListener(
"click",
crearPremio
);

}



if(botonGuardarPremio){

botonGuardarPremio.addEventListener(
"click",
guardarEdicion
);

}



if(botonCancelarEdicion){

botonCancelarEdicion.onclick =
()=>{

panelEditarPremio.classList.add(
"oculto"
);

};

}



// ======================================================
// INICIO
// ======================================================

document.addEventListener(
"DOMContentLoaded",
cargarPremios
);