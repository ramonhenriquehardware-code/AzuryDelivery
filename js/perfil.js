function inicializarPerfil(usuario) {

    document.getElementById("nomeCliente").textContent =
        usuario.nome;


    /* =========================================
       AVATAR DO CLIENTE
    ========================================= */

    const avatarInicial =
        document.getElementById("avatarInicial");

    const avatarCliente =
        document.querySelector(".avatar-cliente");

    if (avatarInicial) {

        /* Não mostrar mais a letra inicial do nome */
        avatarInicial.textContent = "";

    }


    /* =========================================
       NÍVEL DO CLIENTE
    ========================================= */

    const nivel =
        String(usuario.nivel || "Bronze")
            .trim()
            .toLowerCase();

    let nomeNivel = "Bronze";
    let emojiNivel = "🥉";

    let corBorda = "#b87333";
    let sombraBorda =
        "0 0 0 4px rgba(184, 115, 51, 0.14), 0 8px 22px rgba(184, 115, 51, 0.20)";


    if (nivel.includes("prata")) {

        nomeNivel = "Prata";
        emojiNivel = "🥈";

        corBorda = "#aeb4bd";
        sombraBorda =
            "0 0 0 4px rgba(174, 180, 189, 0.18), 0 8px 22px rgba(120, 130, 145, 0.22)";

    } else if (nivel.includes("ouro")) {

        nomeNivel = "Ouro";
        emojiNivel = "🥇";

        corBorda = "#d4af37";
        sombraBorda =
            "0 0 0 4px rgba(212, 175, 55, 0.18), 0 8px 24px rgba(212, 175, 55, 0.28)";

    } else if (nivel.includes("diamante")) {

        nomeNivel = "Diamante";
        emojiNivel = "💎";

        corBorda = "#62cfff";
        sombraBorda =
            "0 0 0 4px rgba(98, 207, 255, 0.20), 0 0 22px rgba(0, 81, 255, 0.30), 0 8px 28px rgba(98, 207, 255, 0.24)";

    }


    if (avatarCliente) {

        avatarCliente.style.borderColor =
            corBorda;

        avatarCliente.style.boxShadow =
            sombraBorda;

    }


    const nivelClienteCard =
        document.getElementById("nivelClienteCard");

    if (nivelClienteCard) {

        nivelClienteCard.textContent =
            `${emojiNivel} Cliente ${nomeNivel}`;

    }


    /* =========================================
       PONTOS
    ========================================= */

    const pontos =
        usuario.pontos || 0;

    document.getElementById("pontos").textContent =
        pontos;

    document.getElementById("pontosCard").textContent =
        pontos;


    const meta = 100;

    const porcentagem =
        Math.min(
            (pontos / meta) * 100,
            100
        );

    document.getElementById("progresso").style.width =
        porcentagem + "%";


    const faltam =
        Math.max(
            meta - pontos,
            0
        );

    document.getElementById("faltam").textContent =
        `Faltam ${faltam} pontos para ganhar um Açaí 300ml.`;

}