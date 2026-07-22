document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const NUMERO_WHATSAPP = "5511960220402";
    let enviandoPedido = false;

    const $ = seletor =>
        document.querySelector(seletor);

    const $$ = seletor =>
        Array.from(
            document.querySelectorAll(seletor)
        );


    /* =====================================
       FUNÇÕES G(seletor)
        );


    /* =====================================
       FUNÇÕES GERAIS
    ====================================== */

    function formatarPreco(valor) {
        return Number(valor || 0)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
    }


    function obterSessaoCliente() {
        try {
            const sessao =
                JSON.parse(
                    localStorage.getItem(
                        "usuarioAzury"
                    ) || "null"
                );

            return sessao?.autenticado
                ? sessao
                : null;

        } catch (erro) {
            console.error(
                "Erro ao ler a sessão:",
                erro
            );

            return null;
        }
    }


    function registrarPedidoNoSistema(
        dadosPedido
    ) {
        const sessao =
            obterSessaoCliente();

        if (!sessao) {
            alert(
                "O pedido será enviado ao WhatsApp, mas os pontos só serão registrados quando você estiver conectado à sua conta Azury."
            );

            return null;
        }

        if (
            !window.AzuryPedidos ||
            typeof window.AzuryPedidos
                .criarPedido !==
            "function"
        ) {
            alert(
                "O pedido será enviado ao WhatsApp, mas não foi possível registrá-lo na Área do Cliente."
            );

            return null;
        }

        try {
            return window.AzuryPedidos
                .criarPedido(
                    dadosPedido
                );

        } catch (erro) {
            console.error(
                "Erro ao registrar pedido:",
                erro
            );

            alert(
                "O pedido será enviado ao WhatsApp, mas não foi possível registrá-lo na Área do Cliente."
            );

            return null;
        }
    }


    function abrirWhatsApp(mensagem) {
        const link =
            `https://wa.me/${NUMERO_WHATSAPP}?text=` +
            encodeURIComponent(
                mensagem
            );

        window.open(
            link,
            "_blank",
            "noopener,noreferrer"
        );
    }


    function abrirModal(modal) {
        if (!modal) {
            return;
        }

        modal.style.display =
            "flex";

        document.body.style.overflow =
            "hidden";
    }


    function fecharModal(modal) {
        if (!modal) {
            return;
        }

        modal.style.display =
            "none";

        document.body.style.overflow =
            "";
    }


    function preencherNomeDaSessao(
        campoNome
    ) {
        const sessao =
            obterSessaoCliente();

        if (
            campoNome &&
            sessao?.nome &&
            !campoNome.value.trim()
        ) {
            campoNome.value =
                sessao.nome;
        }
    }


    function iniciarEnvio(botao) {
        enviandoPedido = true;

        botao.disabled = true;

        botao.textContent =
            "Preparando pedido...";
    }


    function finalizarEnvio(
        botao,
        textoOriginal
    ) {
        setTimeout(() => {
            enviandoPedido = false;

            botao.disabled = false;

            botao.textContent =
                textoOriginal;

        }, 1000);
    }


    function aplicarMascaraCEP(campo) {
        if (!campo) {
            return;
        }

        campo.addEventListener(
            "input",
            () => {
                const numeros =
                    campo.value
                        .replace(/\D/g, "")
                        .slice(0, 8);

                campo.value =
                    numeros.length > 5
                        ? `${numeros.slice(
                            0,
                            5
                        )}-${numeros.slice(
                            5
                        )}`
                        : numeros;
            }
        );
    }


    function dadosEntregaValidos({
        nome,
        cep,
        rua,
        numero,
        bairro
    }) {
        return Boolean(
            nome &&
            cep.replace(
                /\D/g,
                ""
            ).length === 8 &&
            rua &&
            numero &&
            bairro
        );
    }


    function obterFormaPagamento(
        nomeGrupo
    ) {
        return (
            document.querySelector(
                `input[name="${nomeGrupo}"]:checked`
            )?.value || ""
        );
    }


    function limparFormaPagamento(
        nomeGrupo
    ) {
        $$(
            `input[name="${nomeGrupo}"]`
        ).forEach(opcao => {
            opcao.checked =
                false;
        });
    }


    /* =====================================
       FILTROS DO CARDÁPIO
    ====================================== */

    const filtros =
        $$(".filtro-cardapio");

    const produtos =
        $$(
            ".menu-grid li[data-categoria]"
        );


    function mostrarCategoria(
        categoria
    ) {
        produtos.forEach(produto => {
            produto.style.display =
                produto.dataset
                    .categoria ===
                    categoria
                    ? "flex"
                    : "none";
        });
    }


    filtros.forEach(filtro => {
        filtro.addEventListener(
            "click",
            () => {
                filtros.forEach(
                    botao =>
                        botao.classList
                            .remove(
                                "ativo"
                            )
                );

                filtro.classList.add(
                    "ativo"
                );

                mostrarCategoria(
                    filtro.dataset
                        .categoria
                );
            }
        );
    });


    mostrarCategoria(
        "tradicionais"
    );


    /* =====================================
       PRODUTOS PRONTOS
    ====================================== */

    const modalProduto =
        $("#modalProduto");

    const btnFecharProduto =
        $("#btnFecharProduto");

    const btnEnviarProduto =
        $("#btnEnviarProduto");

    const produtoSelecionado =
        $("#produtoSelecionado");

    const nomeProdutoPedido =
        $("#nomeProdutoPedido");

    const precoProdutoPedido =
        $("#precoProdutoPedido");

    const tamanhoProdutoPedido =
        $("#tamanhoProdutoPedido");

    const tituloProdutoPedido =
        $("#tituloProdutoPedido");

    const descricaoProdutoPedido =
        $("#descricaoProdutoPedido");

    const totalProdutoPedido =
        $("#totalProdutoPedido");

    const precoProduto300 =
        $("#precoProduto300");

    const precoProduto400 =
        $("#precoProduto400");

    const precoProduto700 =
        $("#precoProduto700");

    const opcoesTamanhoProduto =
        $$(
            'input[name="tamanhoProduto"]'
        );

    const nomeClienteProduto =
        $("#nomeClienteProduto");

    const cepClienteProduto =
        $("#cepClienteProduto");

    const ruaClienteProduto =
        $("#ruaClienteProduto");

    const numeroClienteProduto =
        $("#numeroClienteProduto");

    const bairroClienteProduto =
        $("#bairroClienteProduto");

    const complementoClienteProduto =
        $("#complementoClienteProduto");


    let precosProdutoAtual = {
        "300": 0,
        "400": 0,
        "700": 0
    };


    function atualizarTamanhoProduto(
        tamanhoEscolhido
    ) {
        const tamanho =
            [
                "300",
                "400",
                "700"
            ].includes(
                String(
                    tamanhoEscolhido
                )
            )
                ? String(
                    tamanhoEscolhido
                )
                : "300";

        const preco =
            Number(
                precosProdutoAtual[
                tamanho
                ]
            ) || 0;


        if (
            tamanhoProdutoPedido
        ) {
            tamanhoProdutoPedido.value =
                tamanho;
        }


        if (
            precoProdutoPedido
        ) {
            precoProdutoPedido.value =
                String(preco);
        }


        if (
            totalProdutoPedido
        ) {
            totalProdutoPedido.textContent =
                formatarPreco(
                    preco
                );
        }


        if (
            produtoSelecionado &&
            nomeProdutoPedido
        ) {
            produtoSelecionado.textContent =
                `Produto selecionado: ${nomeProdutoPedido.value} • ${tamanho} ml`;
        }
    }


    $$(".btn-pedir-produto")
        .forEach(botao => {
            botao.addEventListener(
                "click",
                () => {
                    const produto =
                        botao.dataset
                            .produto || "";

                    const descricao =
                        botao.dataset
                            .descricao || "";


                    precosProdutoAtual = {
                        "300":
                            Number(
                                botao.getAttribute(
                                    "data-preco-300"
                                )
                            ) || 0,

                        "400":
                            Number(
                                botao.getAttribute(
                                    "data-preco-400"
                                )
                            ) || 0,

                        "700":
                            Number(
                                botao.getAttribute(
                                    "data-preco-700"
                                )
                            ) || 0
                    };


                    if (
                        nomeProdutoPedido
                    ) {
                        nomeProdutoPedido.value =
                            produto;
                    }


                    if (
                        tituloProdutoPedido
                    ) {
                        tituloProdutoPedido.textContent =
                            produto;
                    }


                    if (
                        descricaoProdutoPedido
                    ) {
                        descricaoProdutoPedido.textContent =
                            descricao;
                    }


                    if (
                        precoProduto300
                    ) {
                        precoProduto300.textContent =
                            formatarPreco(
                                precosProdutoAtual[
                                "300"
                                ]
                            );
                    }


                    if (
                        precoProduto400
                    ) {
                        precoProduto400.textContent =
                            formatarPreco(
                                precosProdutoAtual[
                                "400"
                                ]
                            );
                    }


                    if (
                        precoProduto700
                    ) {
                        precoProduto700.textContent =
                            formatarPreco(
                                precosProdutoAtual[
                                "700"
                                ]
                            );
                    }


                    opcoesTamanhoProduto
                        .forEach(
                            opcao => {
                                opcao.checked =
                                    opcao.value ===
                                    "300";
                            }
                        );


                    atualizarTamanhoProduto(
                        "300"
                    );


                    preencherNomeDaSessao(
                        nomeClienteProduto
                    );


                    limparFormaPagamento(
                        "formaPagamentoProduto"
                    );


                    abrirModal(
                        modalProduto
                    );
                }
            );
        });


    opcoesTamanhoProduto
        .forEach(opcao => {
            opcao.addEventListener(
                "change",
                () => {
                    if (
                        opcao.checked
                    ) {
                        atualizarTamanhoProduto(
                            opcao.value
                        );
                    }
                }
            );
        });


    btnFecharProduto
        ?.addEventListener(
            "click",
            () => {
                fecharModal(
                    modalProduto
                );
            }
        );


    modalProduto
        ?.addEventListener(
            "click",
            evento => {
                if (
                    evento.target ===
                    modalProduto
                ) {
                    fecharModal(
                        modalProduto
                    );
                }
            }
        );


    btnEnviarProduto
        ?.addEventListener(
            "click",
            () => {
                if (
                    enviandoPedido
                ) {
                    return;
                }


                const produto =
                    nomeProdutoPedido
                        ?.value
                        .trim() || "";

                const descricao =
                    descricaoProdutoPedido
                        ?.textContent
                        .trim() || "";

                const tamanho =
                    tamanhoProdutoPedido
                        ?.value
                        .trim() || "";

                const valorTotal =
                    Number(
                        precoProdutoPedido
                            ?.value
                    ) || 0;


                const nome =
                    nomeClienteProduto
                        ?.value
                        .trim() || "";

                const cep =
                    cepClienteProduto
                        ?.value
                        .trim() || "";

                const rua =
                    ruaClienteProduto
                        ?.value
                        .trim() || "";

                const numero =
                    numeroClienteProduto
                        ?.value
                        .trim() || "";

                const bairro =
                    bairroClienteProduto
                        ?.value
                        .trim() || "";

                const complemento =
                    complementoClienteProduto
                        ?.value
                        .trim() || "";

                const formaPagamento =
                    obterFormaPagamento(
                        "formaPagamentoProduto"
                    );


                if (
                    !produto ||
                    !tamanho ||
                    valorTotal <= 0 ||
                    !formaPagamento ||
                    !dadosEntregaValidos({
                        nome,
                        cep,
                        rua,
                        numero,
                        bairro
                    })
                ) {
                    alert(
                        "Escolha o tamanho, a forma de pagamento e preencha nome, CEP válido, rua, número e bairro."
                    );

                    return;
                }


                iniciarEnvio(
                    btnEnviarProduto
                );


                const sessao =
                    obterSessaoCliente();


                const pedidoCriado =
                    registrarPedidoNoSistema({
                        tipo:
                            "compra",

                        produto,

                        tamanho:
                            `${tamanho} ml`,

                        quantidade:
                            1,

                        itens: [
                            {
                                nome:
                                    `${produto} • ${tamanho} ml`,

                                quantidade:
                                    1
                            }
                        ],

                        complementos:
                            [],

                        valorTotal,

                        formaPagamento,

                        cliente: {
                            nome,

                            email:
                                sessao?.email ||
                                ""
                        },

                        enderecoEntrega: {
                            cep,
                            rua,
                            numero,
                            bairro,
                            complemento
                        },

                        canal:
                            "Site / WhatsApp"
                    });


                const codigoPedido =
                    pedidoCriado?.id
                        ? `\n🧾 *Pedido:* ${pedidoCriado.id}\n`
                        : "";


                const mensagem = `
Olá! Quero fazer este pedido na AZURY:
${codigoPedido}
👤 *Cliente:*
${nome}

📍 *Endereço de entrega:*
${rua}, nº ${numero}
Bairro: ${bairro}
CEP: ${cep}
Complemento: ${complemento || "Não informado"}

💳 *Forma de pagamento:*
${formaPagamento}

🥤 *Produto:*
${produto}

📏 *Tamanho:*
${tamanho} ml

📝 *Descrição:*
${descricao}

💰 *Total:*
${formatarPreco(valorTotal)}
                `.trim();


                abrirWhatsApp(
                    mensagem
                );


                fecharModal(
                    modalProduto
                );


                finalizarEnvio(
                    btnEnviarProduto,
                    "Pedir pelo WhatsApp"
                );
            }
        );


    aplicarMascaraCEP(
        cepClienteProduto
    );


    /* =====================================
       MONTE O SEU
    ====================================== */

    const complementosDisponiveis = [
        {
            nome: "Granola",
            preco: 1.50
        },
        {
            nome: "Leite condensado",
            preco: 1.50
        },
        {
            nome: "Paçoca",
            preco: 2.00
        },
        {
            nome: "Banana",
            preco: 2.00
        },
        {
            nome: "Manga",
            preco: 2.00
        },
        {
            nome: "Coco ralado",
            preco: 2.50
        },
        {
            nome: "Leite em pó",
            preco: 2.50
        },
        {
            nome: "Creme branco",
            preco: 2.50
        },
        {
            nome: "Doce de leite",
            preco: 2.50
        },
        {
            nome: "Oreo",
            preco: 3.00
        },
        {
            nome: "Ovomaltine",
            preco: 3.00
        },
        {
            nome: "Morango",
            preco: 3.50
        },
        {
            nome: "Uva verde",
            preco: 3.50
        },
        {
            nome: "Creme de avelã",
            preco: 3.50
        },
        {
            nome: "Nutella",
            preco: 4.50
        }
    ];


    const modalMonteSeu =
        $("#modalMonteSeu");

    const btnFecharMonteSeu =
        $("#btnFecharMonteSeu");

    const btnEnviarMonteSeu =
        $("#btnEnviarMonteSeu");

    const tamanhoSelecionado =
        $("#tamanhoSelecionado");

    const tamanhoMonteSeu =
        $("#tamanhoMonteSeu");

    const precoBaseMonteSeu =
        $("#precoBaseMonteSeu");

    const totalMonteSeu =
        $("#totalMonteSeu");

    const complementosMeio =
        $("#complementosMeio");

    const complementosTopo =
        $("#complementosTopo");

    const nomeCliente =
        $("#nomeCliente");

    const cepCliente =
        $("#cepCliente");

    const ruaCliente =
        $("#ruaCliente");

    const numeroCliente =
        $("#numeroCliente");

    const bairroCliente =
        $("#bairroCliente");

    const complementoCliente =
        $("#complementoCliente");


    function criarComplementos(
        container,
        camada
    ) {
        if (
            !container
        ) {
            return;
        }


        container.innerHTML =
            complementosDisponiveis
                .map(
                    (
                        item,
                        indice
                    ) => {
                        const preco =
                            item.preco
                                .toFixed(2);

                        return `
                            <label>

                                <input
                                    type="checkbox"
                                    class="complemento-monte-seu"
                                    value="${item.nome}"
                                    data-preco="${preco}"
                                    data-camada="${camada}"
                                    id="${camada}-${indice}"
                                >

                                ${item.nome} —
                                R$ ${preco.replace(
                            ".",
                            ","
                        )}

                            </label>
                        `;
                    }
                )
                .join("");
    }


    criarComplementos(
        complementosMeio,
        "meio"
    );


    criarComplementos(
        complementosTopo,
        "cobertura"
    );


    const todosComplementos =
        $$(
            ".complemento-monte-seu"
        );


    function calcularTotalMonteSeu() {
        let total =
            Number(
                precoBaseMonteSeu
                    ?.value
            ) || 0;


        todosComplementos
            .forEach(
                complemento => {
                    if (
                        complemento.checked
                    ) {
                        total +=
                            Number(
                                complemento
                                    .dataset
                                    .preco
                            ) || 0;
                    }
                }
            );


        if (
            totalMonteSeu
        ) {
            totalMonteSeu.textContent =
                formatarPreco(
                    total
                );
        }


        return total;
    }


    function limparComplementos() {
        todosComplementos
            .forEach(
                complemento => {
                    complemento.checked =
                        false;
                }
            );
    }


    function obterComplementos(
        camada
    ) {
        return todosComplementos
            .filter(
                complemento =>
                    complemento.checked &&
                    complemento.dataset
                        .camada ===
                    camada
            )
            .map(
                complemento =>
                    complemento.value
            );
    }


    function transformarEmLista(
        itens
    ) {
        return itens.length
            ? itens
                .map(
                    item =>
                        `• ${item}`
                )
                .join("\n")
            : "• Nenhum complemento";
    }


    todosComplementos
        .forEach(
            complemento => {
                complemento.addEventListener(
                    "change",
                    calcularTotalMonteSeu
                );
            }
        );


    $$(".btn-montar")
        .forEach(botao => {
            botao.addEventListener(
                "click",
                () => {
                    limparComplementos();


                    if (
                        tamanhoMonteSeu
                    ) {
                        tamanhoMonteSeu.value =
                            botao.dataset
                                .tamanho ||
                            "300";
                    }


                    if (
                        precoBaseMonteSeu
                    ) {
                        precoBaseMonteSeu.value =
                            botao.dataset
                                .precoBase ||
                            "0";
                    }


                    if (
                        tamanhoSelecionado
                    ) {
                        tamanhoSelecionado.textContent =
                            `Copo selecionado: ${botao.dataset.tamanho}ml`;
                    }


                    calcularTotalMonteSeu();


                    preencherNomeDaSessao(
                        nomeCliente
                    );


                    limparFormaPagamento(
                        "formaPagamentoMonteSeu"
                    );


                    abrirModal(
                        modalMonteSeu
                    );
                }
            );
        });


    btnFecharMonteSeu
        ?.addEventListener(
            "click",
            () => {
                fecharModal(
                    modalMonteSeu
                );
            }
        );


    modalMonteSeu
        ?.addEventListener(
            "click",
            evento => {
                if (
                    evento.target ===
                    modalMonteSeu
                ) {
                    fecharModal(
                        modalMonteSeu
                    );
                }
            }
        );


    btnEnviarMonteSeu
        ?.addEventListener(
            "click",
            () => {
                if (
                    enviandoPedido
                ) {
                    return;
                }


                const nome =
                    nomeCliente
                        ?.value
                        .trim() || "";

                const cep =
                    cepCliente
                        ?.value
                        .trim() || "";

                const rua =
                    ruaCliente
                        ?.value
                        .trim() || "";

                const numero =
                    numeroCliente
                        ?.value
                        .trim() || "";

                const bairro =
                    bairroCliente
                        ?.value
                        .trim() || "";

                const complemento =
                    complementoCliente
                        ?.value
                        .trim() || "";

                const formaPagamento =
                    obterFormaPagamento(
                        "formaPagamentoMonteSeu"
                    );


                if (
                    !formaPagamento ||
                    !dadosEntregaValidos({
                        nome,
                        cep,
                        rua,
                        numero,
                        bairro
                    })
                ) {
                    alert(
                        "Escolha a forma de pagamento e preencha nome, CEP válido, rua, número e bairro."
                    );

                    return;
                }


                iniciarEnvio(
                    btnEnviarMonteSeu
                );


                const tamanho =
                    tamanhoMonteSeu
                        ?.value ||
                    "300";


                const valorTotal =
                    calcularTotalMonteSeu();


                const itensMeio =
                    obterComplementos(
                        "meio"
                    );


                const itensCobertura =
                    obterComplementos(
                        "cobertura"
                    );


                const complementosPedido = [
                    ...itensMeio.map(
                        item =>
                            `Meio: ${item}`
                    ),

                    ...itensCobertura.map(
                        item =>
                            `Cobertura: ${item}`
                    )
                ];


                const sessao =
                    obterSessaoCliente();


                const pedidoCriado =
                    registrarPedidoNoSistema({
                        tipo:
                            "compra",

                        produto:
                            `Monte o Seu • ${tamanho}ml`,

                        tamanho:
                            `${tamanho} ml`,

                        quantidade:
                            1,

                        itens: [
                            {
                                nome:
                                    `Monte o Seu • ${tamanho}ml`,

                                quantidade:
                                    1
                            }
                        ],

                        complementos:
                            complementosPedido,

                        valorTotal,

                        formaPagamento,

                        cliente: {
                            nome,

                            email:
                                sessao?.email ||
                                ""
                        },

                        enderecoEntrega: {
                            cep,
                            rua,
                            numero,
                            bairro,
                            complemento
                        },

                        canal:
                            "Site / WhatsApp"
                    });


                const codigoPedido =
                    pedidoCriado?.id
                        ? `\n🧾 *Pedido:* ${pedidoCriado.id}\n`
                        : "";


                const mensagem = `
Olá! Quero fazer este pedido na AZURY:
${codigoPedido}
👤 *Cliente:*
${nome}

📍 *Endereço de entrega:*
${rua}, nº ${numero}
Bairro: ${bairro}
CEP: ${cep}
Complemento: ${complemento || "Não informado"}

💳 *Forma de pagamento:*
${formaPagamento}

🥤 *Monte o Seu • ${tamanho}ml*

*Montagem do copo:*

1️⃣ 1/2 de açaí no fundo

*Complementos no meio:*
${transformarEmLista(itensMeio)}

2️⃣ 2/2 de açaí por cima

*Complementos na cobertura:*
${transformarEmLista(itensCobertura)}

💰 *Total:*
${formatarPreco(valorTotal)}
                `.trim();


                abrirWhatsApp(
                    mensagem
                );


                fecharModal(
                    modalMonteSeu
                );


                finalizarEnvio(
                    btnEnviarMonteSeu,
                    "Pedir pelo WhatsApp"
                );
            }
        );


    aplicarMascaraCEP(
        cepCliente
    );


    /* =====================================
       TECLA ESCAPE
    ====================================== */

    document.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key !==
                "Escape"
            ) {
                return;
            }


            fecharModal(
                modalProduto
            );


            fecharModal(
                modalMonteSeu
            );
        }
    );
});