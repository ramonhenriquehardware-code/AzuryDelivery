document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    let sessao = null;
    let usuario = null;


    /* =====================================
       FUNÇÕES AUXILIARES
    ====================================== */

    function lerJSON(chave) {
        const valorSalvo =
            localStorage.getItem(chave);

        if (!valorSalvo) {
            return null;
        }

        try {
            return JSON.parse(valorSalvo);

        } catch (erro) {
            console.error(
                `Erro ao ler ${chave}:`,
                erro
            );

            return null;
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

        const texto =
            String(valor ?? "")
                .trim()
                .replace(/\s/g, "")
                .replace("R$", "");

        if (!texto) {
            return 0;
        }

        let valorLimpo =
            texto;

        if (
            valorLimpo.includes(".") &&
            valorLimpo.includes(",")
        ) {
            valorLimpo = valorLimpo
                .replace(/\./g, "")
                .replace(",", ".");

        } else {
            valorLimpo =
                valorLimpo.replace(",", ".");
        }

        const numero =
            Number(valorLimpo);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }


    function formatarValorSimples(valor) {
        return converterValor(valor)
            .toFixed(2)
            .replace(".", ",");
    }


    function normalizarPedido(pedido) {
        const pedidoSeguro =
            pedido &&
            typeof pedido === "object"
                ? { ...pedido }
                : {};

        const taxaEntrega =
            Math.max(
                0,

                converterValor(
                    pedidoSeguro.taxaEntrega ??
                    pedidoSeguro.entrega ??
                    0
                )
            );

        const totalInformado =
            Math.max(
                0,

                converterValor(
                    pedidoSeguro.valorTotal ??
                    pedidoSeguro.total ??
                    pedidoSeguro.valor ??
                    0
                )
            );

        const produtosInformados =
            Math.max(
                0,

                converterValor(
                    pedidoSeguro.valorProdutos ??
                    pedidoSeguro.subtotal ??
                    pedidoSeguro.valorPedido ??
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

        const enderecoOriginal =
            pedidoSeguro.enderecoEntrega &&
            typeof pedidoSeguro.enderecoEntrega ===
                "object"
                ? pedidoSeguro.enderecoEntrega
                : {};

        return {
            ...pedidoSeguro,

            itens:
                Array.isArray(
                    pedidoSeguro.itens
                )
                    ? pedidoSeguro.itens
                    : [],

            complementos:
                Array.isArray(
                    pedidoSeguro.complementos
                )
                    ? pedidoSeguro.complementos
                    : [],

            formaPagamento:
                String(
                    pedidoSeguro.formaPagamento ||
                    pedidoSeguro.pagamento ||
                    ""
                ).trim(),

            enderecoEntrega: {
                cep:
                    String(
                        enderecoOriginal.cep ||
                        ""
                    ).trim(),

                rua:
                    String(
                        enderecoOriginal.rua ||
                        ""
                    ).trim(),

                numero:
                    String(
                        enderecoOriginal.numero ||
                        ""
                    ).trim(),

                bairro:
                    String(
                        enderecoOriginal.bairro ||
                        ""
                    ).trim(),

                complemento:
                    String(
                        enderecoOriginal.complemento ||
                        ""
                    ).trim(),

                validado:
                    enderecoOriginal.validado ===
                    true
            },

            valorProdutos,

            subtotal:
                valorProdutos,

            taxaEntrega,

            valorTotal,

            valor:
                formatarValorSimples(
                    valorTotal
                ),

            valorProdutosFormatado:
                formatarValorSimples(
                    valorProdutos
                ),

            taxaEntregaFormatada:
                formatarValorSimples(
                    taxaEntrega
                ),

            valorPontuavel:
                Math.max(
                    0,

                    converterValor(
                        pedidoSeguro.valorPontuavel ??
                        valorProdutos
                    )
                ),

            pontosCreditados:
                pedidoSeguro.pontosCreditados ===
                true,

            pontosGerados:
                Math.max(
                    0,

                    Number(
                        pedidoSeguro.pontosGerados
                    ) || 0
                ),

            historicoStatus:
                Array.isArray(
                    pedidoSeguro.historicoStatus
                )
                    ? pedidoSeguro.historicoStatus
                    : []
        };
    }


    function executarInicializador(
        nomeDaFuncao,
        dados
    ) {
        const funcao =
            window[nomeDaFuncao];

        if (
            typeof funcao ===
            "function"
        ) {
            funcao(dados);

            return;
        }

        console.warn(
            `A função ${nomeDaFuncao} não foi encontrada.`
        );
    }


    /* =====================================
       LER DADOS SALVOS
    ====================================== */

    sessao =
        lerJSON("usuarioAzury");

    usuario =
        lerJSON("clienteAzury");


    /* =====================================
       PROTEGER A ÁREA DO CLIENTE
    ====================================== */

    const sessaoValida =
        Boolean(
            sessao &&
            sessao.autenticado === true &&
            sessao.email
        );

    if (!sessaoValida) {
        localStorage.removeItem(
            "usuarioAzury"
        );

        window.location.replace(
            "login.html"
        );

        return;
    }


    /*
     * Caso os dados principais do cliente
     * não existam, utiliza os dados da sessão.
     */
    if (
        !usuario ||
        typeof usuario !==
            "object"
    ) {
        usuario = {
            ...sessao
        };
    }


    /* =====================================
       VALIDAR A CONTA DA SESSÃO
    ====================================== */

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
        emailUsuario !==
            emailSessao
    ) {
        localStorage.removeItem(
            "usuarioAzury"
        );

        window.location.replace(
            "login.html"
        );

        return;
    }

    usuario.email =
        emailSessao ||
        emailUsuario;

    if (
        !usuario.nome &&
        sessao.nome
    ) {
        usuario.nome =
            sessao.nome;
    }


    /* =====================================
       BOTÃO SAIR
    ====================================== */

    const btnSair =
        document.getElementById(
            "btnSair"
        );

    btnSair?.addEventListener(
        "click",
        () => {
            /*
             * Remove somente a sessão.
             * A conta continua salva.
             */
            localStorage.removeItem(
                "usuarioAzury"
            );

            window.location.replace(
                "index.html"
            );
        }
    );


    /* =====================================
       CONVERTER CONTAS ANTIGAS
    ====================================== */

    const pontosAntigos =
        Number.isFinite(
            Number(usuario.pontos)
        )
            ? Math.max(
                0,

                Math.trunc(
                    Number(usuario.pontos)
                )
            )
            : 0;


    /*
     * Pontos acumulados determinam o nível
     * e nunca diminuem.
     */
    if (
        usuario.pontosAcumulados ===
            undefined ||
        !Number.isFinite(
            Number(
                usuario.pontosAcumulados
            )
        )
    ) {
        usuario.pontosAcumulados =
            pontosAntigos;

    } else {
        usuario.pontosAcumulados =
            Math.max(
                0,

                Math.trunc(
                    Number(
                        usuario.pontosAcumulados
                    )
                )
            );
    }


    /*
     * Saldo de pontos diminui quando uma
     * recompensa é resgatada.
     */
    if (
        usuario.saldoPontos ===
            undefined ||
        !Number.isFinite(
            Number(
                usuario.saldoPontos
            )
        )
    ) {
        usuario.saldoPontos =
            pontosAntigos;

    } else {
        usuario.saldoPontos =
            Math.max(
                0,

                Math.trunc(
                    Number(
                        usuario.saldoPontos
                    )
                )
            );
    }


    /*
     * Compatibilidade temporária com
     * códigos antigos.
     */
    usuario.pontos =
        usuario.saldoPontos;


    /* =====================================
       DEFINIR O NÍVEL
    ====================================== */

    if (
        window.AzuryPontuacao &&
        typeof window.AzuryPontuacao
            .calcularNivel ===
            "function"
    ) {
        usuario.nivel =
            window.AzuryPontuacao
                .calcularNivel(
                    usuario.pontosAcumulados
                );

    } else {
        const totalAcumulado =
            usuario.pontosAcumulados;

        let nivel =
            "Bronze";

        if (
            totalAcumulado >=
            100
        ) {
            nivel = "Prata";
        }

        if (
            totalAcumulado >=
            300
        ) {
            nivel = "Ouro";
        }

        if (
            totalAcumulado >=
            600
        ) {
            nivel = "Diamante";
        }

        usuario.nivel =
            nivel;
    }


    /* =====================================
       ESTRUTURA E MIGRAÇÃO DOS PEDIDOS
    ====================================== */

    if (
        !Array.isArray(
            usuario.pedidos
        )
    ) {
        usuario.pedidos =
            [];

    } else {
        /*
         * Remove somente o pedido falso
         * usado anteriormente como exemplo.
         */
        usuario.pedidos =
            usuario.pedidos
                .filter(
                    pedido => {
                        const pedidoTeste =
                            pedido &&
                            pedido.produto ===
                                "Azury Supreme" &&
                            pedido.valor ===
                                "29,99" &&
                            pedido.data ===
                                "18/07/2026" &&
                            pedido.status ===
                                "Entregue";

                        return !pedidoTeste;
                    }
                )
                .map(
                    normalizarPedido
                );
    }


    /* =====================================
       OUTRAS ESTRUTURAS
    ====================================== */

    usuario.historico =
        Array.isArray(
            usuario.historico
        )
            ? usuario.historico
            : [];

    usuario.recompensasResgatadas =
        Array.isArray(
            usuario.recompensasResgatadas
        )
            ? usuario.recompensasResgatadas
            : [];

    usuario.codigosDesconto =
        Array.isArray(
            usuario.codigosDesconto
        )
            ? usuario.codigosDesconto
            : [];


    /* =====================================
       CONTROLE MENSAL DOS RESGATES
    ====================================== */

    const agora =
        new Date();

    const mesAtual =
        `${agora.getFullYear()}-` +
        `${String(
            agora.getMonth() + 1
        ).padStart(2, "0")}`;


    if (
        !usuario.controleResgates ||
        typeof usuario.controleResgates !==
            "object" ||
        usuario.controleResgates
            .mesReferencia !==
            mesAtual
    ) {
        usuario.controleResgates = {
            mesReferencia:
                mesAtual,

            recompensa100:
                0,

            recompensa300:
                0
        };

    } else {
        usuario.controleResgates
            .recompensa100 =
            Number(
                usuario.controleResgates
                    .recompensa100
            ) || 0;

        usuario.controleResgates
            .recompensa300 =
            Number(
                usuario.controleResgates
                    .recompensa300
            ) || 0;
    }


    /* =====================================
       SALVAR OS DADOS ATUALIZADOS
    ====================================== */

    localStorage.setItem(
        "clienteAzury",
        JSON.stringify(usuario)
    );

    localStorage.setItem(
        "usuarioAzury",
        JSON.stringify({
            ...usuario,

            autenticado:
                true
        })
    );


    /* =====================================
       INICIALIZAR A ÁREA DO CLIENTE
    ====================================== */

    executarInicializador(
        "inicializarPerfil",
        usuario
    );

    executarInicializador(
        "inicializarPontos",
        usuario
    );

    executarInicializador(
        "inicializarRecompensas",
        usuario
    );

    executarInicializador(
        "inicializarPedidos",
        usuario
    );

    executarInicializador(
        "inicializarHistorico",
        usuario
    );

    executarInicializador(
        "inicializarUI",
        usuario
    );
});