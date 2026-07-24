document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const form = document.getElementById("formCadastro");
    const botao = document.getElementById("btnCadastrar");
    const mensagem = document.getElementById("mensagemCadastro");
    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const supabase = window.azurySupabase;

    if (!form || !botao || !mensagem || !nomeInput || !emailInput || !senhaInput || !supabase) {
        console.error("Não foi possível iniciar o cadastro Azury.");
        return;
    }

    function exibirMensagem(tipo, texto) {
        mensagem.className = `mensagem ${tipo}`;
        mensagem.textContent = texto;
    }

    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        mensagem.className = "mensagem";
        mensagem.textContent = "";

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const senha = senhaInput.value;

        if (!nome || !email || !senha) {
            exibirMensagem("erro", "Preencha todos os campos.");
            return;
        }

        if (nome.length < 3) {
            exibirMensagem("erro", "Digite seu nome completo.");
            nomeInput.focus();
            return;
        }

        if (!emailInput.checkValidity()) {
            exibirMensagem("erro", "Digite um e-mail válido.");
            emailInput.focus();
            return;
        }

        if (senha.length < 6) {
            exibirMensagem("erro", "A senha precisa ter pelo menos 6 caracteres.");
            senhaInput.focus();
            return;
        }

        botao.disabled = true;
        botao.textContent = "Criando conta...";

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password: senha,
                options: {
                    data: {
                        nome,
                        nome_completo: nome
                    }
                }
            });

            if (error) {
                const texto = String(error.message || "").toLowerCase();
                if (
                    texto.includes("already registered") ||
                    texto.includes("already exists") ||
                    texto.includes("user already")
                ) {
                    exibirMensagem("erro", "Este e-mail já está cadastrado.");
                } else if (texto.includes("password")) {
                    exibirMensagem("erro", "A senha informada não é válida.");
                } else if (texto.includes("email")) {
                    exibirMensagem("erro", "O e-mail informado não é válido.");
                } else {
                    exibirMensagem("erro", error.message || "Não foi possível criar sua conta.");
                }
                return;
            }

            if (!data.user || Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                exibirMensagem("erro", "Este e-mail já está cadastrado.");
                return;
            }

            const haviaSessao = Boolean(data.session);
            if (haviaSessao) {
                await supabase.auth.signOut();
            }

            localStorage.removeItem("clienteAzury");
            localStorage.removeItem("usuarioAzury");

            botao.textContent = "Conta criada ✓";
            exibirMensagem(
                "sucesso",
                haviaSessao
                    ? "Conta criada com sucesso! Redirecionando..."
                    : "Conta criada! Verifique seu e-mail e depois faça login."
            );

            window.setTimeout(() => {
                window.location.href = "login.html";
            }, 1400);
        } catch (erro) {
            console.error("Erro ao criar conta:", erro);
            exibirMensagem("erro", "Erro de conexão. Tente novamente.");
        } finally {
            if (botao.textContent !== "Conta criada ✓") {
                botao.disabled = false;
                botao.textContent = "Criar Conta";
            }
        }
    });
});
