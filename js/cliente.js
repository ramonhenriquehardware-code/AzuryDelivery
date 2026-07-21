document.addEventListener("DOMContentLoaded", () => {

    let sessao = null;
    let usuario = null;

    try {

        sessao = JSON.parse(
            localStorage.getItem("usuarioAzury")
        );

        usuario = JSON.parse(
            localStorage.getItem("clienteAzury")
        );

    } catch (erro) {

        sessao = null;
        usuario = null;

    }


    /* =====================================
       PROTEGER A ÁREA DO CLIENTE
    ===================================== */

    const sessaoValida = Boolean(
        sessao &&
        sessao.autenticado === true &&
        sessao.email
    );

    if (!sessaoValida) {

        localStorage.removeItem("usuarioAzury");

        window.location.replace("login.html");

        return;

    }


    /*
     * Se os dados cadastrados não forem encontrados,
     * usa os dados que estão na sessão.
     */
    if (!usuario) {

        usuario = {
            ...sessao
        };

    }


    /*
     * Impede que uma sessão de outro e-mail
     * abra uma conta diferente.
     */
    if (
        usuario.email &&
        sessao.email &&
        usuario.email !== sessao.email
    ) {

        localStorage.removeItem("usuarioAzury");

        window.location.replace("login.html");

        return;

    }


    /* =====================================
       BOTÃO SAIR
    ===================================== */

    const btnSair =
        document.getElementById("btnSair");

    if (btnSair) {

        btnSair.addEventListener("click", () => {

            /*
             * Remove somente a sessão.
             * A conta cadastrada continua salva.
             */
            localStorage.removeItem("usuarioAzury");

            window.location.replace("index.html");

        });

    }


    /* =====================================
       ATUALIZAR CONTAS ANTIGAS
    ===================================== */

    if (!Array.isArray(usuario.pedidos)) {

        usuario.pedidos = [

            {
                produto: "Azury Supreme",
                valor: "29,99",
                data: "18/07/2026",
                status: "Entregue"
            }

        ];

    }

    if (
        usuario.recompensaDisponivel === undefined
    ) {

        usuario.recompensaDisponivel = false;

    }

    if (usuario.cupom === undefined) {

        usuario.cupom = null;

    }

    if (!Array.isArray(usuario.historico)) {

        usuario.historico = [];

    }

    if (
        usuario.pontos === undefined ||
        Number.isNaN(Number(usuario.pontos))
    ) {

        usuario.pontos = 0;

    }


    /* =====================================
       SALVAR E INICIALIZAR
    ===================================== */

    localStorage.setItem(
        "clienteAzury",
        JSON.stringify(usuario)
    );

    /*
     * Mantém a sessão ativa com os dados atualizados.
     */
    localStorage.setItem(
        "usuarioAzury",
        JSON.stringify({
            ...usuario,
            autenticado: true
        })
    );


    inicializarPerfil(usuario);
    inicializarPontos(usuario);
    inicializarRecompensas(usuario);
    inicializarPedidos(usuario);
    inicializarHistorico(usuario);
    inicializarUI();

});




    



        




