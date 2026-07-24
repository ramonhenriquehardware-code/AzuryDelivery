document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const botao = document.getElementById("btnEntrar");
    const formulario = document.querySelector(".login-form");
    const mensagem = document.getElementById("mensagemLogin");
    const supabase = window.azurySupabase;

    if (!botao || !formulario || !mensagem || !supabase) {
        console.error("Não foi possível iniciar o login Azury.");
        return;
    }

    function mostrarMensagem(texto, tipo) {
        mensagem.className = `mensagem ${tipo}`;
        mensagem.textContent = texto;
    }

    function destinoAposLogin() {
        const retorno = sessionStorage.getItem("azuryRetornoLogin");
        sessionStorage.removeItem("azuryRetornoLogin");

        if (
            retorno &&
            !retorno.startsWith("http://") &&
            !retorno.startsWith("https://") &&
            !retorno.startsWith("//")
        ) {
            return retorno;
        }

        return "cliente.html";
    }

    async function realizarLogin() {
        const campoEmail = formulario.querySelector('input[type="email"]');
        const campoSenha = formulario.querySelector('input[type="password"]');
        const email = campoEmail?.value.trim().toLowerCase() || "";
        const senha = campoSenha?.value || "";

        if (!email || !senha) {
            mostrarMensagem("Preencha todos os campos.", "erro");
            return;
        }

        botao.disabled = true;
        botao.textContent = "Entrando...";

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: senha
            });

            if (error) {
                const texto = String(error.message || "").toLowerCase();

                if (texto.includes("invalid login credentials")) {
                    mostrarMensagem("E-mail ou senha incorretos.", "erro");
                } else if (texto.includes("email not confirmed")) {
                    mostrarMensagem("Confirme seu e-mail antes de entrar.", "erro");
                } else {
                    mostrarMensagem("Não foi possível realizar o login.", "erro");
                }
                return;
            }

            if (!data.user || !data.session) {
                mostrarMensagem("Não foi possível iniciar sua sessão.", "erro");
                return;
            }

            localStorage.removeItem("clienteAzury");
            localStorage.removeItem("usuarioAzury");

            mostrarMensagem("Login realizado com sucesso!", "sucesso");

            window.setTimeout(() => {
                window.location.href = destinoAposLogin();
            }, 500);
        } catch (erro) {
            console.error("Erro ao entrar:", erro);
            mostrarMensagem("Erro de conexão. Tente novamente.", "erro");
        } finally {
            botao.disabled = false;
            botao.textContent = "Entrar";
        }
    }

    botao.addEventListener("click", realizarLogin);
    formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        realizarLogin();
    });

    supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
            mostrarMensagem("Você já está conectado. Redirecionando...", "sucesso");
            window.setTimeout(() => {
                window.location.href = destinoAposLogin();
            }, 400);
        }
    }).catch(() => {});
});
