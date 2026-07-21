const btnCadastrar = document.getElementById("btnCadastrar");

btnCadastrar.addEventListener("click", () => {

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    const mensagem = document.getElementById("mensagemCadastro");

    if (!nome || !email || !senha) {

        mensagem.className = "mensagem erro";
        mensagem.textContent = "Preencha todos os campos.";

        return;
    }

    const clienteExistente = JSON.parse(localStorage.getItem("clienteAzury"));

    if (clienteExistente && clienteExistente.email === email) {

        mensagem.className = "mensagem erro";
        mensagem.textContent = "Este e-mail já está cadastrado.";

        return;
    }

    const cliente = {
        nome,
        email,
        senha,
        pontos: 0,
        nivel: "Bronze"
    };

    localStorage.setItem("clienteAzury", JSON.stringify(cliente));

    mensagem.className = "mensagem sucesso";
    mensagem.textContent = "Conta criada com sucesso! Redirecionando...";

    setTimeout(() => {

        window.location.href = "login.html";

    }, 1500);

});