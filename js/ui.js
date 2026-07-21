function inicializarUI() {

    const btnCopiar =
        document.getElementById("btnCopiarCupom");

    if (btnCopiar) {

        btnCopiar.addEventListener("click", () => {

            const codigo =
                document.getElementById("codigoCupom").innerText;

            navigator.clipboard.writeText(codigo);

            btnCopiar.innerHTML =
                "✅ Cupom Copiado";

        });

    }

    const btnFechar =
        document.getElementById("btnFecharModal");

    if (btnFechar) {

        btnFechar.addEventListener("click", () => {

            document.getElementById("modalCupom").style.display =
                "none";

            location.reload();

        });

    }

    const btnVerDetalhes =
        document.getElementById("btnVerDetalhes");

    const modalDetalhes =
        document.getElementById("modalDetalhesPontos");

    const btnFecharDetalhes =
        document.getElementById("btnFecharDetalhes");

    if (btnVerDetalhes && modalDetalhes) {

        btnVerDetalhes.addEventListener("click", () => {

            const usuario =
                JSON.parse(localStorage.getItem("clienteAzury"));

            if (!usuario) return;

            const pontos =
                Number(usuario.pontos) || 0;

            let nivel = "Bronze";
            let icone = "🥉";
            let meta = 100;
            let inicioNivel = 0;
            let proximoNivel = "Prata";

            if (pontos >= 100) {
                nivel = "Prata";
                icone = "🥈";
                inicioNivel = 100;
                meta = 300;
                proximoNivel = "Ouro";
            }

            if (pontos >= 300) {
                nivel = "Ouro";
                icone = "🥇";
                inicioNivel = 300;
                meta = 600;
                proximoNivel = "Diamante";
            }

            if (pontos >= 600) {
                nivel = "Diamante";
                icone = "💎";
            }

            document.getElementById("pontosModal").textContent =
                pontos;

            document.getElementById("nivelModal").textContent =
                `${icone} ${nivel}`;

            const progressoModal =
                document.getElementById("progressoModal");

            const faltamModal =
                document.getElementById("faltamModal");

            if (nivel === "Diamante") {

                progressoModal.style.width = "100%";

                faltamModal.textContent =
                    "🏆 Você atingiu o nível máximo!";

            } else {

                const porcentagem =
                    ((pontos - inicioNivel) /
                        (meta - inicioNivel)) * 100;

                progressoModal.style.width =
                    Math.min(Math.max(porcentagem, 0), 100) + "%";

                faltamModal.textContent =
                    `Faltam ${meta - pontos} pontos para o nível ${proximoNivel}.`;

            }

            modalDetalhes.style.display = "flex";

        });

    }

    if (btnFecharDetalhes && modalDetalhes) {

        btnFecharDetalhes.addEventListener("click", () => {

            modalDetalhes.style.display = "none";

        });

    }

    const btnVerTodosPedidos =
        document.getElementById("btnVerTodosPedidos");

    const modalTodosPedidos =
        document.getElementById("modalTodosPedidos");

    const btnFecharTodosPedidos =
        document.getElementById("btnFecharTodosPedidos");

    const listaTodosPedidos =
        document.getElementById("listaTodosPedidos");

    if (
        btnVerTodosPedidos &&
        modalTodosPedidos &&
        listaTodosPedidos
    ) {

        btnVerTodosPedidos.addEventListener("click", () => {

            const usuario =
                JSON.parse(localStorage.getItem("clienteAzury"));

            listaTodosPedidos.innerHTML = "";

            if (
                !usuario ||
                !Array.isArray(usuario.pedidos) ||
                usuario.pedidos.length === 0
            ) {

                listaTodosPedidos.innerHTML =
                    "<p>Nenhum pedido realizado.</p>";

            } else {

                const pedidosRecentes =
                    [...usuario.pedidos].reverse();

                pedidosRecentes.forEach(pedido => {

                    listaTodosPedidos.innerHTML += `

                    <div class="pedido">

                        <h4>
                            🥤 ${pedido.produto}
                        </h4>

                        <p>
                            📅 ${pedido.data}
                        </p>

                        <p>
                            💰 R$ ${pedido.valor}
                        </p>

                        <p class="status-entregue">
                            🟢 ${pedido.status}
                        </p>

                    </div>

                `;

                });

            }

            modalTodosPedidos.style.display = "flex";

        });

    }

    if (btnFecharTodosPedidos && modalTodosPedidos) {

        btnFecharTodosPedidos.addEventListener("click", () => {

            modalTodosPedidos.style.display = "none";

        });

    }

    const btnVerTodoHistorico =
        document.getElementById("btnVerTodoHistorico");

    const modalTodoHistorico =
        document.getElementById("modalTodoHistorico");

    const btnFecharTodoHistorico =
        document.getElementById("btnFecharTodoHistorico");

    const listaTodoHistorico =
        document.getElementById("listaTodoHistorico");

    if (
        btnVerTodoHistorico &&
        modalTodoHistorico &&
        listaTodoHistorico
    ) {

        btnVerTodoHistorico.addEventListener("click", () => {

            const usuario =
                JSON.parse(localStorage.getItem("clienteAzury"));

            listaTodoHistorico.innerHTML = "";

            if (
                !usuario ||
                !Array.isArray(usuario.historico) ||
                usuario.historico.length === 0
            ) {

                listaTodoHistorico.innerHTML =
                    "<p>Nenhuma atividade encontrada.</p>";

            } else {

                const historicoCompleto =
                    [...usuario.historico];

                historicoCompleto.forEach(item => {

                    listaTodoHistorico.innerHTML += `

                    <div class="historico-item">

                        ${item}

                    </div>

                `;

                });

            }

            modalTodoHistorico.style.display = "flex";

        });

    }

    if (btnFecharTodoHistorico && modalTodoHistorico) {

        btnFecharTodoHistorico.addEventListener("click", () => {

            modalTodoHistorico.style.display = "none";

        });

    }

}