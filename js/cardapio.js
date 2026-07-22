document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const NUMERO_WHATSAPP = "5511958620266";

    let enviandoPedido = false;


    /* =====================================
       FILTROS DO CARDÁPIO
    ====================================== */

    const filtros =
        document.querySelectorAll(".filtro-cardapio");

    const produtos =
        document.querySelectorAll(
            ".menu-grid li[data-categoria]"
        );

    function mostrarCategoria(categoria) {
        produtos.forEach(produto => {
            produto.style.display =
                produto.dataset.categoria === categoria
                    ? "flex"
                    : "none";
        });
    }

    filtros.forEach(filtro => {
        filtro.addEventListener("click", () => {
            filtros.forEach(botao => {
                botao.classList.remove("ativo");
            });

            filtro.classList.add("ativo");

            mostrarCategoria(
                filtro.dataset.categoria
            );
        });
    });

    mostrarCategoria("tradicionais");


    /* =====================================
       FUNÇÕES GERAIS
    ====================================== */

    function formatarPreco(valor) {
        return Number(valor || 0)
            .toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });
    }

    function obterSessaoCliente() {
        const sessaoSalva =
            localStorage.getItem("usuarioAzury");

        if (!sessaoSalva) {
            return null;
        }

        try {
            const sessao =
                JSON.parse(sessaoSalva);

            return sessao?.autenticado
                ? sessao
                : null;
        } catch (erro) {
            console.error(
                "Não foi possível ler a sessão:",
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
                "O pedido será enviado ao WhatsApp, mas os pontos só poderão ser registrados quando você estiver conectado à sua conta Azury."
            );

            return null;
        }

        if (
            !window.AzuryPedidos ||
            typeof window.AzuryPedidos
                .criarPedido !== "function"
        ) {
            console.error(
                "O serviço de pedidos não foi carregado."
            );

            alert(
                "O pedido será enviado ao WhatsApp, mas não foi possível registrá-lo na Área do Cliente."
            );

            return null;
        }

        try {
            return window.AzuryPedidos
                .criarPedido(dadosPedido);
        } catch (erro) {
            console.error(
                "Erro ao registrar o pedido:",
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
            encodeURIComponent(mensagem);

        window.open(
            link,
            "_blank",
            "noopener,noreferrer"
        );
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
        }, 1200);
    }

    function fecharModal(modal) {
        modal.style.display = "none";

        document.body.style.overflow = "";
    }

    function abrirModal(modal) {
        modal.style.display = "flex";

        document.body.style.overflow =
            "hidden";
    }

    function preencherNomeDaSessao(
        campoNome
    ) {
        const sessao =
            obterSessaoCliente();

        if (
            sessao?.nome &&
            !campoNome.value.trim()
        ) {
            campoNome.value =
                sessao.nome;
        }
    }


    /* =====================================
       PRODUTOS PRONTOS
    ====================================== */

    const modalProduto =
        document.getElementById(
            "modalProduto"
        );

    const botoesProdutos =
        document.querySelectorAll(
            ".btn-pedir-produto"
        );

    const btnFecharProduto =
        document.getElementById(
            "btnFecharProduto"
        );

    const btnEnviarProduto =
        document.getElementById(
            "btnEnviarProduto"
        );

    const produtoSelecionado =
        document.getElementById(
            "produtoSelecionado"
        );

    const nomeProdutoPedido =
        document.getElementById(
            "nomeProdutoPedido"
        );

    const precoProdutoPedido =
        document.getElementById(
            "precoProdutoPedido"
        );

    const tituloProdutoPedido =
        document.getElementById(
            "tituloProdutoPedido"
        );

    const descricaoProdutoPedido =
        document.getElementById(
            "descricaoProdutoPedido"
        );

    const totalProdutoPedido =
        document.getElementById(
            "totalProdutoPedido"
        );

    const nomeClienteProduto =
        document.getElementById(
            "nomeClienteProduto"
        );

    const cepClienteProduto =
        document.getElementById(
            "cepClienteProduto"
        );

    const ruaClienteProduto =
        document.getElementById(
            "ruaClienteProduto"
        );

    const numeroClienteProduto =
        document.getElementById(
            "numeroClienteProduto"
        );

    const bairroClienteProduto =
        document.getElementById(
            "bairroClienteProduto"
        );

    const complementoClienteProduto =
        document.getElementById(
            "complementoClienteProduto"
        );


    if (
        modalProduto &&
        btnFecharProduto &&
        btnEnviarProduto &&
        produtoSelecionado &&
        nomeProdutoPedido &&
        precoProdutoPedido &&
        tituloProdutoPedido &&
        descricaoProdutoPedido &&
        totalProdutoPedido
    ) {
        botoesProdutos.forEach(botao => {
            botao.addEventListener(
                "click",
                () => {
                    const produto =
                        botao.dataset.produto || "";

                    const preco =
                        Number(
                            botao.dataset.preco
                        ) || 0;

                    const descricao =
                        botao.dataset.descricao || "";

                    nomeProdutoPedido.value =
                        produto;

                    precoProdutoPedido.value =
                        String(preco);

                    produtoSelecionado.textContent =
                        `Produto selecionado: ${produto}`;

                    tituloProdutoPedido.textContent =
                        produto;

                    descricaoProdutoPedido.textContent =
                        descricao;

                    totalProdutoPedido.textContent =
                        formatarPreco(preco);

                    preencherNomeDaSessao(
                        nomeClienteProduto
                    );

                    abrirModal(modalProduto);
                }
            );
        });


        btnFecharProduto.addEventListener(
            "click",
            () => {
                fecharModal(modalProduto);
            }
        );


        modalProduto.addEventListener(
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


        btnEnviarProduto.addEventListener(
            "click",
            () => {
                if (enviandoPedido) {
                    return;
                }

                const produto =
                    nomeProdutoPedido.value
                        .trim();

                const descricao =
                    descricaoProdutoPedido
                        .textContent
                        .trim();

                const valorTotal =
                    Number(
                        precoProdutoPedido.value
                    ) || 0;

                const nome =
                    nomeClienteProduto.value
                        .trim();

                const cep =
                    cepClienteProduto.value
                        .trim();

                const rua =
                    ruaClienteProduto.value
                        .trim();

                const numero =
                    numeroClienteProduto.value
                        .trim();

                const bairro =
                    bairroClienteProduto.value
                        .trim();

                const complemento =
                    complementoClienteProduto
                        .value
                        .trim();

                if (
                    !produto ||
                    !nome ||
                    !cep ||
                    !rua ||
                    !numero ||
                    !bairro
                ) {
                    alert(
                        "Preencha seu nome, CEP, rua, número e bairro para continuar."
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
                        tipo: "compra",

                        produto,

                        quantidade: 1,

                        itens: [
                            {
                                nome: produto,
                                quantidade: 1
                            }
                        ],

                        complementos: [],

                        valorTotal,

                        cliente: {
                            nome,

                            email:
                                sessao?.email || ""
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
                        ? `
🧾 *Pedido:* ${pedidoCriado.id}
`
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

🥤 *Produto:*
${produto}

📝 *Descrição:*
${descricao}

💰 *Total:*
${formatarPreco(valorTotal)}
                `.trim();

                abrirWhatsApp(mensagem);

                fecharModal(
                    modalProduto
                );

                finalizarEnvio(
                    btnEnviarProduto,
                    "Pedir pelo WhatsApp"
                );
            }
        );
    }


    /* =====================================
       COMPLEMENTOS DO MONTE O SEU
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


    /* =====================================
       MODAL MONTE O SEU
    ====================================== */

    const modalMonteSeu =
        document.getElementById(
            "modalMonteSeu"
        );

    const botoesMontar =
        document.querySelectorAll(
            ".btn-montar"
        );

    const btnFecharMonteSeu =
        document.getElementById(
            "btnFecharMonteSeu"
        );

    const btnEnviarMonteSeu =
        document.getElementById(
            "btnEnviarMonteSeu"
        );

    const tamanhoSelecionado =
        document.getElementById(
            "tamanhoSelecionado"
        );

    const tamanhoMonteSeu =
        document.getElementById(
            "tamanhoMonteSeu"
        );

    const precoBaseMonteSeu =
        document.getElementById(
            "precoBaseMonteSeu"
        );

    const totalMonteSeu =
        document.getElementById(
            "totalMonteSeu"
        );

    const complementosMeio =
        document.getElementById(
            "complementosMeio"
        );

    const complementosTopo =
        document.getElementById(
            "complementosTopo"
        );

    const nomeCliente =
        document.getElementById(
            "nomeCliente"
        );

    const cepCliente =
        document.getElementById(
            "cepCliente"
        );

    const ruaCliente =
        document.getElementById(
            "ruaCliente"
        );

    const numeroCliente =
        document.getElementById(
            "numeroCliente"
        );

    const bairroCliente =
        document.getElementById(
            "bairroCliente"
        );

    const complementoCliente =
        document.getElementById(
            "complementoCliente"
        );


    if (
        modalMonteSeu &&
        btnFecharMonteSeu &&
        btnEnviarMonteSeu &&
        tamanhoSelecionado &&
        tamanhoMonteSeu &&
        precoBaseMonteSeu &&
        totalMonteSeu &&
        complementosMeio &&
        complementosTopo
    ) {
        function criarComplementos(
            container,
            camada
        ) {
            container.innerHTML =
                complementosDisponiveis
                    .map(
                        (item, indice) => {
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
                                    R$ ${preco.replace(".", ",")}
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
            document.querySelectorAll(
                ".complemento-monte-seu"
            );


        function calcularTotalMonteSeu() {
            let total =
                Number(
                    precoBaseMonteSeu.value
                ) || 0;

            todosComplementos.forEach(
                complemento => {
                    if (
                        complemento.checked
                    ) {
                        total +=
                            Number(
                                complemento.dataset
                                    .preco
                            ) || 0;
                    }
                }
            );

            totalMonteSeu.textContent =
                formatarPreco(total);

            return total;
        }


        function limparComplementos() {
            todosComplementos.forEach(
                complemento => {
                    complemento.checked =
                        false;
                }
            );
        }


        function obterComplementos(
            camada
        ) {
            return Array
                .from(todosComplementos)
                .filter(
                    complemento =>
                        complemento.checked &&
                        complemento.dataset
                            .camada === camada
                )
                .map(
                    complemento =>
                        complemento.value
                );
        }


        function transformarEmLista(
            itens
        ) {
            if (itens.length === 0) {
                return "• Nenhum complemento";
            }

            return itens
                .map(
                    item =>
                        `• ${item}`
                )
                .join("\n");
        }


        todosComplementos.forEach(
            complemento => {
                complemento.addEventListener(
                    "change",
                    calcularTotalMonteSeu
                );
            }
        );


        botoesMontar.forEach(botao => {
            botao.addEventListener(
                "click",
                () => {
                    limparComplementos();

                    tamanhoMonteSeu.value =
                        botao.dataset.tamanho;

                    precoBaseMonteSeu.value =
                        botao.dataset.precoBase;

                    tamanhoSelecionado.textContent =
                        `Copo selecionado: ${botao.dataset.tamanho}ml`;

                    calcularTotalMonteSeu();

                    preencherNomeDaSessao(
                        nomeCliente
                    );

                    abrirModal(
                        modalMonteSeu
                    );
                }
            );
        });


        btnFecharMonteSeu.addEventListener(
            "click",
            () => {
                fecharModal(
                    modalMonteSeu
                );
            }
        );


        modalMonteSeu.addEventListener(
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


        btnEnviarMonteSeu.addEventListener(
            "click",
            () => {
                if (enviandoPedido) {
                    return;
                }

                const nome =
                    nomeCliente.value
                        .trim();

                const cep =
                    cepCliente.value
                        .trim();

                const rua =
                    ruaCliente.value
                        .trim();

                const numero =
                    numeroCliente.value
                        .trim();

                const bairro =
                    bairroCliente.value
                        .trim();

                const complemento =
                    complementoCliente.value
                        .trim();

                if (
                    !nome ||
                    !cep ||
                    !rua ||
                    !numero ||
                    !bairro
                ) {
                    alert(
                        "Preencha seu nome, CEP, rua, número e bairro para continuar."
                    );

                    return;
                }

                iniciarEnvio(
                    btnEnviarMonteSeu
                );

                const tamanho =
                    tamanhoMonteSeu.value;

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

                const sessao =
                    obterSessaoCliente();

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

                const pedidoCriado =
                    registrarPedidoNoSistema({
                        tipo: "compra",

                        produto:
                            `Monte o Seu • ${tamanho}ml`,

                        tamanho:
                            `${tamanho} ml`,

                        quantidade: 1,

                        itens: [
                            {
                                nome:
                                    `Monte o Seu • ${tamanho}ml`,

                                quantidade: 1
                            }
                        ],

                        complementos:
                            complementosPedido,

                        valorTotal,

                        cliente: {
                            nome,

                            email:
                                sessao?.email || ""
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
                        ? `
🧾 *Pedido:* ${pedidoCriado.id}
`
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

                abrirWhatsApp(mensagem);

                fecharModal(
                    modalMonteSeu
                );

                finalizarEnvio(
                    btnEnviarMonteSeu,
                    "Pedir pelo WhatsApp"
                );
            }
        );
    }


    /* =====================================
       TECLA ESCAPE
    ====================================== */

    document.addEventListener(
        "keydown",
        evento => {
            if (evento.key !== "Escape") {
                return;
            }

            if (
                modalProduto &&
                modalProduto.style.display ===
                    "flex"
            ) {
                fecharModal(
                    modalProduto
                );
            }

            if (
                modalMonteSeu &&
                modalMonteSeu.style.display ===
                    "flex"
            ) {
                fecharModal(
                    modalMonteSeu
                );
            }
        }
    );

});