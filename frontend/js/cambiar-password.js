(async () => {
  try {
    const usuario = await apiFetch("/auth/me");
    if (usuario.debe_cambiar_password) {
      document.getElementById("aviso-obligatorio").textContent =
        "Por seguridad, debes definir una nueva contraseña antes de continuar.";
    }
  } catch (e) {
    // apiFetch ya redirige si no hay sesión
  }
})();

document.getElementById("form-cambiar-password").addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const passwordActual = document.getElementById("password-actual").value;
  const passwordNueva = document.getElementById("password-nueva").value;
  const passwordConfirmar = document.getElementById("password-nueva-confirmar").value;
  const elementoError = document.getElementById("error-cambiar-password");
  const elementoExito = document.getElementById("exito-cambiar-password");
  elementoError.textContent = "";
  elementoExito.textContent = "";

  if (passwordNueva !== passwordConfirmar) {
    elementoError.textContent = "Las contraseñas nuevas no coinciden";
    return;
  }

  try {
    await apiFetch("/auth/cambiar-password", {
      method: "POST",
      body: { password_actual: passwordActual, password_nueva: passwordNueva },
    });
    elementoExito.textContent = "Contraseña actualizada. Redirigiendo...";
    setTimeout(() => {
      window.location.href = "fidelizacion.html";
    }, 900);
  } catch (error) {
    elementoError.textContent = error.message;
  }
});
