document.addEventListener("DOMContentLoaded", () => {

    let enviandoPedido = false;

    const filtros =
        document.querySelectorAll(
            ".filtro-cardapio"
        );

    const produtos =
        document.querySelectorAll(
            ".menu-grid li[data-categoria]"
        );


    /* =====================================
       FILTROS DO CARDÁPIO
    ===================================== */

    function mostrarCategoria(categoria) {

        produtos.forEach(produto => {

            produto.style.display =
                produto.dataset.categoria ===
                categoria
                    ? "flex"
                    : "none";

        });

    }


    filtros.forEach(filtro => {

        filtro.addEventListener(
            "click",
            () => {

                filtros.forEach(botao => {

                    botao.classList.remove(
                        "ativo"
                    );

                });

                filtro.classList.add(
                    "ativo"
                );

                mostrarCategoria(
                    filtro.dataset.categoria
                );

            }
        );

    });


    mostrarCategoria("tradicionais");


    /* =====================================
       COMPLEMENTOS
    ===================================== */

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
       ELEMENTOS DO MODAL
    ===================================== */

    const modal =
        document.getElementById(
            "modalMonteSeu"
        );

    const botoesMontar =
        document.querySelectorAll(
            ".btn-montar"
        );

    const btnFechar =
        document.getElementById(
            "btnFecharMonteSeu"
        );

    const btnEnviar =
        document.getElementById(
            "btnEnviarMonteSeu"
        );

    const tamanhoSelecionado =
        document.getElementById(
            "tamanhoSelecionado"
        );

    const tamanhoInput =
        document.getElementById(
            "tamanhoMonteSeu"
        );

    const precoBaseInput =
        document.getElementById(
            "precoBaseMonteSeu"
        );

    const totalElemento =
        document.getElementById(
            "totalMonteSeu"
        );

    const listaMeio =
        document.getElementById(
            "complementosMeio"
        );

    const listaTopo =
        document.getElementById(
            "complementosTopo"
        );


    if (
        !modal ||
        !btnFechar ||
        !btnEnviar ||
        !tamanhoSelecionado ||
        !tamanhoInput ||
        !precoBaseInput ||
        !totalElemento ||
        !listaMeio ||
        !listaTopo
    ) {

        return;

    }


    /* =====================================
       FORMATAÇÃO DE PREÇOS
    ===================================== */

    function formatarPreco(valor) {

        return valor.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }


    /* =====================================
       CRIAR COMPLEMENTOS
    ===================================== */

    function criarComplementos(
        container,
        camada
    ) {

        container.innerHTML =
            complementosDisponiveis
                .map(
                    (item, indice) => {

                        const preco =
                            item.preco.toFixed(2);

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
        listaMeio,
        "meio"
    );

    criarComplementos(
        listaTopo,
        "cobertura"
    );


    const complementos =
        document.querySelectorAll(
            ".complemento-monte-seu"
        );


    /* =====================================
       CALCULAR TOTAL
    ===================================== */

    function calcularTotal() {

        let total =
            Number(
                precoBaseInput.value
            ) || 0;

        complementos.forEach(
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

        totalElemento.textContent =
            formatarPreco(total);

        return total;

    }


    function limparConfigurador() {

        complementos.forEach(
            complemento => {

                complemento.checked =
                    false;

            }
        );

    }


    complementos.forEach(
        complemento => {

            complemento.addEventListener(
                "change",
                calcularTotal
            );

        }
    );


    /* =====================================
       ABRIR O MODAL
    ===================================== */

    botoesMontar.forEach(botao => {

        botao.addEventListener(
            "click",
            () => {

                limparConfigurador();

                tamanhoInput.value =
                    botao.dataset.tamanho;

                precoBaseInput.value =
                    botao.dataset.precoBase;

                tamanhoSelecionado
                    .textContent =
                    `Copo selecionado: ${botao.dataset.tamanho}ml`;

                calcularTotal();

                modal.style.display =
                    "flex";

                document.body.style
                    .overflow =
                    "hidden";

            }
        );

    });


    /* =====================================
       FECHAR O MODAL
    ===================================== */

    function fecharModal() {

        modal.style.display =
            "none";

        document.body.style
            .overflow =
            "";

    }


    btnFechar.addEventListener(
        "click",
        fecharModal
    );


    modal.addEventListener(
        "click",
        evento => {

            if (
                evento.target === modal
            ) {

                fecharModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key ===
                    "Escape" &&
                modal.style.display ===
                    "flex"
            ) {

                fecharModal();

            }

        }
    );


    /* =====================================
       COMPLEMENTOS ESCOLHIDOS
    ===================================== */

    function obterComplementos(
        camada
    ) {

        return Array
            .from(complementos)
            .filter(
                complemento => {

                    return (
                        complemento.checked &&
                        complemento
                            .dataset
                            .camada ===
                            camada
                    );

                }
            )
            .map(
                complemento =>
                    complemento.value
            );

    }


    function transformarEmLista(
        itens
    ) {

        if (
            itens.length === 0
        ) {

            return "• Nenhum complemento";

        }

        return itens
            .map(
                item =>
                    `• ${item}`
            )
            .join("\n");

    }


    /* =====================================
       SESSÃO DO CLIENTE
    ===================================== */

    function obterSessaoCliente() {

        const sessaoSalva =
            localStorage.getItem(
                "usuarioAzury"
            );

        if (!sessaoSalva) {

            return null;

        }

        try {

            const sessao =
                JSON.parse(
                    sessaoSalva
                );

            return sessao?.autenticado
                ? sessao
                : null;

        } catch (erro) {

            console.error(
                "Não foi possível ler a sessão do cliente:",
                erro
            );

            return null;

        }

    }


    /* =====================================
       REGISTRAR PEDIDO NO SISTEMA
    ===================================== */

    function registrarPedidoNoSistema(
        dados
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
            typeof window
                .AzuryPedidos
                .criarPedido !==
                "function"
        ) {

            console.error(
                "O serviço de pedidos não foi carregado."
            );

            alert(
                "Não foi possível registrar o pedido na Área do Cliente. O WhatsApp será aberto normalmente."
            );

            return null;

        }

        try {

            return window
                .AzuryPedidos
                .criarPedido(dados);

        } catch (erro) {

            console.error(
                "Não foi possível registrar o pedido:",
                erro
            );

            alert(
                "Não foi possível registrar o pedido na Área do Cliente. O WhatsApp será aberto normalmente."
            );

            return null;

        }

    }


    /* =====================================
       ENVIAR PARA O WHATSAPP
    ===================================== */

    btnEnviar.addEventListener(
        "click",
        () => {

            if (enviandoPedido) {

                return;

            }


            const nomeCliente =
                document
                    .getElementById(
                        "nomeCliente"
                    )
                    .value
                    .trim();


            const cepCliente =
                document
                    .getElementById(
                        "cepCliente"
                    )
                    .value
                    .trim();


            const ruaCliente =
                document
                    .getElementById(
                        "ruaCliente"
                    )
                    .value
                    .trim();


            const numeroCliente =
                document
                    .getElementById(
                        "numeroCliente"
                    )
                    .value
                    .trim();


            const bairroCliente =
                document
                    .getElementById(
                        "bairroCliente"
                    )
                    .value
                    .trim();


            const complementoCliente =
                document
                    .getElementById(
                        "complementoCliente"
                    )
                    .value
                    .trim();


            if (
                !nomeCliente ||
                !cepCliente ||
                !ruaCliente ||
                !numeroCliente ||
                !bairroCliente
            ) {

                alert(
                    "Preencha seu nome, CEP, rua, número e bairro para continuar."
                );

                return;

            }


            enviandoPedido = true;

            btnEnviar.disabled =
                true;

            btnEnviar.textContent =
                "Preparando pedido...";


            const tamanho =
                tamanhoInput.value;


            const total =
                calcularTotal();


            const complementosMeio =
                obterComplementos(
                    "meio"
                );


            const complementosCobertura =
                obterComplementos(
                    "cobertura"
                );


            const sessao =
                obterSessaoCliente();


            const complementosPedido = [

                ...complementosMeio.map(
                    item =>
                        `Meio: ${item}`
                ),

                ...complementosCobertura.map(
                    item =>
                        `Cobertura: ${item}`
                )

            ];


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

                    complementos:
                        complementosPedido,

                    itens: [
                        {
                            nome:
                                `Monte o Seu • ${tamanho}ml`,

                            quantidade:
                                1
                        }
                    ],

                    valorTotal:
                        total,

                    cliente: {
                        nome:
                            nomeCliente,

                        email:
                            sessao?.email ||
                            ""
                    },

                    enderecoEntrega: {
                        cep:
                            cepCliente,

                        rua:
                            ruaCliente,

                        numero:
                            numeroCliente,

                        bairro:
                            bairroCliente,

                        complemento:
                            complementoCliente
                    },

                    canal:
                        "Site / WhatsApp"

                });


            const identificacaoPedido =
                pedidoCriado?.id
                    ? `\n🧾 *Pedido:* ${pedidoCriado.id}\n`
                    : "";


            const mensagem = `

Olá! Quero fazer este pedido na AZURY:
${identificacaoPedido}
👤 *Cliente:*
${nomeCliente}

📍 *Endereço de entrega:*
${ruaCliente}, nº ${numeroCliente}
Bairro: ${bairroCliente}
CEP: ${cepCliente}
Complemento: ${complementoCliente || "Não informado"}

🥤 *Monte o Seu • ${tamanho}ml*

*Montagem do copo:*

1️⃣ 1/2 de açaí no fundo

*Complementos no meio:*
${transformarEmLista(complementosMeio)}

2️⃣ 2/2 de açaí por cima

*Complementos na cobertura:*
${transformarEmLista(complementosCobertura)}

*Total: ${formatarPreco(total)}*

            `.trim();


            const numeroWhatsApp =
                "5511958620266";


            const linkWhatsApp =
                `https://wa.me/${numeroWhatsApp}?text=` +
                encodeURIComponent(
                    mensagem
                );


            window.open(
                linkWhatsApp,
                "_blank",
                "noopener,noreferrer"
            );


            fecharModal();


            setTimeout(
                () => {

                    enviandoPedido =
                        false;

                    btnEnviar.disabled =
                        false;

                    btnEnviar.textContent =
                        "Pedir pelo WhatsApp";

                },
                1200
            );

        }
    );

});