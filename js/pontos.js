function inicializarPontos(usuario) {

    /* =====================================
       NORMALIZAR OS PONTOS
    ===================================== */

    const pontosAcumulados =
        Math.max(
            0,
            Math.trunc(Number(usuario.pontosAcumulados) || 0)
        );

    const saldoPontos =
        Math.max(
            0,
            Math.trunc(Number(usuario.saldoPontos) || 0)
        );

    usuario.pontosAcumulados = pontosAcumulados;
    usuario.saldoPontos = saldoPontos;

    /*
     * Compatibilidade temporária com códigos antigos.
     */
    usuario.pontos = saldoPontos;


    /* =====================================
       DEFINIR O NÍVEL
    ===================================== */

    let nivel = "Bronze";
    let iconeNivel = "🥉";

    if (pontosAcumulados >= 100) {
        nivel = "Prata";
        iconeNivel = "🥈";
    }

    if (pontosAcumulados >= 300) {
        nivel = "Ouro";
        iconeNivel = "🥇";
    }

    if (pontosAcumulados >= 600) {
        nivel = "Diamante";
        iconeNivel = "💎";
    }

    usuario.nivel = nivel;


    /* =====================================
       ATUALIZAR O CARTÃO DO CLIENTE
    ===================================== */

    const nivelClienteCard =
        document.getElementById("nivelClienteCard");

    const pontosElemento =
        document.getElementById("pontos");

    const pontosCard =
        document.getElementById("pontosCard");

    const pontosAcumuladosResumo =
        document.getElementById("pontosAcumuladosResumo");

    if (nivelClienteCard) {
        nivelClienteCard.textContent =
            `${iconeNivel} Cliente ${nivel}`;
    }

    if (pontosElemento) {
        pontosElemento.textContent = saldoPontos;
    }

    if (pontosCard) {
        pontosCard.textContent = saldoPontos;
    }

    if (pontosAcumuladosResumo) {
        pontosAcumuladosResumo.textContent =
            pontosAcumulados;
    }


    /* =====================================
       PROGRESSO DAS RECOMPENSAS
    ===================================== */

    let metaRecompensa = 100;
    let textoProgresso = "";

    if (saldoPontos < 100) {

        metaRecompensa = 100;

        textoProgresso =
            `Faltam ${100 - saldoPontos} pontos para resgatar ` +
            `1 Açaí de 400 ml com 2 complementos.`;

    } else if (saldoPontos < 300) {

        metaRecompensa = 300;

        textoProgresso =
            `Faltam ${300 - saldoPontos} pontos para liberar ` +
            `o código de 50% de desconto.`;

    } else if (saldoPontos < 600) {

        metaRecompensa = 600;

        textoProgresso =
            `Faltam ${600 - saldoPontos} pontos para liberar ` +
            `1 Açaí de 700 ml com 4 complementos.`;

    } else if (saldoPontos < 800) {

        metaRecompensa = 800;

        textoProgresso =
            `Faltam ${800 - saldoPontos} pontos para liberar ` +
            `a recompensa máxima com 2 Açaís de 700 ml.`;

    } else {

        metaRecompensa = 800;

        textoProgresso =
            "🏆 Todas as recompensas estão disponíveis pelo seu saldo.";

    }

    const porcentagemRecompensa =
        saldoPontos >= 800
            ? 100
            : Math.min(
                (saldoPontos / metaRecompensa) * 100,
                100
            );

    const progresso =
        document.getElementById("progresso");

    const faltam =
        document.getElementById("faltam");

    if (progresso) {
        progresso.style.width =
            `${porcentagemRecompensa}%`;
    }

    if (faltam) {
        faltam.textContent = textoProgresso;
    }


    /* =====================================
       INFORMAÇÕES DO MODAL
    ===================================== */

    const pontosDisponiveisModal =
        document.getElementById("pontosDisponiveisModal");

    const pontosModal =
        document.getElementById("pontosModal");

    const nivelModal =
        document.getElementById("nivelModal");

    const progressoModal =
        document.getElementById("progressoModal");

    const faltamModal =
        document.getElementById("faltamModal");

    if (pontosDisponiveisModal) {
        pontosDisponiveisModal.textContent =
            saldoPontos;
    }

    if (pontosModal) {
        pontosModal.textContent =
            pontosAcumulados;
    }

    if (nivelModal) {
        nivelModal.textContent =
            `${iconeNivel} ${nivel}`;
    }


    /* =====================================
       PROGRESSO DO NÍVEL
    ===================================== */

    let inicioNivel = 0;
    let fimNivel = 100;
    let textoNivel = "";

    if (nivel === "Bronze") {

        inicioNivel = 0;
        fimNivel = 100;

        textoNivel =
            `Faltam ${100 - pontosAcumulados} pontos ` +
            `para o nível Prata.`;

    }

    if (nivel === "Prata") {

        inicioNivel = 100;
        fimNivel = 300;

        textoNivel =
            `Faltam ${300 - pontosAcumulados} pontos ` +
            `para o nível Ouro.`;

    }

    if (nivel === "Ouro") {

        inicioNivel = 300;
        fimNivel = 600;

        textoNivel =
            `Faltam ${600 - pontosAcumulados} pontos ` +
            `para o nível Diamante.`;

    }

    if (nivel === "Diamante" && pontosAcumulados < 800) {

        inicioNivel = 600;
        fimNivel = 800;

        textoNivel =
            `Faltam ${800 - pontosAcumulados} pontos para ` +
            `completar a faixa Diamante e liberar a recompensa máxima.`;

    }

    if (pontosAcumulados >= 800) {

        inicioNivel = 600;
        fimNivel = 800;

        textoNivel =
            "🏆 Você completou a faixa Diamante e permanece no nível máximo.";

    }

    const porcentagemNivel =
        pontosAcumulados >= 800
            ? 100
            : (
                (pontosAcumulados - inicioNivel) /
                (fimNivel - inicioNivel)
            ) * 100;

    if (progressoModal) {

        progressoModal.style.width =
            `${Math.min(
                Math.max(porcentagemNivel, 0),
                100
            )}%`;

    }

    if (faltamModal) {
        faltamModal.textContent = textoNivel;
    }


    /* =====================================
       SALVAR AS ALTERAÇÕES
    ===================================== */

    localStorage.setItem(
        "clienteAzury",
        JSON.stringify(usuario)
    );

    const sessaoAtual = {
        ...usuario,
        autenticado: true
    };

    localStorage.setItem(
        "usuarioAzury",
        JSON.stringify(sessaoAtual)
    );

}