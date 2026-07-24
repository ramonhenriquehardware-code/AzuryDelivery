document.addEventListener("DOMContentLoaded", () => {

    const formCadastro =
        document.getElementById("formCadastro");

    const btnCadastrar =
        document.getElementById("btnCadastrar");

    const mensagem =
        document.getElementById("mensagemCadastro");

    const nomeInput =
        document.getElementById("nome");

    const emailInput =
        document.getElementById("email");

    const senhaInput =
        document.getElementById("senha");


    if (
        !formCadastro ||
        !btnCadastrar ||
        !mensagem ||
        !nomeInput ||
        !emailInput ||
        !senhaInput
    ) {
        console.error(
            "Elementos do formulário de cadastro não encontrados."
        );

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


    formCadastro.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();
            limparMensagem();

            const nome =
                nomeInput.value.trim();

            const email =
                emailInput.value.trim().toLowerCase();

            const senha =
                senhaInput.value;


            if (!nome || !email || !senha) {
                exibirMensagem(
                    "erro",
                    "Preencha todos os campos."
                );

                return;
            }


            if (nome.length < 3) {
                exibirMensagem(
                    "erro",
                    "Digite seu nome completo."
                );

                nomeInput.focus();
                return;
            }


            if (!emailInput.checkValidity()) {
                exibirMensagem(
                    "erro",
                    "Digite um e-mail válido."
                );

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


            btnCadastrar.disabled = true;
            btnCadastrar.textContent = "Criando conta...";


            try {

                const { data, error } =
                    await window.azurySupabase.auth.signUp({
                        email,
                        password: senha,

                        options: {
                            data: {
                                nome: nome,
                                nome_completo: nome
                            }
                        }
                    });


                if (error) {

                    const mensagemErro =
                        error.message.toLowerCase();


                    if (
                        mensagemErro.includes("already registered") ||
                        mensagemErro.includes("already exists") ||
                        mensagemErro.includes("user already")
                    ) {
                        exibirMensagem(
                            "erro",
                            "Este e-mail já está cadastrado."
                        );

                    } else if (
                        mensagemErro.includes("password")
                    ) {
                        exibirMensagem(
                            "erro",
                            "A senha informada não é válida."
                        );

                    } else if (
                        mensagemErro.includes("email")
                    ) {
                        exibirMensagem(
                            "erro",
                            "O e-mail informado não é válido."
                        );

                    } else {
                        exibirMensagem(
                            "erro",
                            "Não foi possível criar sua conta."
                        );
                    }

                    return;
                }


                if (!data.user) {
                    exibirMensagem(
                        "erro",
                        "Não foi possível criar sua conta."
                    );

                    return;
                }


                if (data.session) {
                    await window.azurySupabase.auth.signOut();
                }


                localStorage.removeItem("clienteAzury");
                localStorage.removeItem("usuarioAzury");


                btnCadastrar.textContent =
                    "Conta criada ✓";


                if (data.session) {
                    exibirMensagem(
                        "sucesso",
                        "Conta criada com sucesso! Redirecionando..."
                    );

                } else {
                    exibirMensagem(
                        "sucesso",
                        "Conta criada! Verifique seu e-mail e depois faça login."
                    );
                }


                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1800);


            } catch (erro) {

                console.error(
                    "Erro ao criar conta:",
                    erro
                );

                exibirMensagem(
                    "erro",
                    "Erro de conexão. Tente novamente."
                );


            } finally {

                if (
                    btnCadastrar.textContent !==
                    "Conta criada ✓"
                ) {
                    btnCadastrar.disabled = false;
                    btnCadastrar.textContent =
                        "Criar Conta";
                }

            }

        }
    );

});