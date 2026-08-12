document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const form = document.getElementById("formCadastro");
  const botao = document.getElementById("btnCadastrar");
  const mensagem = document.getElementById("mensagemCadastro");
  const nomeInput = document.getElementById("nome");
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const supabase = window.azurySupabase;

  if (
    !form ||
    !botao ||
    !mensagem ||
    !nomeInput ||
    !emailInput ||
    !senhaInput ||
    !supabase
  ) {
    console.error("Não foi possível iniciar o cadastro Azury.");
    return;
  }

  function exibirMensagem(tipo, texto) {
    mensagem.className = `mensagem ${tipo}`;
    mensagem.textContent = texto;
  }

  form.addEventListener("submit", async (evento) => {
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
          emailRedirectTo:
            "https://www.azurydelivery.com.br/conta-confirmada.html",
          data: {
            nome,
            nome_completo: nome,
          },
        },
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
          exibirMensagem(
            "erro",
            error.message || "Não foi possível criar sua conta.",
          );
        }

        return;
      }

      if (
        !data.user ||
        (Array.isArray(data.user.identities) &&
          data.user.identities.length === 0)
      ) {
        exibirMensagem("erro", "Este e-mail já está cadastrado.");
        return;
      }

      const haviaSessao = Boolean(data.session);

      if (haviaSessao) {
        await supabase.auth.signOut();
      }

      localStorage.removeItem("clienteAzury");
      localStorage.removeItem("usuarioAzury");

      if (haviaSessao) {
        botao.textContent = "Conta criada ✓";

        exibirMensagem(
          "sucesso",
          "Conta criada com sucesso! Redirecionando para o login...",
        );

        window.setTimeout(() => {
          window.location.href = "login.html";
        }, 1400);

        return;
      }

      nomeInput.disabled = true;
      emailInput.disabled = true;
      senhaInput.value = "";
      senhaInput.disabled = true;
      botao.disabled = true;
      botao.textContent = "E-mail enviado ✓";

      exibirMensagem(
        "sucesso",
        `📩 Falta só 1 passo! Enviamos um e-mail para ${email}. Abra sua caixa de entrada e clique no botão de confirmação para ativar sua conta AZURY. Depois da confirmação, você poderá entrar normalmente. Se não encontrar o e-mail, verifique também a pasta de spam ou lixo eletrônico.`,
      );
    } catch (erro) {
      console.error("Erro ao criar conta:", erro);
      exibirMensagem("erro", "Erro de conexão. Tente novamente.");
    } finally {
      if (
        botao.textContent !== "Conta criada ✓" &&
        botao.textContent !== "E-mail enviado ✓"
      ) {
        botao.disabled = false;
        botao.textContent = "Criar Conta";
      }
    }
  });
});
