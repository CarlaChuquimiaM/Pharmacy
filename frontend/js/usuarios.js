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
      const boton = document.createElement("button");
      boton.className = usuario.activo ? "boton-rojo" : "boton-verde";
      boton.textContent = usuario.activo ? "Inhabilitar" : "Habilitar";
      boton.addEventListener("click", () => cambiarEstadoUsuario(usuario.id, !usuario.activo));
      celdaAccion.appendChild(boton);

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
