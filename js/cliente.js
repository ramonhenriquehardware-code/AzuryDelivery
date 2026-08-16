document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const supabase = window.azurySupabase;
    const btnSair = document.getElementById("btnSair");

    if (!supabase) {
        console.error(
            "Supabase não foi carregado na Área do Cliente."
        );

        window.location.replace("login.html");

        return;
    }


    const STATUS_LABELS = {
        recebido: "Pedido recebido",
        confirmado: "Pedido confirmado",
        aceito: "Pedido confirmado",
        em_preparo: "Em preparo",
        pronto: "Pronto",
        saiu_para_entrega: "Saiu para entrega",
        entregue: "Entregue",
        cancelado: "Cancelado"
    };


    const PAGAMENTO_LABELS = {
        cartao_credito: "Cartão de crédito",
        cartao_debito: "Cartão de débito",
        pix: "Pix",
        dinheiro: "Dinheiro"
    };


    function primeiro(
        objeto,
        chaves,
        fallback = null
    ) {
        for (const chave of chaves) {
            if (
                objeto &&
                Object.prototype.hasOwnProperty.call(
                    objeto,
                    chave
                ) &&
                objeto[chave] !== null &&
                objeto[chave] !== undefined &&
                objeto[chave] !== ""
            ) {
                return objeto[chave];
            }
        }

        return fallback;
    }


    function primeiroNumero(
        objeto,
        chaves
    ) {
        for (const chave of chaves) {
            if (
                !objeto ||
                !Object.prototype.hasOwnProperty.call(
                    objeto,
                    chave
                )
            ) {
                continue;
            }

            const numero =
                Number(
                    objeto[chave]
                );

            if (
                Number.isFinite(
                    numero
                )
            ) {
                return numero;
            }
        }

        return undefined;
    }


    function formatarData(
        valor
    ) {
        const data =
            new Date(
                valor
            );

        return Number.isNaN(
            data.getTime()
        )
            ? "Data não informada"
            : data.toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );
    }


    function escaparHtml(
        valor
    ) {
        return String(
            valor ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function normalizarTexto(
        valor
    ) {
        return String(
            valor || ""
        )
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /\s+/g,
                "_"
            );
    }


    async function carregarPerfil(
        user
    ) {
        try {
            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "perfis"
                    )
                    .select("*")
                    .eq(
                        "id",
                        user.id
                    )
                    .maybeSingle();

            if (error) {
                throw error;
            }

            return data || {};

        } catch (erro) {
            console.warn(
                "Perfil não pôde ser carregado; usando os metadados da conta.",
                erro
            );

            return {};
        }
    }


    async function carregarPedidos(
        clienteId
    ) {
        const consultaCompleta =
            await supabase
                .from(
                    "pedidos"
                )
                .select(`
                    *,
                    itens:itens_pedido(
                        *,
                        complementos:complementos_pedido(*)
                    ),
                    historico:historico_pedido(*)
                `)
                .eq(
                    "cliente_id",
                    clienteId
                )
                .order(
                    "criado_em",
                    {
                        ascending: false
                    }
                )
                .limit(100);


        if (
            !consultaCompleta.error
        ) {
            return (
                consultaCompleta.data ||
                []
            );
        }


        console.warn(
            "Consulta completa dos pedidos indisponível; usando consulta compatível.",
            consultaCompleta.error
        );


        const {
            data: pedidos,
            error: erroPedidos
        } =
            await supabase
                .from(
                    "pedidos"
                )
                .select("*")
                .eq(
                    "cliente_id",
                    clienteId
                )
                .order(
                    "criado_em",
                    {
                        ascending: false
                    }
                )
                .limit(100);


        if (erroPedidos) {
            console.error(
                "Não foi possível carregar os pedidos do cliente.",
                erroPedidos
            );

            return [];
        }


        const lista =
            pedidos || [];


        const pedidoIds =
            lista
                .map(
                    item =>
                        item.id
                )
                .filter(
                    Boolean
                );


        if (
            !pedidoIds.length
        ) {
            return lista;
        }


        let itens = [];
        let historicos = [];


        const respostaItens =
            await supabase
                .from(
                    "itens_pedido"
                )
                .select("*")
                .in(
                    "pedido_id",
                    pedidoIds
                );


        if (
            !respostaItens.error
        ) {
            itens =
                respostaItens.data ||
                [];
        }


        const respostaHistorico =
            await supabase
                .from(
                    "historico_pedido"
                )
                .select("*")
                .in(
                    "pedido_id",
                    pedidoIds
                )
                .order(
                    "criado_em",
                    {
                        ascending: true
                    }
                );


        if (
            !respostaHistorico.error
        ) {
            historicos =
                respostaHistorico.data ||
                [];
        }


        const itemIds =
            itens
                .map(
                    item =>
                        item.id
                )
                .filter(
                    Boolean
                );


        let complementos = [];


        if (
            itemIds.length
        ) {
            const respostaComplementos =
                await supabase
                    .from(
                        "complementos_pedido"
                    )
                    .select("*")
                    .in(
                        "item_pedido_id",
                        itemIds
                    );


            if (
                !respostaComplementos.error
            ) {
                complementos =
                    respostaComplementos.data ||
                    [];
            }
        }


        return lista.map(
            pedido => ({
                ...pedido,

                itens:
                    itens
                        .filter(
                            item =>
                                String(
                                    item.pedido_id
                                ) ===
                                String(
                                    pedido.id
                                )
                        )
                        .map(
                            item => ({
                                ...item,

                                complementos:
                                    complementos
                                        .filter(
                                            complemento =>
                                                String(
                                                    complemento
                                                        .item_pedido_id
                                                ) ===
                                                String(
                                                    item.id
                                                )
                                        )
                            })
                        ),

                historico:
                    historicos
                        .filter(
                            item =>
                                String(
                                    item.pedido_id
                                ) ===
                                String(
                                    pedido.id
                                )
                        )
            })
        );
    }


    async function carregarRecompensas() {
        try {
            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "recompensas"
                    )
                    .select("*")
                    .eq(
                        "ativo",
                        true
                    )
                    .order(
                        "ordem",
                        {
                            ascending: true
                        }
                    );


            if (error) {
                throw error;
            }


            return data || [];

        } catch (erro) {
            console.warn(
                "Não foi possível carregar as recompensas.",
                erro
            );

            return [];
        }
    }


    async function carregarComplementos() {
        try {
            const {
                data,
                error
            } =
                await supabase
                    .from(
                        "complementos"
                    )
                    .select(
                        "id,nome,preco,ordem"
                    )
                    .eq(
                        "disponivel",
                        true
                    )
                    .eq(
                        "visivel",
                        true
                    )
                    .order(
                        "ordem",
                        {
                            ascending: true
                        }
                    );


            if (error) {
                throw error;
            }


            return data || [];

        } catch (erro) {
            console.warn(
                "Não foi possível carregar complementos para recompensas.",
                erro
            );

            return [];
        }
    }


    function mapearPedido(
        pedido
    ) {
        const itens =
            Array.isArray(
                pedido.itens
            )
                ? pedido.itens
                : [];


        const primeiroItem =
            itens[0] || {};


        const complementos =
            itens.flatMap(
                item =>
                    (
                        Array.isArray(
                            item.complementos
                        )
                            ? item.complementos
                            : []
                    )
                        .map(
                            complemento => {
                                const camada =
                                    primeiro(
                                        complemento,
                                        [
                                            "camada"
                                        ],
                                        ""
                                    );


                                const nome =
                                    primeiro(
                                        complemento,
                                        [
                                            "nome",
                                            "complemento_nome"
                                        ],
                                        "Complemento"
                                    );


                                return (
                                    camada &&
                                    camada !==
                                    "unica"
                                )
                                    ? `${
                                        camada ===
                                        "meio"
                                            ? "Meio"
                                            : camada ===
                                              "cobertura"
                                                ? "Cobertura"
                                                : camada ===
                                                  "ambos"
                                                    ? "Nos dois"
                                                    : camada
                                    }: ${nome}`
                                    : nome;
                            }
                        )
            );


        const quantidade =
            itens.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Math.max(
                        1,
                        Number(
                            item.quantidade
                        ) ||
                        1
                    ),
                0
            ) ||
            1;


        return {
            id:
                pedido.codigo ||
                pedido.id,

            pedidoId:
                pedido.id,

            codigo:
                pedido.codigo ||
                pedido.id,

            produto:
                primeiro(
                    primeiroItem,
                    [
                        "produto_nome",
                        "nome",
                        "produto"
                    ],
                    "Pedido Azury"
                ),

            tamanho:
                primeiro(
                    primeiroItem,
                    [
                        "tamanho_ml",
                        "tamanho"
                    ],
                    ""
                )
                    ? `${
                        primeiro(
                            primeiroItem,
                            [
                                "tamanho_ml",
                                "tamanho"
                            ],
                            ""
                        )
                    } ml`
                    : "",

            quantidade,

            itens,

            complementos,

            status:
                STATUS_LABELS[
                    pedido.status
                ] ||
                pedido.status ||
                "Pedido recebido",

            statusInterno:
                pedido.status,

            criadoEm:
                pedido.criado_em,

            data:
                formatarData(
                    pedido.criado_em
                ),

            formaPagamento:
                PAGAMENTO_LABELS[
                    pedido.forma_pagamento
                ] ||
                pedido.forma_pagamento ||
                "Não informada",

            statusPagamento:
                pedido.status_pagamento,

            valorProdutos:
                Number(
                    pedido.valor_produtos
                ) ||
                0,

            subtotal:
                Number(
                    pedido.valor_produtos
                ) ||
                0,

            taxaEntrega:
                Number(
                    pedido.taxa_entrega
                ) ||
                0,

            valorTotal:
                Number(
                    pedido.valor_total
                ) ||
                0,

            valor:
                (
                    Number(
                        pedido.valor_total
                    ) ||
                    0
                )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    ),

            pontosGerados:
                Math.max(
                    0,
                    Number(
                        pedido.pontos_gerados
                    ) ||
                    0
                ),

            pontosCreditados:
                pedido.status ===
                    "entregue" &&
                Number(
                    pedido.pontos_gerados
                ) >
                    0,

            enderecoEntrega: {
                cep:
                    pedido.cep ||
                    "",

                rua:
                    pedido.rua ||
                    "",

                numero:
                    pedido.numero ||
                    "",

                bairro:
                    pedido.bairro ||
                    "",

                complemento:
                    pedido
                        .complemento_endereco ||
                    "",

                validado:
                    pedido
                        .endereco_validado ===
                    true
            },

            historicoStatus:
                Array.isArray(
                    pedido.historico
                )
                    ? pedido.historico
                    : []
        };
    }


    function criarHistorico(
        pedidos
    ) {
        const atividades = [];


        pedidos.forEach(
            pedido => {
                const codigo =
                    escaparHtml(
                        pedido.codigo ||
                        pedido.id
                    );


                const historico =
                    Array.isArray(
                        pedido.historico
                    )
                        ? pedido.historico
                        : [];


                if (
                    historico.length
                ) {
                    historico.forEach(
                        item => {
                            const status =
                                primeiro(
                                    item,
                                    [
                                        "status_novo",
                                        "novo_status",
                                        "status"
                                    ],
                                    pedido.status
                                );


                            const observacao =
                                primeiro(
                                    item,
                                    [
                                        "observacao",
                                        "descricao"
                                    ],
                                    ""
                                );


                            atividades.push({
                                data:
                                    primeiro(
                                        item,
                                        [
                                            "criado_em",
                                            "data"
                                        ],
                                        pedido.criado_em
                                    ),

                                html:
                                    `<strong>${
                                        formatarData(
                                            primeiro(
                                                item,
                                                [
                                                    "criado_em",
                                                    "data"
                                                ],
                                                pedido.criado_em
                                            )
                                        )
                                    }</strong><br>Pedido ${
                                        codigo
                                    }: ${
                                        escaparHtml(
                                            STATUS_LABELS[
                                                status
                                            ] ||
                                            status ||
                                            "Atualizado"
                                        )
                                    }${
                                        observacao
                                            ? ` — ${
                                                escaparHtml(
                                                    observacao
                                                )
                                            }`
                                            : ""
                                    }`
                            });
                        }
                    );

                } else {
                    atividades.push({
                        data:
                            pedido.criado_em,

                        html:
                            `<strong>${
                                formatarData(
                                    pedido.criado_em
                                )
                            }</strong><br>Pedido ${
                                codigo
                            }: ${
                                escaparHtml(
                                    STATUS_LABELS[
                                        pedido.status
                                    ] ||
                                    pedido.status ||
                                    "Pedido recebido"
                                )
                            }`
                    });
                }
            }
        );


        return atividades
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.data ||
                        0
                    ) -
                    new Date(
                        a.data ||
                        0
                    )
            )
            .map(
                item =>
                    item.html
            );
    }


    function extrairPontos(
        perfil,
        pedidos
    ) {
        const totalGerado =
            pedidos
                .filter(
                    pedido =>
                        pedido.status ===
                        "entregue"
                )
                .reduce(
                    (
                        total,
                        pedido
                    ) =>
                        total +
                        Math.max(
                            0,
                            Number(
                                pedido
                                    .pontos_gerados
                            ) ||
                            0
                        ),
                    0
                );


        const saldo =
            primeiroNumero(
                perfil,
                [
                    "saldo_pontos",
                    "pontos_disponiveis",
                    "saldo_pontos_atual",
                    "pontos"
                ]
            );


        const acumulados =
            primeiroNumero(
                perfil,
                [
                    "pontos_acumulados",
                    "pontos_totais",
                    "total_pontos",
                    "pontos_historicos"
                ]
            );


        return {
            saldo:
                Math.max(
                    0,
                    Math.trunc(
                        saldo ??
                        totalGerado
                    )
                ),

            acumulados:
                Math.max(
                    0,
                    Math.trunc(
                        acumulados ??
                        totalGerado
                    )
                )
        };
    }


    function nivelPorPontos(
        pontos
    ) {
        if (
            pontos >=
            600
        ) {
            return "Diamante";
        }


        if (
            pontos >=
            300
        ) {
            return "Ouro";
        }


        if (
            pontos >=
            100
        ) {
            return "Prata";
        }


        return "Bronze";
    }


    /* =========================================
       ITEM 10
       DASHBOARD DA ÁREA DO CLIENTE
    ========================================= */

    function pedidoEstaEmAndamentoDashboard(
        pedido
    ) {
        const status =
            normalizarTexto(
                pedido?.statusInterno ||
                pedido?.status ||
                ""
            );


        return (
            status !==
                "entregue" &&
            status !==
                "cancelado"
        );
    }


    function obterPontosRecompensaDashboard(
        recompensa
    ) {
        return Math.max(
            0,
            Number(
                primeiro(
                    recompensa,
                    [
                        "pontos_necessarios",
                        "pontosNecessarios",
                        "pontos",
                        "custo_pontos",
                        "valor_pontos"
                    ],
                    0
                )
            ) ||
            0
        );
    }


    function obterNomeRecompensaDashboard(
        recompensa
    ) {
        return String(
            primeiro(
                recompensa,
                [
                    "nome",
                    "titulo"
                ],
                "Recompensa Azury"
            ) ||
            "Recompensa Azury"
        ).trim();
    }


    function atualizarDashboardCliente(
        usuario
    ) {
        if (
            !usuario
        ) {
            return;
        }


        const pedidos =
            Array.isArray(
                usuario.pedidos
            )
                ? usuario.pedidos
                : [];


        const saldoPontos =
            Math.max(
                0,
                Math.trunc(
                    Number(
                        usuario.saldoPontos ??
                        usuario.pontos ??
                        0
                    ) ||
                    0
                )
            );


        /* =====================================
           PEDIDOS REALIZADOS
        ====================================== */

        const totalPedidosResumo =
            document.getElementById(
                "totalPedidosResumo"
            );


        if (
            totalPedidosResumo
        ) {
            totalPedidosResumo.textContent =
                String(
                    pedidos.length
                );
        }


        /* =====================================
           PONTOS DISPONÍVEIS
        ====================================== */

        const pontosResumo =
            document.getElementById(
                "pontos"
            );


        if (
            pontosResumo
        ) {
            pontosResumo.textContent =
                String(
                    saldoPontos
                );
        }


        /* =====================================
           PRÓXIMA RECOMPENSA
        ====================================== */

        const catalogo =
            Array.isArray(
                usuario.recompensasCatalogo
            )
                ? usuario.recompensasCatalogo
                : [];


        const recompensasOrdenadas =
            catalogo
                .map(
                    recompensa => ({
                        recompensa,
                        pontos:
                            obterPontosRecompensaDashboard(
                                recompensa
                            )
                    })
                )
                .filter(
                    item =>
                        item.pontos >
                        0
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.pontos -
                        b.pontos
                );


        const proxima =
            recompensasOrdenadas.find(
                item =>
                    item.pontos >
                    saldoPontos
            ) ||
            null;


        const tituloProxima =
            document.getElementById(
                "proximaRecompensaResumo"
            );


        const faltamProxima =
            document.getElementById(
                "faltamRecompensaResumo"
            );


        const progressoProxima =
            document.getElementById(
                "progressoRecompensaResumo"
            );


        if (
            proxima
        ) {
            const nome =
                obterNomeRecompensaDashboard(
                    proxima.recompensa
                );


            const restante =
                Math.max(
                    proxima.pontos -
                    saldoPontos,
                    0
                );


            const porcentagem =
                Math.min(
                    100,
                    Math.max(
                        0,
                        (
                            saldoPontos /
                            proxima.pontos
                        ) *
                        100
                    )
                );


            if (
                tituloProxima
            ) {
                tituloProxima.textContent =
                    nome;
            }


            if (
                faltamProxima
            ) {
                faltamProxima.textContent =
                    `Faltam ${restante} pontos`;
            }


            if (
                progressoProxima
            ) {
                progressoProxima.style.width =
                    `${porcentagem}%`;
            }

        } else if (
            recompensasOrdenadas.length
        ) {
            if (
                tituloProxima
            ) {
                tituloProxima.textContent =
                    "Todas desbloqueadas";
            }


            if (
                faltamProxima
            ) {
                faltamProxima.textContent =
                    "Você alcançou todas as recompensas";
            }


            if (
                progressoProxima
            ) {
                progressoProxima.style.width =
                    "100%";
            }

        } else {
            if (
                tituloProxima
            ) {
                tituloProxima.textContent =
                    "Continue acumulando";
            }


            if (
                faltamProxima
            ) {
                faltamProxima.textContent =
                    "Continue juntando pontos";
            }


            if (
                progressoProxima
            ) {
                progressoProxima.style.width =
                    "0%";
            }
        }


        /* =====================================
           PEDIDO EM ANDAMENTO
        ====================================== */

        const pedidoEmAndamento =
            pedidos.find(
                pedidoEstaEmAndamentoDashboard
            ) ||
            null;


        const areaPedidoEmAndamento =
            document.getElementById(
                "pedidoEmAndamentoResumo"
            );


        if (
            areaPedidoEmAndamento
        ) {
            if (
                pedidoEmAndamento &&
                typeof window.criarHtmlPedido ===
                    "function"
            ) {
                areaPedidoEmAndamento.innerHTML =
                    window.criarHtmlPedido(
                        pedidoEmAndamento
                    );

            } else {
                areaPedidoEmAndamento.innerHTML = `
                    <div class="pedido-andamento-vazio">
                        <span aria-hidden="true">
                            📦
                        </span>

                        <span>
                            Nenhum pedido em andamento no momento.
                        </span>
                    </div>
                `;
            }
        }


        /* =====================================
           PEDIDOS RECENTES
        ====================================== */

        const pedidosRecentes =
            document.getElementById(
                "pedidos"
            );


        if (
            pedidosRecentes &&
            typeof window.criarHtmlPedido ===
                "function"
        ) {
            const recentes =
                pedidos
                    .filter(
                        pedido =>
                            pedido !==
                            pedidoEmAndamento
                    )
                    .slice(
                        0,
                        3
                    );


            pedidosRecentes.innerHTML =
                recentes.length
                    ? recentes
                        .map(
                            pedido =>
                                window.criarHtmlPedido(
                                    pedido
                                )
                        )
                        .join("")
                    : "<p>Nenhum pedido anterior.</p>";
        }
    }


    async function tentarResgate(
        recompensa,
        complementosSelecionados
    ) {
        const dados = {
            recompensa_id:
                recompensa.id,

            complementos:
                complementosSelecionados
                    .map(
                        item => ({
                            id:
                                item.id ||
                                null,

                            nome:
                                item.nome
                        })
                    )
        };


        const tentativas = [
            [
                "resgatar_recompensa_cliente",
                {
                    p_recompensa_id:
                        recompensa.id,

                    p_complementos:
                        dados.complementos
                }
            ],

            [
                "resgatar_recompensa",
                {
                    p_recompensa_id:
                        recompensa.id,

                    p_complementos:
                        dados.complementos
                }
            ],

            [
                "criar_resgate_recompensa",
                {
                    p_dados:
                        dados
                }
            ],

            [
                "resgatar_recompensa_completa",
                {
                    p_dados:
                        dados
                }
            ]
        ];


        let ultimoErro = null;


        for (
            const [
                nome,
                parametros
            ]
            of tentativas
        ) {
            const {
                data,
                error
            } =
                await supabase.rpc(
                    nome,
                    parametros
                );


            if (
                !error
            ) {
                return data;
            }


            const mensagem =
                String(
                    error.message ||
                    ""
                )
                    .toLowerCase();


            const funcaoNaoExiste =
                error.code ===
                    "PGRST202" ||

                mensagem.includes(
                    "could not find the function"
                ) ||

                (
                    mensagem.includes(
                        "function public."
                    ) &&
                    mensagem.includes(
                        "does not exist"
                    )
                );


            if (
                !funcaoNaoExiste
            ) {
                throw new Error(
                    error.message ||
                    "Não foi possível resgatar a recompensa."
                );
            }


            ultimoErro =
                error;
        }


        console.error(
            "Nenhuma função de resgate compatível foi encontrada.",
            ultimoErro
        );


        throw new Error(
            "O resgate online ainda não está disponível. Seus pontos continuam preservados."
        );
    }


    async function carregarAreaCliente() {
        const {
            data: sessaoData,
            error: erroSessao
        } =
            await supabase.auth
                .getSession();


        if (
            erroSessao
        ) {
            throw erroSessao;
        }


        const session =
            sessaoData.session;


        if (
            !session?.user
        ) {
            sessionStorage.setItem(
                "azuryRetornoLogin",
                "cliente.html"
            );

            window.location.replace(
                "login.html"
            );

            return null;
        }


        const user =
            session.user;


        const [
            perfil,
            pedidosBrutos,
            recompensas,
            complementos
        ] =
            await Promise.all([
                carregarPerfil(
                    user
                ),

                carregarPedidos(
                    user.id
                ),

                carregarRecompensas(),

                carregarComplementos()
            ]);


        if (
            perfil.ativo ===
            false
        ) {
            await supabase.auth
                .signOut();


            alert(
                "Esta conta está desativada. Entre em contato com a Azury."
            );


            window.location.replace(
                "login.html"
            );


            return null;
        }


        const pedidosMapeados =
            pedidosBrutos.map(
                mapearPedido
            );


        const pontos =
            extrairPontos(
                perfil,
                pedidosBrutos
            );


        const nome =
            String(
                primeiro(
                    perfil,
                    [
                        "nome",
                        "nome_completo"
                    ],
                    null
                ) ||

                primeiro(
                    user.user_metadata,
                    [
                        "nome",
                        "nome_completo",
                        "full_name"
                    ],
                    null
                ) ||

                user.email
                    ?.split("@")[0] ||

                "Cliente"
            ).trim();


        const usuario = {
            id:
                user.id,

            email:
                user.email ||
                "",

            nome,

            telefone:
                primeiro(
                    perfil,
                    [
                        "telefone",
                        "celular"
                    ],
                    ""
                ),

            pontos:
                pontos.saldo,

            saldoPontos:
                pontos.saldo,

            pontosAcumulados:
                pontos.acumulados,

            nivel:
                primeiro(
                    perfil,
                    [
                        "nivel"
                    ],
                    nivelPorPontos(
                        pontos.acumulados
                    )
                ),

            pedidos:
                pedidosMapeados,

            historico:
                criarHistorico(
                    pedidosBrutos
                ),

            recompensasCatalogo:
                recompensas,

            complementosDisponiveis:
                complementos,

            origem:
                "supabase"
        };


        localStorage.setItem(
            "clienteAzury",
            JSON.stringify(
                usuario
            )
        );


        localStorage.removeItem(
            "usuarioAzury"
        );


        window.AzuryCliente = {
            supabase,

            session,

            perfil,

            usuario,

            resgatarRecompensa:
                tentarResgate,

            recarregar:
                carregarAreaCliente
        };


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


        /* =====================================
           ITEM 10
           ATUALIZA O NOVO DASHBOARD
        ====================================== */

        atualizarDashboardCliente(
            usuario
        );


        return {
            session,
            usuario
        };
    }


    btnSair?.addEventListener(
        "click",
        async () => {
            btnSair.disabled =
                true;


            try {
                await supabase.auth
                    .signOut();

            } finally {
                localStorage.removeItem(
                    "clienteAzury"
                );

                localStorage.removeItem(
                    "usuarioAzury"
                );


                window.location.replace(
                    "index.html"
                );
            }
        }
    );


    try {
        const resultado =
            await carregarAreaCliente();


        if (
            !resultado
        ) {
            return;
        }


        const canal =
            supabase
                .channel(
                    `cliente-pedidos-${resultado.session.user.id}`
                )
                .on(
                    "postgres_changes",
                    {
                        event:
                            "*",

                        schema:
                            "public",

                        table:
                            "pedidos",

                        filter:
                            `cliente_id=eq.${resultado.session.user.id}`
                    },

                    () =>
                        window.location.reload()
                )
                .subscribe();


        window.addEventListener(
            "beforeunload",
            () => {
                supabase
                    .removeChannel(
                        canal
                    )
                    .catch(
                        () => {}
                    );
            }
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar a Área do Cliente:",
            erro
        );


        alert(
            "Não foi possível carregar sua Área do Cliente. Tente novamente."
        );
    }
});