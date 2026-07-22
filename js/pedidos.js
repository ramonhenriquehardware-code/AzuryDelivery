/* =========================================
   PEDIDOS — AZURY
========================================= */

function escaparTextoPedido(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function obterIconeStatusPedido(status) {

    const statusNormalizado =
        String(status || "")
            .trim()
            .toLowerCase();

    if (statusNormalizado.includes("recebido")) {
        return "🟡";
    }

    if (statusNormalizado.includes("preparação")) {
        return "🟠";
    }

    if (statusNormalizado.includes("preparacao")) {
        return "🟠";
    }

    if (statusNormalizado.includes("pronto")) {
        return "🔵";
    }

    if (statusNormalizado.includes("saiu para entrega")) {
        return "🛵";
    }

    if (statusNormalizado.includes("entregue")) {
        return "🟢";
    }

    if (statusNormalizado.includes("cancelado")) {
        return "🔴";
    }

    return "⚪";

}


function obterClasseStatusPedido(status) {

    const statusNormalizado =
        String(status || "")
            .trim()
            .toLowerCase();

    if (statusNormalizado.includes("entregue")) {
        return "status-entregue";
    }

    if (statusNormalizado.includes("cancelado")) {
        return "status-cancelado";
    }

    if (statusNormalizado.includes("saiu para entrega")) {
        return "status-entrega";
    }

    if (
        statusNormalizado.includes("preparação") ||
        statusNormalizado.includes("preparacao")
    ) {
        return "status-preparacao";
    }

    return "status-pedido";

}


function montarComplementosPedido(pedido) {

    if (
        !Array.isArray(pedido.complementos) ||
        pedido.complementos.length === 0
    ) {
        return "";
    }

    const listas =
        pedido.complementos;


    /*
     * Formato novo:
     * [
     *   ["Banana", "Granola"],
     *   ["Morango", "Leite em pó"]
     * ]
     */
    if (Array.isArray(listas[0])) {

        const conteudo =
            listas
                .map((complementosCopo, indice) => {

                    const nomes =
                        complementosCopo
                            .map(escaparTextoPedido)
                            .join(", ");

                    if (listas.length === 1) {

                        return `
                            <p class="complementos-pedido">
                                🍓 Complementos: ${nomes}
                            </p>
                        `;

                    }

                    return `
                        <p class="complementos-pedido">
                            🥤 Copo ${indice + 1}: ${nomes}
                        </p>
                    `;

                })
                .join("");

        return `
            <div class="detalhes-complementos-pedido">
                ${conteudo}
            </div>
        `;

    }


    /*
     * Compatibilidade com pedidos que tenham
     * uma lista simples de complementos.
     */
    const nomes =
        listas
            .map(escaparTextoPedido)
            .join(", ");

    return `
        <p class="complementos-pedido">
            🍓 Complementos: ${nomes}
        </p>
    `;

}


function criarHtmlPedido(pedido) {

    const produto =
        escaparTextoPedido(
            pedido.produto || "Pedido Azury"
        );

    const data =
        escaparTextoPedido(
            pedido.data || "Data não informada"
        );

    const status =
        escaparTextoPedido(
            pedido.status || "Pedido recebido"
        );

    const valorNumerico =
        Number(
            String(pedido.valor ?? "0")
                .replace(",", ".")
        );

    const valor =
        Number.isFinite(valorNumerico)
            ? valorNumerico.toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            )
            : `R$ ${escaparTextoPedido(pedido.valor)}`;

    const tipoRecompensa =
        pedido.tipo === "recompensa";

    const quantidade =
        Number(pedido.quantidade) || 1;

    const tamanho =
        pedido.tamanho
            ? escaparTextoPedido(pedido.tamanho)
            : "";

    const pontosUtilizados =
        Math.max(
            0,
            Number(pedido.pontosUtilizados) || 0
        );

    const iconeStatus =
        obterIconeStatusPedido(pedido.status);

    const classeStatus =
        obterClasseStatusPedido(pedido.status);

    const complementos =
        montarComplementosPedido(pedido);


    let detalhesProduto = "";

    if (quantidade > 1) {

        detalhesProduto += `
            <p>
                🥤 Quantidade: ${quantidade} copos
            </p>
        `;

    }

    if (tamanho) {

        detalhesProduto += `
            <p>
                📏 Tamanho: ${tamanho}
            </p>
        `;

    }


    let detalhesPagamento = `
        <p>
            💰 ${valor}
        </p>
    `;

    if (tipoRecompensa) {

        detalhesPagamento = `
            <p>
                🎁 Resgate de recompensa
            </p>

            <p>
                ⭐ ${pontosUtilizados} pontos utilizados
            </p>

            <p>
                💰 Valor: R$ 0,00
            </p>
        `;

    }


    return `
        <div class="pedido">

            <h4>
                ${tipoRecompensa ? "🎁" : "🥤"}
                ${produto}
            </h4>

            <p>
                📅 ${data}
            </p>

            ${detalhesProduto}

            ${complementos}

            ${detalhesPagamento}

            <p class="${classeStatus}">
                ${iconeStatus} ${status}
            </p>

        </div>
    `;

}


function inicializarPedidos(usuario) {

    const pedidosDiv =
        document.getElementById("pedidos");

    if (!pedidosDiv) return;


    if (!Array.isArray(usuario.pedidos)) {

        usuario.pedidos = [];

    }


    pedidosDiv.innerHTML = "";


    if (usuario.pedidos.length === 0) {

        pedidosDiv.innerHTML =
            "<p>Nenhum pedido realizado.</p>";

        return;

    }


    /*
     * Os pedidos novos são inseridos no início da lista.
     * O cartão principal mostra apenas os três mais recentes.
     */
    const pedidosRecentes =
        usuario.pedidos.slice(0, 3);


    pedidosDiv.innerHTML =
        pedidosRecentes
            .map(criarHtmlPedido)
            .join("");

}