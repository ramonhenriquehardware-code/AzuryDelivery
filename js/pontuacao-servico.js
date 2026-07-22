(function () {
    "use strict";

    const VALOR_POR_BLOCO = 30;
    const TOLERANCIA = 0.99;
    const PONTOS_POR_BLOCO = 15;

    function converterValorParaNumero(valor) {
        if (typeof valor === "number") {
            return Number.isFinite(valor) ? valor : 0;
        }

        if (typeof valor !== "string") {
            return 0;
        }

        let valorLimpo = valor
            .replace(/\s/g, "")
            .replace("R$", "");

        if (
            valorLimpo.includes(".") &&
            valorLimpo.includes(",")
        ) {
            valorLimpo = valorLimpo
                .replace(/\./g, "")
                .replace(",", ".");
        } else {
            valorLimpo = valorLimpo.replace(",", ".");
        }

        const numero = Number(valorLimpo);

        return Number.isFinite(numero) ? numero : 0;
    }

    function calcularPontosPorValor(valorPedido) {
        const valor = Math.max(
            0,
            converterValorParaNumero(valorPedido)
        );

        const valorMinimo =
            VALOR_POR_BLOCO - TOLERANCIA;

        if (valor < valorMinimo) {
            return 0;
        }

        const quantidadeDeBlocos = Math.floor(
            (
                valor +
                TOLERANCIA +
                Number.EPSILON
            ) / VALOR_POR_BLOCO
        );

        return quantidadeDeBlocos * PONTOS_POR_BLOCO;
    }

    function calcularNivel(
        pontosAcumulados
    ) {
        const pontos = Number(
            pontosAcumulados
        ) || 0;

        if (pontos >= 600) {
            return "Diamante";
        }

        if (pontos >= 300) {
            return "Ouro";
        }

        if (pontos >= 100) {
            return "Prata";
        }

        return "Bronze";
    }

    function normalizarStatus(status) {
        return String(status || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function pedidoFoiEntregue(pedido) {
        const status =
            normalizarStatus(
                pedido?.status
            );

        return (
            status === "entregue" ||
            status === "pedido entregue"
        );
    }

    function obterValorDoPedido(pedido) {
        return (
            pedido?.valorTotal ??
            pedido?.total ??
            pedido?.valor ??
            0
        );
    }

    function obterDataHoraAtual() {
        return new Date().toLocaleString(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );
    }

    function salvarCliente(cliente) {
        localStorage.setItem(
            "clienteAzury",
            JSON.stringify(cliente)
        );

        const sessaoSalva =
            localStorage.getItem(
                "usuarioAzury"
            );

        if (!sessaoSalva) {
            return;
        }

        try {
            const sessao =
                JSON.parse(sessaoSalva);

            const mesmoCliente =
                !sessao.email ||
                !cliente.email ||
                sessao.email ===
                    cliente.email;

            if (!mesmoCliente) {
                return;
            }

            localStorage.setItem(
                "usuarioAzury",
                JSON.stringify({
                    ...cliente,
                    autenticado:
                        sessao.autenticado
                            !== false
                })
            );
        } catch (erro) {
            console.error(
                "Não foi possível atualizar a sessão:",
                erro
            );
        }
    }

    function creditarPontosDoPedido(
        cliente,
        pedido
    ) {
        if (
            !cliente ||
            typeof cliente !== "object"
        ) {
            throw new Error(
                "Cliente inválido."
            );
        }

        if (
            !pedido ||
            typeof pedido !== "object"
        ) {
            throw new Error(
                "Pedido inválido."
            );
        }

        if (!pedidoFoiEntregue(pedido)) {
            return {
                creditado: false,
                motivo:
                    "O pedido ainda não foi entregue.",
                pontos: 0
            };
        }

        if (pedido.pontosCreditados) {
            return {
                creditado: false,
                motivo:
                    "Os pontos deste pedido já foram creditados.",
                pontos:
                    Number(
                        pedido.pontosGerados
                    ) || 0
            };
        }

        const valorPedido =
            converterValorParaNumero(
                obterValorDoPedido(pedido)
            );

        const pedidoDeRecompensa =
            pedido.tipo === "recompensa";

        const pontosGerados =
            pedidoDeRecompensa
                ? 0
                : calcularPontosPorValor(
                      valorPedido
                  );

        cliente.pontosAcumulados =
            Number(
                cliente.pontosAcumulados
            ) || 0;

        cliente.saldoPontos =
            Number(
                cliente.saldoPontos
            ) || 0;

        cliente.historico =
            Array.isArray(
                cliente.historico
            )
                ? cliente.historico
                : [];

        if (pontosGerados > 0) {
            cliente.pontosAcumulados +=
                pontosGerados;

            cliente.saldoPontos +=
                pontosGerados;

            cliente.pontos =
                cliente.saldoPontos;

            cliente.nivel =
                calcularNivel(
                    cliente
                        .pontosAcumulados
                );

            cliente.historico.unshift(`
                ⭐ Recebeu ${pontosGerados} pontos pelo pedido
                ${pedido.id ? `#${pedido.id}` : ""}

                <br>

                💰 Valor do pedido:
                R$ ${valorPedido.toFixed(2).replace(".", ",")}

                <br>

                <small>
                    ${obterDataHoraAtual()}
                </small>
            `);
        }

        pedido.pontosCreditados = true;
        pedido.pontosGerados =
            pontosGerados;
        pedido.dataCreditoPontos =
            new Date().toISOString();

        salvarCliente(cliente);

        return {
            creditado:
                pontosGerados > 0,
            motivo:
                pontosGerados > 0
                    ? "Pontos creditados com sucesso."
                    : "O pedido não gerou pontos.",
            pontos: pontosGerados
        };
    }

    window.AzuryPontuacao = {
        converterValorParaNumero,
        calcularPontosPorValor,
        calcularNivel,
        pedidoFoiEntregue,
        creditarPontosDoPedido
    };
})();