function inicializarRecompensas(usuario) {

    const recompensas =
        document.getElementById("recompensas");

    if (!recompensas) return;


    /* =====================================
       COMPLEMENTOS DISPONÍVEIS
    ===================================== */

    const complementosDisponiveis = [

        "Granola",
        "Leite condensado",
        "Paçoca",
        "Banana",
        "Manga",
        "Coco ralado",
        "Leite em pó",
        "Creme branco",
        "Doce de leite",
        "Oreo",
        "Ovomaltine",
        "Morango",
        "Uva verde",
        "Creme de avelã",
        "Nutella"

    ];


    /* =====================================
       RECOMPENSAS OFICIAIS
    ===================================== */

    const catalogoRecompensas = [

        {
            id: "100",
            pontos: 100,
            titulo: "1 Açaí de 400 ml",
            descricao: "Escolha 2 complementos.",
            tipo: "acai",
            tamanho: 400,
            quantidadeCopos: 1,
            limiteComplementos: 2,
            limiteMensal: 2,
            chaveControle: "recompensa100"
        },

        {
            id: "300",
            pontos: 300,
            titulo: "Código de 50% de desconto",
            descricao: "Receba um código exclusivo para utilizar em uma compra.",
            tipo: "cupom",
            limiteMensal: 2,
            chaveControle: "recompensa300"
        },

        {
            id: "600",
            pontos: 600,
            titulo: "1 Açaí de 700 ml",
            descricao: "Escolha 4 complementos.",
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
            descricao: "Escolha 4 complementos para cada copo.",
            tipo: "acai",
            tamanho: 700,
            quantidadeCopos: 2,
            limiteComplementos: 4,
            limiteMensal: null,
            chaveControle: null
        }

    ];


    /* =====================================
       NORMALIZAR OS DADOS
    ===================================== */

    usuario.saldoPontos =
        Math.max(
            0,
            Math.trunc(Number(usuario.saldoPontos) || 0)
        );

    usuario.pontosAcumulados =
        Math.max(
            0,
            Math.trunc(Number(usuario.pontosAcumulados) || 0)
        );

    usuario.pontos = usuario.saldoPontos;

    if (!Array.isArray(usuario.historico)) {
        usuario.historico = [];
    }

    if (!Array.isArray(usuario.pedidos)) {
        usuario.pedidos = [];
    }

    if (!Array.isArray(usuario.recompensasResgatadas)) {
        usuario.recompensasResgatadas = [];
    }

    if (!Array.isArray(usuario.codigosDesconto)) {
        usuario.codigosDesconto = [];
    }

    if (
        !usuario.controleResgates ||
        typeof usuario.controleResgates !== "object"
    ) {

        usuario.controleResgates = {
            mesReferencia: obterMesAtual(),
            recompensa100: 0,
            recompensa300: 0
        };

    }


    /* =====================================
       FUNÇÕES AUXILIARES
    ===================================== */

    function obterMesAtual() {

        const agora = new Date();

        return (
            agora.getFullYear() +
            "-" +
            String(agora.getMonth() + 1).padStart(2, "0")
        );

    }


    function obterDataHora() {

        const agora = new Date();

        return (
            agora.toLocaleDateString("pt-BR") +
            " às " +
            agora.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            })
        );

    }


    function salvarUsuario() {

        usuario.pontos = usuario.saldoPontos;

        localStorage.setItem(
            "clienteAzury",
            JSON.stringify(usuario)
        );

        localStorage.setItem(
            "usuarioAzury",
            JSON.stringify({
                ...usuario,
                autenticado: true
            })
        );

    }


    function gerarCodigoDesconto() {

        const codigoAleatorio =
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

        return `AZURY50-${codigoAleatorio}`;

    }


    function gerarIdPedido() {

        const parteAleatoria =
            Math.random()
                .toString(36)
                .substring(2, 7)
                .toUpperCase();

        return `AZR-${Date.now()}-${parteAleatoria}`;

    }


    function obterQuantidadeResgatadaNoMes(recompensa) {

        if (!recompensa.chaveControle) {
            return 0;
        }

        return (
            Number(
                usuario.controleResgates[
                    recompensa.chaveControle
                ]
            ) || 0
        );

    }


    function verificarRecompensa(recompensa) {

        if (usuario.saldoPontos < recompensa.pontos) {

            return {
                disponivel: false,
                mensagem:
                    `Faltam ${recompensa.pontos - usuario.saldoPontos} pontos`
            };

        }

        if (recompensa.limiteMensal !== null) {

            const quantidadeMensal =
                obterQuantidadeResgatadaNoMes(recompensa);

            if (
                quantidadeMensal >=
                recompensa.limiteMensal
            ) {

                return {
                    disponivel: false,
                    mensagem: "Limite mensal atingido"
                };

            }

            return {
                disponivel: true,
                mensagem:
                    `Disponível — ${quantidadeMensal} de ` +
                    `${recompensa.limiteMensal} resgates neste mês`
            };

        }

        return {
            disponivel: true,
            mensagem: "Disponível para resgate"
        };

    }


    /* =====================================
       EXIBIR AS RECOMPENSAS
    ===================================== */

    function renderizarRecompensas() {

        recompensas.innerHTML =
            catalogoRecompensas
                .map(recompensa => {

                    const situacao =
                        verificarRecompensa(recompensa);

                    const quantidadeMensal =
                        obterQuantidadeResgatadaNoMes(
                            recompensa
                        );

                    let informacaoLimite = "";

                    if (
                        recompensa.limiteMensal !== null
                    ) {

                        informacaoLimite = `

                            <small class="limite-recompensa">

                                Limite mensal:
                                ${quantidadeMensal} de
                                ${recompensa.limiteMensal}

                            </small>

                        `;

                    }

                    return `

                        <div class="recompensa-item">

                            <div class="recompensa-informacoes">

                                <strong>
                                    🎁 ${recompensa.titulo}
                                </strong>

                                <span>
                                    ${recompensa.descricao}
                                </span>

                                <span class="pontos-recompensa">
                                    ${recompensa.pontos} pontos
                                </span>

                                ${informacaoLimite}

                                <p class="status-recompensa">

                                    ${
                                        situacao.disponivel
                                            ? "🎉"
                                            : "🔒"
                                    }

                                    ${situacao.mensagem}

                                </p>

                            </div>

                            <button
                                type="button"
                                class="btn btn-resgatar-recompensa"
                                data-recompensa="${recompensa.id}"
                                ${
                                    situacao.disponivel
                                        ? ""
                                        : "disabled"
                                }
                            >
                                ${
                                    situacao.disponivel
                                        ? "Resgatar"
                                        : "Indisponível"
                                }
                            </button>

                        </div>

                    `;

                })
                .join("");


        const botoesResgate =
            document.querySelectorAll(
                ".btn-resgatar-recompensa"
            );

        botoesResgate.forEach(botao => {

            botao.addEventListener("click", () => {

                const idRecompensa =
                    botao.dataset.recompensa;

                const recompensa =
                    catalogoRecompensas.find(
                        item => item.id === idRecompensa
                    );

                if (!recompensa) return;

                const situacao =
                    verificarRecompensa(recompensa);

                if (!situacao.disponivel) {
                    return;
                }

                if (recompensa.tipo === "cupom") {

                    resgatarCodigoDesconto(recompensa);

                    return;

                }

                abrirModalRecompensaAcai(recompensa);

            });

        });

    }


    /* =====================================
       RESGATAR CÓDIGO DE 50%
    ===================================== */

    function resgatarCodigoDesconto(recompensa) {

        const situacao =
            verificarRecompensa(recompensa);

        if (!situacao.disponivel) return;

        const codigo =
            gerarCodigoDesconto();

        const dataHora =
            obterDataHora();

        usuario.saldoPontos -= recompensa.pontos;
        usuario.pontos = usuario.saldoPontos;

        usuario.controleResgates.recompensa300 += 1;

        usuario.codigosDesconto.unshift({

            codigo,
            desconto: 50,
            pontosUtilizados: recompensa.pontos,
            utilizado: false,
            criadoEm: new Date().toISOString()

        });

        usuario.recompensasResgatadas.unshift({

            id: `RESGATE-${Date.now()}`,
            tipo: "codigo-desconto",
            recompensa: recompensa.titulo,
            pontosUtilizados: recompensa.pontos,
            codigo,
            data: dataHora

        });

        usuario.historico.unshift(`

            🎟️ Resgatou um código de 50% de desconto

            <br>

            <small>
                ${recompensa.pontos} pontos utilizados —
                ${dataHora}
            </small>

        `);

        salvarUsuario();

        const codigoCupom =
            document.getElementById("codigoCupom");

        const modalCupom =
            document.getElementById("modalCupom");

        if (codigoCupom) {
            codigoCupom.textContent = codigo;
        }

        if (modalCupom) {
            modalCupom.style.display = "flex";
        }

    }


    /* =====================================
       ABRIR MODAL DO AÇAÍ
    ===================================== */

    function abrirModalRecompensaAcai(recompensa) {

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
            recompensa.quantidadeCopos === 1
                ? `Escolha exatamente ${recompensa.limiteComplementos} complementos.`
                : `Escolha exatamente ${recompensa.limiteComplementos} complementos para cada copo.`;

        if (mensagem) {
            mensagem.className = "mensagem";
            mensagem.textContent = "";
        }

        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar resgate";

        seletores.innerHTML = "";


        for (
            let numeroCopo = 1;
            numeroCopo <= recompensa.quantidadeCopos;
            numeroCopo++
        ) {

            const grupo =
                document.createElement("fieldset");

            grupo.className =
                "grupo-complementos-recompensa";

            const tituloGrupo =
                document.createElement("legend");

            tituloGrupo.textContent =
                recompensa.quantidadeCopos === 1
                    ? "Complementos do Açaí"
                    : `Complementos do copo ${numeroCopo}`;

            grupo.appendChild(tituloGrupo);


            complementosDisponiveis.forEach(
                complemento => {

                    const identificador =
                        `recompensa-${recompensa.id}-` +
                        `copo-${numeroCopo}-` +
                        complemento
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                            .normalize("NFD")
                            .replace(
                                /[\u0300-\u036f]/g,
                                ""
                            );

                    const label =
                        document.createElement("label");

                    label.className =
                        "opcao-complemento-recompensa";

                    const input =
                        document.createElement("input");

                    input.type = "checkbox";
                    input.value = complemento;
                    input.id = identificador;
                    input.dataset.copo =
                        String(numeroCopo);

                    const texto =
                        document.createElement("span");

                    texto.textContent = complemento;

                    label.appendChild(input);
                    label.appendChild(texto);

                    grupo.appendChild(label);


                    input.addEventListener(
                        "change",
                        () => {

                            controlarLimiteComplementos(
                                numeroCopo,
                                recompensa.limiteComplementos
                            );

                        }
                    );

                }
            );

            seletores.appendChild(grupo);

        }


        btnConfirmar.onclick = () => {

            confirmarResgateAcai(recompensa);

        };

        modal.style.display = "flex";

    }


    /* =====================================
       CONTROLAR LIMITE DE COMPLEMENTOS
    ===================================== */

    function controlarLimiteComplementos(
        numeroCopo,
        limite
    ) {

        const opcoes =
            document.querySelectorAll(
                `#seletoresComplementos ` +
                `input[data-copo="${numeroCopo}"]`
            );

        const selecionadas =
            Array.from(opcoes)
                .filter(opcao => opcao.checked);

        opcoes.forEach(opcao => {

            if (
                selecionadas.length >= limite &&
                !opcao.checked
            ) {

                opcao.disabled = true;

            } else {

                opcao.disabled = false;

            }

        });

    }


    /* =====================================
       CONFIRMAR RESGATE DE AÇAÍ
    ===================================== */

    function confirmarResgateAcai(recompensa) {

        const situacao =
            verificarRecompensa(recompensa);

        const mensagem =
            document.getElementById(
                "mensagemRecompensa"
            );

        const btnConfirmar =
            document.getElementById(
                "btnConfirmarResgate"
            );

        if (!situacao.disponivel) {

            if (mensagem) {

                mensagem.className =
                    "mensagem erro";

                mensagem.textContent =
                    situacao.mensagem;

            }

            return;

        }


        const complementosPorCopo = [];


        for (
            let numeroCopo = 1;
            numeroCopo <= recompensa.quantidadeCopos;
            numeroCopo++
        ) {

            const selecionados =
                Array.from(
                    document.querySelectorAll(
                        `#seletoresComplementos ` +
                        `input[data-copo="${numeroCopo}"]:checked`
                    )
                )
                .map(input => input.value);


            if (
                selecionados.length !==
                recompensa.limiteComplementos
            ) {

                if (mensagem) {

                    mensagem.className =
                        "mensagem erro";

                    mensagem.textContent =
                        recompensa.quantidadeCopos === 1
                            ? `Escolha exatamente ${recompensa.limiteComplementos} complementos.`
                            : `Escolha exatamente ${recompensa.limiteComplementos} complementos para o copo ${numeroCopo}.`;

                }

                return;

            }

            complementosPorCopo.push(selecionados);

        }


        const dataHora =
            obterDataHora();

        usuario.saldoPontos -= recompensa.pontos;
        usuario.pontos = usuario.saldoPontos;


        if (recompensa.chaveControle) {

            usuario.controleResgates[
                recompensa.chaveControle
            ] += 1;

        }


        const pedido = {

            id: gerarIdPedido(),

            tipo: "recompensa",

            produto: recompensa.titulo,

            tamanho: `${recompensa.tamanho} ml`,

            quantidade: recompensa.quantidadeCopos,

            complementos: complementosPorCopo,

            pontosUtilizados: recompensa.pontos,

            valor: "0,00",

            data: new Date().toLocaleDateString(
                "pt-BR"
            ),

            criadoEm: new Date().toISOString(),

            status: "Pedido recebido"

        };


        usuario.pedidos.unshift(pedido);


        usuario.recompensasResgatadas.unshift({

            id: `RESGATE-${Date.now()}`,

            tipo: "acai",

            recompensa: recompensa.titulo,

            pontosUtilizados: recompensa.pontos,

            complementos: complementosPorCopo,

            pedidoId: pedido.id,

            data: dataHora

        });


        const textoComplementos =
            complementosPorCopo
                .map((lista, indice) => {

                    if (
                        recompensa.quantidadeCopos === 1
                    ) {

                        return lista.join(", ");

                    }

                    return (
                        `Copo ${indice + 1}: ` +
                        lista.join(", ")
                    );

                })
                .join("<br>");


        usuario.historico.unshift(`

            🎁 Resgatou ${recompensa.titulo}

            <br>

            <small>
                ${textoComplementos}
            </small>

            <br>

            <small>
                ${recompensa.pontos} pontos utilizados —
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

            btnConfirmar.disabled = true;

            btnConfirmar.textContent =
                "Pedido criado ✓";

        }


        setTimeout(() => {

            window.location.reload();

        }, 1400);

    }


    /* =====================================
       FECHAR O MODAL DO AÇAÍ
    ===================================== */

    const btnFecharRecompensa =
        document.getElementById(
            "btnFecharRecompensa"
        );

    const modalRecompensaAcai =
        document.getElementById(
            "modalRecompensaAcai"
        );

    if (
        btnFecharRecompensa &&
        modalRecompensaAcai
    ) {

        btnFecharRecompensa.addEventListener(
            "click",
            () => {

                modalRecompensaAcai.style.display =
                    "none";

            }
        );

    }


    /* =====================================
       BOTÃO TEMPORÁRIO DE TESTE
    ===================================== */

    const btnAdicionarPontos =
        document.getElementById(
            "btnAdicionarPontos"
        );

    if (btnAdicionarPontos) {

        btnAdicionarPontos.addEventListener(
            "click",
            () => {

                usuario.pontosAcumulados += 10;
                usuario.saldoPontos += 10;
                usuario.pontos =
                    usuario.saldoPontos;

                const dataHora =
                    obterDataHora();

                usuario.historico.unshift(`

                    ⭐ Recebeu 10 pontos de teste

                    <br>

                    <small>
                        ${dataHora}
                    </small>

                `);

                salvarUsuario();

                window.location.reload();

            }
        );

    }


    /* =====================================
       INICIAR
    ===================================== */

    salvarUsuario();

    renderizarRecompensas();

}