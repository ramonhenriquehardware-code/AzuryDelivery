document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const NUMERO_WHATSAPP = "5511960220402";
    const FUSO_HORARIO_LOJA = "America/Sao_Paulo";
    const HORA_ABERTURA = 15;

    const AREAS_ENTREGA = [
        {
            nome: "Americanópolis",
            taxa: 5.00,
            aliases: [
                "americanopolis"
            ]
        },

        {
            nome: "Vila Clara",
            taxa: 7.00,
            aliases: [
                "vila clara"
            ]
        },

        {
            nome: "Pantanal",
            taxa: 9.00,
            aliases: [
                "pantanal"
            ]
        },

        {
            nome: "Cidade Júlia",
            taxa: 9.00,
            aliases: [
                "cidade julia"
            ]
        },

        {
            nome: "Joaniza",
            taxa: 5.00,
            aliases: [
                "joaniza"
            ]
        },

        {
            nome: "Jardim Orly",
            taxa: 5.00,
            aliases: [
                "jardim orly",
                "jd orly"
            ]
        },

        {
            nome: "Jardim São Jorge",
            taxa: 5.00,
            aliases: [
                "jardim sao jorge",
                "jd sao jorge"
            ]
        },

        {
            nome: "Interlagos",
            taxa: 7.00,
            aliases: [
                "interlagos"
            ]
        },

        {
            nome: "Jardim Miriam",
            taxa: 8.00,
            aliases: [
                "jardim miriam",
                "jd miriam"
            ]
        },

        {
            nome: "Jardim Itapura",
            taxa: 5.00,
            aliases: [
                "jardim itapura",
                "jd itapura"
            ]
        },

        {
            nome: "Jardim Domitila",
            taxa: 5.00,
            aliases: [
                "jardim domitila",
                "jd domitila"
            ]
        },

        {
            nome: "Pedreira",
            taxa: 8.00,
            aliases: [
                "pedreira"
            ]
        },

        {
            nome: "Jardim Uberaba",
            taxa: 5.00,
            aliases: [
                "jardim uberaba",
                "jd uberaba"
            ]
        },

        {
            nome: "Cidade Ademar",
            taxa: 5.00,
            aliases: [
                "cidade ademar"
            ]
        },

        {
            nome: "Vila Missionária",
            taxa: 6.00,
            aliases: [
                "vila missionaria"
            ]
        },

        {
            nome: "Campo Grande",
            taxa: 6.00,
            aliases: [
                "campo grande"
            ]
        },

        {
            nome: "Vila Campo Grande",
            taxa: 5.00,
            aliases: [
                "vila campo grande"
            ]
        },

        {
            nome: "Vila Capela",
            taxa: 7.00,
            aliases: [
                "vila capela"
            ]
        },

        {
            nome: "Jardim Sul",
            taxa: 8.00,
            aliases: [
                "jardim sul",
                "jd sul"
            ]
        },

        {
            nome: "Jardim Melo",
            taxa: 8.00,
            aliases: [
                "jardim melo",
                "jd melo"
            ]
        },

        {
            nome: "Vila Guacuri",
            taxa: 8.00,
            aliases: [
                "vila guacuri",
                "guacuri"
            ]
        },

        {
            nome: "Jardim Selma",
            taxa: 5.00,
            aliases: [
                "jardim selma",
                "jd selma"
            ]
        },

        {
            nome: "Vila Império",
            taxa: 5.00,
            aliases: [
                "vila imperio"
            ]
        },

        {
            nome: "Vila Marari",
            taxa: 5.00,
            aliases: [
                "vila marari"
            ]
        },

        {
            nome: "Vila Constância",
            taxa: 5.00,
            aliases: [
                "vila constancia",
                "vila constanca"
            ]
        },

        {
            nome: "Vila Santana",
            taxa: 6.00,
            aliases: [
                "vila santana"
            ]
        },

        {
            nome: "Cupecê",
            taxa: 6.00,
            aliases: [
                "cupece"
            ]
        },

        {
            nome: "Jardim Itacolomi",
            taxa: 6.00,
            aliases: [
                "jardim itacolomi",
                "jd itacolomi"
            ]
        },

        {
            nome: "Vila Campestre",
            taxa: 7.00,
            aliases: [
                "vila campestre"
            ]
        },

        {
            nome: "Vila Santa Catarina",
            taxa: 7.00,
            aliases: [
                "vila santa catarina"
            ]
        },

        {
            nome: "Chácara Flora",
            taxa: 8.00,
            aliases: [
                "chacara flora"
            ]
        },

        {
            nome: "Jardim Marajoara",
            taxa: 8.00,
            aliases: [
                "jardim marajoara",
                "jd marajoara"
            ]
        },

        {
            nome: "Vila Sofia",
            taxa: 9.00,
            aliases: [
                "vila sofia"
            ]
        },

        {
            nome: "Jardim Taquaral",
            taxa: 6.00,
            aliases: [
                "jardim taquaral",
                "jd taquaral"
            ]
        },

        {
            nome: "Balneário Mar Paulista",
            taxa: 6.00,
            aliases: [
                "balneario mar paulista"
            ]
        },

        {
            nome: "Vila dos Andradas",
            taxa: 5.00,
            aliases: [
                "vila dos andradas"
            ]
        },

        {
            nome: "Vila Baby",
            taxa: 5.00,
            aliases: [
                "vila baby"
            ]
        },

        {
            nome: "Jardim Palmares (Zona Sul)",
            taxa: 5.00,
            aliases: [
                "jardim palmares zona sul",
                "jardim palmares",
                "jd palmares"
            ]
        },

        {
            nome: "Jardim Ubirajara (Zona Sul)",
            taxa: 5.00,
            aliases: [
                "jardim ubirajara zona sul",
                "jardim ubirajara",
                "jd ubirajara"
            ]
        },

        {
            nome: "Jardim Martini",
            taxa: 5.00,
            aliases: [
                "jardim martini",
                "jd martini"
            ]
        }
    ];


    const COMPLEMENTOS = [
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


    const $ = seletor =>
        document.querySelector(
            seletor
        );


    const $$ = seletor =>
        Array.from(
            document.querySelectorAll(
                seletor
            )
        );


    const modal =
        $("#modalMonteSeu");

    const conteudoModal =
        modal?.querySelector(
            ".conteudo-monte-seu"
        );

    const btnFechar =
        $("#btnFecharMonteSeu");

    const painelPedido =
        $("#painelPedido");

    const painelEntrega =
        $("#painelEntrega");

    const indicadores =
        $$(".etapa-indicador");

    const btnContinuar =
        $("#btnContinuarPedido");

    const btnVoltar =
        $("#btnVoltarPedido");

    const btnEnviar =
        $("#btnEnviarMonteSeu");


    const statusLoja =
        $("#statusLoja");

    const statusLojaTitulo =
        $("#statusLojaTitulo");

    const statusLojaMensagem =
        $("#statusLojaMensagem");

    const botoesMontar =
        $$(".btn-montar");

    const linksPedidoHorario =
        $$(".js-pedido-horario");


    const tamanhoInput =
        $("#tamanhoMonteSeu");

    const precoBaseInput =
        $("#precoBaseMonteSeu");

    const opcoesTamanho =
        $$(
            "input[name='tamanhoMonteSeuOpcao']"
        );

    const complementosMeio =
        $("#complementosMeio");

    const complementosTopo =
        $("#complementosTopo");


    const subtotalEl =
        $("#subtotalMonteSeu");

    const resumoSubtotalEl =
        $("#resumoSubtotalPedido");

    const resumoTaxaEl =
        $("#resumoTaxaEntrega");

    const totalEl =
        $("#totalMonteSeu");


    const nomeInput =
        $("#nomeCliente");

    const cepInput =
        $("#cepCliente");

    const ruaInput =
        $("#ruaCliente");

    const numeroInput =
        $("#numeroCliente");

    const bairroInput =
        $("#bairroCliente");

    const complementoInput =
        $("#complementoCliente");

    const statusEndereco =
        $("#statusEndereco");

    const enderecoValidadoInput =
        $("#enderecoValidado");

    const taxaEntregaInput =
        $("#taxaEntrega");


    let enviando =
        false;

    let consultandoCEP =
        false;

    let subtotalPedido =
        10.00;

    let idConsultaCEP =
        0;


    /* =====================================
       FUNÇÕES GERAIS
    ====================================== */

    function formatarPreco(valor) {
        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    function normalizarTexto(texto) {
        return String(
            texto || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .replace(
                /[^a-z0-9\s]/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }


    /* =====================================
       HORÁRIO DE FUNCIONAMENTO
    ====================================== */

    function obterDataHoraSaoPaulo(
        data = new Date()
    ) {
        const partes =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        FUSO_HORARIO_LOJA,

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit",

                    hour:
                        "2-digit",

                    minute:
                        "2-digit",

                    second:
                        "2-digit",

                    hourCycle:
                        "h23"
                }
            ).formatToParts(
                data
            );


        const valores = {};


        partes.forEach(
            parte => {
                if (
                    parte.type !==
                    "literal"
                ) {
                    valores[parte.type] =
                        Number(
                            parte.value
                        );
                }
            }
        );


        const diaSemana =
            new Date(
                Date.UTC(
                    valores.year,
                    valores.month - 1,
                    valores.day
                )
            ).getUTCDay();


        return {
            diaSemana,
            hora:
                valores.hour,
            minuto:
                valores.minute
        };
    }


    function obterEstadoLoja() {
        const agora =
            obterDataHoraSaoPaulo();


        const segundaFeira =
            agora.diaSemana === 1;


        const aberta =
            !segundaFeira &&
            agora.hora >=
            HORA_ABERTURA;


        if (aberta) {
            return {
                aberta:
                    true,

                titulo:
                    "ABERTO AGORA",

                mensagem:
                    "Faça seu pedido — atendimento até 00:00.",

                avisoBloqueio:
                    ""
            };
        }


        if (segundaFeira) {
            return {
                aberta:
                    false,

                titulo:
                    "FECHADO HOJE",

                mensagem:
                    "Abrimos terça-feira às 15:00.",

                avisoBloqueio:
                    "A Azury não funciona às segundas-feiras. Abrimos terça-feira às 15:00."
            };
        }


        return {
            aberta:
                false,

            titulo:
                "FECHADO NO MOMENTO",

            mensagem:
                "Abrimos hoje às 15:00.",

            avisoBloqueio:
                "A Azury está fechada no momento. Os pedidos são liberados de terça a domingo, das 15:00 às 00:00."
        };
    }


    function atualizarEstadoLoja() {
        const estado =
            obterEstadoLoja();


        if (statusLoja) {
            statusLoja.classList.toggle(
                "aberta",
                estado.aberta
            );

            statusLoja.classList.toggle(
                "fechada",
                !estado.aberta
            );
        }


        if (statusLojaTitulo) {
            statusLojaTitulo.textContent =
                estado.titulo;
        }


        if (statusLojaMensagem) {
            statusLojaMensagem.textContent =
                estado.mensagem;
        }


        botoesMontar.forEach(
            botao => {
                const emBreve =
                    botao.dataset
                        .disponibilidade ===
                    "em-breve";


                if (emBreve) {
                    botao.disabled =
                        true;

                    botao.textContent =
                        "Disponível em breve";

                    botao.classList.remove(
                        "btn-loja-fechada"
                    );

                    return;
                }


                botao.disabled =
                    !estado.aberta;

                botao.classList.toggle(
                    "btn-loja-fechada",
                    !estado.aberta
                );

                botao.textContent =
                    estado.aberta
                        ? botao.dataset
                            .textoAberto ||
                        "Montar meu açaí"
                        : "Loja fechada";
            }
        );


        linksPedidoHorario.forEach(
            link => {
                link.classList.toggle(
                    "pedido-bloqueado",
                    !estado.aberta
                );

                link.setAttribute(
                    "aria-disabled",
                    String(
                        !estado.aberta
                    )
                );
            }
        );


        if (btnContinuar) {
            btnContinuar.disabled =
                !estado.aberta;

            btnContinuar.textContent =
                estado.aberta
                    ? "Continuar para entrega"
                    : "Loja fechada";
        }


        if (
            btnEnviar &&
            !enviando
        ) {
            btnEnviar.disabled =
                !estado.aberta;

            btnEnviar.textContent =
                estado.aberta
                    ? "Pedir pelo WhatsApp"
                    : "Loja fechada";
        }


        return estado;
    }


    function bloquearPedidoForaDoHorario() {
        const estado =
            atualizarEstadoLoja();


        if (estado.aberta) {
            return false;
        }


        alert(
            estado.avisoBloqueio
        );


        return true;
    }


    /* =====================================
       MAPA DOS BAIRROS
    ====================================== */

    const MAPA_BAIRROS =
        new Map();


    AREAS_ENTREGA.forEach(
        area => {
            area.aliases.forEach(
                alias => {
                    MAPA_BAIRROS.set(
                        normalizarTexto(
                            alias
                        ),

                        {
                            nome:
                                area.nome,

                            taxa:
                                area.taxa
                        }
                    );
                }
            );
        }
    );


    /*
     * Os nomes maiores são verificados primeiro.
     * Assim, Vila Campo Grande não é confundida
     * com Campo Grande.
     */
    const ALIASES_ORDENADOS =
        Array.from(
            MAPA_BAIRROS.keys()
        ).sort(
            (
                primeiro,
                segundo
            ) =>
                segundo.length -
                primeiro.length
        );


    function localizarTaxaBairro(
        bairro
    ) {
        const bairroNormalizado =
            normalizarTexto(
                bairro
            );


        if (!bairroNormalizado) {
            return null;
        }


        const correspondenciaExata =
            MAPA_BAIRROS.get(
                bairroNormalizado
            );


        if (correspondenciaExata) {
            return correspondenciaExata;
        }


        const aliasEncontrado =
            ALIASES_ORDENADOS.find(
                alias =>
                    bairroNormalizado
                        .includes(
                            alias
                        ) ||
                    alias.includes(
                        bairroNormalizado
                    )
            );


        return aliasEncontrado
            ? MAPA_BAIRROS.get(
                aliasEncontrado
            )
            : null;
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


    function preencherNomeDaSessao() {
        const sessao =
            obterSessaoCliente();


        if (
            nomeInput &&
            sessao?.nome &&
            !nomeInput.value.trim()
        ) {
            nomeInput.value =
                sessao.nome;
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
            typeof window
                .AzuryPedidos
                .criarPedido !==
            "function"
        ) {
            alert(
                "O pedido será enviado ao WhatsApp, mas não foi possível registrá-lo na Área do Cliente."
            );

            return null;
        }


        try {
            return window
                .AzuryPedidos
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


    function abrirWhatsApp(
        mensagem
    ) {
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


    function abrirModal() {
        if (!modal) {
            return;
        }


        modal.style.display =
            "flex";

        document.body.style.overflow =
            "hidden";
    }


    function fecharModal() {
        if (!modal) {
            return;
        }


        modal.style.display =
            "none";

        document.body.style.overflow =
            "";
    }


    function mostrarEtapa(
        etapa
    ) {
        const primeiraEtapa =
            etapa === 1;


        if (painelPedido) {
            painelPedido.hidden =
                !primeiraEtapa;

            painelPedido.classList.toggle(
                "ativo",
                primeiraEtapa
            );
        }


        if (painelEntrega) {
            painelEntrega.hidden =
                primeiraEtapa;

            painelEntrega.classList.toggle(
                "ativo",
                !primeiraEtapa
            );
        }


        indicadores.forEach(
            indicador => {
                const numero =
                    Number(
                        indicador.dataset
                            .indicadorEtapa
                    );


                indicador.classList.toggle(
                    "ativa",
                    numero === etapa
                );


                indicador.classList.toggle(
                    "concluida",
                    numero < etapa
                );
            }
        );


        if (conteudoModal) {
            conteudoModal.scrollTop =
                0;
        }
    }


    function obterFormaPagamento() {
        return (
            document.querySelector(
                "input[name='formaPagamentoMonteSeu']:checked"
            )?.value || ""
        );
    }


    function limparFormaPagamento() {
        $$(
            "input[name='formaPagamentoMonteSeu']"
        ).forEach(
            opcao => {
                opcao.checked =
                    false;
            }
        );
    }


    function iniciarEnvio() {
        enviando =
            true;


        if (btnEnviar) {
            btnEnviar.disabled =
                true;

            btnEnviar.textContent =
                "Preparando pedido...";
        }
    }


    function finalizarEnvio() {
        setTimeout(
            () => {
                enviando =
                    false;


                if (btnEnviar) {
                    const estado =
                        obterEstadoLoja();


                    btnEnviar.disabled =
                        !estado.aberta;

                    btnEnviar.textContent =
                        estado.aberta
                            ? "Pedir pelo WhatsApp"
                            : "Loja fechada";
                }
            },
            1000
        );
    }


    /* =====================================
       COMPLEMENTOS
    ====================================== */

    function criarComplementos(
        container,
        camada
    ) {
        if (!container) {
            return;
        }


        container.innerHTML =
            COMPLEMENTOS.map(
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
                            R$ ${preco.replace(".", ",")}

                        </label>
                    `;
                }
            ).join("");
    }


    criarComplementos(
        complementosMeio,
        "meio"
    );


    criarComplementos(
        complementosTopo,
        "cobertura"
    );


    function todosComplementos() {
        return $$(
            ".complemento-monte-seu"
        );
    }


    function limparComplementos() {
        todosComplementos()
            .forEach(
                item => {
                    item.checked =
                        false;
                }
            );
    }


    function obterComplementos(
        camada
    ) {
        return todosComplementos()
            .filter(
                item =>
                    item.checked &&
                    item.dataset
                        .camada ===
                    camada
            )
            .map(
                item =>
                    item.value
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


    /* =====================================
       TAMANHOS E VALORES
    ====================================== */

    function atualizarTamanho(
        tamanho,
        precoBase
    ) {
        const tamanhoSeguro =
            [
                "300",
                "400",
                "700"
            ].includes(
                String(
                    tamanho
                )
            )
                ? String(
                    tamanho
                )
                : "300";


        const precoSeguro =
            Number(
                precoBase
            ) || 10.00;


        if (tamanhoInput) {
            tamanhoInput.value =
                tamanhoSeguro;
        }


        if (precoBaseInput) {
            precoBaseInput.value =
                String(
                    precoSeguro
                );
        }


        opcoesTamanho.forEach(
            opcao => {
                opcao.checked =
                    opcao.value ===
                    tamanhoSeguro;
            }
        );


        calcularSubtotal();
    }


    function calcularSubtotal() {
        let total =
            Number(
                precoBaseInput
                    ?.value
            ) || 0;


        todosComplementos()
            .forEach(
                item => {
                    if (item.checked) {
                        total +=
                            Number(
                                item.dataset
                                    .preco
                            ) || 0;
                    }
                }
            );


        subtotalPedido =
            total;


        if (subtotalEl) {
            subtotalEl.textContent =
                formatarPreco(
                    total
                );
        }


        if (resumoSubtotalEl) {
            resumoSubtotalEl.textContent =
                formatarPreco(
                    total
                );
        }


        atualizarTotalFinal();


        return total;
    }


    function atualizarTotalFinal() {
        const taxa =
            Number(
                taxaEntregaInput
                    ?.value
            ) || 0;


        const total =
            subtotalPedido +
            taxa;


        if (totalEl) {
            totalEl.textContent =
                formatarPreco(
                    total
                );
        }


        return total;
    }


    opcoesTamanho.forEach(
        opcao => {
            opcao.addEventListener(
                "change",
                () => {
                    if (!opcao.checked) {
                        return;
                    }


                    atualizarTamanho(
                        opcao.value,
                        opcao.dataset
                            .precoBase
                    );
                }
            );
        }
    );


    todosComplementos()
        .forEach(
            item => {
                item.addEventListener(
                    "change",
                    calcularSubtotal
                );
            }
        );


    /* =====================================
       ENDEREÇO E TAXA
    ====================================== */

    function definirStatusEndereco(
        mensagem,
        tipo = ""
    ) {
        if (!statusEndereco) {
            return;
        }


        statusEndereco.textContent =
            mensagem;


        statusEndereco.classList.remove(
            "sucesso",
            "erro",
            "carregando"
        );


        if (tipo) {
            statusEndereco.classList.add(
                tipo
            );
        }
    }


    function invalidarEndereco(
        mensagem,
        tipo = ""
    ) {
        idConsultaCEP +=
            1;

        consultandoCEP =
            false;


        if (
            enderecoValidadoInput
        ) {
            enderecoValidadoInput.value =
                "false";
        }


        if (
            taxaEntregaInput
        ) {
            taxaEntregaInput.value =
                "0";
        }


        if (ruaInput) {
            ruaInput.value =
                "";
        }


        if (bairroInput) {
            bairroInput.value =
                "";
        }


        if (resumoTaxaEl) {
            resumoTaxaEl.textContent =
                "A calcular";
        }


        definirStatusEndereco(
            mensagem,
            tipo
        );


        atualizarTotalFinal();
    }


    async function consultarCEP(
        cep
    ) {
        if (
            cep.length !==
            8
        ) {
            return;
        }


        const consultaAtual =
            ++idConsultaCEP;


        consultandoCEP =
            true;


        definirStatusEndereco(
            "Consultando o CEP...",
            "carregando"
        );


        try {
            const resposta =
                await fetch(
                    `https://viacep.com.br/ws/${cep}/json/`
                );


            if (
                consultaAtual !==
                idConsultaCEP
            ) {
                return;
            }


            if (!resposta.ok) {
                throw new Error(
                    "Falha ao consultar o CEP."
                );
            }


            const dados =
                await resposta.json();


            if (
                consultaAtual !==
                idConsultaCEP
            ) {
                return;
            }


            if (
                dados.erro ||
                !dados.bairro ||
                !dados.logradouro
            ) {
                invalidarEndereco(
                    "CEP inexistente ou sem endereço completo. Confira o número digitado.",
                    "erro"
                );

                return;
            }


            const entrega =
                localizarTaxaBairro(
                    dados.bairro
                );


            if (!entrega) {
                invalidarEndereco(
                    `Ainda não entregamos no bairro ${dados.bairro}. Atendemos somente os bairros cadastrados.`,
                    "erro"
                );

                return;
            }


            if (ruaInput) {
                ruaInput.value =
                    dados.logradouro;
            }


            if (bairroInput) {
                bairroInput.value =
                    entrega.nome;
            }


            if (
                enderecoValidadoInput
            ) {
                enderecoValidadoInput.value =
                    "true";
            }


            if (
                taxaEntregaInput
            ) {
                taxaEntregaInput.value =
                    String(
                        entrega.taxa
                    );
            }


            if (resumoTaxaEl) {
                resumoTaxaEl.textContent =
                    formatarPreco(
                        entrega.taxa
                    );
            }


            definirStatusEndereco(
                `Endereço validado. Entrega para ${entrega.nome}: ${formatarPreco(entrega.taxa)}.`,
                "sucesso"
            );


            atualizarTotalFinal();

        } catch (erro) {
            if (
                consultaAtual !==
                idConsultaCEP
            ) {
                return;
            }


            console.error(
                "Erro ao consultar o CEP:",
                erro
            );


            invalidarEndereco(
                "Não foi possível validar o CEP agora. Verifique sua conexão e tente novamente.",
                "erro"
            );

        } finally {
            if (
                consultaAtual ===
                idConsultaCEP
            ) {
                consultandoCEP =
                    false;
            }
        }
    }


    function aplicarMascaraCEP() {
        if (!cepInput) {
            return;
        }


        cepInput.addEventListener(
            "input",
            () => {
                const numeros =
                    cepInput.value
                        .replace(
                            /\D/g,
                            ""
                        )
                        .slice(
                            0,
                            8
                        );


                cepInput.value =
                    numeros.length > 5
                        ? `${numeros.slice(
                            0,
                            5
                        )}-${numeros.slice(
                            5
                        )}`
                        : numeros;


                invalidarEndereco(
                    "Informe um CEP válido para calcular a entrega."
                );


                if (
                    numeros.length === 8
                ) {
                    consultarCEP(
                        numeros
                    );
                }
            }
        );
    }


    function enderecoEstaValido() {
        const nome =
            nomeInput
                ?.value
                .trim() || "";


        const cep =
            cepInput
                ?.value
                .replace(
                    /\D/g,
                    ""
                ) || "";


        const rua =
            ruaInput
                ?.value
                .trim() || "";


        const numero =
            numeroInput
                ?.value
                .trim() || "";


        const bairro =
            bairroInput
                ?.value
                .trim() || "";


        return Boolean(
            enderecoValidadoInput
                ?.value ===
            "true" &&
            nome &&
            cep.length === 8 &&
            rua &&
            numero &&
            bairro &&
            Number(
                taxaEntregaInput
                    ?.value
            ) > 0
        );
    }


    function limparNovoPedido() {
        limparComplementos();

        limparFormaPagamento();


        if (cepInput) {
            cepInput.value =
                "";
        }


        if (numeroInput) {
            numeroInput.value =
                "";
        }


        if (complementoInput) {
            complementoInput.value =
                "";
        }


        invalidarEndereco(
            "Informe um CEP válido para calcular a entrega."
        );
    }


    /* =====================================
       ABRIR E NAVEGAR NO PEDIDO
    ====================================== */

    botoesMontar
        .forEach(
            botao => {
                botao.addEventListener(
                    "click",
                    () => {
                        if (
                            botao.dataset
                                .disponibilidade ===
                            "em-breve"
                        ) {
                            return;
                        }


                        if (
                            bloquearPedidoForaDoHorario()
                        ) {
                            return;
                        }


                        limparNovoPedido();


                        atualizarTamanho(
                            botao.dataset
                                .tamanho ||
                            "300",

                            botao.dataset
                                .precoBase ||
                            "10.00"
                        );


                        preencherNomeDaSessao();

                        mostrarEtapa(
                            1
                        );

                        abrirModal();
                    }
                );
            }
        );


    linksPedidoHorario.forEach(
        link => {
            link.addEventListener(
                "click",
                evento => {
                    if (
                        bloquearPedidoForaDoHorario()
                    ) {
                        evento.preventDefault();

                        document
                            .querySelector(
                                "#Cardapio"
                            )
                            ?.scrollIntoView({
                                behavior:
                                    "smooth",
                                block:
                                    "start"
                            });
                    }
                }
            );
        }
    );


    btnContinuar
        ?.addEventListener(
            "click",
            () => {
                if (
                    bloquearPedidoForaDoHorario()
                ) {
                    fecharModal();
                    return;
                }


                calcularSubtotal();

                mostrarEtapa(
                    2
                );
            }
        );


    btnVoltar
        ?.addEventListener(
            "click",
            () => {
                mostrarEtapa(
                    1
                );
            }
        );


    btnFechar
        ?.addEventListener(
            "click",
            fecharModal
        );


    modal
        ?.addEventListener(
            "click",
            evento => {
                if (
                    evento.target ===
                    modal
                ) {
                    fecharModal();
                }
            }
        );


    /* =====================================
       ENVIAR PEDIDO
    ====================================== */

    btnEnviar
        ?.addEventListener(
            "click",
            () => {
                if (enviando) {
                    return;
                }


                if (
                    bloquearPedidoForaDoHorario()
                ) {
                    fecharModal();
                    return;
                }


                if (consultandoCEP) {
                    alert(
                        "Aguarde a validação do CEP."
                    );

                    return;
                }


                const formaPagamento =
                    obterFormaPagamento();


                if (
                    !enderecoEstaValido()
                ) {
                    alert(
                        "Informe um endereço válido de um bairro atendido e aguarde a confirmação da taxa de entrega."
                    );

                    return;
                }


                if (!formaPagamento) {
                    alert(
                        "Escolha a forma de pagamento."
                    );

                    return;
                }


                const nome =
                    nomeInput.value
                        .trim();


                const cep =
                    cepInput.value
                        .trim();


                const rua =
                    ruaInput.value
                        .trim();


                const numero =
                    numeroInput.value
                        .trim();


                const bairro =
                    bairroInput.value
                        .trim();


                const complemento =
                    complementoInput
                        ?.value
                        .trim() || "";


                const tamanho =
                    tamanhoInput
                        ?.value ||
                    "300";


                const valorProdutos =
                    calcularSubtotal();


                const valorEntrega =
                    Number(
                        taxaEntregaInput
                            ?.value
                    ) || 0;


                const valorTotal =
                    valorProdutos +
                    valorEntrega;


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


                iniciarEnvio();


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

                        valorProdutos,

                        taxaEntrega:
                            valorEntrega,

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
                            complemento,

                            validado:
                                true
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

🧾 *Resumo dos valores:*
Pedido: ${formatarPreco(valorProdutos)}
Taxa de entrega: ${formatarPreco(valorEntrega)}

💰 *Total:*
${formatarPreco(valorTotal)}
                `.trim();


                abrirWhatsApp(
                    mensagem
                );


                fecharModal();

                finalizarEnvio();
            }
        );


    /* =====================================
       INICIALIZAÇÃO
    ====================================== */

    aplicarMascaraCEP();

    atualizarEstadoLoja();

    window.setInterval(
        atualizarEstadoLoja,
        30000
    );

    calcularSubtotal();

    mostrarEtapa(
        1
    );


    document.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key ===
                "Escape"
            ) {
                fecharModal();
            }
        }
    );
});