(function () {
  "use strict";
  const supabase = window.AzurySupabase;
  if (!supabase) {
    console.error("Cliente Supabase não disponível.");
    return;
  }
  const VAPID_PUBLIC_KEY =
    "BI6lY59TKq__8CSOrvnk_FEGYUCbidsGR81loR8RsaYgO3eCoHFbQsfgWPNuENMEt95K02Od4k21GIo_eVVyaxM";
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
    rastreamentos: [],
    clientes: [],
    resumoClientes: {},
    operacao: null,
    phConfig: null,
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
    alarmTimer: null,
    activeAlarmOrderId: null,
    activeAlarmCode: null,
    pushSupported: false,
    pushEnabled: false,
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
    el.connectionStatus.className = `connection-pill ${online ? "online" : "offline"}`;
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
  function renderOverview() {
    const r = state.resumoPedidos || {};
    const op = state.operacao?.resumo || {};
    el.overviewCards.innerHTML = [
      metricCard("📦", r.total ?? 0, "Total de pedidos"),
      metricCard("🟡", r.recebidos ?? 0, "Aguardando aceite"),
      metricCard(
        "👨‍🍳",
        (r.aceitos ?? 0) + (r.em_preparo ?? 0) + (r.prontos ?? 0),
        "Em andamento",
      ),
      metricCard(
        "💰",
        formatMoney(r.faturamento_entregue ?? 0),
        "Faturamento entregue",
      ),
    ].join("");
    const config = state.operacao?.configuracao_loja || {};
    const active = config.pedidos_ativos === true;
    el.storeStatusPanel.innerHTML = `
      <div class="store-status-row">
        <span>Pedidos</span>
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
        <span>Bairros ativos</span>
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
              <span>Mensagem</span>
              <strong>
                ${escapeHtml(config.mensagem_pausa)}
              </strong>
            </div>
          `
          : ""
      }
    `;
    const recent = state.pedidos.slice(0, 5);
    if (!recent.length) {
      setEmpty(el.recentOrders, "Nenhum pedido cadastrado no Supabase.");
      return;
    }
    el.recentOrders.innerHTML = recent
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
  async function loadOverview() {
    setConnection(true, "Atualizando...");
    try {
      const [ordersData, operationData, trackingData] = await Promise.all([
        rpc("listar_pedidos_admin", {
          p_status: null,
          p_limite: 100,
        }),
        rpc("listar_operacao_admin"),
        rpc("listar_rastreamentos_admin"),
      ]);
      state.pedidos = ordersData.pedidos || [];
      state.resumoPedidos = ordersData.resumo || {};
      state.rastreamentos = Array.isArray(trackingData) ? trackingData : [];
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
  const AZURY_BOXES_ADMIN = [
    {
      key: "azury-box-p",
      label: "P",
      nome: "Azury Box P",
      preco: 15,
      limite: 4,
    },
    {
      key: "azury-box-m",
      label: "M",
      nome: "Azury Box M",
      preco: 25,
      limite: 5,
    },
    {
      key: "azury-box-g",
      label: "G",
      nome: "Azury Box G",
      preco: 35,
      limite: 6,
    },
  ];
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
        AZURY_BOXES_ADMIN.find((entry) => entry.key === productKey) ||
        AZURY_BOXES_ADMIN.find(
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
      const box = AZURY_BOXES_ADMIN.find((entry) => entry.key === raw);
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
            • ${escapeHtml(size)}ml
            — ${formatMoney(item.preco_base)}
          </option>
        `;
      })
      .join("");
    const boxOptions = AZURY_BOXES_ADMIN.map(
      (box) => `
        <option
          value="${escapeHtml(box.key)}"
          ${box.key === String(selectedValue) ? "selected" : ""}
        >
          ${escapeHtml(box.nome)}
          — ${formatMoney(box.preco)}
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
  function manualAzuryComplementCards() {
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
              <span class="manual-complement-image ${image ? "" : "is-empty"}">
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
                <strong>${escapeHtml(item.nome)}</strong>
                <small
                  data-manual-complement-rule
                  data-special="${special ? "true" : "false"}"
                >
                  ${special ? "Especial pago no copo" : "Dentro do limite grátis"}
                  • ${formatMoney(item.preco || 0)}
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
                  name="manual-layer-${escapeHtml(index)}"
                  value="meio"
                >
                Meio
              </label>
              <label>
                <input
                  type="radio"
                  name="manual-layer-${escapeHtml(index)}"
                  value="cobertura"
                >
                Cobertura
              </label>
              <label>
                <input
                  type="radio"
                  name="manual-layer-${escapeHtml(index)}"
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
        <strong>${formatMoney(unitPrice)}</strong>
        <span>
          Base ${formatMoney(descriptor.preco_base)}
          • ${freeUsed}/${descriptor.limite} ${
            descriptor.tipo === "azury_box" ? "incluídos" : "grátis"
          }
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
          rule.textContent = `Incluído dentro do limite • Extra ${formatMoney(price)}`;
          rule.classList.remove("is-special");
        } else if (special) {
          rule.textContent = `Especial pago • ${formatMoney(price)}`;
          rule.classList.add("is-special");
        } else {
          rule.textContent = `Grátis dentro do limite • Extra ${formatMoney(price)}`;
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
                firstDefined(complement, ["camada"], boxMode ? "unica" : ""),
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
            ml —
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
            ml —
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
            <span>Produto</span>
            <select
              data-manual-azury-product
              required
            >
              ${manualAzuryProductOptions(defaultProduct)}
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
            <span>Valor unitário calculado</span>
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
            <strong>Complementos</strong>
            <small>
              Clique no complemento e, nos copos, escolha Meio, Cobertura ou Nos dois.
            </small>
          </div>
        </div>
        <div class="manual-complements-grid">
          ${manualAzuryComplementCards()}
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
            <span>Produto</span>
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
            <span>Tamanho</span>
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

  /* =======================================================
     CONFIRMAÇÃO PROFISSIONAL PELO WHATSAPP
  ======================================================= */

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
      /*
       * Se o navegador bloquear nova aba,
       * abre o WhatsApp na aba atual.
       * Assim nunca registra e simplesmente some.
       */
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
            <option value="azury">
              Azury
            </option>
            <option value="ph_sabor_cia">
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
          <span>CEP</span>
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
              .map(
                (item) => `
                    <option value="${escapeHtml(item.nome)}">
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
        ${manualItemRowHtml(1, "azury")}
      </div>
      <label
        class="modal-field full"
        style="grid-column: 1 / -1;"
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
    refreshManualAzuryRow(
      el.dynamicModalForm.querySelector("[data-manual-item-row]"),
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
  async function activateOrderSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
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
    state.soundEnabled = state.audioContext.state === "running";
    updateOrderSoundButton();
    if (!state.soundEnabled) {
      throw new Error(
        "O navegador não liberou o áudio. Clique novamente em Ativar som.",
      );
    }
    playOrderAlarmPattern();
    showMessage("Som de novos pedidos ativado.");
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
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      state.pushEnabled = false;
      updatePushNotificationButton();
      return;
    }
    await savePushSubscription(subscription);
  }
  async function activatePushNotifications() {
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
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      state.pushEnabled = false;
      updatePushNotificationButton();
      throw new Error(
        "As notificações não foram autorizadas neste dispositivo.",
      );
    }
    const registration = await getAdminServiceWorkerRegistration();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await savePushSubscription(subscription);
    showMessage("Notificações de novos pedidos ativadas neste dispositivo.");
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
    window.setTimeout(() => {
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
        ["cliente_nome", "nome_do_cliente", "nome_cliente", "cliente", "nome"],
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
    }, 0);
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
        const size = Number(firstDefined(merged, ["tamanho_ml", "tamanho"], 0));
        const productType = String(
          firstDefined(merged, ["produto_tipo"], ""),
        ).toLowerCase();
        const productKey = firstDefined(merged, ["produto_chave"], "");
        const boxMode =
          productType === "azury_box" || isAzuryBoxKey(productKey);
        const quantity = firstDefined(item, ["quantidade"], 1);
        const itemNote = firstDefined(item, ["observacoes", "observacao"], "");
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
                      ${escapeHtml(Array.from(new Set(layers.meio)).join(", "))}
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
    const hasAddress = street || number || district || zip || complement;
    if (!hasAddress) {
      return "";
    }
    const firstLine = [street, number ? `nº ${number}` : ""]
      .filter(Boolean)
      .join(", ");
    return `
      <section class="print-section">
        <h2>ENTREGA</h2>
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
    const payment = firstDefined(order, ["forma_pagamento"], "Não informada");
    const changeFor = firstDefined(order, ["troco_para"], "");
    const subtotal = toNumber(
      firstDefined(order, ["subtotal", "valor_produtos"], 0),
    );
    const fee = toNumber(firstDefined(order, ["taxa_entrega", "taxa"], 0));
    const discount = toNumber(firstDefined(order, ["desconto"], 0));
    const total = toNumber(firstDefined(order, ["valor_total", "total"], 0));
    const note = firstDefined(order, ["observacoes", "observacao"], "");
    const createdAt = firstDefined(order, ["criado_em", "created_at"], "");
    const isPhOrder = order.estabelecimento === "ph_sabor_cia";
    const printBrand = isPhOrder ? "PH SABOR & CIA" : "AZURY";
    const printFooter = isPhOrder
      ? "PH SABOR & CIA"
      : "AZURY • azurydelivery.com.br";
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comanda ${escapeHtml(code)}</title>
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
  <h2>CLIENTE</h2>
  <p>
    <strong>
      ${escapeHtml(customerName)}
    </strong>
  </p>
</section>
<section class="print-section">
  <h2>ITENS DO PEDIDO</h2>
  ${printableOrderItemsHtml(order)}
</section>
${
  note
    ? `
      <section class="print-section">
        <h2>OBSERVAÇÕES</h2>
        <p class="print-observation">
          ${escapeHtml(note)}
        </p>
      </section>
    `
    : ""
}
<section class="print-section">
  <h2>PAGAMENTO</h2>
  <p>
    <strong>Forma:</strong>
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
  <h2>RESUMO</h2>
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
    <span>TOTAL</span>
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
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 200);
  }
  function renderOrders() {
    const r = state.resumoPedidos || {};
    const adminLevel = String(state.admin?.nivel_acesso || "").toLowerCase();
    const canEditOrders = ["proprietario", "administrador"].includes(
      adminLevel,
    );
    const canDeleteOrders = adminLevel === "proprietario";
    const summaryFor = (establishment) => {
      const orders = state.pedidos.filter(
        (order) =>
          (order.estabelecimento === "ph_sabor_cia"
            ? "ph_sabor_cia"
            : "azury") === establishment,
      );
      const count = (status) =>
        orders.filter((order) => order.status === status).length;
      return {
        total: orders.length,
        recebidos: count("recebido"),
        aceitos: count("confirmado"),
        em_preparo: count("em_preparo") + count("pronto"),
        em_entrega: count("saiu_para_entrega"),
        entregues: count("entregue"),
      };
    };
    const azury = summaryFor("azury");
    const ph = summaryFor("ph_sabor_cia");
    const summaryGroup = (title, values) => `
      <section class="orders-store-summary">
        <div class="orders-store-summary-title">
          <strong>${escapeHtml(title)}</strong>
        </div>
        <div class="metric-grid compact-metrics">
          ${[
            metricCard("📦", values.total, "Total"),
            metricCard("🟡", values.recebidos, "Recebidos"),
            metricCard("✅", values.aceitos, "Aceitos"),
            metricCard("👨‍🍳", values.em_preparo, "Em preparo"),
            metricCard("🛵", values.em_entrega, "Em entrega"),
            metricCard("🏁", values.entregues, "Entregues"),
          ].join("")}
        </div>
      </section>
    `;
    el.ordersSummary.innerHTML =
      summaryGroup("Azury", azury) + summaryGroup("PH Sabor & Cia", ph);
    const filter = el.ordersStatusFilter.value;
    const orders = filter
      ? state.pedidos.filter((order) => order.status === filter)
      : state.pedidos;
    if (!orders.length) {
      setEmpty(el.ordersList, "Nenhum pedido encontrado.");
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
        const payment = firstDefined(
          order,
          ["forma_pagamento"],
          "Não informada",
        );
        const paymentStatus = firstDefined(
          order,
          ["status_pagamento"],
          "pendente",
        );
        const note = firstDefined(order, ["observacoes", "observacao"], "");
        const establishment =
          order.estabelecimento === "ph_sabor_cia" ? "PH Sabor & Cia" : "Azury";
        const tracking = findOrderTracking(order.id);
        const trackingActive = tracking?.ativo === true;
        const canStartTracking =
          !trackingActive && !["entregue", "cancelado"].includes(order.status);
        return `
              <article
                class="order-card"
                data-order-id="${escapeHtml(order.id)}"
              >
                <header class="order-head">
                  <div>
                    <h3>
                      Pedido
                      ${escapeHtml(code)}
                    </h3>
                    <p>
                      ${escapeHtml(formatDate(order.criado_em))}
                    </p>
                  </div>
                  <span
                    class="status-badge status-${escapeHtml(order.status)}"
                  >
                    ${escapeHtml(statusLabel(order.status))}
                  </span>
                </header>
                <div class="order-metrics">
                  <div class="order-metric">
                    <span>
                      Estabelecimento
                    </span>
                    <strong>
                      ${escapeHtml(establishment)}
                    </strong>
                  </div>
                  <div class="order-metric">
                    <span>
                      Cliente
                    </span>
                    <strong>
                      ${escapeHtml(customerName)}
                    </strong>
                  </div>
                  <div class="order-metric">
                    <span>
                      Produtos
                    </span>
                    <strong>
                      ${formatMoney(subtotal)}
                    </strong>
                  </div>
                  <div class="order-metric">
                    <span>
                      Entrega
                    </span>
                    <strong>
                      ${formatMoney(fee)}
                    </strong>
                  </div>
                  <div class="order-metric">
                    <span>
                      Total
                    </span>
                    <strong>
                      ${formatMoney(total)}
                    </strong>
                  </div>
                  <div class="order-metric">
                    <span>
                      Pagamento
                    </span>
                    <strong>
                      ${escapeHtml(payment)}
                      •
                      ${escapeHtml(paymentStatus)}
                    </strong>
                  </div>
                  <div class="order-metric">
                    <span>
                      Rastreamento
                    </span>
                    <strong>
                      ${trackingActive ? "Ativo" : "Desativado"}
                    </strong>
                  </div>
                </div>
                <div class="order-body">
                  <div class="order-block">
                    <h4>
                      Cliente e entrega
                    </h4>
                    <p>
                      <strong>
                        Telefone:
                      </strong>
                      ${escapeHtml(phone)}
                    </p>
                    <p>
                      <strong>
                        E-mail:
                      </strong>
                      ${escapeHtml(email)}
                    </p>
                    ${addressHtml(order)}
                    ${
                      note
                        ? `
                          <p>
                            <strong>
                              Observação:
                            </strong>
                            ${escapeHtml(note)}
                          </p>
                        `
                        : ""
                    }
                  </div>
                  <div class="order-block">
                    <h4>
                      Itens do pedido
                    </h4>
                    ${orderItemsHtml(order)}
                  </div>
                </div>
                <footer class="order-actions">
                  ${
                    next
                      ? `
                        <button
                          class="btn ${next.className}"
                          data-order-action="next"
                          data-next-status="${next.status}"
                          type="button"
                        >
                          ${escapeHtml(next.label)}
                        </button>
                      `
                      : ""
                  }
                  <button
                    class="btn btn-secondary"
                    data-order-action="print"
                    type="button"
                  >
                    🖨️ Imprimir comanda
                  </button>
                  ${
                    trackingActive
                      ? `
                        <button
                          class="btn btn-secondary"
                          data-order-action="tracking-courier"
                          type="button"
                        >
                          🛵 Abrir entregador
                        </button>
                        <button
                          class="btn btn-success"
                          data-order-action="tracking-customer"
                          type="button"
                        >
                          🔗 Enviar rastreamento
                        </button>
                        <button
                          class="btn btn-danger"
                          data-order-action="tracking-end"
                          type="button"
                        >
                          ⏹ Encerrar rastreamento
                        </button>
                      `
                      : ""
                  }
                  ${
                    canStartTracking
                      ? `
                        <button
                          class="btn btn-secondary"
                          data-order-action="tracking-start"
                          type="button"
                        >
                          📍 Ativar rastreamento
                        </button>
                      `
                      : ""
                  }
                  ${
                    canNotifyOrderOnWhatsApp(order)
                      ? `
                        <button
                          class="btn btn-success"
                          data-order-action="whatsapp"
                          type="button"
                        >
                          💬 Avisar cliente
                        </button>
                      `
                      : ""
                  }
                  ${
                    canEditOrders
                      ? `
                        <button
                          class="btn btn-secondary"
                          data-order-action="edit"
                          type="button"
                        >
                          Editar pedido
                        </button>
                      `
                      : ""
                  }
                  ${
                    !["entregue", "cancelado"].includes(order.status)
                      ? `
                        <button
                          class="btn btn-danger"
                          data-order-action="cancel"
                          type="button"
                        >
                          Cancelar
                        </button>
                      `
                      : ""
                  }
                  ${
                    canDeleteOrders
                      ? `
                        <button
                          class="btn btn-danger"
                          data-order-action="delete"
                          type="button"
                        >
                          Excluir pedido
                        </button>
                      `
                      : ""
                  }
                  <div class="payment-control">
                    <select data-payment-select>
                      <option
                        value="pendente"
                        ${paymentStatus === "pendente" ? "selected" : ""}
                      >
                        Pagamento pendente
                      </option>
                      <option
                        value="pago"
                        ${paymentStatus === "pago" ? "selected" : ""}
                      >
                        Pago
                      </option>
                      <option
                        value="cancelado"
                        ${paymentStatus === "cancelado" ? "selected" : ""}
                      >
                        Cancelado
                      </option>
                      <option
                        value="estornado"
                        ${paymentStatus === "estornado" ? "selected" : ""}
                      >
                        Estornado
                      </option>
                    </select>
                    <button
                      class="btn btn-secondary"
                      data-order-action="payment"
                      type="button"
                    >
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
              : `Pedido atualizado para “${statusLabel(status)}”, mas o rastreamento não pôde ser encerrado automaticamente.`,
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
      if (action === "cancel") {
        openModal({
          title: "Cancelar pedido",
          fields: [
            {
              name: "motivo",
              label: "Motivo do cancelamento",
              type: "textarea",
              required: true,
              full: true,
              minLength: 5,
            },
          ],
          submitText: "Cancelar pedido",
          submitClass: "btn-danger",
          onSubmit: async (values) => {
            await updateOrder(orderId, "cancelado", null, values.motivo);
            const trackingEnded = await endOrderTrackingIfActive(orderId);
            showMessage(
              trackingEnded
                ? "Pedido cancelado."
                : "Pedido cancelado, mas o rastreamento não pôde ser encerrado automaticamente.",
              "warning",
            );
          },
        });
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
        const zip = firstDefined(order, ["cep"], "");
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
        const addressComplement = firstDefined(
          order,
          ["complemento_endereco", "endereco_complemento", "complemento"],
          "",
        );
        const payment = firstDefined(order, ["forma_pagamento"], "pix");
        const paymentStatus = firstDefined(
          order,
          ["status_pagamento"],
          "pendente",
        );
        const changeFor = firstDefined(order, ["troco_para"], "");
        const fee = toNumber(firstDefined(order, ["taxa_entrega", "taxa"], 0));
        const discount = toNumber(firstDefined(order, ["desconto"], 0));
        const note = firstDefined(order, ["observacoes", "observacao"], "");
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
            const result = await rpc("editar_pedido_admin", {
              p_pedido_id: orderId,
              p_dados: {
                cliente_nome: String(values.cliente_nome || "").trim(),
                cliente_telefone:
                  String(values.cliente_telefone || "").trim() || null,
                cliente_email:
                  String(values.cliente_email || "").trim() || null,
                forma_pagamento: values.forma_pagamento,
                status_pagamento: values.status_pagamento,
                troco_para: values.troco_para === "" ? null : values.troco_para,
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
            });
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
            const result = await rpc("excluir_pedido_admin", {
              p_pedido_id: orderId,
              p_confirmacao: confirmation,
            });
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
    const data = await rpc("listar_clientes_admin", {
      p_busca: el.clientsSearch.value.trim() || null,
      p_ativo: activeValue === "" ? null : activeValue === "true",
      p_limite: 100,
      p_offset: 0,
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
      metricCard("🛡️", r.administradores ?? 0, "Administradores"),
    ].join("");
    if (!state.clientes.length) {
      setEmpty(el.clientsList, "Nenhum cliente encontrado.");
      return;
    }
    el.clientsList.innerHTML = state.clientes
      .map((client) => {
        const name = firstDefined(client, ["nome"], "Cliente");
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
        await rpc("atualizar_cliente_admin", {
          p_cliente_id: client.id,
          p_nome: String(values.nome || "").trim(),
          p_telefone: String(values.telefone || "").trim() || null,
        });
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
      await rpc("alterar_status_cliente_admin", {
        p_cliente_id: clientId,
        p_ativo: targetActive,
        p_observacao: observation,
      });
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
      firstDefined(client, ["email_auth", "email"], "") || "",
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
  function renderOperationSections() {
    if (!state.operacao) {
      return;
    }
    renderSizes();
    renderComplements();
    renderNeighborhoods();
    renderStoreConfig();
    renderSchedules();
    renderRewards();
    renderPhConfigPanel();
  }
  function renderSizes() {
    const sizes = state.operacao?.tamanhos || [];
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
  function renderComplements() {
    const items = state.operacao?.complementos || [];
    if (!items.length) {
      return setEmpty(el.complementsList, "Nenhum complemento cadastrado.");
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
                        : `${escapeHtml(item.quantidade_copos)} copo(s) de ${escapeHtml(item.tamanho_ml)} ml`
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
    const section = document.getElementById("section-cardapio");
    if (!section) {
      return null;
    }
    panel = document.createElement("section");
    panel.id = "phConfigPanel";
    panel.className = "panel ph-menu-panel";
    panel.style.marginTop = "24px";
    section.appendChild(panel);
    return panel;
  }
  function ensurePhStorePanel() {
    let panel = document.getElementById("phStorePanel");
    if (panel) {
      return panel;
    }
    const section = document.getElementById("section-horarios");
    if (!section) {
      return null;
    }
    panel = document.createElement("section");
    panel.id = "phStorePanel";
    panel.className = "panel ph-store-panel";
    panel.style.marginTop = "24px";
    section.appendChild(panel);
    return panel;
  }
  function renderPhStorePanel() {
    const panel = ensurePhStorePanel();
    if (!panel) {
      return;
    }
    if (!state.phConfig) {
      panel.innerHTML = `
        <div class="panel-heading">
          <div>
            <span class="eyebrow">PH SABOR &amp; CIA</span>
            <h2>Loja e horários</h2>
            <p>Carregue a configuração da PH para gerenciar funcionamento e entrega.</p>
          </div>
          <button
            class="btn btn-primary"
            data-ph-config-reload
            type="button"
          >
            Carregar PH
          </button>
        </div>
      `;
      return;
    }
    const store = state.phConfig.loja || {};
    const address = store.endereco || {};
    const schedule = store.horario || {};
    const bands = Array.isArray(store.faixas_entrega)
      ? store.faixas_entrega
      : [];
    const days = Array.isArray(schedule.dias)
      ? schedule.dias.join(", ")
      : schedule.dias || "Não informado";
    const addressText =
      [
        address.rua,
        address.numero ? `nº ${address.numero}` : "",
        address.bairro,
        address.cidade,
        address.estado,
      ]
        .filter(Boolean)
        .join(" • ") || "Endereço não informado";
    const bandsText = bands.length
      ? bands
          .map((item) => `até ${item.ate_km} km: ${formatMoney(item.taxa)}`)
          .join(" • ")
      : "Não informadas";
    panel.innerHTML = `
      <div class="panel-heading">
        <div>
          <span class="eyebrow">PH SABOR &amp; CIA</span>
          <h2>Loja e horários</h2>
          <p>
            Funcionamento, contato, endereço e taxas da PH ficam centralizados aqui.
          </p>
        </div>
        <button
          class="btn btn-secondary"
          data-ph-config-reload
          type="button"
        >
          Atualizar dados PH
        </button>
      </div>
      <article class="data-card">
        <div class="data-card-head">
          <div>
            <h3>${escapeHtml(store.nome || "PH Sabor & Cia")}</h3>
            <p>
              ${escapeHtml(schedule.abertura || "—")}
              às
              ${escapeHtml(schedule.fechamento || "—")}
            </p>
          </div>
          <span
            class="small-badge ${
              store.retirada_ativa !== false ? "active" : "inactive"
            }"
          >
            Retirada
            ${store.retirada_ativa !== false ? "ativa" : "inativa"}
          </span>
        </div>
        <div class="data-pairs">
          <div class="data-pair">
            <span>WhatsApp</span>
            <strong>${escapeHtml(store.whatsapp || "Não informado")}</strong>
          </div>
          <div class="data-pair">
            <span>Instagram</span>
            <strong>${escapeHtml(store.instagram || "Não informado")}</strong>
          </div>
          <div class="data-pair">
            <span>Pedido mínimo</span>
            <strong>${formatMoney(store.pedido_minimo || 0)}</strong>
          </div>
          <div class="data-pair">
            <span>Limite de entrega</span>
            <strong>${escapeHtml(store.limite_entrega_km ?? "—")} km</strong>
          </div>
          <div class="data-pair">
            <span>Dias</span>
            <strong>${escapeHtml(days)}</strong>
          </div>
          <div class="data-pair">
            <span>Horário</span>
            <strong>
              ${escapeHtml(schedule.abertura || "—")}
              às
              ${escapeHtml(schedule.fechamento || "—")}
            </strong>
          </div>
        </div>
        <p class="ph-store-detail">
          <strong>Endereço:</strong>
          ${escapeHtml(addressText)}
        </p>
        <p class="ph-store-detail">
          <strong>Faixas de entrega:</strong>
          ${escapeHtml(bandsText)}
        </p>
        <div class="data-card-actions">
          <button
            class="btn btn-secondary"
            data-ph-edit-store
            type="button"
          >
            Editar loja e horários
          </button>
          ${
            bands.length
              ? `
                <button
                  class="btn btn-secondary"
                  data-ph-edit-delivery-bands
                  type="button"
                >
                  Editar taxas por distância
                </button>
              `
              : ""
          }
        </div>
      </article>
    `;
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
                  <p style="margin-top:10px;">
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
            <span class="eyebrow">PH SABOR &amp; CIA</span>
            <h2>Cardápio PH</h2>
            <p>Produtos e acompanhamentos da PH ficam nesta área.</p>
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
    const meals = Array.isArray(config.marmitas) ? config.marmitas : [];
    const drinks = Array.isArray(config.bebidas) ? config.bebidas : [];
    const addons = Array.isArray(config.adicionais) ? config.adicionais : [];
    const accompaniments = Array.isArray(config.acompanhamentos)
      ? config.acompanhamentos
      : [];
    panel.innerHTML = `
      <div class="panel-heading">
        <div>
          <span class="eyebrow">PH SABOR &amp; CIA</span>
          <h2>Cardápio PH</h2>
          <p>
            Somente produtos da PH e preferência de salada. Funcionamento foi movido para Loja e horários.
          </p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
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
      <div style="margin-bottom:24px;">
        <h3 style="margin-bottom:12px;">
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
      <div style="margin-bottom:24px;">
        <h3 style="margin-bottom:12px;">
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
      <div style="margin-bottom:24px;">
        <h3 style="margin-bottom:12px;">
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
        <h3 style="margin-bottom:12px;">
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
                            <h3>${escapeHtml(item.nome)}</h3>
                            <p>Preferência de salada</p>
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
    return { nome, capacidade_ml: capacidadeMl, descricao, preco, ativo };
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

    return { next, changed };
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
    const result = await rpc("salvar_configuracao_ph_admin", {
      p_dados: nextConfig,
    });
    state.phConfig = result?.dados || nextConfig;
    renderPhConfigPanel();
    showMessage(message);
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
        await rpc("atualizar_tamanho_admin", {
          p_dados: {
            id: item.id,
            ...values,
          },
        });
        await reloadOperation("Tamanho atualizado.");
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
        await rpc(editing ? "atualizar_bairro_admin" : "criar_bairro_admin", {
          p_dados: editing
            ? {
                id: item.id,
                ...values,
              }
            : values,
        });
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
      await rpc("atualizar_configuracao_loja_admin", {
        p_dados: data,
      });
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
      await rpc("atualizar_horario_admin", {
        p_dados: data,
      });
      await reloadOperation("Horário atualizado.");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  }
  async function loadTeam() {
    setLoading(el.teamList, "Carregando equipe...");
    const data = await rpc("listar_administradores_admin", {
      p_busca: null,
      p_ativo: null,
      p_limite: 100,
      p_offset: 0,
    });
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
          await rpc("gerenciar_administrador_admin", {
            p_usuario_id: item.usuario_id,
            p_nivel_acesso: values.nivel_acesso,
            p_ativo: values.ativo,
            p_nome_exibicao: values.nome_exibicao || null,
            p_observacao: values.observacao || null,
          });
        } else {
          await rpc("gerenciar_administrador_por_email_admin", {
            p_email: String(values.email || "")
              .trim()
              .toLowerCase(),
            p_nivel_acesso: values.nivel_acesso,
            p_ativo: values.ativo,
            p_nome_exibicao: values.nome_exibicao || null,
            p_observacao: values.observacao || null,
          });
        }
        await loadTeam();
        showMessage(editing ? "Acesso atualizado." : "Membro adicionado.");
      },
    });
  }
  async function loadAudit() {
    setLoading(el.auditList, "Carregando auditoria...");
    const data = await rpc("listar_auditoria_admin", {
      p_entidade: el.auditEntityFilter.value || null,
      p_limite: 100,
      p_offset: 0,
    });
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
        <label class="${className} switch-field">
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
            class="modal-confirmation ${escapeHtml(config.messageType || "info")}"
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
    state.refreshTimer = setInterval(async () => {
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
    }, 30000);
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
  el.loginForm.addEventListener("submit", handleLogin);
  el.logoutButton.addEventListener("click", handleLogout);
  el.menuButton.addEventListener("click", () =>
    setSidebarOpen(!el.sidebar.classList.contains("open")),
  );
  el.sidebarBackdrop?.addEventListener("click", () => setSidebarOpen(false));
  el.globalRefreshButton.addEventListener("click", () =>
    navigate(state.currentSection),
  );
  el.refreshOrdersButton.addEventListener("click", async () => {
    try {
      await refreshOrders();
      showMessage("Pedidos atualizados.");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
  el.ordersStatusFilter.addEventListener("change", renderOrders);
  el.clientsSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadClients().catch((error) => showMessage(error.message, "error"));
  });
  el.storeConfigForm.addEventListener("submit", saveStoreConfig);
  el.auditFilterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadAudit().catch((error) => showMessage(error.message, "error"));
  });
  el.newComplementButton.addEventListener("click", () => openComplementModal());
  el.newNeighborhoodButton.addEventListener("click", () =>
    openNeighborhoodModal(),
  );
  el.newRewardButton.addEventListener("click", () => openRewardModal());
  el.newTeamMemberButton.addEventListener("click", () => openTeamModal());
  el.modalCloseButton.addEventListener("click", closeModal);
  el.dynamicModalForm.addEventListener("submit", submitModal);
  el.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === el.modalBackdrop) {
      closeModal();
    }
  });
  document.addEventListener("click", (event) => {
    const pushButton = event.target.closest("[data-push-notification-toggle]");
    if (pushButton) {
      activatePushNotifications().catch((error) => {
        console.error(error);
        showMessage(error.message, "error");
      });
      return;
    }
    const soundButton = event.target.closest("[data-order-sound-toggle]");
    if (soundButton) {
      activateOrderSound().catch((error) => {
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
    const removeManualItem = event.target.closest("[data-manual-remove-item]");
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
    const phMealButton = event.target.closest("[data-ph-edit-meal]");
    if (phMealButton) {
      openPhMealModal(
        (state.phConfig?.marmitas || []).find(
          (item) => String(item.id) === String(phMealButton.dataset.phEditMeal),
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
    const complementButton = event.target.closest("[data-edit-complement]");
    if (complementButton) {
      openComplementModal(
        state.operacao.complementos.find(
          (item) => String(item.id) === complementButton.dataset.editComplement,
        ),
      );
    }
    const neighborhoodButton = event.target.closest("[data-edit-neighborhood]");
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
  });
  document.addEventListener("change", (event) => {
    const manualEstablishment = event.target.closest(
      "[data-manual-establishment]",
    );
    if (manualEstablishment) {
      resetManualItemsForEstablishment(manualEstablishment.value);
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
      refreshManualAzuryRow(manualComplement.closest("[data-manual-item-row]"));
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
    const active = event.target.closest("[data-active]");
    if (active) {
      const row = active.closest("[data-day]");
      row.querySelector("[data-open]").disabled = !active.checked;
      row.querySelector("[data-close]").disabled = !active.checked;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setSidebarOpen(false);
      if (!el.modalBackdrop.hidden) {
        closeModal();
      }
    }
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );
  }
  window.addEventListener("beforeunload", () => {
    stopRealtimeOrders();
    stopOrderAlarm();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      setSidebarOpen(false);
    }
  });
  window.addEventListener("online", () =>
    setConnection(true, "Internet disponível"),
  );
  window.addEventListener("offline", () =>
    setConnection(false, "Sem internet"),
  );
  supabase.auth.onAuthStateChange((event, session) => {
    state.session = session;
    if (event === "SIGNED_OUT") {
      showAuth();
    }
  });
  bootstrap();
})();
