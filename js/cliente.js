document.addEventListener("DOMContentLoaded", () => {

    let sessao = null;
    let usuario = null;


    /* =====================================
       LER DADOS SALVOS
    ===================================== */

    try {

        sessao = JSON.parse(
            localStorage.getItem("usuarioAzury")
        );

        usuario = JSON.parse(
            localStorage.getItem("clienteAzury")
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar os dados do cliente:",
            erro
        );

        sessao = null;
        usuario = null;

    }


    /* =====================================
       PROTEGER A ÁREA DO CLIENTE
    ===================================== */

    const sessaoValida = Boolean(
        sessao &&
        sessao.autenticado === true &&
        sessao.email
    );

    if (!sessaoValida) {

        localStorage.removeItem("usuarioAzury");

        window.location.replace("login.html");

        return;

    }


    /*
     * Caso os dados principais do cliente não existam,
     * utiliza os dados encontrados na sessão.
     */
    if (!usuario || typeof usuario !== "object") {

        usuario = {
            ...sessao
        };

    }


    /* =====================================
       VALIDAR A CONTA DA SESSÃO
    ===================================== */

    const emailUsuario =
        String(usuario.email || "")
            .trim()
            .toLowerCase();

    const emailSessao =
        String(sessao.email || "")
            .trim()
            .toLowerCase();

    if (
        emailUsuario &&
        emailSessao &&
        emailUsuario !== emailSessao
    ) {

        localStorage.removeItem("usuarioAzury");

        window.location.replace("login.html");

        return;

    }

    usuario.email = emailSessao || emailUsuario;

    if (!usuario.nome && sessao.nome) {
        usuario.nome = sessao.nome;
    }


    /* =====================================
       BOTÃO SAIR
    ===================================== */

    const btnSair =
        document.getElementById("btnSair");

    if (btnSair) {

        btnSair.addEventListener("click", () => {

            /*
             * Remove somente a sessão.
             * A conta continua salva.
             */
            localStorage.removeItem("usuarioAzury");

            window.location.replace("index.html");

        });

    }


    /* =====================================
       CONVERTER CONTAS ANTIGAS
    ===================================== */

    const pontosAntigos =
        Number.isFinite(Number(usuario.pontos))
            ? Math.max(0, Math.trunc(Number(usuario.pontos)))
            : 0;


    /*
     * Pontos acumulados:
     * determinam o nível e nunca diminuem.
     */
    if (
        usuario.pontosAcumulados === undefined ||
        !Number.isFinite(Number(usuario.pontosAcumulados))
    ) {

        usuario.pontosAcumulados = pontosAntigos;

    } else {

        usuario.pontosAcumulados =
            Math.max(
                0,
                Math.trunc(Number(usuario.pontosAcumulados))
            );

    }


    /*
     * Saldo de pontos:
     * diminui quando uma recompensa é resgatada.
     */
    if (
        usuario.saldoPontos === undefined ||
        !Number.isFinite(Number(usuario.saldoPontos))
    ) {

        usuario.saldoPontos = pontosAntigos;

    } else {

        usuario.saldoPontos =
            Math.max(
                0,
                Math.trunc(Number(usuario.saldoPontos))
            );

    }


    /*
     * Mantido temporariamente para compatibilidade
     * com códigos antigos durante a atualização.
     */
    usuario.pontos = usuario.saldoPontos;


    /* =====================================
       DEFINIR O NÍVEL PELOS PONTOS ACUMULADOS
    ===================================== */

    const totalAcumulado =
        usuario.pontosAcumulados;

    let nivel = "Bronze";

    if (totalAcumulado >= 100) {
        nivel = "Prata";
    }

    if (totalAcumulado >= 300) {
        nivel = "Ouro";
    }

    if (totalAcumulado >= 600) {
        nivel = "Diamante";
    }

    usuario.nivel = nivel;


    /* =====================================
       ESTRUTURA DOS PEDIDOS
    ===================================== */

    if (!Array.isArray(usuario.pedidos)) {

        usuario.pedidos = [];

    } else {

        /*
         * Remove somente o pedido falso usado
         * anteriormente como demonstração.
         */
        usuario.pedidos = usuario.pedidos.filter(pedido => {

            const pedidoTeste =
                pedido &&
                pedido.produto === "Azury Supreme" &&
                pedido.valor === "29,99" &&
                pedido.data === "18/07/2026" &&
                pedido.status === "Entregue";

            return !pedidoTeste;

        });

    }


    /* =====================================
       ESTRUTURA DO HISTÓRICO
    ===================================== */

    if (!Array.isArray(usuario.historico)) {

        usuario.historico = [];

    }


    /* =====================================
       RECOMPENSAS RESGATADAS
    ===================================== */

    if (!Array.isArray(usuario.recompensasResgatadas)) {

        usuario.recompensasResgatadas = [];

    }


    /* =====================================
       CÓDIGOS DE DESCONTO
    ===================================== */

    if (!Array.isArray(usuario.codigosDesconto)) {

        usuario.codigosDesconto = [];

    }


    /* =====================================
       CONTROLE MENSAL DOS RESGATES
    ===================================== */

    const agora = new Date();

    const mesAtual =
        `${agora.getFullYear()}-` +
        `${String(agora.getMonth() + 1).padStart(2, "0")}`;


    if (
        !usuario.controleResgates ||
        typeof usuario.controleResgates !== "object" ||
        usuario.controleResgates.mesReferencia !== mesAtual
    ) {

        usuario.controleResgates = {

            mesReferencia: mesAtual,

            recompensa100: 0,

            recompensa300: 0

        };

    } else {

        usuario.controleResgates.recompensa100 =
            Number(usuario.controleResgates.recompensa100) || 0;

        usuario.controleResgates.recompensa300 =
            Number(usuario.controleResgates.recompensa300) || 0;

    }


    /* =====================================
       SALVAR OS DADOS ATUALIZADOS
    ===================================== */

    localStorage.setItem(
        "clienteAzury",
        JSON.stringify(usuario)
    );

    localStorage.setItem(
        "usuarioAzury",
        JSON.stringify({
            ...usuario,
            autenticado: true
        })
    );


    /* =====================================
       INICIALIZAR A ÁREA DO CLIENTE
    ===================================== */

    inicializarPerfil(usuario);

    inicializarPontos(usuario);

    inicializarRecompensas(usuario);

    inicializarPedidos(usuario);

    inicializarHistorico(usuario);

    inicializarUI();

});




    



        




