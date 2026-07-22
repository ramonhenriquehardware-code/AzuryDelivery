document.addEventListener("DOMContentLoaded", () => {

    const formCadastro = document.getElementById("formCadastro");
    const btnCadastrar = document.getElementById("btnCadastrar");
    const mensagem = document.getElementById("mensagemCadastro");

    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");

    if (
        !formCadastro ||
        !btnCadastrar ||
        !mensagem ||
        !nomeInput ||
        !emailInput ||
        !senhaInput
    ) {
        console.error("Elementos do formulário de cadastro não encontrados.");
        return;
    }

    function exibirMensagem(tipo, texto) {
        mensagem.className = `mensagem ${tipo}`;
        mensagem.textContent = texto;
    }

    function limparMensagem() {
        mensagem.className = "mensagem";
        mensagem.textContent = "";
    }

    formCadastro.addEventListener("submit", (event) => {

        event.preventDefault();
        limparMensagem();

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
            exibirMensagem(
                "erro",
                "A senha precisa ter pelo menos 6 caracteres."
            );

            senhaInput.focus();
            return;
        }

        let clienteExistente = null;

        try {
            clienteExistente = JSON.parse(
                localStorage.getItem("clienteAzury")
            );
        } catch (erro) {
            console.error("Erro ao ler cadastro existente:", erro);
        }

        if (
            clienteExistente &&
            clienteExistente.email?.toLowerCase() === email
        ) {
            exibirMensagem(
                "erro",
                "Este e-mail já está cadastrado."
            );

            emailInput.focus();
            return;
        }

        const cliente = {
            nome,
            email,
            senha,
            pontos: 0,
            pontosAcumulados: 0,
            saldoPontos: 0,
            nivel: "Bronze",
            criadoEm: new Date().toISOString()
        };

        try {
            localStorage.setItem(
                "clienteAzury",
                JSON.stringify(cliente)
            );
        } catch (erro) {
            console.error("Erro ao salvar cadastro:", erro);

            exibirMensagem(
                "erro",
                "Não foi possível criar sua conta. Tente novamente."
            );

            return;
        }

        btnCadastrar.disabled = true;
        btnCadastrar.textContent = "Conta criada ✓";

        exibirMensagem(
            "sucesso",
            "Conta criada com sucesso! Redirecionando..."
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);

    });

});