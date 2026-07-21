const botao = document.getElementById("btnEntrar");
const formulario = document.querySelector(".login-form");

function realizarLogin() {

    const campoEmail =
        document.querySelector('input[type="email"]');

    const campoSenha =
        document.querySelector('input[type="password"]');

    const mensagem =
        document.getElementById("mensagemLogin");

    const email =
        campoEmail.value.trim();

    const senha =
        campoSenha.value.trim();

    let usuario = null;

    try {

        usuario = JSON.parse(
            localStorage.getItem("clienteAzury")
        );

    } catch (erro) {

        usuario = null;

    }


    if (email === "" || senha === "") {

        mensagem.className = "mensagem erro";

        mensagem.textContent =
            "Preencha todos os campos.";

        return;

    }


    if (!usuario) {

        mensagem.className = "mensagem erro";

        mensagem.textContent =
            "Nenhuma conta cadastrada.";

        return;

    }


    if (
        email === usuario.email &&
        senha === usuario.senha
    ) {

        /*
         * Salva a sessão do cliente.
         * O cadastro continua guardado em clienteAzury.
         * O usuário logado fica guardado em usuarioAzury.
         */

        const usuarioLogado = {

            ...usuario,

            nome:
                usuario.nome ||
                usuario.nomeCompleto ||
                email.split("@")[0],

            autenticado: true

        };


        localStorage.setItem(
            "usuarioAzury",
            JSON.stringify(usuarioLogado)
        );


        mensagem.className =
            "mensagem sucesso";

        mensagem.textContent =
            "Login realizado com sucesso!";


        setTimeout(() => {

            window.location.href =
                "cliente.html";

        }, 700);

    } else {

        mensagem.className =
            "mensagem erro";

        mensagem.textContent =
            "E-mail ou senha incorretos.";

    }

}


if (botao) {

    botao.addEventListener(
        "click",
        realizarLogin
    );

}


if (formulario) {

    formulario.addEventListener(
        "submit",
        evento => {

            evento.preventDefault();

            realizarLogin();

        }
    );

}