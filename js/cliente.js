document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    function lerJSON(chave) {
        try {
            const valor = localStorage.getItem(chave);

            return valor
                ? JSON.parse(valor)
                : null;

        } catch (erro) {
            console.error(
                `Erro ao carregar ${chave}:`,
                erro
            );

            return null;
        }
    }


    function converterValor(valor) {
        if (typeof valor === "number") {
            return Number.isFinite(valor)
                ? valor
                : 0;
        }

        let texto =
            String(valor ?? "")
                .replace(/\s/g, "")
                .replace("R$", "");

        if (
            texto.includes(".") &&
            texto.includes(",")
        ) {
            texto = texto
                .replace(/\./g, "")
                .replace(",", ".");

        } else {
            texto =
                texto.replace(",", ".");
        }

        const numero =
            Number(texto);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }


    function normalizarPedido(pedido) {
        const seguro =
            pedido &&
            typeof pedido === "object"
                ? { ...pedido }
                : {};

        const taxaEntrega =
            Math.max(
                0,

                converterValor(
                    seguro.taxaEntrega ??
                    seguro.entrega ??
                    0
                )
            );

        const totalInformado =
            Math.max(
                0,

                converterValor(
                    seguro.valorTotal ??
                    seguro.total ??
                    seguro.valor ??
                    0
                )
            );

        const produtosInformados =
            Math.max(
                0,

                converterValor(
                    seguro.valorProdutos ??
                    seguro.subtotal ??
                    seguro.valorPedido ??
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

        const endereco =
            seguro.enderecoEntrega &&
            typeof seguro.enderecoEntrega ===
                "object"
                ? seguro.enderecoEntrega
                : {};

        return {
            ...seguro,

            itens:
                Array.isArray(
                    seguro.itens
                )
                    ? seguro.itens
                    : [],

            complementos:
                Array.isArray(
                    seguro.complementos
                )
                    ? seguro.complementos
                    : [],

            formaPagamento:
                String(
                    seguro.formaPagamento ||
                    seguro.pagamento ||
                    ""
                ).trim(),

            enderecoEntrega: {
                cep:
                    String(
                        endereco.cep || ""
                    ).trim(),

                rua:
                    String(
                        endereco.rua || ""
                    ).trim(),

                numero:
                    String(
                        endereco.numero || ""
                    ).trim(),

                bairro:
                    String(
                        endereco.bairro || ""
                    ).trim(),

                complemento:
                    String(
                        endereco.complemento || ""
                    ).trim(),

                validado:
                    endereco.validado ===
                    true
            },

            valorProdutos,

            subtotal:
                valorProdutos,

            taxaEntrega,

            valorTotal,

            valor:
                valorTotal
                    .toFixed(2)
                    .replace(".", ","),

            valorPontuavel:
                Math.max(
                    0,

                    converterValor(
                        seguro.valorPontuavel ??
                        valorProdutos
                    )
                ),

            pontosCreditados:
                seguro.pontosCreditados ===
                true,

            pontosGerados:
                Math.max(
                    0,

                    Number(
                        seguro.pontosGerados
                    ) || 0
                ),

            historicoStatus:
                Array.isArray(
                    seguro.historicoStatus
                )
                    ? seguro.historicoStatus
                    : []
        };
    }


    let sessao =
        lerJSON(
            "usuarioAzury"
        );

    let usuario =
        lerJSON(
            "clienteAzury"
        );


    const sessaoValida =
        Boolean(
            sessao &&
            sessao.autenticado ===
                true &&
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


    if (
        !usuario ||
        typeof usuario !==
            "object"
    ) {
        usuario = {
            ...sessao
        };
    }


    const emailUsuario =
        String(
            usuario.email || ""
        )
            .trim()
            .toLowerCase();

    const emailSessao =
        String(
            sessao.email || ""
        )
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

    usuario.nome =
        String(
            usuario.nome ||
            sessao.nome ||
            "Cliente"
        ).trim();


    const pontosAntigos =
        Number.isFinite(
            Number(
                usuario.pontos
            )
        )
            ? Math.max(
                0,

                Math.trunc(
                    Number(
                        usuario.pontos
                    )
                )
            )
            : 0;


    usuario.pontosAcumulados =
        Number.isFinite(
            Number(
                usuario.pontosAcumulados
            )
        )
            ? Math.max(
                0,

                Math.trunc(
                    Number(
                        usuario.pontosAcumulados
                    )
                )
            )
            : pontosAntigos;


    usuario.saldoPontos =
        Number.isFinite(
            Number(
                usuario.saldoPontos
            )
        )
            ? Math.max(
                0,

                Math.trunc(
                    Number(
                        usuario.saldoPontos
                    )
                )
            )
            : pontosAntigos;


    usuario.pontos =
        usuario.saldoPontos;


    if (
        usuario.pontosAcumulados >=
        600
    ) {
        usuario.nivel =
            "Diamante";

    } else if (
        usuario.pontosAcumulados >=
        300
    ) {
        usuario.nivel =
            "Ouro";

    } else if (
        usuario.pontosAcumulados >=
        100
    ) {
        usuario.nivel =
            "Prata";

    } else {
        usuario.nivel =
            "Bronze";
    }


    usuario.pedidos =
        Array.isArray(
            usuario.pedidos
        )
            ? usuario.pedidos
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
                )
            : [];


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


    const agora =
        new Date();

    const mesAtual =
        `${agora.getFullYear()}-` +
        String(
            agora.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


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
                usuario
                    .controleResgates
                    .recompensa100
            ) || 0;

        usuario.controleResgates
            .recompensa300 =
            Number(
                usuario
                    .controleResgates
                    .recompensa300
            ) || 0;
    }


    localStorage.setItem(
        "clienteAzury",
        JSON.stringify(
            usuario
        )
    );


    localStorage.setItem(
        "usuarioAzury",
        JSON.stringify({
            ...usuario,

            autenticado:
                true
        })
    );


    const btnSair =
        document.getElementById(
            "btnSair"
        );


    btnSair?.addEventListener(
        "click",
        () => {
            localStorage.removeItem(
                "usuarioAzury"
            );

            window.location.replace(
                "index.html"
            );
        }
    );


    try {
        if (
            typeof inicializarPerfil ===
            "function"
        ) {
            inicializarPerfil(
                usuario
            );
        }


        if (
            typeof inicializarPontos ===
            "function"
        ) {
            inicializarPontos(
                usuario
            );
        }


        if (
            typeof inicializarRecompensas ===
            "function"
        ) {
            inicializarRecompensas(
                usuario
            );
        }


        if (
            typeof inicializarPedidos ===
            "function"
        ) {
            inicializarPedidos(
                usuario
            );
        }


        if (
            typeof inicializarHistorico ===
            "function"
        ) {
            inicializarHistorico(
                usuario
            );
        }


        if (
            typeof inicializarUI ===
            "function"
        ) {
            inicializarUI(
                usuario
            );
        }

    } catch (erro) {
        console.error(
            "Erro ao iniciar a Área do Cliente:",
            erro
        );
    }
});