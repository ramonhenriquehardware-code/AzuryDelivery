(function () {
    "use strict";

    const listaPedidos =
        document.getElementById(
            "listaPedidosAdmin"
        );

    const filtroStatus =
        document.getElementById(
            "filtroStatus"
        );

    const btnAtualizar =
        document.getElementById(
            "btnAtualizarPedidos"
        );

    const mensagemAdmin =
        document.getElementById(
            "mensagemAdmin"
        );

    const totalPedidos =
        document.getElementById(
            "totalPedidos"
        );

    const pedidosRecebidos =
        document.getElementById(
            "pedidosRecebidos"
        );

    const pedidosEmAndamento =
        document.getElementById(
            "pedidosEmAndamento"
        );

    const pedidosEntregues =
        document.getElementById(
            "pedidosEntregues"
        );

    let temporizadorMensagem = null;


    /* =====================================
       SEGURANÇA DOS TEXTOS
    ====================================== */

    function escaparTexto(texto) {
        return String(texto ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================
       NORMALIZAÇÃO
    ====================================== */

    function normalizarTexto(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }


    /* =====================================
       MENSAGENS DO PAINEL
    ====================================== */

    function mostrarMensagem(
        texto,
        tipo = "sucesso"
    ) {
        if (!mensagemAdmin) {
            return;
        }

        clearTimeout(
            temporizadorMensagem
        );

        mensagemAdmin.textContent =
            texto;

        mensagemAdmin.className =
            `mensagem-admin ${tipo}`;

        temporizadorMensagem =
            setTimeout(() => {
                mensagemAdmin.textContent =
                    "";

                mensagemAdmin.className =
                    "mensagem-admin";
            }, 5000);
    }


    /* =====================================
       FORMATAÇÃO DE VALORES
    ====================================== */

    function converterValor(valor) {
        if (
            window.AzuryPontuacao &&
            typeof window.AzuryPontuacao
                .converterValorParaNumero ===
            "function"
        ) {
            return window.AzuryPontuacao
                .converterValorParaNumero(
                    valor
                );
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

        const numero =
            Number(valorLimpo);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }


    function formatarMoeda(valor) {
        return converterValor(valor)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
    }


    /* =====================================
       FORMATAÇÃO DE DATAS
    ====================================== */

    function formatarDataPedido(pedido) {
        if (pedido.criadoEm) {
            const data =
                new Date(
                    pedido.criadoEm
                );

            if (
                !Number.isNaN(
                    data.getTime()
                )
            ) {
                return data.toLocaleString(
                    "pt-BR",
                    {
                        dateStyle: "short",
                        timeStyle: "short"
                    }
                );
            }
        }

        return (
            pedido.data ||
            "Data não informada"
        );
    }


    /* =====================================
       CLASSE VISUAL DO STATUS
    ====================================== */

    function obterClasseStatus(status) {
        const statusNormalizado =
            normalizarTexto(status);

        const classes = {
            "pedido recebido":
                "status-recebido",

            "em preparo":
                "status-preparo",

            "pronto":
                "status-pronto",

            "saiu para entrega":
                "status-entrega",

            "entregue":
                "status-entregue",

            "pedido entregue":
                "status-entregue",

            "cancelado":
                "status-cancelado"
        };

        return (
            classes[statusNormalizado] ||
            "status-recebido"
        );
    }


    /* =====================================
       OPÇÕES DE STATUS
    ====================================== */

    function criarOpcoesStatus(
        statusAtual
    ) {
        const statusDisponiveis =
            window.AzuryPedidos
                ?.STATUS_VALIDOS || [
                "Pedido recebido",
                "Em preparo",
                "Pronto",
                "Saiu para entrega",
                "Entregue",
                "Cancelado"
            ];

        return statusDisponiveis
            .map(status => {
                const selecionado =
                    status === statusAtual
                        ? "selected"
                        : "";

                return `
                    <option
                        value="${escaparTexto(status)}"
                        ${selecionado}
                    >
                        ${escaparTexto(status)}
                    </option>
                `;
            })
            .join("");
    }


    /* =====================================
       DADOS DO CLIENTE
    ====================================== */

    function obterNomeCliente(pedido) {
        return String(
            pedido.cliente?.nome ||
            pedido.nomeCliente ||
            "Não informado"
        ).trim();
    }


    function obterEmailCliente(pedido) {
        return String(
            pedido.cliente?.email ||
            pedido.emailCliente ||
            "Não informado"
        ).trim();
    }


    function obterCanalPedido(pedido) {
        return String(
            pedido.canal ||
            "Não informado"
        ).trim();
    }


    /* =====================================
       ENDEREÇO DO PEDIDO
    ====================================== */

    function criarHtmlEndereco(pedido) {
        const endereco =
            pedido.enderecoEntrega || {};

        const rua =
            String(
                endereco.rua || ""
            ).trim();

        const numero =
            String(
                endereco.numero || ""
            ).trim();

        const bairro =
            String(
                endereco.bairro || ""
            ).trim();

        const cep =
            String(
                endereco.cep || ""
            ).trim();

        const complemento =
            String(
                endereco.complemento || ""
            ).trim();

        const possuiEndereco =
            rua ||
            numero ||
            bairro ||
            cep ||
            complemento;

        if (!possuiEndereco) {
            return `
                <div>
                    <strong>
                        Endereço de entrega:
                    </strong>

                    Não informado.
                </div>
            `;
        }

        const linhaRua =
            [
                rua,
                numero
                    ? `nº ${numero}`
                    : ""
            ]
                .filter(Boolean)
                .map(escaparTexto)
                .join(", ");

        const linhaBairroCep =
            [
                bairro,
                cep
                    ? `CEP ${cep}`
                    : ""
            ]
                .filter(Boolean)
                .map(escaparTexto)
                .join(" • ");

        const linhaComplemento =
            complemento
                ? `
                    <div>
                        <strong>
                            Complemento:
                        </strong>

                        ${escaparTexto(
                    complemento
                )}
                    </div>
                `
                : "";

        return `
            <div>
                <strong>
                    Endereço de entrega:
                </strong>

                ${linhaRua ||
            "Rua não informada"
            }
            </div>

            ${linhaBairroCep
                ? `
                        <div>
                            ${linhaBairroCep}
                        </div>
                    `
                : ""
            }

            ${linhaComplemento}
        `;
    }


    /* =====================================
       COMPLEMENTOS
    ====================================== */

    function criarHtmlComplementos(
        complementos
    ) {
        if (
            !Array.isArray(
                complementos
            ) ||
            complementos.length === 0
        ) {
            return "";
        }

        const complementosPorCopo =
            complementos.every(
                item =>
                    Array.isArray(item)
            );

        if (complementosPorCopo) {
            return complementos
                .map(
                    (
                        complementosCopo,
                        indice
                    ) => `
                        <div>
                            <strong>
                                Copo ${indice + 1}:
                            </strong>

                            ${escaparTexto(
                        complementosCopo
                            .join(", ")
                    )}
                        </div>
                    `
                )
                .join("");
        }

        return `
            <div>
                <strong>
                    Complementos:
                </strong>

                ${escaparTexto(
            complementos.join(", ")
        )}
            </div>
        `;
    }


    /* =====================================
       ITENS DO PEDIDO
    ====================================== */

    function criarHtmlItens(pedido) {
        const partes = [];

        if (pedido.produto) {
            partes.push(`
                <div>
                    <strong>
                        Produto:
                    </strong>

                    ${escaparTexto(
                pedido.produto
            )}
                </div>
            `);
        }

        if (pedido.tamanho) {
            partes.push(`
                <div>
                    <strong>
                        Tamanho:
                    </strong>

                    ${escaparTexto(
                pedido.tamanho
            )}
                </div>
            `);
        }

        if (
            Number(
                pedido.quantidade
            ) > 1
        ) {
            partes.push(`
                <div>
                    <strong>
                        Quantidade:
                    </strong>

                    ${escaparTexto(
                pedido.quantidade
            )}
                </div>
            `);
        }

        if (
            Array.isArray(
                pedido.itens
            ) &&
            pedido.itens.length > 0
        ) {
            pedido.itens.forEach(
                (item, indice) => {
                    const nomeItem =
                        item.nome ||
                        item.produto ||
                        `Item ${indice + 1}`;

                    partes.push(`
                        <div>
                            <strong>
                                ${escaparTexto(
                        nomeItem
                    )}
                            </strong>

                            ${item.quantidade
                            ? ` — ${escaparTexto(
                                item.quantidade
                            )} unidade(s)`
                            : ""
                        }
                        </div>
                    `);
                }
            );
        }

        partes.push(
            criarHtmlComplementos(
                pedido.complementos
            )
        );

        const conteudo =
            partes
                .filter(Boolean)
                .join("");

        return (
            conteudo ||
            "<div>Detalhes não informados.</div>"
        );
    }


    /* =====================================
       CARD DO PEDIDO
    ====================================== */

    function criarHtmlPedido(pedido) {
        const idPedido =
            pedido.id ||
            "Sem código";

        const valorPedido =
            pedido.valorTotal ??
            pedido.total ??
            pedido.valor ??
            0;

        const pontosGerados =
            Number(
                pedido.pontosGerados
            ) || 0;

        const tipoPedido =
            pedido.tipo === "recompensa"
                ? "Recompensa"
                : "Compra";

        const nomeCliente =
            obterNomeCliente(pedido);

        const emailCliente =
            obterEmailCliente(pedido);

        const canalPedido =
            obterCanalPedido(pedido);

        return `
            <article
                class="pedido-admin"
                data-pedido-id="${escaparTexto(
            idPedido
        )}"
            >

                <div
                    class="pedido-admin-cabecalho"
                >

                    <div>

                        <h3
                            class="pedido-admin-codigo"
                        >
                            Pedido
                            ${escaparTexto(
            idPedido
        )}
                        </h3>

                        <p
                            class="pedido-admin-data"
                        >
                            ${escaparTexto(
            formatarDataPedido(
                pedido
            )
        )}
                        </p>

                    </div>

                    <span
                        class="
                            status-pedido-admin
                            ${obterClasseStatus(
            pedido.status
        )}
                        "
                    >
                        ${escaparTexto(
            pedido.status ||
            "Pedido recebido"
        )}
                    </span>

                </div>


                <div
                    class="pedido-admin-detalhes"
                >

                    <div
                        class="detalhe-pedido-admin"
                    >
                        <span>
                            Tipo
                        </span>

                        <strong>
                            ${escaparTexto(
            tipoPedido
        )}
                        </strong>
                    </div>


                    <div
                        class="detalhe-pedido-admin"
                    >
                        <span>
                            Valor
                        </span>

                        <strong>
                            ${formatarMoeda(
            valorPedido
        )}
                        </strong>
                    </div>


                    <div
                        class="detalhe-pedido-admin"
                    >
                        <span>
                            Pontos
                        </span>

                        <strong>
                            ${pedido.pontosCreditados
                ? `${pontosGerados} creditados`
                : "Aguardando entrega"
            }
                        </strong>
                    </div>


                    <div
                        class="detalhe-pedido-admin"
                    >
                        <span>
                            Cliente
                        </span>

                        <strong>
                            ${escaparTexto(
                nomeCliente
            )}
                        </strong>
                    </div>


                    <div
                        class="detalhe-pedido-admin"
                    >
                        <span>
                            E-mail
                        </span>

                        <strong>
                            ${escaparTexto(
                emailCliente
            )}
                        </strong>
                    </div>


                    <div
                        class="detalhe-pedido-admin"
                    >
                        <span>
                            Canal
                        </span>

                        <strong>
                            ${escaparTexto(
                canalPedido
            )}
                        </strong>
                    </div>

                </div>


                <div
                    class="pedido-admin-itens"
                >
                    ${criarHtmlEndereco(
                pedido
            )}
                </div>


                <div
                    class="pedido-admin-itens"
                >
                    ${criarHtmlItens(
                pedido
            )}
                </div>


                <div
                    class="pedido-admin-acoes"
                >

                    <label
                        class="campo-status"
                    >

                        <span>
                            Alterar status
                        </span>

                        <select
                            class="select-status-pedido"
                            data-status-original="${escaparTexto(
                pedido.status
            )}"
                        >
                            ${criarOpcoesStatus(
                pedido.status
            )}
                        </select>

                    </label>

                    <button
                        type="button"
                        class="btn-salvar-status"
                        disabled
                    >
                        Salvar status
                    </button>

                </div>

            </article>
        `;
    }


    /* =====================================
       RESUMO
    ====================================== */

    function atualizarResumo(pedidos) {
        const total =
            pedidos.length;

        const recebidos =
            pedidos.filter(
                pedido =>
                    normalizarTexto(
                        pedido.status
                    ) ===
                    "pedido recebido"
            ).length;

        const emAndamento =
            pedidos.filter(
                pedido => {
                    const status =
                        normalizarTexto(
                            pedido.status
                        );

                    return [
                        "em preparo",
                        "pronto",
                        "saiu para entrega"
                    ].includes(status);
                }
            ).length;

        const entregues =
            pedidos.filter(
                pedido => {
                    const status =
                        normalizarTexto(
                            pedido.status
                        );

                    return (
                        status ===
                        "entregue" ||
                        status ===
                        "pedido entregue"
                    );
                }
            ).length;

        if (totalPedidos) {
            totalPedidos.textContent =
                total;
        }

        if (pedidosRecebidos) {
            pedidosRecebidos.textContent =
                recebidos;
        }

        if (pedidosEmAndamento) {
            pedidosEmAndamento.textContent =
                emAndamento;
        }

        if (pedidosEntregues) {
            pedidosEntregues.textContent =
                entregues;
        }
    }


    /* =====================================
       CARREGAR PEDIDOS
    ====================================== */

    function obterPedidos() {
        if (
            !window.AzuryPedidos ||
            typeof window.AzuryPedidos
                .listarPedidos !==
            "function"
        ) {
            throw new Error(
                "O serviço de pedidos não foi carregado."
            );
        }

        return window.AzuryPedidos
            .listarPedidos();
    }


    /* =====================================
       RENDERIZAÇÃO
    ====================================== */

    function renderizarPedidos() {
        if (!listaPedidos) {
            return;
        }

        try {
            const todosPedidos =
                obterPedidos();

            atualizarResumo(
                todosPedidos
            );

            const filtro =
                filtroStatus?.value ||
                "todos";

            const pedidosFiltrados =
                filtro === "todos"
                    ? todosPedidos
                    : todosPedidos.filter(
                        pedido =>
                            pedido.status ===
                            filtro
                    );

            if (
                pedidosFiltrados.length ===
                0
            ) {
                listaPedidos.innerHTML = `
                    <div class="admin-vazio">

                        <span>
                            📭
                        </span>

                        <p>
                            Nenhum pedido encontrado.
                        </p>

                    </div>
                `;

                return;
            }

            listaPedidos.innerHTML =
                pedidosFiltrados
                    .map(
                        criarHtmlPedido
                    )
                    .join("");

        } catch (erro) {
            console.error(
                "Erro ao carregar pedidos:",
                erro
            );

            atualizarResumo([]);

            listaPedidos.innerHTML = `
                <div class="admin-vazio">

                    <span>
                        📭
                    </span>

                    <p>
                        Ainda não existem pedidos
                        cadastrados neste navegador.
                    </p>

                </div>
            `;
        }
    }


    /* =====================================
       ALTERAÇÃO DO SELECT
    ====================================== */

    function tratarAlteracaoStatus(
        evento
    ) {
        const select =
            evento.target.closest(
                ".select-status-pedido"
            );

        if (!select) {
            return;
        }

        const card =
            select.closest(
                ".pedido-admin"
            );

        const botao =
            card?.querySelector(
                ".btn-salvar-status"
            );

        if (!botao) {
            return;
        }

        const statusOriginal =
            select.dataset
                .statusOriginal;

        botao.disabled =
            select.value ===
            statusOriginal;
    }


    /* =====================================
       SALVAR NOVO STATUS
    ====================================== */

    function tratarCliqueLista(
        evento
    ) {
        const botao =
            evento.target.closest(
                ".btn-salvar-status"
            );

        if (!botao) {
            return;
        }

        const card =
            botao.closest(
                ".pedido-admin"
            );

        const select =
            card?.querySelector(
                ".select-status-pedido"
            );

        const idPedido =
            card?.dataset
                .pedidoId;

        if (
            !idPedido ||
            !select
        ) {
            mostrarMensagem(
                "Não foi possível identificar o pedido.",
                "erro"
            );

            return;
        }

        botao.disabled = true;
        botao.textContent =
            "Salvando...";

        try {
            const resultado =
                window.AzuryPedidos
                    .atualizarStatusPedido(
                        idPedido,
                        select.value
                    );

            const pontuacao =
                resultado
                    .resultadoPontuacao;

            if (
                select.value ===
                "Entregue" &&
                pontuacao
            ) {
                if (
                    pontuacao.creditado
                ) {
                    mostrarMensagem(
                        `Pedido entregue. ${pontuacao.pontos} pontos foram adicionados automaticamente ao cliente.`,
                        "sucesso"
                    );
                } else if (
                    pontuacao.pontos > 0
                ) {
                    mostrarMensagem(
                        "Pedido entregue. Os pontos deste pedido já haviam sido creditados.",
                        "aviso"
                    );
                } else {
                    mostrarMensagem(
                        `Pedido entregue. ${pontuacao.motivo}`,
                        "aviso"
                    );
                }
            } else {
                mostrarMensagem(
                    `Status alterado para “${select.value}”.`,
                    "sucesso"
                );
            }

            renderizarPedidos();

        } catch (erro) {
            console.error(
                "Erro ao atualizar status:",
                erro
            );

            mostrarMensagem(
                erro.message ||
                "Não foi possível atualizar o status.",
                "erro"
            );

            botao.disabled = false;
            botao.textContent =
                "Salvar status";
        }
    }


    /* =====================================
       EVENTOS
    ====================================== */

    if (filtroStatus) {
        filtroStatus.addEventListener(
            "change",
            renderizarPedidos
        );
    }

    if (btnAtualizar) {
        btnAtualizar.addEventListener(
            "click",
            () => {
                renderizarPedidos();

                mostrarMensagem(
                    "Lista de pedidos atualizada.",
                    "sucesso"
                );
            }
        );
    }

    if (listaPedidos) {
        listaPedidos.addEventListener(
            "change",
            tratarAlteracaoStatus
        );

        listaPedidos.addEventListener(
            "click",
            tratarCliqueLista
        );
    }


    /* =====================================
       INICIAR PAINEL
    ====================================== */

    renderizarPedidos();

})();