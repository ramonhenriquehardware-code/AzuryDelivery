/* =========================================
   INTERFACE DA ÁREA DO CLIENTE — AZURY
========================================= */

function obterUsuarioAtualizado() {
    try {
        const dadosSalvos =
            localStorage.getItem(
                "clienteAzury"
            );

        return dadosSalvos
            ? JSON.parse(dadosSalvos)
            : null;

    } catch (erro) {
        console.error(
            "Erro ao carregar os dados do cliente:",
            erro
        );

        return null;
    }
}


function abrirModal(modal) {
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


function fecharModal(modal) {
    if (!modal) {
        return;
    }

    modal.style.display =
        "none";

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    const existeModalAberto =
        Array.from(
            document.querySelectorAll(
                ".modal"
            )
        ).some(
            item =>
                window
                    .getComputedStyle(item)
                    .display !== "none"
        );

    if (!existeModalAberto) {
        document.body.style.overflow =
            "";
    }
}


/* =========================================
   SEGURANÇA E FORMATAÇÃO
========================================= */

function escaparTextoInterface(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function converterValorInterface(valor) {
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

    let texto =
        String(valor ?? "")
            .trim()
            .replace(/\s/g, "")
            .replace("R$", "");

    if (!texto) {
        return 0;
    }

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


function formatarMoedaInterface(valor) {
    return converterValorInterface(valor)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}


/* =========================================
   COPIAR TEXTO
========================================= */

async function copiarTexto(texto) {
    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {
        await navigator.clipboard
            .writeText(texto);

        return;
    }

    const campoTemporario =
        document.createElement(
            "textarea"
        );

    campoTemporario.value =
        texto;

    campoTemporario.style.position =
        "fixed";

    campoTemporario.style.left =
        "-9999px";

    campoTemporario.style.opacity =
        "0";

    document.body.appendChild(
        campoTemporario
    );

    campoTemporario.focus();
    campoTemporario.select();

    const copiado =
        document.execCommand(
            "copy"
        );

    campoTemporario.remove();

    if (!copiado) {
        throw new Error(
            "O navegador não permitiu copiar o texto."
        );
    }
}


/* =========================================
   MODAL DE DETALHES DOS PONTOS
========================================= */

function atualizarModalPontos(usuario) {
    const pontosAcumulados =
        Math.max(
            0,
            Math.trunc(
                Number(
                    usuario?.pontosAcumulados
                ) || 0
            )
        );

    const saldoPontos =
        Math.max(
            0,
            Math.trunc(
                Number(
                    usuario?.saldoPontos
                ) || 0
            )
        );

    let nivel =
        "Bronze";

    let icone =
        "🥉";

    let inicioNivel =
        0;

    let fimNivel =
        100;

    let textoProgresso =
        `Faltam ${Math.max(
            100 - pontosAcumulados,
            0
        )} pontos para o nível Prata.`;

    if (
        pontosAcumulados >=
        100
    ) {
        nivel = "Prata";
        icone = "🥈";
        inicioNivel = 100;
        fimNivel = 300;

        textoProgresso =
            `Faltam ${Math.max(
                300 - pontosAcumulados,
                0
            )} pontos para o nível Ouro.`;
    }

    if (
        pontosAcumulados >=
        300
    ) {
        nivel = "Ouro";
        icone = "🥇";
        inicioNivel = 300;
        fimNivel = 600;

        textoProgresso =
            `Faltam ${Math.max(
                600 - pontosAcumulados,
                0
            )} pontos para o nível Diamante.`;
    }

    if (
        pontosAcumulados >=
        600
    ) {
        nivel = "Diamante";
        icone = "💎";
        inicioNivel = 600;
        fimNivel = 800;

        textoProgresso =
            `Faltam ${Math.max(
                800 - pontosAcumulados,
                0
            )} pontos para completar a faixa Diamante.`;
    }

    if (
        pontosAcumulados >=
        800
    ) {
        textoProgresso =
            "🏆 Você completou a faixa Diamante e permanece no nível máximo.";
    }

    const pontosDisponiveisModal =
        document.getElementById(
            "pontosDisponiveisModal"
        );

    const pontosModal =
        document.getElementById(
            "pontosModal"
        );

    const nivelModal =
        document.getElementById(
            "nivelModal"
        );

    const progressoModal =
        document.getElementById(
            "progressoModal"
        );

    const faltamModal =
        document.getElementById(
            "faltamModal"
        );

    if (pontosDisponiveisModal) {
        pontosDisponiveisModal.textContent =
            saldoPontos;
    }

    if (pontosModal) {
        pontosModal.textContent =
            pontosAcumulados;
    }

    if (nivelModal) {
        nivelModal.textContent =
            `${icone} ${nivel}`;
    }

    let porcentagem =
        100;

    if (
        pontosAcumulados <
        800
    ) {
        porcentagem =
            (
                (
                    pontosAcumulados -
                    inicioNivel
                ) /
                (
                    fimNivel -
                    inicioNivel
                )
            ) *
            100;
    }

    if (progressoModal) {
        progressoModal.style.width =
            `${Math.min(
                Math.max(
                    porcentagem,
                    0
                ),
                100
            )}%`;
    }

    if (faltamModal) {
        faltamModal.textContent =
            textoProgresso;
    }
}


/* =========================================
   TODOS OS PEDIDOS
========================================= */

function criarHtmlPedidoReserva(
    pedido
) {
    const produto =
        escaparTextoInterface(
            pedido?.produto ||
            "Pedido Azury"
        );

    const data =
        escaparTextoInterface(
            pedido?.data ||
            "Data não informada"
        );

    const status =
        escaparTextoInterface(
            pedido?.status ||
            "Pedido recebido"
        );

    const taxaEntrega =
        Math.max(
            0,
            converterValorInterface(
                pedido?.taxaEntrega ??
                pedido?.entrega ??
                0
            )
        );

    const totalInformado =
        Math.max(
            0,
            converterValorInterface(
                pedido?.valorTotal ??
                pedido?.total ??
                pedido?.valor ??
                0
            )
        );

    const produtosInformados =
        Math.max(
            0,
            converterValorInterface(
                pedido?.valorProdutos ??
                pedido?.subtotal ??
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

    const formaPagamento =
        escaparTextoInterface(
            pedido?.formaPagamento ||
            pedido?.pagamento ||
            "Não informada"
        );

    return `
        <div class="pedido">

            <h4>
                🥤 ${produto}
            </h4>

            <p>
                📅 ${data}
            </p>

            <p>
                🥤 Produtos:
                ${formatarMoedaInterface(
                    valorProdutos
                )}
            </p>

            <p>
                🛵 Taxa de entrega:
                ${formatarMoedaInterface(
                    taxaEntrega
                )}
            </p>

            <p>
                💰 Total:
                <strong>
                    ${formatarMoedaInterface(
                        valorTotal
                    )}
                </strong>
            </p>

            <p>
                💳 Pagamento:
                ${formaPagamento}
            </p>

            <p class="status-pedido">
                ${status}
            </p>

        </div>
    `;
}


function renderizarTodosPedidos(
    usuario
) {
    const listaTodosPedidos =
        document.getElementById(
            "listaTodosPedidos"
        );

    if (!listaTodosPedidos) {
        return;
    }

    if (
        !usuario ||
        !Array.isArray(
            usuario.pedidos
        ) ||
        usuario.pedidos.length ===
            0
    ) {
        listaTodosPedidos.innerHTML =
            "<p>Nenhum pedido realizado.</p>";

        return;
    }

    const funcaoCriarPedido =
        typeof window.criarHtmlPedido ===
            "function"
            ? window.criarHtmlPedido
            : (
                typeof criarHtmlPedido ===
                "function"
                    ? criarHtmlPedido
                    : criarHtmlPedidoReserva
            );

    listaTodosPedidos.innerHTML =
        usuario.pedidos
            .map(
                funcaoCriarPedido
            )
            .join("");
}


/* =========================================
   TODO O HISTÓRICO
========================================= */

function renderizarTodoHistorico(
    usuario
) {
    const listaTodoHistorico =
        document.getElementById(
            "listaTodoHistorico"
        );

    if (!listaTodoHistorico) {
        return;
    }

    if (
        !usuario ||
        !Array.isArray(
            usuario.historico
        ) ||
        usuario.historico.length ===
            0
    ) {
        listaTodoHistorico.innerHTML =
            "<p>Nenhuma atividade encontrada.</p>";

        return;
    }

    listaTodoHistorico.innerHTML =
        usuario.historico
            .map(
                item => `
                    <div class="historico-item">
                        ${String(item || "")}
                    </div>
                `
            )
            .join("");
}


/* =========================================
   INICIALIZAR INTERFACE
========================================= */

function inicializarUI() {
    const modalCupom =
        document.getElementById(
            "modalCupom"
        );

    const btnCopiarCupom =
        document.getElementById(
            "btnCopiarCupom"
        );

    const btnFecharModal =
        document.getElementById(
            "btnFecharModal"
        );

    const btnVerDetalhes =
        document.getElementById(
            "btnVerDetalhes"
        );

    const modalDetalhes =
        document.getElementById(
            "modalDetalhesPontos"
        );

    const btnFecharDetalhes =
        document.getElementById(
            "btnFecharDetalhes"
        );

    const btnVerTodosPedidos =
        document.getElementById(
            "btnVerTodosPedidos"
        );

    const modalTodosPedidos =
        document.getElementById(
            "modalTodosPedidos"
        );

    const btnFecharTodosPedidos =
        document.getElementById(
            "btnFecharTodosPedidos"
        );

    const btnVerTodoHistorico =
        document.getElementById(
            "btnVerTodoHistorico"
        );

    const modalTodoHistorico =
        document.getElementById(
            "modalTodoHistorico"
        );

    const btnFecharTodoHistorico =
        document.getElementById(
            "btnFecharTodoHistorico"
        );


    /* CUPOM */

    btnCopiarCupom
        ?.addEventListener(
            "click",
            async () => {
                const codigoCupom =
                    document.getElementById(
                        "codigoCupom"
                    );

                const codigo =
                    codigoCupom
                        ?.textContent
                        ?.trim() || "";

                if (!codigo) {
                    return;
                }

                const textoOriginal =
                    btnCopiarCupom.textContent;

                try {
                    await copiarTexto(
                        codigo
                    );

                    btnCopiarCupom.textContent =
                        "✅ Código copiado";

                } catch (erro) {
                    console.error(
                        "Erro ao copiar o código:",
                        erro
                    );

                    btnCopiarCupom.textContent =
                        "Não foi possível copiar";
                }

                setTimeout(
                    () => {
                        btnCopiarCupom.textContent =
                            textoOriginal;
                    },
                    2000
                );
            }
        );

    btnFecharModal
        ?.addEventListener(
            "click",
            () => {
                fecharModal(
                    modalCupom
                );

                window.location.reload();
            }
        );


    /* DETALHES DOS PONTOS */

    btnVerDetalhes
        ?.addEventListener(
            "click",
            () => {
                const usuario =
                    obterUsuarioAtualizado();

                if (!usuario) {
                    return;
                }

                atualizarModalPontos(
                    usuario
                );

                abrirModal(
                    modalDetalhes
                );
            }
        );

    btnFecharDetalhes
        ?.addEventListener(
            "click",
            () => {
                fecharModal(
                    modalDetalhes
                );
            }
        );


    /* TODOS OS PEDIDOS */

    btnVerTodosPedidos
        ?.addEventListener(
            "click",
            () => {
                const usuario =
                    obterUsuarioAtualizado();

                renderizarTodosPedidos(
                    usuario
                );

                abrirModal(
                    modalTodosPedidos
                );
            }
        );

    btnFecharTodosPedidos
        ?.addEventListener(
            "click",
            () => {
                fecharModal(
                    modalTodosPedidos
                );
            }
        );


    /* TODO O HISTÓRICO */

    btnVerTodoHistorico
        ?.addEventListener(
            "click",
            () => {
                const usuario =
                    obterUsuarioAtualizado();

                renderizarTodoHistorico(
                    usuario
                );

                abrirModal(
                    modalTodoHistorico
                );
            }
        );

    btnFecharTodoHistorico
        ?.addEventListener(
            "click",
            () => {
                fecharModal(
                    modalTodoHistorico
                );
            }
        );


    /* FECHAR MODAIS CLICANDO FORA */

    const modais =
        document.querySelectorAll(
            ".modal"
        );

    modais.forEach(
        modal => {
            modal.setAttribute(
                "aria-hidden",
                "true"
            );

            modal.addEventListener(
                "click",
                evento => {
                    if (
                        evento.target ===
                        modal
                    ) {
                        fecharModal(
                            modal
                        );
                    }
                }
            );
        }
    );


    /* FECHAR MODAIS COM ESC */

    document.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key !==
                "Escape"
            ) {
                return;
            }

            modais.forEach(
                modal => {
                    fecharModal(
                        modal
                    );
                }
            );
        }
    );
}