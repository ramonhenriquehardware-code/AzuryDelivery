/* =========================================
   INTERFACE DA ÁREA DO CLIENTE — AZURY
========================================= */

function obterUsuarioAtualizado() {

    try {

        return JSON.parse(
            localStorage.getItem("clienteAzury")
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar os dados do cliente:",
            erro
        );

        return null;

    }

}


function abrirModal(modal) {

    if (!modal) return;

    modal.style.display = "flex";

}


function fecharModal(modal) {

    if (!modal) return;

    modal.style.display = "none";

}


/* =========================================
   COPIAR TEXTO
========================================= */

async function copiarTexto(texto) {

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        await navigator.clipboard.writeText(texto);

        return;

    }

    const campoTemporario =
        document.createElement("textarea");

    campoTemporario.value = texto;
    campoTemporario.style.position = "fixed";
    campoTemporario.style.opacity = "0";

    document.body.appendChild(campoTemporario);

    campoTemporario.select();

    document.execCommand("copy");

    campoTemporario.remove();

}


/* =========================================
   MODAL DE DETALHES DOS PONTOS
========================================= */

function atualizarModalPontos(usuario) {

    const pontosAcumulados =
        Math.max(
            0,
            Math.trunc(
                Number(usuario.pontosAcumulados) || 0
            )
        );

    const saldoPontos =
        Math.max(
            0,
            Math.trunc(
                Number(usuario.saldoPontos) || 0
            )
        );


    let nivel = "Bronze";
    let icone = "🥉";

    let inicioNivel = 0;
    let fimNivel = 100;

    let textoProgresso =
        `Faltam ${100 - pontosAcumulados} pontos ` +
        `para o nível Prata.`;


    if (pontosAcumulados >= 100) {

        nivel = "Prata";
        icone = "🥈";

        inicioNivel = 100;
        fimNivel = 300;

        textoProgresso =
            `Faltam ${300 - pontosAcumulados} pontos ` +
            `para o nível Ouro.`;

    }


    if (pontosAcumulados >= 300) {

        nivel = "Ouro";
        icone = "🥇";

        inicioNivel = 300;
        fimNivel = 600;

        textoProgresso =
            `Faltam ${600 - pontosAcumulados} pontos ` +
            `para o nível Diamante.`;

    }


    if (pontosAcumulados >= 600) {

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


    if (pontosAcumulados >= 800) {

        textoProgresso =
            "🏆 Você completou a faixa Diamante e permanece no nível máximo.";

    }


    const pontosDisponiveisModal =
        document.getElementById(
            "pontosDisponiveisModal"
        );

    const pontosModal =
        document.getElementById("pontosModal");

    const nivelModal =
        document.getElementById("nivelModal");

    const progressoModal =
        document.getElementById("progressoModal");

    const faltamModal =
        document.getElementById("faltamModal");


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


    let porcentagem = 100;


    if (pontosAcumulados < 800) {

        porcentagem =
            (
                (pontosAcumulados - inicioNivel) /
                (fimNivel - inicioNivel)
            ) * 100;

    }


    if (progressoModal) {

        progressoModal.style.width =
            `${Math.min(
                Math.max(porcentagem, 0),
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

function renderizarTodosPedidos(usuario) {

    const listaTodosPedidos =
        document.getElementById(
            "listaTodosPedidos"
        );

    if (!listaTodosPedidos) return;


    listaTodosPedidos.innerHTML = "";


    if (
        !usuario ||
        !Array.isArray(usuario.pedidos) ||
        usuario.pedidos.length === 0
    ) {

        listaTodosPedidos.innerHTML =
            "<p>Nenhum pedido realizado.</p>";

        return;

    }


    if (
        typeof criarHtmlPedido === "function"
    ) {

        listaTodosPedidos.innerHTML =
            usuario.pedidos
                .map(criarHtmlPedido)
                .join("");

        return;

    }


    listaTodosPedidos.innerHTML =
        usuario.pedidos
            .map(pedido => {

                const produto =
                    pedido.produto ||
                    "Pedido Azury";

                const data =
                    pedido.data ||
                    "Data não informada";

                const valor =
                    pedido.valor ||
                    "0,00";

                const status =
                    pedido.status ||
                    "Pedido recebido";

                return `

                    <div class="pedido">

                        <h4>
                            🥤 ${produto}
                        </h4>

                        <p>
                            📅 ${data}
                        </p>

                        <p>
                            💰 R$ ${valor}
                        </p>

                        <p class="status-pedido">
                            ${status}
                        </p>

                    </div>

                `;

            })
            .join("");

}


/* =========================================
   TODO O HISTÓRICO
========================================= */

function renderizarTodoHistorico(usuario) {

    const listaTodoHistorico =
        document.getElementById(
            "listaTodoHistorico"
        );

    if (!listaTodoHistorico) return;


    listaTodoHistorico.innerHTML = "";


    if (
        !usuario ||
        !Array.isArray(usuario.historico) ||
        usuario.historico.length === 0
    ) {

        listaTodoHistorico.innerHTML =
            "<p>Nenhuma atividade encontrada.</p>";

        return;

    }


    listaTodoHistorico.innerHTML =
        usuario.historico
            .map(item => `

                <div class="historico-item">

                    ${item}

                </div>

            `)
            .join("");

}


/* =========================================
   INICIALIZAR INTERFACE
========================================= */

function inicializarUI() {

    /* =====================================
       MODAL DO CÓDIGO DE DESCONTO
    ===================================== */

    const modalCupom =
        document.getElementById("modalCupom");

    const btnCopiarCupom =
        document.getElementById(
            "btnCopiarCupom"
        );

    const btnFecharModal =
        document.getElementById(
            "btnFecharModal"
        );


    if (btnCopiarCupom) {

        btnCopiarCupom.addEventListener(
            "click",
            async () => {

                const codigoCupom =
                    document.getElementById(
                        "codigoCupom"
                    );

                const codigo =
                    codigoCupom
                        ? codigoCupom.textContent.trim()
                        : "";


                if (!codigo) return;


                try {

                    await copiarTexto(codigo);

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

            }
        );

    }


    if (btnFecharModal && modalCupom) {

        btnFecharModal.addEventListener(
            "click",
            () => {

                fecharModal(modalCupom);

                window.location.reload();

            }
        );

    }


    /* =====================================
       DETALHES DOS PONTOS
    ===================================== */

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


    if (btnVerDetalhes && modalDetalhes) {

        btnVerDetalhes.addEventListener(
            "click",
            () => {

                const usuario =
                    obterUsuarioAtualizado();

                if (!usuario) return;

                atualizarModalPontos(usuario);

                abrirModal(modalDetalhes);

            }
        );

    }


    if (
        btnFecharDetalhes &&
        modalDetalhes
    ) {

        btnFecharDetalhes.addEventListener(
            "click",
            () => {

                fecharModal(modalDetalhes);

            }
        );

    }


    /* =====================================
       TODOS OS PEDIDOS
    ===================================== */

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


    if (
        btnVerTodosPedidos &&
        modalTodosPedidos
    ) {

        btnVerTodosPedidos.addEventListener(
            "click",
            () => {

                const usuario =
                    obterUsuarioAtualizado();

                renderizarTodosPedidos(usuario);

                abrirModal(modalTodosPedidos);

            }
        );

    }


    if (
        btnFecharTodosPedidos &&
        modalTodosPedidos
    ) {

        btnFecharTodosPedidos.addEventListener(
            "click",
            () => {

                fecharModal(modalTodosPedidos);

            }
        );

    }


    /* =====================================
       TODO O HISTÓRICO
    ===================================== */

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


    if (
        btnVerTodoHistorico &&
        modalTodoHistorico
    ) {

        btnVerTodoHistorico.addEventListener(
            "click",
            () => {

                const usuario =
                    obterUsuarioAtualizado();

                renderizarTodoHistorico(usuario);

                abrirModal(modalTodoHistorico);

            }
        );

    }


    if (
        btnFecharTodoHistorico &&
        modalTodoHistorico
    ) {

        btnFecharTodoHistorico.addEventListener(
            "click",
            () => {

                fecharModal(modalTodoHistorico);

            }
        );

    }


    /* =====================================
       FECHAR MODAIS CLICANDO FORA
    ===================================== */

    const modais =
        document.querySelectorAll(".modal");


    modais.forEach(modal => {

        modal.addEventListener(
            "click",
            evento => {

                if (evento.target === modal) {

                    fecharModal(modal);

                }

            }
        );

    });


    /* =====================================
       FECHAR MODAIS COM ESC
    ===================================== */

    document.addEventListener(
        "keydown",
        evento => {

            if (evento.key !== "Escape") {
                return;
            }

            modais.forEach(modal => {

                fecharModal(modal);

            });

        }
    );

}