document.addEventListener(
    "DOMContentLoaded",
    atualizarMenuConta
);

window.addEventListener(
    "pageshow",
    atualizarMenuConta
);

function atualizarMenuConta() {

    const linkConta =
        document.getElementById("linkConta");

    if (!linkConta) {
        return;
    }

    let usuario = null;

    try {

        usuario = JSON.parse(
            localStorage.getItem("usuarioAzury")
        );

    } catch (erro) {

        usuario = null;

    }

    const estaLogado = Boolean(
        usuario &&
        usuario.autenticado === true &&
        usuario.email
    );

    if (estaLogado) {

        linkConta.href =
            "cliente.html";

        linkConta.textContent =
            "Área do Cliente";

        linkConta.title =
            "Abrir minha área de cliente";

    } else {

        localStorage.removeItem(
            "usuarioAzury"
        );

        linkConta.href =
            "login.html";

        linkConta.textContent =
            "Entrar";

        linkConta.title =
            "Entrar na minha conta";

    }

}