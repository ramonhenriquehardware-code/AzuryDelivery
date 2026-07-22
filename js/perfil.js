function inicializarPerfil(usuario) {

    document.getElementById("nomeCliente").textContent =
        usuario.nome;

    const avatarInicial =
        document.getElementById("avatarInicial");

    if (avatarInicial) {

        const nome =
            (usuario.nome || "Cliente").trim();

        avatarInicial.textContent =
            nome.charAt(0).toUpperCase();

    }

    const pontos = usuario.pontos || 0;

    document.getElementById("pontos").textContent = pontos;

    document.getElementById("pontosCard").textContent = pontos;

    document.getElementById("nivelClienteCard").textContent =
        "🥉 Cliente " + (usuario.nivel || "Bronze");

    const meta = 100;

    const porcentagem = Math.min((pontos / meta) * 100, 100);

    document.getElementById("progresso").style.width =
        porcentagem + "%";

    const faltam = Math.max(meta - pontos, 0);

    document.getElementById("faltam").textContent =
        `Faltam ${faltam} pontos para ganhar um Açaí 300ml.`;

}