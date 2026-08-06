(function () {
    "use strict";

    const supabase = window.AzurySupabase;

    if (!supabase) {
        console.error("Cliente Supabase não disponível.");
        return;
    }

    const STATUS_LABELS = Object.freeze({
        recebido: "Pedido recebido",
        confirmado: "Pedido aceito",
        em_preparo: "Em preparo",
        pronto: "Pronto",
        saiu_para_entrega: "Saiu para entrega",
        entregue: "Entregue",
        cancelado: "Cancelado"
    });

    const NEXT_STATUS = Object.freeze({
        recebido: {
            status: "confirmado",
            label: "Aceitar pedido",
            className: "btn-primary"
        },
        confirmado: {
            status: "em_preparo",
            label: "Iniciar preparo",
            className: "btn-warning"
        },
        em_preparo: {
            status: "pronto",
            label: "Marcar como pronto",
            className: "btn-primary"
        },
        pronto: {
            status: "saiu_para_entrega",
            label: "Dar saída para entrega",
            className: "btn-primary",
            confirmTitle: "Dar saída para entrega",
            confirmMessage: "Confirma que o pedido está pronto e foi entregue ao responsável pela entrega?",
            confirmText: "Confirmar saída"
        },
        saiu_para_entrega: {
            status: "entregue",
            label: "Finalizar como entregue",
            className: "btn-success",
            confirmTitle: "Finalizar pedido",
            confirmMessage: "Confirma que o pedido foi entregue ao cliente? Esta ação concluirá o pedido.",
            confirmText: "Confirmar entrega"
        }
    });

    const SECTION_TITLES = Object.freeze({
        "visao-geral": "Visão geral",
        pedidos: "Pedidos",
        clientes: "Clientes",
        cardapio: "Cardápio",
        entregas: "Entregas",
        horarios: "Loja e horários",
        recompensas: "Recompensas",
        equipe: "Equipe administrativa",
        auditoria: "Auditoria"
    });

    const state = {
        session: null,
        admin: null,
        currentSection: "visao-geral",
        pedidos: [],
        resumoPedidos: {},
        clientes: [],
        resumoClientes: {},
        operacao: null,
        equipe: [],
        resumoEquipe: {},
        auditoria: [],
        refreshTimer: null,
        modalSubmit: null,
        messageTimer: null,
        manualItemCounter: 0
    };

    const el = {
        appLoading: document.getElementById("appLoading"),
        authView: document.getElementById("authView"),
        adminApp: document.getElementById("adminApp"),
        loginForm: document.getElementById("adminLoginForm"),
        loginButton: document.getElementById("adminLoginButton"),
        authMessage: document.getElementById("authMessage"),
        email: document.getElementById("adminEmail"),
        password: document.getElementById("adminPassword"),
        logoutButton: document.getElementById("logoutButton"),
        sidebar: document.getElementById("sidebar"),
        sidebarBackdrop: document.getElementById("sidebarBackdrop"),
        menuButton: document.getElementById("menuButton"),
        pageTitle: document.getElementById("pageTitle"),
        globalRefreshButton: document.getElementById("globalRefreshButton"),
        globalMessage: document.getElementById("globalMessage"),
        connectionStatus: document.getElementById("connectionStatus"),
        sidebarAdminName: document.getElementById("sidebarAdminName"),
        sidebarAdminLevel: document.getElementById("sidebarAdminLevel"),
        overviewCards: document.getElementById("overviewCards"),
        storeStatusPanel: document.getElementById("storeStatusPanel"),
        recentOrders: document.getElementById("recentOrders"),
        ordersStatusFilter: document.getElementById("ordersStatusFilter"),
        refreshOrdersButton: document.getElementById("refreshOrdersButton"),
        ordersSummary: document.getElementById("ordersSummary"),
        ordersList: document.getElementById("ordersList"),
        clientsSearchForm: document.getElementById("clientsSearchForm"),
        clientsSearch: document.getElementById("clientsSearch"),
        clientsActiveFilter: document.getElementById("clientsActiveFilter"),
        clientsSummary: document.getElementById("clientsSummary"),
        clientsList: document.getElementById("clientsList"),
        sizesList: document.getElementById("sizesList"),
        complementsList: document.getElementById("complementsList"),
        newComplementButton: document.getElementById("newComplementButton"),
        neighborhoodsList: document.getElementById("neighborhoodsList"),
        newNeighborhoodButton: document.getElementById("newNeighborhoodButton"),
        storeConfigForm: document.getElementById("storeConfigForm"),
        schedulesList: document.getElementById("schedulesList"),
        rewardsList: document.getElementById("rewardsList"),
        newRewardButton: document.getElementById("newRewardButton"),
        teamSummary: document.getElementById("teamSummary"),
        teamList: document.getElementById("teamList"),
        newTeamMemberButton: document.getElementById("newTeamMemberButton"),
        auditFilterForm: document.getElementById("auditFilterForm"),
        auditEntityFilter: document.getElementById("auditEntityFilter"),
        auditList: document.getElementById("auditList"),
        modalBackdrop: document.getElementById("modalBackdrop"),
        modalTitle: document.getElementById("modalTitle"),
        modalCloseButton: document.getElementById("modalCloseButton"),
        dynamicModalForm: document.getElementById("dynamicModalForm")
    };

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function firstDefined(object, keys, fallback = "") {
        if (!object || typeof object !== "object") return fallback;
        for (const key of keys) {
            const value = object[key];
            if (value !== undefined && value !== null && value !== "") return value;
        }
        return fallback;
    }

    function toNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function formatMoney(value) {
        return toNumber(value).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatDate(value) {
        if (!value) return "Não informado";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }

    function formatTime(value) {
        if (!value) return "—";
        return String(value).slice(0, 5);
    }

    function statusLabel(status) {
        return STATUS_LABELS[status] || String(status || "Não informado");
    }

    function booleanText(value) {
        return value === true ? "Sim" : "Não";
    }

    function setLoading(container, text = "Carregando...") {
        if (container) container.innerHTML = `<div class="loading-state">${escapeHtml(text)}</div>`;
    }

    function setEmpty(container, text) {
        if (container) container.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
    }

    function showMessage(text, type = "success") {
        if (!el.globalMessage) return;
        clearTimeout(state.messageTimer);
        el.globalMessage.textContent = text;
        el.globalMessage.className = `global-message visible ${type}`;
        state.messageTimer = setTimeout(() => {
            el.globalMessage.className = "global-message";
            el.globalMessage.textContent = "";
        }, 6000);
    }

    function setConnection(online, text) {
        el.connectionStatus.textContent = text;
        el.connectionStatus.className = `connection-pill ${online ? "online" : "offline"}`;
    }

    async function rpc(name, params = {}) {
        const { data, error } = await supabase.rpc(name, params);
        if (error) throw new Error(error.message || `Falha ao executar ${name}.`);
        return data;
    }

    function showAuth(message = "", type = "") {
        el.appLoading.hidden = true;
        el.adminApp.hidden = true;
        el.authView.hidden = false;
        el.authMessage.textContent = message;
        el.authMessage.className = `form-message ${type}`;
    }

    function showAdmin() {
        el.appLoading.hidden = true;
        el.authView.hidden = true;
        el.adminApp.hidden = false;
    }

    async function validateAdminSession() {
        const admin = await rpc("obter_sessao_admin");
        state.admin = admin;
        el.sidebarAdminName.textContent = admin.nome || admin.email || "Administrador";
        el.sidebarAdminLevel.textContent = admin.nivel_acesso || "administrador";
        return admin;
    }

    async function bootstrap() {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            state.session = data.session;

            if (!state.session) {
                showAuth();
                return;
            }

            await validateAdminSession();
            showAdmin();
            setConnection(true, "Conectado ao Supabase");
            await loadOverview();
            startAutoRefresh();
        } catch (error) {
            console.error(error);
            await supabase.auth.signOut().catch(() => { });
            showAuth("Esta conta não possui acesso ao painel ou a sessão expirou.", "error");
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        const email = el.email.value.trim().toLowerCase();
        const password = el.password.value;

        el.loginButton.disabled = true;
        el.loginButton.textContent = "Entrando...";
        el.authMessage.textContent = "";

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            state.session = data.session;
            await validateAdminSession();
            showAdmin();
            setConnection(true, "Conectado ao Supabase");
            el.password.value = "";
            await loadOverview();
            startAutoRefresh();
        } catch (error) {
            console.error(error);
            await supabase.auth.signOut().catch(() => { });
            el.authMessage.textContent = error.message || "Não foi possível entrar.";
            el.authMessage.className = "form-message error";
        } finally {
            el.loginButton.disabled = false;
            el.loginButton.textContent = "Entrar";
        }
    }

    async function handleLogout() {
        stopAutoRefresh();
        await supabase.auth.signOut();
        state.session = null;
        state.admin = null;
        showAuth("Sessão encerrada.", "success");
    }

    function metricCard(icon, value, label) {
        return `<article class="metric-card"><span class="metric-icon">${icon}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`;
    }

    function renderOverview() {
        const r = state.resumoPedidos || {};
        const op = state.operacao?.resumo || {};
        el.overviewCards.innerHTML = [
            metricCard("📦", r.total ?? 0, "Total de pedidos"),
            metricCard("🟡", r.recebidos ?? 0, "Aguardando aceite"),
            metricCard("👨‍🍳", (r.aceitos ?? 0) + (r.em_preparo ?? 0) + (r.prontos ?? 0), "Em andamento"),
            metricCard("💰", formatMoney(r.faturamento_entregue ?? 0), "Faturamento entregue")
        ].join("");

        const config = state.operacao?.configuracao_loja || {};
        const active = config.pedidos_ativos === true;
        el.storeStatusPanel.innerHTML = `
            <div class="store-status-row"><span>Pedidos</span><strong class="status-dot ${active ? "open" : ""}">${active ? "Liberados" : "Pausados"}</strong></div>
            <div class="store-status-row"><span>Tamanhos disponíveis</span><strong>${escapeHtml(op.tamanhos_disponiveis ?? 0)} de ${escapeHtml(op.tamanhos_total ?? 0)}</strong></div>
            <div class="store-status-row"><span>Complementos disponíveis</span><strong>${escapeHtml(op.complementos_disponiveis ?? 0)} de ${escapeHtml(op.complementos_total ?? 0)}</strong></div>
            <div class="store-status-row"><span>Bairros ativos</span><strong>${escapeHtml(op.bairros_ativos ?? 0)} de ${escapeHtml(op.bairros_total ?? 0)}</strong></div>
            ${!active && config.mensagem_pausa ? `<div class="store-status-row"><span>Mensagem</span><strong>${escapeHtml(config.mensagem_pausa)}</strong></div>` : ""}
        `;

        const recent = state.pedidos.slice(0, 5);
        if (!recent.length) {
            setEmpty(el.recentOrders, "Nenhum pedido cadastrado no Supabase.");
            return;
        }
        el.recentOrders.innerHTML = recent.map(order => `
            <div class="compact-item">
                <div><strong>${escapeHtml(order.codigo || order.id)}</strong><br><small>${escapeHtml(firstDefined(order, ["nome_do_cliente", "nome_cliente"], "Cliente"))} • ${escapeHtml(formatDate(order.criado_em))}</small></div>
                <span class="status-badge status-${escapeHtml(order.status)}">${escapeHtml(statusLabel(order.status))}</span>
            </div>
        `).join("");
    }

    async function loadOverview() {
        setConnection(true, "Atualizando...");
        try {
            const [ordersData, operationData] = await Promise.all([
                rpc("listar_pedidos_admin", { p_status: null, p_limite: 100 }),
                rpc("listar_operacao_admin")
            ]);
            state.pedidos = ordersData.pedidos || [];
            state.resumoPedidos = ordersData.resumo || {};
            state.operacao = operationData;
            renderOverview();
            renderOrders();
            renderOperationSections();
            setConnection(true, "Conectado ao Supabase");
        } catch (error) {
            console.error(error);
            setConnection(false, "Falha de conexão");
            showMessage(error.message, "error");
        }
    }

    function orderItemsHtml(order) {
        const items = Array.isArray(order.itens) ? order.itens : [];
        if (!items.length) return "<p>Itens não informados.</p>";
        return `<div class="order-items">${items.map((item, index) => {
            const name = firstDefined(item, ["nome", "produto", "nome_produto"], `Item ${index + 1}`);
            const size = firstDefined(item, ["tamanho_ml", "tamanho"], "");
            const qty = firstDefined(item, ["quantidade"], 1);
            const complements = Array.isArray(item.complementos) ? item.complementos : [];
            const complementText = complements.map(c => firstDefined(c, ["nome", "complemento_nome"], "Complemento")).join(", ");
            return `<div class="order-item"><strong>${escapeHtml(name)}${size ? ` • ${escapeHtml(size)} ml` : ""}</strong><p>Quantidade: ${escapeHtml(qty)}</p>${complementText ? `<p>Complementos: ${escapeHtml(complementText)}</p>` : ""}</div>`;
        }).join("")}</div>`;
    }

    function addressHtml(order) {
        const street = firstDefined(order, ["rua", "logradouro", "endereco_rua"], "");
        const number = firstDefined(order, ["numero", "endereco_numero"], "");
        const district = firstDefined(order, ["bairro", "bairro_nome", "nome_bairro", "bairro_entrega_nome"], "");
        const zip = firstDefined(order, ["cep"], "");
        const complement = firstDefined(order, ["complemento", "endereco_complemento"], "");
        const parts = [street, number ? `nº ${number}` : "", district, zip ? `CEP ${zip}` : ""].filter(Boolean);
        return `${parts.length ? `<p>${escapeHtml(parts.join(" • "))}</p>` : "<p>Endereço não informado.</p>"}${complement ? `<p>Complemento: ${escapeHtml(complement)}</p>` : ""}`;
    }

    function normalizeKey(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function parseMoneyInput(value) {
        const normalized = String(value ?? "")
            .trim()
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", ".");

        const number = Number(normalized);
        return Number.isFinite(number) ? number : 0;
    }

    function splitManualComplements(value, layer) {
        return String(value || "")
            .split(/[\n,;]+/)
            .map(name => name.trim())
            .filter(Boolean)
            .map(name => ({
                nome: name,
                camada: layer,
                preco_unitario: 0
            }));
    }

    function manualSizeOptions(selectedSize = "") {
        const sizes = state.operacao?.tamanhos || [];

        return sizes
            .filter(item => item.visivel !== false)
            .map(item => `
                <option
                    value="${escapeHtml(item.tamanho_ml)}"
                    data-price="${escapeHtml(item.preco_base)}"
                    ${String(item.tamanho_ml) === String(selectedSize) ? "selected" : ""}
                >
                    ${escapeHtml(item.tamanho_ml)} ml — ${formatMoney(item.preco_base)}
                </option>
            `)
            .join("");
    }

    function manualItemRowHtml(index) {
        const sizes = state.operacao?.tamanhos || [];
        const firstSize =
            sizes.find(item =>
                item.disponivel === true &&
                item.visivel !== false
            ) ||
            sizes.find(item =>
                item.visivel !== false
            ) ||
            {};

        const defaultSize =
            firstSize.tamanho_ml || "";

        const defaultPrice =
            firstSize.preco_base ?? "";

        return `
            <article
                data-manual-item-row
                data-manual-item-index="${escapeHtml(index)}"
                style="
                    grid-column: 1 / -1;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    border-radius: 16px;
                    padding: 16px;
                    background: rgba(15, 23, 42, 0.35);
                "
            >
                <div
                    style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 14px;
                    "
                >
                    <strong>
                        Item do pedido
                    </strong>

                    <button
                        type="button"
                        class="btn btn-danger btn-small"
                        data-manual-remove-item
                    >
                        Remover
                    </button>
                </div>

                <div
                    style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 12px;
                    "
                >
                    <label class="modal-field">
                        <span>Tamanho</span>

                        <select
                            data-manual-size
                            required
                        >
                            ${manualSizeOptions(defaultSize)}
                        </select>
                    </label>

                    <label class="modal-field">
                        <span>Quantidade</span>

                        <input
                            data-manual-quantity
                            type="number"
                            min="1"
                            max="10"
                            value="1"
                            required
                        >
                    </label>

                    <label class="modal-field">
                        <span>Valor unitário final</span>

                        <input
                            data-manual-price
                            type="text"
                            inputmode="decimal"
                            value="${escapeHtml(defaultPrice)}"
                            placeholder="Ex.: 10,00"
                            required
                        >
                    </label>

                    <label
                        class="modal-field"
                        style="grid-column: 1 / -1;"
                    >
                        <span>
                            Complementos no meio
                        </span>

                        <textarea
                            data-manual-middle
                            placeholder="Ex.: Granola, leite condensado"
                        ></textarea>
                    </label>

                    <label
                        class="modal-field"
                        style="grid-column: 1 / -1;"
                    >
                        <span>
                            Complementos na cobertura
                        </span>

                        <textarea
                            data-manual-top
                            placeholder="Ex.: Paçoca, leite em pó"
                        ></textarea>
                    </label>
                </div>
            </article>
        `;
    }

    function addManualItemRow() {
        const container =
            el.dynamicModalForm.querySelector(
                "[data-manual-items]"
            );

        if (!container) {
            return;
        }

        state.manualItemCounter += 1;

        container.insertAdjacentHTML(
            "beforeend",
            manualItemRowHtml(
                state.manualItemCounter
            )
        );
    }

    async function submitManualOrder(formNode) {
        const rows = Array.from(
            formNode.querySelectorAll(
                "[data-manual-item-row]"
            )
        );

        if (!rows.length) {
            throw new Error(
                "Adicione pelo menos um item ao pedido."
            );
        }

        const items = rows.map(row => {
            const size =
                Number(
                    row.querySelector(
                        "[data-manual-size]"
                    )?.value
                );

            const quantity =
                Number(
                    row.querySelector(
                        "[data-manual-quantity]"
                    )?.value
                );

            const unitPrice =
                parseMoneyInput(
                    row.querySelector(
                        "[data-manual-price]"
                    )?.value
                );

            if (!Number.isFinite(size) || size <= 0) {
                throw new Error(
                    "Escolha o tamanho de todos os itens."
                );
            }

            if (
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > 10
            ) {
                throw new Error(
                    "A quantidade de um item é inválida."
                );
            }

            if (unitPrice < 0) {
                throw new Error(
                    "O valor de um item não pode ser negativo."
                );
            }

            const middle =
                splitManualComplements(
                    row.querySelector(
                        "[data-manual-middle]"
                    )?.value,
                    "meio"
                );

            const top =
                splitManualComplements(
                    row.querySelector(
                        "[data-manual-top]"
                    )?.value,
                    "cobertura"
                );

            return {
                produto_nome:
                    `Monte o Seu • ${size}ml`,

                tamanho_ml:
                    size,

                quantidade:
                    quantity,

                preco_unitario:
                    unitPrice,

                complementos: [
                    ...middle,
                    ...top
                ]
            };
        });

        const form =
            new FormData(formNode);

        const districtName =
            String(
                form.get("bairro") || ""
            ).trim();

        const districtKey =
            normalizeKey(districtName);

        const district =
            (state.operacao?.bairros || [])
                .find(item => {
                    const itemKey =
                        normalizeKey(item.nome);

                    const aliases =
                        Array.isArray(item.aliases)
                            ? item.aliases
                            : [];

                    return (
                        itemKey === districtKey ||
                        aliases.some(alias =>
                            normalizeKey(alias) ===
                            districtKey
                        )
                    );
                });

        const payment =
            String(
                form.get("forma_pagamento") ||
                ""
            );

        const payload = {
            cliente_nome:
                String(
                    form.get("cliente_nome") ||
                    ""
                ).trim(),

            cliente_email:
                String(
                    form.get("cliente_email") ||
                    ""
                ).trim() ||
                null,

            cliente_telefone:
                String(
                    form.get("cliente_telefone") ||
                    ""
                ).trim() ||
                null,

            forma_pagamento:
                payment,

            status_pagamento:
                String(
                    form.get("status_pagamento") ||
                    "pendente"
                ),

            status:
                "recebido",

            troco_para:
                payment === "dinheiro"
                    ? (
                        String(
                            form.get("troco_para") ||
                            ""
                        ).trim()
                            ? parseMoneyInput(
                                form.get("troco_para")
                            )
                            : null
                    )
                    : null,

            bairro_entrega_id:
                district?.id || null,

            cep:
                String(
                    form.get("cep") ||
                    ""
                ).trim(),

            rua:
                String(
                    form.get("rua") ||
                    ""
                ).trim(),

            numero:
                String(
                    form.get("numero") ||
                    ""
                ).trim(),

            bairro:
                districtName,

            complemento_endereco:
                String(
                    form.get(
                        "complemento_endereco"
                    ) ||
                    ""
                ).trim() ||
                null,

            taxa_entrega:
                parseMoneyInput(
                    form.get("taxa_entrega")
                ),

            desconto:
                parseMoneyInput(
                    form.get("desconto")
                ),

            observacoes:
                String(
                    form.get("observacoes") ||
                    ""
                ).trim() ||
                null,

            itens: items
        };

        const data = await rpc(
            "criar_pedido_manual_admin",
            {
                p_dados: payload
            }
        );

        await refreshOrders();

        showMessage(
            `Pedido ${data.codigo || ""} registrado com sucesso pelo WhatsApp.`
        );
    }

    async function openManualOrderModal() {
        if (!state.operacao) {
            state.operacao =
                await rpc(
                    "listar_operacao_admin"
                );
        }

        state.manualItemCounter = 1;

        state.modalSubmit = {
            title:
                "Registrar pedido do WhatsApp",

            submitText:
                "Registrar pedido",

            customSubmit:
                submitManualOrder
        };

        el.modalTitle.textContent =
            "Registrar pedido do WhatsApp";

        el.dynamicModalForm.innerHTML = `
            <div
                style="
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
                    gap: 14px;
                "
            >
                <label class="modal-field">
                    <span>Nome do cliente</span>

                    <input
                        name="cliente_nome"
                        required
                        placeholder="Nome completo"
                    >
                </label>

                <label class="modal-field">
                    <span>Telefone / WhatsApp</span>

                    <input
                        name="cliente_telefone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                    >
                </label>

                <label class="modal-field">
                    <span>E-mail</span>

                    <input
                        name="cliente_email"
                        type="email"
                        placeholder="Opcional"
                    >
                </label>

                <label class="modal-field">
                    <span>Forma de pagamento</span>

                    <select
                        name="forma_pagamento"
                        required
                    >
                        <option value="pix">Pix</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao_debito">Cartão de débito</option>
                        <option value="cartao_credito">Cartão de crédito</option>
                    </select>
                </label>

                <label class="modal-field">
                    <span>Status do pagamento</span>

                    <select
                        name="status_pagamento"
                        required
                    >
                        <option value="pendente">
                            Pendente
                        </option>

                        <option value="pago">
                            Pago
                        </option>
                    </select>
                </label>

                <label class="modal-field">
                    <span>Troco para</span>

                    <input
                        name="troco_para"
                        type="text"
                        inputmode="decimal"
                        placeholder="Somente dinheiro"
                    >
                </label>

                <label class="modal-field">
                    <span>CEP</span>

                    <input
                        name="cep"
                        required
                        placeholder="00000-000"
                    >
                </label>

                <label class="modal-field">
                    <span>Rua / Avenida</span>

                    <input
                        name="rua"
                        required
                    >
                </label>

                <label class="modal-field">
                    <span>Número</span>

                    <input
                        name="numero"
                        required
                    >
                </label>

                <label class="modal-field">
                    <span>Bairro</span>

                    <input
                        name="bairro"
                        list="manualDistrictOptions"
                        required
                    >

                    <datalist id="manualDistrictOptions">
                        ${(state.operacao?.bairros || [])
                .map(item => `
                                <option value="${escapeHtml(item.nome)}">
                            `)
                .join("")}
                    </datalist>
                </label>

                <label class="modal-field">
                    <span>Complemento do endereço</span>

                    <input
                        name="complemento_endereco"
                        placeholder="Casa, bloco, referência..."
                    >
                </label>

                <label class="modal-field">
                    <span>Taxa de entrega</span>

                    <input
                        name="taxa_entrega"
                        type="text"
                        inputmode="decimal"
                        value="0,00"
                        required
                    >
                </label>

                <label class="modal-field">
                    <span>Desconto</span>

                    <input
                        name="desconto"
                        type="text"
                        inputmode="decimal"
                        value="0,00"
                    >
                </label>
            </div>

            <div
                style="
                    grid-column: 1 / -1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-top: 6px;
                "
            >
                <div>
                    <strong>Itens do pedido</strong>

                    <p style="margin: 4px 0 0; opacity: 0.75;">
                        Informe o valor final unitário de cada copo.
                    </p>
                </div>

                <button
                    type="button"
                    class="btn btn-secondary"
                    data-manual-add-item
                >
                    + Adicionar item
                </button>
            </div>

            <div
                data-manual-items
                style="
                    grid-column: 1 / -1;
                    display: grid;
                    gap: 14px;
                "
            >
                ${manualItemRowHtml(1)}
            </div>

            <label
                class="modal-field full"
                style="grid-column: 1 / -1;"
            >
                <span>Observações</span>

                <textarea
                    name="observacoes"
                    placeholder="Detalhes do pedido recebido pelo WhatsApp"
                ></textarea>
            </label>

            <div
                class="modal-actions"
                style="grid-column: 1 / -1;"
            >
                <button
                    class="btn btn-secondary"
                    data-modal-cancel
                    type="button"
                >
                    Cancelar
                </button>

                <button
                    class="btn btn-primary"
                    type="submit"
                >
                    Registrar pedido
                </button>
            </div>
        `;

        el.modalBackdrop.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function ensureManualOrderButton() {
        if (
            document.getElementById(
                "newManualOrderButton"
            )
        ) {
            return;
        }

        const refreshButton =
            el.refreshOrdersButton;

        if (!refreshButton?.parentElement) {
            return;
        }

        const button =
            document.createElement("button");

        button.id =
            "newManualOrderButton";

        button.className =
            "btn btn-primary";

        button.type =
            "button";

        button.dataset.newManualOrder =
            "true";

        button.textContent =
            "+ Registrar pedido do WhatsApp";

        refreshButton.parentElement.insertBefore(
            button,
            refreshButton
        );
    }


    function renderOrders() {
        const r = state.resumoPedidos || {};
        el.ordersSummary.innerHTML = [
            metricCard("📦", r.total ?? 0, "Total"),
            metricCard("🟡", r.recebidos ?? 0, "Recebidos"),
            metricCard("✅", r.aceitos ?? 0, "Aceitos"),
            metricCard("👨‍🍳", r.em_preparo ?? 0, "Em preparo"),
            metricCard("🛵", r.sairam_para_entrega ?? 0, "Em entrega"),
            metricCard("🏁", r.entregues ?? 0, "Entregues")
        ].join("");

        const filter = el.ordersStatusFilter.value;
        const orders = filter ? state.pedidos.filter(order => order.status === filter) : state.pedidos;
        if (!orders.length) {
            setEmpty(el.ordersList, "Nenhum pedido encontrado.");
            return;
        }

        el.ordersList.innerHTML = orders.map(order => {
            const next = NEXT_STATUS[order.status];
            const code = order.codigo || order.id;
            const customerName = firstDefined(order, ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"], "Cliente não informado");
            const phone = firstDefined(order, ["telefone_do_cliente", "cliente_telefone", "telefone"], "Não informado");
            const email = firstDefined(order, ["cliente_email", "email_cliente"], "Não informado");
            const subtotal = firstDefined(order, ["subtotal", "valor_produtos"], 0);
            const fee = firstDefined(order, ["taxa_entrega", "taxa"], 0);
            const total = firstDefined(order, ["valor_total", "total"], 0);
            const payment = firstDefined(order, ["forma_pagamento"], "Não informada");
            const paymentStatus = firstDefined(order, ["status_pagamento"], "pendente");
            const note = firstDefined(order, ["observacoes", "observacao"], "");

            return `<article class="order-card" data-order-id="${escapeHtml(order.id)}">
                <header class="order-head">
                    <div><h3>Pedido ${escapeHtml(code)}</h3><p>${escapeHtml(formatDate(order.criado_em))}</p></div>
                    <span class="status-badge status-${escapeHtml(order.status)}">${escapeHtml(statusLabel(order.status))}</span>
                </header>
                <div class="order-metrics">
                    <div class="order-metric"><span>Cliente</span><strong>${escapeHtml(customerName)}</strong></div>
                    <div class="order-metric"><span>Produtos</span><strong>${formatMoney(subtotal)}</strong></div>
                    <div class="order-metric"><span>Entrega</span><strong>${formatMoney(fee)}</strong></div>
                    <div class="order-metric"><span>Total</span><strong>${formatMoney(total)}</strong></div>
                    <div class="order-metric"><span>Pagamento</span><strong>${escapeHtml(payment)} • ${escapeHtml(paymentStatus)}</strong></div>
                </div>
                <div class="order-body">
                    <div class="order-block"><h4>Cliente e entrega</h4><p><strong>Telefone:</strong> ${escapeHtml(phone)}</p><p><strong>E-mail:</strong> ${escapeHtml(email)}</p>${addressHtml(order)}${note ? `<p><strong>Observação:</strong> ${escapeHtml(note)}</p>` : ""}</div>
                    <div class="order-block"><h4>Itens do pedido</h4>${orderItemsHtml(order)}</div>
                </div>
                <footer class="order-actions">
                    ${next ? `<button class="btn ${next.className}" data-order-action="next" data-next-status="${next.status}" type="button">${escapeHtml(next.label)}</button>` : ""}
                    ${!["entregue", "cancelado"].includes(order.status) ? `<button class="btn btn-danger" data-order-action="cancel" type="button">Cancelar</button>` : ""}
                    <div class="payment-control"><select data-payment-select><option value="pendente" ${paymentStatus === "pendente" ? "selected" : ""}>Pagamento pendente</option><option value="pago" ${paymentStatus === "pago" ? "selected" : ""}>Pago</option><option value="cancelado" ${paymentStatus === "cancelado" ? "selected" : ""}>Cancelado</option><option value="estornado" ${paymentStatus === "estornado" ? "selected" : ""}>Estornado</option></select><button class="btn btn-secondary" data-order-action="payment" type="button">Salvar pagamento</button></div>
                </footer>
            </article>`;
        }).join("");
    }

    async function refreshOrders() {
        setLoading(el.ordersList, "Atualizando pedidos...");
        try {
            const data = await rpc("listar_pedidos_admin", { p_status: null, p_limite: 100 });
            state.pedidos = data.pedidos || [];
            state.resumoPedidos = data.resumo || {};
            renderOrders();
            renderOverview();
        } catch (error) {
            setEmpty(el.ordersList, error.message);
            throw error;
        }
    }

    async function updateOrder(orderId, status, paymentStatus, observation) {
        await rpc("atualizar_pedido_admin", {
            p_pedido_id: orderId,
            p_novo_status: status || null,
            p_novo_status_pagamento: paymentStatus || null,
            p_observacao: observation || null
        });
        await refreshOrders();
    }

    async function handleOrderAction(button) {
        const card = button.closest("[data-order-id]");
        const orderId = card?.dataset.orderId;
        if (!orderId) return;

        const action = button.dataset.orderAction;
        button.disabled = true;

        try {
            if (action === "next") {
                const status = button.dataset.nextStatus;
                const transition = NEXT_STATUS[card.querySelector("[data-order-action='next']")
                    ? state.pedidos.find(order => String(order.id) === String(orderId))?.status
                    : ""];

                const applyStatus = async () => {
                    await updateOrder(orderId, status, null, null);
                    showMessage(`Pedido atualizado para “${statusLabel(status)}”.`);
                };

                if (transition?.confirmMessage) {
                    openModal({
                        title: transition.confirmTitle || "Confirmar alteração",
                        message: transition.confirmMessage,
                        messageType: status === "entregue" ? "success" : "warning",
                        fields: [],
                        submitText: transition.confirmText || "Confirmar",
                        submitClass: status === "entregue" ? "btn-success" : "btn-primary",
                        onSubmit: applyStatus
                    });
                } else {
                    await applyStatus();
                }
            }

            if (action === "cancel") {
                openModal({
                    title: "Cancelar pedido",
                    fields: [{ name: "motivo", label: "Motivo do cancelamento", type: "textarea", required: true, full: true, minLength: 5 }],
                    submitText: "Cancelar pedido",
                    submitClass: "btn-danger",
                    onSubmit: async values => {
                        await updateOrder(orderId, "cancelado", null, values.motivo);
                        showMessage("Pedido cancelado.", "warning");
                    }
                });
            }

            if (action === "payment") {
                const select = card.querySelector("[data-payment-select]");
                await updateOrder(orderId, null, select.value, "Pagamento atualizado pelo painel");
                showMessage("Status do pagamento atualizado.");
            }
        } catch (error) {
            console.error(error);
            showMessage(error.message, "error");
        } finally {
            button.disabled = false;
        }
    }

    async function loadClients() {
        setLoading(el.clientsList, "Carregando clientes...");
        const activeValue = el.clientsActiveFilter.value;
        const data = await rpc("listar_clientes_admin", {
            p_busca: el.clientsSearch.value.trim() || null,
            p_ativo: activeValue === "" ? null : activeValue === "true",
            p_limite: 100,
            p_offset: 0
        });
        state.clientes = data.clientes || [];
        state.resumoClientes = data.resumo || {};
        renderClients();
    }

    function renderClients() {
        const r = state.resumoClientes;
        el.clientsSummary.innerHTML = [
            metricCard("👥", r.total ?? 0, "Contas"),
            metricCard("✅", r.ativos ?? 0, "Ativas"),
            metricCard("⛔", r.inativos ?? 0, "Inativas"),
            metricCard("🛡️", r.administradores ?? 0, "Administradores")
        ].join("");

        if (!state.clientes.length) {
            setEmpty(el.clientsList, "Nenhum cliente encontrado.");
            return;
        }

        el.clientsList.innerHTML = state.clientes.map(client => {
            const name = firstDefined(client, ["nome"], "Cliente");
            const email = firstDefined(client, ["email_auth", "email"], "Não informado");
            const active = client.ativo === true;
            return `<article class="data-card" data-client-id="${escapeHtml(client.id)}">
                <div class="data-card-head"><div><h3>${escapeHtml(name)}</h3><p class="card-email">${escapeHtml(email)}</p></div><span class="small-badge ${active ? "active" : "inactive"}">${active ? "Ativo" : "Inativo"}</span></div>
                <div class="data-pairs">
                    <div class="data-pair"><span>Telefone</span><strong>${escapeHtml(client.telefone || "Não informado")}</strong></div>
                    <div class="data-pair"><span>Pedidos</span><strong>${escapeHtml(client.quantidade_pedidos ?? 0)}</strong></div>
                    <div class="data-pair"><span>Total entregue</span><strong>${formatMoney(client.valor_total_entregue ?? 0)}</strong></div>
                    <div class="data-pair"><span>Último login</span><strong>${escapeHtml(formatDate(client.ultimo_login_em))}</strong></div>
                </div>
                <div class="data-card-actions">${client.e_administrador ? `<span class="small-badge active">Conta administrativa</span>` : `<button class="btn ${active ? "btn-danger" : "btn-success"}" data-client-toggle="${active ? "false" : "true"}" type="button">${active ? "Desativar conta" : "Ativar conta"}</button>`}</div>
            </article>`;
        }).join("");
    }

    async function toggleClient(button) {
        const card = button.closest("[data-client-id]");
        const clientId = card?.dataset.clientId;
        const targetActive = button.dataset.clientToggle === "true";
        let observation = null;
        if (!targetActive) {
            observation = window.prompt("Informe o motivo da desativação:");
            if (!observation) return;
        }
        button.disabled = true;
        try {
            await rpc("alterar_status_cliente_admin", { p_cliente_id: clientId, p_ativo: targetActive, p_observacao: observation });
            await loadClients();
            showMessage(targetActive ? "Conta ativada." : "Conta desativada.");
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            button.disabled = false;
        }
    }

    function renderOperationSections() {
        if (!state.operacao) return;
        renderSizes();
        renderComplements();
        renderNeighborhoods();
        renderStoreConfig();
        renderSchedules();
        renderRewards();
    }

    function renderSizes() {
        const sizes = state.operacao?.tamanhos || [];
        el.sizesList.innerHTML = sizes.map(item => `<article class="data-card"><div class="data-card-head"><div><h3>${escapeHtml(item.nome)}</h3><p>${escapeHtml(item.tamanho_ml)} ml</p></div><span class="small-badge ${item.disponivel && item.visivel ? "active" : "inactive"}">${item.disponivel && item.visivel ? "Disponível" : "Indisponível"}</span></div><div class="data-pairs"><div class="data-pair"><span>Preço</span><strong>${formatMoney(item.preco_base)}</strong></div><div class="data-pair"><span>Badge</span><strong>${escapeHtml(item.badge || "—")}</strong></div><div class="data-pair"><span>Ordem</span><strong>${escapeHtml(item.ordem)}</strong></div></div><div class="data-card-actions"><button class="btn btn-secondary" data-edit-size="${item.id}" type="button">Editar</button></div></article>`).join("");
    }

    function renderComplements() {
        const items = state.operacao?.complementos || [];
        if (!items.length) return setEmpty(el.complementsList, "Nenhum complemento cadastrado.");
        el.complementsList.innerHTML = items.map(item => `<article class="data-card"><div class="data-card-head"><div><h3>${escapeHtml(item.nome)}</h3><p>${formatMoney(item.preco)}</p></div><span class="small-badge ${item.disponivel && item.visivel ? "active" : "inactive"}">${item.disponivel && item.visivel ? "Disponível" : "Indisponível"}</span></div><div class="data-pairs"><div class="data-pair"><span>Disponível</span><strong>${booleanText(item.disponivel)}</strong></div><div class="data-pair"><span>Visível</span><strong>${booleanText(item.visivel)}</strong></div><div class="data-pair"><span>Ordem</span><strong>${escapeHtml(item.ordem)}</strong></div></div><div class="data-card-actions"><button class="btn btn-secondary" data-edit-complement="${item.id}" type="button">Editar</button></div></article>`).join("");
    }

    function renderNeighborhoods() {
        const items = state.operacao?.bairros || [];
        if (!items.length) return setEmpty(el.neighborhoodsList, "Nenhum bairro cadastrado.");
        el.neighborhoodsList.innerHTML = items.map(item => `<article class="data-card"><div class="data-card-head"><div><h3>${escapeHtml(item.nome)}</h3><p>${formatMoney(item.taxa)}</p></div><span class="small-badge ${item.ativo ? "active" : "inactive"}">${item.ativo ? "Ativo" : "Inativo"}</span></div><div class="data-pairs"><div class="data-pair"><span>Aliases</span><strong>${escapeHtml((item.aliases || []).join(", ") || "—")}</strong></div><div class="data-pair"><span>Ordem</span><strong>${escapeHtml(item.ordem)}</strong></div></div><div class="data-card-actions"><button class="btn btn-secondary" data-edit-neighborhood="${item.id}" type="button">Editar</button></div></article>`).join("");
    }

    function renderStoreConfig() {
        const config = state.operacao?.configuracao_loja || {};
        el.storeConfigForm.innerHTML = `
            <label><span>Nome da loja</span><input name="nome_loja" value="${escapeHtml(config.nome_loja || "Azury")}" required></label>
            <label><span>WhatsApp</span><input name="whatsapp" value="${escapeHtml(config.whatsapp || "")}" required></label>
            <label><span>Fuso horário</span><input name="fuso_horario" value="${escapeHtml(config.fuso_horario || "America/Sao_Paulo")}" required></label>
            <label class="switch-field"><input name="pedidos_ativos" type="checkbox" ${config.pedidos_ativos ? "checked" : ""}><span>Pedidos ativos</span></label>
            <label class="full-field"><span>Mensagem de pausa</span><textarea name="mensagem_pausa" placeholder="Mensagem exibida quando os pedidos estiverem pausados">${escapeHtml(config.mensagem_pausa || "")}</textarea></label>
            <div class="form-actions"><button class="btn btn-primary" type="submit">Salvar configuração</button></div>
        `;
    }

    function renderSchedules() {
        const schedules = state.operacao?.horarios || [];
        el.schedulesList.innerHTML = schedules.map(item => `<div class="schedule-row" data-day="${item.dia_semana}"><strong>${escapeHtml(item.nome_dia)}</strong><input data-open type="time" value="${escapeHtml(formatTime(item.abre_as))}" ${item.ativo ? "" : "disabled"}><input data-close type="time" value="${escapeHtml(formatTime(item.fecha_as))}" ${item.ativo ? "" : "disabled"}><label class="switch-field"><input data-active type="checkbox" ${item.ativo ? "checked" : ""}><span>Ativo</span></label><button class="btn btn-secondary" data-save-schedule type="button">Salvar</button></div>`).join("");
    }

    function renderRewards() {
        const items = state.operacao?.recompensas || [];
        if (!items.length) return setEmpty(el.rewardsList, "Nenhuma recompensa cadastrada.");
        el.rewardsList.innerHTML = items.map(item => `<article class="data-card"><div class="data-card-head"><div><h3>${escapeHtml(item.titulo)}</h3><p>${escapeHtml(item.descricao)}</p></div><span class="small-badge ${item.ativo ? "active" : "inactive"}">${item.ativo ? "Ativa" : "Inativa"}</span></div><div class="data-pairs"><div class="data-pair"><span>Tipo</span><strong>${escapeHtml(item.tipo)}</strong></div><div class="data-pair"><span>Pontos</span><strong>${escapeHtml(item.pontos_necessarios)}</strong></div><div class="data-pair"><span>Benefício</span><strong>${item.tipo === "cupom" ? `${escapeHtml(item.percentual_desconto)}%` : `${escapeHtml(item.quantidade_copos)} copo(s) de ${escapeHtml(item.tamanho_ml)} ml`}</strong></div></div><div class="data-card-actions"><button class="btn btn-secondary" data-edit-reward="${item.id}" type="button">Editar</button></div></article>`).join("");
    }

    async function reloadOperation(message) {
        state.operacao = await rpc("listar_operacao_admin");
        renderOperationSections();
        renderOverview();
        if (message) showMessage(message);
    }

    function commonBooleanFields(item) {
        return [
            { name: "disponivel", label: "Disponível", type: "checkbox", value: item.disponivel },
            { name: "visivel", label: "Visível", type: "checkbox", value: item.visivel }
        ];
    }

    function openSizeModal(item) {
        openModal({
            title: `Editar ${item.tamanho_ml} ml`, fields: [
                { name: "nome", label: "Nome", value: item.nome, required: true },
                { name: "descricao", label: "Descrição", type: "textarea", value: item.descricao, required: true, full: true },
                { name: "preco_base", label: "Preço base", type: "number", step: "0.01", value: item.preco_base, required: true },
                { name: "badge", label: "Badge", value: item.badge || "" },
                ...commonBooleanFields(item),
                { name: "ordem", label: "Ordem", type: "number", value: item.ordem, required: true }
            ], onSubmit: async values => { await rpc("atualizar_tamanho_admin", { p_dados: { id: item.id, ...values } }); await reloadOperation("Tamanho atualizado."); }
        });
    }

    function openComplementModal(item = null) {
        const editing = Boolean(item);
        openModal({
            title: editing ? `Editar ${item.nome}` : "Novo complemento", fields: [
                { name: "nome", label: "Nome", value: item?.nome || "", required: true },
                { name: "preco", label: "Preço", type: "number", step: "0.01", value: item?.preco ?? "", required: true },
                { name: "disponivel", label: "Disponível", type: "checkbox", value: item?.disponivel ?? true },
                { name: "visivel", label: "Visível", type: "checkbox", value: item?.visivel ?? true },
                { name: "ordem", label: "Ordem", type: "number", value: item?.ordem ?? 0, required: true }
            ], onSubmit: async values => { await rpc(editing ? "atualizar_complemento_admin" : "criar_complemento_admin", { p_dados: editing ? { id: item.id, ...values } : values }); await reloadOperation(editing ? "Complemento atualizado." : "Complemento criado."); }
        });
    }

    function openNeighborhoodModal(item = null) {
        const editing = Boolean(item);
        openModal({
            title: editing ? `Editar ${item.nome}` : "Novo bairro", fields: [
                { name: "nome", label: "Nome", value: item?.nome || "", required: true },
                { name: "taxa", label: "Taxa de entrega", type: "number", step: "0.01", value: item?.taxa ?? "", required: true },
                { name: "aliases", label: "Aliases separados por vírgula", value: (item?.aliases || []).join(", "), full: true },
                { name: "ativo", label: "Ativo", type: "checkbox", value: item?.ativo ?? true },
                { name: "ordem", label: "Ordem", type: "number", value: item?.ordem ?? 0, required: true }
            ], transform: values => ({ ...values, aliases: String(values.aliases || "").split(",").map(v => v.trim()).filter(Boolean) }), onSubmit: async values => { await rpc(editing ? "atualizar_bairro_admin" : "criar_bairro_admin", { p_dados: editing ? { id: item.id, ...values } : values }); await reloadOperation(editing ? "Bairro atualizado." : "Bairro criado."); }
        });
    }

    function rewardFields(item = null) {
        return [
            { name: "slug", label: "Slug", value: item?.slug || "", required: true },
            { name: "tipo", label: "Tipo", type: "select", value: item?.tipo || "acai", options: [{ value: "acai", label: "Açaí" }, { value: "cupom", label: "Cupom" }] },
            { name: "titulo", label: "Título", value: item?.titulo || "", required: true },
            { name: "descricao", label: "Descrição", type: "textarea", value: item?.descricao || "", required: true, full: true },
            { name: "pontos_necessarios", label: "Pontos necessários", type: "number", value: item?.pontos_necessarios ?? "", required: true },
            { name: "tamanho_ml", label: "Tamanho em ml (açaí)", type: "number", value: item?.tamanho_ml ?? "" },
            { name: "limite_complementos", label: "Limite de complementos", type: "number", value: item?.limite_complementos ?? "" },
            { name: "quantidade_copos", label: "Quantidade de copos", type: "number", value: item?.quantidade_copos ?? 1 },
            { name: "percentual_desconto", label: "Desconto % (cupom)", type: "number", step: "0.01", value: item?.percentual_desconto ?? "" },
            { name: "limite_mensal", label: "Limite mensal", type: "number", value: item?.limite_mensal ?? "" },
            { name: "ativo", label: "Ativa", type: "checkbox", value: item?.ativo ?? true },
            { name: "ordem", label: "Ordem", type: "number", value: item?.ordem ?? 0 }
        ];
    }

    function openRewardModal(item = null) {
        const editing = Boolean(item);
        openModal({
            title: editing ? `Editar ${item.titulo}` : "Nova recompensa", fields: rewardFields(item), transform: values => {
                ["tamanho_ml", "limite_complementos", "percentual_desconto", "limite_mensal"].forEach(key => { if (values[key] === "") values[key] = null; });
                return values;
            }, onSubmit: async values => { await rpc(editing ? "atualizar_recompensa_admin" : "criar_recompensa_admin", { p_dados: editing ? { id: item.id, ...values } : values }); await reloadOperation(editing ? "Recompensa atualizada." : "Recompensa criada."); }
        });
    }

    async function saveStoreConfig(event) {
        event.preventDefault();
        const form = new FormData(el.storeConfigForm);
        const data = {
            nome_loja: form.get("nome_loja"),
            whatsapp: form.get("whatsapp"),
            fuso_horario: form.get("fuso_horario"),
            pedidos_ativos: form.get("pedidos_ativos") === "on",
            mensagem_pausa: form.get("mensagem_pausa") || null
        };
        try {
            await rpc("atualizar_configuracao_loja_admin", { p_dados: data });
            await reloadOperation("Configuração da loja atualizada.");
        } catch (error) { showMessage(error.message, "error"); }
    }

    async function saveSchedule(button) {
        const row = button.closest("[data-day]");
        const active = row.querySelector("[data-active]").checked;
        const data = { dia_semana: Number(row.dataset.day), ativo: active, abre_as: row.querySelector("[data-open]").value || null, fecha_as: row.querySelector("[data-close]").value || null };
        button.disabled = true;
        try {
            await rpc("atualizar_horario_admin", { p_dados: data });
            await reloadOperation("Horário atualizado.");
        } catch (error) { showMessage(error.message, "error"); }
        finally { button.disabled = false; }
    }

    async function loadTeam() {
        setLoading(el.teamList, "Carregando equipe...");
        const data = await rpc("listar_administradores_admin", { p_busca: null, p_ativo: null, p_limite: 100, p_offset: 0 });
        state.equipe = data.administradores || [];
        state.resumoEquipe = data.resumo || {};
        renderTeam();
    }

    function renderTeam() {
        const r = state.resumoEquipe;
        el.teamSummary.innerHTML = [metricCard("🛡️", r.total ?? 0, "Membros"), metricCard("👑", r.proprietarios ?? 0, "Proprietários"), metricCard("⚙️", r.administradores ?? 0, "Administradores"), metricCard("🎧", r.atendentes ?? 0, "Atendentes")].join("");
        if (!state.equipe.length) return setEmpty(el.teamList, "Nenhum administrador encontrado.");
        el.teamList.innerHTML = state.equipe.map(item => `<article class="data-card"><div class="data-card-head"><div><h3>${escapeHtml(item.nome_exibicao)}</h3><p class="card-email">${escapeHtml(item.email)}</p></div><span class="small-badge ${item.ativo ? "active" : "inactive"}">${item.ativo ? "Ativo" : "Inativo"}</span></div><div class="data-pairs"><div class="data-pair"><span>Nível</span><strong>${escapeHtml(item.nivel_acesso)}</strong></div><div class="data-pair"><span>Último login</span><strong>${escapeHtml(formatDate(item.ultimo_login_em))}</strong></div></div><div class="data-card-actions"><button class="btn btn-secondary" data-edit-team="${item.usuario_id}" type="button">Gerenciar</button></div></article>`).join("");
    }

    function openTeamModal(item = null) {
        const editing = Boolean(item);

        const fields = editing
            ? [
                { name: "email", label: "E-mail da conta", type: "email", value: item.email || "", disabled: true, full: true },
                { name: "nome_exibicao", label: "Nome de exibição", value: item.nome_exibicao || "" },
                { name: "nivel_acesso", label: "Nível", type: "select", value: item.nivel_acesso || "atendente", options: [{ value: "proprietario", label: "Proprietário" }, { value: "administrador", label: "Administrador" }, { value: "atendente", label: "Atendente" }] },
                { name: "ativo", label: "Acesso ativo", type: "checkbox", value: item.ativo ?? true },
                { name: "observacao", label: "Observação / motivo", type: "textarea", full: true }
            ]
            : [
                { name: "email", label: "E-mail da conta cadastrada", type: "email", required: true, full: true },
                { name: "nome_exibicao", label: "Nome de exibição" },
                { name: "nivel_acesso", label: "Nível", type: "select", value: "atendente", options: [{ value: "proprietario", label: "Proprietário" }, { value: "administrador", label: "Administrador" }, { value: "atendente", label: "Atendente" }] },
                { name: "ativo", label: "Acesso ativo", type: "checkbox", value: true },
                { name: "observacao", label: "Observação / motivo", type: "textarea", full: true }
            ];

        openModal({
            title: editing ? `Gerenciar ${item.nome_exibicao}` : "Adicionar à equipe",
            fields,
            onSubmit: async values => {
                if (editing) {
                    await rpc("gerenciar_administrador_admin", {
                        p_usuario_id: item.usuario_id,
                        p_nivel_acesso: values.nivel_acesso,
                        p_ativo: values.ativo,
                        p_nome_exibicao: values.nome_exibicao || null,
                        p_observacao: values.observacao || null
                    });
                } else {
                    await rpc("gerenciar_administrador_por_email_admin", {
                        p_email: String(values.email || "").trim().toLowerCase(),
                        p_nivel_acesso: values.nivel_acesso,
                        p_ativo: values.ativo,
                        p_nome_exibicao: values.nome_exibicao || null,
                        p_observacao: values.observacao || null
                    });
                }

                await loadTeam();
                showMessage(editing ? "Acesso atualizado." : "Membro adicionado.");
            }
        });
    }

    async function loadAudit() {
        setLoading(el.auditList, "Carregando auditoria...");
        const data = await rpc("listar_auditoria_admin", { p_entidade: el.auditEntityFilter.value || null, p_limite: 100, p_offset: 0 });
        state.auditoria = data.registros || [];
        renderAudit();
    }

    function renderAudit() {
        if (!state.auditoria.length) return setEmpty(el.auditList, "Nenhuma ação registrada para este filtro.");
        el.auditList.innerHTML = state.auditoria.map(item => `<article class="timeline-item"><span class="timeline-dot"></span><div><h3>${escapeHtml(item.acao || "Ação administrativa")}</h3><p>${escapeHtml(item.observacao || "Sem observação")}</p><p><strong>${escapeHtml(item.administrador_nome || "Administrador")}</strong> • ${escapeHtml(item.entidade || "")}${item.entidade_id ? ` • ${escapeHtml(item.entidade_id)}` : ""}</p><p>${escapeHtml(formatDate(item.criado_em))}</p></div></article>`).join("");
    }

    function fieldHtml(field) {
        const className = `modal-field${field.full ? " full" : ""}`;
        const disabled = field.disabled ? "disabled" : "";
        const required = field.required ? "required" : "";
        if (field.type === "checkbox") return `<label class="${className} switch-field"><input name="${escapeHtml(field.name)}" type="checkbox" ${field.value ? "checked" : ""} ${disabled}><span>${escapeHtml(field.label)}</span></label>`;
        if (field.type === "textarea") return `<label class="${className}"><span>${escapeHtml(field.label)}</span><textarea name="${escapeHtml(field.name)}" ${required} ${disabled}>${escapeHtml(field.value || "")}</textarea></label>`;
        if (field.type === "select") return `<label class="${className}"><span>${escapeHtml(field.label)}</span><select name="${escapeHtml(field.name)}" ${required} ${disabled}>${(field.options || []).map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(field.value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`;
        return `<label class="${className}"><span>${escapeHtml(field.label)}</span><input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || "text")}" value="${escapeHtml(field.value ?? "")}" ${field.step ? `step="${escapeHtml(field.step)}"` : ""} ${field.minLength ? `minlength="${escapeHtml(field.minLength)}"` : ""} ${required} ${disabled}></label>`;
    }

    function openModal(config) {
        state.modalSubmit = config;
        el.modalTitle.textContent = config.title || "Editar";

        const message = config.message
            ? `<div class="modal-confirmation ${escapeHtml(config.messageType || "info")}" role="note"><span class="modal-confirmation-icon" aria-hidden="true">${config.messageType === "success" ? "✓" : config.messageType === "warning" ? "!" : "i"}</span><p>${escapeHtml(config.message)}</p></div>`
            : "";

        el.dynamicModalForm.innerHTML = `${message}${(config.fields || []).map(fieldHtml).join("")}<div class="modal-actions"><button class="btn btn-secondary" data-modal-cancel type="button">Cancelar</button><button class="btn ${config.submitClass || "btn-primary"}" type="submit">${escapeHtml(config.submitText || "Salvar")}</button></div>`;
        el.modalBackdrop.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        el.modalBackdrop.hidden = true;
        el.dynamicModalForm.innerHTML = "";
        state.modalSubmit = null;
        document.body.style.overflow = "";
    }

    async function submitModal(event) {
        event.preventDefault();
        if (!state.modalSubmit?.onSubmit) return;
        const submitButton = el.dynamicModalForm.querySelector("button[type='submit']");
        submitButton.disabled = true;
        submitButton.textContent = "Salvando...";
        if (state.modalSubmit.customSubmit) {
            try {
                await state.modalSubmit.customSubmit(
                    el.dynamicModalForm
                );

                closeModal();
            } catch (error) {
                console.error(error);
                showMessage(
                    error.message,
                    "error"
                );

                submitButton.disabled = false;
                submitButton.textContent =
                    state.modalSubmit.submitText ||
                    "Salvar";
            }

            return;
        }

        const form = new FormData(el.dynamicModalForm);
        const values = {};
        for (const field of state.modalSubmit.fields || []) {
            const control = el.dynamicModalForm.elements[field.name];
            if (field.disabled && field.value !== undefined) values[field.name] = field.value;
            else if (field.type === "checkbox") values[field.name] = control.checked;
            else if (field.type === "number") values[field.name] = control.value === "" ? "" : Number(control.value);
            else values[field.name] = form.get(field.name) ?? "";
        }
        const finalValues = state.modalSubmit.transform ? state.modalSubmit.transform(values) : values;
        try {
            await state.modalSubmit.onSubmit(finalValues);
            closeModal();
        } catch (error) {
            console.error(error);
            showMessage(error.message, "error");
            submitButton.disabled = false;
            submitButton.textContent = state.modalSubmit.submitText || "Salvar";
        }
    }

    function setSidebarOpen(open) {
        const shouldOpen = Boolean(open);
        el.sidebar.classList.toggle("open", shouldOpen);
        document.body.classList.toggle("sidebar-open", shouldOpen);
        el.menuButton.setAttribute("aria-expanded", String(shouldOpen));
    }

    async function navigate(section) {
        state.currentSection = section;
        document.querySelectorAll(".admin-section").forEach(node => node.classList.remove("active-section"));
        document.getElementById(`section-${section}`)?.classList.add("active-section");
        const activeButton = document.querySelector(`.nav-item[data-section="${section}"]`);
        document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button === activeButton));
        activeButton?.scrollIntoView({ block: "nearest", inline: "nearest" });
        el.pageTitle.textContent = SECTION_TITLES[section] || "Painel";
        setSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: "auto" });

        try {
            if (section === "visao-geral") await loadOverview();
            if (section === "pedidos") await refreshOrders();
            if (section === "clientes") await loadClients();
            if (["cardapio", "entregas", "horarios", "recompensas"].includes(section)) await reloadOperation();
            if (section === "equipe") await loadTeam();
            if (section === "auditoria") await loadAudit();
        } catch (error) {
            console.error(error);
            showMessage(error.message, "error");
        }
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        state.refreshTimer = setInterval(async () => {
            if (document.hidden || !state.session) return;
            try {
                if (["visao-geral", "pedidos"].includes(state.currentSection)) await refreshOrders();
            } catch (error) { console.warn("Atualização automática falhou:", error); }
        }, 30000);
    }

    function stopAutoRefresh() {
        if (state.refreshTimer) clearInterval(state.refreshTimer);
        state.refreshTimer = null;
    }

    ensureManualOrderButton();

    el.loginForm.addEventListener("submit", handleLogin);
    el.logoutButton.addEventListener("click", handleLogout);
    el.menuButton.addEventListener("click", () => setSidebarOpen(!el.sidebar.classList.contains("open")));
    el.sidebarBackdrop?.addEventListener("click", () => setSidebarOpen(false));
    el.globalRefreshButton.addEventListener("click", () => navigate(state.currentSection));
    el.refreshOrdersButton.addEventListener("click", async () => { try { await refreshOrders(); showMessage("Pedidos atualizados."); } catch (error) { showMessage(error.message, "error"); } });
    el.ordersStatusFilter.addEventListener("change", renderOrders);
    el.clientsSearchForm.addEventListener("submit", event => { event.preventDefault(); loadClients().catch(error => showMessage(error.message, "error")); });
    el.storeConfigForm.addEventListener("submit", saveStoreConfig);
    el.auditFilterForm.addEventListener("submit", event => { event.preventDefault(); loadAudit().catch(error => showMessage(error.message, "error")); });
    el.newComplementButton.addEventListener("click", () => openComplementModal());
    el.newNeighborhoodButton.addEventListener("click", () => openNeighborhoodModal());
    el.newRewardButton.addEventListener("click", () => openRewardModal());
    el.newTeamMemberButton.addEventListener("click", () => openTeamModal());
    el.modalCloseButton.addEventListener("click", closeModal);
    el.dynamicModalForm.addEventListener("submit", submitModal);
    el.modalBackdrop.addEventListener("click", event => { if (event.target === el.modalBackdrop) closeModal(); });

    document.addEventListener("click", event => {
        const manualOrderButton =
            event.target.closest(
                "[data-new-manual-order]"
            );

        if (manualOrderButton) {
            openManualOrderModal()
                .catch(error => {
                    console.error(error);
                    showMessage(
                        error.message,
                        "error"
                    );
                });

            return;
        }

        const addManualItem =
            event.target.closest(
                "[data-manual-add-item]"
            );

        if (addManualItem) {
            addManualItemRow();
            return;
        }

        const removeManualItem =
            event.target.closest(
                "[data-manual-remove-item]"
            );

        if (removeManualItem) {
            const rows =
                el.dynamicModalForm.querySelectorAll(
                    "[data-manual-item-row]"
                );

            if (rows.length <= 1) {
                showMessage(
                    "O pedido precisa ter pelo menos um item.",
                    "warning"
                );

                return;
            }

            removeManualItem
                .closest(
                    "[data-manual-item-row]"
                )
                ?.remove();

            return;
        }

        const nav = event.target.closest("[data-section]");
        if (nav) navigate(nav.dataset.section);
        const go = event.target.closest("[data-go-section]");
        if (go) navigate(go.dataset.goSection);
        const orderAction = event.target.closest("[data-order-action]");
        if (orderAction) handleOrderAction(orderAction);
        const clientToggle = event.target.closest("[data-client-toggle]");
        if (clientToggle) toggleClient(clientToggle);
        const sizeButton = event.target.closest("[data-edit-size]");
        if (sizeButton) openSizeModal(state.operacao.tamanhos.find(item => String(item.id) === sizeButton.dataset.editSize));
        const complementButton = event.target.closest("[data-edit-complement]");
        if (complementButton) openComplementModal(state.operacao.complementos.find(item => String(item.id) === complementButton.dataset.editComplement));
        const neighborhoodButton = event.target.closest("[data-edit-neighborhood]");
        if (neighborhoodButton) openNeighborhoodModal(state.operacao.bairros.find(item => String(item.id) === neighborhoodButton.dataset.editNeighborhood));
        const rewardButton = event.target.closest("[data-edit-reward]");
        if (rewardButton) openRewardModal(state.operacao.recompensas.find(item => String(item.id) === rewardButton.dataset.editReward));
        const scheduleButton = event.target.closest("[data-save-schedule]");
        if (scheduleButton) saveSchedule(scheduleButton);
        const teamButton = event.target.closest("[data-edit-team]");
        if (teamButton) openTeamModal(state.equipe.find(item => item.usuario_id === teamButton.dataset.editTeam));
        if (event.target.closest("[data-modal-cancel]")) closeModal();
    });

    document.addEventListener("change", event => {
        const manualSize =
            event.target.closest(
                "[data-manual-size]"
            );

        if (manualSize) {
            const selected =
                manualSize.options[
                manualSize.selectedIndex
                ];

            const priceInput =
                manualSize
                    .closest(
                        "[data-manual-item-row]"
                    )
                    ?.querySelector(
                        "[data-manual-price]"
                    );

            if (priceInput) {
                priceInput.value =
                    selected?.dataset.price ||
                    "";
            }
        }

        const active = event.target.closest("[data-active]");
        if (active) {
            const row = active.closest("[data-day]");
            row.querySelector("[data-open]").disabled = !active.checked;
            row.querySelector("[data-close]").disabled = !active.checked;
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            setSidebarOpen(false);
            if (!el.modalBackdrop.hidden) closeModal();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) setSidebarOpen(false);
    });
    window.addEventListener("online", () => setConnection(true, "Internet disponível"));
    window.addEventListener("offline", () => setConnection(false, "Sem internet"));

    supabase.auth.onAuthStateChange((event, session) => {
        state.session = session;
        if (event === "SIGNED_OUT") showAuth();
    });

    bootstrap();
})();