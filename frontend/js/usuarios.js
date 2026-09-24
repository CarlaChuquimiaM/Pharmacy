async function cargarUsuarios() {
  const cuerpo = document.getElementById("cuerpo-usuarios");

  try {
    const usuarios = await apiFetch("/auth/usuarios");
    cuerpo.innerHTML = "";

    usuarios.forEach((usuario) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${usuario.username}</td>
        <td>${usuario.rol}</td>
        <td>${usuario.activo ? "Habilitado" : "Inhabilitado"}</td>
        <td></td>
      `;

      const celdaAccion = fila.querySelector("td:last-child");
      celdaAccion.style.display = "flex";
      celdaAccion.style.gap = "6px";

      const boton = document.createElement("button");
      boton.className = usuario.activo ? "boton-rojo" : "boton-verde";
      boton.textContent = usuario.activo ? "Inhabilitar" : "Habilitar";
      boton.addEventListener("click", () => cambiarEstadoUsuario(usuario.id, !usuario.activo));
      celdaAccion.appendChild(boton);

      const botonReset = document.createElement("button");
      botonReset.className = "boton-secundario";
      botonReset.textContent = "Resetear contraseña";
      botonReset.addEventListener("click", () => resetearPassword(usuario.id, usuario.username));
      celdaAccion.appendChild(botonReset);

      cuerpo.appendChild(fila);
    });
  } catch (error) {
    cuerpo.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
  }
}

async function cambiarEstadoUsuario(usuarioId, nuevoEstado) {
  await apiFetch(`/auth/usuarios/${usuarioId}`, {
    method: "PATCH",
    body: { activo: nuevoEstado },
  });
  await cargarUsuarios();
}

async function resetearPassword(usuarioId, username) {
  const nuevaClave = prompt(
    `Nueva contraseña temporal para "${username}" (mínimo 6 caracteres).\nLa persona deberá cambiarla en su próximo ingreso.`
  );

  if (!nuevaClave) return;

  if (nuevaClave.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres");
    return;
  }

  await apiFetch(`/auth/usuarios/${usuarioId}`, {
    method: "PATCH",
    body: { password: nuevaClave },
  });
  alert("Contraseña reseteada. Compártela con el usuario de forma segura.");
  await cargarUsuarios();
}

document.getElementById("boton-crear-usuario").addEventListener("click", async () => {
  const username = document.getElementById("nuevo-username").value.trim();
  const password = document.getElementById("nuevo-password").value;
  const rol = document.getElementById("nuevo-rol").value;
  const elementoError = document.getElementById("error-crear-usuario");
  const elementoExito = document.getElementById("exito-crear-usuario");
  elementoError.textContent = "";
  elementoExito.textContent = "";

  try {
    await apiFetch("/auth/usuarios", {
      method: "POST",
      body: { username, password, rol },
    });
    document.getElementById("nuevo-username").value = "";
    document.getElementById("nuevo-password").value = "";
    elementoExito.textContent = "Usuario creado correctamente.";
    await cargarUsuarios();
  } catch (error) {
    elementoError.textContent = error.message;
  }
});

cargarUsuarios();
