document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const linkConta = document.getElementById("linkConta");
    const supabase = window.azurySupabase;

    if (!linkConta || !supabase) {
        return;
    }

    function atualizarLink(session) {
        if (session?.user) {
            linkConta.textContent = "Minha conta";
            linkConta.href = "cliente.html";
            linkConta.setAttribute("aria-label", "Abrir minha área de cliente");
        } else {
            linkConta.textContent = "Entrar";
            linkConta.href = "login.html";
            linkConta.setAttribute("aria-label", "Entrar na conta Azury");
        }
    }

    supabase.auth.getSession()
        .then(({ data, error }) => {
            if (error) throw error;
            atualizarLink(data.session);
        })
        .catch(erro => {
            console.error("Não foi possível verificar a sessão:", erro);
            atualizarLink(null);
        });

    supabase.auth.onAuthStateChange((_evento, session) => {
        atualizarLink(session);
    });
});
