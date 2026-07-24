const botao = document.getElementById("btnEntrar");
const formulario = document.querySelector(".login-form");
const mensagem = document.getElementById("mensagemLogin");

function mostrarMensagem(texto, tipo) {
    mensagem.className = `mensagem ${tipo}`;
    mensagem.textContent = texto;
}

async function realizarLogin() {
    const campoEmail =
        document.querySelector('input[type="email"]');

    const campoSenha =
        document.querySelector('input[type="password"]');

    const email = campoEmail.value.trim();
    const senha = campoSenha.value;

    if (email === "" || senha === "") {
        mostrarMensagem(
            "Preencha todos os campos.",
            "erro"
        );

        return;
    }

    botao.disabled = true;
    botao.textContent = "Entrando...";

    try {
        const { data, error } =
            await window.azurySupabase.auth.signInWithPassword({
                email,
                password: senha
            });

        if (error) {
            if (error.message === "Invalid login credentials") {
                mostrarMensagem(
                    "E-mail ou senha incorretos.",
                    "erro"
                );
            } else if (error.message === "Email not confirmed") {
                mostrarMensagem(
                    "Confirme seu e-mail antes de entrar.",
                    "erro"
                );
            } else {
                mostrarMensagem(
                    "Não foi possível realizar o login.",
                    "erro"
                );
            }

            return;
        }

        if (!data.user || !data.session) {
            mostrarMensagem(
                "Não foi possível iniciar sua sessão.",
                "erro"
            );

            return;
        }

        localStorage.removeItem("usuarioAzury");

        mostrarMensagem(
            "Login realizado com sucesso!",
            "sucesso"
        );

        setTimeout(() => {
            window.location.href = "cliente.html";
        }, 700);

    } catch (erro) {
        console.error("Erro ao entrar:", erro);

        mostrarMensagem(
            "Erro de conexão. Tente novamente.",
            "erro"
        );

    } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
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