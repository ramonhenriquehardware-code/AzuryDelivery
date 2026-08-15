/* =========================================
   PEDIDOS — AZURY
========================================= */

(() => {
    "use strict";

    const CART_KEY = "azurySacola";
    const REVIEWS_TABLE = "avaliacoes_pedido";

    let usuarioAtual = null;
    let eventosConectados = false;
    let pedidoAvaliandoId = "";
    let notaAvaliacao = 0;

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

    function normalizarStatusPedido(valor) {
        return normalizarTextoPedido(valor)
            .replace(/[-\s]+/g, "_");
    }

    function primeiroValor(objeto, chaves, fallback = null) {
        for (const chave of chaves) {
            if (
                objeto &&
                Object.prototype.hasOwnProperty.call(objeto, chave) &&
                objeto[chave] !== null &&
                objeto[chave] !== undefined &&
                objeto[chave] !== ""
            ) {
                return objeto[chave];
            }
        }

        return fallback;
    }

    function converterValorPedido(valor) {
        if (
            window.AzuryPontuacao &&
            typeof window.AzuryPontuacao.converterValorParaNumero === "function"
        ) {
            return window.AzuryPontuacao.converterValorParaNumero(valor);
        }

        if (typeof valor === "number") {
            return Number.isFinite(valor) ? valor : 0;
        }

        let texto = String(valor ?? "")
            .trim()
            .replace(/\s/g, "")
            .replace("R$", "");

        if (!texto) return 0;

        if (texto.includes(".") && texto.includes(",")) {
            texto = texto.replace(/\./g, "").replace(",", ".");
        } else {
            texto = texto.replace(",", ".");
        }

        const numero = Number(texto);
        return Number.isFinite(numero) ? numero : 0;
    }

    function formatarMoedaPedido(valor) {
        return converterValorPedido(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarData(valor) {
        if (!valor) return "";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "";
        }

        return data.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function formatarDataPedidoCliente(pedido) {
        return (
            formatarData(pedido?.criadoEm) ||
            pedido?.data ||
            "Data não informada"
        );
    }

    function obterIconeStatusPedido(status) {
        const texto =
            normalizarTextoPedido(status);

        if (texto.includes("cancelado")) {
            return "🔴";
        }

        if (texto.includes("entregue")) {
            return "🟢";
        }

        if (texto.includes("saiu para entrega")) {
            return "🛵";
        }

        if (texto.includes("pronto")) {
            return "🔵";
        }

        if (
            texto.includes("em preparo") ||
            texto.includes("preparacao")
        ) {
            return "🟠";
        }

        if (texto.includes("recebido")) {
            return "🟡";
        }

        return "⚪";
    }

    function obterClasseStatusPedido(status) {
        const texto =
            normalizarTextoPedido(status);

        if (texto.includes("cancelado")) {
            return "status-cancelado";
        }

        if (texto.includes("entregue")) {
            return "status-entregue";
        }

        if (texto.includes("saiu para entrega")) {
            return "status-entrega";
        }

        if (
            texto.includes("em preparo") ||
            texto.includes("preparacao")
        ) {
            return "status-preparacao";
        }

        return "status-pedido";
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
                    totalInformado - taxaEntrega
                );

        const valorTotal =
            totalInformado > 0
                ? totalInformado
                : valorProdutos + taxaEntrega;

        return {
            valorProdutos,
            taxaEntrega,
            valorTotal
        };
    }

    function montarComplementosPedido(pedido) {
        if (
            !Array.isArray(pedido?.complementos) ||
            pedido.complementos.length === 0
        ) {
            return "";
        }

        const listas =
            pedido.complementos;

        if (Array.isArray(listas[0])) {
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

                            if (listas.length === 1) {
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

        return `
            <p class="complementos-pedido">
                🍓 Complementos:
                ${listas
                    .map(
                        escaparTextoPedido
                    )
                    .join(", ")}
            </p>
        `;
    }

    function montarEnderecoPedidoCliente(pedido) {
        const endereco =
            pedido?.enderecoEntrega &&
            typeof pedido.enderecoEntrega === "object"
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
                    📍 ${
                        linhaPrincipal ||
                        "Endereço não informado"
                    }
                </p>

                ${
                    linhaSecundaria
                        ? `
                            <p>
                                ${linhaSecundaria}
                            </p>
                        `
                        : ""
                }

                ${
                    complemento
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

    function obterIdRealPedido(pedido) {
        return String(
            pedido?.pedidoId ||
            pedido?.pedido_id ||
            pedido?.id ||
            ""
        ).trim();
    }

    function obterStatusInternoPedido(pedido) {
        return normalizarStatusPedido(
            pedido?.statusInterno ||
            pedido?.status ||
            "recebido"
        );
    }

    function pedidoEstaEntregue(pedido) {
        return (
            obterStatusInternoPedido(
                pedido
            ) === "entregue"
        );
    }

    function pedidoEstaCancelado(pedido) {
        return (
            obterStatusInternoPedido(
                pedido
            ) === "cancelado"
        );
    }

    function pedidoEstaEmAndamento(pedido) {
        return (
            !pedidoEstaEntregue(
                pedido
            ) &&
            !pedidoEstaCancelado(
                pedido
            )
        );
    }

    function obterDataEtapaPedido(
        pedido,
        statusAceitos,
        fallback = ""
    ) {
        const historico =
            Array.isArray(
                pedido?.historicoStatus
            )
                ? pedido.historicoStatus
                : [];

        for (const item of historico) {
            const status =
                normalizarStatusPedido(
                    primeiroValor(
                        item,
                        [
                            "status_novo",
                            "novo_status",
                            "status"
                        ],
                        ""
                    )
                );

            if (
                statusAceitos.includes(
                    status
                )
            ) {
                return primeiroValor(
                    item,
                    [
                        "criado_em",
                        "created_at",
                        "data"
                    ],
                    ""
                );
            }
        }

        return fallback;
    }

    function montarRastreamentoPedido(pedido) {
        if (
            pedidoEstaCancelado(
                pedido
            )
        ) {
            return `
                <div
                    class="
                        rastreamento-pedido
                        rastreamento-cancelado
                    "
                >

                    <strong>
                        🔴 Pedido cancelado
                    </strong>

                    <span>
                        Este pedido não seguirá
                        para as próximas etapas.
                    </span>

                </div>
            `;
        }

        const statusAtual =
            obterStatusInternoPedido(
                pedido
            );

        const indiceAtual =
            {
                recebido: 0,
                confirmado: 0,
                aceito: 0,
                em_preparo: 1,
                pronto: 1,
                saiu_para_entrega: 2,
                entregue: 3
            }[statusAtual] ?? 0;

        const etapas = [
            {
                titulo: "Recebido",
                icone: "✓",

                data:
                    obterDataEtapaPedido(
                        pedido,
                        [
                            "recebido",
                            "confirmado",
                            "aceito"
                        ],
                        pedido?.criadoEm ||
                        ""
                    )
            },

            {
                titulo: "Em preparo",
                icone: "🥤",

                data:
                    obterDataEtapaPedido(
                        pedido,
                        [
                            "em_preparo",
                            "pronto"
                        ]
                    )
            },

            {
                titulo: "Saiu",
                icone: "🛵",

                data:
                    obterDataEtapaPedido(
                        pedido,
                        [
                            "saiu_para_entrega"
                        ]
                    )
            },

            {
                titulo: "Entregue",
                icone: "✓",

                data:
                    obterDataEtapaPedido(
                        pedido,
                        [
                            "entregue"
                        ]
                    )
            }
        ];

        const etapasHtml =
            etapas
                .map(
                    (
                        etapa,
                        indice
                    ) => {
                        const concluida =
                            indice < indiceAtual ||
                            pedidoEstaEntregue(
                                pedido
                            );

                        const ativa =
                            indice === indiceAtual &&
                            !pedidoEstaEntregue(
                                pedido
                            );

                        const classe =
                            concluida
                                ? "concluida"
                                : ativa
                                    ? "ativa"
                                    : "";

                        const data =
                            formatarData(
                                etapa.data
                            );

                        const textoData =
                            data ||
                            (
                                concluida ||
                                ativa
                                    ? "Atualizado"
                                    : "Aguardando"
                            );

                        return `
                            <div
                                class="
                                    etapa-rastreamento-pedido
                                    ${classe}
                                "
                            >

                                <span
                                    class="
                                        etapa-rastreamento-icone
                                    "
                                    aria-hidden="true"
                                >
                                    ${etapa.icone}
                                </span>

                                <strong>
                                    ${etapa.titulo}
                                </strong>

                                <small>
                                    ${textoData}
                                </small>

                            </div>
                        `;
                    }
                )
                .join("");

        return `
            <div
                class="rastreamento-pedido"
                aria-label="Acompanhamento do pedido"
            >

                <div
                    class="
                        rastreamento-pedido-titulo
                    "
                >

                    <strong>
                        🛵 Acompanhe seu pedido
                    </strong>

                    <span>
                        ${
                            pedidoEstaEmAndamento(
                                pedido
                            )
                                ? "Atualização automática"
                                : "Pedido concluído"
                        }
                    </span>

                </div>

                <div
                    class="
                        linha-rastreamento-pedido
                    "
                >
                    ${etapasHtml}
                </div>

            </div>
        `;
    }

    function podeRepetirPedido(pedido) {
        return (
            normalizarTextoPedido(
                pedido?.tipo
            ) !== "recompensa" &&

            Array.isArray(
                pedido?.itens
            ) &&

            pedido.itens.length > 0
        );
    }

    function montarAcoesPedido(pedido) {
        const pedidoId =
            escaparTextoPedido(
                obterIdRealPedido(
                    pedido
                )
            );

        if (!pedidoId) {
            return "";
        }

        const acoes = [];

        if (
            podeRepetirPedido(
                pedido
            )
        ) {
            acoes.push(`
                <button
                    type="button"
                    class="
                        btn-acao-pedido
                        btn-pedir-novamente
                    "
                    data-acao-pedido="repetir"
                    data-pedido-id="${pedidoId}"
                >
                    🔁 Pedir novamente
                </button>
            `);
        }

        if (
            pedidoEstaEntregue(
                pedido
            )
        ) {
            const avaliacao =
                pedido?.avaliacao ||
                null;

            const texto =
                avaliacao
                    ? `⭐ Avaliado: ${
                        Number(
                            avaliacao.nota
                        ) || 0
                    }/5`
                    : "⭐ Avaliar pedido";

            acoes.push(`
                <button
                    type="button"
                    class="
                        btn-acao-pedido
                        btn-avaliar-pedido
                        ${
                            avaliacao
                                ? "avaliado"
                                : ""
                        }
                    "
                    data-acao-pedido="avaliar"
                    data-pedido-id="${pedidoId}"
                >
                    ${texto}
                </button>
            `);
        }

        if (!acoes.length) {
            return "";
        }

        return `
            <div
                class="
                    acoes-pedido-cliente
                "
            >
                ${acoes.join("")}
            </div>
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
            <div
                class="
                    valores-pedido-cliente
                "
            >

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
                <div
                    class="
                        valores-pedido-cliente
                    "
                >

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

        const classeAndamento =
            pedidoEstaEmAndamento(
                pedido
            )
                ? " pedido-em-andamento"
                : "";

        return `
            <div
                class="
                    pedido${classeAndamento}
                "
                data-pedido-card-id="${
                    escaparTextoPedido(
                        obterIdRealPedido(
                            pedido
                        )
                    )
                }"
            >

                <h4>
                    ${
                        tipoRecompensa
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

                <p
                    class="${classeStatus}"
                >
                    ${iconeStatus}
                    ${status}
                </p>

                ${
                    montarRastreamentoPedido(
                        pedido
                    )
                }

                ${
                    montarAcoesPedido(
                        pedido
                    )
                }

            </div>
        `;
    }

    function garantirEstilosPedidosCliente() {
        if (
            document.getElementById(
                "azuryPedidosClienteEstilos"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "azuryPedidosClienteEstilos";

        style.textContent = `
            .pagina-cliente .pedido {
                position: relative;
            }

            .pagina-cliente
            .pedido.pedido-em-andamento {
                border-color:
                    rgba(
                        0,
                        81,
                        255,
                        0.32
                    );

                box-shadow:
                    0 12px 30px
                    rgba(
                        0,
                        81,
                        255,
                        0.10
                    );
            }

            .pagina-cliente
            .pedido.pedido-em-andamento::before {
                content:
                    "PEDIDO EM ANDAMENTO";

                display:
                    inline-flex;

                margin-bottom:
                    10px;

                padding:
                    5px 9px;

                border-radius:
                    999px;

                color:
                    #0047d6;

                background:
                    #eaf1ff;

                font-size:
                    11px;

                font-weight:
                    900;

                letter-spacing:
                    0.35px;
            }

            .pagina-cliente
            .rastreamento-pedido {
                margin-top:
                    14px;

                padding:
                    14px;

                border:
                    1px solid
                    #e1e8f5;

                border-radius:
                    14px;

                background:
                    #f9fbff;
            }

            .pagina-cliente
            .rastreamento-pedido-titulo {
                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    10px;

                margin-bottom:
                    14px;
            }

            .pagina-cliente
            .rastreamento-pedido-titulo
            strong {
                color:
                    #17233c;

                font-size:
                    14px;
            }

            .pagina-cliente
            .rastreamento-pedido-titulo
            span {
                color:
                    #6b7688;

                font-size:
                    11px;

                font-weight:
                    700;
            }

            .pagina-cliente
            .linha-rastreamento-pedido {
                display:
                    grid;

                grid-template-columns:
                    repeat(
                        4,
                        minmax(
                            0,
                            1fr
                        )
                    );

                gap:
                    7px;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido {
                min-width:
                    0;

                padding-top:
                    2px;

                position:
                    relative;

                color:
                    #8b95a5;

                text-align:
                    center;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido:not(
                :last-child
            )::after {
                content:
                    "";

                width:
                    calc(
                        100% - 34px
                    );

                height:
                    3px;

                position:
                    absolute;

                top:
                    15px;

                left:
                    calc(
                        50% + 17px
                    );

                border-radius:
                    999px;

                background:
                    #dce3ef;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido.concluida:not(
                :last-child
            )::after {
                background:
                    #1ca85d;
            }

            .pagina-cliente
            .etapa-rastreamento-icone {
                width:
                    30px;

                height:
                    30px;

                margin:
                    0 auto 6px;

                display:
                    grid;

                place-items:
                    center;

                position:
                    relative;

                z-index:
                    2;

                border:
                    2px solid
                    #d8e0ec;

                border-radius:
                    50%;

                background:
                    #ffffff;

                color:
                    #8390a4;

                font-size:
                    13px;

                font-weight:
                    900;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido.concluida
            .etapa-rastreamento-icone {
                border-color:
                    #1ca85d;

                background:
                    #1ca85d;

                color:
                    #ffffff;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido.ativa
            .etapa-rastreamento-icone {
                border-color:
                    #0758f8;

                background:
                    #0758f8;

                color:
                    #ffffff;

                box-shadow:
                    0 0 0 4px
                    rgba(
                        7,
                        88,
                        248,
                        0.12
                    );
            }

            .pagina-cliente
            .etapa-rastreamento-pedido
            strong {
                display:
                    block;

                overflow:
                    hidden;

                color:
                    inherit;

                font-size:
                    11px;

                line-height:
                    1.25;

                text-overflow:
                    ellipsis;

                white-space:
                    nowrap;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido.concluida
            strong {
                color:
                    #147a45;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido.ativa
            strong {
                color:
                    #0758f8;
            }

            .pagina-cliente
            .etapa-rastreamento-pedido
            small {
                min-height:
                    28px;

                margin-top:
                    3px;

                display:
                    block;

                color:
                    #8b95a5;

                font-size:
                    9px;

                line-height:
                    1.25;
            }

            .pagina-cliente
            .rastreamento-cancelado {
                border-color:
                    #f0c4c4;

                background:
                    #fff7f7;

                color:
                    #a32929;
            }

            .pagina-cliente
            .rastreamento-cancelado
            strong,

            .pagina-cliente
            .rastreamento-cancelado
            span {
                display:
                    block;
            }

            .pagina-cliente
            .rastreamento-cancelado
            span {
                margin-top:
                    4px;

                color:
                    #7a5555;

                font-size:
                    12px;
            }

            .pagina-cliente
            .acoes-pedido-cliente {
                margin-top:
                    14px;

                display:
                    flex;

                flex-wrap:
                    wrap;

                gap:
                    9px;
            }

            .pagina-cliente
            .btn-acao-pedido {
                min-height:
                    42px;

                padding:
                    9px 14px;

                border:
                    1px solid
                    #0758f8;

                border-radius:
                    10px;

                background:
                    #0758f8;

                color:
                    #ffffff;

                font-size:
                    13px;

                font-weight:
                    900;

                cursor:
                    pointer;

                transition:
                    0.18s ease;
            }

            .pagina-cliente
            .btn-acao-pedido:hover {
                transform:
                    translateY(
                        -1px
                    );

                background:
                    #004de2;
            }

            .pagina-cliente
            .btn-avaliar-pedido {
                border-color:
                    #f0bd2f;

                background:
                    #fff8df;

                color:
                    #735500;
            }

            .pagina-cliente
            .btn-avaliar-pedido:hover {
                background:
                    #ffefb6;

                color:
                    #614700;
            }

            .pagina-cliente
            .btn-avaliar-pedido.avaliado {
                border-color:
                    #d9e2ef;

                background:
                    #f7f9fc;

                color:
                    #42506a;
            }

            #modalAvaliacaoPedidoAzury {
                position:
                    fixed;

                inset:
                    0;

                z-index:
                    100000;

                display:
                    none;

                align-items:
                    center;

                justify-content:
                    center;

                padding:
                    18px;

                background:
                    rgba(
                        15,
                        23,
                        42,
                        0.62
                    );

                backdrop-filter:
                    blur(
                        3px
                    );
            }

            #modalAvaliacaoPedidoAzury.visivel {
                display:
                    flex;
            }

            #modalAvaliacaoPedidoAzury
            .avaliacao-conteudo {
                width:
                    min(
                        520px,
                        100%
                    );

                max-height:
                    calc(
                        100vh - 36px
                    );

                overflow:
                    auto;

                padding:
                    24px;

                border-radius:
                    18px;

                background:
                    #ffffff;

                box-shadow:
                    0 24px 70px
                    rgba(
                        0,
                        20,
                        65,
                        0.28
                    );
            }

            #modalAvaliacaoPedidoAzury
            .avaliacao-topo {
                display:
                    flex;

                align-items:
                    flex-start;

                justify-content:
                    space-between;

                gap:
                    16px;
            }

            #modalAvaliacaoPedidoAzury
            h2 {
                margin:
                    0;

                color:
                    #17233c;

                font-size:
                    23px;
            }

            #modalAvaliacaoPedidoAzury
            .avaliacao-subtitulo {
                margin:
                    7px 0 18px;

                color:
                    #667085;

                font-size:
                    13px;

                line-height:
                    1.5;
            }

            #modalAvaliacaoPedidoAzury
            .btn-fechar-avaliacao {
                width:
                    38px;

                height:
                    38px;

                flex:
                    0 0 38px;

                display:
                    grid;

                place-items:
                    center;

                border:
                    1px solid
                    #e2e8f0;

                border-radius:
                    50%;

                background:
                    #f7f9fc;

                color:
                    #64748b;

                font-size:
                    22px;

                cursor:
                    pointer;
            }

            #modalAvaliacaoPedidoAzury
            .estrelas-avaliacao {
                margin:
                    12px 0 18px;

                display:
                    flex;

                justify-content:
                    center;

                gap:
                    7px;
            }

            #modalAvaliacaoPedidoAzury
            .estrela-avaliacao {
                padding:
                    0;

                border:
                    0;

                background:
                    transparent;

                color:
                    #d7dde7;

                font-size:
                    39px;

                line-height:
                    1;

                cursor:
                    pointer;

                transition:
                    transform
                    0.15s ease,
                    color
                    0.15s ease;
            }

            #modalAvaliacaoPedidoAzury
            .estrela-avaliacao.selecionada {
                color:
                    #f5b800;
            }

            #modalAvaliacaoPedidoAzury
            .estrela-avaliacao:hover {
                transform:
                    scale(
                        1.08
                    );
            }

            #modalAvaliacaoPedidoAzury
            label {
                margin-bottom:
                    7px;

                display:
                    block;

                color:
                    #344054;

                font-size:
                    13px;

                font-weight:
                    800;
            }

            #modalAvaliacaoPedidoAzury
            textarea {
                width:
                    100%;

                min-height:
                    112px;

                resize:
                    vertical;

                padding:
                    12px;

                border:
                    1px solid
                    #d8e0ec;

                border-radius:
                    11px;

                color:
                    #17233c;

                background:
                    #ffffff;

                font:
                    inherit;

                line-height:
                    1.45;
            }

            #modalAvaliacaoPedidoAzury
            textarea:focus {
                outline:
                    3px solid
                    rgba(
                        7,
                        88,
                        248,
                        0.11
                    );

                border-color:
                    #0758f8;
            }

            #modalAvaliacaoPedidoAzury
            .contador-avaliacao {
                margin-top:
                    5px;

                color:
                    #7b8494;

                font-size:
                    11px;

                text-align:
                    right;
            }

            #modalAvaliacaoPedidoAzury
            .status-avaliacao {
                min-height:
                    18px;

                margin:
                    12px 0 0;

                color:
                    #667085;

                font-size:
                    12px;

                font-weight:
                    700;

                text-align:
                    center;
            }

            #modalAvaliacaoPedidoAzury
            .status-avaliacao.erro {
                color:
                    #b42318;
            }

            #modalAvaliacaoPedidoAzury
            .status-avaliacao.sucesso {
                color:
                    #16804a;
            }

            #modalAvaliacaoPedidoAzury
            .acoes-avaliacao {
                margin-top:
                    16px;

                display:
                    flex;

                justify-content:
                    flex-end;

                gap:
                    9px;
            }

            #modalAvaliacaoPedidoAzury
            .acoes-avaliacao
            button {
                min-height:
                    43px;

                padding:
                    9px 16px;

                border-radius:
                    10px;

                font-weight:
                    900;

                cursor:
                    pointer;
            }

            #modalAvaliacaoPedidoAzury
            .btn-cancelar-avaliacao {
                border:
                    1px solid
                    #d8e0ec;

                background:
                    #ffffff;

                color:
                    #46556d;
            }

            #modalAvaliacaoPedidoAzury
            .btn-salvar-avaliacao {
                border:
                    1px solid
                    #0758f8;

                background:
                    #0758f8;

                color:
                    #ffffff;
            }

            #modalAvaliacaoPedidoAzury
            .btn-salvar-avaliacao:disabled {
                opacity:
                    0.55;

                cursor:
                    default;
            }

            @media (
                max-width:
                640px
            ) {

                .pagina-cliente
                .linha-rastreamento-pedido {
                    gap:
                        2px;
                }

                .pagina-cliente
                .etapa-rastreamento-pedido:not(
                    :last-child
                )::after {
                    left:
                        calc(
                            50% + 14px
                        );

                    width:
                        calc(
                            100% - 28px
                        );
                }

                .pagina-cliente
                .etapa-rastreamento-icone {
                    width:
                        27px;

                    height:
                        27px;

                    font-size:
                        11px;
                }

                .pagina-cliente
                .etapa-rastreamento-pedido
                strong {
                    font-size:
                        9px;
                }

                .pagina-cliente
                .etapa-rastreamento-pedido
                small {
                    font-size:
                        8px;
                }

                .pagina-cliente
                .acoes-pedido-cliente {
                    display:
                        grid;

                    grid-template-columns:
                        1fr;
                }

                .pagina-cliente
                .btn-acao-pedido {
                    width:
                        100%;
                }

                #modalAvaliacaoPedidoAzury {
                    padding:
                        10px;
                }

                #modalAvaliacaoPedidoAzury
                .avaliacao-conteudo {
                    padding:
                        20px 16px;
                }

                #modalAvaliacaoPedidoAzury
                .estrela-avaliacao {
                    font-size:
                        35px;
                }

                #modalAvaliacaoPedidoAzury
                .acoes-avaliacao {
                    display:
                        grid;

                    grid-template-columns:
                        1fr;
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }

    function garantirModalAvaliacaoPedido() {
    if (
        document.getElementById(
            "modalAvaliacaoPedidoAzury"
        )
    ) {
        return;
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "modalAvaliacaoPedidoAzury";

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.innerHTML = `
        <div
            class="avaliacao-conteudo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tituloAvaliacaoPedidoAzury"
        >

            <div class="avaliacao-topo">

                <div>

                    <h2 id="tituloAvaliacaoPedidoAzury">
                        Avalie seu pedido
                    </h2>

                    <p
                        class="avaliacao-subtitulo"
                        id="subtituloAvaliacaoPedidoAzury"
                    >
                        Sua opinião ajuda
                        a Azury a melhorar
                        cada pedido.
                    </p>

                </div>

                <button
                    type="button"
                    class="btn-fechar-avaliacao"
                    data-fechar-avaliacao
                    aria-label="Fechar"
                >
                    ×
                </button>

            </div>

            <div
                class="estrelas-avaliacao"
                role="radiogroup"
                aria-label="Nota do pedido"
            >

                ${
                    [1, 2, 3, 4, 5]
                        .map(
                            nota => `
                                <button
                                    type="button"
                                    class="estrela-avaliacao"
                                    data-nota-avaliacao="${nota}"
                                    role="radio"
                                    aria-checked="false"
                                    aria-label="${nota} estrela${
                                        nota > 1
                                            ? "s"
                                            : ""
                                    }"
                                >
                                    ★
                                </button>
                            `
                        )
                        .join("")
                }

            </div>

            <label for="comentarioAvaliacaoPedidoAzury">
                Comentário

                <span
                    style="
                        font-weight: 400;
                    "
                >
                    (opcional)
                </span>
            </label>

            <textarea
                id="comentarioAvaliacaoPedidoAzury"
                maxlength="500"
                placeholder="Conte como foi sua experiência com o pedido..."
            ></textarea>

            <div
                class="contador-avaliacao"
                id="contadorAvaliacaoPedidoAzury"
            >
                0/500
            </div>

            <p
                class="status-avaliacao"
                id="statusAvaliacaoPedidoAzury"
                aria-live="polite"
            ></p>

            <div class="acoes-avaliacao">

                <button
                    type="button"
                    class="btn-cancelar-avaliacao"
                    data-fechar-avaliacao
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    class="btn-salvar-avaliacao"
                    id="btnSalvarAvaliacaoPedidoAzury"
                >
                    Salvar avaliação
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(
        modal
    );
}

    function obterUsuarioPedidosAtual() {
        if (
            window.AzuryCliente?.usuario
        ) {
            return window
                .AzuryCliente
                .usuario;
        }

        if (usuarioAtual) {
            return usuarioAtual;
        }

        try {
            return JSON.parse(
                localStorage.getItem(
                    "clienteAzury"
                ) ||
                "null"
            );
        } catch (_) {
            return null;
        }
    }

    function salvarUsuarioPedidosLocal(
        usuario
    ) {
        if (!usuario) {
            return;
        }

        usuarioAtual =
            usuario;

        if (
            window.AzuryCliente
        ) {
            window
                .AzuryCliente
                .usuario =
                usuario;
        }

        try {
            localStorage.setItem(
                "clienteAzury",
                JSON.stringify(
                    usuario
                )
            );
        } catch (_) {
        }
    }

    function encontrarPedidoPorId(
        pedidoId
    ) {
        const usuario =
            obterUsuarioPedidosAtual();

        if (
            !usuario ||
            !Array.isArray(
                usuario.pedidos
            )
        ) {
            return null;
        }

        return (
            usuario.pedidos.find(
                pedido =>
                    obterIdRealPedido(
                        pedido
                    ) ===
                    String(
                        pedidoId
                    )
            ) ||
            null
        );
    }

    function gerarIdSacolaRepetida() {
        return (
            window.crypto
                ?.randomUUID?.() ||

            `repetido-${
                Date.now()
            }-${
                Math.random()
                    .toString(16)
                    .slice(2)
            }`
        );
    }

    function prepararItensPedidoParaSacola(
        pedido
    ) {
        const itens =
            Array.isArray(
                pedido?.itens
            )
                ? pedido.itens
                : [];

        return itens
            .map(
                item => {
                    const tamanho =
                        Number(
                            primeiroValor(
                                item,
                                [
                                    "tamanho_ml",
                                    "tamanho"
                                ],
                                0
                            )
                        );

                    if (
                        !Number.isFinite(
                            tamanho
                        ) ||
                        tamanho <= 0
                    ) {
                        return null;
                    }

                    const complementosOriginais =
                        Array.isArray(
                            item?.complementos
                        )
                            ? item.complementos
                            : [];

                    const complementos =
                        complementosOriginais
                            .map(
                                (
                                    complemento,
                                    indice
                                ) => {
                                    const nome =
                                        String(
                                            primeiroValor(
                                                complemento,
                                                [
                                                    "nome",
                                                    "complemento_nome"
                                                ],
                                                ""
                                            )
                                        ).trim();

                                    if (!nome) {
                                        return null;
                                    }

                                    const camadaOriginal =
                                        normalizarStatusPedido(
                                            primeiroValor(
                                                complemento,
                                                [
                                                    "camada"
                                                ],
                                                "meio"
                                            )
                                        );

                                    const camada =
                                        camadaOriginal ===
                                        "cobertura"
                                            ? "cobertura"

                                            : (
                                                camadaOriginal ===
                                                "ambos" ||
                                                camadaOriginal ===
                                                "unica"
                                            )
                                                ? "ambos"

                                                : "meio";

                                    return {
                                        nome,

                                        camada,

                                        ordem_selecao:
                                            Math.max(
                                                1,

                                                Number(
                                                    primeiroValor(
                                                        complemento,
                                                        [
                                                            "ordem_selecao",
                                                            "ordem"
                                                        ],
                                                        indice +
                                                        1
                                                    )
                                                ) ||
                                                indice +
                                                1
                                            )
                                    };
                                }
                            )
                            .filter(
                                Boolean
                            );

                    return {
                        id:
                            gerarIdSacolaRepetida(),

                        tamanho_ml:
                            tamanho,

                        quantidade:
                            Math.max(
                                1,

                                Number(
                                    item
                                        ?.quantidade
                                ) ||
                                1
                            ),

                        preco_unitario:
                            0,

                        complementos
                    };
                }
            )
            .filter(
                Boolean
            );
    }

    function repetirPedidoAnterior(
        pedido
    ) {
        const itens =
            Array.isArray(
                pedido?.itens
            )
                ? pedido.itens
                : [];

        const primeiroItemValido =
            itens.find(item => {
                const tamanho =
                    Number(
                        primeiroValor(
                            item,
                            [
                                "tamanho_ml",
                                "tamanho"
                            ],
                            0
                        )
                    );

                return (
                    Number.isFinite(tamanho) &&
                    tamanho > 0
                );
            });

        if (!primeiroItemValido) {
            alert(
                "Não foi possível identificar o tamanho deste pedido."
            );

            return;
        }

        const tamanho =
            Number(
                primeiroValor(
                    primeiroItemValido,
                    [
                        "tamanho_ml",
                        "tamanho"
                    ],
                    0
                )
            );

        let sacolaAtual =
            [];

        try {
            sacolaAtual =
                JSON.parse(
                    sessionStorage
                        .getItem(
                            CART_KEY
                        ) ||
                    "[]"
                );
        } catch (_) {
            sacolaAtual =
                [];
        }

        

        try {
            /*
             * PEDIR NOVAMENTE:
             * não coloca o pedido antigo pronto
             * dentro da sacola.
             *
             * A sacola começa vazia e o cliente
             * escolhe novamente os complementos.
             */
            sessionStorage
                .removeItem(
                    CART_KEY
                );

            /*
             * Guarda somente o tamanho do pedido
             * anterior para o cardápio abrir o
             * montador já no tamanho correto.
             */
            sessionStorage
                .setItem(
                    "azuryPedidoRepetido",

                    JSON.stringify(
                        {
                            pedido_id:
                                obterIdRealPedido(
                                    pedido
                                ),

                            codigo:
                                pedido?.codigo ||
                                pedido?.id ||
                                "",

                            tamanho_ml:
                                tamanho,

                            criado_em:
                                new Date()
                                    .toISOString()
                        }
                    )
                );

        } catch (erro) {
            console.error(
                "Erro ao preparar pedido novamente:",
                erro
            );

            alert(
                "Não foi possível abrir este pedido novamente."
            );

            return;
        }

        window.location.href =
            "index.html#Cardapio";
    }


    function atualizarEstrelasAvaliacao() {
        document
            .querySelectorAll(
                "#modalAvaliacaoPedidoAzury [data-nota-avaliacao]"
            )
            .forEach(
                botao => {
                    const nota =
                        Number(
                            botao
                                .dataset
                                .notaAvaliacao
                        ) ||
                        0;

                    const selecionada =
                        nota <=
                        notaAvaliacao;

                    botao
                        .classList
                        .toggle(
                            "selecionada",
                            selecionada
                        );

                    botao
                        .setAttribute(
                            "aria-checked",

                            nota ===
                            notaAvaliacao
                                ? "true"
                                : "false"
                        );
                }
            );
    }

    function fecharModalAvaliacaoPedido() {
        const modal =
            document
                .getElementById(
                    "modalAvaliacaoPedidoAzury"
                );

        if (!modal) {
            return;
        }

        modal
            .classList
            .remove(
                "visivel"
            );

        modal
            .setAttribute(
                "aria-hidden",
                "true"
            );

        document
            .body
            .style
            .overflow =
            "";

        pedidoAvaliandoId =
            "";
    }

    function abrirModalAvaliacaoPedido(
        pedido
    ) {
        if (
            !pedido ||
            !pedidoEstaEntregue(
                pedido
            )
        ) {
            return;
        }

        garantirModalAvaliacaoPedido();

        const modal =
            document
                .getElementById(
                    "modalAvaliacaoPedidoAzury"
                );

        const comentario =
            document
                .getElementById(
                    "comentarioAvaliacaoPedidoAzury"
                );

        const contador =
            document
                .getElementById(
                    "contadorAvaliacaoPedidoAzury"
                );

        const status =
            document
                .getElementById(
                    "statusAvaliacaoPedidoAzury"
                );

        const subtitulo =
            document
                .getElementById(
                    "subtituloAvaliacaoPedidoAzury"
                );

        const avaliacao =
            pedido?.avaliacao ||
            null;

        pedidoAvaliandoId =
            obterIdRealPedido(
                pedido
            );

        notaAvaliacao =
            Math.max(
                0,

                Math.min(
                    5,

                    Number(
                        avaliacao
                            ?.nota
                    ) ||
                    0
                )
            );

        if (comentario) {
            comentario.value =
                String(
                    avaliacao
                        ?.comentario ||
                    ""
                );
        }

        if (contador) {
            contador.textContent =
                `${
                    comentario
                        ?.value
                        .length ||
                    0
                }/500`;
        }

        if (status) {
            status.textContent =
                "";

            status.className =
                "status-avaliacao";
        }

        if (subtitulo) {
            subtitulo.textContent =
                avaliacao
                    ? `Você já avaliou o pedido ${
                        pedido?.codigo ||
                        pedido?.id ||
                        ""
                    }. Pode editar sua avaliação.`

                    : `Como foi sua experiência com o pedido ${
                        pedido?.codigo ||
                        pedido?.id ||
                        ""
                    }?`;
        }

        atualizarEstrelasAvaliacao();

        modal
            .classList
            .add(
                "visivel"
            );

        modal
            .setAttribute(
                "aria-hidden",
                "false"
            );

        document
            .body
            .style
            .overflow =
            "hidden";
    }

    async function salvarAvaliacaoPedido() {
        const pedido =
            encontrarPedidoPorId(
                pedidoAvaliandoId
            );

        const contexto =
            window.AzuryCliente ||
            {};

        const supabase =
            contexto.supabase ||
            window.azurySupabase;

        const clienteId =
            contexto.session
                ?.user
                ?.id ||
            contexto.usuario
                ?.id ||
            "";

        const comentario =
            document
                .getElementById(
                    "comentarioAvaliacaoPedidoAzury"
                );

        const status =
            document
                .getElementById(
                    "statusAvaliacaoPedidoAzury"
                );

        const botao =
            document
                .getElementById(
                    "btnSalvarAvaliacaoPedidoAzury"
                );

        if (
            !pedido ||
            !pedidoEstaEntregue(
                pedido
            )
        ) {
            return;
        }

        if (
            !supabase ||
            !clienteId
        ) {
            if (status) {
                status.textContent =
                    "Sua sessão não está disponível. Atualize a página e tente novamente.";

                status.className =
                    "status-avaliacao erro";
            }

            return;
        }

        if (
            notaAvaliacao < 1 ||
            notaAvaliacao > 5
        ) {
            if (status) {
                status.textContent =
                    "Escolha de 1 a 5 estrelas.";

                status.className =
                    "status-avaliacao erro";
            }

            return;
        }

        const pedidoId =
            obterIdRealPedido(
                pedido
            );

        const textoComentario =
            String(
                comentario
                    ?.value ||
                ""
            )
                .trim()
                .slice(
                    0,
                    500
                );

        if (botao) {
            botao.disabled =
                true;

            botao.textContent =
                "Salvando...";
        }

        if (status) {
            status.textContent =
                "Salvando sua avaliação...";

            status.className =
                "status-avaliacao";
        }

        try {
            const agora =
                new Date()
                    .toISOString();

            const {
                data,
                error
            } =
                await supabase
                    .from(
                        REVIEWS_TABLE
                    )
                    .upsert(
                        {
                            pedido_id:
                                pedidoId,

                            cliente_id:
                                clienteId,

                            nota:
                                notaAvaliacao,

                            comentario:
                                textoComentario ||
                                null,

                            atualizado_em:
                                agora
                        },

                        {
                            onConflict:
                                "pedido_id,cliente_id"
                        }
                    )
                    .select(
                        "pedido_id,nota,comentario,criado_em,atualizado_em"
                    )
                    .single();

            if (error) {
                throw error;
            }

            pedido.avaliacao =
                data ||
                {
                    pedido_id:
                        pedidoId,

                    nota:
                        notaAvaliacao,

                    comentario:
                        textoComentario ||
                        null,

                    atualizado_em:
                        agora
                };

            const usuario =
                obterUsuarioPedidosAtual();

            salvarUsuarioPedidosLocal(
                usuario
            );

            renderizarPedidosRecentes(
                usuario
            );

            if (
                typeof window.renderizarTodosPedidos ===
                "function"
            ) {
                const listaTodos =
                    document
                        .getElementById(
                            "listaTodosPedidos"
                        );

                if (
                    listaTodos &&
                    listaTodos
                        .innerHTML
                        .trim()
                ) {
                    window
                        .renderizarTodosPedidos(
                            usuario
                        );
                }
            }

            if (status) {
                status.textContent =
                    "Avaliação salva. Obrigado! 💙";

                status.className =
                    "status-avaliacao sucesso";
            }

            window
                .setTimeout(
                    fecharModalAvaliacaoPedido,
                    650
                );

        } catch (erro) {
            console.error(
                "Erro ao salvar avaliação do pedido:",
                erro
            );

            if (status) {
                status.textContent =
                    erro?.message ||
                    "Não foi possível salvar sua avaliação.";

                status.className =
                    "status-avaliacao erro";
            }

        } finally {
            if (botao) {
                botao.disabled =
                    false;

                botao.textContent =
                    "Salvar avaliação";
            }
        }
    }

    async function carregarAvaliacoesPedidos(
        usuario
    ) {
        const contexto =
            window.AzuryCliente ||
            {};

        const supabase =
            contexto.supabase ||
            window.azurySupabase;

        const clienteId =
            contexto.session
                ?.user
                ?.id ||
            usuario?.id ||
            "";

        if (
            !supabase ||
            !clienteId ||
            !Array.isArray(
                usuario?.pedidos
            )
        ) {
            return;
        }

        try {
            const {
                data,
                error
            } =
                await supabase
                    .from(
                        REVIEWS_TABLE
                    )
                    .select(
                        "pedido_id,nota,comentario,criado_em,atualizado_em"
                    )
                    .eq(
                        "cliente_id",
                        clienteId
                    );

            if (error) {
                throw error;
            }

            const mapa =
                new Map(
                    (
                        data ||
                        []
                    )
                        .map(
                            avaliacao => [
                                String(
                                    avaliacao
                                        .pedido_id
                                ),

                                avaliacao
                            ]
                        )
                );

            usuario.pedidos
                .forEach(
                    pedido => {
                        pedido.avaliacao =
                            mapa.get(
                                obterIdRealPedido(
                                    pedido
                                )
                            ) ||
                            null;
                    }
                );

            salvarUsuarioPedidosLocal(
                usuario
            );

            renderizarPedidosRecentes(
                usuario
            );

        } catch (erro) {
            console.warn(
                "Não foi possível carregar as avaliações dos pedidos.",
                erro
            );
        }
    }

    function renderizarPedidosRecentes(
        usuario
    ) {
        const pedidosDiv =
            document
                .getElementById(
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

        pedidosDiv.innerHTML =
            usuario.pedidos
                .slice(
                    0,
                    3
                )
                .map(
                    criarHtmlPedido
                )
                .join("");
    }

    function conectarEventosPedidosCliente() {
        if (
            eventosConectados
        ) {
            return;
        }

        eventosConectados =
            true;

        document.addEventListener(
            "click",

            event => {
                const acao =
                    event.target
                        .closest?.(
                            "[data-acao-pedido]"
                        );

                if (acao) {
                    const pedido =
                        encontrarPedidoPorId(
                            acao
                                .dataset
                                .pedidoId ||
                            ""
                        );

                    if (!pedido) {
                        return;
                    }

                    if (
                        acao
                            .dataset
                            .acaoPedido ===
                        "repetir"
                    ) {
                        repetirPedidoAnterior(
                            pedido
                        );

                        return;
                    }

                    if (
                        acao
                            .dataset
                            .acaoPedido ===
                        "avaliar"
                    ) {
                        abrirModalAvaliacaoPedido(
                            pedido
                        );

                        return;
                    }
                }

                if (
                    event.target
                        .closest?.(
                            "#modalAvaliacaoPedidoAzury [data-fechar-avaliacao]"
                        )
                ) {
                    fecharModalAvaliacaoPedido();

                    return;
                }

                const estrela =
                    event.target
                        .closest?.(
                            "#modalAvaliacaoPedidoAzury [data-nota-avaliacao]"
                        );

                if (estrela) {
                    notaAvaliacao =
                        Number(
                            estrela
                                .dataset
                                .notaAvaliacao
                        ) ||
                        0;

                    atualizarEstrelasAvaliacao();

                    return;
                }

                if (
                    event.target?.id ===
                    "btnSalvarAvaliacaoPedidoAzury"
                ) {
                    salvarAvaliacaoPedido();

                    return;
                }

                const modal =
                    document
                        .getElementById(
                            "modalAvaliacaoPedidoAzury"
                        );

                if (
                    modal &&
                    event.target === modal
                ) {
                    fecharModalAvaliacaoPedido();
                }
            }
        );

        document.addEventListener(
            "input",

            event => {
                if (
                    event.target?.id !==
                    "comentarioAvaliacaoPedidoAzury"
                ) {
                    return;
                }

                const contador =
                    document
                        .getElementById(
                            "contadorAvaliacaoPedidoAzury"
                        );

                if (contador) {
                    contador.textContent =
                        `${
                            event
                                .target
                                .value
                                .length
                        }/500`;
                }
            }
        );

        document.addEventListener(
            "keydown",

            event => {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                const modal =
                    document
                        .getElementById(
                            "modalAvaliacaoPedidoAzury"
                        );

                if (
                    modal
                        ?.classList
                        .contains(
                            "visivel"
                        )
                ) {
                    fecharModalAvaliacaoPedido();
                }
            }
        );
    }

    function inicializarPedidos(usuario) {
        usuarioAtual =
            usuario;

        garantirEstilosPedidosCliente();

        garantirModalAvaliacaoPedido();

        conectarEventosPedidosCliente();

        renderizarPedidosRecentes(
            usuario
        );

        carregarAvaliacoesPedidos(
            usuario
        );
    }

    window.criarHtmlPedido =
        criarHtmlPedido;

    window.inicializarPedidos =
        inicializarPedidos;

})();