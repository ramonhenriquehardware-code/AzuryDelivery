(function () {
  "use strict";

  const supabase = window.AzurySupabase;

  if (!supabase) {
    console.error("Cliente Supabase não disponível.");
    return;
  }

  const VAPID_PUBLIC_KEY =
    "BI6lY59TKq__8CSOrvnk_FEGYUCbidsGR81loR8RsaYgO3eCoHFbQsfgWPNuENMEt95K02Od4k21GIo_eVVyaxM";

  const ADMIN_SOUND_PREFERENCE_KEY = "azuryAdminSoundEnabled";
  const ADMIN_PUSH_PREFERENCE_KEY = "azuryAdminPushEnabled";

  function readAdminBooleanPreference(key) {
    try {
      const value = window.localStorage.getItem(key);

      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }
    } catch (error) {
      console.warn("Não foi possível ler uma preferência local do painel.", error);
    }

    return null;
  }

  function writeAdminBooleanPreference(key, value) {
    try {
      window.localStorage.setItem(key, value ? "true" : "false");
    } catch (error) {
      console.warn("Não foi possível salvar uma preferência local do painel.", error);
    }
  }

  const STATUS_LABELS = Object.freeze({
    recebido: "Pedido recebido",
    confirmado: "Pedido aceito",
    em_preparo: "Em preparo",
    pronto: "Pronto",
    saiu_para_entrega: "Saiu para entrega",
    entregue: "Entregue",
    cancelado: "Cancelado",
  });

  const NEXT_STATUS = Object.freeze({
    recebido: {
      status: "confirmado",
      label: "Aceitar pedido",
      className: "btn-primary",
    },

    confirmado: {
      status: "em_preparo",
      label: "Iniciar preparo",
      className: "btn-warning",
    },

    em_preparo: {
      status: "pronto",
      label: "Marcar como pronto",
      className: "btn-primary",
    },

    pronto: {
      status: "saiu_para_entrega",
      label: "Dar saída para entrega",
      className: "btn-primary",

      confirmTitle: "Dar saída para entrega",

      confirmMessage:
        "Confirma que o pedido está pronto e foi entregue ao responsável pela entrega?",

      confirmText: "Confirmar saída",
    },

    saiu_para_entrega: {
      status: "entregue",
      label: "Finalizar como entregue",
      className: "btn-success",

      confirmTitle: "Finalizar pedido",

      confirmMessage:
        "Confirma que o pedido foi entregue ao cliente? Esta ação concluirá o pedido.",

      confirmText: "Confirmar entrega",
    },
  });

  const SECTION_TITLES = Object.freeze({
    "visao-geral": "Visão geral",
    pedidos: "Pedidos",
    clientes: "Clientes",
    cardapio: "Cardápio",
    conteudo: "Conteúdo",
    financeiro: "Financeiro",
    estoque: "Estoque",
    entregas: "Entregas",
    horarios: "Loja e horários",
    recompensas: "Recompensas",
    equipe: "Equipe administrativa",
    auditoria: "Auditoria",
  });

  const state = {
    session: null,

    admin: null,

    currentSection: "visao-geral",

    pedidos: [],

    resumoPedidos: {},

    ordersEstabelecimento: "azury",

    rastreamentos: [],

    clientes: [],

    resumoClientes: {},

    operacao: null,

    phConfig: null,

    cardapioEstabelecimento: "azury",

    cardapioDisponibilidade: "todos",

    conteudoEstabelecimento: "azury",

    conteudoTipo: "cardapio_dia",

    conteudoFormato: "story",

    conteudoSelecionados: new Set(),

    conteudoHistorico: [],

    conteudoUltimaGeracao: null,

    horariosEstabelecimento: "azury",

    financeiroEstabelecimento: "azury",

    financeiroData: null,

    estoqueEstabelecimento: "azury",

    estoqueItens: [],

    equipe: [],

    resumoEquipe: {},

    auditoria: [],

    refreshTimer: null,

    modalSubmit: null,

    messageTimer: null,

    manualItemCounter: 0,

    realtimeChannel: null,

    audioContext: null,

    soundEnabled: false,

    soundPreference: readAdminBooleanPreference(ADMIN_SOUND_PREFERENCE_KEY),

    alarmTimer: null,

    activeAlarmOrderId: null,

    activeAlarmCode: null,

    pushSupported: false,

    pushEnabled: false,

    pushPreference: readAdminBooleanPreference(ADMIN_PUSH_PREFERENCE_KEY),

    pushSubscription: null,
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

    phOverviewCards: document.getElementById("phOverviewCards"),

    phStoreStatusPanel: document.getElementById("phStoreStatusPanel"),

    phRecentOrders: document.getElementById("phRecentOrders"),

    ordersStatusFilter: document.getElementById("ordersStatusFilter"),

    ordersAzuryButton: document.getElementById("ordersAzuryButton"),

    ordersPhButton: document.getElementById("ordersPhButton"),

    refreshOrdersButton: document.getElementById("refreshOrdersButton"),

    ordersSummary: document.getElementById("ordersSummary"),

    ordersList: document.getElementById("ordersList"),

    clientsSearchForm: document.getElementById("clientsSearchForm"),

    clientsSearch: document.getElementById("clientsSearch"),

    clientsActiveFilter: document.getElementById("clientsActiveFilter"),

    clientsSummary: document.getElementById("clientsSummary"),

    clientsList: document.getElementById("clientsList"),

    cardapioToolbar: document.getElementById("cardapioToolbar"),

    cardapioCompanyDescription: document.getElementById(
      "cardapioCompanyDescription",
    ),

    cardapioAzuryButton: document.getElementById("cardapioAzuryButton"),

    cardapioPhButton: document.getElementById("cardapioPhButton"),

    cardapioAvailabilityFilter: document.getElementById(
      "cardapioAvailabilityFilter",
    ),

    cardapioAzuryContent: document.getElementById("cardapioAzuryContent"),

    cardapioPhContent: document.getElementById("cardapioPhContent"),

    sizesList: document.getElementById("sizesList"),

    azuryBoxesList: document.getElementById("azuryBoxesList"),

    complementsList: document.getElementById("complementsList"),

    newComplementButton: document.getElementById("newComplementButton"),

    conteudoToolbar: document.getElementById("conteudoToolbar"),

    conteudoCompanyDescription: document.getElementById(
      "conteudoCompanyDescription",
    ),

    conteudoAzuryButton: document.getElementById("conteudoAzuryButton"),

    conteudoPhButton: document.getElementById("conteudoPhButton"),

    conteudoFormatSelect: document.getElementById("conteudoFormatSelect"),

    conteudoMenuOptions: document.getElementById("conteudoMenuOptions"),

    conteudoItemsList: document.getElementById("conteudoItemsList"),

    conteudoSelectAllButton: document.getElementById("conteudoSelectAllButton"),

    conteudoGenerateButton: document.getElementById("conteudoGenerateButton"),

    conteudoVariationHint: document.getElementById("conteudoVariationHint"),

    conteudoCanvas: document.getElementById("conteudoCanvas"),

    conteudoDownloadButton: document.getElementById("conteudoDownloadButton"),

    conteudoVariationButton: document.getElementById("conteudoVariationButton"),

    conteudoRefreshHistoryButton: document.getElementById(
      "conteudoRefreshHistoryButton",
    ),

    conteudoHistoryList: document.getElementById("conteudoHistoryList"),

    financeiroAzuryButton: document.getElementById("financeiroAzuryButton"),

    financeiroPhButton: document.getElementById("financeiroPhButton"),

    newFinanceEntryButton: document.getElementById("newFinanceEntryButton"),

    financeiroCompanyTitle: document.getElementById("financeiroCompanyTitle"),

    financeiroCompanyLabel: document.getElementById("financeiroCompanyLabel"),

    financeiroPeriodForm: document.getElementById("financeiroPeriodForm"),

    financeiroDataInicio: document.getElementById("financeiroDataInicio"),

    financeiroDataFim: document.getElementById("financeiroDataFim"),

    financeiroSummary: document.getElementById("financeiroSummary"),

    financeiroList: document.getElementById("financeiroList"),

    estoqueAzuryButton: document.getElementById("estoqueAzuryButton"),

    estoquePhButton: document.getElementById("estoquePhButton"),

    refreshEstoqueButton: document.getElementById("refreshEstoqueButton"),

    estoqueCompanyTitle: document.getElementById("estoqueCompanyTitle"),

    estoqueCompanyLabel: document.getElementById("estoqueCompanyLabel"),

    estoqueSummary: document.getElementById("estoqueSummary"),

    estoqueList: document.getElementById("estoqueList"),

    neighborhoodsList: document.getElementById("neighborhoodsList"),

    newNeighborhoodButton: document.getElementById("newNeighborhoodButton"),

    horariosToolbar: document.getElementById("horariosToolbar"),

    horariosAzuryButton: document.getElementById("horariosAzuryButton"),

    horariosPhButton: document.getElementById("horariosPhButton"),

    horariosCompanyDescription: document.getElementById(
      "horariosCompanyDescription",
    ),

    horariosAzuryContent: document.getElementById("horariosAzuryContent"),

    horariosPhContent: document.getElementById("horariosPhContent"),

    storeConfigForm: document.getElementById("storeConfigForm"),

    schedulesList: document.getElementById("schedulesList"),

    phStoreConfigForm: document.getElementById("phStoreConfigForm"),

    phSchedulesList: document.getElementById("phSchedulesList"),

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

    dynamicModalForm: document.getElementById("dynamicModalForm"),
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
    if (!object || typeof object !== "object") {
      return fallback;
    }

    for (const key of keys) {
      const value = object[key];

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
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
      currency: "BRL",
    });
  }

  function formatDate(value) {
    if (!value) {
      return "Não informado";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function formatTime(value) {
    if (!value) {
      return "—";
    }

    return String(value).slice(0, 5);
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || String(status || "Não informado");
  }

  function booleanText(value) {
    return value === true ? "Sim" : "Não";
  }

  function setLoading(container, text = "Carregando...") {
    if (container) {
      container.innerHTML = `<div class="loading-state">${escapeHtml(text)}</div>`;
    }
  }

  function setEmpty(container, text) {
    if (container) {
      container.innerHTML = `<div class="empty-state">${escapeHtml(text)}</div>`;
    }
  }

  function showMessage(text, type = "success") {
    if (!el.globalMessage) {
      return;
    }

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

    el.connectionStatus.className = `connection-pill ${
      online ? "online" : "offline"
    }`;
  }

  async function rpc(name, params = {}) {
    const { data, error } = await supabase.rpc(name, params);

    if (error) {
      throw new Error(error.message || `Falha ao executar ${name}.`);
    }

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

    el.sidebarAdminName.textContent =
      admin.nome || admin.email || "Administrador";

    el.sidebarAdminLevel.textContent = admin.nivel_acesso || "administrador";

    return admin;
  }

  async function bootstrap() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

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

      startRealtimeOrders();

      syncExistingPushSubscription().catch((error) => {
        console.warn("Não foi possível verificar a inscrição push.", error);
      });
    } catch (error) {
      console.error(error);

      await supabase.auth.signOut().catch(() => {});

      showAuth(
        "Esta conta não possui acesso ao painel ou a sessão expirou.",
        "error",
      );
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      state.session = data.session;

      await validateAdminSession();

      showAdmin();

      setConnection(true, "Conectado ao Supabase");

      el.password.value = "";

      await loadOverview();

      startAutoRefresh();

      startRealtimeOrders();

      syncExistingPushSubscription().catch((error) => {
        console.warn("Não foi possível verificar a inscrição push.", error);
      });
    } catch (error) {
      console.error(error);

      await supabase.auth.signOut().catch(() => {});

      el.authMessage.textContent = error.message || "Não foi possível entrar.";

      el.authMessage.className = "form-message error";
    } finally {
      el.loginButton.disabled = false;

      el.loginButton.textContent = "Entrar";
    }
  }

  async function handleLogout() {
    stopAutoRefresh();

    stopRealtimeOrders();

    stopOrderAlarm();

    await supabase.auth.signOut();

    state.session = null;

    state.admin = null;

    state.rastreamentos = [];

    showAuth("Sessão encerrada.", "success");
  }

  function metricCard(icon, value, label) {
    return `
      <article class="metric-card">
        <span class="metric-icon">
          ${icon}
        </span>

        <strong>
          ${escapeHtml(value)}
        </strong>

        <span>
          ${escapeHtml(label)}
        </span>
      </article>
    `;
  }

  function overviewOrderEstablishment(order) {
    return order?.estabelecimento === "ph_sabor_cia"
      ? "ph_sabor_cia"
      : "azury";
  }

  function overviewSummaryFor(establishment) {
    const orders = state.pedidos.filter(
      (order) => overviewOrderEstablishment(order) === establishment,
    );

    const count = (status) =>
      orders.filter((order) => order.status === status).length;

    const faturamentoEntregue = orders
      .filter((order) => order.status === "entregue")
      .reduce(
        (total, order) =>
          total +
          toNumber(
            firstDefined(order, ["valor_total", "total"], 0),
          ),
        0,
      );

    return {
      total: orders.length,
      recebidos: count("recebido"),
      em_andamento:
        count("confirmado") + count("em_preparo") + count("pronto"),
      faturamento_entregue: faturamentoEntregue,
    };
  }

  function renderOverviewRecentOrders(container, orders, emptyText) {
    if (!container) {
      return;
    }

    const recent = orders.slice(0, 5);

    if (!recent.length) {
      setEmpty(container, emptyText);
      return;
    }

    container.innerHTML = recent
      .map(
        (order) => `
            <div class="compact-item">

              <div>

                <strong>
                  ${escapeHtml(order.codigo || order.id)}
                </strong>

                <br>

                <small>

                  ${escapeHtml(
                    firstDefined(
                      order,
                      ["nome_do_cliente", "nome_cliente"],
                      "Cliente",
                    ),
                  )}

                  •

                  ${escapeHtml(formatDate(order.criado_em))}

                </small>

              </div>

              <span
                class="status-badge status-${escapeHtml(order.status)}"
              >
                ${escapeHtml(statusLabel(order.status))}
              </span>

            </div>
          `,
      )
      .join("");
  }

  function renderOverview() {
    const azurySummary = overviewSummaryFor("azury");

    const phSummary = overviewSummaryFor("ph_sabor_cia");

    const op = state.operacao?.resumo || {};

    el.overviewCards.innerHTML = [
      metricCard("📦", azurySummary.total, "Total de pedidos"),

      metricCard("🟡", azurySummary.recebidos, "Aguardando aceite"),

      metricCard("👨‍🍳", azurySummary.em_andamento, "Em andamento"),

      metricCard(
        "💰",
        formatMoney(azurySummary.faturamento_entregue),
        "Faturamento entregue",
      ),
    ].join("");

    const config = state.operacao?.configuracao_loja || {};

    const active = config.pedidos_ativos === true;

    el.storeStatusPanel.innerHTML = `
      <div class="store-status-row">

        <span>
          Pedidos
        </span>

        <strong
          class="status-dot ${active ? "open" : ""}"
        >
          ${active ? "Liberados" : "Pausados"}
        </strong>

      </div>

      <div class="store-status-row">

        <span>
          Tamanhos disponíveis
        </span>

        <strong>
          ${escapeHtml(op.tamanhos_disponiveis ?? 0)}
          de
          ${escapeHtml(op.tamanhos_total ?? 0)}
        </strong>

      </div>

      <div class="store-status-row">

        <span>
          Complementos disponíveis
        </span>

        <strong>
          ${escapeHtml(op.complementos_disponiveis ?? 0)}
          de
          ${escapeHtml(op.complementos_total ?? 0)}
        </strong>

      </div>

      <div class="store-status-row">

        <span>
          Bairros ativos
        </span>

        <strong>
          ${escapeHtml(op.bairros_ativos ?? 0)}
          de
          ${escapeHtml(op.bairros_total ?? 0)}
        </strong>

      </div>

      ${
        !active && config.mensagem_pausa
          ? `
            <div class="store-status-row">

              <span>
                Mensagem
              </span>

              <strong>
                ${escapeHtml(config.mensagem_pausa)}
              </strong>

            </div>
          `
          : ""
      }
    `;

    const azuryOrders = state.pedidos.filter(
      (order) => overviewOrderEstablishment(order) === "azury",
    );

    renderOverviewRecentOrders(
      el.recentOrders,
      azuryOrders,
      "Nenhum pedido da Azury cadastrado no Supabase.",
    );

    if (el.phOverviewCards) {
      el.phOverviewCards.innerHTML = [
        metricCard("📦", phSummary.total, "Total de pedidos"),

        metricCard("🟡", phSummary.recebidos, "Aguardando aceite"),

        metricCard("👨‍🍳", phSummary.em_andamento, "Em andamento"),

        metricCard(
          "💰",
          formatMoney(phSummary.faturamento_entregue),
          "Faturamento entregue",
        ),
      ].join("");
    }

    if (el.phStoreStatusPanel) {
      const phStore = state.phConfig?.loja || {};

      const phMeals = Array.isArray(state.phConfig?.marmitas)
        ? state.phConfig.marmitas
        : [];

      const phDrinks = Array.isArray(state.phConfig?.bebidas)
        ? state.phConfig.bebidas
        : [];

      const phAddons = Array.isArray(state.phConfig?.adicionais)
        ? state.phConfig.adicionais
        : [];

      const phOrdersActive = phStore.pedidos_ativos !== false;

      const availableMeals = phMeals.filter(
        (item) => item?.ativo !== false,
      ).length;

      const availableDrinks = phDrinks.filter(
        (item) => item?.ativo !== false,
      ).length;

      const availableAddons = phAddons.filter(
        (item) => item?.ativo !== false,
      ).length;

      el.phStoreStatusPanel.innerHTML = `
        <div class="store-status-row">

          <span>
            Pedidos
          </span>

          <strong
            class="status-dot ${phOrdersActive ? "open" : ""}"
          >
            ${phOrdersActive ? "Liberados" : "Pausados"}
          </strong>

        </div>

        <div class="store-status-row">

          <span>
            Marmitas disponíveis
          </span>

          <strong>
            ${escapeHtml(availableMeals)}
            de
            ${escapeHtml(phMeals.length)}
          </strong>

        </div>

        <div class="store-status-row">

          <span>
            Bebidas disponíveis
          </span>

          <strong>
            ${escapeHtml(availableDrinks)}
            de
            ${escapeHtml(phDrinks.length)}
          </strong>

        </div>

        <div class="store-status-row">

          <span>
            Adicionais disponíveis
          </span>

          <strong>
            ${escapeHtml(availableAddons)}
            de
            ${escapeHtml(phAddons.length)}
          </strong>

        </div>
      `;
    }

    const phOrders = state.pedidos.filter(
      (order) => overviewOrderEstablishment(order) === "ph_sabor_cia",
    );

    renderOverviewRecentOrders(
      el.phRecentOrders,
      phOrders,
      "Nenhum pedido da PH Sabor & Cia cadastrado no Supabase.",
    );
  }

  async function loadOverview() {
    setConnection(true, "Atualizando...");

    try {
      const [ordersData, operationData, trackingData, phConfigData] =
        await Promise.all([
          rpc("listar_pedidos_admin", {
            p_status: null,
            p_limite: 100,
          }),

          rpc("listar_operacao_admin"),

          rpc("listar_rastreamentos_admin"),

          rpc("obter_configuracao_ph_admin"),
        ]);

      state.pedidos = ordersData.pedidos || [];

      state.resumoPedidos = ordersData.resumo || {};

      state.rastreamentos = Array.isArray(trackingData) ? trackingData : [];

      state.operacao = operationData;

      state.phConfig = phConfigData || null;

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

  const AZURY_CUP_NAMES = new Map([
    [300, "Azury Mini"],
    [400, "Azury Clássico"],
    [500, "Azury Max"],
    [700, "Azury Extra"],
  ]);

  const AZURY_FREE_LIMITS = new Map([
    [300, 2],
    [400, 3],
    [500, 3],
    [700, 4],

    ["azury-box-p", 4],

    ["azury-box-m", 5],

    ["azury-box-g", 6],
  ]);

  const AZURY_BOXES_DEFAULTS = [
    {
      key: "azury-box-p",
      label: "P",
      nome: "Azury Box P",
      preco: 15,
      limite: 4,
      disponivel: true,
      visivel: true,
      ordem: 1,
    },

    {
      key: "azury-box-m",
      label: "M",
      nome: "Azury Box M",
      preco: 25,
      limite: 5,
      disponivel: true,
      visivel: true,
      ordem: 2,
    },

    {
      key: "azury-box-g",
      label: "G",
      nome: "Azury Box G",
      preco: 35,
      limite: 6,
      disponivel: true,
      visivel: true,
      ordem: 3,
    },
  ];

  function getAzuryBoxesAdmin() {
    const configured = state.operacao?.configuracao_loja?.azury_boxes;

    const configuredByKey = new Map(
      (Array.isArray(configured) ? configured : [])
        .filter((item) => item && isAzuryBoxKey(item.key))
        .map((item) => [String(item.key).toLowerCase(), item]),
    );

    return AZURY_BOXES_DEFAULTS.map((fallback) => {
      const saved = configuredByKey.get(fallback.key) || {};

      const price = Number(saved.preco);
      const limit = Number(saved.limite);
      const order = Number(saved.ordem);

      return {
        ...fallback,
        ...saved,
        key: fallback.key,
        label: fallback.label,
        nome: String(saved.nome || fallback.nome).trim() || fallback.nome,
        preco: Number.isFinite(price) && price >= 0 ? price : fallback.preco,
        limite:
          Number.isFinite(limit) && limit >= 0
            ? Math.floor(limit)
            : fallback.limite,
        disponivel:
          saved.disponivel === undefined
            ? fallback.disponivel
            : saved.disponivel !== false,
        visivel:
          saved.visivel === undefined ? fallback.visivel : saved.visivel !== false,
        ordem:
          Number.isFinite(order) && order >= 0
            ? Math.floor(order)
            : fallback.ordem,
      };
    }).sort((a, b) => a.ordem - b.ordem || a.label.localeCompare(b.label));
  }

  let manualPhDeliveryTimer = null;
  let manualPhDeliveryVersion = 0;
  const manualPhStoreCoordinatesCache = new Map();

  const AZURY_SPECIAL_COMPLEMENT_TERMS = [
    "nutella",
    "oreo",
    "morango",
    "uva",
    "confete",
    "power ball",
  ];

  function isAzuryBoxKey(value) {
    return /^azury-box-[pmg]$/.test(
      String(value || "")
        .trim()
        .toLowerCase(),
    );
  }

  function azuryComplementIsAlwaysPaid(name) {
    const key = normalizeKey(name);

    return AZURY_SPECIAL_COMPLEMENT_TERMS.some((term) =>
      key.includes(normalizeKey(term)),
    );
  }

  function azuryProductDisplayName(item, originalItem = null, index = 0) {
    const source = {
      ...(originalItem && typeof originalItem === "object" ? originalItem : {}),

      ...(item && typeof item === "object" ? item : {}),
    };

    const explicit = firstDefined(
      source,
      ["produto_nome", "nome", "produto", "nome_produto", "tamanho_label"],
      "",
    );

    const productType = String(
      firstDefined(source, ["produto_tipo", "tipo_produto"], ""),
    ).toLowerCase();

    const productKey = String(
      firstDefined(source, ["produto_chave", "chave_produto"], ""),
    ).toLowerCase();

    const size = Number(firstDefined(source, ["tamanho_ml", "tamanho"], 0));

    if (productType === "azury_box" || isAzuryBoxKey(productKey)) {
      const box =
        getAzuryBoxesAdmin().find((entry) => entry.key === productKey) ||
        getAzuryBoxesAdmin().find(
          (entry) =>
            String(entry.label).toLowerCase() ===
            String(source.tamanho_label || "").toLowerCase(),
        );

      return explicit && !/^item\s+\d+$/i.test(String(explicit))
        ? String(explicit)
        : box?.nome || "Azury Box";
    }

    if (Number.isFinite(size) && size > 0) {
      const cup = AZURY_CUP_NAMES.get(size);

      if (cup) {
        return `${cup} • ${size}ml`;
      }

      return `Açaí • ${size}ml`;
    }

    if (explicit && !/^item\s+\d+$/i.test(String(explicit))) {
      return String(explicit);
    }

    return `Item ${index + 1}`;
  }

  function manualComplementImage(name) {
    const key = normalizeKey(name);

    const map = {
      granola: "../Imagens/granola.png",

      "leite condensado": "../Imagens/leite-condensado.png",

      pacoca: "../Imagens/pacoca.png",

      banana: "../Imagens/banana.png",

      "coco ralado": "../Imagens/coco-ralado.png",

      "leite em po": "../Imagens/leite-em-po.png",

      "bombom oreo": "../Imagens/bombom-oreo.png",

      oreo: "../Imagens/bombom-oreo.png",

      ovomaltine: "../Imagens/ovomaltine.png",

      morango: "../Imagens/morango.png",

      "uva verde": "../Imagens/uva-verde.png",

      uva: "../Imagens/uva-verde.png",

      nutella: "../Imagens/nutella.png",

      granulado: "../Imagens/granulado.png",

      manga: "../Imagens/manga.png",

      gomets: "../Imagens/gomets.png",

      confete: "../Imagens/confete.png",

      "power ball": "../Imagens/power-ball.png",
    };

    if (map[key]) {
      return map[key];
    }

    const partial = Object.keys(map).find(
      (entry) => key.includes(entry) || entry.includes(key),
    );

    return partial ? map[partial] : "";
  }

  function manualAzuryProductDescriptor(value) {
    const raw = String(value || "").trim();

    if (isAzuryBoxKey(raw)) {
      const box = getAzuryBoxesAdmin().find((entry) => entry.key === raw);

      return box
        ? {
            tipo: "azury_box",

            chave: box.key,

            nome: box.nome,

            tamanho_ml: null,

            tamanho_label: box.label,

            preco_base: Number(box.preco),

            limite: Number(box.limite),
          }
        : null;
    }

    const size = Number(raw);

    const current = (state.operacao?.tamanhos || []).find(
      (item) =>
        Number(item.tamanho_ml) === size &&
        item.visivel !== false &&
        item.disponivel !== false,
    );

    if (!current) {
      return null;
    }

    return {
      tipo: "acai_copo",

      chave: null,

      nome: `${AZURY_CUP_NAMES.get(size) || "Açaí"} • ${size}ml`,

      tamanho_ml: size,

      tamanho_label: `${size}ml`,

      preco_base: Number(current.preco_base || 0),

      limite: Number(AZURY_FREE_LIMITS.get(size) || 0),
    };
  }

  function manualAzuryProductOptions(selectedValue = "") {
    const cupOptions = (state.operacao?.tamanhos || [])
      .filter(
        (item) =>
          item.visivel !== false &&
          item.disponivel !== false &&
          Number.isFinite(Number(item.tamanho_ml)),
      )
      .sort((a, b) => Number(a.tamanho_ml) - Number(b.tamanho_ml))
      .map((item) => {
        const size = Number(item.tamanho_ml);

        const value = String(size);

        return `
            <option
              value="${escapeHtml(value)}"
              ${value === String(selectedValue) ? "selected" : ""}
            >
              ${escapeHtml(AZURY_CUP_NAMES.get(size) || "Açaí")}
              •
              ${escapeHtml(size)}ml
              —
              ${formatMoney(item.preco_base)}
            </option>
          `;
      })
      .join("");

    const boxOptions = getAzuryBoxesAdmin()
      .filter((box) => box.visivel !== false && box.disponivel !== false)
      .map(
      (box) => `
            <option
              value="${escapeHtml(box.key)}"
              ${box.key === String(selectedValue) ? "selected" : ""}
            >
              ${escapeHtml(box.nome)}
              —
              ${formatMoney(box.preco)}
            </option>
          `,
    ).join("");

    return `
      <optgroup label="Açaí no copo">
        ${cupOptions}
      </optgroup>

      <optgroup label="Azury Box">
        ${boxOptions}
      </optgroup>
    `;
  }

  function manualAzuryComplementCards(itemIndex) {
    const complements = (state.operacao?.complementos || []).filter(
      (item) => item.visivel !== false && item.disponivel !== false,
    );

    if (!complements.length) {
      return `
        <div class="manual-complement-empty">
          Nenhum complemento disponível no cardápio.
        </div>
      `;
    }

    return complements
      .map((item, index) => {
        const image = manualComplementImage(item.nome);

        const special = azuryComplementIsAlwaysPaid(item.nome);

        return `
            <article
              class="manual-complement-card"
              data-manual-complement-card
            >

              <label class="manual-complement-main">

                <span
                  class="manual-complement-image ${image ? "" : "is-empty"}"
                >

                  ${
                    image
                      ? `
                        <img
                          src="${escapeHtml(image)}"
                          alt="${escapeHtml(item.nome)}"
                          loading="lazy"
                          onerror="this.closest('.manual-complement-image').classList.add('is-empty');this.remove();"
                        >
                      `
                      : ""
                  }

                </span>

                <span class="manual-complement-copy">

                  <strong>
                    ${escapeHtml(item.nome)}
                  </strong>

                  <small
                    data-manual-complement-rule
                    data-special="${special ? "true" : "false"}"
                  >
                    ${
                      special
                        ? "Especial pago no copo"
                        : "Dentro do limite grátis"
                    }
                    •
                    ${formatMoney(item.preco || 0)}
                  </small>

                </span>

                <input
                  type="checkbox"
                  data-manual-complement
                  data-complement-name="${escapeHtml(item.nome)}"
                  data-complement-price="${escapeHtml(item.preco || 0)}"
                  data-special="${special ? "true" : "false"}"
                  value="${escapeHtml(item.id || index)}"
                >

              </label>

              <div
                class="manual-complement-layers"
                data-manual-complement-layers
                hidden
              >

                <label>

                  <input
                    type="radio"
                    name="manual-layer-${escapeHtml(itemIndex)}-${escapeHtml(index)}"
                    value="meio"
                  >

                  Meio

                </label>

                <label>

                  <input
                    type="radio"
                    name="manual-layer-${escapeHtml(itemIndex)}-${escapeHtml(index)}"
                    value="cobertura"
                  >

                  Cobertura

                </label>

                <label>

                  <input
                    type="radio"
                    name="manual-layer-${escapeHtml(itemIndex)}-${escapeHtml(index)}"
                    value="ambos"
                    checked
                  >

                  Nos dois

                </label>

              </div>

            </article>
          `;
      })
      .join("");
  }

  function manualAzurySelectedComplements(row) {
    return Array.from(
      row.querySelectorAll("[data-manual-complement]:checked"),
    ).map((input, index) => {
      const card = input.closest("[data-manual-complement-card]");

      const layer =
        card?.querySelector(
          "[data-manual-complement-layers] input[type='radio']:checked",
        )?.value || "ambos";

      return {
        input,

        card,

        nome: input.dataset.complementName || "",

        preco: Number(input.dataset.complementPrice || 0),

        especial: input.dataset.special === "true",

        camada: layer,

        ordem: index,
      };
    });
  }

  function calculateManualAzuryRow(row) {
    const descriptor = manualAzuryProductDescriptor(
      row.querySelector("[data-manual-azury-product]")?.value,
    );

    if (!descriptor) {
      return null;
    }

    const selected = manualAzurySelectedComplements(row);

    const eligible =
      descriptor.tipo === "azury_box"
        ? selected
        : selected.filter((item) => !item.especial);

    const freeSet = new Set(
      eligible.slice(0, descriptor.limite).map((item) => item.input),
    );

    let extras = 0;

    selected.forEach((item) => {
      const paid =
        descriptor.tipo === "azury_box"
          ? !freeSet.has(item.input)
          : item.especial || !freeSet.has(item.input);

      item.preco_cobrado = paid ? item.preco : 0;

      extras += item.preco_cobrado;
    });

    return {
      descriptor,

      selected,

      unitPrice: descriptor.preco_base + extras,

      freeUsed: Math.min(eligible.length, descriptor.limite),

      extraCount: Math.max(eligible.length - descriptor.limite, 0),
    };
  }

  function refreshManualAzuryRow(row) {
    if (!row) {
      return;
    }

    const result = calculateManualAzuryRow(row);

    if (!result) {
      return;
    }

    const { descriptor, selected, unitPrice, freeUsed, extraCount } = result;

    row.dataset.manualProductType = descriptor.tipo;

    row.dataset.manualProductKey = descriptor.chave || "";

    const priceInput = row.querySelector("[data-manual-price]");

    if (priceInput) {
      priceInput.value = unitPrice.toFixed(2).replace(".", ",");
    }

    const summary = row.querySelector("[data-manual-price-summary]");

    if (summary) {
      summary.innerHTML = `
        <strong>
          ${formatMoney(unitPrice)}
        </strong>

        <span>
          Base
          ${formatMoney(descriptor.preco_base)}

          •

          ${freeUsed}/${descriptor.limite}

          ${descriptor.tipo === "azury_box" ? "incluídos" : "grátis"}

          ${extraCount ? ` • ${extraCount} extra(s)` : ""}
        </span>
      `;
    }

    row.querySelectorAll("[data-manual-complement-card]").forEach((card) => {
      const input = card.querySelector("[data-manual-complement]");

      const layers = card.querySelector("[data-manual-complement-layers]");

      const rule = card.querySelector("[data-manual-complement-rule]");

      const selectedItem = selected.find((item) => item.input === input);

      card.classList.toggle("is-selected", Boolean(input?.checked));

      if (layers) {
        layers.hidden = descriptor.tipo === "azury_box" || !input?.checked;
      }

      if (rule && input) {
        const special = input.dataset.special === "true";

        const price = Number(input.dataset.complementPrice || 0);

        if (descriptor.tipo === "azury_box") {
          rule.textContent = `Incluído dentro do limite • Extra ${formatMoney(
            price,
          )}`;

          rule.classList.remove("is-special");
        } else if (special) {
          rule.textContent = `Especial pago • ${formatMoney(price)}`;

          rule.classList.add("is-special");
        } else {
          rule.textContent = `Grátis dentro do limite • Extra ${formatMoney(
            price,
          )}`;

          rule.classList.remove("is-special");
        }
      }

      if (selectedItem) {
        card.classList.toggle(
          "is-paid-extra",
          Number(selectedItem.preco_cobrado || 0) > 0,
        );
      } else {
        card.classList.remove("is-paid-extra");
      }
    });
  }

  function orderItemsHtml(order) {
    const items = Array.isArray(order.itens) ? order.itens : [];

    if (!items.length) {
      return "<p>Itens não informados.</p>";
    }

    const originalItems = Array.isArray(order?.dados_originais?.itens)
      ? order.dados_originais.itens
      : [];

    return `
      <div class="order-items">

        ${items
          .map((item, index) => {
            const originalItem = originalItems[index] || null;

            const name = azuryProductDisplayName(item, originalItem, index);

            const size = Number(
              firstDefined(
                {
                  ...(originalItem || {}),

                  ...(item || {}),
                },

                ["tamanho_ml", "tamanho"],

                0,
              ),
            );

            const qty = firstDefined(item, ["quantidade"], 1);

            const unitPrice = firstDefined(
              item,
              ["preco_unitario", "valor_unitario", "preco"],
              null,
            );

            const complements = Array.isArray(item.complementos)
              ? item.complementos
              : Array.isArray(originalItem?.complementos)
                ? originalItem.complementos
                : [];

            const boxMode =
              String(
                firstDefined(
                  {
                    ...(originalItem || {}),

                    ...(item || {}),
                  },

                  ["produto_tipo"],

                  "",
                ),
              ).toLowerCase() === "azury_box" ||
              isAzuryBoxKey(
                firstDefined(
                  {
                    ...(originalItem || {}),

                    ...(item || {}),
                  },

                  ["produto_chave"],

                  "",
                ),
              );

            const middle = [];

            const top = [];

            const single = [];

            complements.forEach((complement) => {
              const complementName = firstDefined(
                complement,

                ["nome", "complemento_nome"],

                "Complemento",
              );

              const layer = String(
                firstDefined(
                  complement,

                  ["camada"],

                  boxMode ? "unica" : "",
                ),
              ).toLowerCase();

              if (boxMode || layer === "unica") {
                single.push(complementName);
              } else if (layer === "meio") {
                middle.push(complementName);
              } else if (layer === "cobertura") {
                top.push(complementName);
              } else if (layer === "ambos") {
                middle.push(complementName);

                top.push(complementName);
              } else {
                single.push(complementName);
              }
            });

            return `
                  <div class="order-item">

                    <strong>
                      ${escapeHtml(name)}
                    </strong>

                    <p>
                      Quantidade:
                      ${escapeHtml(qty)}

                      ${
                        unitPrice !== null && unitPrice !== ""
                          ? ` • Unitário: ${formatMoney(unitPrice)}`
                          : ""
                      }
                    </p>

                    ${
                      boxMode || single.length
                        ? `
                          <p>
                            Complementos:

                            ${escapeHtml(
                              Array.from(
                                new Set([...single, ...middle, ...top]),
                              ).join(", ") || "Nenhum",
                            )}
                          </p>
                        `
                        : `
                          ${
                            middle.length
                              ? `
                                <p>
                                  Meio:

                                  ${escapeHtml(
                                    Array.from(new Set(middle)).join(", "),
                                  )}
                                </p>
                              `
                              : ""
                          }

                          ${
                            top.length
                              ? `
                                <p>
                                  Cobertura:

                                  ${escapeHtml(
                                    Array.from(new Set(top)).join(", "),
                                  )}
                                </p>
                              `
                              : ""
                          }
                        `
                    }

                  </div>
                `;
          })
          .join("")}

      </div>
    `;
  }

  function addressHtml(order) {
    const street = firstDefined(
      order,
      ["rua", "logradouro", "endereco_rua"],
      "",
    );

    const number = firstDefined(order, ["numero", "endereco_numero"], "");

    const district = firstDefined(
      order,
      ["bairro", "bairro_nome", "nome_bairro", "bairro_entrega_nome"],
      "",
    );

    const zip = firstDefined(order, ["cep"], "");

    const complement = firstDefined(
      order,
      ["complemento_endereco", "endereco_complemento", "complemento"],
      "",
    );

    const parts = [
      street,

      number ? `nº ${number}` : "",

      district,

      zip ? `CEP ${zip}` : "",
    ].filter(Boolean);

    return `
      ${
        parts.length
          ? `<p>${escapeHtml(parts.join(" • "))}</p>`
          : "<p>Endereço não informado.</p>"
      }

      ${complement ? `<p>Complemento: ${escapeHtml(complement)}</p>` : ""}
    `;
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
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({
        nome: name,

        camada: layer,

        preco_unitario: 0,
      }));
  }

  function manualSizeOptions(selectedSize = "") {
    const sizes = state.operacao?.tamanhos || [];

    return sizes
      .filter((item) => item.visivel !== false)
      .map(
        (item) => `
          <option
            value="${escapeHtml(item.tamanho_ml)}"
            data-price="${escapeHtml(item.preco_base)}"
            ${
              String(item.tamanho_ml) === String(selectedSize) ? "selected" : ""
            }
          >
            ${escapeHtml(item.tamanho_ml)}
            ml
            —
            ${formatMoney(item.preco_base)}
          </option>
        `,
      )
      .join("");
  }

  function manualSelectedEstablishment() {
    return String(
      el.dynamicModalForm?.querySelector('[name="estabelecimento"]')?.value ||
        "azury",
    ).trim();
  }

  function phProductValue(type, id) {
    return `${type}:${id}`;
  }

  function findPhProduct(value) {
    const [type, ...idParts] = String(value || "").split(":");

    const id = idParts.join(":");

    if (!type || !id) {
      return null;
    }

    const collections = {
      marmita: state.phConfig?.marmitas || [],

      bebida: state.phConfig?.bebidas || [],

      adicional: state.phConfig?.adicionais || [],
    };

    const collection = collections[type];

    if (!Array.isArray(collection)) {
      return null;
    }

    const product = collection.find(
      (item) => String(item.id) === String(id) && item.ativo !== false,
    );

    if (!product) {
      return null;
    }

    return {
      type,
      product,
    };
  }

  function firstPhProductValue() {
    const marmita = (state.phConfig?.marmitas || []).find(
      (item) =>
        item.ativo !== false &&
        (Array.isArray(item.tamanhos) ? item.tamanhos : []).some(
          (size) => size && size.ativo !== false,
        ),
    );

    if (marmita) {
      return phProductValue("marmita", marmita.id);
    }

    const bebida = (state.phConfig?.bebidas || []).find(
      (item) => item.ativo !== false,
    );

    if (bebida) {
      return phProductValue("bebida", bebida.id);
    }

    const adicional = (state.phConfig?.adicionais || []).find(
      (item) => item.ativo !== false,
    );

    if (adicional) {
      return phProductValue("adicional", adicional.id);
    }

    return "";
  }

  function phProductOptions(selectedValue = "") {
    const groups = [
      {
        label: "Marmitas",

        type: "marmita",

        items: state.phConfig?.marmitas || [],
      },

      {
        label: "Bebidas",

        type: "bebida",

        items: state.phConfig?.bebidas || [],
      },

      {
        label: "Adicionais",

        type: "adicional",

        items: state.phConfig?.adicionais || [],
      },
    ];

    return groups
      .map((group) => {
        const options = group.items
          .filter((item) => {
            if (item.ativo === false) {
              return false;
            }

            if (group.type !== "marmita") {
              return true;
            }

            return (Array.isArray(item.tamanhos) ? item.tamanhos : []).some(
              (size) => size && size.ativo !== false,
            );
          })
          .map((item) => {
            const value = phProductValue(group.type, item.id);

            const priceText =
              group.type === "marmita"
                ? ""
                : item.preco === null || item.preco === undefined
                  ? " — preço a definir"
                  : ` — ${formatMoney(item.preco)}`;

            return `
                    <option
                      value="${escapeHtml(value)}"
                      ${value === selectedValue ? "selected" : ""}
                    >
                      ${escapeHtml(item.nome)}
                      ${escapeHtml(priceText)}
                    </option>
                  `;
          })
          .join("");

        if (!options) {
          return "";
        }

        return `
            <optgroup
              label="${escapeHtml(group.label)}"
            >
              ${options}
            </optgroup>
          `;
      })
      .join("");
  }

  function phSizeOptions(product, selectedSize = "") {
    const sizes = Array.isArray(product?.tamanhos) ? product.tamanhos : [];

    return sizes
      .filter((size) => size && size.ativo !== false)
      .map((size) => {
        const price = size.preco;

        const priceText =
          price === null || price === undefined
            ? "Preço a definir"
            : formatMoney(price);

        return `
            <option
              value="${escapeHtml(size.capacidade_ml)}"
              data-price="${
                price === null || price === undefined ? "" : escapeHtml(price)
              }"
              ${
                String(size.capacidade_ml) === String(selectedSize)
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(size.nome)}
              •
              ${escapeHtml(size.capacidade_ml)}
              ml
              —
              ${escapeHtml(priceText)}
            </option>
          `;
      })
      .join("");
  }

  function phAccompanimentOptions(selectedId = "") {
    const items = (state.phConfig?.acompanhamentos || []).filter(
      (item) => item.ativo !== false,
    );

    return items
      .map(
        (item) => `
          <option
            value="${escapeHtml(item.id)}"
            ${String(item.id) === String(selectedId) ? "selected" : ""}
          >
            ${escapeHtml(item.nome)}
          </option>
        `,
      )
      .join("");
  }

  function manualAzuryItemRowHtml(index) {
    const firstSize =
      (state.operacao?.tamanhos || []).find(
        (item) => item.disponivel !== false && item.visivel !== false,
      ) || {};

    const defaultProduct = String(firstSize.tamanho_ml || "300");

    return `
      <article
        class="manual-order-item manual-order-item-azury"
        data-manual-item-row
        data-manual-item-index="${escapeHtml(index)}"
        data-manual-item-establishment="azury"
      >

        <div class="manual-order-item-head">

          <div>

            <strong>
              Item Azury
            </strong>

            <small>
              Copo ou Azury Box com cálculo automático.
            </small>

          </div>

          <button
            type="button"
            class="btn btn-danger btn-small"
            data-manual-remove-item
          >
            Remover
          </button>

        </div>

        <div class="manual-order-product-grid">

          <label class="modal-field">

            <span>
              Produto
            </span>

            <select
              data-manual-azury-product
              required
            >
              ${manualAzuryProductOptions(defaultProduct)}
            </select>

          </label>

          <label class="modal-field">

            <span>
              Quantidade
            </span>

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

            <span>
              Valor unitário calculado
            </span>

            <input
              data-manual-price
              type="text"
              inputmode="decimal"
              readonly
              value=""
            >

          </label>

        </div>

        <div
          class="manual-order-price-summary"
          data-manual-price-summary
        ></div>

        <div class="manual-order-complements-head">

          <div>

            <strong>
              Complementos
            </strong>

            <small>
              Clique no complemento e, nos copos, escolha Meio, Cobertura ou Nos dois.
            </small>

          </div>

        </div>

        <div class="manual-complements-grid">
          ${manualAzuryComplementCards(index)}
        </div>

      </article>
    `;
  }

  function manualPhItemRowHtml(index) {
    const defaultProductValue = firstPhProductValue();

    const productData = findPhProduct(defaultProductValue);

    const isMeal = productData?.type === "marmita";

    const firstSize =
      isMeal && Array.isArray(productData.product.tamanhos)
        ? productData.product.tamanhos.find(
            (size) => size && size.ativo !== false,
          ) || null
        : null;

    const firstAccompaniment = (state.phConfig?.acompanhamentos || []).find(
      (item) => item.ativo !== false,
    );

    const defaultPrice = isMeal
      ? firstSize?.preco
      : productData?.product?.preco;

    return `
      <article
        data-manual-item-row
        data-manual-item-index="${escapeHtml(index)}"
        data-manual-item-establishment="ph_sabor_cia"
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
            Item da PH Sabor &amp; Cia
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
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 12px;
          "
        >

          <label
            class="modal-field"
            style="grid-column: span 2;"
          >

            <span>
              Produto
            </span>

            <select
              data-manual-ph-product
              required
            >
              ${phProductOptions(defaultProductValue)}
            </select>

          </label>

          <label
            class="modal-field"
            data-manual-ph-size-field
            ${isMeal ? "" : "hidden"}
          >

            <span>
              Tamanho
            </span>

            <select
              data-manual-ph-size
              ${isMeal ? "required" : ""}
            >

              ${
                isMeal
                  ? phSizeOptions(
                      productData.product,
                      firstSize?.capacidade_ml || "",
                    )
                  : ""
              }

            </select>

          </label>

          <label
            class="modal-field"
            data-manual-ph-accompaniment-field
            ${isMeal ? "" : "hidden"}
          >

            <span>
              Salada
            </span>

            <select
              data-manual-ph-accompaniment
              ${isMeal ? "required" : ""}
            >
              ${
                isMeal
                  ? phAccompanimentOptions(firstAccompaniment?.id || "")
                  : ""
              }
            </select>

          </label>

          <label class="modal-field">

            <span>
              Quantidade
            </span>

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

            <span>
              Valor unitário final
            </span>

            <input
              data-manual-price
              type="text"
              inputmode="decimal"
              value="${
                defaultPrice === null || defaultPrice === undefined
                  ? ""
                  : escapeHtml(defaultPrice)
              }"
              placeholder="${
                defaultPrice === null || defaultPrice === undefined
                  ? "Defina o valor cobrado"
                  : "Ex.: 10,00"
              }"
              required
            >

          </label>

        </div>

      </article>
    `;
  }

  function manualItemRowHtml(index, establishment = "azury") {
    if (establishment === "ph_sabor_cia") {
      return manualPhItemRowHtml(index);
    }

    return manualAzuryItemRowHtml(index);
  }

  function resetManualItemsForEstablishment(establishment) {
    const container = el.dynamicModalForm.querySelector("[data-manual-items]");

    if (!container) {
      return;
    }

    state.manualItemCounter = 1;

    container.innerHTML = manualItemRowHtml(1, establishment);

    const description = el.dynamicModalForm.querySelector(
      "[data-manual-items-description]",
    );

    if (description) {
      description.textContent =
        establishment === "ph_sabor_cia"
          ? "Escolha marmitas, bebidas ou adicionais da PH."
          : "Escolha copo ou Azury Box. Complementos, limites e adicionais são calculados automaticamente.";
    }

    if (establishment === "azury") {
      refreshManualAzuryRow(container.querySelector("[data-manual-item-row]"));
    }
  }

  function updatePhManualProductRow(selectNode) {
    const row = selectNode.closest("[data-manual-item-row]");

    if (!row) {
      return;
    }

    const productData = findPhProduct(selectNode.value);

    if (!productData) {
      return;
    }

    const sizeField = row.querySelector("[data-manual-ph-size-field]");

    const sizeSelect = row.querySelector("[data-manual-ph-size]");

    const accompanimentField = row.querySelector(
      "[data-manual-ph-accompaniment-field]",
    );

    const accompanimentSelect = row.querySelector(
      "[data-manual-ph-accompaniment]",
    );

    const priceInput = row.querySelector("[data-manual-price]");

    const isMeal = productData.type === "marmita";

    if (sizeField) {
      sizeField.hidden = !isMeal;
    }

    if (accompanimentField) {
      accompanimentField.hidden = !isMeal;
    }

    if (sizeSelect) {
      sizeSelect.required = isMeal;

      if (isMeal) {
        const firstSize = Array.isArray(productData.product.tamanhos)
          ? productData.product.tamanhos.find(
              (size) => size && size.ativo !== false,
            ) || null
          : null;

        sizeSelect.innerHTML = phSizeOptions(
          productData.product,
          firstSize?.capacidade_ml || "",
        );
      } else {
        sizeSelect.innerHTML = "";

        sizeSelect.value = "";
      }
    }

    if (accompanimentSelect) {
      accompanimentSelect.required = isMeal;

      if (isMeal) {
        const firstAccompaniment = (state.phConfig?.acompanhamentos || []).find(
          (item) => item.ativo !== false,
        );

        accompanimentSelect.innerHTML = phAccompanimentOptions(
          firstAccompaniment?.id || "",
        );
      } else {
        accompanimentSelect.innerHTML = "";

        accompanimentSelect.value = "";
      }
    }

    if (priceInput) {
      if (isMeal) {
        const selected = sizeSelect?.options[sizeSelect.selectedIndex];

        priceInput.value = selected?.dataset.price || "";

        priceInput.placeholder = selected?.dataset.price
          ? "Ex.: 10,00"
          : "Defina o valor cobrado";
      } else {
        const price = productData.product.preco;

        priceInput.value =
          price === null || price === undefined ? "" : String(price);

        priceInput.placeholder =
          price === null || price === undefined
            ? "Defina o valor cobrado"
            : "Ex.: 10,00";
      }
    }
  }

  function updatePhManualSizePrice(selectNode) {
    const row = selectNode.closest("[data-manual-item-row]");

    const priceInput = row?.querySelector("[data-manual-price]");

    const selected = selectNode.options[selectNode.selectedIndex];

    if (!priceInput) {
      return;
    }

    priceInput.value = selected?.dataset.price || "";

    priceInput.placeholder = selected?.dataset.price
      ? "Ex.: 10,00"
      : "Defina o valor cobrado";
  }

  function addManualItemRow() {
    const container = el.dynamicModalForm.querySelector("[data-manual-items]");

    if (!container) {
      return;
    }

    state.manualItemCounter += 1;

    container.insertAdjacentHTML(
      "beforeend",
      manualItemRowHtml(state.manualItemCounter, manualSelectedEstablishment()),
    );

    if (manualSelectedEstablishment() === "azury") {
      refreshManualAzuryRow(container.lastElementChild);
    }
  }

  function buildManualAzuryItem(row) {
    const result = calculateManualAzuryRow(row);

    if (!result) {
      throw new Error("Escolha o produto de todos os itens da Azury.");
    }

    const quantity = Number(row.querySelector("[data-manual-quantity]")?.value);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error("A quantidade de um item é inválida.");
    }

    const { descriptor, selected, unitPrice } = result;

    const complements = [];

    selected.forEach((item) => {
      if (descriptor.tipo === "azury_box") {
        complements.push({
          nome: item.nome,

          camada: "unica",

          preco_unitario: Number(item.preco_cobrado || 0),
        });

        return;
      }

      if (item.camada === "ambos") {
        complements.push(
          {
            nome: item.nome,

            camada: "meio",

            preco_unitario: Number(item.preco_cobrado || 0),
          },

          {
            nome: item.nome,

            camada: "cobertura",

            preco_unitario: 0,
          },
        );

        return;
      }

      complements.push({
        nome: item.nome,

        camada: item.camada === "cobertura" ? "cobertura" : "meio",

        preco_unitario: Number(item.preco_cobrado || 0),
      });
    });

    return {
      produto_nome: descriptor.nome,

      produto_tipo: descriptor.tipo,

      produto_chave: descriptor.chave,

      tamanho_label: descriptor.tamanho_label,

      tamanho_ml: descriptor.tamanho_ml,

      quantidade: quantity,

      preco_unitario: Number(unitPrice.toFixed(2)),

      complementos: complements,
    };
  }

  function buildManualPhItem(row) {
    const productSelect = row.querySelector("[data-manual-ph-product]");

    const productData = findPhProduct(productSelect?.value);

    if (!productData) {
      throw new Error("Escolha todos os produtos da PH Sabor & Cia.");
    }

    const quantity = Number(row.querySelector("[data-manual-quantity]")?.value);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw new Error("A quantidade de um item da PH é inválida.");
    }

    const priceInput = row.querySelector("[data-manual-price]");

    const rawPrice = String(priceInput?.value || "").trim();

    if (!rawPrice) {
      throw new Error(
        `Informe o valor unitário de ${productData.product.nome}.`,
      );
    }

    const unitPrice = parseMoneyInput(rawPrice);

    if (unitPrice < 0) {
      throw new Error("O valor de um item da PH não pode ser negativo.");
    }

    if (productData.type === "marmita") {
      const sizeSelect = row.querySelector("[data-manual-ph-size]");

      const size = Number(sizeSelect?.value);

      if (!Number.isFinite(size) || size <= 0) {
        throw new Error(`Escolha o tamanho de ${productData.product.nome}.`);
      }

      const selectedSize = (
        Array.isArray(productData.product.tamanhos)
          ? productData.product.tamanhos
          : []
      ).find(
        (item) => Number(item?.capacidade_ml) === size && item?.ativo !== false,
      );

      if (!selectedSize) {
        throw new Error(
          `O tamanho escolhido de ${productData.product.nome} está indisponível.`,
        );
      }

      const accompanimentId = String(
        row.querySelector("[data-manual-ph-accompaniment]")?.value || "",
      );

      const accompaniment = (state.phConfig?.acompanhamentos || []).find(
        (item) => String(item.id) === accompanimentId && item.ativo !== false,
      );

      if (!accompaniment) {
        throw new Error(
          `Informe se o cliente deseja salada em ${productData.product.nome}.`,
        );
      }

      return {
        produto_nome: productData.product.nome,

        tamanho_ml: size,

        quantidade: quantity,

        preco_unitario: unitPrice,

        complementos: [
          {
            nome: accompaniment.nome,

            camada: "unica",

            preco_unitario: 0,
          },
        ],
      };
    }

    return {
      produto_nome: productData.product.nome,

      tamanho_ml: null,

      quantidade: quantity,

      preco_unitario: unitPrice,

      complementos: [],
    };
  }

  function buildManualOrderPayload(formNode) {
    const form = new FormData(formNode);

    const establishment = String(form.get("estabelecimento") || "azury").trim();

    if (
      establishment === "ph_sabor_cia" &&
      formNode.dataset.phDeliveryCalculating === "true"
    ) {
      throw new Error(
        "Aguarde o cálculo da taxa de entrega da PH terminar.",
      );
    }

    if (!["azury", "ph_sabor_cia"].includes(establishment)) {
      throw new Error("O estabelecimento selecionado é inválido.");
    }

    const rows = Array.from(
      formNode.querySelectorAll("[data-manual-item-row]"),
    );

    if (!rows.length) {
      throw new Error("Adicione pelo menos um item ao pedido.");
    }

    const items =
      establishment === "ph_sabor_cia"
        ? rows.map(buildManualPhItem)
        : rows.map(buildManualAzuryItem);

    const districtName = String(form.get("bairro") || "").trim();

    const districtKey = normalizeKey(districtName);

    const district = (state.operacao?.bairros || []).find((item) => {
      const itemKey = normalizeKey(item.nome);

      const aliases = Array.isArray(item.aliases) ? item.aliases : [];

      return (
        itemKey === districtKey ||
        aliases.some((alias) => normalizeKey(alias) === districtKey)
      );
    });

    const payment = String(form.get("forma_pagamento") || "");

    const payload = {
      estabelecimento: establishment,

      cliente_nome: String(form.get("cliente_nome") || "").trim(),

      cliente_email: String(form.get("cliente_email") || "").trim() || null,

      cliente_telefone:
        String(form.get("cliente_telefone") || "").trim() || null,

      forma_pagamento: payment,

      status_pagamento: String(form.get("status_pagamento") || "pendente"),

      status: "recebido",

      troco_para:
        payment === "dinheiro"
          ? String(form.get("troco_para") || "").trim()
            ? parseMoneyInput(form.get("troco_para"))
            : null
          : null,

      bairro_entrega_id: district?.id || null,

      cep: String(form.get("cep") || "").trim(),

      rua: String(form.get("rua") || "").trim(),

      numero: String(form.get("numero") || "").trim(),

      bairro: districtName,

      complemento_endereco:
        String(form.get("complemento_endereco") || "").trim() || null,

      taxa_entrega: parseMoneyInput(form.get("taxa_entrega")),

      desconto: parseMoneyInput(form.get("desconto")),

      observacoes: String(form.get("observacoes") || "").trim() || null,

      itens: items,
    };

    return payload;
  }

  async function submitManualOrder(formNode) {
    const payload = buildManualOrderPayload(formNode);

    const data = await rpc("criar_pedido_manual_admin", {
      p_dados: payload,
    });

    await refreshOrders();

    showMessage(
      `Pedido ${data.codigo || ""} registrado com sucesso pelo WhatsApp.`,
    );
  }

  function manualOrderPaymentLabel(value) {
    const labels = {
      pix: "Pix",

      dinheiro: "Dinheiro",

      cartao_debito: "Cartão de débito",

      cartao_credito: "Cartão de crédito",
    };

    return labels[String(value || "")] || String(value || "Não informado");
  }

  function manualOrderItemConfirmationLines(item, establishment) {
    const quantity = Number(item?.quantidade || 1);

    const productName = String(item?.produto_nome || "Item").trim();

    const sizeLabel = String(item?.tamanho_label || "").trim();

    const sizeMl = Number(item?.tamanho_ml);

    let sizeText = "";

    if (
      sizeLabel &&
      !productName.toLowerCase().endsWith(` ${sizeLabel.toLowerCase()}`)
    ) {
      sizeText = ` — ${sizeLabel}`;
    } else if (
      Number.isFinite(sizeMl) &&
      sizeMl > 0 &&
      !productName.includes(String(sizeMl))
    ) {
      sizeText = ` — ${sizeMl} ml`;
    }

    const lines = [`• ${quantity}x ${productName}${sizeText}`];

    const complements = Array.isArray(item?.complementos)
      ? item.complementos
      : [];

    if (!complements.length) {
      return lines;
    }

    if (establishment === "ph_sabor_cia") {
      const salad = complements.find((complement) => {
        const name = normalizeKey(complement?.nome || "");

        return name === "com salada" || name === "sem salada";
      });

      if (salad) {
        lines.push(`  Salada: ${salad.nome}`);
      }

      return lines;
    }

    const grouped = new Map();

    complements.forEach((complement) => {
      const name = String(complement?.nome || "Complemento").trim();

      const key = normalizeKey(name) || name.toLowerCase();

      const layer = String(complement?.camada || "")
        .trim()
        .toLowerCase();

      if (!grouped.has(key)) {
        grouped.set(key, {
          name,

          layers: new Set(),
        });
      }

      const current = grouped.get(key);

      if (layer === "ambos") {
        current.layers.add("meio");

        current.layers.add("cobertura");
      } else if (layer) {
        current.layers.add(layer);
      }
    });

    const details = Array.from(grouped.values());

    if (details.length) {
      lines.push("  *Complementos*");

      details.forEach((complement) => {
        const hasMiddle = complement.layers.has("meio");

        const hasTop = complement.layers.has("cobertura");

        const singleLayer = complement.layers.has("unica");

        const layerText = singleLayer
          ? ""
          : hasMiddle && hasTop
            ? "Nos dois"
            : hasMiddle
              ? "Meio"
              : hasTop
                ? "Cobertura"
                : "";

        lines.push(
          `  • ${complement.name}${layerText ? ` — ${layerText}` : ""}`,
        );
      });
    }

    return lines;
  }

  function encodeWhatsAppConfirmationMessage(message) {
    return encodeURIComponent(message)
      .replace(/__AZURY_RECEIPT__/g, "%F0%9F%A7%BE")
      .replace(/__AZURY_BLUE_HEART__/g, "%F0%9F%92%99")
      .replace(/__AZURY_CHECK__/g, "%E2%9C%85");
  }

  function buildManualOrderConfirmationMessage(payload, orderCode = "") {
    const establishment = String(payload?.estabelecimento || "azury");

    const storeName =
      establishment === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury";

    const items = Array.isArray(payload?.itens) ? payload.itens : [];

    const productsTotal = items.reduce(
      (sum, item) =>
        sum + Number(item?.preco_unitario || 0) * Number(item?.quantidade || 0),

      0,
    );

    const deliveryFee = Number(payload?.taxa_entrega || 0);

    const discount = Number(payload?.desconto || 0);

    const total = Math.max(0, productsTotal + deliveryFee - discount);

    const street = String(payload?.rua || "").trim();

    const number = String(payload?.numero || "").trim();

    const district = String(payload?.bairro || "").trim();

    const zip = String(payload?.cep || "").trim();

    const streetAndNumber = [street, number ? `nº ${number}` : ""]
      .filter(Boolean)
      .join(", ");

    const deliveryAddress = [streetAndNumber, district]
      .filter(Boolean)
      .join(" — ");

    const itemLines = items.flatMap((item) =>
      manualOrderItemConfirmationLines(item, establishment),
    );

    const isPix =
      String(payload?.forma_pagamento || "")
        .trim()
        .toLowerCase() === "pix";

    const finalMessage = isPix
      ? "Assim que o comprovante for enviado, conseguimos confirmar o pedido e seguir com o preparo. __AZURY_BLUE_HEART__"
      : "Se estiver tudo certo, responda *CONFIRMO* para iniciarmos o preparo. __AZURY_CHECK__";

    const lines = [
      "__AZURY_RECEIPT__ *CONFIRMAÇÃO DO PEDIDO*",

      `*${storeName}*`,

      orderCode ? `Pedido *${orderCode}*` : "",

      "",

      "Confira se o seu pedido está correto:",

      "",

      "*Itens*",

      ...itemLines,

      "",

      "*Entrega*",

      deliveryAddress || "Endereço não informado",

      zip ? `CEP ${zip}` : null,

      payload?.complemento_endereco
        ? `Complemento: ${payload.complemento_endereco}`
        : null,

      payload?.observacoes ? `Observações: ${payload.observacoes}` : null,

      "",

      "*Pagamento*",

      manualOrderPaymentLabel(payload?.forma_pagamento),

      payload?.forma_pagamento === "dinheiro" && Number(payload?.troco_para) > 0
        ? `Troco para: ${formatMoney(payload.troco_para)}`
        : null,

      "",

      "*Valores*",

      `Produtos: ${formatMoney(productsTotal)}`,

      `Entrega: ${formatMoney(deliveryFee)}`,

      discount > 0 ? `Desconto: -${formatMoney(discount)}` : null,

      `*Total: ${formatMoney(total)}*`,

      "",

      finalMessage,
    ];

    return lines
      .filter((line) => line !== null && line !== undefined)
      .join("\n");
  }

  async function registerManualOrderAndSendConfirmation(formNode) {
    if (!formNode.reportValidity()) {
      return false;
    }

    const payload = buildManualOrderPayload(formNode);

    const normalizedPhone = normalizeWhatsAppPhone(payload.cliente_telefone);

    if (normalizedPhone.length < 12) {
      throw new Error(
        "Informe um telefone/WhatsApp válido para enviar a confirmação do pedido.",
      );
    }

    const data = await rpc("criar_pedido_manual_admin", {
      p_dados: payload,
    });

    try {
      await refreshOrders();
    } catch (refreshError) {
      console.error(
        "O pedido foi registrado, mas a lista não atualizou imediatamente.",
        refreshError,
      );
    }

    const code = data?.codigo || "";

    const message = buildManualOrderConfirmationMessage(payload, code);

    const encodedMessage = encodeWhatsAppConfirmationMessage(message);

    const isMobile =
      navigator.userAgentData?.mobile === true ||
      /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const url = isMobile
      ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedMessage}`;

    const opened = window.open(url, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = url;

      return true;
    }

    closeModal();

    showMessage(
      `Pedido ${code} registrado e aberto no WhatsApp para confirmação.`,
      "success",
    );

    return true;
  }

  async function openManualOrderModal() {
    if (!state.operacao) {
      state.operacao = await rpc("listar_operacao_admin");
    }

    if (!state.phConfig) {
      state.phConfig = await rpc("obter_configuracao_ph_admin");
    }

    state.manualItemCounter = 1;

    state.modalSubmit = {
      title: "Registrar pedido do WhatsApp",

      submitText: "Registrar pedido",

      customSubmit: submitManualOrder,
    };

    el.modalTitle.textContent = "Registrar pedido do WhatsApp";

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

          <span>
            Estabelecimento
          </span>

          <select
            name="estabelecimento"
            data-manual-establishment
            required
          >
            <option value="azury" ${state.ordersEstabelecimento === "azury" ? "selected" : ""}>
              Azury
            </option>

            <option value="ph_sabor_cia" ${state.ordersEstabelecimento === "ph_sabor_cia" ? "selected" : ""}>
              PH Sabor &amp; Cia
            </option>
          </select>

        </label>

        <label class="modal-field">

          <span>
            Nome do cliente
          </span>

          <input
            name="cliente_nome"
            required
            placeholder="Nome completo"
          >

        </label>

        <label class="modal-field">

          <span>
            Telefone / WhatsApp
          </span>

          <input
            name="cliente_telefone"
            type="tel"
            placeholder="(11) 99999-9999"
          >

        </label>

        <label class="modal-field">

          <span>
            E-mail
          </span>

          <input
            name="cliente_email"
            type="email"
            placeholder="Opcional"
          >

        </label>

        <label class="modal-field">

          <span>
            Forma de pagamento
          </span>

          <select
            name="forma_pagamento"
            required
          >
            <option value="pix">
              Pix
            </option>

            <option value="dinheiro">
              Dinheiro
            </option>

            <option value="cartao_debito">
              Cartão de débito
            </option>

            <option value="cartao_credito">
              Cartão de crédito
            </option>
          </select>

        </label>

        <label class="modal-field">

          <span>
            Status do pagamento
          </span>

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

          <span>
            Troco para
          </span>

          <input
            name="troco_para"
            type="text"
            inputmode="decimal"
            placeholder="Somente dinheiro"
          >

        </label>

        <label class="modal-field">

          <span>
            CEP
          </span>

          <input
            name="cep"
            required
            placeholder="00000-000"
          >

        </label>

        <label class="modal-field">

          <span>
            Rua / Avenida
          </span>

          <input
            name="rua"
            required
          >

        </label>

        <label class="modal-field">

          <span>
            Número
          </span>

          <input
            name="numero"
            required
          >

        </label>

        <label class="modal-field">

          <span>
            Bairro
          </span>

          <input
            name="bairro"
            list="manualDistrictOptions"
            required
          >

          <datalist id="manualDistrictOptions">

            ${(state.operacao?.bairros || [])
              .map(
                (item) => `
                    <option
                      value="${escapeHtml(item.nome)}"
                    >
                  `,
              )
              .join("")}

          </datalist>

        </label>

        <label class="modal-field">

          <span>
            Complemento do endereço
          </span>

          <input
            name="complemento_endereco"
            placeholder="Casa, bloco, referência..."
          >

        </label>

        <label class="modal-field">

          <span>
            Taxa de entrega
          </span>

          <input
            name="taxa_entrega"
            type="text"
            inputmode="decimal"
            value="0,00"
            required
          >

          <small
            data-manual-delivery-status
            style="display:block; margin-top:6px; font-size:11px; line-height:1.35; opacity:.72;"
          >
            Na PH, informe o CEP e o número para calcular a taxa automaticamente.
          </small>

        </label>

        <label class="modal-field">

          <span>
            Desconto
          </span>

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

          <strong>
            Itens do pedido
          </strong>

          <p
            data-manual-items-description
            style="
              margin: 4px 0 0;
              opacity: 0.75;
            "
          >
            Escolha copo ou Azury Box. Complementos e valores são calculados automaticamente.
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
        ${manualItemRowHtml(1, state.ordersEstabelecimento)}
      </div>

      <label
        class="modal-field full"
        style="
          grid-column: 1 / -1;
        "
      >

        <span>
          Observações
        </span>

        <textarea
          name="observacoes"
          placeholder="Detalhes do pedido recebido pelo WhatsApp"
        ></textarea>

      </label>

      <div
        style="
          grid-column: 1 / -1;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.18);
        "
      >

        <strong>
          Fluxo WhatsApp
        </strong>

        <p
          style="
            margin: 4px 0 0;
            opacity: 0.8;
          "
        >
          Registre e envie o resumo para o cliente.
          Depois que ele confirmar no WhatsApp,
          use “Aceitar pedido” no card e siga normalmente para o preparo.
        </p>

      </div>

      <div
        class="modal-actions"
        style="
          grid-column: 1 / -1;
          flex-wrap: wrap;
        "
      >

        <button
          class="btn btn-secondary"
          data-modal-cancel
          type="button"
        >
          Cancelar
        </button>

        <button
          class="btn btn-success"
          data-manual-register-confirmation
          type="button"
        >
          💬 Registrar e enviar confirmação
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

    resetManualItemsForEstablishment(state.ordersEstabelecimento);

    refreshManualDeliveryForEstablishment(
      el.dynamicModalForm,
      state.ordersEstabelecimento,
    );
  }

  function injectOrderAlarmStyles() {
    if (document.getElementById("azuryOrderAlarmStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "azuryOrderAlarmStyles";

    style.textContent = `
      .azury-order-alarm {
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 120000;
        width: min(430px, calc(100vw - 36px));
        overflow: hidden;
        border: 2px solid #f6c453;
        border-radius: 18px;
        background: #071426;
        color: #ffffff;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
        animation: azury-order-pulse 1.15s ease-in-out infinite alternate;
      }

      .azury-order-alarm-head {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px;
        background: linear-gradient(135deg, #0b1d38, #102f63);
      }

      .azury-order-alarm-icon {
        display: grid;
        place-items: center;
        width: 54px;
        height: 54px;
        flex: 0 0 54px;
        border-radius: 50%;
        background: #f6c453;
        color: #071426;
        font-size: 28px;
      }

      .azury-order-alarm-copy {
        min-width: 0;
        flex: 1;
      }

      .azury-order-alarm-copy strong {
        display: block;
        margin-bottom: 5px;
        font-size: 18px;
      }

      .azury-order-alarm-copy span {
        display: block;
        color: #dbeafe;
        font-size: 13px;
        line-height: 1.4;
      }

      .azury-order-alarm-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 14px 18px 18px;
      }

      .azury-order-alarm-actions .btn {
        width: 100%;
      }

      @keyframes azury-order-pulse {
        from {
          transform: scale(1);
        }

        to {
          transform: scale(1.012);
        }
      }

      @media (max-width: 620px) {
        .azury-order-alarm {
          top: 10px;
          right: 10px;
          width: calc(100vw - 20px);
        }

        .azury-order-alarm-actions {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureOrderSoundButton() {
    if (document.getElementById("orderSoundButton")) {
      return;
    }

    const refreshButton = el.globalRefreshButton;

    if (!refreshButton?.parentElement) {
      return;
    }

    const button = document.createElement("button");

    button.id = "orderSoundButton";

    button.className = "btn btn-secondary";

    button.type = "button";

    button.dataset.orderSoundToggle = "true";

    button.textContent = "🔔 Ativar som";

    refreshButton.parentElement.insertBefore(button, refreshButton);
  }

  function updateOrderSoundButton() {
    const button = document.getElementById("orderSoundButton");

    if (!button) {
      return;
    }

    button.textContent = state.soundEnabled ? "🔔 Som ativo" : "🔔 Ativar som";

    button.title = state.soundEnabled
      ? "Clique para desativar o som neste dispositivo"
      : "Clique para manter o som ativo neste dispositivo";

    button.setAttribute("aria-pressed", String(state.soundEnabled));
  }

  function playOrderAlarmPattern() {
    const context = state.audioContext;

    if (!state.soundEnabled || !context || context.state !== "running") {
      return;
    }

    const start = context.currentTime;

    const tones = [
      {
        offset: 0,
        frequency: 880,
        duration: 0.16,
      },

      {
        offset: 0.23,
        frequency: 1175,
        duration: 0.19,
      },

      {
        offset: 0.5,
        frequency: 880,
        duration: 0.16,
      },
    ];

    tones.forEach((tone) => {
      const oscillator = context.createOscillator();

      const gain = context.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(tone.frequency, start + tone.offset);

      gain.gain.setValueAtTime(0.0001, start + tone.offset);

      gain.gain.exponentialRampToValueAtTime(0.22, start + tone.offset + 0.025);

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + tone.offset + tone.duration,
      );

      oscillator.connect(gain);

      gain.connect(context.destination);

      oscillator.start(start + tone.offset);

      oscillator.stop(start + tone.offset + tone.duration + 0.03);
    });
  }

  function getAudioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  async function ensureOrderAudioReady({ playTest = false } = {}) {
    const AudioContextClass = getAudioContextClass();

    if (!AudioContextClass) {
      throw new Error(
        "Este navegador não oferece suporte ao som de novos pedidos.",
      );
    }

    if (!state.audioContext) {
      state.audioContext = new AudioContextClass();
    }

    if (state.audioContext.state !== "running") {
      await state.audioContext.resume();
    }

    if (state.audioContext.state !== "running") {
      throw new Error(
        "O navegador ainda não liberou o áudio neste acesso ao painel.",
      );
    }

    if (playTest) {
      playOrderAlarmPattern();
    }

    return true;
  }

  async function activateOrderSound({ silent = false } = {}) {
    state.soundPreference = true;
    state.soundEnabled = true;
    writeAdminBooleanPreference(ADMIN_SOUND_PREFERENCE_KEY, true);
    updateOrderSoundButton();

    try {
      await ensureOrderAudioReady({ playTest: !silent });
    } catch (error) {
      if (!silent) {
        throw error;
      }

      console.info(
        "O som permanece habilitado e será liberado na primeira interação permitida pelo navegador.",
      );
    }

    if (!silent) {
      showMessage(
        "Som de novos pedidos ativado neste dispositivo e mantido para os próximos acessos.",
      );
    }
  }

  async function deactivateOrderSound() {
    state.soundPreference = false;
    state.soundEnabled = false;
    writeAdminBooleanPreference(ADMIN_SOUND_PREFERENCE_KEY, false);
    stopOrderAlarm();

    if (state.audioContext?.state === "running") {
      try {
        await state.audioContext.suspend();
      } catch (error) {
        console.warn("Não foi possível suspender o áudio do painel.", error);
      }
    }

    updateOrderSoundButton();
    showMessage("Som de novos pedidos desativado neste dispositivo.");
  }

  async function toggleOrderSound() {
    if (state.soundEnabled) {
      await deactivateOrderSound();
      return;
    }

    await activateOrderSound();
  }

  async function restoreOrderSoundPreference() {
    if (state.soundPreference !== true) {
      state.soundEnabled = false;
      updateOrderSoundButton();
      return;
    }

    state.soundEnabled = true;
    updateOrderSoundButton();
    await activateOrderSound({ silent: true });
  }

  function resumePreferredOrderSoundAfterInteraction() {
    if (state.soundPreference !== true || !state.soundEnabled) {
      return;
    }

    ensureOrderAudioReady().catch((error) => {
      console.info(
        "O navegador ainda não liberou o áudio automático do painel.",
        error,
      );
    });
  }

  function stopOrderAlarm() {
    if (state.alarmTimer) {
      clearInterval(state.alarmTimer);

      state.alarmTimer = null;
    }

    document.getElementById("azuryOrderAlarm")?.remove();

    state.activeAlarmOrderId = null;

    state.activeAlarmCode = null;
  }

  function showNewOrderAlarm(order) {
    const orderId = order?.id || null;

    const code = order?.codigo || orderId || "Novo pedido";

    state.activeAlarmOrderId = orderId;

    state.activeAlarmCode = code;

    injectOrderAlarmStyles();

    document.getElementById("azuryOrderAlarm")?.remove();

    const alert = document.createElement("section");

    alert.id = "azuryOrderAlarm";

    alert.className = "azury-order-alarm";

    alert.setAttribute("role", "alert");

    alert.innerHTML = `
      <div class="azury-order-alarm-head">

        <div class="azury-order-alarm-icon">
          🔔
        </div>

        <div class="azury-order-alarm-copy">

          <strong>
            NOVO PEDIDO
            ${escapeHtml(code)}
          </strong>

          <span>
            Um novo pedido chegou na Azury.
          </span>

          ${
            !state.soundEnabled
              ? `
                <span>
                  Clique em “Ativar som” para liberar o alarme sonoro.
                </span>
              `
              : ""
          }

        </div>

      </div>

      <div class="azury-order-alarm-actions">

        <button
          class="btn btn-primary"
          type="button"
          data-order-alarm-view
        >
          Ver pedido
        </button>

        <button
          class="btn btn-secondary"
          type="button"
          data-order-alarm-silence
        >
          Silenciar
        </button>

      </div>
    `;

    document.body.appendChild(alert);

    if (state.alarmTimer) {
      clearInterval(state.alarmTimer);

      state.alarmTimer = null;
    }

    if (state.soundEnabled) {
      playOrderAlarmPattern();

      state.alarmTimer = setInterval(playOrderAlarmPattern, 2200);
    }

    showMessage(`Novo pedido ${code} recebido.`, "success");
  }

  async function handleRealtimeOrderInsert(payload) {
    const order = payload?.new || {};

    const isManualOrder = order?.dados_originais?.registro_manual === true;

    try {
      await refreshOrders();
    } catch (error) {
      console.error(
        "Não foi possível atualizar os pedidos após o evento em tempo real.",
        error,
      );
    }

    if (isManualOrder) {
      return;
    }

    showNewOrderAlarm(order);
  }

  function stopRealtimeOrders() {
    if (!state.realtimeChannel) {
      return;
    }

    try {
      supabase.removeChannel(state.realtimeChannel);
    } catch (error) {
      console.warn(
        "Não foi possível encerrar o canal de pedidos em tempo real.",
        error,
      );
    }

    state.realtimeChannel = null;
  }

  function startRealtimeOrders() {
    stopRealtimeOrders();

    state.realtimeChannel = supabase
      .channel(`azury-admin-pedidos-${Date.now()}`)
      .on(
        "postgres_changes",

        {
          event: "INSERT",

          schema: "public",

          table: "pedidos",
        },

        (payload) => {
          handleRealtimeOrderInsert(payload).catch((error) => {
            console.error(
              "Erro ao processar novo pedido em tempo real.",
              error,
            );
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("Pedidos em tempo real ativados.");
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            "O canal de pedidos em tempo real não está disponível.",
            status,
          );
        }
      });
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);

    return Uint8Array.from(
      [...rawData].map((character) => character.charCodeAt(0)),
    );
  }

  function ensurePushNotificationButton() {
    if (document.getElementById("pushNotificationButton")) {
      return;
    }

    const soundButton = document.getElementById("orderSoundButton");

    const referenceButton = soundButton || el.globalRefreshButton;

    if (!referenceButton?.parentElement) {
      return;
    }

    const button = document.createElement("button");

    button.id = "pushNotificationButton";

    button.className = "btn btn-secondary";

    button.type = "button";

    button.dataset.pushNotificationToggle = "true";

    button.textContent = "📲 Ativar notificações";

    referenceButton.parentElement.insertBefore(button, referenceButton);
  }

  function updatePushNotificationButton() {
    const button = document.getElementById("pushNotificationButton");

    if (!button) {
      return;
    }

    const permission =
      "Notification" in window ? Notification.permission : "unsupported";

    if (!state.pushSupported) {
      button.textContent = "📲 Push indisponível";

      button.disabled = true;

      return;
    }

    if (permission === "denied") {
      button.textContent = "📲 Notificações bloqueadas";

      button.disabled = false;

      return;
    }

    button.textContent = state.pushEnabled
      ? "📲 Notificações ativas"
      : "📲 Ativar notificações";

    button.title = state.pushEnabled
      ? "Clique para desativar as notificações neste dispositivo"
      : "Clique para manter as notificações ativas neste dispositivo";

    button.disabled = false;

    button.setAttribute("aria-pressed", String(state.pushEnabled));
  }

  async function getAdminServiceWorkerRegistration() {
    if (!("serviceWorker" in navigator)) {
      throw new Error(
        "Este navegador não oferece suporte a notificações com o painel fechado.",
      );
    }

    const registration = await navigator.serviceWorker.ready;

    if (!registration) {
      throw new Error(
        "O aplicativo ainda não terminou de preparar as notificações.",
      );
    }

    return registration;
  }

  async function savePushSubscription(subscription) {
    const subscriptionJson = subscription.toJSON();

    await rpc("salvar_push_admin", {
      p_subscription: subscriptionJson,

      p_user_agent: navigator.userAgent || null,
    });

    state.pushSubscription = subscription;

    state.pushEnabled = true;

    updatePushNotificationButton();
  }

  async function getOrCreatePushSubscription({ allowCreate = true } = {}) {
    const registration = await getAdminServiceWorkerRegistration();
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription && allowCreate) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    return subscription;
  }

  async function syncExistingPushSubscription() {
    state.pushSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    updatePushNotificationButton();

    if (!state.pushSupported || Notification.permission !== "granted") {
      state.pushEnabled = false;
      updatePushNotificationButton();
      return;
    }

    const registration = await getAdminServiceWorkerRegistration();
    let subscription = await registration.pushManager.getSubscription();

    if (state.pushPreference === false) {
      if (subscription) {
        try {
          await subscription.unsubscribe();
        } catch (error) {
          console.warn("Não foi possível remover a inscrição push local.", error);
        }
      }

      state.pushSubscription = null;
      state.pushEnabled = false;
      updatePushNotificationButton();
      return;
    }

    if (!subscription && state.pushPreference === true) {
      try {
        subscription = await getOrCreatePushSubscription({ allowCreate: true });
      } catch (error) {
        console.info(
          "A preferência de notificações continua ativa; o navegador ainda não recriou a inscrição push.",
          error,
        );
      }
    }

    if (!subscription) {
      state.pushEnabled = false;
      updatePushNotificationButton();
      return;
    }

    if (state.pushPreference === null) {
      state.pushPreference = true;
      writeAdminBooleanPreference(ADMIN_PUSH_PREFERENCE_KEY, true);
    }

    await savePushSubscription(subscription);
  }

  async function activatePushNotifications({ silent = false } = {}) {
    state.pushSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    if (!state.pushSupported) {
      updatePushNotificationButton();
      throw new Error(
        "Este navegador não oferece suporte às notificações push.",
      );
    }

    let permission = Notification.permission;

    if (permission === "default") {
      if (silent) {
        state.pushEnabled = false;
        updatePushNotificationButton();
        return false;
      }

      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      state.pushEnabled = false;
      updatePushNotificationButton();

      if (!silent) {
        throw new Error(
          "As notificações não foram autorizadas neste dispositivo.",
        );
      }

      return false;
    }

    const subscription = await getOrCreatePushSubscription({ allowCreate: true });

    if (!subscription) {
      state.pushEnabled = false;
      updatePushNotificationButton();
      return false;
    }

    await savePushSubscription(subscription);
    state.pushPreference = true;
    writeAdminBooleanPreference(ADMIN_PUSH_PREFERENCE_KEY, true);

    if (!silent) {
      showMessage(
        "Notificações de novos pedidos ativadas neste dispositivo e mantidas para os próximos acessos.",
      );
    }

    return true;
  }

  async function deactivatePushNotifications() {
    state.pushPreference = false;
    writeAdminBooleanPreference(ADMIN_PUSH_PREFERENCE_KEY, false);

    if (state.pushSupported) {
      try {
        const registration = await getAdminServiceWorkerRegistration();
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
        }
      } catch (error) {
        console.warn("Não foi possível remover a inscrição push local.", error);
      }
    }

    state.pushSubscription = null;
    state.pushEnabled = false;
    updatePushNotificationButton();
    showMessage("Notificações desativadas neste dispositivo.");
  }

  async function togglePushNotifications() {
    if (state.pushEnabled) {
      await deactivatePushNotifications();
      return;
    }

    await activatePushNotifications();
  }

  async function restorePreferredPushAfterInteraction() {
    if (state.pushPreference !== true || state.pushEnabled) {
      return;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    try {
      await activatePushNotifications({ silent: true });
    } catch (error) {
      console.info("Não foi possível restaurar a inscrição push automaticamente.", error);
    }
  }

  function handleServiceWorkerMessage(event) {
    if (event.data?.type !== "AZURY_OPEN_ORDER") {
      return;
    }

    navigate("pedidos").catch((error) => {
      console.error("Não foi possível abrir o pedido da notificação.", error);
    });
  }

  function ensureManualOrderButton() {
    if (document.getElementById("newManualOrderButton")) {
      return;
    }

    const refreshButton = el.refreshOrdersButton;

    if (!refreshButton?.parentElement) {
      return;
    }

    const button = document.createElement("button");

    button.id = "newManualOrderButton";

    button.className = "btn btn-primary";

    button.type = "button";

    button.dataset.newManualOrder = "true";

    button.textContent = "+ Registrar pedido do WhatsApp";

    refreshButton.parentElement.insertBefore(button, refreshButton);
  }

  const WHATSAPP_STATUS_MESSAGES = Object.freeze({
    confirmado: (order) => {
      const code = order.codigo || order.id || "";

      const name = firstDefined(
        order,

        ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],

        "cliente",
      );

      return `Olá, ${name}! Seu pedido ${code} foi confirmado pela ${
        order.estabelecimento === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury"
      }. Em breve iniciaremos o preparo.`;
    },

    em_preparo: (order) => {
      const code = order.codigo || order.id || "";

      const name = firstDefined(
        order,

        ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],

        "cliente",
      );

      return `Olá, ${name}! Seu pedido ${code} já está em preparo na ${
        order.estabelecimento === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury"
      }. Estamos preparando tudo com carinho para você.`;
    },

    pronto: (order) => {
      const code = order.codigo || order.id || "";

      const name = firstDefined(
        order,

        ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],

        "cliente",
      );

      return `Olá, ${name}! Seu pedido ${code} da ${
        order.estabelecimento === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury"
      } está pronto e aguardando a saída para entrega.`;
    },

    saiu_para_entrega: (order) => {
      const code = order.codigo || order.id || "";

      const name = firstDefined(
        order,

        ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],

        "cliente",
      );

      return `Olá, ${name}! Seu pedido ${code} da ${
        order.estabelecimento === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury"
      } saiu para entrega e já está a caminho.`;
    },

    entregue: (order) => {
      const code = order.codigo || order.id || "";

      const name = firstDefined(
        order,

        ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],

        "cliente",
      );

      return `Olá, ${name}! O pedido ${code} foi marcado como entregue. Obrigado por escolher a ${
        order.estabelecimento === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury"
      }!`;
    },
  });

  function normalizeWhatsAppPhone(value) {
    let digits = String(value || "").replace(/\D/g, "");

    if (!digits) {
      return "";
    }

    if (
      (digits.length === 10 || digits.length === 11) &&
      !digits.startsWith("55")
    ) {
      digits = `55${digits}`;
    }

    return digits;
  }

  function canNotifyOrderOnWhatsApp(order) {
    if (!order || !WHATSAPP_STATUS_MESSAGES[order.status]) {
      return false;
    }

    const phone = firstDefined(
      order,

      ["telefone_do_cliente", "cliente_telefone", "telefone"],

      "",
    );

    return normalizeWhatsAppPhone(phone).length >= 12;
  }

  function openOrderWhatsApp(order) {
    if (!order) {
      throw new Error("Pedido não encontrado no painel.");
    }

    const phone = firstDefined(
      order,

      ["telefone_do_cliente", "cliente_telefone", "telefone"],

      "",
    );

    const normalizedPhone = normalizeWhatsAppPhone(phone);

    if (normalizedPhone.length < 12) {
      throw new Error("Este pedido não possui um WhatsApp válido.");
    }

    const messageBuilder = WHATSAPP_STATUS_MESSAGES[order.status];

    if (!messageBuilder) {
      throw new Error(
        "Não há mensagem de WhatsApp disponível para o status atual deste pedido.",
      );
    }

    const message = messageBuilder(order);

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      message,
    )}`;

    const opened = window.open(url, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = url;
    }
  }

  function scheduleWhatsAppStatusPrompt(orderId, status) {
    window.setTimeout(
      () => {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        if (
          !order ||
          order.status !== status ||
          !canNotifyOrderOnWhatsApp(order)
        ) {
          return;
        }

        const code = order.codigo || order.id || "";

        const customerName = firstDefined(
          order,

          [
            "cliente_nome",
            "nome_do_cliente",
            "nome_cliente",
            "cliente",
            "nome",
          ],

          "cliente",
        );

        openModal({
          title: "Avisar cliente no WhatsApp?",

          message: `Pedido ${code} atualizado para “${statusLabel(
            status,
          )}”. Deseja abrir o WhatsApp de ${customerName} com a mensagem pronta?`,

          messageType: "success",

          fields: [],

          submitText: "Abrir WhatsApp",

          submitClass: "btn-success",

          onSubmit: async () => {
            openOrderWhatsApp(order);
          },
        });
      },

      0,
    );
  }

  function findOrderTracking(orderId) {
    return (
      state.rastreamentos.find(
        (tracking) => String(tracking.pedido_id) === String(orderId),
      ) || null
    );
  }

  function buildTrackingUrl(page, token) {
    if (!token) {
      return "";
    }

    const url = new URL(page, `${window.location.origin}/`);

    url.searchParams.set("token", String(token));

    return url.toString();
  }

  function getCourierTrackingUrl(tracking) {
    return buildTrackingUrl("entregador.html", tracking?.token_entregador);
  }

  function getCustomerTrackingUrl(tracking) {
    return buildTrackingUrl("rastreamento.html", tracking?.token_cliente);
  }

  function openCourierTracking(tracking) {
    if (!tracking || tracking.ativo !== true || !tracking.token_entregador) {
      throw new Error(
        "Este pedido não possui rastreamento ativo para o entregador.",
      );
    }

    const url = getCourierTrackingUrl(tracking);

    const opened = window.open(url, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = url;
    }
  }

  function openCustomerTrackingWhatsApp(order, tracking) {
    if (!order) {
      throw new Error("Pedido não encontrado no painel.");
    }

    if (!tracking || tracking.ativo !== true || !tracking.token_cliente) {
      throw new Error(
        "Este pedido não possui rastreamento ativo para o cliente.",
      );
    }

    const phone = firstDefined(
      order,

      ["telefone_do_cliente", "cliente_telefone", "telefone"],

      "",
    );

    const normalizedPhone = normalizeWhatsAppPhone(phone);

    if (normalizedPhone.length < 12) {
      throw new Error("Este pedido não possui um WhatsApp válido.");
    }

    const code = order.codigo || order.id || "";

    const customerName = firstDefined(
      order,

      ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],

      "cliente",
    );

    const trackingUrl = getCustomerTrackingUrl(tracking);

    const message = `Olá, ${customerName}! Você pode acompanhar a entrega do pedido ${code} da ${
      order.estabelecimento === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury"
    } em tempo real por este link:\n${trackingUrl}`;

    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      message,
    )}`;

    const opened = window.open(url, "_blank", "noopener,noreferrer");

    if (!opened) {
      window.location.href = url;
    }
  }

  async function activateOrderTracking(orderId) {
    const result = await rpc("ativar_rastreamento_admin", {
      p_pedido_id: orderId,
    });

    await refreshOrders();

    return result;
  }

  async function endOrderTracking(orderId) {
    const result = await rpc("encerrar_rastreamento_admin", {
      p_pedido_id: orderId,
    });

    await refreshOrders();

    return result;
  }

  async function endOrderTrackingIfActive(orderId) {
    const tracking = findOrderTracking(orderId);

    if (!tracking || tracking.ativo !== true) {
      return true;
    }

    try {
      await endOrderTracking(orderId);

      return true;
    } catch (error) {
      console.warn(
        "O pedido foi finalizado, mas não foi possível encerrar o rastreamento automaticamente.",
        error,
      );

      return false;
    }
  }

  function printPaymentLabel(value) {
    const key = String(value || "")
      .trim()
      .toLowerCase();

    const labels = {
      pix: "Pix",

      dinheiro: "Dinheiro",

      cartao_debito: "Cartão de débito",

      cartao_credito: "Cartão de crédito",
    };

    return labels[key] || String(value || "Não informada");
  }

  function printableOrderItemsHtml(order) {
    const items = Array.isArray(order.itens) ? order.itens : [];

    if (!items.length) {
      return `
        <p class="print-empty">
          Itens não informados.
        </p>
      `;
    }

    const originalItems = Array.isArray(order?.dados_originais?.itens)
      ? order.dados_originais.itens
      : [];

    return items
      .map((item, index) => {
        const originalItem = originalItems[index] || null;

        const merged = {
          ...(originalItem || {}),

          ...(item || {}),
        };

        const name = azuryProductDisplayName(item, originalItem, index);

        const size = Number(
          firstDefined(
            merged,

            ["tamanho_ml", "tamanho"],

            0,
          ),
        );

        const productType = String(
          firstDefined(
            merged,

            ["produto_tipo"],

            "",
          ),
        ).toLowerCase();

        const productKey = firstDefined(
          merged,

          ["produto_chave"],

          "",
        );

        const boxMode =
          productType === "azury_box" || isAzuryBoxKey(productKey);

        const quantity = firstDefined(
          item,

          ["quantidade"],

          1,
        );

        const itemNote = firstDefined(
          item,

          ["observacoes", "observacao"],

          "",
        );

        const complements = Array.isArray(item.complementos)
          ? item.complementos
          : Array.isArray(originalItem?.complementos)
            ? originalItem.complementos
            : [];

        const layers = {
          meio: [],

          cobertura: [],

          outros: [],
        };

        complements.forEach((complement) => {
          const complementName =
            typeof complement === "string"
              ? complement
              : firstDefined(
                  complement,

                  ["nome", "complemento_nome", "nome_complemento"],

                  "Complemento",
                );

          const layer =
            typeof complement === "object" && complement !== null
              ? normalizeKey(
                  firstDefined(
                    complement,

                    ["camada", "tipo_camada", "layer", "posicao"],

                    boxMode ? "unica" : "",
                  ),
                )
              : "";

          if (boxMode || layer === "unica") {
            layers.outros.push(complementName);
          } else if (layer.includes("meio")) {
            layers.meio.push(complementName);
          } else if (layer.includes("cobertura") || layer.includes("topo")) {
            layers.cobertura.push(complementName);
          } else {
            layers.outros.push(complementName);
          }
        });

        const complementsHtml = boxMode
          ? `
                <p>

                  <strong>
                    COMPLEMENTOS:
                  </strong>

                  ${escapeHtml(
                    Array.from(
                      new Set([
                        ...layers.outros,
                        ...layers.meio,
                        ...layers.cobertura,
                      ]),
                    ).join(", ") || "Nenhum",
                  )}

                </p>
              `
          : [
              layers.meio.length
                ? `
                      <p>

                        <strong>
                          MEIO:
                        </strong>

                        ${escapeHtml(
                          Array.from(new Set(layers.meio)).join(", "),
                        )}

                      </p>
                    `
                : "",

              layers.cobertura.length
                ? `
                      <p>

                        <strong>
                          COBERTURA:
                        </strong>

                        ${escapeHtml(
                          Array.from(new Set(layers.cobertura)).join(", "),
                        )}

                      </p>
                    `
                : "",

              layers.outros.length
                ? `
                      <p>

                        <strong>
                          COMPLEMENTOS:
                        </strong>

                        ${escapeHtml(
                          Array.from(new Set(layers.outros)).join(", "),
                        )}

                      </p>
                    `
                : "",
            ].join("");

        return `
            <section class="print-item">

              <div class="print-item-title">
                ${escapeHtml(quantity)}x
                ${escapeHtml(name)}
              </div>

              ${
                !boxMode && Number.isFinite(size) && size > 0
                  ? `
                    <p>

                      <strong>
                        Tamanho:
                      </strong>

                      ${escapeHtml(size)}
                      ml

                    </p>
                  `
                  : ""
              }

              ${complementsHtml}

              ${
                itemNote
                  ? `
                    <p>

                      <strong>
                        Obs. do item:
                      </strong>

                      ${escapeHtml(itemNote)}

                    </p>
                  `
                  : ""
              }

            </section>
          `;
      })
      .join("");
  }

  function printableOrderAddressHtml(order) {
    const street = firstDefined(
      order,

      ["rua", "logradouro", "endereco_rua"],

      "",
    );

    const number = firstDefined(
      order,

      ["numero", "endereco_numero"],

      "",
    );

    const district = firstDefined(
      order,

      ["bairro", "bairro_nome", "nome_bairro", "bairro_entrega_nome"],

      "",
    );

    const zip = firstDefined(
      order,

      ["cep"],

      "",
    );

    const complement = firstDefined(
      order,

      ["complemento_endereco", "endereco_complemento", "complemento"],

      "",
    );

    const hasAddress = street || number || district || zip || complement;

    if (!hasAddress) {
      return "";
    }

    const firstLine = [street, number ? `nº ${number}` : ""]
      .filter(Boolean)
      .join(", ");

    return `
      <section class="print-section">

        <h2>
          ENTREGA
        </h2>

        ${firstLine ? `<p>${escapeHtml(firstLine)}</p>` : ""}

        ${district ? `<p>${escapeHtml(district)}</p>` : ""}

        ${zip ? `<p>CEP ${escapeHtml(zip)}</p>` : ""}

        ${
          complement
            ? `
              <p>

                <strong>
                  Complemento:
                </strong>

                ${escapeHtml(complement)}

              </p>
            `
            : ""
        }

      </section>
    `;
  }

  function printOrder(order) {
    if (!order) {
      throw new Error("Pedido não encontrado no painel.");
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");

    if (!printWindow) {
      throw new Error(
        "O navegador bloqueou a janela de impressão. Libere pop-ups para o painel da Azury.",
      );
    }

    const code = order.codigo || order.id || "Pedido";

    const customerName = firstDefined(
      order,

      ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],

      "Cliente não informado",
    );

    const payment = firstDefined(
      order,

      ["forma_pagamento"],

      "Não informada",
    );

    const changeFor = firstDefined(
      order,

      ["troco_para"],

      "",
    );

    const subtotal = toNumber(
      firstDefined(
        order,

        ["subtotal", "valor_produtos"],

        0,
      ),
    );

    const fee = toNumber(
      firstDefined(
        order,

        ["taxa_entrega", "taxa"],

        0,
      ),
    );

    const discount = toNumber(
      firstDefined(
        order,

        ["desconto"],

        0,
      ),
    );

    const total = toNumber(
      firstDefined(
        order,

        ["valor_total", "total"],

        0,
      ),
    );

    const note = firstDefined(
      order,

      ["observacoes", "observacao"],

      "",
    );

    const createdAt = firstDefined(
      order,

      ["criado_em", "created_at"],

      "",
    );

    const isPhOrder = order.estabelecimento === "ph_sabor_cia";

    const printBrand = isPhOrder ? "PH SABOR & CIA" : "AZURY";

    const printFooter = isPhOrder
      ? "PH SABOR & CIA"
      : "AZURY • azurydelivery.com.br";

    const html = `<!doctype html>
<html lang="pt-BR">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>
  Comanda ${escapeHtml(code)}
</title>

<style>

@page {
  size: 80mm auto;
  margin: 4mm;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #000000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  line-height: 1.35;
}

body {
  width: 72mm;
  margin: 0 auto;
}

h1,
h2,
p {
  margin: 0;
}

.print-header {
  text-align: center;
  padding-bottom: 3mm;
  border-bottom: 1.5px dashed #000000;
}

.print-brand {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.print-type {
  margin-top: 1mm;
  font-size: 11px;
  font-weight: 700;
}

.print-order-code {
  margin-top: 2.5mm;
  font-size: 25px;
  font-weight: 900;
}

.print-date {
  margin-top: 1mm;
  font-size: 11px;
}

.print-section {
  padding: 3mm 0;
  border-bottom: 1.5px dashed #000000;
}

.print-section h2 {
  margin-bottom: 1.5mm;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.print-section p + p {
  margin-top: 0.8mm;
}

.print-item {
  padding: 2.5mm 0;
  border-bottom: 1px dotted #000000;
  page-break-inside: avoid;
}

.print-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.print-item-title {
  margin-bottom: 1.3mm;
  font-size: 14px;
  font-weight: 900;
}

.print-item p + p {
  margin-top: 0.8mm;
}

.print-total-row {
  display: flex;
  justify-content: space-between;
  gap: 4mm;
  margin-top: 1mm;
}

.print-total-row.grand-total {
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 1.5px solid #000000;
  font-size: 17px;
  font-weight: 900;
}

.print-observation {
  font-size: 13px;
  font-weight: 700;
  white-space: pre-wrap;
}

.print-empty {
  padding: 2mm 0;
}

.print-footer {
  padding-top: 3mm;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
}

@media screen {
  body {
    padding: 4mm 0;
  }
}

</style>

</head>

<body>

<header class="print-header">

  <div class="print-brand">
    ${escapeHtml(printBrand)}
  </div>

  <div class="print-type">
    COMANDA DE COZINHA
  </div>

  <div class="print-order-code">
    ${escapeHtml(code)}
  </div>

  <div class="print-date">
    ${escapeHtml(formatDate(createdAt))}
  </div>

</header>

<section class="print-section">

  <h2>
    CLIENTE
  </h2>

  <p>
    <strong>
      ${escapeHtml(customerName)}
    </strong>
  </p>

</section>

<section class="print-section">

  <h2>
    ITENS DO PEDIDO
  </h2>

  ${printableOrderItemsHtml(order)}

</section>

${
  note
    ? `
      <section class="print-section">

        <h2>
          OBSERVAÇÕES
        </h2>

        <p class="print-observation">
          ${escapeHtml(note)}
        </p>

      </section>
    `
    : ""
}

<section class="print-section">

  <h2>
    PAGAMENTO
  </h2>

  <p>

    <strong>
      Forma:
    </strong>

    ${escapeHtml(printPaymentLabel(payment))}

  </p>

  ${
    changeFor !== "" && changeFor !== null
      ? `
        <p>

          <strong>
            Troco para:
          </strong>

          ${formatMoney(changeFor)}

        </p>
      `
      : ""
  }

</section>

${printableOrderAddressHtml(order)}

<section class="print-section">

  <h2>
    RESUMO
  </h2>

  <div class="print-total-row">

    <span>
      Produtos
    </span>

    <strong>
      ${formatMoney(subtotal)}
    </strong>

  </div>

  ${
    fee > 0
      ? `
        <div class="print-total-row">

          <span>
            Entrega
          </span>

          <strong>
            ${formatMoney(fee)}
          </strong>

        </div>
      `
      : ""
  }

  ${
    discount > 0
      ? `
        <div class="print-total-row">

          <span>
            Desconto
          </span>

          <strong>
            - ${formatMoney(discount)}
          </strong>

        </div>
      `
      : ""
  }

  <div class="print-total-row grand-total">

    <span>
      TOTAL
    </span>

    <strong>
      ${formatMoney(total)}
    </strong>

  </div>

</section>

<footer class="print-footer">
  ${escapeHtml(printFooter)}
</footer>

</body>

</html>`;

    printWindow.document.open();

    printWindow.document.write(html);

    printWindow.document.close();

    printWindow.focus();

    printWindow.addEventListener(
      "afterprint",

      () => {
        printWindow.close();
      },

      {
        once: true,
      },
    );

    printWindow.setTimeout(
      () => {
        printWindow.print();
      },

      200,
    );
  }

  const ORDERS_ESTABELECIMENTOS = Object.freeze({
    azury: {
      label: "Azury",
      empty: "Nenhum pedido da Azury encontrado.",
    },

    ph_sabor_cia: {
      label: "PH Sabor & Cia",
      empty: "Nenhum pedido da PH Sabor & Cia encontrado.",
    },
  });

  function ordersCompanyConfig(
    establishment = state.ordersEstabelecimento,
  ) {
    return (
      ORDERS_ESTABELECIMENTOS[establishment] ||
      ORDERS_ESTABELECIMENTOS.azury
    );
  }

  function setOrdersEstabelecimento(establishment) {
    if (!ORDERS_ESTABELECIMENTOS[establishment]) {
      throw new Error("Estabelecimento de pedidos inválido.");
    }

    state.ordersEstabelecimento = establishment;

    const isAzury = establishment === "azury";

    el.ordersAzuryButton?.classList.toggle("btn-primary", isAzury);
    el.ordersAzuryButton?.classList.toggle("btn-secondary", !isAzury);

    el.ordersPhButton?.classList.toggle("btn-primary", !isAzury);
    el.ordersPhButton?.classList.toggle("btn-secondary", isAzury);

    const section = document.getElementById("section-pedidos");

    if (section) {
      section.dataset.companyTheme = establishment;
    }
  }

  function orderEstablishmentKey(order) {
    return order?.estabelecimento === "ph_sabor_cia"
      ? "ph_sabor_cia"
      : "azury";
  }

  function renderOrders() {
    const adminLevel = String(state.admin?.nivel_acesso || "").toLowerCase();

    const canEditOrders = ["proprietario", "administrador"].includes(
      adminLevel,
    );

    const canDeleteOrders = adminLevel === "proprietario";

    setOrdersEstabelecimento(state.ordersEstabelecimento);

    const establishment = state.ordersEstabelecimento;
    const company = ordersCompanyConfig(establishment);

    const companyOrders = state.pedidos.filter(
      (order) => orderEstablishmentKey(order) === establishment,
    );

    const count = (status) =>
      companyOrders.filter((order) => order.status === status).length;

    const summary = {
      novos: count("recebido"),
      em_preparo: count("confirmado") + count("em_preparo"),
      prontos: count("pronto"),
      em_entrega: count("saiu_para_entrega"),
      entregues: count("entregue"),
    };

    el.ordersSummary.innerHTML = `
      <section class="orders-store-summary company-summary company-summary-${escapeHtml(establishment)}">

        <div class="orders-store-summary-title">

          <div>
            <span class="company-summary-kicker">PEDIDOS • ${escapeHtml(company.label)}</span>
            <strong>${escapeHtml(companyOrders.length)} pedidos registrados</strong>
          </div>

          <span class="company-summary-badge">
            ${escapeHtml(company.label)}
          </span>

        </div>

        <div class="metric-grid compact-metrics orders-company-metrics">
          ${[
            metricCard("🟡", summary.novos, "Novos"),
            metricCard("👨‍🍳", summary.em_preparo, "Em preparo"),
            metricCard("✅", summary.prontos, "Prontos"),
            metricCard("🛵", summary.em_entrega, "Em entrega"),
            metricCard("🏁", summary.entregues, "Entregues"),
          ].join("")}
        </div>

      </section>
    `;

    const filter = el.ordersStatusFilter.value;

    const orders = filter
      ? companyOrders.filter((order) => order.status === filter)
      : companyOrders;

    if (!orders.length) {
      setEmpty(el.ordersList, company.empty);
      return;
    }

    el.ordersList.innerHTML = orders
      .map((order) => {
        const next = NEXT_STATUS[order.status];
        const code = order.codigo || order.id;

        const customerName = firstDefined(
          order,
          [
            "cliente_nome",
            "nome_do_cliente",
            "nome_cliente",
            "cliente",
            "nome",
          ],
          "Cliente não informado",
        );

        const phone = firstDefined(
          order,
          ["telefone_do_cliente", "cliente_telefone", "telefone"],
          "Não informado",
        );

        const email = firstDefined(
          order,
          ["cliente_email", "email_cliente"],
          "Não informado",
        );

        const subtotal = firstDefined(order, ["subtotal", "valor_produtos"], 0);
        const fee = firstDefined(order, ["taxa_entrega", "taxa"], 0);
        const total = firstDefined(order, ["valor_total", "total"], 0);
        const payment = firstDefined(order, ["forma_pagamento"], "Não informada");
        const paymentStatus = firstDefined(order, ["status_pagamento"], "pendente");
        const note = firstDefined(order, ["observacoes", "observacao"], "");

        const establishmentKey = orderEstablishmentKey(order);
        const establishmentLabel = ordersCompanyConfig(establishmentKey).label;

        const tracking = findOrderTracking(order.id);
        const trackingActive = tracking?.ativo === true;
        const canStartTracking =
          !trackingActive && !["entregue", "cancelado"].includes(order.status);

        return `
            <article
              class="order-card order-company-${escapeHtml(establishmentKey)}"
              data-order-id="${escapeHtml(order.id)}"
            >

              <header class="order-head">

                <div class="order-head-main">

                  <span class="order-company-badge">
                    ${escapeHtml(establishmentLabel)}
                  </span>

                  <div>
                    <h3>Pedido ${escapeHtml(code)}</h3>
                    <p>${escapeHtml(formatDate(order.criado_em))}</p>
                  </div>

                </div>

                <span class="status-badge status-${escapeHtml(order.status)}">
                  ${escapeHtml(statusLabel(order.status))}
                </span>

              </header>

              <div class="order-metrics">

                <div class="order-metric">
                  <span>Cliente</span>
                  <strong>${escapeHtml(customerName)}</strong>
                </div>

                <div class="order-metric">
                  <span>Produtos</span>
                  <strong>${formatMoney(subtotal)}</strong>
                </div>

                <div class="order-metric">
                  <span>Entrega</span>
                  <strong>${formatMoney(fee)}</strong>
                </div>

                <div class="order-metric order-metric-total">
                  <span>Total</span>
                  <strong>${formatMoney(total)}</strong>
                </div>

                <div class="order-metric">
                  <span>Pagamento</span>
                  <strong>${escapeHtml(payment)} • ${escapeHtml(paymentStatus)}</strong>
                </div>

                <div class="order-metric">
                  <span>Rastreamento</span>
                  <strong>${trackingActive ? "Ativo" : "Desativado"}</strong>
                </div>

              </div>

              <div class="order-body">

                <div class="order-block">

                  <h4>Cliente e entrega</h4>

                  <p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>
                  <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>

                  ${addressHtml(order)}

                  ${
                    note
                      ? `<p><strong>Observação:</strong> ${escapeHtml(note)}</p>`
                      : ""
                  }

                </div>

                <div class="order-block">

                  <h4>Itens do pedido</h4>
                  ${orderItemsHtml(order)}

                </div>

              </div>

              <footer class="order-actions">

                ${
                  next
                    ? `<button class="btn ${next.className}" data-order-action="next" data-next-status="${next.status}" type="button">${escapeHtml(next.label)}</button>`
                    : ""
                }

                <button class="btn btn-secondary" data-order-action="print" type="button">
                  🖨️ Imprimir comanda
                </button>

                ${
                  trackingActive
                    ? `
                      <button class="btn btn-secondary" data-order-action="tracking-courier" type="button">🛵 Abrir entregador</button>
                      <button class="btn btn-success" data-order-action="tracking-customer" type="button">🔗 Enviar rastreamento</button>
                      <button class="btn btn-danger" data-order-action="tracking-end" type="button">⏹ Encerrar rastreamento</button>
                    `
                    : ""
                }

                ${
                  canStartTracking
                    ? `<button class="btn btn-secondary" data-order-action="tracking-start" type="button">📍 Ativar rastreamento</button>`
                    : ""
                }

                ${
                  canNotifyOrderOnWhatsApp(order)
                    ? `<button class="btn btn-success" data-order-action="whatsapp" type="button">💬 Avisar cliente</button>`
                    : ""
                }

                ${
                  canEditOrders
                    ? `<button class="btn btn-secondary" data-order-action="edit" type="button">Editar pedido</button>`
                    : ""
                }

                ${
                  canDeleteOrders
                    ? `<button class="btn btn-danger" data-order-action="delete" type="button">Excluir pedido</button>`
                    : ""
                }

                <div class="payment-control">

                  <select data-payment-select>
                    <option value="pendente" ${paymentStatus === "pendente" ? "selected" : ""}>Pagamento pendente</option>
                    <option value="pago" ${paymentStatus === "pago" ? "selected" : ""}>Pago</option>
                    <option value="cancelado" ${paymentStatus === "cancelado" ? "selected" : ""}>Cancelado</option>
                    <option value="estornado" ${paymentStatus === "estornado" ? "selected" : ""}>Estornado</option>
                  </select>

                  <button class="btn btn-secondary" data-order-action="payment" type="button">
                    Salvar pagamento
                  </button>

                </div>

              </footer>

            </article>
          `;
      })
      .join("");
  }

  async function refreshOrders() {
    setLoading(el.ordersList, "Atualizando pedidos...");

    try {
      const [data, trackingData] = await Promise.all([
        rpc("listar_pedidos_admin", {
          p_status: null,

          p_limite: 100,
        }),

        rpc("listar_rastreamentos_admin"),
      ]);

      state.pedidos = data.pedidos || [];

      state.resumoPedidos = data.resumo || {};

      state.rastreamentos = Array.isArray(trackingData) ? trackingData : [];

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

      p_observacao: observation || null,
    });

    await refreshOrders();
  }

  async function handleOrderAction(button) {
    const card = button.closest("[data-order-id]");

    const orderId = card?.dataset.orderId;

    if (!orderId) {
      return;
    }

    const action = button.dataset.orderAction;

    button.disabled = true;

    try {
      if (action === "tracking-start") {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        if (!order) {
          throw new Error("Pedido não encontrado no painel.");
        }

        const result = await activateOrderTracking(orderId);

        showMessage(
          result?.ativo === true
            ? `Rastreamento do pedido ${order.codigo || order.id} ativado.`
            : "Rastreamento ativado.",
        );

        return;
      }

      if (action === "tracking-courier") {
        const tracking = findOrderTracking(orderId);

        openCourierTracking(tracking);

        return;
      }

      if (action === "tracking-customer") {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        const tracking = findOrderTracking(orderId);

        openCustomerTrackingWhatsApp(order, tracking);

        return;
      }

      if (action === "tracking-end") {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        const code = order?.codigo || order?.id || "";

        openModal({
          title: "Encerrar rastreamento?",

          message: `Confirma o encerramento do rastreamento do pedido ${code}? A localização atual será apagada e os links deixarão de acompanhar novas posições.`,

          messageType: "warning",

          fields: [],

          submitText: "Encerrar rastreamento",

          submitClass: "btn-danger",

          onSubmit: async () => {
            const result = await endOrderTracking(orderId);

            showMessage(
              result?.mensagem || `Rastreamento do pedido ${code} encerrado.`,

              "warning",
            );
          },
        });

        return;
      }

      if (action === "print") {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        printOrder(order);

        return;
      }

      if (action === "whatsapp") {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        openOrderWhatsApp(order);

        return;
      }

      if (action === "next") {
        const status = button.dataset.nextStatus;

        const transition =
          NEXT_STATUS[
            card.querySelector("[data-order-action='next']")
              ? state.pedidos.find(
                  (order) => String(order.id) === String(orderId),
                )?.status
              : ""
          ];

        const applyStatus = async () => {
          await updateOrder(orderId, status, null, null);

          let trackingEnded = true;

          if (status === "entregue") {
            trackingEnded = await endOrderTrackingIfActive(orderId);
          }

          showMessage(
            trackingEnded
              ? `Pedido atualizado para “${statusLabel(status)}”.`
              : `Pedido atualizado para “${statusLabel(
                  status,
                )}”, mas o rastreamento não pôde ser encerrado automaticamente.`,

            trackingEnded ? "success" : "warning",
          );

          scheduleWhatsAppStatusPrompt(orderId, status);
        };

        if (transition?.confirmMessage) {
          openModal({
            title: transition.confirmTitle || "Confirmar alteração",

            message: transition.confirmMessage,

            messageType: status === "entregue" ? "success" : "warning",

            fields: [],

            submitText: transition.confirmText || "Confirmar",

            submitClass: status === "entregue" ? "btn-success" : "btn-primary",

            onSubmit: applyStatus,
          });
        } else {
          await applyStatus();
        }
      }

      if (action === "edit") {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        if (!order) {
          throw new Error("Pedido não encontrado no painel.");
        }

        const code = order.codigo || order.id || "";

        const customerName = firstDefined(
          order,

          [
            "cliente_nome",
            "nome_do_cliente",
            "nome_cliente",
            "cliente",
            "nome",
          ],

          "",
        );

        const phone = firstDefined(
          order,

          ["cliente_telefone", "telefone_do_cliente", "telefone"],

          "",
        );

        const email = firstDefined(
          order,

          ["cliente_email", "email_cliente"],

          "",
        );

        const zip = firstDefined(
          order,

          ["cep"],

          "",
        );

        const street = firstDefined(
          order,

          ["rua", "logradouro", "endereco_rua"],

          "",
        );

        const number = firstDefined(
          order,

          ["numero", "endereco_numero"],

          "",
        );

        const district = firstDefined(
          order,

          ["bairro", "bairro_nome", "nome_bairro", "bairro_entrega_nome"],

          "",
        );

        const addressComplement = firstDefined(
          order,

          ["complemento_endereco", "endereco_complemento", "complemento"],

          "",
        );

        const payment = firstDefined(
          order,

          ["forma_pagamento"],

          "pix",
        );

        const paymentStatus = firstDefined(
          order,

          ["status_pagamento"],

          "pendente",
        );

        const changeFor = firstDefined(
          order,

          ["troco_para"],

          "",
        );

        const fee = toNumber(
          firstDefined(
            order,

            ["taxa_entrega", "taxa"],

            0,
          ),
        );

        const discount = toNumber(
          firstDefined(
            order,

            ["desconto"],

            0,
          ),
        );

        const note = firstDefined(
          order,

          ["observacoes", "observacao"],

          "",
        );

        openModal({
          title: `Editar pedido ${code}`,

          fields: [
            {
              name: "cliente_nome",

              label: "Nome do cliente",

              value: customerName,

              required: true,
            },

            {
              name: "cliente_telefone",

              label: "Telefone / WhatsApp",

              type: "tel",

              value: phone,
            },

            {
              name: "cliente_email",

              label: "E-mail",

              type: "email",

              value: email,
            },

            {
              name: "forma_pagamento",

              label: "Forma de pagamento",

              type: "select",

              value: payment,

              options: [
                {
                  value: "pix",

                  label: "Pix",
                },

                {
                  value: "dinheiro",

                  label: "Dinheiro",
                },

                {
                  value: "cartao_debito",

                  label: "Cartão de débito",
                },

                {
                  value: "cartao_credito",

                  label: "Cartão de crédito",
                },
              ],

              required: true,
            },

            {
              name: "status_pagamento",

              label: "Status do pagamento",

              type: "select",

              value: paymentStatus,

              options: [
                {
                  value: "pendente",

                  label: "Pendente",
                },

                {
                  value: "pago",

                  label: "Pago",
                },

                {
                  value: "cancelado",

                  label: "Cancelado",
                },

                {
                  value: "estornado",

                  label: "Estornado",
                },
              ],

              required: true,
            },

            {
              name: "troco_para",

              label: "Troco para",

              type: "number",

              step: "0.01",

              value: changeFor,
            },

            {
              name: "cep",

              label: "CEP",

              value: zip,

              required: true,
            },

            {
              name: "rua",

              label: "Rua / Avenida",

              value: street,

              required: true,
            },

            {
              name: "numero",

              label: "Número",

              value: number,

              required: true,
            },

            {
              name: "bairro",

              label: "Bairro",

              value: district,

              required: true,
            },

            {
              name: "complemento_endereco",

              label: "Complemento do endereço",

              value: addressComplement,
            },

            {
              name: "taxa_entrega",

              label: "Taxa de entrega",

              type: "number",

              step: "0.01",

              value: fee,

              required: true,
            },

            {
              name: "desconto",

              label: "Desconto",

              type: "number",

              step: "0.01",

              value: discount,

              required: true,
            },

            {
              name: "observacoes",

              label: "Observações",

              type: "textarea",

              value: note,

              full: true,
            },
          ],

          submitText: "Salvar alterações",

          submitClass: "btn-primary",

          onSubmit: async (values) => {
            const result = await rpc(
              "editar_pedido_admin",

              {
                p_pedido_id: orderId,

                p_dados: {
                  cliente_nome: String(values.cliente_nome || "").trim(),

                  cliente_telefone:
                    String(values.cliente_telefone || "").trim() || null,

                  cliente_email:
                    String(values.cliente_email || "").trim() || null,

                  forma_pagamento: values.forma_pagamento,

                  status_pagamento: values.status_pagamento,

                  troco_para:
                    values.troco_para === "" ? null : values.troco_para,

                  cep: String(values.cep || "").trim(),

                  rua: String(values.rua || "").trim(),

                  numero: String(values.numero || "").trim(),

                  bairro: String(values.bairro || "").trim(),

                  complemento_endereco:
                    String(values.complemento_endereco || "").trim() || null,

                  taxa_entrega: values.taxa_entrega,

                  desconto: values.desconto,

                  observacoes: String(values.observacoes || "").trim() || null,
                },
              },
            );

            await refreshOrders();

            showMessage(
              result?.mensagem || `Pedido ${code} atualizado com sucesso.`,
            );
          },
        });
      }

      if (action === "delete") {
        const order = state.pedidos.find(
          (item) => String(item.id) === String(orderId),
        );

        const code = order?.codigo || order?.id || "";

        openModal({
          title: `Excluir pedido ${code}`,

          message:
            "Esta ação é definitiva. O pedido, os itens e os complementos serão apagados.",

          messageType: "warning",

          fields: [
            {
              name: "confirmacao",

              label: `Digite ${code} para confirmar`,

              required: true,

              full: true,
            },
          ],

          submitText: "Excluir definitivamente",

          submitClass: "btn-danger",

          onSubmit: async (values) => {
            const confirmation = String(values.confirmacao || "").trim();

            if (
              confirmation.toUpperCase() !== String(code).trim().toUpperCase()
            ) {
              throw new Error(`Digite exatamente ${code} para confirmar.`);
            }

            const result = await rpc(
              "excluir_pedido_admin",

              {
                p_pedido_id: orderId,

                p_confirmacao: confirmation,
              },
            );

            await refreshOrders();

            showMessage(
              result?.mensagem || `Pedido ${code} excluído definitivamente.`,

              "warning",
            );
          },
        });
      }

      if (action === "payment") {
        const select = card.querySelector("[data-payment-select]");

        await updateOrder(
          orderId,
          null,
          select.value,
          "Pagamento atualizado pelo painel",
        );

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

    const data = await rpc(
      "listar_clientes_admin",

      {
        p_busca: el.clientsSearch.value.trim() || null,

        p_ativo: activeValue === "" ? null : activeValue === "true",

        p_limite: 100,

        p_offset: 0,
      },
    );

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

      metricCard("🛡️", r.administradores ?? 0, "Administradores"),
    ].join("");

    if (!state.clientes.length) {
      setEmpty(el.clientsList, "Nenhum cliente encontrado.");

      return;
    }

    el.clientsList.innerHTML = state.clientes
      .map((client) => {
        const name = firstDefined(
          client,

          ["nome"],

          "Cliente",
        );

        const email = firstDefined(
          client,

          ["email_auth", "email"],

          "Não informado",
        );

        const active = client.ativo === true;

        return `
              <article
                class="data-card"
                data-client-id="${escapeHtml(client.id)}"
              >

                <div class="data-card-head">

                  <div>

                    <h3>
                      ${escapeHtml(name)}
                    </h3>

                    <p class="card-email">
                      ${escapeHtml(email)}
                    </p>

                  </div>

                  <span
                    class="small-badge ${active ? "active" : "inactive"}"
                  >
                    ${active ? "Ativo" : "Inativo"}
                  </span>

                </div>

                <div class="data-pairs">

                  <div class="data-pair">

                    <span>
                      Telefone
                    </span>

                    <strong>
                      ${escapeHtml(client.telefone || "Não informado")}
                    </strong>

                  </div>

                  <div class="data-pair">

                    <span>
                      Pedidos
                    </span>

                    <strong>
                      ${escapeHtml(client.quantidade_pedidos ?? 0)}
                    </strong>

                  </div>

                  <div class="data-pair">

                    <span>
                      Total entregue
                    </span>

                    <strong>
                      ${formatMoney(client.valor_total_entregue ?? 0)}
                    </strong>

                  </div>

                  <div class="data-pair">

                    <span>
                      Último login
                    </span>

                    <strong>
                      ${escapeHtml(formatDate(client.ultimo_login_em))}
                    </strong>

                  </div>

                </div>

                <div class="data-card-actions">

                  ${
                    client.e_administrador
                      ? `
                        <span class="small-badge active">
                          Conta administrativa
                        </span>
                      `
                      : `
                        <button
                          class="btn btn-secondary"
                          data-client-edit
                          type="button"
                        >
                          Editar cliente
                        </button>

                        <button
                          class="btn ${active ? "btn-danger" : "btn-success"}"
                          data-client-toggle="${active ? "false" : "true"}"
                          type="button"
                        >
                          ${active ? "Desativar conta" : "Ativar conta"}
                        </button>

                        <button
                          class="btn btn-danger"
                          data-client-delete
                          type="button"
                        >
                          Excluir conta definitivamente
                        </button>
                      `
                  }

                </div>

              </article>
            `;
      })
      .join("");
  }

  function openClientEditModal(button) {
    const card = button.closest("[data-client-id]");

    const clientId = card?.dataset.clientId;

    const client = state.clientes.find(
      (item) => String(item.id) === String(clientId),
    );

    if (!client) {
      showMessage("Cliente não encontrado.", "error");

      return;
    }

    if (client.e_administrador) {
      showMessage(
        "Contas administrativas devem ser alteradas pela área Equipe.",
        "warning",
      );

      return;
    }

    openModal({
      title: `Editar cliente • ${firstDefined(client, ["nome"], "Cliente")}`,

      fields: [
        {
          name: "nome",

          label: "Nome do cliente",

          value: firstDefined(client, ["nome"], ""),

          required: true,

          full: true,
        },

        {
          name: "telefone",

          label: "Telefone / WhatsApp",

          value: firstDefined(client, ["telefone"], ""),

          full: true,
        },
      ],

      submitText: "Salvar cliente",

      onSubmit: async (values) => {
        await rpc(
          "atualizar_cliente_admin",

          {
            p_cliente_id: client.id,

            p_nome: String(values.nome || "").trim(),

            p_telefone: String(values.telefone || "").trim() || null,
          },
        );

        await loadClients();

        showMessage("Dados do cliente atualizados.");
      },
    });
  }

  async function toggleClient(button) {
    const card = button.closest("[data-client-id]");

    const clientId = card?.dataset.clientId;

    const targetActive = button.dataset.clientToggle === "true";

    let observation = null;

    if (!targetActive) {
      observation = window.prompt("Informe o motivo da desativação:");

      if (!observation) {
        return;
      }
    }

    button.disabled = true;

    try {
      await rpc(
        "alterar_status_cliente_admin",

        {
          p_cliente_id: clientId,

          p_ativo: targetActive,

          p_observacao: observation,
        },
      );

      await loadClients();

      showMessage(targetActive ? "Conta ativada." : "Conta desativada.");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  }

  async function deleteClient(button) {
    const card = button.closest("[data-client-id]");

    const clientId = card?.dataset.clientId;

    if (!clientId) {
      showMessage("Não foi possível identificar a conta.", "error");

      return;
    }

    const client = state.clientes.find(
      (item) => String(item.id) === String(clientId),
    );

    if (!client) {
      showMessage("Cliente não encontrado.", "error");

      return;
    }

    if (client.e_administrador) {
      showMessage(
        "Contas administrativas não podem ser excluídas pela área de clientes.",
        "error",
      );

      return;
    }

    const email = String(
      firstDefined(
        client,

        ["email_auth", "email"],

        "",
      ) || "",
    ).trim();

    if (!email) {
      showMessage(
        "Esta conta não possui um e-mail válido para confirmação.",
        "error",
      );

      return;
    }

    openModal({
      title: "Excluir conta definitivamente",

      message: `Esta ação é definitiva. A conta ${email} será apagada do sistema. Depois da exclusão, este mesmo e-mail poderá ser usado novamente em um novo cadastro.`,

      messageType: "warning",

      fields: [
        {
          name: "confirmacao",

          label: `Digite ${email} para confirmar`,

          required: true,

          full: true,
        },
      ],

      submitText: "Excluir definitivamente",

      submitClass: "btn-danger",

      onSubmit: async (values) => {
        const confirmacao = String(values.confirmacao || "")
          .trim()
          .toLowerCase();

        if (confirmacao !== email.toLowerCase()) {
          throw new Error(`Digite exatamente ${email} para confirmar.`);
        }

        const { data, error } = await supabase.functions.invoke(
          "excluir-cliente-admin",

          {
            body: {
              cliente_id: clientId,
            },
          },
        );

        if (error) {
          let mensagem = error.message || "Não foi possível excluir a conta.";

          if (error.context && typeof error.context.json === "function") {
            try {
              const resposta = await error.context.json();

              mensagem = resposta?.mensagem || resposta?.message || mensagem;
            } catch (_) {}
          }

          throw new Error(mensagem);
        }

        if (!data || data.sucesso !== true) {
          throw new Error(
            data?.mensagem || "Não foi possível excluir a conta.",
          );
        }

        await loadClients();

        showMessage(
          data.mensagem || `Conta ${email} excluída definitivamente.`,
          "warning",
        );
      },
    });
  }

  const FINANCEIRO_ESTABELECIMENTOS = Object.freeze({
    azury: {
      label: "Azury",

      description: "Compras, despesas, investimentos e entradas da Azury.",
    },

    ph_sabor_cia: {
      label: "PH Sabor & Cia",

      description:
        "Compras, despesas, investimentos e entradas da PH Sabor & Cia.",
    },
  });

  const FINANCEIRO_TIPO_LABELS = Object.freeze({
    compra: "Compra",

    despesa: "Despesa",

    investimento: "Investimento",

    entrada_manual: "Entrada manual",

    ganho_automatico: "Ganho automático",
  });

  const FINANCEIRO_STATUS_LABELS = Object.freeze({
    pago: "Pago",

    pendente: "Pendente",
  });

  function localDateInputValue(date = new Date()) {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  let financeiroPeriodoInicializado = false;

  function ensureFinanceiroPeriod() {
    if (!el.financeiroDataInicio || !el.financeiroDataFim) {
      return;
    }

    if (!financeiroPeriodoInicializado) {
      el.financeiroDataInicio.value = "";
      el.financeiroDataFim.value = "";
      financeiroPeriodoInicializado = true;
      return;
    }

    const start = el.financeiroDataInicio.value || "";
    const end = el.financeiroDataFim.value || "";

    if (start && end && start > end) {
      throw new Error("A data inicial não pode ser maior que a data final.");
    }
  }

  function financeiroCompanyConfig(
    establishment = state.financeiroEstabelecimento,
  ) {
    return (
      FINANCEIRO_ESTABELECIMENTOS[establishment] ||
      FINANCEIRO_ESTABELECIMENTOS.azury
    );
  }

  function setFinanceiroEstabelecimento(establishment) {
    if (!FINANCEIRO_ESTABELECIMENTOS[establishment]) {
      throw new Error("Estabelecimento financeiro inválido.");
    }

    state.financeiroEstabelecimento = establishment;

    const financeSection = document.getElementById("section-financeiro");

    if (financeSection) {
      financeSection.dataset.companyTheme = establishment;
    }

    const isAzury = establishment === "azury";

    el.financeiroAzuryButton?.classList.toggle("btn-primary", isAzury);

    el.financeiroAzuryButton?.classList.toggle("btn-secondary", !isAzury);

    el.financeiroPhButton?.classList.toggle("btn-primary", !isAzury);

    el.financeiroPhButton?.classList.toggle("btn-secondary", isAzury);

    const company = financeiroCompanyConfig(establishment);

    if (el.financeiroCompanyTitle) {
      el.financeiroCompanyTitle.textContent = `Financeiro ${company.label}`;
    }

    if (el.financeiroCompanyLabel) {
      el.financeiroCompanyLabel.textContent = company.description;
    }
  }

  function financeiroStatusBadge(status) {
    const normalized = String(status || "").toLowerCase();

    const active = normalized === "pago";

    return `
      <span
        class="small-badge ${active ? "active" : "inactive"}"
      >
        ${escapeHtml(FINANCEIRO_STATUS_LABELS[normalized] || normalized || "—")}
      </span>
    `;
  }

  function financeiroTimelineTimestamp(value) {
    if (!value) {
      return 0;
    }

    const raw = String(value);

    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00`
      : raw;

    const timestamp = new Date(normalized).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function financeiroAutomaticBadge() {
    return `
      <span class="small-badge active">
        Automático
      </span>
    `;
  }

  function financeiroOrderItemsText(items) {
    if (!Array.isArray(items) || !items.length) {
      return "";
    }

    return items
      .map((item) => {
        const quantity = Math.max(1, toNumber(item.quantidade || 1));

        const name = String(item.produto_nome || "Item");

        return `${quantity}× ${name}`;
      })
      .join(" • ");
  }

  function renderFinanceiroAutomaticGain(item) {
    const total = toNumber(item.valor_total || 0);

    const products = toNumber(item.valor_produtos || 0);

    const deliveryFee = toNumber(item.taxa_entrega || 0);

    const discount = toNumber(item.desconto || 0);

    const itemCount = toNumber(item.quantidade_itens || 0);

    const orderItems = financeiroOrderItemsText(item.itens);

    const code = item.codigo || item.id || "Pedido";

    const customer = item.cliente_nome || "Cliente";

    const payment = item.forma_pagamento || "Não informado";

    const dateText = item.criado_em
      ? formatDate(item.criado_em)
      : item.data_lancamento || "—";

    return `
      <article class="data-card">

        <div class="data-card-head">

          <div>

            <h3>
              ${escapeHtml(`Pedido ${code}`)}
            </h3>

            <p>
              Ganho automático
              •
              Pedido entregue
            </p>

          </div>

          ${financeiroAutomaticBadge()}

        </div>

        <div class="data-pairs">

          <div class="data-pair">

            <span>
              Cliente
            </span>

            <strong>
              ${escapeHtml(customer)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Itens vendidos
            </span>

            <strong>
              ${escapeHtml(itemCount)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Produtos
            </span>

            <strong>
              ${formatMoney(products)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Taxa de entrega
            </span>

            <strong>
              ${formatMoney(deliveryFee)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Desconto
            </span>

            <strong>
              ${formatMoney(discount)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Total recebido
            </span>

            <strong>
              ${formatMoney(total)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Pagamento
            </span>

            <strong>
              ${escapeHtml(payment)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Data do pedido
            </span>

            <strong>
              ${escapeHtml(dateText)}
            </strong>

          </div>

        </div>

        ${
          orderItems
            ? `
              <p>
                <strong>Itens:</strong>
                ${escapeHtml(orderItems)}
              </p>
            `
            : ""
        }

        <p>
          Origem automática do pedido entregue.
          Este ganho não é um lançamento manual e não pode ser editado ou excluído pelo Financeiro.
        </p>

      </article>
    `;
  }

  function renderFinanceiroManualLaunch(item) {
    const quantity = toNumber(item.quantidade || 1);

    const unit = String(item.unidade || "un");

    const type = String(item.tipo || "");

    const status = String(item.status_pagamento || "pago");

    const total = toNumber(item.valor_total || 0);

    const unitPrice = toNumber(item.valor_unitario || 0);

    return `
      <article class="data-card">

        <div class="data-card-head">

          <div>

            <h3>
              ${escapeHtml(item.item_descricao || "Lançamento")}
            </h3>

            <p>
              ${escapeHtml(
                FINANCEIRO_TIPO_LABELS[type] || type || "Lançamento",
              )}
              •
              ${escapeHtml(item.categoria || "Sem categoria")}
            </p>

          </div>

          ${financeiroStatusBadge(status)}

        </div>

        <div class="data-pairs">

          <div class="data-pair">

            <span>
              Quantidade
            </span>

            <strong>
              ${escapeHtml(quantity)}
              ${escapeHtml(unit)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Valor unitário
            </span>

            <strong>
              ${formatMoney(unitPrice)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Valor total
            </span>

            <strong>
              ${formatMoney(total)}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Data
            </span>

            <strong>
              ${escapeHtml(item.data_lancamento || "—")}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Fornecedor
            </span>

            <strong>
              ${escapeHtml(item.fornecedor || "Não informado")}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Pagamento
            </span>

            <strong>
              ${escapeHtml(item.forma_pagamento || "Não informado")}
            </strong>

          </div>

          <div class="data-pair">

            <span>
              Vencimento
            </span>

            <strong>
              ${escapeHtml(item.vencimento || "—")}
            </strong>

          </div>

        </div>

        ${
          item.observacao
            ? `
              <p>
                ${escapeHtml(item.observacao)}
              </p>
            `
            : ""
        }

        <div class="data-card-actions">

          <button
            class="btn btn-small"
            type="button"
            data-finance-edit="${escapeHtml(item.id)}"
          >
            Editar
          </button>

          <button
            class="btn btn-danger btn-small"
            type="button"
            data-finance-delete="${escapeHtml(item.id)}"
          >
            Excluir
          </button>

        </div>

      </article>
    `;
  }

  function renderFinanceiro() {
    if (!el.financeiroSummary || !el.financeiroList) {
      return;
    }

    const data = state.financeiroData || {};

    const summary = data.resumo || {};

    el.financeiroSummary.innerHTML = [
      metricCard(
        "💵",
        formatMoney(summary.ganhos_total ?? 0),
        "Ganhos",
      ),

      metricCard("🛒", formatMoney(summary.compras ?? 0), "Compras pagas"),

      metricCard("💸", formatMoney(summary.despesas ?? 0), "Despesas pagas"),

      metricCard("📈", formatMoney(summary.resultado ?? 0), "Resultado"),

      metricCard("🧾", formatMoney(summary.pendente ?? 0), "Pendente"),

      metricCard("📦", summary.pedidos_entregues ?? 0, "Pedidos entregues"),

      metricCard("🎯", formatMoney(summary.ticket_medio ?? 0), "Ticket médio"),

      metricCard(
        "🏗️",
        formatMoney(summary.investimentos ?? 0),
        "Investimentos",
      ),
    ].join("");

    const launches = Array.isArray(data.lancamentos) ? data.lancamentos : [];

    const automaticGains = Array.isArray(data.ganhos_automaticos)
      ? data.ganhos_automaticos
      : [];

    const orderedAutomaticGains = [...automaticGains].sort(
      (a, b) =>
        financeiroTimelineTimestamp(b.criado_em || b.data_lancamento) -
        financeiroTimelineTimestamp(a.criado_em || a.data_lancamento),
    );

    const orderedLaunches = [...launches].sort(
      (a, b) =>
        financeiroTimelineTimestamp(b.data_lancamento || b.criado_em) -
        financeiroTimelineTimestamp(a.data_lancamento || a.criado_em),
    );

    if (!orderedAutomaticGains.length && !orderedLaunches.length) {
      setEmpty(
        el.financeiroList,
        `Nenhuma movimentação financeira encontrada para ${financeiroCompanyConfig().label}${
          el.financeiroDataInicio?.value || el.financeiroDataFim?.value
            ? " no período selecionado"
            : ""
        }.`,
      );

      return;
    }

    const groups = [];

    if (orderedAutomaticGains.length) {
      groups.push(`
        <section class="financeiro-group financeiro-group-gains">

          <div class="financeiro-group-heading">

            <div>
              <span class="eyebrow">VENDAS ENTREGUES</span>
              <h3>Ganhos automáticos</h3>
              <p>Pedidos entregues registrados automaticamente no Financeiro.</p>
            </div>

            <span class="financeiro-group-count">
              ${escapeHtml(orderedAutomaticGains.length)}
              ${orderedAutomaticGains.length === 1 ? "pedido" : "pedidos"}
            </span>

          </div>

          <div class="financeiro-group-grid">
            ${orderedAutomaticGains
              .map((item) => renderFinanceiroAutomaticGain(item))
              .join("")}
          </div>

        </section>
      `);
    }

    if (orderedLaunches.length) {
      groups.push(`
        <section class="financeiro-group financeiro-group-launches">

          <div class="financeiro-group-heading">

            <div>
              <span class="eyebrow">CONTROLE DE GASTOS</span>
              <h3>Compras, despesas e investimentos</h3>
              <p>Lançamentos cadastrados manualmente ou importados no histórico financeiro.</p>
            </div>

            <span class="financeiro-group-count">
              ${escapeHtml(orderedLaunches.length)}
              ${orderedLaunches.length === 1 ? "lançamento" : "lançamentos"}
            </span>

          </div>

          <div class="financeiro-group-grid">
            ${orderedLaunches
              .map((item) => renderFinanceiroManualLaunch(item))
              .join("")}
          </div>

        </section>
      `);
    }

    el.financeiroList.innerHTML = groups.join("");
  }

  async function loadFinanceiro(message = "") {
    if (!el.financeiroSummary || !el.financeiroList) {
      return;
    }

    ensureFinanceiroPeriod();

    setFinanceiroEstabelecimento(state.financeiroEstabelecimento);

    setLoading(el.financeiroList, "Carregando lançamentos financeiros...");

    try {
      const data = await rpc(
        "listar_financeiro_admin",

        {
          p_estabelecimento: state.financeiroEstabelecimento,

          p_data_inicio: el.financeiroDataInicio?.value || null,

          p_data_fim: el.financeiroDataFim?.value || null,
        },
      );

      state.financeiroData = data || {};

      renderFinanceiro();

      if (message) {
        showMessage(message);
      }
    } catch (error) {
      console.error(error);

      setEmpty(el.financeiroList, "Não foi possível carregar o financeiro.");

      throw error;
    }
  }

  const ESTOQUE_ESTABELECIMENTOS = Object.freeze({
    azury: {
      label: "Azury",

      description: "Embalagens e itens controlados da Azury.",
    },

    ph_sabor_cia: {
      label: "PH Sabor & Cia",

      description: "Estoque da PH Sabor & Cia, totalmente separado da Azury.",
    },
  });

  function estoqueCompanyConfig(
    establishment = state.estoqueEstabelecimento,
  ) {
    return (
      ESTOQUE_ESTABELECIMENTOS[establishment] ||
      ESTOQUE_ESTABELECIMENTOS.azury
    );
  }

  function setEstoqueEstabelecimento(establishment) {
    if (!ESTOQUE_ESTABELECIMENTOS[establishment]) {
      throw new Error("Estabelecimento de estoque inválido.");
    }

    state.estoqueEstabelecimento = establishment;

    const stockSection = document.getElementById("section-estoque");

    if (stockSection) {
      stockSection.dataset.companyTheme = establishment;
    }

    const isAzury = establishment === "azury";

    el.estoqueAzuryButton?.classList.toggle("btn-primary", isAzury);

    el.estoqueAzuryButton?.classList.toggle("btn-secondary", !isAzury);

    el.estoquePhButton?.classList.toggle("btn-primary", !isAzury);

    el.estoquePhButton?.classList.toggle("btn-secondary", isAzury);

    const company = estoqueCompanyConfig(establishment);

    if (el.estoqueCompanyTitle) {
      el.estoqueCompanyTitle.textContent = `Estoque ${company.label}`;
    }

    if (el.estoqueCompanyLabel) {
      el.estoqueCompanyLabel.textContent = company.description;
    }
  }

  function formatEstoqueQuantidade(value, unidade = "un") {
    const quantidade = toNumber(value);

    const texto = Number.isInteger(quantidade)
      ? quantidade.toLocaleString("pt-BR")
      : quantidade.toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3,
        });

    return `${texto} ${String(unidade || "un")}`;
  }

  function estoqueItemStatus(item) {
    const saldo = toNumber(item?.saldo);

    const minimo = Math.max(0, toNumber(item?.estoque_minimo));

    if (saldo < 0) {
      return {
        label: "A conferir",
        className: "stock-check",
        cardClass: "stock-card-check",
      };
    }

    if (saldo === 0) {
      return {
        label: "Sem estoque",
        className: "stock-out",
        cardClass: "stock-card-out",
      };
    }

    if (minimo > 0 && saldo <= minimo) {
      return {
        label: "Estoque baixo",
        className: "stock-low",
        cardClass: "stock-card-low",
      };
    }

    return {
      label: "Disponível",
      className: "stock-ok",
      cardClass: "stock-card-ok",
    };
  }

  function renderEstoque() {
    if (!el.estoqueSummary || !el.estoqueList) {
      return;
    }

    const items = Array.isArray(state.estoqueItens) ? state.estoqueItens : [];

    const normal = items.filter((item) => {
      const saldo = toNumber(item.saldo);
      const minimo = Math.max(0, toNumber(item.estoque_minimo));

      return saldo > 0 && (minimo <= 0 || saldo > minimo);
    }).length;

    const low = items.filter((item) => {
      const saldo = toNumber(item.saldo);
      const minimo = Math.max(0, toNumber(item.estoque_minimo));

      return saldo > 0 && minimo > 0 && saldo <= minimo;
    }).length;

    const attention = items.filter((item) => toNumber(item.saldo) <= 0).length;

    el.estoqueSummary.innerHTML = [
      metricCard("📦", items.length, "Itens controlados"),

      metricCard("✅", normal, "Estoque normal"),

      metricCard("⚠️", low, "Estoque baixo"),

      metricCard("🚨", attention, "Zerados / a conferir"),
    ].join("");

    if (!items.length) {
      setEmpty(
        el.estoqueList,
        `Nenhum item de estoque cadastrado para ${estoqueCompanyConfig().label}.`,
      );

      return;
    }

    el.estoqueList.innerHTML = items
      .map((item) => {
        const status = estoqueItemStatus(item);

        const unidade = String(item.unidade || "un");

        const automatico = item.controle_automatico !== false;

        return `
              <article class="data-card estoque-card ${status.cardClass}">

                <div class="data-card-head">

                  <div>

                    <h3>
                      ${escapeHtml(item.nome || "Item")}
                    </h3>

                    <p>
                      ${escapeHtml(item.categoria || "Sem categoria")}
                      •
                      ${automatico ? "Controle automático" : "Controle manual"}
                    </p>

                  </div>

                  <span class="stock-status-badge ${status.className}">
                    ${escapeHtml(status.label)}
                  </span>

                </div>

                <div class="estoque-saldo-block">

                  <span>Disponível</span>

                  <strong>
                    ${escapeHtml(formatEstoqueQuantidade(item.saldo, unidade))}
                  </strong>

                </div>

                <div class="data-pairs">

                  <div class="data-pair">

                    <span>Entradas</span>

                    <strong>
                      ${escapeHtml(
                        formatEstoqueQuantidade(item.total_entradas, unidade),
                      )}
                    </strong>

                  </div>

                  <div class="data-pair">

                    <span>Saídas</span>

                    <strong>
                      ${escapeHtml(
                        formatEstoqueQuantidade(item.total_saidas, unidade),
                      )}
                    </strong>

                  </div>

                  <div class="data-pair">

                    <span>Estoque mínimo</span>

                    <strong>
                      ${escapeHtml(
                        formatEstoqueQuantidade(item.estoque_minimo, unidade),
                      )}
                    </strong>

                  </div>

                </div>

              </article>
            `;
      })
      .join("");
  }

  async function loadEstoque(message = "") {
    if (!el.estoqueSummary || !el.estoqueList) {
      return;
    }

    setEstoqueEstabelecimento(state.estoqueEstabelecimento);

    setLoading(el.estoqueList, "Carregando estoque...");

    try {
      const data = await rpc("listar_estoque_admin", {
        p_estabelecimento: state.estoqueEstabelecimento,
      });

      state.estoqueItens = Array.isArray(data) ? data : [];

      renderEstoque();

      if (message) {
        showMessage(message);
      }
    } catch (error) {
      console.error(error);

      state.estoqueItens = [];

      if (el.estoqueSummary) {
        el.estoqueSummary.innerHTML = "";
      }

      setEmpty(el.estoqueList, "Não foi possível carregar o estoque.");

      throw error;
    }
  }

  function financeiroFieldOptions() {
    return {
      types: [
        {
          value: "compra",

          label: "Compra",
        },

        {
          value: "despesa",

          label: "Despesa",
        },

        {
          value: "investimento",

          label: "Investimento",
        },

        {
          value: "entrada_manual",

          label: "Entrada manual",
        },
      ],

      units: [
        {
          value: "un",

          label: "Unidade (un)",
        },

        {
          value: "pct",

          label: "Pacote (pct)",
        },

        {
          value: "cx",

          label: "Caixa (cx)",
        },

        {
          value: "kg",

          label: "Quilo (kg)",
        },

        {
          value: "g",

          label: "Grama (g)",
        },

        {
          value: "L",

          label: "Litro (L)",
        },

        {
          value: "ml",

          label: "Mililitro (ml)",
        },

        {
          value: "dz",

          label: "Dúzia (dz)",
        },
      ],

      paymentStatus: [
        {
          value: "pago",

          label: "Pago",
        },

        {
          value: "pendente",

          label: "Pendente",
        },
      ],

      payments: [
        {
          value: "",

          label: "Não informado",
        },

        {
          value: "Pix",

          label: "Pix",
        },

        {
          value: "Dinheiro",

          label: "Dinheiro",
        },

        {
          value: "Débito",

          label: "Débito",
        },

        {
          value: "Crédito",

          label: "Crédito",
        },

        {
          value: "Boleto",

          label: "Boleto",
        },

        {
          value: "Transferência",

          label: "Transferência",
        },

        {
          value: "Outro",

          label: "Outro",
        },
      ],
    };
  }

  function openFinanceiroModal(item = null) {
    const editing = Boolean(item?.id);

    const options = financeiroFieldOptions();

    const company = financeiroCompanyConfig();

    openModal({
      title: editing
        ? `Editar lançamento • ${company.label}`
        : `Novo lançamento • ${company.label}`,

      submitText: editing ? "Salvar alterações" : "Cadastrar lançamento",

      fields: [
        {
          name: "tipo",

          label: "Tipo",

          type: "select",

          value: item?.tipo || "compra",

          options: options.types,

          required: true,
        },

        {
          name: "categoria",

          label: "Categoria",

          value: item?.categoria || "",

          required: true,
        },

        {
          name: "item_descricao",

          label: "Item / descrição",

          value: item?.item_descricao || "",

          required: true,

          full: true,
        },

        {
          name: "quantidade",

          label: "Quantidade",

          type: "number",

          value: item?.quantidade ?? 1,

          step: "0.001",

          required: true,
        },

        {
          name: "unidade",

          label: "Unidade",

          type: "select",

          value: item?.unidade || "un",

          options: options.units,

          required: true,
        },

        {
          name: "valor_total",

          label: "Valor total (R$)",

          type: "number",

          value: item?.valor_total ?? "",

          step: "0.01",

          required: true,
        },

        {
          name: "fornecedor",

          label: "Fornecedor",

          value: item?.fornecedor || "",
        },

        {
          name: "forma_pagamento",

          label: "Forma de pagamento",

          type: "select",

          value: item?.forma_pagamento || "",

          options: options.payments,
        },

        {
          name: "status_pagamento",

          label: "Status do pagamento",

          type: "select",

          value: item?.status_pagamento || "pago",

          options: options.paymentStatus,

          required: true,
        },

        {
          name: "data_lancamento",

          label: "Data",

          type: "date",

          value: item?.data_lancamento || localDateInputValue(new Date()),

          required: true,
        },

        {
          name: "vencimento",

          label: "Vencimento",

          type: "date",

          value: item?.vencimento || "",
        },

        {
          name: "observacao",

          label: "Observação",

          type: "textarea",

          value: item?.observacao || "",

          full: true,
        },
      ],

      onSubmit: async (values) => {
        if (Number(values.quantidade || 0) <= 0) {
          throw new Error("A quantidade deve ser maior que zero.");
        }

        if (values.valor_total === "" || Number(values.valor_total) < 0) {
          throw new Error("Informe um valor total válido.");
        }

        await rpc(
          "salvar_financeiro_lancamento_admin",

          {
            p_id: editing ? item.id : null,

            p_estabelecimento: state.financeiroEstabelecimento,

            p_tipo: values.tipo,

            p_categoria: String(values.categoria || "").trim(),

            p_item_descricao: String(values.item_descricao || "").trim(),

            p_quantidade: Number(values.quantidade),

            p_unidade: values.unidade || "un",

            p_valor_total: Number(values.valor_total),

            p_fornecedor: String(values.fornecedor || "").trim() || null,

            p_forma_pagamento:
              String(values.forma_pagamento || "").trim() || null,

            p_status_pagamento: values.status_pagamento || "pago",

            p_data_lancamento: values.data_lancamento || null,

            p_vencimento: values.vencimento || null,

            p_observacao: String(values.observacao || "").trim() || null,
          },
        );

        await loadFinanceiro(
          editing
            ? "Lançamento financeiro atualizado."
            : "Lançamento financeiro cadastrado.",
        );
      },
    });
  }

  function openFinanceiroDeleteModal(item) {
    if (!item?.id) {
      return;
    }

    const company = financeiroCompanyConfig();

    openModal({
      title: `Excluir lançamento • ${company.label}`,

      message: `Confirma a exclusão de “${
        item.item_descricao || "este lançamento"
      }”? Esta ação não pode ser desfeita.`,

      messageType: "warning",

      submitText: "Excluir",

      submitClass: "btn-danger",

      fields: [],

      onSubmit: async () => {
        await rpc(
          "excluir_financeiro_lancamento_admin",

          {
            p_id: item.id,

            p_estabelecimento: state.financeiroEstabelecimento,
          },
        );

        await loadFinanceiro("Lançamento financeiro excluído.");
      },
    });
  }

  function cardapioMatchesAvailability(isAvailable) {
    if (state.cardapioDisponibilidade === "disponiveis") {
      return Boolean(isAvailable);
    }

    if (state.cardapioDisponibilidade === "indisponiveis") {
      return !isAvailable;
    }

    return true;
  }

  function updateCardapioCompanyUI() {
    const isAzury = state.cardapioEstabelecimento !== "ph_sabor_cia";

    el.cardapioAzuryButton?.classList.toggle("btn-primary", isAzury);
    el.cardapioAzuryButton?.classList.toggle("btn-secondary", !isAzury);

    el.cardapioPhButton?.classList.toggle("btn-primary", !isAzury);
    el.cardapioPhButton?.classList.toggle("btn-secondary", isAzury);

    if (el.cardapioAzuryContent) {
      el.cardapioAzuryContent.hidden = !isAzury;
    }

    if (el.cardapioPhContent) {
      el.cardapioPhContent.hidden = isAzury;
    }

    if (el.newComplementButton) {
      el.newComplementButton.hidden = !isAzury;
    }

    if (el.cardapioCompanyDescription) {
      el.cardapioCompanyDescription.textContent = isAzury
        ? "Copos, Azury Box e complementos da Azury."
        : "Marmitas, bebidas e adicionais da PH Sabor & Cia.";
    }

    if (el.cardapioToolbar) {
      el.cardapioToolbar.classList.toggle("company-block-azury", isAzury);
      el.cardapioToolbar.classList.toggle("company-block-ph", !isAzury);
    }
  }

  function setCardapioEstabelecimento(estabelecimento) {
    state.cardapioEstabelecimento =
      estabelecimento === "ph_sabor_cia" ? "ph_sabor_cia" : "azury";

    updateCardapioCompanyUI();

    renderSizes();
    renderAzuryBoxes();
    renderComplements();
    renderPhConfigPanel();
  }

  function updateHorariosCompanyUI() {
    const isAzury = state.horariosEstabelecimento !== "ph_sabor_cia";

    el.horariosAzuryButton?.classList.toggle("btn-primary", isAzury);
    el.horariosAzuryButton?.classList.toggle("btn-secondary", !isAzury);

    el.horariosPhButton?.classList.toggle("btn-primary", !isAzury);
    el.horariosPhButton?.classList.toggle("btn-secondary", isAzury);

    if (el.horariosAzuryContent) {
      el.horariosAzuryContent.hidden = !isAzury;
    }

    if (el.horariosPhContent) {
      el.horariosPhContent.hidden = isAzury;
    }

    if (el.horariosCompanyDescription) {
      el.horariosCompanyDescription.textContent = isAzury
        ? "Pause pedidos, altere a mensagem e defina os horários da Azury."
        : "Configure os dados principais, dias e horários da PH Sabor & Cia.";
    }

    if (el.horariosToolbar) {
      el.horariosToolbar.classList.toggle("company-block-azury", isAzury);
      el.horariosToolbar.classList.toggle("company-block-ph", !isAzury);
    }
  }

  function setHorariosEstabelecimento(estabelecimento) {
    state.horariosEstabelecimento =
      estabelecimento === "ph_sabor_cia" ? "ph_sabor_cia" : "azury";

    updateHorariosCompanyUI();
  }

  function renderOperationSections() {
    if (!state.operacao) {
      return;
    }

    renderSizes();

    renderAzuryBoxes();

    renderComplements();

    renderNeighborhoods();

    renderStoreConfig();

    renderSchedules();

    renderRewards();

    renderPhConfigPanel();

    updateCardapioCompanyUI();

    updateHorariosCompanyUI();
  }

  function renderSizes() {
    const sizes = (state.operacao?.tamanhos || []).filter((item) =>
      cardapioMatchesAvailability(Boolean(item.disponivel && item.visivel)),
    );

    if (!sizes.length) {
      return setEmpty(el.sizesList, "Nenhum copo encontrado neste filtro.");
    }

    el.sizesList.innerHTML = sizes
      .map(
        (item) => `
            <article class="data-card">

              <div class="data-card-head">

                <div>

                  <h3>
                    ${escapeHtml(item.nome)}
                  </h3>

                  <p>
                    ${escapeHtml(item.tamanho_ml)}
                    ml
                  </p>

                </div>

                <span
                  class="small-badge ${
                    item.disponivel && item.visivel ? "active" : "inactive"
                  }"
                >
                  ${
                    item.disponivel && item.visivel
                      ? "Disponível"
                      : "Indisponível"
                  }
                </span>

              </div>

              <div class="data-pairs">

                <div class="data-pair">

                  <span>
                    Preço
                  </span>

                  <strong>
                    ${formatMoney(item.preco_base)}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Badge
                  </span>

                  <strong>
                    ${escapeHtml(item.badge || "—")}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Ordem
                  </span>

                  <strong>
                    ${escapeHtml(item.ordem)}
                  </strong>

                </div>

              </div>

              <div class="data-card-actions">

                <button
                  class="btn btn-secondary"
                  data-edit-size="${item.id}"
                  type="button"
                >
                  Editar
                </button>

              </div>

            </article>
          `,
      )
      .join("");
  }

  function renderAzuryBoxes() {
    if (!el.azuryBoxesList) {
      return;
    }

    const boxes = getAzuryBoxesAdmin().filter((item) =>
      cardapioMatchesAvailability(Boolean(item.disponivel && item.visivel)),
    );

    if (!boxes.length) {
      return setEmpty(
        el.azuryBoxesList,
        "Nenhum Azury Box encontrado neste filtro.",
      );
    }

    el.azuryBoxesList.innerHTML = boxes
      .map(
        (item) => `
          <article class="data-card azury-box-card">

            <div class="data-card-head">

              <div>

                <h3>
                  ${escapeHtml(item.nome)}
                </h3>

                <p>
                  Tamanho ${escapeHtml(item.label)}
                </p>

              </div>

              <span
                class="small-badge ${
                  item.disponivel && item.visivel ? "active" : "inactive"
                }"
              >
                ${item.disponivel && item.visivel ? "Disponível" : "Indisponível"}
              </span>

            </div>

            <div class="data-pairs">

              <div class="data-pair">

                <span>
                  Preço
                </span>

                <strong>
                  ${formatMoney(item.preco)}
                </strong>

              </div>

              <div class="data-pair">

                <span>
                  Complementos incluídos
                </span>

                <strong>
                  ${escapeHtml(item.limite)}
                </strong>

              </div>

              <div class="data-pair">

                <span>
                  Ordem
                </span>

                <strong>
                  ${escapeHtml(item.ordem)}
                </strong>

              </div>

            </div>

            <div class="data-card-actions">

              <button
                class="btn btn-secondary"
                data-edit-box="${escapeHtml(item.key)}"
                type="button"
              >
                Editar
              </button>

            </div>

          </article>
        `,
      )
      .join("");
  }

  function renderComplements() {
    const items = (state.operacao?.complementos || []).filter((item) =>
      cardapioMatchesAvailability(Boolean(item.disponivel && item.visivel)),
    );

    if (!items.length) {
      return setEmpty(
        el.complementsList,
        "Nenhum complemento encontrado neste filtro.",
      );
    }

    el.complementsList.innerHTML = items
      .map(
        (item) => `
            <article class="data-card">

              <div class="data-card-head">

                <div>

                  <h3>
                    ${escapeHtml(item.nome)}
                  </h3>

                  <p>
                    ${formatMoney(item.preco)}
                  </p>

                </div>

                <span
                  class="small-badge ${
                    item.disponivel && item.visivel ? "active" : "inactive"
                  }"
                >
                  ${
                    item.disponivel && item.visivel
                      ? "Disponível"
                      : "Indisponível"
                  }
                </span>

              </div>

              <div class="data-pairs">

                <div class="data-pair">

                  <span>
                    Disponível
                  </span>

                  <strong>
                    ${booleanText(item.disponivel)}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Visível
                  </span>

                  <strong>
                    ${booleanText(item.visivel)}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Ordem
                  </span>

                  <strong>
                    ${escapeHtml(item.ordem)}
                  </strong>

                </div>

              </div>

              <div class="data-card-actions">

                <button
                  class="btn btn-secondary"
                  data-edit-complement="${item.id}"
                  type="button"
                >
                  Editar
                </button>

              </div>

            </article>
          `,
      )
      .join("");
  }

  function renderNeighborhoods() {
    const items = state.operacao?.bairros || [];

    if (!items.length) {
      return setEmpty(el.neighborhoodsList, "Nenhum bairro cadastrado.");
    }

    el.neighborhoodsList.innerHTML = items
      .map(
        (item) => `
            <article class="data-card">

              <div class="data-card-head">

                <div>

                  <h3>
                    ${escapeHtml(item.nome)}
                  </h3>

                  <p>
                    ${formatMoney(item.taxa)}
                  </p>

                </div>

                <span
                  class="small-badge ${item.ativo ? "active" : "inactive"}"
                >
                  ${item.ativo ? "Ativo" : "Inativo"}
                </span>

              </div>

              <div class="data-pairs">

                <div class="data-pair">

                  <span>
                    Aliases
                  </span>

                  <strong>
                    ${escapeHtml((item.aliases || []).join(", ") || "—")}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Ordem
                  </span>

                  <strong>
                    ${escapeHtml(item.ordem)}
                  </strong>

                </div>

              </div>

              <div class="data-card-actions">

                <button
                  class="btn btn-secondary"
                  data-edit-neighborhood="${item.id}"
                  type="button"
                >
                  Editar
                </button>

              </div>

            </article>
          `,
      )
      .join("");
  }

  function renderStoreConfig() {
    const config = state.operacao?.configuracao_loja || {};

    el.storeConfigForm.innerHTML = `
      <label>

        <span>
          Nome da loja
        </span>

        <input
          name="nome_loja"
          value="${escapeHtml(config.nome_loja || "Azury")}"
          required
        >

      </label>

      <label>

        <span>
          WhatsApp
        </span>

        <input
          name="whatsapp"
          value="${escapeHtml(config.whatsapp || "")}"
          required
        >

      </label>

      <label>

        <span>
          Fuso horário
        </span>

        <input
          name="fuso_horario"
          value="${escapeHtml(config.fuso_horario || "America/Sao_Paulo")}"
          required
        >

      </label>

      <label class="switch-field">

        <input
          name="pedidos_ativos"
          type="checkbox"
          ${config.pedidos_ativos ? "checked" : ""}
        >

        <span>
          Pedidos ativos
        </span>

      </label>

      <label class="full-field">

        <span>
          Mensagem de pausa
        </span>

        <textarea
          name="mensagem_pausa"
          placeholder="Mensagem exibida quando os pedidos estiverem pausados"
        >${escapeHtml(config.mensagem_pausa || "")}</textarea>

      </label>

      <div class="form-actions">

        <button
          class="btn btn-primary"
          type="submit"
        >
          Salvar configuração
        </button>

      </div>
    `;
  }

  function renderSchedules() {
    const schedules = state.operacao?.horarios || [];

    el.schedulesList.innerHTML = schedules
      .map(
        (item) => `
            <div
              class="schedule-row"
              data-day="${item.dia_semana}"
            >

              <strong>
                ${escapeHtml(item.nome_dia)}
              </strong>

              <input
                data-open
                type="time"
                value="${escapeHtml(formatTime(item.abre_as))}"
                ${item.ativo ? "" : "disabled"}
              >

              <input
                data-close
                type="time"
                value="${escapeHtml(formatTime(item.fecha_as))}"
                ${item.ativo ? "" : "disabled"}
              >

              <label class="switch-field">

                <input
                  data-active
                  type="checkbox"
                  ${item.ativo ? "checked" : ""}
                >

                <span>
                  Ativo
                </span>

              </label>

              <button
                class="btn btn-secondary"
                data-save-schedule
                type="button"
              >
                Salvar
              </button>

            </div>
          `,
      )
      .join("");
  }

  function renderRewards() {
    const items = state.operacao?.recompensas || [];

    if (!items.length) {
      return setEmpty(el.rewardsList, "Nenhuma recompensa cadastrada.");
    }

    el.rewardsList.innerHTML = items
      .map(
        (item) => `
            <article class="data-card">

              <div class="data-card-head">

                <div>

                  <h3>
                    ${escapeHtml(item.titulo)}
                  </h3>

                  <p>
                    ${escapeHtml(item.descricao)}
                  </p>

                </div>

                <span
                  class="small-badge ${item.ativo ? "active" : "inactive"}"
                >
                  ${item.ativo ? "Ativa" : "Inativa"}
                </span>

              </div>

              <div class="data-pairs">

                <div class="data-pair">

                  <span>
                    Tipo
                  </span>

                  <strong>
                    ${escapeHtml(item.tipo)}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Pontos
                  </span>

                  <strong>
                    ${escapeHtml(item.pontos_necessarios)}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Benefício
                  </span>

                  <strong>
                    ${
                      item.tipo === "cupom"
                        ? `${escapeHtml(item.percentual_desconto)}%`
                        : `${escapeHtml(
                            item.quantidade_copos,
                          )} copo(s) de ${escapeHtml(item.tamanho_ml)} ml`
                    }
                  </strong>

                </div>

              </div>

              <div class="data-card-actions">

                <button
                  class="btn btn-secondary"
                  data-edit-reward="${item.id}"
                  type="button"
                >
                  Editar
                </button>

              </div>

            </article>
          `,
      )
      .join("");
  }

  function clonePhConfig() {
    return JSON.parse(JSON.stringify(state.phConfig || {}));
  }

  function phPrice(value) {
    return value === null || value === undefined || value === ""
      ? "A definir"
      : formatMoney(value);
  }

  function ensurePhConfigPanel() {
    let panel = document.getElementById("phConfigPanel");

    if (panel) {
      return panel;
    }

    const section = el.cardapioPhContent || document.getElementById("section-cardapio");

    if (!section) {
      return null;
    }

    panel = document.createElement("section");

    panel.id = "phConfigPanel";

    panel.className = "panel ph-menu-panel company-block company-block-ph";

    section.appendChild(panel);

    return panel;
  }

  const PH_WEEK_DAYS = [
    { key: "domingo", label: "Domingo" },
    { key: "segunda", label: "Segunda-Feira" },
    { key: "terca", label: "Terça-Feira" },
    { key: "quarta", label: "Quarta-Feira" },
    { key: "quinta", label: "Quinta-Feira" },
    { key: "sexta", label: "Sexta-Feira" },
    { key: "sabado", label: "Sábado" },
  ];

  function normalizePhDayKey(value) {
    const key = normalizeKey(value).replace(/\s+/g, " ").trim();

    const aliases = {
      sun: "domingo",
      domingo: "domingo",
      dom: "domingo",
      mon: "segunda",
      segunda: "segunda",
      "segunda feira": "segunda",
      seg: "segunda",
      tue: "terca",
      terca: "terca",
      "terca feira": "terca",
      ter: "terca",
      wed: "quarta",
      quarta: "quarta",
      "quarta feira": "quarta",
      qua: "quarta",
      thu: "quinta",
      quinta: "quinta",
      "quinta feira": "quinta",
      qui: "quinta",
      fri: "sexta",
      sexta: "sexta",
      "sexta feira": "sexta",
      sex: "sexta",
      sat: "sabado",
      sabado: "sabado",
      sab: "sabado",
    };

    return aliases[key] || "";
  }

  function getPhWeeklySchedules() {
    const store = state.phConfig?.loja || {};
    const schedule = store.horario || {};

    const detailed = Array.isArray(schedule.horarios_semana)
      ? schedule.horarios_semana
      : Array.isArray(schedule.semana)
        ? schedule.semana
        : [];

    const detailedByDay = new Map();

    detailed.forEach((item) => {
      const dayKey = normalizePhDayKey(
        item?.dia ?? item?.dia_semana ?? item?.key ?? item?.nome_dia,
      );

      if (dayKey) {
        detailedByDay.set(dayKey, item);
      }
    });

    const rawDays =
      schedule.dias ?? schedule.dias_funcionamento ?? schedule.diasFuncionamento;

    const activeDayKeys = new Set(
      (Array.isArray(rawDays)
        ? rawDays
        : String(rawDays || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
      )
        .map(normalizePhDayKey)
        .filter(Boolean),
    );

    const defaultOpen = formatTime(schedule.abertura || "11:00") || "11:00";
    const defaultClose = formatTime(schedule.fechamento || "18:00") || "18:00";

    return PH_WEEK_DAYS.map((day) => {
      const detailedItem = detailedByDay.get(day.key);
      const hasDetailed = Boolean(detailedItem);

      return {
        ...day,
        ativo: hasDetailed
          ? detailedItem.ativo !== false
          : activeDayKeys.has(day.key),
        abertura:
          formatTime(
            detailedItem?.abertura ??
              detailedItem?.abre_as ??
              detailedItem?.abre ??
              defaultOpen,
          ) || defaultOpen,
        fechamento:
          formatTime(
            detailedItem?.fechamento ??
              detailedItem?.fecha_as ??
              detailedItem?.fecha ??
              defaultClose,
          ) || defaultClose,
      };
    });
  }

  function renderPhStorePanel() {
    if (!el.phStoreConfigForm || !el.phSchedulesList) {
      return;
    }

    if (!state.phConfig) {
      el.phStoreConfigForm.innerHTML = `
        <div class="full-field empty-state">
          Configuração da PH não carregada.
        </div>

        <div class="form-actions">
          <button
            class="btn btn-primary"
            data-ph-config-reload
            type="button"
          >
            Carregar PH
          </button>
        </div>
      `;

      setEmpty(el.phSchedulesList, "Carregue a configuração da PH.");
      return;
    }

    const store = state.phConfig.loja || {};
    const address = store.endereco || {};
    const schedule = store.horario || {};

    el.phStoreConfigForm.innerHTML = `
      <label>
        <span>Nome da loja</span>
        <input
          name="nome"
          value="${escapeHtml(store.nome || "PH Sabor & Cia")}" 
          required
        >
      </label>

      <label>
        <span>WhatsApp</span>
        <input
          name="whatsapp"
          value="${escapeHtml(store.whatsapp || "")}" 
          required
        >
      </label>

      <label>
        <span>Instagram</span>
        <input
          name="instagram"
          value="${escapeHtml(store.instagram || "")}" 
          placeholder="@phsaborecia"
        >
      </label>

      <label>
        <span>Fuso horário</span>
        <input
          name="fuso_horario"
          value="${escapeHtml(schedule.fuso_horario || "America/Sao_Paulo")}" 
          required
        >
      </label>

      <label>
        <span>Pedido mínimo</span>
        <input
          name="pedido_minimo"
          type="number"
          step="0.01"
          min="0"
          value="${escapeHtml(store.pedido_minimo ?? 0)}"
          required
        >
      </label>

      <label>
        <span>Limite de entrega em km</span>
        <input
          name="limite_entrega_km"
          type="number"
          step="0.1"
          min="0"
          value="${escapeHtml(store.limite_entrega_km ?? 8)}"
          required
        >
      </label>

      <label class="switch-field">
        <input
          name="retirada_ativa"
          type="checkbox"
          ${store.retirada_ativa !== false ? "checked" : ""}
        >
        <span>Retirada no local ativa</span>
      </label>

      <div class="full-field ph-form-section-title">
        Endereço da loja
      </div>

      <label>
        <span>Rua / Avenida</span>
        <input
          name="rua"
          value="${escapeHtml(address.rua || "")}" 
          required
        >
      </label>

      <label>
        <span>Número</span>
        <input
          name="numero"
          value="${escapeHtml(address.numero || "")}" 
          required
        >
      </label>

      <label>
        <span>Bairro</span>
        <input
          name="bairro"
          value="${escapeHtml(address.bairro || "")}" 
          required
        >
      </label>

      <label>
        <span>Cidade</span>
        <input
          name="cidade"
          value="${escapeHtml(address.cidade || "")}" 
          required
        >
      </label>

      <label>
        <span>Estado</span>
        <input
          name="estado"
          value="${escapeHtml(address.estado || "SP")}" 
          required
        >
      </label>

      <label>
        <span>País</span>
        <input
          name="pais"
          value="${escapeHtml(address.pais || "Brasil")}" 
          required
        >
      </label>

      <div class="form-actions ph-store-form-actions">
        <button
          class="btn btn-secondary"
          data-ph-edit-delivery-bands
          type="button"
        >
          Editar taxas por distância
        </button>

        <button class="btn btn-primary" type="submit">
          Salvar configuração
        </button>
      </div>
    `;

    renderPhSchedules();
  }

  function renderPhSchedules() {
    if (!el.phSchedulesList) {
      return;
    }

    const schedules = getPhWeeklySchedules();

    el.phSchedulesList.innerHTML = schedules
      .map(
        (item) => `
          <div
            class="schedule-row ph-schedule-row"
            data-ph-day="${escapeHtml(item.key)}"
          >
            <strong>
              ${escapeHtml(item.label)}
            </strong>

            <input
              data-ph-open
              type="time"
              value="${escapeHtml(item.abertura)}"
              ${item.ativo ? "" : "disabled"}
            >

            <input
              data-ph-close
              type="time"
              value="${escapeHtml(item.fechamento)}"
              ${item.ativo ? "" : "disabled"}
            >

            <label class="switch-field">
              <input
                data-ph-active
                type="checkbox"
                ${item.ativo ? "checked" : ""}
              >
              <span>Ativo</span>
            </label>

            <button
              class="btn btn-secondary"
              data-ph-save-schedule
              type="button"
            >
              Salvar
            </button>
          </div>
        `,
      )
      .join("");
  }

  function phConfigCards(items, type) {
    if (!items.length) {
      return `
        <div class="empty-state">
          Nenhum item cadastrado.
        </div>
      `;
    }

    return items
      .map((item) => {
        const isMeal = type === "marmita";

        const attribute = isMeal
          ? "data-ph-edit-meal"
          : type === "bebida"
            ? "data-ph-edit-drink"
            : "data-ph-edit-addon";

        const price = isMeal
          ? (item.tamanhos || [])
              .map((size) => {
                const sizeName = escapeHtml(
                  size.nome || `${size.capacidade_ml} ml`,
                );

                if (size.ativo === false) {
                  return `${sizeName}: Indisponível`;
                }

                return `${sizeName}: ${escapeHtml(phPrice(size.preco))}`;
              })
              .join(" • ") || "Sem tamanhos"
          : escapeHtml(phPrice(item.preco));

        return `
          <article class="data-card">

            <div class="data-card-head">

              <div>

                <h3>
                  ${escapeHtml(item.nome)}
                </h3>

                <p>
                  ${price}
                </p>

              </div>

              <span
                class="small-badge ${
                  item.ativo !== false ? "active" : "inactive"
                }"
              >
                ${item.ativo !== false ? "Ativo" : "Inativo"}
              </span>

            </div>

            ${
              isMeal && item.descricao
                ? `
                  <p
                    style="
                      margin-top:10px;
                    "
                  >
                    ${escapeHtml(item.descricao)}
                  </p>
                `
                : ""
            }

            <div class="data-card-actions">

              <button
                class="btn btn-secondary"
                ${attribute}="${escapeHtml(item.id)}"
                type="button"
              >
                Editar
              </button>

            </div>

          </article>
        `;
      })
      .join("");
  }

  function renderPhConfigPanel() {
    const panel = ensurePhConfigPanel();

    if (!panel) {
      return;
    }

    renderPhStorePanel();

    if (!state.phConfig) {
      panel.innerHTML = `
        <div class="panel-heading">

          <div>

            <span class="eyebrow">
              PH SABOR &amp; CIA
            </span>

            <h2>
              Cardápio PH
            </h2>

            <p>
              Produtos e acompanhamentos da PH ficam nesta área.
            </p>

          </div>

          <button
            class="btn btn-primary"
            data-ph-config-reload
            type="button"
          >
            Carregar configuração PH
          </button>

        </div>
      `;

      return;
    }

    const config = state.phConfig;

    const meals = (Array.isArray(config.marmitas) ? config.marmitas : []).filter(
      (item) => cardapioMatchesAvailability(item?.ativo !== false),
    );

    const drinks = (Array.isArray(config.bebidas) ? config.bebidas : []).filter(
      (item) => cardapioMatchesAvailability(item?.ativo !== false),
    );

    const addons = (Array.isArray(config.adicionais) ? config.adicionais : []).filter(
      (item) => cardapioMatchesAvailability(item?.ativo !== false),
    );

    const accompaniments = (
      Array.isArray(config.acompanhamentos) ? config.acompanhamentos : []
    ).filter((item) => cardapioMatchesAvailability(item?.ativo !== false));

    panel.innerHTML = `
      <div class="panel-heading">

        <div>

          <span class="eyebrow">
            PH SABOR &amp; CIA
          </span>

          <h2>
            Cardápio PH
          </h2>

          <p>
            Somente produtos da PH e preferência de salada. Funcionamento foi movido para Loja e horários.
          </p>

        </div>

        <div
          style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
          "
        >

          <button
            class="btn btn-secondary"
            data-ph-config-reload
            type="button"
          >
            Atualizar dados PH
          </button>

          <button
            class="btn btn-primary"
            data-ph-aplicar-atualizacao-cardapio
            type="button"
          >
            Aplicar atualização PH
          </button>

        </div>

      </div>

      <div
        style="
          margin-bottom:24px;
        "
      >

        <h3
          style="
            margin-bottom:12px;
          "
        >
          Marmitas
        </h3>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
            gap:14px;
          "
        >
          ${phConfigCards(meals, "marmita")}
        </div>

      </div>

      <div
        style="
          margin-bottom:24px;
        "
      >

        <h3
          style="
            margin-bottom:12px;
          "
        >
          Bebidas
        </h3>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
            gap:14px;
          "
        >
          ${phConfigCards(drinks, "bebida")}
        </div>

      </div>

      <div
        style="
          margin-bottom:24px;
        "
      >

        <h3
          style="
            margin-bottom:12px;
          "
        >
          Adicionais
        </h3>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
            gap:14px;
          "
        >
          ${phConfigCards(addons, "adicional")}
        </div>

      </div>

      <div>

        <h3
          style="
            margin-bottom:12px;
          "
        >
          Salada das marmitas
        </h3>

        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
            gap:14px;
          "
        >

          ${
            accompaniments.length
              ? accompaniments
                  .map(
                    (item) => `
                      <article class="data-card">

                        <div class="data-card-head">

                          <div>

                            <h3>
                              ${escapeHtml(item.nome)}
                            </h3>

                            <p>
                              Preferência de salada
                            </p>

                          </div>

                          <span
                            class="small-badge ${
                              item.ativo !== false ? "active" : "inactive"
                            }"
                          >
                            ${item.ativo !== false ? "Ativo" : "Inativo"}
                          </span>

                        </div>

                        <div class="data-card-actions">

                          <button
                            class="btn btn-secondary"
                            data-ph-edit-accompaniment="${escapeHtml(item.id)}"
                            type="button"
                          >
                            Editar
                          </button>

                        </div>

                      </article>
                    `,
                  )
                  .join("")
              : `
                <div class="empty-state">
                  Nenhuma opção de salada cadastrada.
                </div>
              `
          }

        </div>

      </div>
    `;
  }

  function criarTamanhoPhAtualizacao(
    nome,
    capacidadeMl,
    descricao,
    preco,
    ativo,
  ) {
    return {
      nome,
      capacidade_ml: capacidadeMl,
      descricao,
      preco,
      ativo,
    };
  }

  function normalizarConfiguracaoPhAtualizacao20260819(config) {
    const next = JSON.parse(JSON.stringify(config || {}));

    let changed = false;

    if (!Array.isArray(next.marmitas)) {
      next.marmitas = [];

      changed = true;
    }

    if (!Array.isArray(next.acompanhamentos)) {
      next.acompanhamentos = [];

      changed = true;
    }

    const descricoes = {
      "linguica-toscana":
        "Arroz, feijão e linguiça toscana preparada na chapa. Salada opcional, sem alteração no valor da marmita.",

      "calabresa-acebolada":
        "Arroz, feijão e calabresa em rodelas preparada com cebola. Salada opcional, sem alteração no valor da marmita.",

      "file-de-frango":
        "Arroz, feijão e filé de frango grelhado. Salada opcional, sem alteração no valor da marmita.",

      bisteca:
        "Arroz, feijão e bisteca suína preparada na chapa. Salada opcional, sem alteração no valor da marmita.",

      "bife-acebolado":
        "Arroz, feijão e bife bovino acebolado. Salada opcional, sem alteração no valor da marmita.",

      omelete:
        "Arroz, feijão e omelete preparado na hora. Salada opcional, sem alteração no valor da marmita.",

      "parmegiana-carne":
        "Arroz, feijão e parmegiana de carne com molho de tomate e queijo. Salada opcional, sem alteração no valor da marmita.",

      "parmegiana-frango":
        "Arroz, feijão e parmegiana de frango com molho de tomate e queijo. Salada opcional, sem alteração no valor da marmita.",

      figado:
        "Arroz, feijão e fígado acebolado preparado na chapa. Salada opcional, sem alteração no valor da marmita.",

      "contra-file":
        "Arroz, feijão e contra filé preparado na chapa. Salada opcional, sem alteração no valor da marmita.",

      picadinho:
        "Arroz, feijão e picadinho. Salada opcional, sem alteração no valor da marmita.",
    };

    next.marmitas.forEach((item) => {
      const descricao = descricoes[String(item?.id || "")];

      if (descricao && String(item.descricao || "") !== descricao) {
        item.descricao = descricao;

        changed = true;
      }
    });

    const novasMarmitas = [
      {
        id: "picadinho",

        nome: "Picadinho",

        descricao: descricoes.picadinho,

        ativo: true,

        tamanhos: [
          criarTamanhoPhAtualizacao("P", 500, "Rasa", 15, true),

          criarTamanhoPhAtualizacao("M", 750, "Média", 22, true),

          criarTamanhoPhAtualizacao("G", 1100, "Grande", null, false),
        ],
      },

      {
        id: "contra-file",

        nome: "Contra Filé",

        descricao: descricoes["contra-file"],

        ativo: true,

        tamanhos: [
          criarTamanhoPhAtualizacao("P", 500, "Rasa", 18, true),

          criarTamanhoPhAtualizacao("M", 750, "Média", 28, true),

          criarTamanhoPhAtualizacao("G", 1100, "Grande", null, false),
        ],
      },
    ];

    novasMarmitas.forEach((nova) => {
      const existente = next.marmitas.find(
        (item) => String(item?.id || "") === nova.id,
      );

      if (!existente) {
        next.marmitas.push(nova);

        changed = true;

        return;
      }

      if (!Array.isArray(existente.tamanhos)) {
        existente.tamanhos = [];

        changed = true;
      }

      nova.tamanhos.forEach((padrao) => {
        const atual = existente.tamanhos.find(
          (tamanho) =>
            Number(tamanho?.capacidade_ml) === Number(padrao.capacidade_ml),
        );

        if (!atual) {
          existente.tamanhos.push(padrao);

          changed = true;
        }
      });
    });

    const salada = next.acompanhamentos.find(
      (item) =>
        normalizeKey(item?.id) === "salada" ||
        normalizeKey(item?.nome) === "salada" ||
        normalizeKey(item?.nome) === "com salada",
    );

    if (salada) {
      if (salada.nome !== "Com salada") {
        salada.nome = "Com salada";

        changed = true;
      }

      if (salada.ativo === false) {
        salada.ativo = true;

        changed = true;
      }
    } else {
      next.acompanhamentos.push({
        id: "salada",

        nome: "Com salada",

        ativo: true,
      });

      changed = true;
    }

    const semSalada = next.acompanhamentos.find(
      (item) =>
        normalizeKey(item?.id) === "sem salada" ||
        normalizeKey(item?.nome) === "sem salada",
    );

    if (semSalada) {
      if (semSalada.nome !== "Sem salada") {
        semSalada.nome = "Sem salada";

        changed = true;
      }

      if (semSalada.ativo === false) {
        semSalada.ativo = true;

        changed = true;
      }
    } else {
      next.acompanhamentos.push({
        id: "sem-salada",

        nome: "Sem salada",

        ativo: true,
      });

      changed = true;
    }

    next.acompanhamentos.forEach((item) => {
      if (
        normalizeKey(item?.id) === "batata" ||
        normalizeKey(item?.nome) === "batata"
      ) {
        if (item.ativo !== false) {
          item.ativo = false;

          changed = true;
        }
      }
    });

    return {
      next,
      changed,
    };
  }

  async function aplicarAtualizacaoCardapioPh20260819() {
    if (!state.phConfig) {
      state.phConfig = await rpc("obter_configuracao_ph_admin");
    }

    const { next, changed } = normalizarConfiguracaoPhAtualizacao20260819(
      state.phConfig,
    );

    if (!changed) {
      showMessage("A atualização da PH já está aplicada.");

      return;
    }

    try {
      localStorage.setItem(
        "ph-config-backup-20260819",

        JSON.stringify(state.phConfig),
      );
    } catch (error) {
      console.warn("Não foi possível salvar o backup local da PH.", error);
    }

    await savePhConfig(
      next,
      "Cardápio PH atualizado: Contra Filé, Picadinho e nova regra de salada aplicados.",
    );
  }

  async function loadPhConfig(message = "") {
    state.phConfig = await rpc("obter_configuracao_ph_admin");

    renderPhConfigPanel();

    if (message) {
      showMessage(message);
    }
  }

  async function savePhConfig(nextConfig, message) {
    const result = await rpc(
      "salvar_configuracao_ph_admin",

      {
        p_dados: nextConfig,
      },
    );

    state.phConfig = result?.dados || nextConfig;

    renderPhConfigPanel();

    showMessage(message);
  }

  async function savePhStoreConfig(event) {
    event.preventDefault();

    if (!state.phConfig || !el.phStoreConfigForm) {
      return;
    }

    const form = new FormData(el.phStoreConfigForm);
    const next = clonePhConfig();
    const currentStore = next.loja || {};
    const currentSchedule = currentStore.horario || {};

    next.loja = {
      ...currentStore,
      nome: String(form.get("nome") || "").trim(),
      whatsapp: String(form.get("whatsapp") || "").trim(),
      instagram: String(form.get("instagram") || "").trim(),
      pedido_minimo: Number(form.get("pedido_minimo") || 0),
      limite_entrega_km: Number(form.get("limite_entrega_km") || 0),
      retirada_ativa: form.get("retirada_ativa") === "on",
      endereco: {
        ...(currentStore.endereco || {}),
        rua: String(form.get("rua") || "").trim(),
        numero: String(form.get("numero") || "").trim(),
        bairro: String(form.get("bairro") || "").trim(),
        cidade: String(form.get("cidade") || "").trim(),
        estado: String(form.get("estado") || "").trim(),
        pais: String(form.get("pais") || "").trim(),
      },
      horario: {
        ...currentSchedule,
        fuso_horario: String(form.get("fuso_horario") || "").trim(),
      },
    };

    await savePhConfig(next, "Configuração da PH atualizada.");
  }

  async function savePhSchedule(button) {
    if (!state.phConfig) {
      return;
    }

    const row = button.closest("[data-ph-day]");

    if (!row) {
      return;
    }

    const dayKey = normalizePhDayKey(row.dataset.phDay);
    const active = row.querySelector("[data-ph-active]")?.checked === true;
    const opening = row.querySelector("[data-ph-open]")?.value || "";
    const closing = row.querySelector("[data-ph-close]")?.value || "";

    if (active && (!opening || !closing)) {
      throw new Error("Informe abertura e fechamento para o dia ativo.");
    }

    const weekly = getPhWeeklySchedules().map((item) =>
      item.key === dayKey
        ? {
            ...item,
            ativo: active,
            abertura: opening,
            fechamento: closing,
          }
        : item,
    );

    const next = clonePhConfig();
    const currentStore = next.loja || {};
    const currentSchedule = currentStore.horario || {};
    const activeSchedules = weekly.filter((item) => item.ativo);
    const firstActive = activeSchedules[0] || null;

    next.loja = {
      ...currentStore,
      horario: {
        ...currentSchedule,
        dias: activeSchedules.map((item) => item.key),
        horarios_semana: weekly.map((item) => ({
          dia: item.key,
          nome_dia: item.label,
          ativo: item.ativo,
          abertura: item.abertura,
          fechamento: item.fechamento,
        })),
        abertura: firstActive?.abertura || currentSchedule.abertura || "11:00",
        fechamento:
          firstActive?.fechamento || currentSchedule.fechamento || "18:00",
      },
    };

    button.disabled = true;

    try {
      await savePhConfig(next, `${row.querySelector("strong")?.textContent?.trim() || "Dia"} atualizado.`);
    } finally {
      button.disabled = false;
    }
  }

  function openPhStoreModal() {
    if (!state.phConfig) {
      return;
    }

    const store = state.phConfig.loja || {};

    const address = store.endereco || {};

    const schedule = store.horario || {};

    openModal({
      title: "Editar PH Sabor & Cia",

      fields: [
        {
          name: "nome",

          label: "Nome da loja",

          value: store.nome || "PH Sabor & Cia",

          required: true,
        },

        {
          name: "whatsapp",

          label: "WhatsApp",

          value: store.whatsapp || "",

          required: true,
        },

        {
          name: "instagram",

          label: "Instagram",

          value: store.instagram || "",
        },

        {
          name: "pedido_minimo",

          label: "Pedido mínimo",

          type: "number",

          step: "0.01",

          value: store.pedido_minimo ?? 0,

          required: true,
        },

        {
          name: "limite_entrega_km",

          label: "Limite de entrega em km",

          type: "number",

          step: "0.1",

          value: store.limite_entrega_km ?? 0,

          required: true,
        },

        {
          name: "retirada_ativa",

          label: "Retirada no local ativa",

          type: "checkbox",

          value: store.retirada_ativa !== false,
        },

        {
          name: "abertura",

          label: "Horário de abertura",

          type: "time",

          value: schedule.abertura || "",

          required: true,
        },

        {
          name: "fechamento",

          label: "Horário de fechamento",

          type: "time",

          value: schedule.fechamento || "",

          required: true,
        },

        {
          name: "fuso_horario",

          label: "Fuso horário",

          value: schedule.fuso_horario || "America/Sao_Paulo",

          required: true,
        },

        {
          name: "rua",

          label: "Rua",

          value: address.rua || "",

          required: true,
        },

        {
          name: "numero",

          label: "Número",

          value: address.numero || "",

          required: true,
        },

        {
          name: "bairro",

          label: "Bairro",

          value: address.bairro || "",

          required: true,
        },

        {
          name: "cidade",

          label: "Cidade",

          value: address.cidade || "",

          required: true,
        },

        {
          name: "estado",

          label: "Estado",

          value: address.estado || "",

          required: true,
        },

        {
          name: "pais",

          label: "País",

          value: address.pais || "Brasil",

          required: true,
        },
      ],

      submitText: "Salvar PH",

      onSubmit: async (values) => {
        const next = clonePhConfig();

        const currentStore = next.loja || {};

        next.loja = {
          ...currentStore,

          nome: String(values.nome || "").trim(),

          whatsapp: String(values.whatsapp || "").trim(),

          instagram: String(values.instagram || "").trim(),

          pedido_minimo: Number(values.pedido_minimo),

          limite_entrega_km: Number(values.limite_entrega_km),

          retirada_ativa: values.retirada_ativa,

          endereco: {
            ...(currentStore.endereco || {}),

            rua: String(values.rua || "").trim(),

            numero: String(values.numero || "").trim(),

            bairro: String(values.bairro || "").trim(),

            cidade: String(values.cidade || "").trim(),

            estado: String(values.estado || "").trim(),

            pais: String(values.pais || "").trim(),
          },

          horario: {
            ...(currentStore.horario || {}),

            abertura: values.abertura,

            fechamento: values.fechamento,

            fuso_horario: String(values.fuso_horario || "").trim(),
          },
        };

        await savePhConfig(next, "Configuração da PH atualizada.");
      },
    });
  }

  function openPhMealModal(item) {
    if (!item) {
      return;
    }

    const sizes = Array.isArray(item.tamanhos) ? item.tamanhos : [];

    openModal({
      title: `Editar ${item.nome}`,

      fields: [
        {
          name: "nome",

          label: "Nome do prato",

          value: item.nome || "",

          required: true,
        },

        {
          name: "descricao",

          label: "Descrição",

          type: "textarea",

          value: item.descricao || "",

          full: true,
        },

        {
          name: "ativo",

          label: "Disponível para pedidos",

          type: "checkbox",

          value: item.ativo !== false,
        },

        ...sizes.flatMap((size, index) => [
          {
            name: `ativo_${index}`,

            label: `Tamanho ${size.nome || ""} • ${size.capacidade_ml} ml disponível`,

            type: "checkbox",

            value: size.ativo !== false,
          },

          {
            name: `preco_${index}`,

            label: `Preço ${size.nome || ""} • ${size.capacidade_ml} ml`,

            type: "number",

            step: "0.01",

            value: size.preco ?? "",
          },
        ]),
      ],

      submitText: "Salvar marmita",

      onSubmit: async (values) => {
        const next = clonePhConfig();

        const target = (next.marmitas || []).find(
          (current) => String(current.id) === String(item.id),
        );

        if (!target) {
          throw new Error(
            "A marmita não foi encontrada na configuração da PH.",
          );
        }

        target.nome = String(values.nome || "").trim();

        target.descricao = String(values.descricao || "").trim();

        target.ativo = values.ativo;

        target.tamanhos = (target.tamanhos || []).map((size, index) => ({
          ...size,

          ativo: values[`ativo_${index}`] !== false,

          preco:
            values[`preco_${index}`] === ""
              ? null
              : Number(values[`preco_${index}`]),
        }));

        await savePhConfig(next, `${target.nome} atualizado na PH.`);
      },
    });
  }

  function openPhSimpleItemModal(type, item) {
    if (!item) {
      return;
    }

    const isDrink = type === "bebida";

    const collectionKey = isDrink ? "bebidas" : "adicionais";

    openModal({
      title: `Editar ${item.nome}`,

      fields: [
        {
          name: "nome",

          label: isDrink ? "Nome da bebida" : "Nome do adicional",

          value: item.nome || "",

          required: true,
        },

        {
          name: "preco",

          label: "Preço",

          type: "number",

          step: "0.01",

          value: item.preco ?? "",
        },

        {
          name: "ativo",

          label: "Disponível para pedidos",

          type: "checkbox",

          value: item.ativo !== false,
        },
      ],

      submitText: "Salvar",

      onSubmit: async (values) => {
        const next = clonePhConfig();

        const target = (next[collectionKey] || []).find(
          (current) => String(current.id) === String(item.id),
        );

        if (!target) {
          throw new Error("O item não foi encontrado na configuração da PH.");
        }

        target.nome = String(values.nome || "").trim();

        target.preco = values.preco === "" ? null : Number(values.preco);

        target.ativo = values.ativo;

        await savePhConfig(next, `${target.nome} atualizado na PH.`);
      },
    });
  }

  function openPhAccompanimentModal(item) {
    if (!item) {
      return;
    }

    openModal({
      title: `Editar ${item.nome}`,

      fields: [
        {
          name: "nome",

          label: "Opção de salada",

          value: item.nome || "",

          required: true,
        },

        {
          name: "ativo",

          label: "Disponível para pedidos",

          type: "checkbox",

          value: item.ativo !== false,
        },
      ],

      submitText: "Salvar opção",

      onSubmit: async (values) => {
        const next = clonePhConfig();

        const target = (next.acompanhamentos || []).find(
          (current) => String(current.id) === String(item.id),
        );

        if (!target) {
          throw new Error(
            "A opção de salada não foi encontrada na configuração da PH.",
          );
        }

        target.nome = String(values.nome || "").trim();

        target.ativo = values.ativo;

        await savePhConfig(next, `${target.nome} atualizado na PH.`);
      },
    });
  }

  function openPhDeliveryBandsModal() {
    if (!state.phConfig) {
      return;
    }

    const bands = Array.isArray(state.phConfig?.loja?.faixas_entrega)
      ? state.phConfig.loja.faixas_entrega
      : [];

    if (!bands.length) {
      showMessage("A PH não possui faixas de entrega cadastradas.", "warning");

      return;
    }

    const fields = [];

    bands.forEach((band, index) => {
      fields.push(
        {
          name: `ate_km_${index}`,

          label: `Faixa ${index + 1} • até quantos km`,

          type: "number",

          step: "0.1",

          value: band.ate_km,

          required: true,
        },

        {
          name: `taxa_${index}`,

          label: `Faixa ${index + 1} • taxa`,

          type: "number",

          step: "0.01",

          value: band.taxa,

          required: true,
        },
      );
    });

    openModal({
      title: "Taxas de entrega da PH",

      fields,

      submitText: "Salvar taxas",

      onSubmit: async (values) => {
        const next = clonePhConfig();

        next.loja = {
          ...(next.loja || {}),

          faixas_entrega: bands.map((band, index) => ({
            ...band,

            ate_km: Number(values[`ate_km_${index}`]),

            taxa: Number(values[`taxa_${index}`]),
          })),
        };

        await savePhConfig(next, "Taxas de entrega da PH atualizadas.");
      },
    });
  }

  async function reloadOperation(message) {
    state.operacao = await rpc("listar_operacao_admin");

    renderOperationSections();

    renderOverview();

    if (message) {
      showMessage(message);
    }
  }

  function commonBooleanFields(item) {
    return [
      {
        name: "disponivel",

        label: "Disponível",

        type: "checkbox",

        value: item.disponivel,
      },

      {
        name: "visivel",

        label: "Visível",

        type: "checkbox",

        value: item.visivel,
      },
    ];
  }

  function openSizeModal(item) {
    openModal({
      title: `Editar ${item.tamanho_ml} ml`,

      fields: [
        {
          name: "nome",

          label: "Nome",

          value: item.nome,

          required: true,
        },

        {
          name: "descricao",

          label: "Descrição",

          type: "textarea",

          value: item.descricao,

          required: true,

          full: true,
        },

        {
          name: "preco_base",

          label: "Preço base",

          type: "number",

          step: "0.01",

          value: item.preco_base,

          required: true,
        },

        {
          name: "badge",

          label: "Badge",

          value: item.badge || "",
        },

        ...commonBooleanFields(item),

        {
          name: "ordem",

          label: "Ordem",

          type: "number",

          value: item.ordem,

          required: true,
        },
      ],

      onSubmit: async (values) => {
        await rpc(
          "atualizar_tamanho_admin",

          {
            p_dados: {
              id: item.id,

              ...values,
            },
          },
        );

        await reloadOperation("Tamanho atualizado.");
      },
    });
  }

  function openAzuryBoxModal(item) {
    if (!item) {
      return;
    }

    openModal({
      title: `Editar ${item.nome}`,

      fields: [
        {
          name: "nome",
          label: "Nome",
          value: item.nome,
          required: true,
        },
        {
          name: "preco",
          label: "Preço",
          type: "number",
          step: "0.01",
          value: item.preco,
          required: true,
        },
        {
          name: "limite",
          label: "Complementos incluídos",
          type: "number",
          value: item.limite,
          required: true,
        },
        ...commonBooleanFields(item),
        {
          name: "ordem",
          label: "Ordem",
          type: "number",
          value: item.ordem,
          required: true,
        },
      ],

      submitText: "Salvar Azury Box",

      onSubmit: async (values) => {
        await rpc("atualizar_azury_box_admin", {
          p_dados: {
            key: item.key,
            ...values,
          },
        });

        await reloadOperation("Azury Box atualizada.");
      },
    });
  }

  function openComplementModal(item = null) {
    const editing = Boolean(item);

    openModal({
      title: editing ? `Editar ${item.nome}` : "Novo complemento",

      fields: [
        {
          name: "nome",

          label: "Nome",

          value: item?.nome || "",

          required: true,
        },

        {
          name: "preco",

          label: "Preço",

          type: "number",

          step: "0.01",

          value: item?.preco ?? "",

          required: true,
        },

        {
          name: "disponivel",

          label: "Disponível",

          type: "checkbox",

          value: item?.disponivel ?? true,
        },

        {
          name: "visivel",

          label: "Visível",

          type: "checkbox",

          value: item?.visivel ?? true,
        },

        {
          name: "ordem",

          label: "Ordem",

          type: "number",

          value: item?.ordem ?? 0,

          required: true,
        },
      ],

      onSubmit: async (values) => {
        await rpc(
          editing ? "atualizar_complemento_admin" : "criar_complemento_admin",

          {
            p_dados: editing
              ? {
                  id: item.id,

                  ...values,
                }
              : values,
          },
        );

        await reloadOperation(
          editing ? "Complemento atualizado." : "Complemento criado.",
        );
      },
    });
  }

  function openNeighborhoodModal(item = null) {
    const editing = Boolean(item);

    openModal({
      title: editing ? `Editar ${item.nome}` : "Novo bairro",

      fields: [
        {
          name: "nome",

          label: "Nome",

          value: item?.nome || "",

          required: true,
        },

        {
          name: "taxa",

          label: "Taxa de entrega",

          type: "number",

          step: "0.01",

          value: item?.taxa ?? "",

          required: true,
        },

        {
          name: "aliases",

          label: "Aliases separados por vírgula",

          value: (item?.aliases || []).join(", "),

          full: true,
        },

        {
          name: "ativo",

          label: "Ativo",

          type: "checkbox",

          value: item?.ativo ?? true,
        },

        {
          name: "ordem",

          label: "Ordem",

          type: "number",

          value: item?.ordem ?? 0,

          required: true,
        },
      ],

      transform: (values) => ({
        ...values,

        aliases: String(values.aliases || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      }),

      onSubmit: async (values) => {
        await rpc(
          editing ? "atualizar_bairro_admin" : "criar_bairro_admin",

          {
            p_dados: editing
              ? {
                  id: item.id,

                  ...values,
                }
              : values,
          },
        );

        await reloadOperation(
          editing ? "Bairro atualizado." : "Bairro criado.",
        );
      },
    });
  }

  function rewardFields(item = null) {
    return [
      {
        name: "slug",

        label: "Slug",

        value: item?.slug || "",

        required: true,
      },

      {
        name: "tipo",

        label: "Tipo",

        type: "select",

        value: item?.tipo || "acai",

        options: [
          {
            value: "acai",

            label: "Açaí",
          },

          {
            value: "cupom",

            label: "Cupom",
          },
        ],
      },

      {
        name: "titulo",

        label: "Título",

        value: item?.titulo || "",

        required: true,
      },

      {
        name: "descricao",

        label: "Descrição",

        type: "textarea",

        value: item?.descricao || "",

        required: true,

        full: true,
      },

      {
        name: "pontos_necessarios",

        label: "Pontos necessários",

        type: "number",

        value: item?.pontos_necessarios ?? "",

        required: true,
      },

      {
        name: "tamanho_ml",

        label: "Tamanho em ml (açaí)",

        type: "number",

        value: item?.tamanho_ml ?? "",
      },

      {
        name: "limite_complementos",

        label: "Limite de complementos",

        type: "number",

        value: item?.limite_complementos ?? "",
      },

      {
        name: "quantidade_copos",

        label: "Quantidade de copos",

        type: "number",

        value: item?.quantidade_copos ?? 1,
      },

      {
        name: "percentual_desconto",

        label: "Desconto % (cupom)",

        type: "number",

        step: "0.01",

        value: item?.percentual_desconto ?? "",
      },

      {
        name: "limite_mensal",

        label: "Limite mensal",

        type: "number",

        value: item?.limite_mensal ?? "",
      },

      {
        name: "ativo",

        label: "Ativa",

        type: "checkbox",

        value: item?.ativo ?? true,
      },

      {
        name: "ordem",

        label: "Ordem",

        type: "number",

        value: item?.ordem ?? 0,
      },
    ];
  }

  function openRewardModal(item = null) {
    const editing = Boolean(item);

    openModal({
      title: editing ? `Editar ${item.titulo}` : "Nova recompensa",

      fields: rewardFields(item),

      transform: (values) => {
        [
          "tamanho_ml",
          "limite_complementos",
          "percentual_desconto",
          "limite_mensal",
        ].forEach((key) => {
          if (values[key] === "") {
            values[key] = null;
          }
        });

        return values;
      },

      onSubmit: async (values) => {
        await rpc(
          editing ? "atualizar_recompensa_admin" : "criar_recompensa_admin",

          {
            p_dados: editing
              ? {
                  id: item.id,

                  ...values,
                }
              : values,
          },
        );

        await reloadOperation(
          editing ? "Recompensa atualizada." : "Recompensa criada.",
        );
      },
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

      mensagem_pausa: form.get("mensagem_pausa") || null,
    };

    try {
      await rpc(
        "atualizar_configuracao_loja_admin",

        {
          p_dados: data,
        },
      );

      await reloadOperation("Configuração da loja atualizada.");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function saveSchedule(button) {
    const row = button.closest("[data-day]");

    const active = row.querySelector("[data-active]").checked;

    const data = {
      dia_semana: Number(row.dataset.day),

      ativo: active,

      abre_as: row.querySelector("[data-open]").value || null,

      fecha_as: row.querySelector("[data-close]").value || null,
    };

    button.disabled = true;

    try {
      await rpc(
        "atualizar_horario_admin",

        {
          p_dados: data,
        },
      );

      await reloadOperation("Horário atualizado.");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  }

  async function loadTeam() {
    setLoading(el.teamList, "Carregando equipe...");

    const data = await rpc(
      "listar_administradores_admin",

      {
        p_busca: null,

        p_ativo: null,

        p_limite: 100,

        p_offset: 0,
      },
    );

    state.equipe = data.administradores || [];

    state.resumoEquipe = data.resumo || {};

    renderTeam();
  }

  function renderTeam() {
    const r = state.resumoEquipe;

    el.teamSummary.innerHTML = [
      metricCard("🛡️", r.total ?? 0, "Membros"),

      metricCard("👑", r.proprietarios ?? 0, "Proprietários"),

      metricCard("⚙️", r.administradores ?? 0, "Administradores"),

      metricCard("🎧", r.atendentes ?? 0, "Atendentes"),
    ].join("");

    if (!state.equipe.length) {
      return setEmpty(el.teamList, "Nenhum administrador encontrado.");
    }

    el.teamList.innerHTML = state.equipe
      .map(
        (item) => `
            <article class="data-card">

              <div class="data-card-head">

                <div>

                  <h3>
                    ${escapeHtml(item.nome_exibicao)}
                  </h3>

                  <p class="card-email">
                    ${escapeHtml(item.email)}
                  </p>

                </div>

                <span
                  class="small-badge ${item.ativo ? "active" : "inactive"}"
                >
                  ${item.ativo ? "Ativo" : "Inativo"}
                </span>

              </div>

              <div class="data-pairs">

                <div class="data-pair">

                  <span>
                    Nível
                  </span>

                  <strong>
                    ${escapeHtml(item.nivel_acesso)}
                  </strong>

                </div>

                <div class="data-pair">

                  <span>
                    Último login
                  </span>

                  <strong>
                    ${escapeHtml(formatDate(item.ultimo_login_em))}
                  </strong>

                </div>

              </div>

              <div class="data-card-actions">

                <button
                  class="btn btn-secondary"
                  data-edit-team="${item.usuario_id}"
                  type="button"
                >
                  Gerenciar
                </button>

              </div>

            </article>
          `,
      )
      .join("");
  }

  function openTeamModal(item = null) {
    const editing = Boolean(item);

    const fields = editing
      ? [
          {
            name: "email",

            label: "E-mail da conta",

            type: "email",

            value: item.email || "",

            disabled: true,

            full: true,
          },

          {
            name: "nome_exibicao",

            label: "Nome de exibição",

            value: item.nome_exibicao || "",
          },

          {
            name: "nivel_acesso",

            label: "Nível",

            type: "select",

            value: item.nivel_acesso || "atendente",

            options: [
              {
                value: "proprietario",

                label: "Proprietário",
              },

              {
                value: "administrador",

                label: "Administrador",
              },

              {
                value: "atendente",

                label: "Atendente",
              },
            ],
          },

          {
            name: "ativo",

            label: "Acesso ativo",

            type: "checkbox",

            value: item.ativo ?? true,
          },

          {
            name: "observacao",

            label: "Observação / motivo",

            type: "textarea",

            full: true,
          },
        ]
      : [
          {
            name: "email",

            label: "E-mail da conta cadastrada",

            type: "email",

            required: true,

            full: true,
          },

          {
            name: "nome_exibicao",

            label: "Nome de exibição",
          },

          {
            name: "nivel_acesso",

            label: "Nível",

            type: "select",

            value: "atendente",

            options: [
              {
                value: "proprietario",

                label: "Proprietário",
              },

              {
                value: "administrador",

                label: "Administrador",
              },

              {
                value: "atendente",

                label: "Atendente",
              },
            ],
          },

          {
            name: "ativo",

            label: "Acesso ativo",

            type: "checkbox",

            value: true,
          },

          {
            name: "observacao",

            label: "Observação / motivo",

            type: "textarea",

            full: true,
          },
        ];

    openModal({
      title: editing ? `Gerenciar ${item.nome_exibicao}` : "Adicionar à equipe",

      fields,

      onSubmit: async (values) => {
        if (editing) {
          await rpc(
            "gerenciar_administrador_admin",

            {
              p_usuario_id: item.usuario_id,

              p_nivel_acesso: values.nivel_acesso,

              p_ativo: values.ativo,

              p_nome_exibicao: values.nome_exibicao || null,

              p_observacao: values.observacao || null,
            },
          );
        } else {
          await rpc(
            "gerenciar_administrador_por_email_admin",

            {
              p_email: String(values.email || "")
                .trim()
                .toLowerCase(),

              p_nivel_acesso: values.nivel_acesso,

              p_ativo: values.ativo,

              p_nome_exibicao: values.nome_exibicao || null,

              p_observacao: values.observacao || null,
            },
          );
        }

        await loadTeam();

        showMessage(editing ? "Acesso atualizado." : "Membro adicionado.");
      },
    });
  }

  async function loadAudit() {
    setLoading(el.auditList, "Carregando auditoria...");

    const data = await rpc(
      "listar_auditoria_admin",

      {
        p_entidade: el.auditEntityFilter.value || null,

        p_limite: 100,

        p_offset: 0,
      },
    );

    state.auditoria = data.registros || [];

    renderAudit();
  }

  function renderAudit() {
    if (!state.auditoria.length) {
      return setEmpty(
        el.auditList,
        "Nenhuma ação registrada para este filtro.",
      );
    }

    el.auditList.innerHTML = state.auditoria
      .map(
        (item) => `
            <article class="timeline-item">

              <span class="timeline-dot"></span>

              <div>

                <h3>
                  ${escapeHtml(item.acao || "Ação administrativa")}
                </h3>

                <p>
                  ${escapeHtml(item.observacao || "Sem observação")}
                </p>

                <p>

                  <strong>
                    ${escapeHtml(item.administrador_nome || "Administrador")}
                  </strong>

                  •

                  ${escapeHtml(item.entidade || "")}

                  ${
                    item.entidade_id ? ` • ${escapeHtml(item.entidade_id)}` : ""
                  }

                </p>

                <p>
                  ${escapeHtml(formatDate(item.criado_em))}
                </p>

              </div>

            </article>
          `,
      )
      .join("");
  }

  function fieldHtml(field) {
    const className = `modal-field${field.full ? " full" : ""}`;

    const disabled = field.disabled ? "disabled" : "";

    const required = field.required ? "required" : "";

    if (field.type === "checkbox") {
      return `
        <label
          class="${className} switch-field"
        >

          <input
            name="${escapeHtml(field.name)}"
            type="checkbox"
            ${field.value ? "checked" : ""}
            ${disabled}
          >

          <span>
            ${escapeHtml(field.label)}
          </span>

        </label>
      `;
    }

    if (field.type === "textarea") {
      return `
        <label class="${className}">

          <span>
            ${escapeHtml(field.label)}
          </span>

          <textarea
            name="${escapeHtml(field.name)}"
            ${required}
            ${disabled}
          >${escapeHtml(field.value || "")}</textarea>

        </label>
      `;
    }

    if (field.type === "select") {
      return `
        <label class="${className}">

          <span>
            ${escapeHtml(field.label)}
          </span>

          <select
            name="${escapeHtml(field.name)}"
            ${required}
            ${disabled}
          >

            ${(field.options || [])
              .map(
                (option) => `
                    <option
                      value="${escapeHtml(option.value)}"
                      ${
                        String(option.value) === String(field.value)
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHtml(option.label)}
                    </option>
                  `,
              )
              .join("")}

          </select>

        </label>
      `;
    }

    return `
      <label class="${className}">

        <span>
          ${escapeHtml(field.label)}
        </span>

        <input
          name="${escapeHtml(field.name)}"
          type="${escapeHtml(field.type || "text")}"
          value="${escapeHtml(field.value ?? "")}"
          ${field.step ? `step="${escapeHtml(field.step)}"` : ""}
          ${field.minLength ? `minlength="${escapeHtml(field.minLength)}"` : ""}
          ${required}
          ${disabled}
        >

      </label>
    `;
  }

  function openModal(config) {
    state.modalSubmit = config;

    el.modalTitle.textContent = config.title || "Editar";

    const message = config.message
      ? `
          <div
            class="modal-confirmation ${escapeHtml(
              config.messageType || "info",
            )}"
            role="note"
          >

            <span
              class="modal-confirmation-icon"
              aria-hidden="true"
            >
              ${
                config.messageType === "success"
                  ? "✓"
                  : config.messageType === "warning"
                    ? "!"
                    : "i"
              }
            </span>

            <p>
              ${escapeHtml(config.message)}
            </p>

          </div>
        `
      : "";

    el.dynamicModalForm.innerHTML = `
      ${message}

      ${(config.fields || []).map(fieldHtml).join("")}

      <div class="modal-actions">

        <button
          class="btn btn-secondary"
          data-modal-cancel
          type="button"
        >
          Cancelar
        </button>

        <button
          class="btn ${config.submitClass || "btn-primary"}"
          type="submit"
        >
          ${escapeHtml(config.submitText || "Salvar")}
        </button>

      </div>
    `;

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

    if (!state.modalSubmit) {
      return;
    }

    const submitButton = el.dynamicModalForm.querySelector(
      "button[type='submit']",
    );

    if (!submitButton) {
      return;
    }

    submitButton.disabled = true;

    submitButton.textContent = "Salvando...";

    if (state.modalSubmit.customSubmit) {
      try {
        await state.modalSubmit.customSubmit(el.dynamicModalForm);

        closeModal();
      } catch (error) {
        console.error(error);

        showMessage(error.message, "error");

        submitButton.disabled = false;

        submitButton.textContent = state.modalSubmit.submitText || "Salvar";
      }

      return;
    }

    if (!state.modalSubmit.onSubmit) {
      submitButton.disabled = false;

      submitButton.textContent = state.modalSubmit.submitText || "Salvar";

      return;
    }

    const form = new FormData(el.dynamicModalForm);

    const values = {};

    for (const field of state.modalSubmit.fields || []) {
      const control = el.dynamicModalForm.elements[field.name];

      if (field.disabled && field.value !== undefined) {
        values[field.name] = field.value;
      } else if (field.type === "checkbox") {
        values[field.name] = control.checked;
      } else if (field.type === "number") {
        values[field.name] = control.value === "" ? "" : Number(control.value);
      } else {
        values[field.name] = form.get(field.name) ?? "";
      }
    }

    const finalValues = state.modalSubmit.transform
      ? state.modalSubmit.transform(values)
      : values;

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


  // =========================================================
  // CONTEÚDO — CENTRAL COMPLETA DE POSTS AZURY / PH
  // =========================================================

  const CONTEUDO_TYPE_META = Object.freeze({
    cardapio_dia: { label: "Cardápio do dia", mode: "multi", title: "CARDÁPIO DO DIA", badge: "HOJE" },
    loja_aberta: { label: "Pedidos liberados", mode: "none", title: "PEDIDOS LIBERADOS!", badge: "LOJA ABERTA", requiresOpen: true },
    promocao: { label: "Promoção / oferta", mode: "single", title: "OFERTA DO DIA", badge: "PROMOÇÃO" },
    produto_destaque: { label: "Produto em destaque", mode: "single", title: "DESTAQUE DO DIA", badge: "VOCÊ VAI AMAR" },
    novidade: { label: "Novidade", mode: "single", title: "NOVIDADE NA ÁREA", badge: "CHEGOU" },
    ultima_chamada: { label: "Última chamada", mode: "none", title: "ÚLTIMA CHAMADA!", badge: "AINDA DÁ TEMPO", requiresOpen: true },
    loja_fechada: { label: "Encerramos por hoje", mode: "none", title: "ENCERRAMOS POR HOJE", badge: "OBRIGADO" },
    agradecimento: { label: "Agradecimento", mode: "none", title: "OBRIGADO PELOS PEDIDOS!", badge: "VOCÊS SÃO DEMAIS" },
    aviso: { label: "Aviso / comunicado", mode: "none", title: "AVISO IMPORTANTE", badge: "COMUNICADO" },
    horarios: { label: "Horários", mode: "none", title: "NOSSO HORÁRIO", badge: "FUNCIONAMENTO" },
    delivery: { label: "Delivery", mode: "none", title: "BATEU VONTADE?", badge: "DELIVERY RÁPIDO" },
    manutencao: { label: "Manutenção / pausa", mode: "none", title: "PAUSA TEMPORÁRIA", badge: "AVISO" },
    recompensas: { label: "Benefícios / recompensas", mode: "none", title: "SER AZURY TEM VANTAGENS", badge: "RECOMPENSAS", azuryOnly: true },
  });

  const CONTEUDO_TEMPLATES = Object.freeze(
    Object.fromEntries(
      Object.keys(CONTEUDO_TYPE_META).map((type) => [
        type,
        [1, 2, 3, 4].map((index) => `${type}-${index}`),
      ]),
    ),
  );

  const CONTEUDO_AZURY_IMAGES = Object.freeze({
    hero: "../Imagens/copo-azury.png",
    box: "../Imagens/azury-box.png",
    300: "../Imagens/Copo vazio de 300ml.png",
    400: "../Imagens/Copo Vazio 400 ml.png",
    500: "../Imagens/Copo vazio 500ml.png",
    700: "../Imagens/Copo vazio 700ml.png",
  });

  const conteudoImageCache = new Map();

  function conteudoLocalDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function conteudoFormatDate(date = new Date()) {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(date);
  }

  function conteudoCompanyMeta(estabelecimento = state.conteudoEstabelecimento) {
    const isPh = estabelecimento === "ph_sabor_cia";
    const phStore = state.phConfig?.loja || {};
    const azuryStore = state.operacao?.configuracao_loja || {};

    return isPh
      ? {
          key: "ph_sabor_cia",
          name: String(phStore.nome || "PH Sabor & Cia").trim(),
          shortName: "PH SABOR & CIA",
          brand: "#ff7a00",
          brand2: "#ffb000",
          accent: "#fff1d6",
          dark: "#160b03",
          soft: "#fff4e8",
          contact: String(phStore.whatsapp || phStore.telefone || state.phConfig?.whatsapp || "").trim(),
          cta: "Peça pelo WhatsApp",
        }
      : {
          key: "azury",
          name: String(azuryStore.nome || "Azury Delivery").trim(),
          shortName: "AZURY",
          brand: "#0051ff",
          brand2: "#0a78ff",
          accent: "#ffc928",
          dark: "#020719",
          soft: "#eef4ff",
          contact: "azurydelivery.com.br",
          cta: "Peça pelo site",
        };
  }

  function conteudoTypeMeta(type = state.conteudoTipo) {
    return CONTEUDO_TYPE_META[type] || CONTEUDO_TYPE_META.cardapio_dia;
  }

  function conteudoOrdersActive(estabelecimento = state.conteudoEstabelecimento) {
    if (estabelecimento === "ph_sabor_cia") {
      return state.phConfig?.loja?.pedidos_ativos !== false;
    }
    return state.operacao?.configuracao_loja?.pedidos_ativos !== false;
  }

  function conteudoCurrentSchedule(estabelecimento = state.conteudoEstabelecimento) {
    const todayIndex = new Date().getDay();

    if (estabelecimento === "ph_sabor_cia") {
      const schedule = getPhWeeklySchedules()[todayIndex];
      if (!schedule || schedule.ativo === false) return { ativo: false, label: "Fechado hoje" };
      return {
        ativo: true,
        abertura: formatTime(schedule.abertura || "11:00"),
        fechamento: formatTime(schedule.fechamento || "18:00"),
        label: `${formatTime(schedule.abertura || "11:00")} às ${formatTime(schedule.fechamento || "18:00")}`,
      };
    }

    const schedules = Array.isArray(state.operacao?.horarios) ? state.operacao.horarios : [];
    const byNumber = schedules.find((item) => Number(item?.dia_semana) === todayIndex);
    const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const todayKey = dayNames[todayIndex];
    const schedule = byNumber || schedules.find((item) => normalizeKey(item?.nome_dia || "").includes(todayKey));
    if (!schedule || schedule.ativo === false) return { ativo: false, label: "Fechado hoje" };
    const opening = formatTime(schedule.abre_as || schedule.abertura || "11:00");
    const closing = formatTime(schedule.fecha_as || schedule.fechamento || "23:00");
    return { ativo: true, abertura: opening, fechamento: closing, label: `${opening} às ${closing}` };
  }

  function conteudoPhMarmitaPriceLabel(item) {
    const sizes = (Array.isArray(item?.tamanhos) ? item.tamanhos : [])
      .filter((size) => size && size.ativo !== false && Number.isFinite(Number(size.preco)))
      .sort((a, b) => Number(a.capacidade_ml ?? a.capacidadeMl ?? a.ml ?? 0) - Number(b.capacidade_ml ?? b.capacidadeMl ?? b.ml ?? 0));
    if (!sizes.length) return "Consulte";
    if (sizes.length === 1) return formatMoney(Number(sizes[0].preco));
    const prices = sizes.map((size) => Number(size.preco)).filter(Number.isFinite);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatMoney(min) : `${formatMoney(min)} a ${formatMoney(max)}`;
  }

  function conteudoNormalizePhImage(item) {
    const raw = String(item?.imagem || item?.image || item?.foto || "").trim();
    if (!raw) return "";
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (raw.startsWith("../") || raw.startsWith("/")) return raw;
    return raw.startsWith("imagens/") ? `../${raw}` : `../imagens/${raw}`;
  }

  function conteudoMenuItems(estabelecimento = state.conteudoEstabelecimento) {
    if (estabelecimento === "ph_sabor_cia") {
      const meals = (Array.isArray(state.phConfig?.marmitas) ? state.phConfig.marmitas : [])
        .filter((item) => item && item.ativo !== false)
        .map((item) => ({
          id: `marmita:${String(item.id || item.nome)}`,
          categoria: "Marmitas",
          nome: String(item.nome || "Marmita").trim(),
          detalhe: "Marmita caseira",
          preco: conteudoPhMarmitaPriceLabel(item),
          principal: true,
          imagem: conteudoNormalizePhImage(item),
        }));
      const drinks = (Array.isArray(state.phConfig?.bebidas) ? state.phConfig.bebidas : [])
        .filter((item) => item && item.ativo !== false && Number.isFinite(Number(item.preco)))
        .map((item) => ({
          id: `bebida:${String(item.id || item.nome)}`,
          categoria: "Bebidas",
          nome: String(item.nome || "Bebida").trim(),
          detalhe: "Bebida",
          preco: formatMoney(Number(item.preco)),
          principal: false,
          imagem: conteudoNormalizePhImage(item),
        }));
      const addons = (Array.isArray(state.phConfig?.adicionais) ? state.phConfig.adicionais : [])
        .filter((item) => item && item.ativo !== false && Number.isFinite(Number(item.preco)))
        .map((item) => ({
          id: `adicional:${String(item.id || item.nome)}`,
          categoria: "Adicionais",
          nome: String(item.nome || "Adicional").trim(),
          detalhe: "Adicional",
          preco: formatMoney(Number(item.preco)),
          principal: false,
          imagem: conteudoNormalizePhImage(item),
        }));
      return [...meals, ...drinks, ...addons];
    }

    const cups = (Array.isArray(state.operacao?.tamanhos) ? state.operacao.tamanhos : [])
      .filter((item) => item && item.disponivel !== false && item.visivel !== false && Number.isFinite(Number(item.tamanho_ml)))
      .sort((a, b) => Number(a.tamanho_ml) - Number(b.tamanho_ml))
      .map((item) => {
        const size = Number(item.tamanho_ml);
        return {
          id: `copo:${size}`,
          categoria: "Açaí tradicional",
          nome: String(item.nome || AZURY_CUP_NAMES.get(size) || "Açaí").trim(),
          detalhe: `${size} ml`,
          preco: formatMoney(Number(item.preco_base || 0)),
          principal: true,
          imagem: CONTEUDO_AZURY_IMAGES[size] || CONTEUDO_AZURY_IMAGES.hero,
          // O hero usa a imagem do tamanho escolhido. Antes todos os copos
          // apontavam para copo-azury.png, por isso qualquer arte acabava
          // mostrando sempre o mesmo produto.
          heroImagem: CONTEUDO_AZURY_IMAGES[size] || CONTEUDO_AZURY_IMAGES.hero,
        };
      });
    const boxes = getAzuryBoxesAdmin()
      .filter((item) => item.disponivel !== false && item.visivel !== false)
      .map((item) => ({
        id: `box:${item.key}`,
        categoria: "Azury Box",
        nome: item.nome,
        detalhe: `até ${item.limite} complementos incluídos`,
        preco: formatMoney(Number(item.preco || 0)),
        principal: true,
        imagem: CONTEUDO_AZURY_IMAGES.box,
        heroImagem: CONTEUDO_AZURY_IMAGES.box,
      }));
    return [...cups, ...boxes];
  }

  function conteudoHeroItemForSnapshot(snapshot, variant = 0) {
    const snapshotItems = Array.isArray(snapshot?.items) ? snapshot.items : [];

    // Quando a arte tem produtos selecionados, respeita a seleção.
    // Em cardápios com vários produtos, cada variação usa um produto
    // diferente como destaque para não gerar sempre a mesma capa.
    if (snapshotItems.length) {
      return snapshotItems[Math.abs(Number(variant) || 0) % snapshotItems.length] || snapshotItems[0];
    }

    // Posts sem seleção de produto (Loja aberta, Delivery, Horários etc.)
    // também recebem um produto real da loja. O índice considera o tipo
    // do conteúdo + a variação, então tipos diferentes não ficam presos
    // ao mesmo copo.
    const pool = conteudoMenuItems(snapshot?.estabelecimento)
      .filter((item) => item && (item.heroImagem || item.imagem));

    if (!pool.length) return null;

    const typeKeys = Object.keys(CONTEUDO_TYPE_META);
    const typeIndex = Math.max(0, typeKeys.indexOf(String(snapshot?.tipo || "")));
    const variation = Math.abs(Number(variant) || 0);

    if (snapshot?.estabelecimento === "azury") {
      const boxIndex = pool.findIndex((item) => item.categoria === "Azury Box");

      // Alguns conteúdos alternam propositalmente entre copo e Box.
      if (boxIndex >= 0) {
        if (["ultima_chamada", "agradecimento", "recompensas"].includes(snapshot?.tipo)) {
          return pool[boxIndex];
        }
        if (["loja_aberta", "delivery", "horarios"].includes(snapshot?.tipo) && variation % 2 === 1) {
          return pool[boxIndex];
        }
      }
    }

    return pool[(typeIndex + variation) % pool.length] || pool[0];
  }

  function conteudoSelectionMode() {
    return conteudoTypeMeta().mode || "none";
  }

  function conteudoResetSelectedItems() {
    const items = conteudoMenuItems();
    const mode = conteudoSelectionMode();
    if (mode === "none") {
      state.conteudoSelecionados = new Set();
      return;
    }
    if (mode === "single") {
      const preferred = items.find((item) => item.principal) || items[0];
      state.conteudoSelecionados = new Set(preferred ? [preferred.id] : []);
      return;
    }
    const preferred = state.conteudoEstabelecimento === "ph_sabor_cia" ? items.filter((item) => item.principal) : items;
    const selected = preferred.length ? preferred : items.slice(0, 12);
    state.conteudoSelecionados = new Set(selected.map((item) => item.id));
  }

  function conteudoSelectedItems() {
    const selected = state.conteudoSelecionados || new Set();
    return conteudoMenuItems().filter((item) => selected.has(item.id));
  }

  function updateConteudoCompanyUI() {
    const isAzury = state.conteudoEstabelecimento !== "ph_sabor_cia";
    el.conteudoAzuryButton?.classList.toggle("btn-primary", isAzury);
    el.conteudoAzuryButton?.classList.toggle("btn-secondary", !isAzury);
    el.conteudoPhButton?.classList.toggle("btn-primary", !isAzury);
    el.conteudoPhButton?.classList.toggle("btn-secondary", isAzury);
    el.conteudoToolbar?.classList.toggle("company-block-azury", isAzury);
    el.conteudoToolbar?.classList.toggle("company-block-ph", !isAzury);
    document.getElementById("section-conteudo")?.classList.toggle("company-block-ph", !isAzury);
    document.querySelectorAll("[data-conteudo-azury-only='true']").forEach((node) => {
      node.hidden = !isAzury;
    });
    if (!isAzury && conteudoTypeMeta().azuryOnly) {
      state.conteudoTipo = "cardapio_dia";
      conteudoResetSelectedItems();
    }
    if (el.conteudoCompanyDescription) {
      el.conteudoCompanyDescription.textContent = isAzury
        ? "Crie posts no padrão visual da Azury, usando produtos, preços, horários e histórico do painel."
        : "Crie posts da PH Sabor & Cia com cardápio, horários e informações atuais da operação.";
    }
  }

  function updateConteudoTypeUI() {
    document.querySelectorAll("[data-conteudo-type]").forEach((button) => {
      button.classList.toggle("active", button.dataset.conteudoType === state.conteudoTipo);
    });
    const mode = conteudoSelectionMode();
    if (el.conteudoMenuOptions) el.conteudoMenuOptions.hidden = mode === "none";
    const title = document.getElementById("conteudoItemsTitle");
    const help = document.getElementById("conteudoItemsHelp");
    if (title) title.textContent = mode === "single" ? "Produto da arte" : "Itens da arte";
    if (help) help.textContent = mode === "single" ? "Escolha um produto para ser o destaque." : "Marque os itens que devem aparecer na publicação.";
    if (el.conteudoSelectAllButton) el.conteudoSelectAllButton.hidden = mode !== "multi";
    renderConteudoCustomOptions();
  }

  function conteudoCustomFieldHtml({ id, label, type = "text", placeholder = "", value = "", rows = 3 }) {
    if (type === "textarea") {
      return `<label class="conteudo-custom-field"><span>${escapeHtml(label)}</span><textarea id="${escapeHtml(id)}" rows="${rows}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea></label>`;
    }
    return `<label class="conteudo-custom-field"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}"></label>`;
  }

  function renderConteudoCustomOptions() {
    const box = document.getElementById("conteudoCustomOptions");
    if (!box) return;
    const type = state.conteudoTipo;
    const fields = [];
    if (type === "promocao") {
      fields.push(
        { id: "conteudoCustomTitle", label: "Chamada da promoção", placeholder: "Ex.: OFERTA RELÂMPAGO", value: "OFERTA DO DIA" },
        { id: "conteudoPromoPrice", label: "Preço promocional", placeholder: "Ex.: R$ 10,00" },
        { id: "conteudoCustomNote", label: "Validade / observação", placeholder: "Ex.: Hoje até 18h30 ou enquanto durar o estoque" },
      );
    } else if (["produto_destaque", "novidade"].includes(type)) {
      fields.push({ id: "conteudoCustomNote", label: "Frase de apoio", placeholder: type === "novidade" ? "Ex.: Chegou novidade no nosso cardápio!" : "Ex.: Seu favorito de hoje merece destaque." });
    } else if (type === "aviso") {
      fields.push(
        { id: "conteudoCustomTitle", label: "Título", placeholder: "Ex.: AVISO IMPORTANTE", value: "AVISO IMPORTANTE" },
        { id: "conteudoCustomMessage", label: "Mensagem", type: "textarea", placeholder: "Digite o comunicado que deve aparecer na arte." },
      );
    } else if (type === "manutencao") {
      fields.push(
        { id: "conteudoCustomMessage", label: "Mensagem", type: "textarea", placeholder: "Ex.: Estamos fechados para manutenção." },
        { id: "conteudoCustomNote", label: "Previsão de retorno", placeholder: "Ex.: Voltamos na terça-feira" },
      );
    } else if (type === "loja_fechada") {
      fields.push({ id: "conteudoCustomNote", label: "Mensagem de retorno", placeholder: "Ex.: Voltamos amanhã às 11h" });
    } else if (type === "agradecimento") {
      fields.push({ id: "conteudoCustomMessage", label: "Mensagem", type: "textarea", placeholder: "Ex.: Obrigado a todos que pediram com a gente hoje!" });
    } else if (type === "delivery") {
      fields.push({ id: "conteudoCustomMessage", label: "Chamada", type: "textarea", placeholder: "Ex.: Monte seu pedido e receba sem sair de casa." });
    } else if (type === "recompensas") {
      fields.push({ id: "conteudoCustomMessage", label: "Mensagem", type: "textarea", placeholder: "Ex.: Cadastre-se no site, acumule pontos e libere benefícios exclusivos." });
    }
    box.hidden = !fields.length;
    box.innerHTML = fields.length
      ? `<span class="conteudo-control-label">Personalizar conteúdo</span><div class="conteudo-custom-grid">${fields.map(conteudoCustomFieldHtml).join("")}</div>`
      : "";
  }

  function conteudoReadCustomData() {
    const get = (id) => String(document.getElementById(id)?.value || "").trim();
    return { title: get("conteudoCustomTitle"), message: get("conteudoCustomMessage"), note: get("conteudoCustomNote"), promoPrice: get("conteudoPromoPrice") };
  }

  function renderConteudoItems() {
    if (!el.conteudoItemsList) return;
    const mode = conteudoSelectionMode();
    if (mode === "none") {
      el.conteudoItemsList.innerHTML = "";
      return;
    }
    const items = conteudoMenuItems();
    if (!items.length) {
      el.conteudoItemsList.innerHTML = `<div class="empty-state">Nenhum item disponível para esta arte.</div>`;
      return;
    }
    const groups = new Map();
    items.forEach((item) => {
      if (!groups.has(item.categoria)) groups.set(item.categoria, []);
      groups.get(item.categoria).push(item);
    });
    el.conteudoItemsList.innerHTML = Array.from(groups.entries()).map(([category, rows]) => `
      <div class="conteudo-item-group">
        <strong class="conteudo-item-category">${escapeHtml(category)}</strong>
        ${rows.map((item) => `
          <label class="conteudo-item-row">
            <input type="${mode === "single" ? "radio" : "checkbox"}" name="${mode === "single" ? "conteudo-produto-unico" : `conteudo-${escapeHtml(category)}`}" data-conteudo-item="${escapeHtml(item.id)}" ${state.conteudoSelecionados.has(item.id) ? "checked" : ""}>
            <span class="conteudo-item-copy"><strong>${escapeHtml(item.nome)}</strong><small>${escapeHtml([item.detalhe, item.preco].filter(Boolean).join(" • "))}</small></span>
          </label>`).join("")}
      </div>`).join("");
  }

  function conteudoHandleItemToggle(input) {
    if (!input) return;
    const id = input.dataset.conteudoItem;
    if (conteudoSelectionMode() === "single") {
      state.conteudoSelecionados = input.checked ? new Set([id]) : new Set();
      renderConteudoItems();
      return;
    }
    if (input.checked) state.conteudoSelecionados.add(id);
    else state.conteudoSelecionados.delete(id);
  }

  function conteudoTemplateIndex(templateId) {
    const match = String(templateId || "").match(/-(\d+)$/);
    return Math.max(0, Number(match?.[1] || 1) - 1);
  }

  function conteudoTemplateLabel(templateId) {
    return `Variação ${conteudoTemplateIndex(templateId) + 1}`;
  }

  function conteudoNextTemplate(forceNext = false) {
    const templates = CONTEUDO_TEMPLATES[state.conteudoTipo] || [];
    if (!templates.length) return `${state.conteudoTipo || "padrao"}-1`;
    const relevant = (state.conteudoHistorico || []).filter((item) => item.estabelecimento === state.conteudoEstabelecimento && item.tipo === state.conteudoTipo && item.formato === state.conteudoFormato);
    if (forceNext && state.conteudoUltimaGeracao?.template_id) {
      const currentIndex = templates.indexOf(state.conteudoUltimaGeracao.template_id);
      return templates[(Math.max(0, currentIndex) + 1) % templates.length];
    }
    const recent = relevant.slice(0, Math.min(3, templates.length - 1));
    const recentSet = new Set(recent.map((item) => item.template_id));
    return templates.find((template) => !recentSet.has(template)) || templates[relevant.length % templates.length];
  }

  function updateConteudoVariationHint() {
    if (!el.conteudoVariationHint) return;
    const next = conteudoNextTemplate(false);
    const recent = (state.conteudoHistorico || []).filter((item) => item.estabelecimento === state.conteudoEstabelecimento && item.tipo === state.conteudoTipo);
    el.conteudoVariationHint.textContent = recent.length
      ? `${conteudoTemplateLabel(next)} será usada agora. As últimas variações ficam fora da rotação.`
      : `${conteudoTemplateLabel(next)} será a primeira variação deste tipo.`;
  }

  function conteudoSimpleHash(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function conteudoSnapshot(templateId) {
    const company = conteudoCompanyMeta();
    const schedule = conteudoCurrentSchedule();
    const mode = conteudoSelectionMode();
    const items = mode === "none" ? [] : conteudoSelectedItems();
    return {
      estabelecimento: state.conteudoEstabelecimento,
      tipo: state.conteudoTipo,
      formato: state.conteudoFormato,
      template_id: templateId,
      data_uso: conteudoLocalDate(),
      data_label: conteudoFormatDate(),
      company,
      schedule,
      items,
      custom: conteudoReadCustomData(),
      gerado_em: new Date().toISOString(),
    };
  }

  function conteudoRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function conteudoCanvasText(ctx, text, x, y, options = {}) {
    const { font = "700 48px Arial, sans-serif", color = "#ffffff", align = "left", baseline = "alphabetic", maxWidth = null } = options;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    let value = String(text || "");
    if (maxWidth) {
      while (value.length > 1 && ctx.measureText(value).width > maxWidth) value = `${value.slice(0, -2).trim()}…`;
    }
    ctx.fillText(value, x, y);
  }

  function conteudoWrapText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    if (options.font) ctx.font = options.font;
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
    const maxLines = Number(options.maxLines || lines.length || 1);
    lines.slice(0, maxLines).forEach((row, index) => conteudoCanvasText(ctx, row, x, y + index * lineHeight, options));
    return Math.min(lines.length, maxLines) * lineHeight;
  }

  async function conteudoLoadImage(src) {
    const url = String(src || "").trim();
    if (!url) return null;
    if (conteudoImageCache.has(url)) return conteudoImageCache.get(url);
    const promise = new Promise((resolve) => {
      const image = new Image();
      if (/^https?:/i.test(url)) image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
    conteudoImageCache.set(url, promise);
    return promise;
  }

  function conteudoDrawImageContain(ctx, image, x, y, w, h) {
    if (!image?.width || !image?.height) return false;
    const scale = Math.min(w / image.width, h / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    return true;
  }

  function conteudoDrawBackground(ctx, width, height, company, variant) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, company.dark);
    gradient.addColorStop(.5, company.key === "azury" ? "#061a57" : "#472000");
    gradient.addColorStop(1, "#03050c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = .16;
    for (let i = 0; i < 6; i += 1) {
      ctx.strokeStyle = i % 2 ? company.brand : company.accent;
      ctx.lineWidth = 14 + i * 5;
      ctx.beginPath();
      ctx.arc(variant % 2 ? width * .12 : width * .9, variant < 2 ? height * .1 : height * .86, 170 + i * 72, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    const glow = ctx.createRadialGradient(width * .7, height * .4, 0, width * .7, height * .4, width * .55);
    glow.addColorStop(0, company.key === "azury" ? "rgba(0,81,255,.32)" : "rgba(255,122,0,.28)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  function conteudoDrawBrand(ctx, company, x, y, scale = 1) {
    if (company.key === "azury") {
      const gold = company.accent;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = gold;
      ctx.fillStyle = gold;
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(0, 30 * scale);
      ctx.lineTo(16 * scale, 2 * scale);
      ctx.lineTo(36 * scale, 24 * scale);
      ctx.lineTo(58 * scale, 0);
      ctx.lineTo(80 * scale, 24 * scale);
      ctx.lineTo(100 * scale, 2 * scale);
      ctx.lineTo(116 * scale, 30 * scale);
      ctx.stroke();
      ctx.fillRect(5 * scale, 34 * scale, 106 * scale, 6 * scale);
      ctx.restore();
      conteudoCanvasText(ctx, "AZURY", x + 140 * scale, y + 38 * scale, { font: `900 ${44 * scale}px Arial Black, Arial, sans-serif`, color: "#ffffff" });
    } else {
      conteudoRoundRect(ctx, x, y, 78 * scale, 78 * scale, 22 * scale);
      ctx.fillStyle = company.brand;
      ctx.fill();
      conteudoCanvasText(ctx, "PH", x + 39 * scale, y + 39 * scale, { font: `900 ${34 * scale}px Arial Black, Arial, sans-serif`, align: "center", baseline: "middle" });
      conteudoCanvasText(ctx, "SABOR & CIA", x + 96 * scale, y + 48 * scale, { font: `900 ${30 * scale}px Arial Black, Arial, sans-serif` });
    }
  }

  function conteudoDrawBadge(ctx, text, x, y, company, scale = 1) {
    ctx.font = `900 ${24 * scale}px Arial Black, Arial, sans-serif`;
    const w = ctx.measureText(text).width + 52 * scale;
    conteudoRoundRect(ctx, x, y, w, 54 * scale, 27 * scale);
    ctx.fillStyle = company.key === "azury" ? company.brand : company.brand;
    ctx.fill();
    conteudoCanvasText(ctx, text, x + w / 2, y + 27 * scale, { font: `900 ${22 * scale}px Arial Black, Arial, sans-serif`, align: "center", baseline: "middle" });
    return w;
  }

  function conteudoDrawCta(ctx, snapshot, width, height) {
    const company = snapshot.company;
    const isPost = snapshot.formato === "post";
    const x = isPost ? 58 : 70;
    const y = height - (isPost ? 122 : 160);
    const w = width - x * 2;
    const h = isPost ? 70 : 86;
    conteudoRoundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = company.key === "azury" ? company.accent : company.brand;
    ctx.fill();
    conteudoCanvasText(ctx, snapshot.company.cta.toUpperCase(), x + 34, y + h / 2, { font: `900 ${isPost ? 28 : 34}px Arial Black, Arial, sans-serif`, color: company.key === "azury" ? "#07143c" : "#ffffff", baseline: "middle" });
    conteudoCanvasText(ctx, snapshot.company.contact || "", x + w - 34, y + h / 2, { font: `800 ${isPost ? 25 : 30}px Arial, sans-serif`, color: company.key === "azury" ? "#07143c" : "#ffffff", align: "right", baseline: "middle", maxWidth: w * .48 });
  }

  async function conteudoDrawHeroProduct(ctx, snapshot, item, box, variant = 0) {
    const company = snapshot.company;
    const resolvedItem = item || conteudoHeroItemForSnapshot(snapshot, variant);
    let src = resolvedItem?.heroImagem || resolvedItem?.imagem || "";
    if (!src && company.key === "azury") src = CONTEUDO_AZURY_IMAGES.hero;
    const image = await conteudoLoadImage(src);
    ctx.save();
    const glow = ctx.createRadialGradient(box.x + box.w / 2, box.y + box.h * .58, 20, box.x + box.w / 2, box.y + box.h * .58, box.w * .58);
    glow.addColorStop(0, company.key === "azury" ? "rgba(0,81,255,.65)" : "rgba(255,122,0,.55)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(box.x - box.w * .2, box.y, box.w * 1.4, box.h);
    if (image) {
      ctx.shadowColor = "rgba(0,0,0,.55)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 18;
      conteudoDrawImageContain(ctx, image, box.x, box.y, box.w, box.h);
    } else {
      conteudoRoundRect(ctx, box.x + box.w * .15, box.y + box.h * .18, box.w * .7, box.h * .64, 42);
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fill();
      conteudoCanvasText(ctx, company.key === "azury" ? "AÇAÍ" : "PH", box.x + box.w / 2, box.y + box.h / 2, { font: `900 ${Math.max(50, box.w * .12)}px Arial Black, Arial, sans-serif`, color: company.brand, align: "center", baseline: "middle" });
    }
    ctx.restore();
  }

  async function conteudoDrawMenu(ctx, snapshot, width, height, variant) {
    const company = snapshot.company;
    const isPost = snapshot.formato === "post";
    const items = (snapshot.items || []).slice(0, isPost ? 10 : 12);
    const margin = isPost ? 58 : 70;
    conteudoDrawBrand(ctx, company, margin, isPost ? 55 : 78, isPost ? .78 : .92);
    conteudoDrawBadge(ctx, "CARDÁPIO DO DIA", margin, isPost ? 145 : 190, company, isPost ? .9 : 1);

    const heroLeft = variant % 2 === 1;
    const heroBox = isPost
      ? { x: heroLeft ? 36 : 595, y: 70, w: 410, h: 430 }
      : { x: heroLeft ? 28 : 565, y: 150, w: 450, h: 580 };
    const heroItem = conteudoHeroItemForSnapshot(snapshot, variant) || items.find((item) => item.principal) || items[0];
    await conteudoDrawHeroProduct(ctx, snapshot, heroItem, heroBox, variant);

    const headingX = heroLeft ? (isPost ? 525 : 540) : margin;
    conteudoCanvasText(ctx, company.key === "azury" ? "SEU AÇAÍ" : "SABOR DE CASA", headingX, isPost ? 270 : 330, { font: `900 ${isPost ? 60 : 72}px Arial Black, Arial, sans-serif`, maxWidth: heroLeft ? width - headingX - margin : width * .46 });
    conteudoCanvasText(ctx, company.key === "azury" ? "DO SEU JEITO" : "TODO DIA", headingX, isPost ? 332 : 406, { font: `900 ${isPost ? 60 : 72}px Arial Black, Arial, sans-serif`, color: company.key === "azury" ? company.accent : company.brand2, maxWidth: heroLeft ? width - headingX - margin : width * .48 });

    const gridTop = isPost ? 520 : 760;
    const gridBottom = height - (isPost ? 185 : 235);
    const columns = 2;
    const gap = isPost ? 16 : 22;
    const colGap = isPost ? 18 : 22;
    const gridW = width - margin * 2;
    const cardW = (gridW - colGap) / 2;
    const rows = Math.max(1, Math.ceil(items.length / columns));
    const cardH = Math.min(isPost ? 126 : 150, Math.max(isPost ? 92 : 116, (gridBottom - gridTop - gap * (rows - 1)) / rows));

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (cardW + colGap);
      const y = gridTop + row * (cardH + gap);
      conteudoRoundRect(ctx, x, y, cardW, cardH, 28);
      ctx.fillStyle = "rgba(7,15,36,.88)";
      ctx.fill();
      ctx.strokeStyle = i % 4 === variant ? company.brand : "rgba(255,255,255,.14)";
      ctx.lineWidth = 2;
      ctx.stroke();

      const thumbW = cardH - 16;
      const image = await conteudoLoadImage(item.imagem);
      if (image) conteudoDrawImageContain(ctx, image, x + 8, y + 8, thumbW, thumbW);
      const tx = x + (image ? thumbW + 18 : 20);
      conteudoCanvasText(ctx, item.nome, tx, y + cardH * .35, { font: `900 ${isPost ? 22 : 27}px Arial Black, Arial, sans-serif`, maxWidth: cardW - (tx - x) - 18 });
      conteudoCanvasText(ctx, item.detalhe || item.categoria, tx, y + cardH * .61, { font: `600 ${isPost ? 16 : 19}px Arial, sans-serif`, color: "rgba(255,255,255,.66)", maxWidth: cardW - (tx - x) - 18 });
      conteudoCanvasText(ctx, item.preco, x + cardW - 18, y + cardH - 18, { font: `900 ${isPost ? 23 : 28}px Arial Black, Arial, sans-serif`, color: company.key === "azury" ? company.accent : company.brand2, align: "right" });
    }
    conteudoDrawCta(ctx, snapshot, width, height);
  }

  async function conteudoDrawMarketing(ctx, snapshot, width, height, variant) {
    const company = snapshot.company;
    const isPost = snapshot.formato === "post";
    const type = snapshot.tipo;
    const meta = CONTEUDO_TYPE_META[type] || CONTEUDO_TYPE_META.delivery;
    const item = snapshot.items?.[0] || null;
    const custom = snapshot.custom || {};
    const margin = isPost ? 58 : 70;
    conteudoDrawBrand(ctx, company, margin, isPost ? 50 : 74, isPost ? .78 : .92);
    conteudoDrawBadge(ctx, meta.badge || "HOJE", margin, isPost ? 150 : 190, company, isPost ? .9 : 1);

    let title = custom.title || meta.title;
    let line1 = title;
    let line2 = "";
    if (title.length > 18) {
      const words = title.split(" ");
      const cut = Math.ceil(words.length / 2);
      line1 = words.slice(0, cut).join(" ");
      line2 = words.slice(cut).join(" ");
    }

    const heroLeft = variant % 2 === 1;
    const titleY = isPost ? 290 : 350;
    const titleX = heroLeft ? (isPost ? 540 : 555) : margin;
    const titleWidth = heroLeft ? width - titleX - margin : width * .62;
    conteudoCanvasText(ctx, line1, titleX, titleY, { font: `900 ${isPost ? 67 : 84}px Arial Black, Arial, sans-serif`, maxWidth: titleWidth });
    if (line2) conteudoCanvasText(ctx, line2, titleX, titleY + (isPost ? 72 : 92), { font: `900 ${isPost ? 67 : 84}px Arial Black, Arial, sans-serif`, color: company.key === "azury" ? company.accent : company.brand2, maxWidth: titleWidth });

    const heroBox = isPost
      ? { x: heroLeft ? 28 : 535, y: 230, w: 500, h: 650 }
      : { x: heroLeft ? 18 : 505, y: 340, w: 540, h: 850 };
    await conteudoDrawHeroProduct(ctx, snapshot, item, heroBox, variant);

    let message = custom.message || custom.note || "";
    let stat = "";
    if (type === "loja_aberta") {
      message = company.key === "azury" ? "Seu açaí do seu jeito, com os complementos que você ama." : "Comida caseira, pedido rápido e sabor de verdade.";
      stat = snapshot.schedule?.label || "Consulte o horário";
    } else if (type === "promocao") {
      message = custom.note || "Aproveite hoje e faça seu pedido.";
      stat = custom.promoPrice || item?.preco || "Oferta especial";
    } else if (type === "produto_destaque") {
      message = custom.note || "Escolha seu favorito e peça agora.";
      stat = item?.preco || "Peça hoje";
    } else if (type === "novidade") {
      message = custom.note || "Tem novidade esperando por você.";
      stat = item?.preco || "Já disponível";
    } else if (type === "ultima_chamada") {
      message = "Não deixa para amanhã: ainda dá tempo de pedir hoje.";
      stat = snapshot.schedule?.fechamento ? `Até ${snapshot.schedule.fechamento}` : "Últimos pedidos";
    } else if (type === "loja_fechada") {
      message = custom.note || "Obrigado por mais um dia com a gente. Em breve estaremos de volta.";
      stat = "Pedidos encerrados";
    } else if (type === "agradecimento") {
      message = custom.message || "Obrigado a cada cliente que escolheu a gente hoje. Até o próximo pedido!";
      stat = "Gratidão 💙";
    } else if (type === "aviso") {
      message = custom.message || "Confira as informações atualizadas antes de fazer seu pedido.";
      stat = "Fique por dentro";
    } else if (type === "horarios") {
      message = "Planeje seu pedido e aproveite nosso horário de atendimento.";
      stat = snapshot.schedule?.label || "Consulte o horário";
    } else if (type === "delivery") {
      message = custom.message || (company.key === "azury" ? "Monte seu açaí pelo site e receba sem sair de casa." : "Escolha sua refeição e chame a gente no WhatsApp.");
      stat = "Faça seu pedido";
    } else if (type === "manutencao") {
      message = custom.message || "Estamos em uma pausa temporária para manutenção.";
      stat = custom.note || "Voltamos em breve";
    } else if (type === "recompensas") {
      message = custom.message || "Cadastre-se no site, acumule pontos e desbloqueie benefícios exclusivos da Azury.";
      stat = "Cadastro gratuito";
    }

    const infoY = isPost ? 840 : 1220;
    const infoX = heroLeft ? (isPost ? 410 : 360) : margin;
    const infoW = heroLeft ? width - infoX - margin : (isPost ? 660 : 720);
    conteudoRoundRect(ctx, infoX, infoY, infoW, isPost ? 260 : 330, 38);
    const cardGrad = ctx.createLinearGradient(infoX, infoY, infoX + infoW, infoY);
    cardGrad.addColorStop(0, "rgba(8,18,45,.95)");
    cardGrad.addColorStop(1, company.key === "azury" ? "rgba(0,81,255,.28)" : "rgba(255,122,0,.24)");
    ctx.fillStyle = cardGrad;
    ctx.fill();
    ctx.strokeStyle = company.key === "azury" ? "rgba(0,81,255,.75)" : "rgba(255,122,0,.75)";
    ctx.lineWidth = 2;
    ctx.stroke();
    conteudoCanvasText(ctx, stat, infoX + 34, infoY + (isPost ? 60 : 76), { font: `900 ${isPost ? 38 : 48}px Arial Black, Arial, sans-serif`, color: company.key === "azury" ? company.accent : company.brand2, maxWidth: infoW - 68 });
    ctx.font = `600 ${isPost ? 25 : 31}px Arial, sans-serif`;
    conteudoWrapText(ctx, message, infoX + 34, infoY + (isPost ? 112 : 145), infoW - 68, isPost ? 36 : 45, { font: `600 ${isPost ? 25 : 31}px Arial, sans-serif`, color: "rgba(255,255,255,.88)", maxLines: isPost ? 3 : 4 });
    conteudoDrawCta(ctx, snapshot, width, height);
  }

  function renderConteudoCanvasPlaceholder() {
    const canvas = el.conteudoCanvas;
    if (!canvas) return;
    canvas.width = 1080;
    canvas.height = state.conteudoFormato === "post" ? 1350 : 1920;
    const ctx = canvas.getContext("2d");
    const company = conteudoCompanyMeta();
    conteudoDrawBackground(ctx, canvas.width, canvas.height, company, 0);
    conteudoDrawBrand(ctx, company, 70, 90, 1);
    conteudoCanvasText(ctx, "PRONTO PARA CRIAR", 70, canvas.height * .46, { font: "900 78px Arial Black, Arial, sans-serif" });
    conteudoCanvasText(ctx, "Escolha o tipo e gere uma arte no padrão da loja.", 70, canvas.height * .46 + 70, { font: "600 30px Arial, sans-serif", color: "rgba(255,255,255,.72)", maxWidth: 850 });
  }

  async function renderConteudoCanvas(snapshot) {
    const canvas = el.conteudoCanvas;
    if (!canvas || !snapshot) return;
    const isPost = snapshot.formato === "post";
    canvas.width = 1080;
    canvas.height = isPost ? 1350 : 1920;
    const ctx = canvas.getContext("2d");
    const company = snapshot.company || conteudoCompanyMeta(snapshot.estabelecimento);
    snapshot.company = company;
    const variant = conteudoTemplateIndex(snapshot.template_id);
    conteudoDrawBackground(ctx, canvas.width, canvas.height, company, variant);
    if (snapshot.tipo === "cardapio_dia") await conteudoDrawMenu(ctx, snapshot, canvas.width, canvas.height, variant);
    else await conteudoDrawMarketing(ctx, snapshot, canvas.width, canvas.height, variant);
  }

  function renderConteudoHistory() {
    if (!el.conteudoHistoryList) return;
    const items = (state.conteudoHistorico || []).filter((item) => item.estabelecimento === state.conteudoEstabelecimento);
    if (!items.length) {
      el.conteudoHistoryList.innerHTML = `<div class="empty-state">Nenhuma arte registrada para esta loja ainda.</div>`;
      return;
    }
    el.conteudoHistoryList.innerHTML = items.slice(0, 40).map((item) => {
      const typeLabel = CONTEUDO_TYPE_META[item.tipo]?.label || item.tipo || "Conteúdo";
      const formatLabel = item.formato === "post" ? "Post" : "Story / Status";
      const date = item.data_uso ? new Date(`${item.data_uso}T12:00:00`).toLocaleDateString("pt-BR") : "—";
      return `<div class="conteudo-history-item"><div class="conteudo-history-main"><span class="conteudo-used-badge">Usada</span><strong>${escapeHtml(typeLabel)}</strong><small>${escapeHtml(date)} • ${escapeHtml(formatLabel)} • ${escapeHtml(conteudoTemplateLabel(item.template_id))}</small></div><div class="conteudo-history-actions"><button class="btn btn-small btn-secondary" data-conteudo-open-history="${escapeHtml(item.id)}" type="button">Abrir</button><button class="btn btn-small btn-ghost" data-conteudo-delete-history="${escapeHtml(item.id)}" type="button">Excluir</button></div></div>`;
    }).join("");
  }

  async function loadConteudoHistorico() {
    const data = await rpc("listar_conteudo_admin", { p_estabelecimento: state.conteudoEstabelecimento, p_limite: 120 });
    state.conteudoHistorico = Array.isArray(data) ? data : Array.isArray(data?.geracoes) ? data.geracoes : [];
    renderConteudoHistory();
    updateConteudoVariationHint();
  }

  function renderConteudoSection(resetSelection = false) {
    if (!el.conteudoCanvas) return;
    updateConteudoCompanyUI();
    updateConteudoTypeUI();
    if (resetSelection || !(state.conteudoSelecionados instanceof Set) || (conteudoSelectionMode() !== "none" && !state.conteudoSelecionados.size)) conteudoResetSelectedItems();
    if (el.conteudoFormatSelect) el.conteudoFormatSelect.value = state.conteudoFormato;
    renderConteudoItems();
    renderConteudoHistory();
    updateConteudoVariationHint();
    renderConteudoCanvasPlaceholder();
    if (el.conteudoDownloadButton) el.conteudoDownloadButton.disabled = !state.conteudoUltimaGeracao;
    if (el.conteudoVariationButton) el.conteudoVariationButton.disabled = !state.conteudoUltimaGeracao;
  }

  async function loadConteudo() {
    if (!state.operacao) state.operacao = await rpc("listar_operacao_admin");
    if (!state.phConfig) state.phConfig = await rpc("obter_configuracao_ph_admin");
    conteudoResetSelectedItems();
    await loadConteudoHistorico();
    renderConteudoSection(false);
  }

  async function setConteudoEstabelecimento(estabelecimento) {
    state.conteudoEstabelecimento = estabelecimento === "ph_sabor_cia" ? "ph_sabor_cia" : "azury";
    state.conteudoUltimaGeracao = null;
    updateConteudoCompanyUI();
    conteudoResetSelectedItems();
    updateConteudoTypeUI();
    renderConteudoItems();
    renderConteudoCanvasPlaceholder();
    if (el.conteudoDownloadButton) el.conteudoDownloadButton.disabled = true;
    if (el.conteudoVariationButton) el.conteudoVariationButton.disabled = true;
    await loadConteudoHistorico();
  }

  async function generateConteudo(forceNext = false) {
    const meta = conteudoTypeMeta();
    const items = conteudoSelectionMode() === "none" ? [] : conteudoSelectedItems();
    const maxItems = state.conteudoFormato === "post" ? 10 : 12;
    if (meta.azuryOnly && state.conteudoEstabelecimento === "ph_sabor_cia") throw new Error("Este tipo de conteúdo é exclusivo da Azury.");
    if (meta.requiresOpen) {
      if (!conteudoOrdersActive()) throw new Error("Os pedidos desta loja estão pausados. Ative a loja antes de gerar este conteúdo.");
      if (conteudoCurrentSchedule().ativo === false) throw new Error("Hoje está marcado como dia fechado para esta loja.");
    }
    if (conteudoSelectionMode() === "single" && items.length !== 1) throw new Error("Escolha um produto para esta arte.");
    if (conteudoSelectionMode() === "multi" && !items.length) throw new Error("Marque pelo menos um item para esta arte.");
    if (items.length > maxItems) throw new Error(`Para manter o post legível, selecione no máximo ${maxItems} itens neste formato.`);
    if (state.conteudoTipo === "aviso" && !conteudoReadCustomData().message) throw new Error("Digite a mensagem do comunicado antes de gerar.");

    const templateId = conteudoNextTemplate(forceNext);
    const snapshot = conteudoSnapshot(templateId);
    const signature = conteudoSimpleHash(JSON.stringify({ estabelecimento: snapshot.estabelecimento, tipo: snapshot.tipo, formato: snapshot.formato, template_id: snapshot.template_id, data_uso: snapshot.data_uso, items: snapshot.items, custom: snapshot.custom }));

    if (el.conteudoGenerateButton) {
      el.conteudoGenerateButton.disabled = true;
      el.conteudoGenerateButton.textContent = "Gerando arte...";
    }
    try {
      await renderConteudoCanvas(snapshot);
      const saved = await rpc("registrar_conteudo_admin", { p_dados: { estabelecimento: snapshot.estabelecimento, tipo: snapshot.tipo, formato: snapshot.formato, template_id: snapshot.template_id, data_uso: snapshot.data_uso, assinatura: signature, dados_snapshot: snapshot } });
      state.conteudoUltimaGeracao = snapshot;
      if (el.conteudoDownloadButton) el.conteudoDownloadButton.disabled = false;
      if (el.conteudoVariationButton) el.conteudoVariationButton.disabled = false;
      await loadConteudoHistorico();
      showMessage(`${CONTEUDO_TYPE_META[snapshot.tipo]?.label || "Conteúdo"} gerado e registrado no histórico.`, "success");
      return saved;
    } finally {
      if (el.conteudoGenerateButton) {
        el.conteudoGenerateButton.disabled = false;
        el.conteudoGenerateButton.textContent = "✨ Gerar imagem";
      }
    }
  }

  function downloadConteudoCanvas() {
    const canvas = el.conteudoCanvas;
    const snapshot = state.conteudoUltimaGeracao;
    if (!canvas || !snapshot) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        showMessage("Não foi possível preparar o PNG.", "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const store = snapshot.estabelecimento === "ph_sabor_cia" ? "ph" : "azury";
      const type = String(snapshot.tipo || "conteudo").replaceAll("_", "-");
      link.href = url;
      link.download = `${store}-${type}-${snapshot.data_uso}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  function openConteudoHistory(id) {
    const entry = (state.conteudoHistorico || []).find((item) => String(item.id) === String(id));
    const snapshot = entry?.dados_snapshot;
    if (!entry || !snapshot) {
      showMessage("Não foi possível abrir os dados desta arte.", "error");
      return;
    }
    state.conteudoTipo = snapshot.tipo || entry.tipo || "cardapio_dia";
    state.conteudoFormato = snapshot.formato || entry.formato || "story";
    state.conteudoUltimaGeracao = snapshot;
    updateConteudoTypeUI();
    if (el.conteudoFormatSelect) el.conteudoFormatSelect.value = state.conteudoFormato;
    renderConteudoCanvas(snapshot).then(() => {
      if (el.conteudoDownloadButton) el.conteudoDownloadButton.disabled = false;
      if (el.conteudoVariationButton) el.conteudoVariationButton.disabled = false;
      showMessage("Arte do histórico aberta na prévia.");
    }).catch((error) => showMessage(error.message, "error"));
  }

  async function deleteConteudoHistory(id) {
    const entry = (state.conteudoHistorico || []).find((item) => String(item.id) === String(id));
    if (!entry) return;
    const label = CONTEUDO_TYPE_META[entry.tipo]?.label || "conteúdo";
    openModal({
      title: "Excluir do histórico",
      message: `Excluir este registro de ${label}? Depois disso ele deixa de contar como visual já usado.`,
      messageType: "warning",
      submitText: "Excluir registro",
      submitClass: "btn-danger",
      fields: [],
      onSubmit: async () => {
        await rpc("excluir_conteudo_admin", { p_id: id });
        await loadConteudoHistorico();
        showMessage("Registro de conteúdo excluído.", "success");
      },
    });
  }


  function setSidebarOpen(open) {
    const shouldOpen = Boolean(open);

    el.sidebar.classList.toggle("open", shouldOpen);

    document.body.classList.toggle("sidebar-open", shouldOpen);

    el.menuButton.setAttribute("aria-expanded", String(shouldOpen));
  }

  async function navigate(section) {
    state.currentSection = section;

    document
      .querySelectorAll(".admin-section")
      .forEach((node) => node.classList.remove("active-section"));

    document
      .getElementById(`section-${section}`)
      ?.classList.add("active-section");

    const activeButton = document.querySelector(
      `.nav-item[data-section="${section}"]`,
    );

    document
      .querySelectorAll(".nav-item")
      .forEach((button) =>
        button.classList.toggle("active", button === activeButton),
      );

    activeButton?.scrollIntoView({
      block: "nearest",

      inline: "nearest",
    });

    el.pageTitle.textContent = SECTION_TITLES[section] || "Painel";

    setSidebarOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });

    try {
      if (section === "visao-geral") {
        await loadOverview();
      }

      if (section === "pedidos") {
        await refreshOrders();
      }

      if (section === "clientes") {
        await loadClients();
      }

      if (section === "financeiro") {
        await loadFinanceiro();
      }

      if (section === "estoque") {
        await loadEstoque();
      }

      if (section === "conteudo") {
        await loadConteudo();
      }

      if (
        ["cardapio", "entregas", "horarios", "recompensas"].includes(section)
      ) {
        await reloadOperation();

        if (["cardapio", "horarios"].includes(section)) {
          await loadPhConfig();
        }
      }

      if (section === "equipe") {
        await loadTeam();
      }

      if (section === "auditoria") {
        await loadAudit();
      }
    } catch (error) {
      console.error(error);

      showMessage(error.message, "error");
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();

    state.refreshTimer = setInterval(
      async () => {
        if (document.hidden || !state.session) {
          return;
        }

        try {
          if (["visao-geral", "pedidos"].includes(state.currentSection)) {
            await refreshOrders();
          }
        } catch (error) {
          console.warn("Atualização automática falhou:", error);
        }
      },

      30000,
    );
  }

  function stopAutoRefresh() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }

    state.refreshTimer = null;
  }

  injectOrderAlarmStyles();

  ensureOrderSoundButton();

  ensurePushNotificationButton();

  ensureManualOrderButton();

  updateOrderSoundButton();

  state.pushSupported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  updatePushNotificationButton();

  restoreOrderSoundPreference().catch((error) => {
    console.info("O som será retomado após uma interação permitida pelo navegador.", error);
  });

  const restorePersistentDevicePreferences = () => {
    resumePreferredOrderSoundAfterInteraction();
    void restorePreferredPushAfterInteraction();
  };

  document.addEventListener("pointerdown", restorePersistentDevicePreferences, { passive: true });
  document.addEventListener("touchstart", restorePersistentDevicePreferences, { passive: true });
  document.addEventListener("keydown", restorePersistentDevicePreferences);

  el.loginForm.addEventListener("submit", handleLogin);

  el.logoutButton.addEventListener("click", handleLogout);

  el.menuButton.addEventListener(
    "click",

    () => setSidebarOpen(!el.sidebar.classList.contains("open")),
  );

  el.sidebarBackdrop?.addEventListener(
    "click",

    () => setSidebarOpen(false),
  );

  el.globalRefreshButton.addEventListener(
    "click",

    () => navigate(state.currentSection),
  );

  el.refreshOrdersButton.addEventListener(
    "click",

    async () => {
      try {
        await refreshOrders();

        showMessage("Pedidos atualizados.");
      } catch (error) {
        showMessage(error.message, "error");
      }
    },
  );

  el.ordersAzuryButton?.addEventListener("click", () => {
    setOrdersEstabelecimento("azury");
    renderOrders();
  });

  el.ordersPhButton?.addEventListener("click", () => {
    setOrdersEstabelecimento("ph_sabor_cia");
    renderOrders();
  });

  el.ordersStatusFilter.addEventListener("change", renderOrders);

  el.clientsSearchForm.addEventListener(
    "submit",

    (event) => {
      event.preventDefault();

      loadClients().catch((error) => showMessage(error.message, "error"));
    },
  );

  el.storeConfigForm.addEventListener("submit", saveStoreConfig);

  el.phStoreConfigForm?.addEventListener("submit", (event) => {
    savePhStoreConfig(event).catch((error) => {
      console.error(error);
      showMessage(error.message, "error");
    });
  });

  el.auditFilterForm.addEventListener(
    "submit",

    (event) => {
      event.preventDefault();

      loadAudit().catch((error) => showMessage(error.message, "error"));
    },
  );

  el.cardapioAzuryButton?.addEventListener("click", () => {
    setCardapioEstabelecimento("azury");
  });

  el.cardapioPhButton?.addEventListener("click", () => {
    setCardapioEstabelecimento("ph_sabor_cia");
  });

  el.horariosAzuryButton?.addEventListener("click", () => {
    setHorariosEstabelecimento("azury");
  });

  el.horariosPhButton?.addEventListener("click", () => {
    setHorariosEstabelecimento("ph_sabor_cia");
  });

  el.cardapioAvailabilityFilter?.addEventListener("change", () => {
    state.cardapioDisponibilidade =
      el.cardapioAvailabilityFilter.value || "todos";

    renderSizes();
    renderAzuryBoxes();
    renderComplements();
    renderPhConfigPanel();
  });

  el.newComplementButton.addEventListener(
    "click",

    () => openComplementModal(),
  );

  el.newNeighborhoodButton.addEventListener(
    "click",

    () => openNeighborhoodModal(),
  );

  el.newRewardButton.addEventListener(
    "click",

    () => openRewardModal(),
  );

  el.newTeamMemberButton.addEventListener(
    "click",

    () => openTeamModal(),
  );

  el.financeiroAzuryButton?.addEventListener(
    "click",

    () => {
      setFinanceiroEstabelecimento("azury");

      loadFinanceiro().catch((error) => showMessage(error.message, "error"));
    },
  );

  el.financeiroPhButton?.addEventListener(
    "click",

    () => {
      setFinanceiroEstabelecimento("ph_sabor_cia");

      loadFinanceiro().catch((error) => showMessage(error.message, "error"));
    },
  );

  el.newFinanceEntryButton?.addEventListener(
    "click",

    () => openFinanceiroModal(),
  );

  el.financeiroPeriodForm?.addEventListener(
    "submit",

    (event) => {
      event.preventDefault();

      loadFinanceiro().catch((error) => showMessage(error.message, "error"));
    },
  );

  el.estoqueAzuryButton?.addEventListener(
    "click",

    () => {
      setEstoqueEstabelecimento("azury");

      loadEstoque().catch((error) => showMessage(error.message, "error"));
    },
  );

  el.estoquePhButton?.addEventListener(
    "click",

    () => {
      setEstoqueEstabelecimento("ph_sabor_cia");

      loadEstoque().catch((error) => showMessage(error.message, "error"));
    },
  );

  el.refreshEstoqueButton?.addEventListener(
    "click",

    () => {
      loadEstoque("Estoque atualizado.").catch((error) =>
        showMessage(error.message, "error"),
      );
    },
  );

  el.modalCloseButton.addEventListener("click", closeModal);

  el.dynamicModalForm.addEventListener("submit", submitModal);

  el.modalBackdrop.addEventListener(
    "click",

    (event) => {
      if (event.target === el.modalBackdrop) {
        closeModal();
      }
    },
  );

  document.addEventListener(
    "click",

    (event) => {
      const pushButton = event.target.closest(
        "[data-push-notification-toggle]",
      );

      if (pushButton) {
        togglePushNotifications().catch((error) => {
          console.error(error);

          showMessage(error.message, "error");
        });

        return;
      }

      const soundButton = event.target.closest("[data-order-sound-toggle]");

      if (soundButton) {
        toggleOrderSound().catch((error) => {
          console.error(error);

          showMessage(error.message, "error");
        });

        return;
      }

      const alarmViewButton = event.target.closest("[data-order-alarm-view]");

      if (alarmViewButton) {
        stopOrderAlarm();

        navigate("pedidos").catch((error) => {
          console.error(error);
        });

        return;
      }

      const alarmSilenceButton = event.target.closest(
        "[data-order-alarm-silence]",
      );

      if (alarmSilenceButton) {
        stopOrderAlarm();

        return;
      }

      const manualOrderButton = event.target.closest("[data-new-manual-order]");

      if (manualOrderButton) {
        openManualOrderModal().catch((error) => {
          console.error(error);

          showMessage(error.message, "error");
        });

        return;
      }

      const manualConfirmationButton = event.target.closest(
        "[data-manual-register-confirmation]",
      );

      if (manualConfirmationButton) {
        const originalText = manualConfirmationButton.textContent;

        manualConfirmationButton.disabled = true;

        manualConfirmationButton.textContent = "Registrando...";

        registerManualOrderAndSendConfirmation(el.dynamicModalForm)
          .catch((error) => {
            console.error(error);

            showMessage(error.message, "error");
          })
          .finally(() => {
            if (document.body.contains(manualConfirmationButton)) {
              manualConfirmationButton.disabled = false;

              manualConfirmationButton.textContent = originalText;
            }
          });

        return;
      }

      const addManualItem = event.target.closest("[data-manual-add-item]");

      if (addManualItem) {
        addManualItemRow();

        return;
      }

      const removeManualItem = event.target.closest(
        "[data-manual-remove-item]",
      );

      if (removeManualItem) {
        const rows = el.dynamicModalForm.querySelectorAll(
          "[data-manual-item-row]",
        );

        if (rows.length <= 1) {
          showMessage("O pedido precisa ter pelo menos um item.", "warning");

          return;
        }

        removeManualItem.closest("[data-manual-item-row]")?.remove();

        return;
      }

      const phApplyUpdate = event.target.closest(
        "[data-ph-aplicar-atualizacao-cardapio]",
      );

      if (phApplyUpdate) {
        aplicarAtualizacaoCardapioPh20260819().catch((error) => {
          console.error(error);

          showMessage(error.message, "error");
        });

        return;
      }

      const phReload = event.target.closest("[data-ph-config-reload]");

      if (phReload) {
        loadPhConfig("Configuração da PH atualizada.").catch((error) => {
          console.error(error);

          showMessage(error.message, "error");
        });

        return;
      }

      if (event.target.closest("[data-ph-edit-store]")) {
        openPhStoreModal();

        return;
      }

      if (event.target.closest("[data-ph-edit-delivery-bands]")) {
        openPhDeliveryBandsModal();

        return;
      }

      const phScheduleButton = event.target.closest("[data-ph-save-schedule]");

      if (phScheduleButton) {
        savePhSchedule(phScheduleButton).catch((error) => {
          console.error(error);
          showMessage(error.message, "error");
        });

        return;
      }

      const phMealButton = event.target.closest("[data-ph-edit-meal]");

      if (phMealButton) {
        openPhMealModal(
          (state.phConfig?.marmitas || []).find(
            (item) =>
              String(item.id) === String(phMealButton.dataset.phEditMeal),
          ),
        );

        return;
      }

      const phDrinkButton = event.target.closest("[data-ph-edit-drink]");

      if (phDrinkButton) {
        openPhSimpleItemModal(
          "bebida",

          (state.phConfig?.bebidas || []).find(
            (item) =>
              String(item.id) === String(phDrinkButton.dataset.phEditDrink),
          ),
        );

        return;
      }

      const phAddonButton = event.target.closest("[data-ph-edit-addon]");

      if (phAddonButton) {
        openPhSimpleItemModal(
          "adicional",

          (state.phConfig?.adicionais || []).find(
            (item) =>
              String(item.id) === String(phAddonButton.dataset.phEditAddon),
          ),
        );

        return;
      }

      const phAccompanimentButton = event.target.closest(
        "[data-ph-edit-accompaniment]",
      );

      if (phAccompanimentButton) {
        openPhAccompanimentModal(
          (state.phConfig?.acompanhamentos || []).find(
            (item) =>
              String(item.id) ===
              String(phAccompanimentButton.dataset.phEditAccompaniment),
          ),
        );

        return;
      }

      const financeEdit = event.target.closest("[data-finance-edit]");

      if (financeEdit) {
        const item = (state.financeiroData?.lancamentos || []).find(
          (entry) =>
            String(entry.id) === String(financeEdit.dataset.financeEdit),
        );

        if (item) {
          openFinanceiroModal(item);
        }

        return;
      }

      const financeDelete = event.target.closest("[data-finance-delete]");

      if (financeDelete) {
        const item = (state.financeiroData?.lancamentos || []).find(
          (entry) =>
            String(entry.id) === String(financeDelete.dataset.financeDelete),
        );

        if (item) {
          openFinanceiroDeleteModal(item);
        }

        return;
      }

      const conteudoCompanyButton = event.target.closest(
        "#conteudoAzuryButton, #conteudoPhButton",
      );

      if (conteudoCompanyButton) {
        setConteudoEstabelecimento(
          conteudoCompanyButton.id === "conteudoPhButton" ? "ph_sabor_cia" : "azury",
        ).catch((error) => showMessage(error.message, "error"));
        return;
      }

      const conteudoTypeButton = event.target.closest("[data-conteudo-type]");

      if (conteudoTypeButton) {
        state.conteudoTipo = conteudoTypeButton.dataset.conteudoType || "cardapio_dia";
        state.conteudoUltimaGeracao = null;
        conteudoResetSelectedItems();
        updateConteudoTypeUI();
        renderConteudoItems();
        updateConteudoVariationHint();
        renderConteudoCanvasPlaceholder();
        if (el.conteudoDownloadButton) el.conteudoDownloadButton.disabled = true;
        if (el.conteudoVariationButton) el.conteudoVariationButton.disabled = true;
        return;
      }

      if (event.target.closest("#conteudoSelectAllButton")) {
        if (conteudoSelectionMode() !== "multi") return;
        const items = conteudoMenuItems();
        const allSelected = items.length && items.every((item) => state.conteudoSelecionados.has(item.id));
        state.conteudoSelecionados = allSelected ? new Set() : new Set(items.map((item) => item.id));
        renderConteudoItems();
        if (el.conteudoSelectAllButton) el.conteudoSelectAllButton.textContent = allSelected ? "Marcar todos" : "Desmarcar todos";
        return;
      }

      if (event.target.closest("#conteudoGenerateButton")) {
        generateConteudo(false).catch((error) => showMessage(error.message, "error"));
        return;
      }

      if (event.target.closest("#conteudoVariationButton")) {
        generateConteudo(true).catch((error) => showMessage(error.message, "error"));
        return;
      }

      if (event.target.closest("#conteudoDownloadButton")) {
        downloadConteudoCanvas();
        return;
      }

      if (event.target.closest("#conteudoRefreshHistoryButton")) {
        loadConteudoHistorico()
          .then(() => showMessage("Histórico de conteúdo atualizado."))
          .catch((error) => showMessage(error.message, "error"));
        return;
      }

      const conteudoOpenHistory = event.target.closest("[data-conteudo-open-history]");
      if (conteudoOpenHistory) {
        openConteudoHistory(conteudoOpenHistory.dataset.conteudoOpenHistory);
        return;
      }

      const conteudoDeleteHistory = event.target.closest("[data-conteudo-delete-history]");
      if (conteudoDeleteHistory) {
        deleteConteudoHistory(conteudoDeleteHistory.dataset.conteudoDeleteHistory).catch(
          (error) => showMessage(error.message, "error"),
        );
        return;
      }

      const nav = event.target.closest("[data-section]");

      if (nav) {
        navigate(nav.dataset.section);
      }

      const go = event.target.closest("[data-go-section]");

      if (go) {
        navigate(go.dataset.goSection);
      }

      const orderAction = event.target.closest("[data-order-action]");

      if (orderAction) {
        handleOrderAction(orderAction);
      }

      const clientEdit = event.target.closest("[data-client-edit]");

      if (clientEdit) {
        openClientEditModal(clientEdit);

        return;
      }

      const clientToggle = event.target.closest("[data-client-toggle]");

      if (clientToggle) {
        toggleClient(clientToggle);
      }

      const clientDelete = event.target.closest("[data-client-delete]");

      if (clientDelete) {
        deleteClient(clientDelete);
      }

      const sizeButton = event.target.closest("[data-edit-size]");

      if (sizeButton) {
        openSizeModal(
          state.operacao.tamanhos.find(
            (item) => String(item.id) === sizeButton.dataset.editSize,
          ),
        );
      }

      const boxButton = event.target.closest("[data-edit-box]");

      if (boxButton) {
        openAzuryBoxModal(
          getAzuryBoxesAdmin().find(
            (item) => item.key === String(boxButton.dataset.editBox || ""),
          ),
        );

        return;
      }

      const complementButton = event.target.closest("[data-edit-complement]");

      if (complementButton) {
        openComplementModal(
          state.operacao.complementos.find(
            (item) =>
              String(item.id) === complementButton.dataset.editComplement,
          ),
        );
      }

      const neighborhoodButton = event.target.closest(
        "[data-edit-neighborhood]",
      );

      if (neighborhoodButton) {
        openNeighborhoodModal(
          state.operacao.bairros.find(
            (item) =>
              String(item.id) === neighborhoodButton.dataset.editNeighborhood,
          ),
        );
      }

      const rewardButton = event.target.closest("[data-edit-reward]");

      if (rewardButton) {
        openRewardModal(
          state.operacao.recompensas.find(
            (item) => String(item.id) === rewardButton.dataset.editReward,
          ),
        );
      }

      const scheduleButton = event.target.closest("[data-save-schedule]");

      if (scheduleButton) {
        saveSchedule(scheduleButton);
      }

      const teamButton = event.target.closest("[data-edit-team]");

      if (teamButton) {
        openTeamModal(
          state.equipe.find(
            (item) => item.usuario_id === teamButton.dataset.editTeam,
          ),
        );
      }

      if (event.target.closest("[data-modal-cancel]")) {
        closeModal();
      }
    },
  );

  document.addEventListener(
    "change",

    (event) => {
      const manualEstablishment = event.target.closest(
        "[data-manual-establishment]",
      );

      if (manualEstablishment) {
        resetManualItemsForEstablishment(manualEstablishment.value);

        refreshManualDeliveryForEstablishment(
          manualEstablishment.closest("#dynamicModalForm"),
          manualEstablishment.value,
        );

        return;
      }

      const manualAzuryProduct = event.target.closest(
        "[data-manual-azury-product]",
      );

      if (manualAzuryProduct) {
        refreshManualAzuryRow(
          manualAzuryProduct.closest("[data-manual-item-row]"),
        );

        return;
      }

      const manualComplement = event.target.closest("[data-manual-complement]");

      if (manualComplement) {
        refreshManualAzuryRow(
          manualComplement.closest("[data-manual-item-row]"),
        );

        return;
      }

      const manualLayer = event.target.closest(
        "[data-manual-complement-layers] input[type='radio']",
      );

      if (manualLayer) {
        refreshManualAzuryRow(manualLayer.closest("[data-manual-item-row]"));

        return;
      }

      const manualPhProduct = event.target.closest("[data-manual-ph-product]");

      if (manualPhProduct) {
        updatePhManualProductRow(manualPhProduct);

        return;
      }

      const manualPhSize = event.target.closest("[data-manual-ph-size]");

      if (manualPhSize) {
        updatePhManualSizePrice(manualPhSize);

        return;
      }

      const manualSize = event.target.closest("[data-manual-size]");

      if (manualSize) {
        const selected = manualSize.options[manualSize.selectedIndex];

        const priceInput = manualSize
          .closest("[data-manual-item-row]")
          ?.querySelector("[data-manual-price]");

        if (priceInput) {
          priceInput.value = selected?.dataset.price || "";
        }
      }

      const manualQuantity = event.target.closest("[data-manual-quantity]");

      if (
        manualQuantity &&
        manualQuantity.closest("[data-manual-item-establishment='azury']")
      ) {
        refreshManualAzuryRow(manualQuantity.closest("[data-manual-item-row]"));
      }

      if (event.target === el.conteudoFormatSelect) {
        state.conteudoFormato = el.conteudoFormatSelect.value === "post" ? "post" : "story";
        state.conteudoUltimaGeracao = null;
        renderConteudoCanvasPlaceholder();
        updateConteudoVariationHint();
        if (el.conteudoDownloadButton) el.conteudoDownloadButton.disabled = true;
        if (el.conteudoVariationButton) el.conteudoVariationButton.disabled = true;
        return;
      }

      const conteudoItem = event.target.closest("[data-conteudo-item]");
      if (conteudoItem) {
        conteudoHandleItemToggle(conteudoItem);
        return;
      }

      const active = event.target.closest("[data-active]");

      if (active) {
        const row = active.closest("[data-day]");

        row.querySelector("[data-open]").disabled = !active.checked;

        row.querySelector("[data-close]").disabled = !active.checked;
      }


      const phActive = event.target.closest("[data-ph-active]");

      if (phActive) {
        const row = phActive.closest("[data-ph-day]");

        if (row) {
          row.querySelector("[data-ph-open]").disabled = !phActive.checked;
          row.querySelector("[data-ph-close]").disabled = !phActive.checked;
        }
      }
    },
  );

  function getManualPhDeliveryConfig() {
    const store = state.phConfig?.loja || {};
    const address = store.endereco || state.phConfig?.endereco || {};

    const limit = Number(
      store.limite_entrega_km ??
        store.limiteEntregaKm ??
        state.phConfig?.limite_entrega_km ??
        state.phConfig?.limiteEntregaKm ??
        8,
    );

    const rawBands =
      store.faixas_entrega ||
      store.faixasEntrega ||
      state.phConfig?.faixas_entrega ||
      state.phConfig?.faixasEntrega ||
      [];

    const bands = (Array.isArray(rawBands) ? rawBands : [])
      .map((band) => ({
        ateKm: Number(band?.ate_km ?? band?.ateKm),
        taxa: Number(band?.taxa ?? band?.valor ?? band?.preco),
      }))
      .filter(
        (band) =>
          Number.isFinite(band.ateKm) &&
          band.ateKm > 0 &&
          Number.isFinite(band.taxa) &&
          band.taxa >= 0,
      )
      .sort((a, b) => a.ateKm - b.ateKm);

    return {
      address: {
        rua: String(address.rua || "Rua Oscar de Barros").trim(),
        numero: String(address.numero || "113").trim(),
        bairro: String(address.bairro || "Cidade Ademar").trim(),
        cidade: String(address.cidade || "São Paulo").trim(),
        estado: String(address.estado || "SP").trim(),
        pais: String(address.pais || "Brasil").trim(),
      },
      limit: Number.isFinite(limit) && limit > 0 ? limit : 8,
      bands: bands.length
        ? bands
        : [
            { ateKm: 3, taxa: 5 },
            { ateKm: 5, taxa: 7 },
            { ateKm: 8, taxa: 9 },
          ],
    };
  }

  function setManualDeliveryStatus(formNode, text, type = "") {
    const status = formNode?.querySelector("[data-manual-delivery-status]");

    if (!status) {
      return;
    }

    status.textContent = text || "";
    status.style.opacity = text ? ".82" : ".72";
    status.style.color =
      type === "error"
        ? "#b91c1c"
        : type === "success"
          ? "#15803d"
          : type === "warning"
            ? "#b45309"
            : "";
  }

  function invalidateManualPhDelivery(formNode, message = "") {
    manualPhDeliveryVersion += 1;
    clearTimeout(manualPhDeliveryTimer);

    if (formNode) {
      delete formNode.dataset.phDeliveryCalculating;
    }

    const feeInput = formNode?.querySelector('[name="taxa_entrega"]');

    if (feeInput) {
      feeInput.removeAttribute("aria-busy");
    }

    if (message) {
      setManualDeliveryStatus(formNode, message);
    }
  }

  function manualPhAddressReady(formNode) {
    if (!formNode) {
      return false;
    }

    const establishment = String(
      formNode.querySelector('[name="estabelecimento"]')?.value || "",
    );

    if (establishment !== "ph_sabor_cia") {
      return false;
    }

    const cep = String(formNode.querySelector('[name="cep"]')?.value || "").replace(
      /\D/g,
      "",
    );

    return Boolean(
      cep.length === 8 &&
        formNode.querySelector('[name="rua"]')?.value.trim() &&
        formNode.querySelector('[name="numero"]')?.value.trim() &&
        formNode.querySelector('[name="bairro"]')?.value.trim(),
    );
  }

  function buildManualPhStoreAddress() {
    const { address } = getManualPhDeliveryConfig();

    return [
      address.rua,
      address.numero,
      address.bairro,
      address.cidade,
      address.estado,
      address.pais,
    ]
      .filter(Boolean)
      .join(", ");
  }

  function buildManualPhClientAddressCandidates(formNode) {
    const street = String(formNode.querySelector('[name="rua"]')?.value || "").trim();
    const number = String(formNode.querySelector('[name="numero"]')?.value || "").trim();
    const district = String(formNode.querySelector('[name="bairro"]')?.value || "").trim();
    const cep = String(formNode.querySelector('[name="cep"]')?.value || "").trim();
    const city = String(formNode.dataset.manualCepCity || "São Paulo").trim();
    const stateCode = String(formNode.dataset.manualCepState || "SP").trim();

    return [
      [street, number, district, city, stateCode, "Brasil"].filter(Boolean).join(", "),
      [street, number, city, stateCode, "Brasil"].filter(Boolean).join(", "),
      [cep, number, city, stateCode, "Brasil"].filter(Boolean).join(", "),
      [cep, city, stateCode, "Brasil"].filter(Boolean).join(", "),
    ].filter((value, index, list) => value && list.indexOf(value) === index);
  }

  async function geocodeManualAddress(address) {
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      countrycodes: "br",
      "accept-language": "pt-BR",
      q: address,
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      throw new Error("Não foi possível localizar o endereço no mapa.");
    }

    const results = await response.json();

    if (!Array.isArray(results) || !results.length) {
      throw new Error("Endereço não localizado no mapa.");
    }

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("As coordenadas encontradas são inválidas.");
    }

    return { latitude, longitude };
  }

  async function geocodeManualWithAttempts(addresses) {
    let lastError = null;

    for (const address of addresses) {
      try {
        return await geocodeManualAddress(address);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Não foi possível localizar o endereço.");
  }

  async function getManualPhStoreCoordinates() {
    const address = buildManualPhStoreAddress();

    if (manualPhStoreCoordinatesCache.has(address)) {
      return manualPhStoreCoordinatesCache.get(address);
    }

    const config = getManualPhDeliveryConfig();
    const store = config.address;

    const coordinates = await geocodeManualWithAttempts([
      address,
      [store.rua, store.numero, store.cidade, store.estado, "Brasil"]
        .filter(Boolean)
        .join(", "),
      [store.rua, store.bairro, store.cidade, "Brasil"]
        .filter(Boolean)
        .join(", "),
    ]);

    manualPhStoreCoordinatesCache.set(address, coordinates);

    return coordinates;
  }

  async function routeManualDistanceByRoad(origin, destination) {
    const coordinates =
      `${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}`;

    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`,
    );

    if (!response.ok) {
      throw new Error("Não foi possível calcular a rota pelas ruas.");
    }

    const data = await response.json();

    if (data?.code !== "Ok" || !data?.routes?.[0]) {
      throw new Error("Rota não encontrada.");
    }

    return {
      distanciaKm: Number(data.routes[0].distance) / 1000,
      aproximada: false,
    };
  }

  function manualStraightLineDistanceKm(origin, destination) {
    const earthRadiusKm = 6371;
    const radians = (degrees) => (degrees * Math.PI) / 180;
    const latitudeDifference = radians(destination.latitude - origin.latitude);
    const longitudeDifference = radians(destination.longitude - origin.longitude);
    const originLatitude = radians(origin.latitude);
    const destinationLatitude = radians(destination.latitude);

    const a =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.sin(longitudeDifference / 2) ** 2 *
        Math.cos(originLatitude) *
        Math.cos(destinationLatitude);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  async function calculateManualDistance(origin, destination) {
    try {
      return await routeManualDistanceByRoad(origin, destination);
    } catch (error) {
      return {
        distanciaKm: manualStraightLineDistanceKm(origin, destination) * 1.25,
        aproximada: true,
      };
    }
  }

  function manualPhFeeByDistance(distanceKm) {
    const config = getManualPhDeliveryConfig();
    const band = config.bands.find((item) => distanceKm <= item.ateKm);

    return band ? band.taxa : null;
  }

  async function calculateManualPhDelivery(formNode) {
    if (!manualPhAddressReady(formNode)) {
      setManualDeliveryStatus(
        formNode,
        "Na PH, informe o CEP e o número para calcular a taxa automaticamente.",
      );

      return;
    }

    const calculationVersion = ++manualPhDeliveryVersion;
    const feeInput = formNode.querySelector('[name="taxa_entrega"]');

    formNode.dataset.phDeliveryCalculating = "true";
    feeInput?.setAttribute("aria-busy", "true");
    setManualDeliveryStatus(formNode, "Calculando distância e taxa da PH...");

    try {
      const [storeCoordinates, clientCoordinates] = await Promise.all([
        getManualPhStoreCoordinates(),
        geocodeManualWithAttempts(buildManualPhClientAddressCandidates(formNode)),
      ]);

      const result = await calculateManualDistance(
        storeCoordinates,
        clientCoordinates,
      );

      if (calculationVersion !== manualPhDeliveryVersion) {
        return;
      }

      const distanceKm = Number(result.distanciaKm.toFixed(1));
      const config = getManualPhDeliveryConfig();
      const fee = manualPhFeeByDistance(distanceKm);
      const available = fee !== null && distanceKm <= config.limit;

      if (!available) {
        if (feeInput) {
          feeInput.value = "0,00";
        }

        setManualDeliveryStatus(
          formNode,
          `Distância ${distanceKm.toFixed(1)} km • fora do limite de ${config.limit} km. A taxa pode ser informada manualmente se necessário.`,
          "warning",
        );

        return;
      }

      if (feeInput) {
        feeInput.value = Number(fee).toFixed(2).replace(".", ",");
      }

      setManualDeliveryStatus(
        formNode,
        `${distanceKm.toFixed(1)} km • taxa automática ${formatMoney(fee)}${
          result.aproximada ? " • distância aproximada" : ""
        }.`,
        "success",
      );
    } catch (error) {
      console.error("Erro ao calcular entrega da PH no pedido manual:", error);

      if (calculationVersion !== manualPhDeliveryVersion) {
        return;
      }

      setManualDeliveryStatus(
        formNode,
        "Não foi possível calcular automaticamente. Confira o endereço ou informe a taxa manualmente.",
        "error",
      );
    } finally {
      if (calculationVersion === manualPhDeliveryVersion) {
        delete formNode.dataset.phDeliveryCalculating;
        feeInput?.removeAttribute("aria-busy");
      }
    }
  }

  function scheduleManualPhDelivery(formNode) {
    clearTimeout(manualPhDeliveryTimer);

    if (!formNode || !manualPhAddressReady(formNode)) {
      setManualDeliveryStatus(
        formNode,
        "Na PH, informe o CEP e o número para calcular a taxa automaticamente.",
      );

      return;
    }

    manualPhDeliveryTimer = window.setTimeout(
      () => calculateManualPhDelivery(formNode),
      800,
    );
  }

  function refreshManualDeliveryForEstablishment(formNode, establishment) {
    if (!formNode) {
      return;
    }

    invalidateManualPhDelivery(formNode);

    const feeInput = formNode.querySelector('[name="taxa_entrega"]');

    if (establishment === "ph_sabor_cia") {
      if (feeInput) {
        feeInput.value = "0,00";
      }

      if (manualPhAddressReady(formNode)) {
        scheduleManualPhDelivery(formNode);
      } else {
        setManualDeliveryStatus(
          formNode,
          "Na PH, informe o CEP e o número para calcular a taxa automaticamente.",
        );
      }

      return;
    }

    const district = findManualOrderDistrictByName(
      formNode.querySelector('[name="bairro"]')?.value || "",
    );

    if (feeInput) {
      feeInput.value = Number(district?.taxa || 0).toFixed(2).replace(".", ",");
    }

    setManualDeliveryStatus(
      formNode,
      district
        ? `Taxa da Azury pelo bairro: ${formatMoney(district.taxa)}.`
        : "Na Azury, a taxa é carregada pelo bairro cadastrado.",
      district ? "success" : "",
    );
  }

  function findManualOrderDistrictByName(name) {
    const key = normalizeKey(name);

    return (
      (state.operacao?.bairros || []).find((item) => {
        if (item.ativo === false) {
          return false;
        }

        const aliases = Array.isArray(item.aliases) ? item.aliases : [];

        return (
          normalizeKey(item.nome) === key ||
          aliases.some((alias) => normalizeKey(alias) === key)
        );
      }) || null
    );
  }

  document.addEventListener(
    "input",

    (event) => {
      const cepInput = event.target;

      const candidateForm = cepInput?.closest?.("#dynamicModalForm");

      if (
        candidateForm?.querySelector("[data-manual-establishment]") &&
        ["numero", "rua", "bairro"].includes(String(cepInput?.name || "")) &&
        String(candidateForm.querySelector('[name="estabelecimento"]')?.value || "") ===
          "ph_sabor_cia"
      ) {
        invalidateManualPhDelivery(candidateForm);
        scheduleManualPhDelivery(candidateForm);

        return;
      }

      if (cepInput?.name !== "cep") {
        return;
      }

      const formNode = cepInput.closest("#dynamicModalForm");

      if (!formNode?.querySelector("[data-manual-establishment]")) {
        return;
      }

      const digits = String(cepInput.value || "")
        .replace(/\D/g, "")
        .slice(0, 8);

      cepInput.value =
        digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;

      if (digits.length !== 8) {
        delete cepInput.dataset.cepConsultado;
        delete formNode.dataset.manualCepCity;
        delete formNode.dataset.manualCepState;

        if (
          String(formNode.querySelector('[name="estabelecimento"]')?.value || "") ===
          "ph_sabor_cia"
        ) {
          invalidateManualPhDelivery(
            formNode,
            "Na PH, informe o CEP e o número para calcular a taxa automaticamente.",
          );
        }

        return;
      }

      if (cepInput.dataset.cepConsultado === digits) {
        return;
      }

      cepInput.dataset.cepConsultado = digits;

      cepInput.setAttribute("aria-busy", "true");

      fetch(`https://viacep.com.br/ws/${digits}/json/`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Não foi possível consultar o CEP agora.");
          }

          return response.json();
        })
        .then((address) => {
          if (address?.erro) {
            throw new Error(
              "CEP não encontrado. Confira os números informados.",
            );
          }

          const streetInput = formNode.querySelector('[name="rua"]');

          const districtInput = formNode.querySelector('[name="bairro"]');

          const feeInput = formNode.querySelector('[name="taxa_entrega"]');

          const numberInput = formNode.querySelector('[name="numero"]');

          const establishment = String(
            formNode.querySelector('[name="estabelecimento"]')?.value ||
              "azury",
          );

          if (streetInput) {
            streetInput.value = String(address?.logradouro || "").trim();
          }

          if (districtInput) {
            districtInput.value = String(address?.bairro || "").trim();
          }

          formNode.dataset.manualCepCity = String(
            address?.localidade || "São Paulo",
          ).trim();
          formNode.dataset.manualCepState = String(address?.uf || "SP").trim();

          if (establishment === "azury") {
            const district = findManualOrderDistrictByName(
              address?.bairro || "",
            );

            if (district) {
              districtInput.value = district.nome;

              feeInput.value = Number(district.taxa || 0)
                .toFixed(2)
                .replace(".", ",");

              showMessage(
                `Endereço carregado • ${district.nome} • Entrega ${formatMoney(
                  district.taxa,
                )}.`,
                "success",
              );
            } else {
              feeInput.value = "0,00";

              showMessage(
                `CEP encontrado, mas o bairro “${
                  address?.bairro || ""
                }” não está cadastrado/ativo na Azury. Confira a taxa manualmente.`,
                "warning",
              );
            }
          } else {
            invalidateManualPhDelivery(formNode);

            if (numberInput?.value.trim()) {
              scheduleManualPhDelivery(formNode);

              showMessage(
                "Endereço carregado. Calculando a taxa de entrega da PH...",
                "success",
              );
            } else {
              setManualDeliveryStatus(
                formNode,
                "CEP encontrado. Informe o número para calcular a taxa da PH.",
              );

              showMessage(
                "Rua e bairro carregados. Informe o número para calcular a entrega da PH.",
                "success",
              );
            }
          }

          numberInput?.focus();
        })
        .catch((error) => {
          delete cepInput.dataset.cepConsultado;

          console.error(error);

          showMessage(error.message, "error");
        })
        .finally(() => {
          cepInput.removeAttribute("aria-busy");
        });
    },
  );

  document.addEventListener(
    "keydown",

    (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);

        if (!el.modalBackdrop.hidden) {
          closeModal();
        }
      }
    },
  );

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );
  }

  window.addEventListener(
    "beforeunload",

    () => {
      stopRealtimeOrders();

      stopOrderAlarm();
    },
  );

  window.addEventListener(
    "resize",

    () => {
      if (window.innerWidth > 900) {
        setSidebarOpen(false);
      }
    },
  );

  window.addEventListener(
    "online",

    () => setConnection(true, "Internet disponível"),
  );

  window.addEventListener(
    "offline",

    () => setConnection(false, "Sem internet"),
  );

  supabase.auth.onAuthStateChange((event, session) => {
    state.session = session;

    if (event === "SIGNED_OUT") {
      showAuth();
    }
  });

  bootstrap();
})();