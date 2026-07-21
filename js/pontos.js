function inicializarPontos(usuario) {

    const pontos = usuario.pontos || 0;

    let nivel = "Bronze";

    if (pontos >= 100) nivel = "Prata";
    if (pontos >= 300) nivel = "Ouro";
    if (pontos >= 600) nivel = "Diamante";

    usuario.nivel = nivel;

    localStorage.setItem(
        "clienteAzury",
        JSON.stringify(usuario)
    );

    let iconeNivel = "🥉";

    if (nivel === "Prata") iconeNivel = "🥈";
    if (nivel === "Ouro") iconeNivel = "🥇";
    if (nivel === "Diamante") iconeNivel = "💎";

    document.getElementById("nivelClienteCard").textContent =
        `${iconeNivel} Cliente ${nivel}`;

    document.getElementById("pontos").textContent = pontos;
    document.getElementById("pontosCard").textContent = pontos;

    let meta = 100;

    if (nivel === "Prata") meta = 300;
    if (nivel === "Ouro") meta = 600;
    if (nivel === "Diamante") meta = 600;

    const porcentagem = Math.min((pontos / meta) * 100, 100);

    document.getElementById("progresso").style.width =
        porcentagem + "%";

    const faltam = Math.max(meta - pontos, 0);

    if (nivel === "Diamante") {

        document.getElementById("faltam").textContent =
            "🏆 Você atingiu o nível máximo!";

    } else {

        document.getElementById("faltam").textContent =
            `Faltam ${faltam} pontos para o próximo nível.`;

    }

}