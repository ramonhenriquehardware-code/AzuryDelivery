(function () {
    "use strict";

    let recompensaAtual = null;
    let usuarioAtual = null;

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function abrir(modal) {
        if (!modal) return;
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }

    function fechar(modal) {
        if (!modal) return;
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    function valorRecompensa(item, chaves, fallback = null) {
        for (const chave of chaves) {
            if (item && item[chave] !== null && item[chave] !== undefined && item[chave] !== "") {
                return item[chave];
            }
        }
        return fallback;
    }

    function normalizarRecompensa(item) {
        return {
            ...item,
            id: item.id,
            tipo: String(item.tipo || "acai").toLowerCase(),
            titulo: item.titulo || "Recompensa Azury",
            descricao: item.descricao || "Benefício exclusivo para clientes Azury.",
            pontos_necessarios: Math.max(0, Number(valorRecompensa(item, ["pontos_necessarios", "pontos"], 0)) || 0),
            tamanho_ml: Number(valorRecompensa(item, ["tamanho_ml"], 0)) || null,
            limite_complementos: Number(valorRecompensa(item, ["limite_complementos"], 0)) || 0,
            quantidade_copos: Math.max(1, Number(valorRecompensa(item, ["quantidade_copos"], 1)) || 1),
            percentual_desconto: Number(valorRecompensa(item, ["percentual_desconto"], 0)) || 0,
            limite_mensal: valorRecompensa(item, ["limite_mensal"], null)
        };
    }

    function mostrarMensagem(texto, tipo = "") {
        const elemento = document.getElementById("mensagemRecompensa");
        if (!elemento) return;
        elemento.className = `mensagem ${tipo}`;
        elemento.textContent = texto;
    }

    function renderizarComplementos(recompensa) {
        const container = document.getElementById("seletoresComplementos");
        if (!container) return;

        const limite = recompensa.limite_complementos;
        const complementos = Array.isArray(usuarioAtual?.complementosDisponiveis)
            ? usuarioAtual.complementosDisponiveis
            : [];

        if (!limite || !complementos.length) {
            container.innerHTML = "<p>Esta recompensa não exige escolha de complementos.</p>";
            return;
        }

        container.innerHTML = `
            <p class="limite-selecao-recompensa">Escolha até ${limite} complemento(s).</p>
            <div class="lista-complementos-recompensa">
                ${complementos.map(item => `
                    <label>
                        <input
                            type="checkbox"
                            class="complemento-recompensa"
                            value="${escapar(item.id || item.nome)}"
                            data-id="${escapar(item.id || "")}"
                            data-nome="${escapar(item.nome)}"
                        >
                        <span>${escapar(item.nome)}</span>
                    </label>
                `).join("")}
            </div>
        `;

        container.querySelectorAll(".complemento-recompensa").forEach(input => {
            input.addEventListener("change", () => {
                const marcados = Array.from(container.querySelectorAll(".complemento-recompensa:checked"));
                if (marcados.length > limite) {
                    input.checked = false;
                    mostrarMensagem(`Escolha no máximo ${limite} complemento(s).`, "erro");
                } else {
                    mostrarMensagem("", "");
                }
            });
        });
    }

    function complementosSelecionados() {
        return Array.from(document.querySelectorAll(".complemento-recompensa:checked"))
            .map(input => ({
                id: input.dataset.id || null,
                nome: input.dataset.nome || ""
            }))
            .filter(item => item.nome);
    }

    function abrirModalRecompensa(recompensa) {
        recompensaAtual = recompensa;
        const modal = document.getElementById("modalRecompensaAcai");
        const titulo = document.getElementById("tituloModalRecompensa");
        const descricao = document.getElementById("descricaoModalRecompensa");

        if (titulo) titulo.textContent = recompensa.titulo;
        if (descricao) descricao.textContent = recompensa.descricao;
        mostrarMensagem("", "");
        renderizarComplementos(recompensa);
        abrir(modal);
    }

    function mostrarCupom(resultado) {
        const codigo =
            resultado?.codigo_cupom ||
            resultado?.codigo ||
            resultado?.cupom ||
            resultado?.resgate?.codigo ||
            "";

        if (!codigo) return false;

        const codigoEl = document.getElementById("codigoCupom");
        if (codigoEl) codigoEl.textContent = codigo;
        abrir(document.getElementById("modalCupom"));
        return true;
    }

    async function confirmarResgate() {
        if (!recompensaAtual || !window.AzuryCliente?.resgatarRecompensa) {
            mostrarMensagem("Não foi possível iniciar o resgate.", "erro");
            return;
        }

        const botao = document.getElementById("btnConfirmarResgate");
        const selecionados = complementosSelecionados();

        if (
            recompensaAtual.tipo === "acai" &&
            recompensaAtual.limite_complementos > 0 &&
            selecionados.length > recompensaAtual.limite_complementos
        ) {
            mostrarMensagem(`Escolha no máximo ${recompensaAtual.limite_complementos} complemento(s).`, "erro");
            return;
        }

        botao.disabled = true;
        botao.textContent = "Resgatando...";

        try {
            const resultado = await window.AzuryCliente.resgatarRecompensa(
                recompensaAtual,
                selecionados
            );

            fechar(document.getElementById("modalRecompensaAcai"));

            if (!mostrarCupom(resultado)) {
                alert("Recompensa resgatada com sucesso!");
                window.location.reload();
            }
        } catch (erro) {
            console.error("Erro ao resgatar recompensa:", erro);
            mostrarMensagem(erro.message || "Não foi possível resgatar a recompensa.", "erro");
        } finally {
            botao.disabled = false;
            botao.textContent = "Confirmar resgate";
        }
    }

    function renderizar(usuario) {
        const container = document.getElementById("recompensas");
        if (!container) return;

        usuarioAtual = usuario;
        const saldo = Math.max(0, Number(usuario.saldoPontos ?? usuario.pontos) || 0);
        const recompensas = (Array.isArray(usuario.recompensasCatalogo)
            ? usuario.recompensasCatalogo
            : [])
            .map(normalizarRecompensa);

        if (!recompensas.length) {
            container.innerHTML = "<p>Nenhuma recompensa disponível no momento.</p>";
            return;
        }

        container.innerHTML = recompensas.map(item => {
            const disponivel = saldo >= item.pontos_necessarios;
            const faltam = Math.max(0, item.pontos_necessarios - saldo);
            const beneficio = item.tipo === "cupom"
                ? `${item.percentual_desconto}% de desconto`
                : `${item.quantidade_copos} Açaí(s) de ${item.tamanho_ml || "—"} ml`;

            return `
                <div class="recompensa-item">
                    <div class="recompensa-informacoes">
                        <strong>🎁 ${escapar(item.titulo)}</strong>
                        <span>${escapar(item.descricao)}</span>
                        <span>${escapar(beneficio)}</span>
                        <span class="pontos-recompensa">${item.pontos_necessarios} pontos</span>
                        <p class="status-recompensa">
                            ${disponivel ? "🎉 Disponível para resgate" : `🔒 Faltam ${faltam} pontos`}
                        </p>
                    </div>
                    <button
                        type="button"
                        class="btn btn-resgatar-recompensa"
                        data-recompensa-id="${escapar(item.id)}"
                        ${disponivel ? "" : "disabled"}
                    >
                        ${disponivel ? "Resgatar" : "Indisponível"}
                    </button>
                </div>
            `;
        }).join("");

        container.querySelectorAll("[data-recompensa-id]").forEach(botao => {
            botao.addEventListener("click", () => {
                const recompensa = recompensas.find(
                    item => String(item.id) === String(botao.dataset.recompensaId)
                );
                if (!recompensa) return;
                abrirModalRecompensa(recompensa);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById("btnConfirmarResgate")?.addEventListener("click", confirmarResgate);
        document.getElementById("btnFecharRecompensa")?.addEventListener("click", () => {
            fechar(document.getElementById("modalRecompensaAcai"));
        });
    });

    window.inicializarRecompensas = renderizar;
})();
