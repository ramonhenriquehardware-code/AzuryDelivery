(function () {
    "use strict";

    const STATUS_VALIDOS = [
        "Pedido recebido",
        "Em preparo",
        "Pronto",
        "Saiu para entrega",
        "Entregue",
        "Cancelado"
    ];

    function normalizarTexto(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function obterCliente() {
        const clienteSalvo =
            localStorage.getItem("clienteAzury");

        if (!clienteSalvo) {
            throw new Error(
                "Nenhum cliente cadastrado foi encontrado."
            );
        }

        try {
            const cliente =
                JSON.parse(clienteSalvo);

            cliente.pedidos =
                Array.isArray(cliente.pedidos)
                    ? cliente.pedidos
                    : [];

            cliente.historico =
                Array.isArray(cliente.historico)
                    ? cliente.historico
                    : [];

            return cliente;
        } catch (erro) {
            throw new Error(
                "Os dados do cliente estão inválidos."
            );
        }
    }

    function salvarCliente(cliente) {
        localStorage.setItem(
            "clienteAzury",
            JSON.stringify(cliente)
        );

        const sessaoSalva =
            localStorage.getItem("usuarioAzury");

        if (!sessaoSalva) {
            return;
        }

        try {
            const sessao =
                JSON.parse(sessaoSalva);

            const mesmoCliente =
                !sessao.email ||
                !cliente.email ||
                sessao.email === cliente.email;

            if (!mesmoCliente) {
                return;
            }

            localStorage.setItem(
                "usuarioAzury",
                JSON.stringify({
                    ...cliente,
                    autenticado:
                        sessao.autenticado !== false
                })
            );
        } catch (erro) {
            console.error(
                "Não foi possível atualizar a sessão:",
                erro
            );
        }
    }

    function converterValor(valor) {
        if (
            window.AzuryPontuacao &&
            typeof window.AzuryPontuacao
                .converterValorParaNumero ===
                "function"
        ) {
            return window.AzuryPontuacao
                .converterValorParaNumero(valor);
        }

        if (typeof valor === "number") {
            return Number.isFinite(valor)
                ? valor
                : 0;
        }

        const valorLimpo =
            String(valor || "")
                .replace(/\s/g, "")
                .replace("R$", "")
                .replace(/\./g, "")
                .replace(",", ".");

        const numero = Number(valorLimpo);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function formatarValor(valor) {
        return converterValor(valor)
            .toFixed(2)
            .replace(".", ",");
    }

    function gerarIdPedido() {
        const agora = new Date();

        const data =
            agora
                .toISOString()
                .slice(0, 10)
                .replace(/-/g, "");

        const hora =
            agora
                .toTimeString()
                .slice(0, 8)
                .replace(/:/g, "");

        const aleatorio =
            Math.random()
                .toString(36)
                .slice(2, 6)
                .toUpperCase();

        return `AZY-${data}-${hora}-${aleatorio}`;
    }

    function resolverStatus(status) {
        const statusNormalizado =
            normalizarTexto(status);

        const statusEncontrado =
            STATUS_VALIDOS.find(
                statusValido =>
                    normalizarTexto(
                        statusValido
                    ) === statusNormalizado
            );

        if (!statusEncontrado) {
            throw new Error(
                `Status inválido: ${status}`
            );
        }

        return statusEncontrado;
    }

    function criarPedido(dadosPedido = {}) {
        const cliente = obterCliente();

        const valorTotal =
            converterValor(
                dadosPedido.valorTotal ??
                dadosPedido.total ??
                dadosPedido.valor ??
                0
            );

        const agora = new Date();

        const pedido = {
            id:
                dadosPedido.id ||
                gerarIdPedido(),

            tipo:
                dadosPedido.tipo ||
                "compra",

            produto:
                dadosPedido.produto ||
                "Pedido Azury",

            itens:
                Array.isArray(
                    dadosPedido.itens
                )
                    ? dadosPedido.itens
                    : [],

            tamanho:
                dadosPedido.tamanho ||
                "",

            quantidade:
                Math.max(
                    1,
                    Number(
                        dadosPedido.quantidade
                    ) || 1
                ),

            complementos:
                Array.isArray(
                    dadosPedido.complementos
                )
                    ? dadosPedido.complementos
                    : [],

            valorTotal,

            valor:
                formatarValor(valorTotal),

            status:
                dadosPedido.status
                    ? resolverStatus(
                          dadosPedido.status
                      )
                    : "Pedido recebido",

            pontosCreditados: false,
            pontosGerados: 0,
            dataCreditoPontos: null,

            data:
                agora.toLocaleDateString(
                    "pt-BR"
                ),

            criadoEm:
                agora.toISOString(),

            atualizadoEm:
                agora.toISOString(),

            historicoStatus: [
                {
                    status:
                        dadosPedido.status
                            ? resolverStatus(
                                  dadosPedido.status
                              )
                            : "Pedido recebido",

                    data:
                        agora.toISOString()
                }
            ]
        };

        const pedidoDuplicado =
            cliente.pedidos.some(
                pedidoExistente =>
                    pedidoExistente.id ===
                    pedido.id
            );

        if (pedidoDuplicado) {
            throw new Error(
                "Já existe um pedido com este código."
            );
        }

        cliente.pedidos.unshift(pedido);

        cliente.historico.unshift(`
            🛍️ Pedido ${pedido.id} realizado

            <br>

            💰 Valor:
            R$ ${pedido.valor}

            <br>

            🟡 Status:
            ${pedido.status}

            <br>

            <small>
                ${agora.toLocaleString("pt-BR")}
            </small>
        `);

        salvarCliente(cliente);

        return pedido;
    }

    function buscarPedidoPorId(idPedido) {
        const cliente = obterCliente();

        return (
            cliente.pedidos.find(
                pedido =>
                    String(pedido.id) ===
                    String(idPedido)
            ) || null
        );
    }

    function listarPedidos() {
        const cliente = obterCliente();

        return [...cliente.pedidos];
    }

    function atualizarStatusPedido(
        idPedido,
        novoStatus
    ) {
        const cliente = obterCliente();

        const pedido =
            cliente.pedidos.find(
                item =>
                    String(item.id) ===
                    String(idPedido)
            );

        if (!pedido) {
            throw new Error(
                "Pedido não encontrado."
            );
        }

        const statusResolvido =
            resolverStatus(novoStatus);

        const agora = new Date();

        pedido.status =
            statusResolvido;

        pedido.atualizadoEm =
            agora.toISOString();

        pedido.historicoStatus =
            Array.isArray(
                pedido.historicoStatus
            )
                ? pedido.historicoStatus
                : [];

        const ultimoStatus =
            pedido.historicoStatus[
                pedido.historicoStatus.length - 1
            ];

        if (
            !ultimoStatus ||
            ultimoStatus.status !==
                statusResolvido
        ) {
            pedido.historicoStatus.push({
                status:
                    statusResolvido,

                data:
                    agora.toISOString()
            });
        }

        let resultadoPontuacao = null;

        if (
            statusResolvido ===
            "Entregue"
        ) {
            if (
                !window.AzuryPontuacao ||
                typeof window.AzuryPontuacao
                    .creditarPontosDoPedido !==
                    "function"
            ) {
                throw new Error(
                    "O serviço de pontuação não foi carregado."
                );
            }

            resultadoPontuacao =
                window.AzuryPontuacao
                    .creditarPontosDoPedido(
                        cliente,
                        pedido
                    );
        } else {
            salvarCliente(cliente);
        }

        return {
            pedido,
            resultadoPontuacao
        };
    }

    function cancelarPedido(idPedido) {
        return atualizarStatusPedido(
            idPedido,
            "Cancelado"
        );
    }

    window.AzuryPedidos = {
        STATUS_VALIDOS,
        criarPedido,
        buscarPedidoPorId,
        listarPedidos,
        atualizarStatusPedido,
        cancelarPedido
    };
})();