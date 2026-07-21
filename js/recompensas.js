function inicializarRecompensas(usuario) {

    const pontos = usuario.pontos || 0;

    if (!usuario.historico) {
        usuario.historico = [];
    }

    const recompensas = document.getElementById("recompensas");

    if (!recompensas) return;

    // Libera recompensa automaticamente
    if (pontos >= 100 && !usuario.recompensaDisponivel) {

        usuario.recompensaDisponivel = true;

        usuario.cupom =
            "AZURY-" +
            Math.random().toString(36).substring(2, 8).toUpperCase();

        localStorage.setItem(
            "clienteAzury",
            JSON.stringify(usuario)
        );

    }

    // Mostra recompensa
    if (usuario.recompensaDisponivel) {

        recompensas.innerHTML = `
            <h3>🎉 Parabéns!</h3>

            <p>Você ganhou:</p>

            <strong>🥤 1 Açaí 300ml</strong>

            <br><br>

            <button class="btn" id="btnResgatar">
                Resgatar Recompensa
            </button>
        `;

        const btnResgatar =
            document.getElementById("btnResgatar");

        btnResgatar.addEventListener("click", () => {

            if (!Array.isArray(usuario.historico)) {
                usuario.historico = [];
            }

            usuario.pontos = Number(usuario.pontos) - 100;
            usuario.recompensaDisponivel = false;

            const agora = new Date();

            const dataHora =
                agora.toLocaleDateString("pt-BR") +
                " às " +
                agora.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                });

            usuario.historico.unshift(
                `🎁 Resgatou um Açaí 300ml<br><small>${dataHora}</small>`
            );

            localStorage.setItem(
                "clienteAzury",
                JSON.stringify(usuario)
            );

            const codigoCupom =
                document.getElementById("codigoCupom");

            const modalCupom =
                document.getElementById("modalCupom");

            codigoCupom.textContent = usuario.cupom;
            modalCupom.style.display = "flex";

        });

    }

    // Botão de teste (+10 pontos)
    const btnAdicionar =
        document.getElementById("btnAdicionarPontos");

    if (btnAdicionar) {

        btnAdicionar.addEventListener("click", () => {

            usuario.pontos += 10;

            const agora = new Date();

            const dataHora =
                agora.toLocaleDateString("pt-BR") +
                " às " +
                agora.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                });

            usuario.historico.unshift(
                `⭐ +10 Pontos<br><small>${dataHora}</small>`
            );

            localStorage.setItem(
                "clienteAzury",
                JSON.stringify(usuario)
            );

            location.reload();

        });

    }

}