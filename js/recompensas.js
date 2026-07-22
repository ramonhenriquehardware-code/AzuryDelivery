function inicializarRecompensas(usuario) {
    "use strict";

    const recompensas =
        document.getElementById(
            "recompensas"
        );

    if (
        !recompensas ||
        !usuario ||
        typeof usuario !== "object"
    ) {
        return;
    }


    /* =====================================
       COMPLEMENTOS DISPONÍVEIS
    ====================================== */

    const complementosDisponiveis = [
        "Granola",
        "Leite condensado",
        "Paçoca",
        "Banana",
        "Manga",
        "Coco ralado",
        "Leite em pó",
        "Creme branco",
        "Oreo",
        "Ovomaltine",
        "Morango",
        "Uva verde",
        "Creme de avelã",
        "Nutella"
    ];


    /* =====================================
       RECOMPENSAS
    ====================================== */

    const catalogoRecompensas = [
        {
            id: "100",
            pontos: 100,
            titulo: "1 Açaí de 400 ml",
            descricao:
                "Escolha 2 complementos.",
            tipo: "acai",
            tamanho: 400,
            quantidadeCopos: 1,
            limiteComplementos: 2,
            limiteMensal: 2,
            chaveControle:
                "recompensa100"
        },

        {
            id: "300",
            pontos: 300,
            titulo:
                "Código de 50% de desconto",
            descricao:
                "Receba um código exclusivo para utilizar em uma compra.",
            tipo: "cupom",
            limiteMensal: 2,
            chaveControle:
                "recompensa300"
        },

        {
            id: "600",
            pontos: 600,
            titulo: "1 Açaí de 700 ml",
            descricao:
                "Escolha 4 complementos.",
            tipo: "acai",
            tamanho: 700,
            quantidadeCopos: 1,
            limiteComplementos: 4,
            limiteMensal: null,
            chaveControle: null
        },

        {
            id: "800",
            pontos: 800,
            titulo: "2 Açaís de 700 ml",
            descricao:
                "Escolha 4 complementos para cada copo.",
            tipo: "acai",
            tamanho: 700,
            quantidadeCopos: 2,
            limiteComplementos: 4,
            limiteMensal: null,
            chaveControle: null
        }
    ];


    /* =====================================
       FUNÇÕES GERAIS
    ====================================== */

    function obterMesAtual() {
        const agora =
            new Date();

        return (
            `${agora.getFullYear()}-` +
            String(
                agora.getMonth() + 1
            ).padStart(
                2,
                "0"
            )
        );
    }


    function obterDataHora() {
        return new Date()
            .toLocaleString(
                "pt-BR",
                {
                    dateStyle:
                        "short",

                    timeStyle:
                        "short"
                }
            );
    }


    function gerarCodigoDesconto() {
        const parteAleatoria =
            Math.random()
                .toString(36)
                .slice(2, 8)
                .toUpperCase();

        return (
            `AZURY50-${parteAleatoria}`
        );
    }


    function gerarIdPedido() {
        const parteAleatoria =
            Math.random()
                .toString(36)
                .slice(2, 7)
                .toUpperCase();

        return (
            `AZR-${Date.now()}-` +
            parteAleatoria
        );
    }


    function salvarUsuario() {
        usuario.pontos =
            usuario.saldoPontos;

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
                autenticado: true
            })
        );
    }


    function abrirModalElemento(
        modal
    ) {
        if (!modal) {
            return;
        }

        modal.style.display =
            "flex";

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    }


    function fecharModalElemento(
        modal
    ) {
        if (!modal) {
            return;
        }

        modal.style.display =
            "none";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";
    }


    /* =====================================
       NORMALIZAR DADOS DO CLIENTE
    ====================================== */

    function normalizarDadosUsuario() {
        usuario.saldoPontos =
            Math.max(
                0,

                Math.trunc(
                    Number(
                        usuario.saldoPontos
                    ) || 0
                )
            );

        usuario.pontosAcumulados =
            Math.max(
                0,

                Math.trunc(
                    Number(
                        usuario.pontosAcumulados
                    ) || 0
                )
            );

        usuario.pontos =
            usuario.saldoPontos;


        usuario.historico =
            Array.isArray(
                usuario.historico
            )
                ? usuario.historico
                : [];


        usuario.pedidos =
            Array.isArray(
                usuario.pedidos
            )
                ? usuario.pedidos
                : [];


        usuario.recompensasResgatadas =
            Array.isArray(
                usuario
                    .recompensasResgatadas
            )
                ? usuario
                    .recompensasResgatadas
                : [];


        usuario.codigosDesconto =
            Array.isArray(
                usuario.codigosDesconto
            )
                ? usuario.codigosDesconto
                : [];


        const mesAtual =
            obterMesAtual();


        const controleValido =
            usuario.controleResgates &&
            typeof usuario
                .controleResgates ===
                "object" &&
            usuario.controleResgates
                .mesReferencia ===
                mesAtual;


        if (!controleValido) {
            usuario.controleResgates = {
                mesReferencia:
                    mesAtual,

                recompensa100:
                    0,

                recompensa300:
                    0
            };

            return;
        }


        usuario.controleResgates
            .recompensa100 =
            Math.max(
                0,

                Number(
                    usuario
                        .controleResgates
                        .recompensa100
                ) || 0
            );


        usuario.controleResgates
            .recompensa300 =
            Math.max(
                0,

                Number(
                    usuario
                        .controleResgates
                        .recompensa300
                ) || 0
            );
    }


    /* =====================================
       VERIFICAR RECOMPENSA
    ====================================== */

    function obterQuantidadeResgatadaNoMes(
        recompensa
    ) {
        if (
            !recompensa
                .chaveControle
        ) {
            return 0;
        }

        return (
            Number(
                usuario
                    .controleResgates[
                        recompensa
                            .chaveControle
                    ]
            ) || 0
        );
    }


    function verificarRecompensa(
        recompensa
    ) {
        if (
            usuario.saldoPontos <
            recompensa.pontos
        ) {
            return {
                disponivel:
                    false,

                mensagem:
                    `Faltam ${
                        recompensa.pontos -
                        usuario.saldoPontos
                    } pontos`
            };
        }


        if (
            recompensa
                .limiteMensal ===
            null
        ) {
            return {
                disponivel:
                    true,

                mensagem:
                    "Disponível para resgate"
            };
        }


        const quantidadeMensal =
            obterQuantidadeResgatadaNoMes(
                recompensa
            );


        if (
            quantidadeMensal >=
            recompensa.limiteMensal
        ) {
            return {
                disponivel:
                    false,

                mensagem:
                    "Limite mensal atingido"
            };
        }


        return {
            disponivel:
                true,

            mensagem:
                `Disponível — ` +
                `${quantidadeMensal} de ` +
                `${recompensa.limiteMensal} ` +
                `resgates neste mês`
        };
    }


    /* =====================================
       RENDERIZAR RECOMPENSAS
    ====================================== */

    function renderizarRecompensas() {
        recompensas.innerHTML =
            catalogoRecompensas
                .map(
                    recompensa => {
                        const situacao =
                            verificarRecompensa(
                                recompensa
                            );

                        const quantidadeMensal =
                            obterQuantidadeResgatadaNoMes(
                                recompensa
                            );


                        const informacaoLimite =
                            recompensa
                                .limiteMensal ===
                            null
                                ? ""
                                : `
                                    <small
                                        class="limite-recompensa"
                                    >
                                        Limite mensal:
                                        ${quantidadeMensal}
                                        de
                                        ${recompensa.limiteMensal}
                                    </small>
                                `;


                        return `
                            <div
                                class="recompensa-item"
                            >

                                <div
                                    class="recompensa-informacoes"
                                >

                                    <strong>
                                        🎁
                                        ${recompensa.titulo}
                                    </strong>

                                    <span>
                                        ${recompensa.descricao}
                                    </span>

                                    <span
                                        class="pontos-recompensa"
                                    >
                                        ${recompensa.pontos}
                                        pontos
                                    </span>

                                    ${informacaoLimite}

                                    <p
                                        class="status-recompensa"
                                    >
                                        ${
                                            situacao
                                                .disponivel
                                                ? "🎉"
                                                : "🔒"
                                        }

                                        ${
                                            situacao
                                                .mensagem
                                        }
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    class="btn btn-resgatar-recompensa"
                                    data-recompensa="${recompensa.id}"
                                    ${
                                        situacao
                                            .disponivel
                                            ? ""
                                            : "disabled"
                                    }
                                >
                                    ${
                                        situacao
                                            .disponivel
                                            ? "Resgatar"
                                            : "Indisponível"
                                    }
                                </button>

                            </div>
                        `;
                    }
                )
                .join("");


        document
            .querySelectorAll(
                ".btn-resgatar-recompensa"
            )
            .forEach(
                botao => {
                    botao.addEventListener(
                        "click",
                        () => {
                            const recompensa =
                                catalogoRecompensas
                                    .find(
                                        item =>
                                            item.id ===
                                            botao.dataset
                                                .recompensa
                                    );


                            if (!recompensa) {
                                return;
                            }


                            const situacao =
                                verificarRecompensa(
                                    recompensa
                                );


                            if (
                                !situacao
                                    .disponivel
                            ) {
                                return;
                            }


                            if (
                                recompensa.tipo ===
                                "cupom"
                            ) {
                                resgatarCodigoDesconto(
                                    recompensa
                                );

                                return;
                            }


                            abrirModalRecompensaAcai(
                                recompensa
                            );
                        }
                    );
                }
            );
    }


    /* =====================================
       RESGATAR CÓDIGO DE DESCONTO
    ====================================== */

    function resgatarCodigoDesconto(
        recompensa
    ) {
        const situacao =
            verificarRecompensa(
                recompensa
            );


        if (
            !situacao.disponivel
        ) {
            return;
        }


        const codigo =
            gerarCodigoDesconto();

        const dataHora =
            obterDataHora();


        usuario.saldoPontos -=
            recompensa.pontos;

        usuario.pontos =
            usuario.saldoPontos;


        usuario.controleResgates
            .recompensa300 +=
            1;


        usuario.codigosDesconto
            .unshift({
                codigo,

                desconto:
                    50,

                pontosUtilizados:
                    recompensa.pontos,

                utilizado:
                    false,

                criadoEm:
                    new Date()
                        .toISOString()
            });


        usuario
            .recompensasResgatadas
            .unshift({
                id:
                    `RESGATE-${Date.now()}`,

                tipo:
                    "codigo-desconto",

                recompensa:
                    recompensa.titulo,

                pontosUtilizados:
                    recompensa.pontos,

                codigo,

                data:
                    dataHora
            });


        usuario.historico.unshift(`
            🎟️ Resgatou um código de
            50% de desconto

            <br>

            <small>
                ${recompensa.pontos}
                pontos utilizados —
                ${dataHora}
            </small>
        `);


        salvarUsuario();


        const codigoCupom =
            document.getElementById(
                "codigoCupom"
            );

        const modalCupom =
            document.getElementById(
                "modalCupom"
            );


        if (codigoCupom) {
            codigoCupom.textContent =
                codigo;
        }


        abrirModalElemento(
            modalCupom
        );
    }


    /* =====================================
       CRIAR OPÇÃO DE COMPLEMENTO
    ====================================== */

    function criarOpcaoComplemento(
        recompensa,
        numeroCopo,
        complemento
    ) {
        const identificador =
            `recompensa-${recompensa.id}-` +
            `copo-${numeroCopo}-` +
            complemento
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "-"
                )
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                );


        const label =
            document.createElement(
                "label"
            );

        const input =
            document.createElement(
                "input"
            );

        const texto =
            document.createElement(
                "span"
            );


        label.className =
            "opcao-complemento-recompensa";


        input.type =
            "checkbox";

        input.value =
            complemento;

        input.id =
            identificador;

        input.dataset.copo =
            String(numeroCopo);


        texto.textContent =
            complemento;


        label.appendChild(
            input
        );

        label.appendChild(
            texto
        );


        input.addEventListener(
            "change",
            () => {
                controlarLimiteComplementos(
                    numeroCopo,
                    recompensa
                        .limiteComplementos
                );
            }
        );


        return label;
    }


    /* =====================================
       ABRIR MODAL DA RECOMPENSA
    ====================================== */

    function abrirModalRecompensaAcai(
        recompensa
    ) {
        const modal =
            document.getElementById(
                "modalRecompensaAcai"
            );

        const titulo =
            document.getElementById(
                "tituloModalRecompensa"
            );

        const descricao =
            document.getElementById(
                "descricaoModalRecompensa"
            );

        const seletores =
            document.getElementById(
                "seletoresComplementos"
            );

        const mensagem =
            document.getElementById(
                "mensagemRecompensa"
            );

        const btnConfirmar =
            document.getElementById(
                "btnConfirmarResgate"
            );


        if (
            !modal ||
            !titulo ||
            !descricao ||
            !seletores ||
            !btnConfirmar
        ) {
            return;
        }


        titulo.textContent =
            `🎁 ${recompensa.titulo}`;


        descricao.textContent =
            recompensa.quantidadeCopos ===
            1
                ? `Escolha exatamente ${recompensa.limiteComplementos} complementos.`
                : `Escolha exatamente ${recompensa.limiteComplementos} complementos para cada copo.`;


        if (mensagem) {
            mensagem.className =
                "mensagem";

            mensagem.textContent =
                "";
        }


        btnConfirmar.disabled =
            false;

        btnConfirmar.textContent =
            "Confirmar resgate";


        seletores.innerHTML =
            "";


        for (
            let numeroCopo = 1;
            numeroCopo <=
                recompensa.quantidadeCopos;
            numeroCopo += 1
        ) {
            const grupo =
                document.createElement(
                    "fieldset"
                );

            const tituloGrupo =
                document.createElement(
                    "legend"
                );


            grupo.className =
                "grupo-complementos-recompensa";


            tituloGrupo.textContent =
                recompensa.quantidadeCopos ===
                1
                    ? "Complementos do Açaí"
                    : `Complementos do copo ${numeroCopo}`;


            grupo.appendChild(
                tituloGrupo
            );


            complementosDisponiveis
                .forEach(
                    complemento => {
                        grupo.appendChild(
                            criarOpcaoComplemento(
                                recompensa,
                                numeroCopo,
                                complemento
                            )
                        );
                    }
                );


            seletores.appendChild(
                grupo
            );
        }


        btnConfirmar.onclick =
            () => {
                confirmarResgateAcai(
                    recompensa
                );
            };


        abrirModalElemento(
            modal
        );
    }


    /* =====================================
       LIMITE DE COMPLEMENTOS
    ====================================== */

    function controlarLimiteComplementos(
        numeroCopo,
        limite
    ) {
        const opcoes =
            Array.from(
                document
                    .querySelectorAll(
                        `#seletoresComplementos ` +
                        `input[data-copo="${numeroCopo}"]`
                    )
            );


        const selecionadas =
            opcoes.filter(
                opcao =>
                    opcao.checked
            );


        opcoes.forEach(
            opcao => {
                opcao.disabled =
                    selecionadas.length >=
                        limite &&
                    !opcao.checked;
            }
        );
    }


    function obterComplementosSelecionados(
        recompensa
    ) {
        const complementosPorCopo =
            [];


        for (
            let numeroCopo = 1;
            numeroCopo <=
                recompensa.quantidadeCopos;
            numeroCopo += 1
        ) {
            const selecionados =
                Array.from(
                    document
                        .querySelectorAll(
                            `#seletoresComplementos ` +
                            `input[data-copo="${numeroCopo}"]:checked`
                        )
                )
                    .map(
                        input =>
                            input.value
                    );


            if (
                selecionados.length !==
                recompensa
                    .limiteComplementos
            ) {
                return {
                    valido:
                        false,

                    numeroCopo,

                    complementosPorCopo:
                        []
                };
            }


            complementosPorCopo
                .push(
                    selecionados
                );
        }


        return {
            valido:
                true,

            numeroCopo:
                null,

            complementosPorCopo
        };
    }


    /* =====================================
       CRIAR PEDIDO DE RECOMPENSA
    ====================================== */

    function criarPedidoRecompensa(
        recompensa,
        complementosPorCopo
    ) {
        const agoraPedido =
            new Date();


        return {
            id:
                gerarIdPedido(),

            tipo:
                "recompensa",

            produto:
                recompensa.titulo,

            itens: [
                {
                    nome:
                        recompensa.titulo,

                    quantidade:
                        recompensa
                            .quantidadeCopos
                }
            ],

            tamanho:
                `${recompensa.tamanho} ml`,

            quantidade:
                recompensa
                    .quantidadeCopos,

            complementos:
                complementosPorCopo,

            pontosUtilizados:
                recompensa.pontos,


            valorProdutos:
                0,

            subtotal:
                0,

            taxaEntrega:
                0,

            valorTotal:
                0,

            valorPontuavel:
                0,

            valor:
                "0,00",


            formaPagamento:
                "Recompensa por pontos",


            cliente: {
                nome:
                    String(
                        usuario.nome ||
                        ""
                    ).trim(),

                email:
                    String(
                        usuario.email ||
                        ""
                    ).trim()
            },


            enderecoEntrega: {
                cep:
                    "",

                rua:
                    "",

                numero:
                    "",

                bairro:
                    "",

                complemento:
                    "",

                validado:
                    false
            },


            canal:
                "Área do Cliente",


            pontosCreditados:
                false,

            pontosGerados:
                0,

            dataCreditoPontos:
                null,


            data:
                agoraPedido
                    .toLocaleDateString(
                        "pt-BR"
                    ),

            criadoEm:
                agoraPedido
                    .toISOString(),

            atualizadoEm:
                agoraPedido
                    .toISOString(),

            status:
                "Pedido recebido",


            historicoStatus: [
                {
                    status:
                        "Pedido recebido",

                    data:
                        agoraPedido
                            .toISOString()
                }
            ]
        };
    }


    /* =====================================
       CONFIRMAR RESGATE
    ====================================== */

    function confirmarResgateAcai(
        recompensa
    ) {
        const situacao =
            verificarRecompensa(
                recompensa
            );

        const mensagem =
            document.getElementById(
                "mensagemRecompensa"
            );

        const btnConfirmar =
            document.getElementById(
                "btnConfirmarResgate"
            );


        if (
            !situacao.disponivel
        ) {
            if (mensagem) {
                mensagem.className =
                    "mensagem erro";

                mensagem.textContent =
                    situacao.mensagem;
            }

            return;
        }


        const selecao =
            obterComplementosSelecionados(
                recompensa
            );


        if (!selecao.valido) {
            if (mensagem) {
                mensagem.className =
                    "mensagem erro";

                mensagem.textContent =
                    recompensa.quantidadeCopos ===
                    1
                        ? `Escolha exatamente ${recompensa.limiteComplementos} complementos.`
                        : `Escolha exatamente ${recompensa.limiteComplementos} complementos para o copo ${selecao.numeroCopo}.`;
            }

            return;
        }


        const dataHora =
            obterDataHora();


        const pedido =
            criarPedidoRecompensa(
                recompensa,
                selecao
                    .complementosPorCopo
            );


        usuario.saldoPontos -=
            recompensa.pontos;

        usuario.pontos =
            usuario.saldoPontos;


        if (
            recompensa
                .chaveControle
        ) {
            usuario.controleResgates[
                recompensa
                    .chaveControle
            ] += 1;
        }


        usuario.pedidos.unshift(
            pedido
        );


        usuario
            .recompensasResgatadas
            .unshift({
                id:
                    `RESGATE-${Date.now()}`,

                tipo:
                    "acai",

                recompensa:
                    recompensa.titulo,

                pontosUtilizados:
                    recompensa.pontos,

                complementos:
                    selecao
                        .complementosPorCopo,

                pedidoId:
                    pedido.id,

                data:
                    dataHora
            });


        const textoComplementos =
            selecao
                .complementosPorCopo
                .map(
                    (
                        lista,
                        indice
                    ) => {
                        if (
                            recompensa
                                .quantidadeCopos ===
                            1
                        ) {
                            return lista.join(
                                ", "
                            );
                        }

                        return (
                            `Copo ${indice + 1}: ` +
                            lista.join(", ")
                        );
                    }
                )
                .join("<br>");


        usuario.historico.unshift(`
            🎁 Resgatou
            ${recompensa.titulo}

            <br>

            <small>
                ${textoComplementos}
            </small>

            <br>

            <small>
                ${recompensa.pontos}
                pontos utilizados —
                ${dataHora}
            </small>
        `);


        salvarUsuario();


        if (mensagem) {
            mensagem.className =
                "mensagem sucesso";

            mensagem.textContent =
                "Recompensa resgatada! O pedido foi criado com sucesso.";
        }


        if (btnConfirmar) {
            btnConfirmar.disabled =
                true;

            btnConfirmar.textContent =
                "Pedido criado ✓";
        }


        setTimeout(
            () => {
                window.location.reload();
            },
            1400
        );
    }


    /* =====================================
       FECHAR MODAL
    ====================================== */

    const btnFecharRecompensa =
        document.getElementById(
            "btnFecharRecompensa"
        );

    const modalRecompensaAcai =
        document.getElementById(
            "modalRecompensaAcai"
        );


    btnFecharRecompensa
        ?.addEventListener(
            "click",
            () => {
                fecharModalElemento(
                    modalRecompensaAcai
                );
            }
        );


    /* =====================================
       INICIAR
    ====================================== */

    normalizarDadosUsuario();

    salvarUsuario();

    renderizarRecompensas();
}