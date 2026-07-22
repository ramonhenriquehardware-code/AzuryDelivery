/* =========================================
   PEDIDOS — AZURY
========================================= */

function escaparTextoPedido(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function normalizarTextoPedido(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}


function converterValorPedido(valor) {
    if (
        window.AzuryPontuacao &&
        typeof window.AzuryPontuacao
            .converterValorParaNumero === "function"
    ) {
        return window.AzuryPontuacao
            .converterValorParaNumero(valor);
    }

    if (typeof valor === "number") {
        return Number.isFinite(valor)
            ? valor
            : 0;
    }

    let texto = String(valor ?? "")
        .trim()
        .replace(/\s/g, "")
        .replace("R$", "");

    if (!texto) {
        return 0;
    }

    if (
        texto.includes(".") &&
        texto.includes(",")
    ) {
        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");
    } else {
        texto = texto.replace(",", ".");
    }

    const numero =
        Number(texto);

    return Number.isFinite(numero)
        ? numero
        : 0;
}


function formatarMoedaPedido(valor) {
    return converterValorPedido(valor)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}


function obterIconeStatusPedido(status) {
    const statusNormalizado =
        normalizarTextoPedido(status);

    if (
        statusNormalizado.includes(
            "recebido"
        )
    ) {
        return "🟡";
    }

    if (
        statusNormalizado.includes(
            "em preparo"
        ) ||
        statusNormalizado.includes(
            "preparacao"
        )
    ) {
        return "🟠";
    }

    if (
        statusNormalizado.includes(
            "pronto"
        )
    ) {
        return "🔵";
    }

    if (
        statusNormalizado.includes(
            "saiu para entrega"
        )
    ) {
        return "🛵";
    }

    if (
        statusNormalizado.includes(
            "entregue"
        )
    ) {
        return "🟢";
    }

    if (
        statusNormalizado.includes(
            "cancelado"
        )
    ) {
        return "🔴";
    }

    return "⚪";
}


function obterClasseStatusPedido(status) {
    const statusNormalizado =
        normalizarTextoPedido(status);

    if (
        statusNormalizado.includes(
            "entregue"
        )
    ) {
        return "status-entregue";
    }

    if (
        statusNormalizado.includes(
            "cancelado"
        )
    ) {
        return "status-cancelado";
    }

    if (
        statusNormalizado.includes(
            "saiu para entrega"
        )
    ) {
        return "status-entrega";
    }

    if (
        statusNormalizado.includes(
            "em preparo"
        ) ||
        statusNormalizado.includes(
            "preparacao"
        )
    ) {
        return "status-preparacao";
    }

    return "status-pedido";
}


function formatarDataPedidoCliente(pedido) {
    if (pedido?.criadoEm) {
        const data =
            new Date(pedido.criadoEm);

        if (
            !Number.isNaN(
                data.getTime()
            )
        ) {
            return data.toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );
        }
    }

    return (
        pedido?.data ||
        "Data não informada"
    );
}


function obterValoresPedidoCliente(pedido) {
    const taxaEntrega =
        Math.max(
            0,

            converterValorPedido(
                pedido?.taxaEntrega ??
                pedido?.entrega ??
                0
            )
        );

    const totalInformado =
        Math.max(
            0,

            converterValorPedido(
                pedido?.valorTotal ??
                pedido?.total ??
                pedido?.valor ??
                0
            )
        );

    const produtosInformados =
        Math.max(
            0,

            converterValorPedido(
                pedido?.valorProdutos ??
                pedido?.subtotal ??
                pedido?.valorPedido ??
                0
            )
        );

    const valorProdutos =
        produtosInformados > 0
            ? produtosInformados
            : Math.max(
                0,
                totalInformado -
                taxaEntrega
            );

    const valorTotal =
        totalInformado > 0
            ? totalInformado
            : valorProdutos +
            taxaEntrega;

    return {
        valorProdutos,
        taxaEntrega,
        valorTotal
    };
}


function montarComplementosPedido(pedido) {
    if (
        !Array.isArray(
            pedido?.complementos
        ) ||
        pedido.complementos.length ===
        0
    ) {
        return "";
    }

    const listas =
        pedido.complementos;

    if (
        Array.isArray(
            listas[0]
        )
    ) {
        const conteudo =
            listas
                .map(
                    (
                        complementosCopo,
                        indice
                    ) => {
                        const nomes =
                            complementosCopo
                                .map(
                                    escaparTextoPedido
                                )
                                .join(", ");

                        if (
                            listas.length ===
                            1
                        ) {
                            return `
                                <p class="complementos-pedido">
                                    🍓 Complementos:
                                    ${nomes}
                                </p>
                            `;
                        }

                        return `
                            <p class="complementos-pedido">
                                🥤 Copo ${indice + 1}:
                                ${nomes}
                            </p>
                        `;
                    }
                )
                .join("");

        return `
            <div class="detalhes-complementos-pedido">
                ${conteudo}
            </div>
        `;
    }

    const nomes =
        listas
            .map(
                escaparTextoPedido
            )
            .join(", ");

    return `
        <p class="complementos-pedido">
            🍓 Complementos:
            ${nomes}
        </p>
    `;
}


function montarEnderecoPedidoCliente(pedido) {
    const endereco =
        pedido?.enderecoEntrega &&
            typeof pedido.enderecoEntrega ===
            "object"
            ? pedido.enderecoEntrega
            : null;

    if (!endereco) {
        return "";
    }

    const rua =
        String(
            endereco.rua || ""
        ).trim();

    const numero =
        String(
            endereco.numero || ""
        ).trim();

    const bairro =
        String(
            endereco.bairro || ""
        ).trim();

    const cep =
        String(
            endereco.cep || ""
        ).trim();

    const complemento =
        String(
            endereco.complemento || ""
        ).trim();

    if (
        !rua &&
        !numero &&
        !bairro &&
        !cep &&
        !complemento
    ) {
        return "";
    }

    const linhaPrincipal =
        [
            rua,

            numero
                ? `nº ${numero}`
                : ""
        ]
            .filter(Boolean)
            .map(
                escaparTextoPedido
            )
            .join(", ");

    const linhaSecundaria =
        [
            bairro,

            cep
                ? `CEP ${cep}`
                : ""
        ]
            .filter(Boolean)
            .map(
                escaparTextoPedido
            )
            .join(" • ");

    return `
        <div class="endereco-pedido-cliente">

            <p>
                📍 ${linhaPrincipal ||
        "Endereço não informado"
        }
            </p>

            ${linhaSecundaria
            ? `
                        <p>
                            ${linhaSecundaria}
                        </p>
                    `
            : ""
        }

            ${complemento
            ? `
                        <p>
                            Complemento:
                            ${escaparTextoPedido(
                complemento
            )}
                        </p>
                    `
            : ""
        }

        </div>
    `;
}


function montarPontosPedidoCliente(pedido) {
    const pontosGerados =
        Math.max(
            0,

            Number(
                pedido?.pontosGerados
            ) || 0
        );

    if (
        normalizarTextoPedido(
            pedido?.tipo
        ) === "recompensa"
    ) {
        return "";
    }

    if (
        pedido?.pontosCreditados ===
        true
    ) {
        return `
            <p class="pontos-pedido-cliente">
                ⭐ ${pontosGerados}
                ponto(s) creditado(s)
            </p>
        `;
    }

    if (
        normalizarTextoPedido(
            pedido?.status
        ).includes(
            "cancelado"
        )
    ) {
        return "";
    }

    return `
        <p class="pontos-pedido-cliente">
            ⭐ Pontos liberados após a entrega
        </p>
    `;
}


function criarHtmlPedido(pedido) {
    const produto =
        escaparTextoPedido(
            pedido?.produto ||
            "Pedido Azury"
        );

    const codigoPedido =
        pedido?.id
            ? escaparTextoPedido(
                pedido.id
            )
            : "";

    const data =
        escaparTextoPedido(
            formatarDataPedidoCliente(
                pedido
            )
        );

    const status =
        escaparTextoPedido(
            pedido?.status ||
            "Pedido recebido"
        );

    const tipoRecompensa =
        normalizarTextoPedido(
            pedido?.tipo
        ) ===
        "recompensa";

    const quantidade =
        Math.max(
            1,

            Number(
                pedido?.quantidade
            ) || 1
        );

    const tamanho =
        pedido?.tamanho
            ? escaparTextoPedido(
                pedido.tamanho
            )
            : "";

    const pontosUtilizados =
        Math.max(
            0,

            Number(
                pedido?.pontosUtilizados
            ) || 0
        );

    const iconeStatus =
        obterIconeStatusPedido(
            pedido?.status
        );

    const classeStatus =
        obterClasseStatusPedido(
            pedido?.status
        );

    const complementos =
        montarComplementosPedido(
            pedido
        );

    const endereco =
        montarEnderecoPedidoCliente(
            pedido
        );

    const pontos =
        montarPontosPedidoCliente(
            pedido
        );

    const valores =
        obterValoresPedidoCliente(
            pedido
        );

    const formaPagamento =
        String(
            pedido?.formaPagamento ||
            pedido?.pagamento ||
            "Não informada"
        ).trim();

    let detalhesProduto =
        "";

    if (codigoPedido) {
        detalhesProduto += `
            <p>
                🧾 Pedido:
                ${codigoPedido}
            </p>
        `;
    }

    if (
        quantidade > 1
    ) {
        detalhesProduto += `
            <p>
                🥤 Quantidade:
                ${quantidade} copos
            </p>
        `;
    }

    if (tamanho) {
        detalhesProduto += `
            <p>
                📏 Tamanho:
                ${tamanho}
            </p>
        `;
    }

    let detalhesPagamento = `
        <div class="valores-pedido-cliente">

            <p>
                🥤 Produtos:
                ${formatarMoedaPedido(
        valores.valorProdutos
    )}
            </p>

            <p>
                🛵 Taxa de entrega:
                ${formatarMoedaPedido(
        valores.taxaEntrega
    )}
            </p>

            <p>
                💰 Total:

                <strong>
                    ${formatarMoedaPedido(
        valores.valorTotal
    )}
                </strong>
            </p>

            <p>
                💳 Pagamento:
                ${escaparTextoPedido(
        formaPagamento
    )}
            </p>

        </div>
    `;

    if (tipoRecompensa) {
        detalhesPagamento = `
            <div class="valores-pedido-cliente">

                <p>
                    🎁 Resgate de recompensa
                </p>

                <p>
                    ⭐ ${pontosUtilizados}
                    pontos utilizados
                </p>

                <p>
                    💰 Total: R$ 0,00
                </p>

            </div>
        `;
    }

    return `
        <div class="pedido">

            <h4>
                ${tipoRecompensa
            ? "🎁"
            : "🥤"
        }

                ${produto}
            </h4>

            <p>
                📅 ${data}
            </p>

            ${detalhesProduto}

            ${complementos}

            ${endereco}

            ${detalhesPagamento}

            ${pontos}

            <p class="${classeStatus}">
                ${iconeStatus}
                ${status}
            </p>

        </div>
    `;
}


function inicializarPedidos(usuario) {
    const pedidosDiv =
        document.getElementById(
            "pedidos"
        );

    if (!pedidosDiv) {
        return;
    }

    if (
        !Array.isArray(
            usuario?.pedidos
        )
    ) {
        usuario.pedidos =
            [];
    }

    pedidosDiv.innerHTML =
        "";

    if (
        usuario.pedidos.length ===
        0
    ) {
        pedidosDiv.innerHTML =
            "<p>Nenhum pedido realizado.</p>";

        return;
    }

    const pedidosRecentes =
        usuario.pedidos.slice(
            0,
            3
        );

    pedidosDiv.innerHTML =
        pedidosRecentes
            .map(
                criarHtmlPedido
            )
            .join("");
}