const formLogin = document.getElementById("form-login");

if (formLogin) {
  formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const elementoError = document.getElementById("error-login");
    elementoError.textContent = "";

    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      window.location.href = "fidelizacion.html";
    } catch (error) {
      elementoError.textContent = error.message;
    }
  });
}
