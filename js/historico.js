function inicializarHistorico(usuario) {

    const historico =
        document.getElementById("listaHistorico");

    if (!historico) return;

    historico.innerHTML = "";

    if (
        !Array.isArray(usuario.historico) ||
        usuario.historico.length === 0
    ) {

        historico.innerHTML =
            "<p>Nenhum histórico encontrado.</p>";

        return;

    }

    const atividadesRecentes =
        usuario.historico.slice(0, 4);

    atividadesRecentes.forEach(item => {

        historico.innerHTML += `

            <div class="historico-item">

                ${item}

            </div>

        `;

    });

}