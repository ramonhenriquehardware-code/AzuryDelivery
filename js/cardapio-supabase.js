document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  let sb = window.azurySupabase;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const d = {
    modal: $("#modalMonteSeu"),
    content: $("#modalMonteSeu .conteudo-monte-seu"),
    close: $("#btnFecharMonteSeu"),
    step1: $("#painelPedido"),
    step2: $("#painelEntrega"),
    indicators: $$(".etapa-indicador"),
    add: $("#btnAdicionarSacola"),
    next: $("#btnContinuarPedido"),
    back: $("#btnVoltarPedido"),
    send: $("#btnEnviarMonteSeu"),
    cartList: $("#listaSacolaPedido"),
    cartEmpty: $("#sacolaVazia"),
    cartCount: $("#quantidadeSacola"),
    cartSubtotal: $("#subtotalSacolaPedido"),
    cartFeedback: $("#sacolaFeedback"),
    cartReview: $("#listaResumoSacola"),
    store: $("#statusLoja"),
    storeTitle: $("#statusLojaTitulo"),
    storeMsg: $("#statusLojaMensagem"),
    size: $("#tamanhoMonteSeu"),
    base: $("#precoBaseMonteSeu"),
    middle: $("#complementosMeio"),
    top: $("#complementosTopo"),
    subtotal: $("#subtotalMonteSeu"),
    subtotal2: $("#resumoSubtotalPedido"),
    feeText: $("#resumoTaxaEntrega"),
    total: $("#totalMonteSeu"),
    stickyBar: null,
    stickyProduct: null,
    stickySubtotal: null,
    stickyCart: null,
    stickyAdd: null,
    name: $("#nomeCliente"),
    phone: $("#telefoneCliente"),
    zip: $("#cepCliente"),
    street: $("#ruaCliente"),
    number: $("#numeroCliente"),
    district: $("#bairroCliente"),
    addressExtra: $("#complementoCliente"),
    addressStatus: $("#statusEndereco"),
    addressOk: $("#enderecoValidado"),
    fee: $("#taxaEntrega"),
    districtId: $("#bairroEntregaId"),
    change: $("#trocoParaCliente"),
  };

  const state = {
    config: null,
    schedules: [],
    sizes: [],
    boxes: [],
    currentProduct: null,
    complements: [],
    districts: [],
    districtMap: new Map(),
    aliases: [],
    cart: [],
    subtotal: 0,
    sending: false,
    consultingZip: false,
    zipRequest: 0,
    operationReady: false,
    interfaceReady: false,
    refreshingOperation: false,
    recoveryTimer: null,
    operationSource: null,
  };

  const CART_KEY = "azurySacola";
  const LAST_ORDER_KEY = "azuryUltimoPedido";
  const MAX_CART_UNITS = 20;
  const OPERATION_CACHE_KEY = "azuryOperacaoPublica";
  const OPERATION_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
  const OPERATION_RETRY_DELAYS = [0, 1500, 3500];
  const OPERATION_RECOVERY_INTERVAL = 30000;

  const FREE_COMPLEMENT_LIMITS = new Map([
    [300, 2],
    [400, 3],
    [500, 3],
    [700, 4],
    ["azury-box-p", 4],
    ["azury-box-m", 5],
    ["azury-box-g", 6],
  ]);

  const CUP_PRODUCT_NAMES = new Map([
    [300, "Azury Mini"],
    [400, "Azury Clássico"],
    [500, "Azury Max"],
    [700, "Azury Extra"],
  ]);

  const BOX_FALLBACKS = [
    {
      produto_tipo: "azury_box",
      produto_chave: "azury-box-p",
      nome: "Azury Box P",
      tamanho_label: "P",
      preco_base: 15,
      complementos_gratis: 4,
      disponivel: true,
      visivel: true,
      ordem: 1,
    },
    {
      produto_tipo: "azury_box",
      produto_chave: "azury-box-m",
      nome: "Azury Box M",
      tamanho_label: "M",
      preco_base: 25,
      complementos_gratis: 5,
      disponivel: true,
      visivel: true,
      ordem: 2,
    },
    {
      produto_tipo: "azury_box",
      produto_chave: "azury-box-g",
      nome: "Azury Box G",
      tamanho_label: "G",
      preco_base: 35,
      complementos_gratis: 6,
      disponivel: true,
      visivel: true,
      ordem: 3,
    },
  ];

  const ALWAYS_PAID_COMPLEMENT_TERMS = [
    "nutella",
    "oreo",
    "morango",
    "uva",
    "confete",
    "power ball",
  ];

  let complementSelectionCounter = 0;

  const wait = (milliseconds) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  const money = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const norm = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const num = (value, fallback = 0) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;

  function canonicalBoxKey(value) {
    const normalized = norm(value).replace(/\s+/g, " ");

    if (
      normalized === "azury box p" ||
      normalized === "box p" ||
      normalized === "p"
    ) {
      return "azury-box-p";
    }

    if (
      normalized === "azury box m" ||
      normalized === "box m" ||
      normalized === "m"
    ) {
      return "azury-box-m";
    }

    if (
      normalized === "azury box g" ||
      normalized === "box g" ||
      normalized === "g"
    ) {
      return "azury-box-g";
    }

    return "";
  }

  function resolveBoxKey(product) {
    if (!product) {
      return "";
    }

    if (typeof product !== "object") {
      return canonicalBoxKey(product);
    }

    const candidates = [
      product.produto_chave,
      product.chave,
      product.slug,
      product.codigo,
      product.tamanho_label,
      product.tamanho,
      product.nome,
    ];

    for (const candidate of candidates) {
      const key = canonicalBoxKey(candidate);

      if (key) {
        return key;
      }
    }

    return "";
  }

  function isBoxProduct(product) {
    if (!product) {
      return false;
    }

    const type =
      typeof product === "object"
        ? String(product.produto_tipo || product.tipo_produto || "")
            .trim()
            .toLowerCase()
        : "";

    return type === "azury_box" || Boolean(resolveBoxKey(product));
  }

  function normalizeBoxes(rows) {
    const source = Array.isArray(rows) ? rows : [];
    const byKey = new Map();

    source.forEach((row) => {
      const key = resolveBoxKey(row);

      if (key) {
        byKey.set(key, row);
      }
    });

    return BOX_FALLBACKS.map((fallback) => {
      const row = byKey.get(fallback.produto_chave) || {};
      const price = num(
        row.preco_base ?? row.preco ?? row.valor,
        fallback.preco_base,
      );
      const limit = freeComplementLimit({
        ...fallback,
        ...row,
        produto_chave: fallback.produto_chave,
      });

      return {
        ...fallback,
        ...row,
        produto_tipo: "azury_box",
        produto_chave: fallback.produto_chave,
        nome: String(row.nome || fallback.nome).trim(),
        tamanho_label: String(
          row.tamanho_label || row.tamanho || fallback.tamanho_label,
        )
          .trim()
          .toUpperCase(),
        preco_base: price,
        complementos_gratis: limit || fallback.complementos_gratis,
        disponivel:
          row.disponivel !== undefined
            ? row.disponivel === true
            : row.ativo !== undefined
              ? row.ativo === true
              : fallback.disponivel,
        visivel:
          row.visivel !== undefined ? row.visivel !== false : fallback.visivel,
        ordem: num(row.ordem, fallback.ordem),
      };
    }).sort((a, b) => num(a.ordem) - num(b.ordem));
  }

  function boxByKey(key) {
    const canonical = resolveBoxKey(key);

    return (
      state.boxes.find(
        (box) => resolveBoxKey(box) === canonical,
      ) || null
    );
  }

  function productKey(product) {
    return isBoxProduct(product) ? resolveBoxKey(product) : "";
  }

  function productBasePrice(product) {
    if (product && typeof product === "object") {
      return num(product.preco_base ?? product.preco, 0);
    }

    return 0;
  }

  function productIsAvailable(product) {
    return Boolean(
      product &&
        product.disponivel !== false &&
        product.visivel !== false &&
        product.ativo !== false,
    );
  }

  function currentBuilderProduct() {
    if (state.currentProduct) {
      if (isBoxProduct(state.currentProduct)) {
        return boxByKey(state.currentProduct) || state.currentProduct;
      }

      const currentSize = Number(state.currentProduct.tamanho_ml);
      const size = state.sizes.find(
        (item) => Number(item.tamanho_ml) === currentSize,
      );

      if (size) {
        return {
          ...size,
          produto_tipo: "acai_copo",
          produto_chave: null,
        };
      }
    }

    const currentSize = Number(d.size?.value);
    const size = state.sizes.find(
      (item) => Number(item.tamanho_ml) === currentSize,
    );

    return size
      ? {
          ...size,
          produto_tipo: "acai_copo",
          produto_chave: null,
        }
      : null;
  }

  function freeComplementLimit(product) {
    if (product && typeof product === "object") {
      const explicitLimit = Number(
        product.complementos_gratis ??
          product.limite_complementos_gratis ??
          product.limite_gratis,
      );

      if (Number.isFinite(explicitLimit) && explicitLimit >= 0) {
        return Math.floor(explicitLimit);
      }

      const candidates = [
        product.produto_chave,
        product.chave,
        product.slug,
        product.codigo,
        product.nome,
        product.tamanho,
        product.tamanho_ml,
      ];

      for (const candidate of candidates) {
        const resolved = freeComplementLimit(candidate);

        if (resolved > 0) {
          return resolved;
        }
      }

      return 0;
    }

    const numeric = Number(product);

    if (Number.isFinite(numeric) && FREE_COMPLEMENT_LIMITS.has(numeric)) {
      return FREE_COMPLEMENT_LIMITS.get(numeric) || 0;
    }

    const normalized = norm(product);

    const futureKey =
      normalized === "azury box p" ||
      normalized === "box p" ||
      normalized === "azury-box-p"
        ? "azury-box-p"
        : normalized === "azury box m" ||
            normalized === "box m" ||
            normalized === "azury-box-m"
          ? "azury-box-m"
          : normalized === "azury box g" ||
              normalized === "box g" ||
              normalized === "azury-box-g"
            ? "azury-box-g"
            : "";

    return futureKey ? FREE_COMPLEMENT_LIMITS.get(futureKey) || 0 : 0;
  }

  function productDisplayName(product) {
    if (isBoxProduct(product)) {
      const key = resolveBoxKey(product);
      const box = boxByKey(key);
      const source = box || (product && typeof product === "object" ? product : {});
      const label = String(
        source.tamanho_label ||
          source.tamanho ||
          key.replace("azury-box-", ""),
      )
        .trim()
        .toUpperCase();
      const rawName = String(source.nome || "").trim();

      if (rawName) {
        return rawName;
      }

      return label ? `Azury Box ${label}` : "Azury Box";
    }

    const size = Number(
      product && typeof product === "object" ? product.tamanho_ml : product,
    );

    const cupName = CUP_PRODUCT_NAMES.get(size);

    if (cupName) {
      return `${cupName} • ${size}ml`;
    }

    if (product && typeof product === "object") {
      const rawName = String(product.produto_nome || product.nome || "").trim();

      if (rawName) {
        return rawName;
      }
    }

    return Number.isFinite(size) && size > 0 ? `Açaí • ${size}ml` : "Açaí";
  }

  const isAlwaysPaidComplement = (name) => {
    const normalizedName = norm(name);

    return ALWAYS_PAID_COMPLEMENT_TERMS.some((term) =>
      normalizedName.includes(term),
    );
  };

  function priceComplements(complements, product) {
    const limit = freeComplementLimit(product);
    const boxMode = isBoxProduct(product);

    const rows = (complements || []).map((complement, index) => ({
      ...complement,
      nome: String(complement?.nome ?? complement?.value ?? ""),
      preco: num(complement?.preco ?? complement?.dataset?.preco, 0),
      ordem_selecao: Math.max(
        1,
        Math.floor(
          num(
            complement?.ordem_selecao ?? complement?.dataset?.ordemSelecao,
            index + 1,
          ),
        ),
      ),
      _index: index,
    }));

    const groups = new Map();

    rows.forEach((row) => {
      const key = norm(row.nome);

      if (!key) {
        return;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          nome: row.nome,
          ordem_selecao: row.ordem_selecao,
          primeiro_indice: row._index,
        });
        return;
      }

      const group = groups.get(key);
      group.ordem_selecao = Math.min(group.ordem_selecao, row.ordem_selecao);
      group.primeiro_indice = Math.min(group.primeiro_indice, row._index);
    });

    const uniqueComplements = Array.from(groups.values()).sort(
      (a, b) =>
        a.ordem_selecao - b.ordem_selecao ||
        a.primeiro_indice - b.primeiro_indice,
    );

    const eligible = boxMode
      ? uniqueComplements
      : uniqueComplements.filter(
          (complement) => !isAlwaysPaidComplement(complement.nome),
        );

    const freeKeys = new Set(
      eligible.slice(0, limit).map((complement) => complement.key),
    );

    return rows.map((row) => {
      const key = norm(row.nome);
      const group = groups.get(key);
      const alwaysPaid = boxMode ? false : isAlwaysPaidComplement(row.nome);
      const free = !alwaysPaid && freeKeys.has(key);
      const firstOccurrence = !group || row._index === group.primeiro_indice;
      const { _index, ...clean } = row;

      return {
        ...clean,
        especial_pago: alwaysPaid,
        gratuito: free,
        preco_cobrado: free || !firstOccurrence ? 0 : row.preco,
      };
    });
  }

  function itemUnitPrice(product, base, complements) {
    return (
      num(base, 0) +
      priceComplements(complements, product).reduce(
        (total, complement) => total + num(complement.preco_cobrado),
        0,
      )
    );
  }

  const timeMinutes = (value) => {
    const parts = String(value || "").split(":");

    if (parts.length < 2) {
      return null;
    }

    const hours = Number(parts[0]);

    const minutes = Number(parts[1]);

    return Number.isFinite(hours) && Number.isFinite(minutes)
      ? hours * 60 + minutes
      : null;
  };

  const timeLabel = (value) => {
    const minutes = timeMinutes(value);

    if (minutes === null) {
      return "";
    }

    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;

    return (
      `${String(hours).padStart(2, "0")}:` +
      `${String(remainingMinutes).padStart(2, "0")}`
    );
  };

  const newId = () =>
    window.crypto?.randomUUID?.() ||
    `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const cartUnits = () =>
    state.cart.reduce(
      (total, item) => total + Math.max(1, Number(item.quantidade) || 1),
      0,
    );

  const cartSubtotal = () =>
    state.cart.reduce(
      (total, item) =>
        total +
        num(item.preco_unitario) * Math.max(1, Number(item.quantidade) || 1),
      0,
    );

  const itemSignature = (item) => {
    const complements = (item.complementos || [])
      .map((complement) => `${complement.camada}:${norm(complement.nome)}`)
      .sort()
      .join("|");

    const identity = isBoxProduct(item)
      ? `box:${productKey(item)}`
      : `copo:${Number(item.tamanho_ml)}`;

    return `${identity}::${complements}`;
  };

  function saveCart() {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    } catch (error) {
      console.warn("Não foi possível salvar a sacola nesta sessão.", error);
    }
  }

  function saveLastOrderSnapshot(order) {
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
    } catch (error) {
      console.warn(
        "Não foi possível salvar os dados do último pedido nesta sessão.",
        error,
      );
    }
  }

  function normalizeCartItem(raw) {
    const boxMode = isBoxProduct(raw);
    const product = boxMode
      ? boxByKey(raw?.produto_chave || raw?.tamanho_label || raw?.produto_nome)
      : state.sizes.find(
          (item) =>
            Number(item.tamanho_ml) === Number(raw?.tamanho_ml) &&
            productIsAvailable(item),
        );

    if (!product || !productIsAvailable(product)) {
      return null;
    }

    const complementMap = new Map();

    if (Array.isArray(raw?.complementos)) {
      raw.complementos.forEach((complement, index) => {
        const current = state.complements.find(
          (item) => norm(item.nome) === norm(complement?.nome),
        );

        if (!current) {
          return;
        }

        const rawLayer = String(complement?.camada || "").toLowerCase();
        const layer = boxMode
          ? "unica"
          : rawLayer === "cobertura"
            ? "cobertura"
            : rawLayer === "ambos" || rawLayer === "unica"
              ? "ambos"
              : "meio";
        const key = norm(current.nome);
        const selectionOrder = Math.max(
          1,
          Math.floor(num(complement?.ordem_selecao, index + 1)),
        );

        if (!complementMap.has(key)) {
          complementMap.set(key, {
            id: current.id || null,
            nome: current.nome,
            camada: layer,
            preco: num(current.preco),
            ordem_selecao: selectionOrder,
          });
          return;
        }

        const existing = complementMap.get(key);

        if (!boxMode && existing.camada !== layer) {
          existing.camada = "ambos";
        }

        existing.ordem_selecao = Math.min(
          existing.ordem_selecao,
          selectionOrder,
        );
      });
    }

    const complements = Array.from(complementMap.values());
    const base = productBasePrice(product);
    const unitPrice = itemUnitPrice(product, base, complements);

    return {
      id: String(raw?.id || newId()),
      produto_tipo: boxMode ? "azury_box" : "acai_copo",
      produto_chave: boxMode ? productKey(product) : null,
      tamanho_ml: boxMode ? null : Number(product.tamanho_ml),
      tamanho_label: boxMode ? String(product.tamanho_label || "") : null,
      produto_nome: productDisplayName(product),
      preco_base: base,
      quantidade: Math.max(
        1,
        Math.min(MAX_CART_UNITS, Math.floor(num(raw?.quantidade, 1))),
      ),
      preco_unitario: unitPrice,
      complementos: complements,
    };
  }

  function loadCart() {
    let stored = [];

    try {
      stored = JSON.parse(sessionStorage.getItem(CART_KEY) || "[]");
    } catch (_) {
      stored = [];
    }

    state.cart = [];

    if (!Array.isArray(stored)) {
      return;
    }

    for (const raw of stored) {
      const item = normalizeCartItem(raw);

      if (!item) {
        continue;
      }

      const available = MAX_CART_UNITS - cartUnits();

      if (available <= 0) {
        break;
      }

      item.quantidade = Math.min(item.quantidade, available);

      const signature = itemSignature(item);

      const existing = state.cart.find(
        (row) => itemSignature(row) === signature,
      );

      if (existing) {
        existing.quantidade += item.quantidade;
      } else {
        state.cart.push(item);
      }
    }

    saveCart();
  }

  function complementSummary(item, layer = null) {
    const names = Array.from(
      new Set(
        (item.complementos || [])
          .filter((complement) =>
            layer
              ? complement.camada === layer || complement.camada === "ambos"
              : true,
          )
          .map((complement) => complement.nome),
      ),
    );

    return names.length ? names.join(", ") : "Nenhum";
  }

  function renderCart() {
    const units = cartUnits();
    const subtotal = cartSubtotal();

    if (d.cartCount) {
      d.cartCount.textContent = `${units} ${units === 1 ? "item" : "itens"}`;
    }

    if (d.cartEmpty) {
      d.cartEmpty.hidden = state.cart.length > 0;
    }

    if (d.cartSubtotal) {
      d.cartSubtotal.textContent = money(subtotal);
    }

    if (d.subtotal2) {
      d.subtotal2.textContent = money(subtotal);
    }

    if (d.cartList) {
      d.cartList.innerHTML = state.cart
        .map((item, index) => {
          const complementDetails = isBoxProduct(item)
            ? `
                        <p>
                            <b>Complementos:</b>
                            ${esc(complementSummary(item))}
                        </p>
                    `
            : `
                        <p>
                            <b>Meio:</b>
                            ${esc(complementSummary(item, "meio"))}
                        </p>

                        <p>
                            <b>Cobertura:</b>
                            ${esc(complementSummary(item, "cobertura"))}
                        </p>
                    `;

          return `
                    <article
                        class="item-sacola"
                        data-cart-id="${esc(item.id)}"
                    >
                        <div class="item-sacola-cabecalho">
                            <div>
                                <strong>
                                    ${index + 1}.
                                    ${esc(productDisplayName(item))}
                                </strong>
                                <small>
                                    Valor unitário:
                                    ${money(item.preco_unitario)}
                                </small>
                            </div>
                            <strong class="item-sacola-total">
                                ${money(item.preco_unitario * item.quantidade)}
                            </strong>
                        </div>

                        ${complementDetails}

                        <div class="acoes-item-sacola">
                            <div
                                class="controle-quantidade"
                                aria-label="Quantidade do item ${index + 1}"
                            >
                                <button
                                    type="button"
                                    data-cart-action="decrease"
                                    data-id="${esc(item.id)}"
                                    aria-label="Diminuir quantidade"
                                >
                                    −
                                </button>
                                <span>${esc(item.quantidade)}</span>
                                <button
                                    type="button"
                                    data-cart-action="increase"
                                    data-id="${esc(item.id)}"
                                    aria-label="Aumentar quantidade"
                                >
                                    +
                                </button>
                            </div>

                            <button
                                type="button"
                                class="btn-remover-item"
                                data-cart-action="remove"
                                data-id="${esc(item.id)}"
                            >
                                Remover
                            </button>
                        </div>
                    </article>
                `;
        })
        .join("");
    }

    if (d.cartReview) {
      d.cartReview.innerHTML = state.cart
        .map(
          (item, index) => `
                    <div class="resumo-item-entrega">
                        <span>
                            ${index + 1}.
                            ${esc(item.quantidade)}×
                            ${esc(productDisplayName(item))}
                        </span>
                        <strong>
                            ${money(item.preco_unitario * item.quantidade)}
                        </strong>
                    </div>
                `,
        )
        .join("");
    }

    updateTotal();
    syncOrderButtons(storeState());
  }

  function changeCartItem(id, delta) {
    const item = state.cart.find((row) => row.id === id);

    if (!item) {
      return;
    }

    if (delta > 0) {
      if (cartUnits() >= MAX_CART_UNITS) {
        alert(`A sacola aceita até ${MAX_CART_UNITS} itens por pedido.`);

        return;
      }

      item.quantidade += 1;
    } else if (item.quantidade > 1) {
      item.quantidade -= 1;
    } else {
      state.cart = state.cart.filter((row) => row.id !== id);
    }

    saveCart();
    renderCart();
  }

  function removeCartItem(id) {
    state.cart = state.cart.filter((item) => item.id !== id);

    saveCart();
    renderCart();
  }

  function clearCart() {
    state.cart = [];

    try {
      sessionStorage.removeItem(CART_KEY);
    } catch (_) {}

    renderCart();
  }

  function addCurrentToCart() {
    if (!requireOpen()) {
      return;
    }

    if (cartUnits() >= MAX_CART_UNITS) {
      alert(`A sacola aceita até ${MAX_CART_UNITS} itens por pedido.`);
      return;
    }

    const product = currentBuilderProduct();

    if (!product || !productIsAvailable(product)) {
      alert("Este produto não está disponível no momento.");
      return;
    }

    const complements = currentComplementSelections();
    const boxMode = isBoxProduct(product);
    const item = {
      id: newId(),
      produto_tipo: boxMode ? "azury_box" : "acai_copo",
      produto_chave: boxMode ? productKey(product) : null,
      tamanho_ml: boxMode ? null : Number(product.tamanho_ml),
      tamanho_label: boxMode ? String(product.tamanho_label || "") : null,
      produto_nome: productDisplayName(product),
      preco_base: productBasePrice(product),
      quantidade: 1,
      preco_unitario: calculate(),
      complementos: complements,
    };

    const signature = itemSignature(item);
    const existing = state.cart.find((row) => itemSignature(row) === signature);

    if (existing) {
      existing.quantidade += 1;
    } else {
      state.cart.push(item);
    }

    saveCart();
    renderCart();
    resetBuilder();

    if (d.cartFeedback) {
      const addedProductName = productDisplayName(item);
      d.cartFeedback.textContent = `${addedProductName} adicionado à sacola.`;

      window.setTimeout(() => {
        if (d.cartFeedback?.textContent.includes(addedProductName)) {
          d.cartFeedback.textContent = "";
        }
      }, 3000);
    }
  }

  function message(text, type = "") {
    if (!d.addressStatus) {
      return;
    }

    d.addressStatus.textContent = text;

    d.addressStatus.classList.remove("sucesso", "erro", "carregando");

    if (type) {
      d.addressStatus.classList.add(type);
    }
  }

  function showOrderSuccess(code) {
    const styleId = "azury-pedido-sucesso-estilos";

    let order = null;

    try {
      const saved = sessionStorage.getItem(LAST_ORDER_KEY);

      order = saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn(
        "Não foi possível carregar o resumo do último pedido.",
        error,
      );
    }

    const safeOrder = order && typeof order === "object" ? order : {};

    const customerName =
      String(safeOrder.cliente?.nome || "Cliente").trim() || "Cliente";

    const createdAt = safeOrder.criado_em
      ? new Date(safeOrder.criado_em)
      : new Date();

    const validCreatedAt = Number.isNaN(createdAt.getTime())
      ? new Date()
      : createdAt;

    const dateLabel = validCreatedAt.toLocaleDateString("pt-BR");

    const timeLabelOrder = validCreatedAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",

      minute: "2-digit",
    });

    const productValue = num(safeOrder.valor_produtos, 0);

    const deliveryFee = num(safeOrder.taxa_entrega, 0);

    const totalValue = num(safeOrder.valor_total, productValue + deliveryFee);

    const paymentName =
      safeOrder.pagamento?.forma_label ||
      paymentLabel(safeOrder.pagamento?.forma || "") ||
      "Não informado";

    const pointsGenerated = num(safeOrder.pontos_gerados, 0);

    const pointsText =
      pointsGenerated > 0
        ? `${pointsGenerated} ponto${
            pointsGenerated === 1 ? "" : "s"
          } neste pedido`
        : "Seus pontos serão liberados após a entrega";

    const estimatedDelivery = (() => {
      const config = state.config || {};

      const directValue =
        config.estimativa_entrega ??
        config.tempo_estimado_entrega ??
        config.tempo_entrega ??
        config.prazo_entrega ??
        config.previsao_entrega ??
        null;

      if (
        directValue !== null &&
        directValue !== undefined &&
        String(directValue).trim()
      ) {
        const raw = String(directValue).trim();

        if (/^\d+$/.test(raw)) {
          return `Até ${raw} minutos`;
        }

        return raw;
      }

      const minimum = Number(
        config.tempo_entrega_min ??
          config.prazo_entrega_min ??
          config.estimativa_minutos_min,
      );

      const maximum = Number(
        config.tempo_entrega_max ??
          config.prazo_entrega_max ??
          config.estimativa_minutos_max,
      );

      if (
        Number.isFinite(minimum) &&
        minimum > 0 &&
        Number.isFinite(maximum) &&
        maximum >= minimum
      ) {
        return `${minimum} a ${maximum} minutos`;
      }

      if (Number.isFinite(maximum) && maximum > 0) {
        return `Até ${maximum} minutos`;
      }

      if (Number.isFinite(minimum) && minimum > 0) {
        return `A partir de ${minimum} minutos`;
      }

      return "Acompanhe a atualização na Área do Cliente";
    })();

    const items = Array.isArray(safeOrder.itens) ? safeOrder.itens : [];

    const itemsHtml = items.length
      ? items
          .map((item, index) => {
            const complements = Array.isArray(item.complementos)
              ? item.complementos
              : [];

            const complementNames = Array.from(
              new Set(
                complements
                  .map((complement) => String(complement?.nome || "").trim())
                  .filter(Boolean),
              ),
            );

            const quantity = Math.max(1, Number(item.quantidade) || 1);

            const unitValue = num(item.preco_unitario, 0);

            const productName =
              item.produto || productDisplayName(item.tamanho_ml);

            return `
                            <article class="azury-pos-item">
                                <div class="azury-pos-item-topo">
                                    <div>
                                        <span class="azury-pos-item-numero">
                                            ${index + 1}
                                        </span>

                                        <strong>
                                            ${esc(productName)}
                                        </strong>
                                    </div>

                                    <strong class="azury-pos-item-preco">
                                        ${money(unitValue * quantity)}
                                    </strong>
                                </div>

                                <span class="azury-pos-item-meta">
                                    ${quantity}× item${
                                      quantity === 1 ? "" : "s"
                                    }
                                </span>

                                <div class="azury-pos-complementos">
                                    <b>Complementos:</b>

                                    <span>
                                        ${
                                          complementNames.length
                                            ? esc(complementNames.join(", "))
                                            : "Nenhum complemento"
                                        }
                                    </span>
                                </div>
                            </article>
                        `;
          })
          .join("")
      : `
                    <div class="azury-pos-vazio">
                        Resumo dos itens indisponível nesta sessão.
                    </div>
                `;

    const street = String(safeOrder.entrega?.rua || "").trim();

    const number = String(safeOrder.entrega?.numero || "").trim();

    const district = String(safeOrder.entrega?.bairro || "").trim();

    const zipCode = String(safeOrder.entrega?.cep || "").trim();

    const addressExtra = String(safeOrder.entrega?.complemento || "").trim();

    const addressMain = [street, number ? `nº ${number}` : ""]
      .filter(Boolean)
      .join(", ");

    const addressSecond = [district, zipCode ? `CEP ${zipCode}` : ""]
      .filter(Boolean)
      .join(" • ");

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");

      style.id = styleId;

      style.textContent = `
                body.azury-pos-pedido-aberto {
                    overflow: hidden !important;
                }

                #azuryPedidoSucesso {
                    position: fixed;
                    inset: 0;
                    z-index: 100000;

                    overflow-x: hidden;
                    overflow-y: auto;

                    padding:
                        max(
                            18px,
                            env(safe-area-inset-top)
                        )
                        18px
                        max(
                            18px,
                            env(safe-area-inset-bottom)
                        );

                    background:
                        radial-gradient(
                            circle at 8% 4%,
                            rgba(
                                0,
                                81,
                                255,
                                0.11
                            ),
                            transparent 30%
                        ),
                        radial-gradient(
                            circle at 94% 92%,
                            rgba(
                                255,
                                196,
                                61,
                                0.12
                            ),
                            transparent 28%
                        ),
                        rgba(
                            244,
                            248,
                            255,
                            0.97
                        );

                    backdrop-filter:
                        blur(10px);

                    -webkit-backdrop-filter:
                        blur(10px);

                    opacity: 0;

                    transition:
                        opacity
                        220ms ease;

                    font-family:
                        inherit;

                    color:
                        #13213c;
                }

                #azuryPedidoSucesso.visivel {
                    opacity: 1;
                }

                #azuryPedidoSucesso * {
                    box-sizing:
                        border-box;
                }

                #azuryPedidoSucesso
                .azury-pos-pedido-painel {
                    width:
                        min(
                            1160px,
                            100%
                        );

                    margin:
                        0 auto;

                    overflow:
                        hidden;

                    background:
                        #ffffff;

                    border:
                        1px solid
                        #dfe8f7;

                    border-radius:
                        26px;

                    box-shadow:
                        0 28px 80px
                        rgba(
                            15,
                            39,
                            86,
                            0.17
                        );

                    transform:
                        translateY(14px)
                        scale(0.992);

                    transition:
                        transform
                        240ms ease;
                }

                #azuryPedidoSucesso.visivel
                .azury-pos-pedido-painel {
                    transform:
                        translateY(0)
                        scale(1);
                }

                #azuryPedidoSucesso
                .azury-pos-topo {
                    min-height:
                        74px;

                    padding:
                        14px
                        22px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        space-between;

                    gap:
                        18px;

                    border-bottom:
                        1px solid
                        #e8eef8;

                    background:
                        linear-gradient(
                            90deg,
                            #ffffff 0%,
                            #f8fbff 100%
                        );
                }

                #azuryPedidoSucesso
                .azury-pos-marca {
                    display:
                        inline-flex;

                    align-items:
                        center;

                    gap:
                        10px;

                    color:
                        #0758f8;

                    font-size:
                        25px;

                    font-weight:
                        950;

                    letter-spacing:
                        0.04em;
                }

                #azuryPedidoSucesso
                .azury-pos-coroa {
                    width:
                        42px;

                    height:
                        42px;

                    display:
                        grid;

                    place-items:
                        center;

                    border-radius:
                        13px;

                    background:
                        #edf3ff;

                    font-size:
                        23px;
                }

                #azuryPedidoSucesso
                .azury-pos-fechar {
                    width:
                        40px;

                    height:
                        40px;

                    flex:
                        0 0 40px;

                    display:
                        grid;

                    place-items:
                        center;

                    border:
                        1px solid
                        #dfe7f3;

                    border-radius:
                        50%;

                    background:
                        #ffffff;

                    color:
                        #64748b;

                    font-size:
                        24px;

                    line-height:
                        1;

                    cursor:
                        pointer;

                    transition:
                        background
                        160ms ease,
                        color
                        160ms ease,
                        border-color
                        160ms ease;
                }

                #azuryPedidoSucesso
                .azury-pos-fechar:hover {
                    color:
                        #0758f8;

                    background:
                        #f4f7ff;

                    border-color:
                        #b9cdfd;
                }

                #azuryPedidoSucesso
                .azury-pos-conteudo {
                    display:
                        grid;

                    grid-template-columns:
                        minmax(
                            0,
                            1.18fr
                        )
                        minmax(
                            330px,
                            0.82fr
                        );

                    gap:
                        0;
                }

                #azuryPedidoSucesso
                .azury-pos-principal {
                    min-width:
                        0;

                    padding:
                        30px;
                }

                #azuryPedidoSucesso
                .azury-pos-lateral {
                    min-width:
                        0;

                    padding:
                        28px;

                    background:
                        #f8faff;

                    border-left:
                        1px solid
                        #e6edf8;
                }

                #azuryPedidoSucesso
                .azury-pos-sucesso {
                    display:
                        grid;

                    grid-template-columns:
                        auto
                        minmax(
                            0,
                            1fr
                        );

                    gap:
                        18px;

                    align-items:
                        center;

                    margin-bottom:
                        22px;
                }

                #azuryPedidoSucesso
                .azury-pos-check {
                    width:
                        72px;

                    height:
                        72px;

                    display:
                        grid;

                    place-items:
                        center;

                    border-radius:
                        50%;

                    color:
                        #ffffff;

                    background:
                        linear-gradient(
                            145deg,
                            #22c55e,
                            #16a34a
                        );

                    border:
                        8px solid
                        #dcfce7;

                    box-shadow:
                        0 10px 26px
                        rgba(
                            22,
                            163,
                            74,
                            0.20
                        );

                    font-size:
                        34px;

                    font-weight:
                        950;
                }

                #azuryPedidoSucesso
                .azury-pos-sucesso h2 {
                    margin:
                        0 0
                        7px;

                    color:
                        #102044;

                    font-size:
                        clamp(
                            25px,
                            3vw,
                            36px
                        );

                    line-height:
                        1.08;

                    font-weight:
                        950;
                }

                #azuryPedidoSucesso
                .azury-pos-sucesso p {
                    margin:
                        0;

                    color:
                        #64748b;

                    font-size:
                        15px;

                    line-height:
                        1.5;
                }

                #azuryPedidoSucesso
                .azury-pos-sucesso p strong {
                    color:
                        #0758f8;
                }

                #azuryPedidoSucesso
                .azury-pos-destaques {
                    display:
                        grid;

                    grid-template-columns:
                        repeat(
                            2,
                            minmax(
                                0,
                                1fr
                            )
                        );

                    gap:
                        12px;

                    margin-bottom:
                        14px;
                }

                #azuryPedidoSucesso
                .azury-pos-destaque {
                    min-height:
                        92px;

                    padding:
                        15px;

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        12px;

                    border:
                        1px solid
                        #dce7f8;

                    border-radius:
                        16px;

                    background:
                        #ffffff;
                }

                #azuryPedidoSucesso
                .azury-pos-destaque-icone {
                    width:
                        44px;

                    height:
                        44px;

                    flex:
                        0 0
                        44px;

                    display:
                        grid;

                    place-items:
                        center;

                    border-radius:
                        13px;

                    background:
                        #edf3ff;

                    font-size:
                        21px;
                }

                #azuryPedidoSucesso
                .azury-pos-destaque small {
                    display:
                        block;

                    margin-bottom:
                        4px;

                    color:
                        #64748b;

                    font-size:
                        11px;

                    font-weight:
                        800;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        0.035em;
                }

                #azuryPedidoSucesso
                .azury-pos-destaque strong {
                    display:
                        block;

                    color:
                        #17233c;

                    font-size:
                        14px;

                    line-height:
                        1.35;
                }

                #azuryPedidoSucesso
                .azury-pos-numero {
                    margin-bottom:
                        14px;

                    padding:
                        18px
                        20px;

                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        space-between;

                    gap:
                        18px;

                    border:
                        1px solid
                        #bfd2ff;

                    border-radius:
                        17px;

                    background:
                        linear-gradient(
                            135deg,
                            #f7faff 0%,
                            #edf4ff 100%
                        );
                }

                #azuryPedidoSucesso
                .azury-pos-numero span {
                    display:
                        block;

                    margin-bottom:
                        3px;

                    color:
                        #64748b;

                    font-size:
                        12px;

                    font-weight:
                        800;
                }

                #azuryPedidoSucesso
                .azury-pos-numero strong {
                    display:
                        block;

                    color:
                        #0758f8;

                    font-size:
                        clamp(
                            30px,
                            5vw,
                            44px
                        );

                    font-weight:
                        950;

                    line-height:
                        1;

                    letter-spacing:
                        0.015em;
                }

                #azuryPedidoSucesso
                .azury-pos-numero time {
                    color:
                        #64748b;

                    font-size:
                        12px;

                    font-weight:
                        700;

                    white-space:
                        nowrap;
                }

                #azuryPedidoSucesso
                .azury-pos-estimativa {
                    margin-bottom:
                        18px;

                    padding:
                        14px
                        16px;

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        12px;

                    color:
                        #7c4a03;

                    background:
                        #fff9eb;

                    border:
                        1px solid
                        #f4d38a;

                    border-radius:
                        14px;
                }

                #azuryPedidoSucesso
                .azury-pos-estimativa > span {
                    font-size:
                        23px;
                }

                #azuryPedidoSucesso
                .azury-pos-estimativa strong {
                    display:
                        block;

                    margin-bottom:
                        2px;

                    color:
                        #6f4204;

                    font-size:
                        13px;
                }

                #azuryPedidoSucesso
                .azury-pos-estimativa small {
                    display:
                        block;

                    color:
                        #8a5e20;

                    font-size:
                        12px;

                    line-height:
                        1.35;
                }

                #azuryPedidoSucesso
                .azury-pos-acoes {
                    display:
                        grid;

                    grid-template-columns:
                        minmax(
                            0,
                            1fr
                        )
                        minmax(
                            0,
                            1fr
                        );

                    gap:
                        12px;
                }

                #azuryPedidoSucesso
                .azury-pos-botao {
                    min-height:
                        48px;

                    padding:
                        11px
                        16px;

                    display:
                        inline-flex;

                    align-items:
                        center;

                    justify-content:
                        center;

                    gap:
                        8px;

                    border:
                        1px solid
                        #0758f8;

                    border-radius:
                        12px;

                    color:
                        #ffffff;

                    background:
                        #0758f8;

                    font-size:
                        14px;

                    font-weight:
                        900;

                    line-height:
                        1.2;

                    text-align:
                        center;

                    text-decoration:
                        none;

                    cursor:
                        pointer;

                    transition:
                        transform
                        160ms ease,
                        background
                        160ms ease,
                        box-shadow
                        160ms ease;
                }

                #azuryPedidoSucesso
                .azury-pos-botao:hover {
                    transform:
                        translateY(-1px);

                    background:
                        #0045d8;

                    box-shadow:
                        0 9px 20px
                        rgba(
                            7,
                            88,
                            248,
                            0.20
                        );
                }

                #azuryPedidoSucesso
                .azury-pos-botao.secundario {
                    color:
                        #0758f8;

                    background:
                        #ffffff;

                    border-color:
                        #bfd0f7;
                }

                #azuryPedidoSucesso
                .azury-pos-botao.secundario:hover {
                    color:
                        #0045d8;

                    background:
                        #f7faff;
                }

                #azuryPedidoSucesso
                .azury-pos-lateral h3 {
                    margin:
                        0 0
                        15px;

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        8px;

                    color:
                        #17233c;

                    font-size:
                        18px;

                    font-weight:
                        950;
                }

                #azuryPedidoSucesso
                .azury-pos-itens {
                    display:
                        grid;

                    gap:
                        10px;
                }

                #azuryPedidoSucesso
                .azury-pos-item {
                    padding:
                        13px;

                    border:
                        1px solid
                        #dfe7f4;

                    border-radius:
                        14px;

                    background:
                        #ffffff;
                }

                #azuryPedidoSucesso
                .azury-pos-item-topo {
                    display:
                        flex;

                    align-items:
                        flex-start;

                    justify-content:
                        space-between;

                    gap:
                        12px;
                }

                #azuryPedidoSucesso
                .azury-pos-item-topo > div {
                    min-width:
                        0;

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        8px;
                }

                #azuryPedidoSucesso
                .azury-pos-item-numero {
                    width:
                        27px;

                    height:
                        27px;

                    flex:
                        0 0
                        27px;

                    display:
                        grid;

                    place-items:
                        center;

                    border-radius:
                        9px;

                    color:
                        #0758f8;

                    background:
                        #edf3ff;

                    font-size:
                        11px;

                    font-weight:
                        950;
                }

                #azuryPedidoSucesso
                .azury-pos-item-topo strong {
                    min-width:
                        0;

                    color:
                        #17233c;

                    font-size:
                        13px;

                    line-height:
                        1.3;
                }

                #azuryPedidoSucesso
                .azury-pos-item-preco {
                    flex:
                        0 0
                        auto;

                    color:
                        #0758f8
                        !important;

                    white-space:
                        nowrap;
                }

                #azuryPedidoSucesso
                .azury-pos-item-meta {
                    display:
                        block;

                    margin:
                        7px 0
                        5px 35px;

                    color:
                        #7a8495;

                    font-size:
                        11px;

                    font-weight:
                        700;
                }

                #azuryPedidoSucesso
                .azury-pos-complementos {
                    margin-left:
                        35px;

                    color:
                        #64748b;

                    font-size:
                        11px;

                    line-height:
                        1.45;
                }

                #azuryPedidoSucesso
                .azury-pos-complementos b {
                    color:
                        #334155;
                }

                #azuryPedidoSucesso
                .azury-pos-complementos span {
                    display:
                        block;

                    margin-top:
                        2px;
                }

                #azuryPedidoSucesso
                .azury-pos-vazio {
                    padding:
                        16px;

                    color:
                        #64748b;

                    background:
                        #ffffff;

                    border:
                        1px dashed
                        #ccd8ea;

                    border-radius:
                        12px;

                    text-align:
                        center;

                    font-size:
                        12px;
                }

                #azuryPedidoSucesso
                .azury-pos-totais {
                    margin-top:
                        14px;

                    padding:
                        14px;

                    border:
                        1px solid
                        #dfe7f4;

                    border-radius:
                        14px;

                    background:
                        #ffffff;
                }

                #azuryPedidoSucesso
                .azury-pos-total-linha {
                    display:
                        flex;

                    align-items:
                        center;

                    justify-content:
                        space-between;

                    gap:
                        12px;

                    margin-bottom:
                        8px;

                    color:
                        #64748b;

                    font-size:
                        12px;
                }

                #azuryPedidoSucesso
                .azury-pos-total-linha:last-child {
                    margin:
                        10px 0
                        0;

                    padding-top:
                        10px;

                    border-top:
                        1px solid
                        #e6edf6;

                    color:
                        #17233c;

                    font-size:
                        14px;

                    font-weight:
                        950;
                }

                #azuryPedidoSucesso
                .azury-pos-total-linha:last-child strong {
                    color:
                        #0758f8;

                    font-size:
                        17px;
                }

                #azuryPedidoSucesso
                .azury-pos-info {
                    margin-top:
                        12px;

                    padding:
                        13px
                        14px;

                    border:
                        1px solid
                        #dfe7f4;

                    border-radius:
                        14px;

                    background:
                        #ffffff;
                }

                #azuryPedidoSucesso
                .azury-pos-info strong {
                    display:
                        block;

                    margin-bottom:
                        5px;

                    color:
                        #17233c;

                    font-size:
                        12px;
                }

                #azuryPedidoSucesso
                .azury-pos-info p {
                    margin:
                        0;

                    color:
                        #556176;

                    font-size:
                        12px;

                    line-height:
                        1.5;
                }

                #azuryPedidoSucesso
                .azury-pos-info p + p {
                    margin-top:
                        2px;
                }

                #azuryPedidoSucesso
                .azury-pos-whatsapp {
                    margin-top:
                        12px;

                    padding:
                        12px
                        14px;

                    display:
                        flex;

                    align-items:
                        center;

                    gap:
                        10px;

                    border-radius:
                        13px;

                    color:
                        #17633a;

                    background:
                        #eefbf3;

                    border:
                        1px solid
                        #c8ebd6;

                    font-size:
                        11px;

                    line-height:
                        1.45;
                }

                #azuryPedidoSucesso
                .azury-pos-whatsapp span {
                    font-size:
                        18px;
                }

                @media (
                    max-width:
                    860px
                ) {
                    #azuryPedidoSucesso
                    .azury-pos-conteudo {
                        grid-template-columns:
                            1fr;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-lateral {
                        border-left:
                            0;

                        border-top:
                            1px solid
                            #e6edf8;
                    }
                }

                @media (
                    max-width:
                    600px
                ) {
                    #azuryPedidoSucesso {
                        padding:
                            max(
                                8px,
                                env(safe-area-inset-top)
                            )
                            8px
                            max(
                                8px,
                                env(safe-area-inset-bottom)
                            );
                    }

                    #azuryPedidoSucesso
                    .azury-pos-pedido-painel {
                        border-radius:
                            18px;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-topo {
                        min-height:
                            62px;

                        padding:
                            10px
                            13px;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-marca {
                        font-size:
                            20px;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-coroa {
                        width:
                            36px;

                        height:
                            36px;

                        flex-basis:
                            36px;

                        border-radius:
                            11px;

                        font-size:
                            19px;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-fechar {
                        width:
                            36px;

                        height:
                            36px;

                        flex-basis:
                            36px;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-principal,
                    #azuryPedidoSucesso
                    .azury-pos-lateral {
                        padding:
                            18px
                            14px;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-sucesso {
                        grid-template-columns:
                            1fr;

                        gap:
                            12px;

                        text-align:
                            center;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-check {
                        width:
                            62px;

                        height:
                            62px;

                        margin:
                            0 auto;

                        border-width:
                            7px;

                        font-size:
                            29px;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-destaques {
                        grid-template-columns:
                            1fr;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-numero {
                        align-items:
                            flex-start;

                        flex-direction:
                            column;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-numero time {
                        white-space:
                            normal;
                    }

                    #azuryPedidoSucesso
                    .azury-pos-acoes {
                        grid-template-columns:
                            1fr;
                    }
                }
            `;

      document.head.appendChild(style);
    }

    document.getElementById("azuryPedidoSucesso")?.remove();

    document.body.classList.add("azury-pos-pedido-aberto");

    const screen = document.createElement("div");

    screen.id = "azuryPedidoSucesso";

    screen.setAttribute("role", "dialog");

    screen.setAttribute("aria-modal", "true");

    screen.setAttribute("aria-label", "Pedido realizado com sucesso");

    screen.innerHTML = `
            <section class="azury-pos-pedido-painel">

                <header class="azury-pos-topo">

                    <div class="azury-pos-marca">

                        <span
                            class="azury-pos-coroa"
                            aria-hidden="true"
                        >
                            \u{1F451}
                        </span>

                        AZURY

                    </div>


                    <button
                        type="button"
                        class="azury-pos-fechar"
                        aria-label="Fechar tela de confirmação"
                    >
                        ×
                    </button>

                </header>


                <div class="azury-pos-conteudo">


                    <main class="azury-pos-principal">


                        <div class="azury-pos-sucesso">

                            <div
                                class="azury-pos-check"
                                aria-hidden="true"
                            >
                                ✓
                            </div>


                            <div>

                                <h2>
                                    Pedido realizado com sucesso!
                                </h2>


                                <p>
                                    Obrigado,
                                    <strong>
                                        ${esc(customerName)}
                                    </strong>!

                                    Seu pedido foi registrado na Azury.
                                </p>

                            </div>

                        </div>



                        <div class="azury-pos-destaques">


                            <div class="azury-pos-destaque">

                                <span
                                    class="azury-pos-destaque-icone"
                                    aria-hidden="true"
                                >
                                    ⭐
                                </span>


                                <div>

                                    <small>
                                        Pontos
                                    </small>

                                    <strong>
                                        ${esc(pointsText)}
                                    </strong>

                                </div>

                            </div>



                            <div class="azury-pos-destaque">

                                <span
                                    class="azury-pos-destaque-icone"
                                    aria-hidden="true"
                                >
                                    \u{1F4B3}
                                </span>


                                <div>

                                    <small>
                                        Pagamento
                                    </small>

                                    <strong>
                                        ${esc(paymentName)}
                                    </strong>

                                </div>

                            </div>


                        </div>



                        <div class="azury-pos-numero">

                            <div>

                                <span>
                                    Número do pedido
                                </span>

                                <strong>
                                    ${esc(code || safeOrder.codigo || "—")}
                                </strong>

                            </div>


                            <time
                                datetime="${esc(validCreatedAt.toISOString())}"
                            >
                                ${esc(dateLabel)}
                                às
                                ${esc(timeLabelOrder)}
                            </time>

                        </div>



                        <div class="azury-pos-estimativa">

                            <span
                                aria-hidden="true"
                            >
                                \u{1F552}
                            </span>


                            <div>

                                <strong>
                                    Estimativa de entrega
                                </strong>

                                <small>
                                    ${esc(estimatedDelivery)}
                                </small>

                            </div>

                        </div>



                        <div class="azury-pos-acoes">

                            <a
                                href="cliente.html"
                                class="azury-pos-botao"
                            >
                                \u{1F464} Ver pedido na Área do Cliente
                            </a>


                            <a
                                href="index.html"
                                class="azury-pos-botao secundario"
                            >
                                ← Voltar para o início
                            </a>

                        </div>

                    </main>



                    <aside class="azury-pos-lateral">

                        <h3>
                            \u{1F9FE} Resumo do pedido
                        </h3>


                        <div class="azury-pos-itens">
                            ${itemsHtml}
                        </div>


                        <div class="azury-pos-totais">

                            <div class="azury-pos-total-linha">

                                <span>
                                    Produtos
                                </span>

                                <strong>
                                    ${money(productValue)}
                                </strong>

                            </div>


                            <div class="azury-pos-total-linha">

                                <span>
                                    Taxa de entrega
                                </span>

                                <strong>
                                    ${money(deliveryFee)}
                                </strong>

                            </div>


                            <div class="azury-pos-total-linha">

                                <span>
                                    Total
                                </span>

                                <strong>
                                    ${money(totalValue)}
                                </strong>

                            </div>

                        </div>



                        <div class="azury-pos-info">

                            <strong>
                                \u{1F4CD} Endereço de entrega
                            </strong>


                            <p>
                                ${esc(
                                  addressMain || "Endereço informado no pedido",
                                )}
                            </p>


                            ${
                              addressSecond
                                ? `
                                        <p>
                                            ${esc(addressSecond)}
                                        </p>
                                    `
                                : ""
                            }


                            ${
                              addressExtra
                                ? `
                                        <p>
                                            Complemento:
                                            ${esc(addressExtra)}
                                        </p>
                                    `
                                : ""
                            }

                        </div>



                        <div class="azury-pos-info">

                            <strong>
                                \u{1F4B3} Forma de pagamento
                            </strong>

                            <p>
                                ${esc(paymentName)}
                            </p>

                        </div>



                        <div class="azury-pos-whatsapp">

                            <span
                                aria-hidden="true"
                            >
                                \u{1F4AC}
                            </span>

                            <div>
                                O WhatsApp será aberto para você confirmar o pedido com a Azury.
                            </div>

                        </div>


                    </aside>


                </div>


            </section>
        `;

    document.body.appendChild(screen);

    const closeScreen = () => {
      if (!screen.isConnected) {
        return;
      }

      screen.classList.remove("visivel");

      document.body.classList.remove("azury-pos-pedido-aberto");

      window.setTimeout(() => screen.remove(), 240);
    };

    screen
      .querySelector(".azury-pos-fechar")
      ?.addEventListener("click", closeScreen);

    window.requestAnimationFrame(() => {
      screen.classList.add("visivel");
    });
  }

  function showOrderWarning(text) {
    const styleId = "azury-pedido-aviso-estilos";

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");

      style.id = styleId;

      style.textContent = `
                #azuryPedidoAviso {
                    position: fixed;
                    top: max(16px, env(safe-area-inset-top));
                    right: 16px;
                    z-index: 100000;

                    width:
                        min(
                            420px,
                            calc(100vw - 32px)
                        );

                    display: grid;

                    grid-template-columns:
                        auto
                        1fr
                        auto;

                    gap:
                        12px;

                    align-items:
                        center;

                    padding:
                        16px;

                    border:
                        1px solid
                        rgba(
                            245,
                            158,
                            11,
                            0.28
                        );

                    border-left:
                        5px solid
                        #f59e0b;

                    border-radius:
                        16px;

                    background:
                        #ffffff;

                    box-shadow:
                        0 18px 45px
                        rgba(
                            0,
                            25,
                            80,
                            0.22
                        );

                    color:
                        #13213c;

                    font-family:
                        inherit;

                    opacity:
                        0;

                    transform:
                        translateY(-18px);

                    transition:
                        opacity
                        220ms ease,
                        transform
                        220ms ease;
                }

                #azuryPedidoAviso.visivel {
                    opacity:
                        1;

                    transform:
                        translateY(0);
                }

                #azuryPedidoAviso
                .azury-aviso-icone {
                    width:
                        42px;

                    height:
                        42px;

                    display:
                        grid;

                    place-items:
                        center;

                    border-radius:
                        50%;

                    background:
                        #fef3c7;

                    color:
                        #b45309;

                    font-size:
                        22px;

                    font-weight:
                        900;
                }

                #azuryPedidoAviso
                .azury-aviso-texto {
                    min-width:
                        0;
                }

                #azuryPedidoAviso strong {
                    display:
                        block;

                    margin-bottom:
                        3px;

                    color:
                        #b45309;

                    font-size:
                        16px;

                    line-height:
                        1.3;
                }

                #azuryPedidoAviso span {
                    display:
                        block;

                    color:
                        #475569;

                    font-size:
                        14px;

                    line-height:
                        1.4;
                }

                #azuryPedidoAviso
                .azury-aviso-fechar {
                    width:
                        34px;

                    height:
                        34px;

                    display:
                        grid;

                    place-items:
                        center;

                    border:
                        0;

                    border-radius:
                        50%;

                    background:
                        transparent;

                    color:
                        #64748b;

                    font-size:
                        24px;

                    line-height:
                        1;

                    cursor:
                        pointer;
                }

                #azuryPedidoAviso
                .azury-aviso-fechar:hover {
                    background:
                        #fff7ed;

                    color:
                        #b45309;
                }

                @media (
                    max-width:
                    520px
                ) {
                    #azuryPedidoAviso {
                        top:
                            max(
                                10px,
                                env(safe-area-inset-top)
                            );

                        right:
                            10px;

                        width:
                            calc(
                                100vw -
                                20px
                            );

                        padding:
                            14px;
                    }
                }
            `;

      document.head.appendChild(style);
    }

    document.getElementById("azuryPedidoAviso")?.remove();

    const notification = document.createElement("div");

    notification.id = "azuryPedidoAviso";

    notification.setAttribute("role", "alert");

    notification.setAttribute("aria-live", "assertive");

    notification.innerHTML = `
            <div
                class="azury-aviso-icone"
                aria-hidden="true"
            >
                !
            </div>

            <div class="azury-aviso-texto">

                <strong>
                    Verifique o endereço
                </strong>

                <span>
                    ${esc(text)}
                </span>

            </div>

            <button
                type="button"
                class="azury-aviso-fechar"
                aria-label="Fechar aviso"
            >
                ×
            </button>
        `;

    document.body.appendChild(notification);

    const closeNotification = () => {
      if (!notification.isConnected) {
        return;
      }

      notification.classList.remove("visivel");

      window.setTimeout(() => notification.remove(), 240);
    };

    notification
      .querySelector(".azury-aviso-fechar")
      ?.addEventListener("click", closeNotification);

    window.requestAnimationFrame(() => {
      notification.classList.add("visivel");
    });

    window.setTimeout(closeNotification, 6000);
  }

  async function table(name, configure) {
    let query = sb.from(name).select("*");

    query = configure ? configure(query) : query;

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  function saveOperationCache(data) {
    try {
      localStorage.setItem(
        OPERATION_CACHE_KEY,
        JSON.stringify({
          savedAt: Date.now(),

          data,
        }),
      );
    } catch (error) {
      console.warn("Não foi possível salvar o cardápio localmente.", error);
    }
  }

  function readOperationCache() {
    try {
      const stored = JSON.parse(
        localStorage.getItem(OPERATION_CACHE_KEY) || "null",
      );

      if (!stored || !stored.data || !Number.isFinite(Number(stored.savedAt))) {
        return null;
      }

      const age = Date.now() - Number(stored.savedAt);

      if (age < 0 || age > OPERATION_CACHE_MAX_AGE) {
        localStorage.removeItem(OPERATION_CACHE_KEY);

        return null;
      }

      return stored.data;
    } catch (error) {
      console.warn("O cardápio salvo não pôde ser lido.", error);

      return null;
    }
  }

  function applyOperation(
    data,
    { saveCache = true, source = "supabase" } = {},
  ) {
    const sizes = data.tamanhos || data.sizes || [];
    const rawBoxes =
      data.azury_boxes || data.boxes || data.boxes_acai || data.hamburgueiras || [];
    const complements = data.complementos || data.complements || [];
    const districts =
      data.bairros || data.bairros_entrega || data.districts || [];
    const schedules =
      data.horarios || data.horarios_funcionamento || data.schedules || [];
    const config =
      data.configuracao_loja || data.configuracao || data.config || null;

    if (
      !Array.isArray(sizes) ||
      !sizes.length ||
      !Array.isArray(districts) ||
      !districts.length ||
      !config
    ) {
      throw new Error("Configuração pública incompleta.");
    }

    state.sizes = sizes;
    state.boxes = normalizeBoxes(rawBoxes);
    state.complements = Array.isArray(complements)
      ? complements.filter(
          (item) => item.disponivel !== false && item.visivel !== false,
        )
      : [];
    state.districts = districts.filter((item) => item.ativo !== false);
    state.schedules = Array.isArray(schedules) ? schedules : [];
    state.config = config;
    state.operationReady = true;
    state.operationSource = source;

    state.districtMap.clear();

    state.districts.forEach((item) => {
      const aliases = Array.isArray(item.aliases) ? item.aliases : [];

      [item.nome, ...aliases].filter(Boolean).forEach((alias) => {
        state.districtMap.set(norm(alias), item);
      });
    });

    state.aliases = Array.from(state.districtMap.keys()).sort(
      (a, b) => b.length - a.length,
    );

    if (saveCache) {
      saveOperationCache({
        tamanhos: sizes,
        azury_boxes: rawBoxes,
        complementos: complements,
        bairros: districts,
        horarios: schedules,
        configuracao_loja: config,
      });
    }
  }

  function applyCachedOperation() {
    const cached = readOperationCache();

    if (!cached) {
      return false;
    }

    try {
      applyOperation(cached, {
        saveCache: false,

        source: "cache",
      });

      console.info("Cardápio carregado da última versão válida.");

      return true;
    } catch (error) {
      console.warn("A versão salva do cardápio não é válida.", error);

      try {
        localStorage.removeItem(OPERATION_CACHE_KEY);
      } catch (_) {}

      return false;
    }
  }

  async function loadBoxesDirect() {
    try {
      return await table("azury_boxes", (query) =>
        query.order("ordem", {
          ascending: true,
        }),
      );
    } catch (error) {
      console.warn(
        "A tabela pública de Azury Box não pôde ser lida diretamente; usando a configuração segura do site.",
        error,
      );
      return [];
    }
  }

  async function loadOperationDirect() {
    const [sizes, boxes, complements, districts, schedules, configRows] =
      await Promise.all([
        table("tamanhos_acai", (query) =>
          query.order("ordem", {
            ascending: true,
          }),
        ),
        loadBoxesDirect(),
        table("complementos", (query) =>
          query.eq("disponivel", true).eq("visivel", true).order("ordem", {
            ascending: true,
          }),
        ),
        table("bairros_entrega", (query) =>
          query.eq("ativo", true).order("ordem", {
            ascending: true,
          }),
        ),
        table("horarios_funcionamento", (query) =>
          query.order("dia_semana", {
            ascending: true,
          }),
        ),
        table("configuracoes_loja", (query) => query.eq("id", 1).limit(1)),
      ]);

    applyOperation({
      tamanhos: sizes,
      azury_boxes: boxes,
      complementos: complements,
      bairros: districts,
      horarios: schedules,
      configuracao_loja: configRows[0] || null,
    });
  }

  async function loadOperationFunction() {
    const functionNames = [
      "listar_operacao_publica",
      "listar_operacao_site",
      "obter_operacao_publica",
    ];

    let lastError = null;

    for (const name of functionNames) {
      const { data, error } = await sb.rpc(name);

      if (!error && data) {
        applyOperation(data);
        return;
      }

      if (error) {
        lastError = error;
      }

      const errorMessage = String(error?.message || "").toLowerCase();

      const missing =
        error?.code === "PGRST202" ||
        errorMessage.includes("could not find the function") ||
        errorMessage.includes("does not exist");

      if (error && !missing) {
        throw error;
      }
    }

    throw lastError || new Error("Nenhuma função pública disponível.");
  }

  async function loadOperationOnce() {
    sb = window.azurySupabase || sb;

    if (!sb) {
      throw new Error("Supabase ainda não carregado.");
    }

    try {
      await loadOperationDirect();
    } catch (directError) {
      console.warn(
        "Leitura direta indisponível; tentando função pública.",
        directError,
      );

      await loadOperationFunction();
    }
  }

  async function loadOperation() {
    let lastError = null;

    for (
      let attempt = 0;
      attempt < OPERATION_RETRY_DELAYS.length;
      attempt += 1
    ) {
      const delay = OPERATION_RETRY_DELAYS[attempt];

      if (delay > 0) {
        await wait(delay);
      }

      try {
        await loadOperationOnce();
        return;
      } catch (error) {
        lastError = error;

        console.warn(
          `Tentativa ${attempt + 1} de carregar o cardápio falhou.`,
          error,
        );
      }
    }

    throw lastError || new Error("Não foi possível carregar a operação.");
  }

  function renderBoxCard() {
    const wrapper = document.querySelector("[data-azury-box-card]");
    const options = document.getElementById("azuryBoxOpcoes");
    const price = document.getElementById("azuryBoxPrecoInicial");
    const button = document.querySelector("[data-btn-azury-box]");

    if (!wrapper || !options || !price || !button) {
      return;
    }

    const visibleBoxes = state.boxes.filter((box) => box.visivel !== false);
    const availableBoxes = visibleBoxes.filter(productIsAvailable);

    wrapper.hidden = visibleBoxes.length === 0;

    options.innerHTML = visibleBoxes
      .map((box) => {
        const available = productIsAvailable(box);
        const label = String(box.tamanho_label || "").toUpperCase();
        const limit = freeComplementLimit(box);

        return `
                    <div class="azury-box-opcao ${available ? "" : "indisponivel"}">
                        <span class="azury-box-tamanho">${esc(label)}</span>
                        <strong>${money(box.preco_base)}</strong>
                        <small>
                            ${
                              available
                                ? `Até ${limit} complementos incluídos`
                                : "Indisponível no momento"
                            }
                        </small>
                    </div>
                `;
      })
      .join("");

    const firstAvailable = availableBoxes[0] || null;

    if (firstAvailable) {
      button.dataset.produtoChave = productKey(firstAvailable);
      button.dataset.precoBase = String(firstAvailable.preco_base);
      button.dataset.disponibilidade = "disponivel";
      price.textContent = `A partir de ${money(firstAvailable.preco_base)}`;
    } else {
      button.dataset.disponibilidade = "em-breve";
      price.textContent = "Temporariamente indisponível";
    }
  }

  function renderBuilderProductOptions(type = null) {
    const container = $(".opcoes-tamanho-monte-seu");

    if (!container) {
      return;
    }

    const boxMode =
      type === "azury_box" ||
      (type === null && isBoxProduct(currentBuilderProduct()));

    if (boxMode) {
      container.innerHTML = state.boxes
        .filter((item) => item.visivel !== false)
        .map((item) => {
          const available = productIsAvailable(item);
          const key = productKey(item);

          return `
                    <label
                        class="opcao-tamanho-produto
                        ${available ? "" : "opcao-tamanho-indisponivel"}"
                    >
                        <input
                            type="radio"
                            name="tamanhoMonteSeuOpcao"
                            value="${esc(key)}"
                            data-produto-tipo="azury_box"
                            data-produto-chave="${esc(key)}"
                            data-preco-base="${esc(item.preco_base)}"
                            ${available ? "" : "disabled"}
                            ${
                              isBoxProduct(currentBuilderProduct()) &&
                              productKey(currentBuilderProduct()) === key
                                ? "checked"
                                : ""
                            }
                        >
                        <span>
                            <strong>
                                ${esc(productDisplayName(item))}
                            </strong>
                            <small>
                                ${
                                  available
                                    ? `${money(item.preco_base)} • até ${freeComplementLimit(item)} incluídos`
                                    : "Indisponível"
                                }
                            </small>
                        </span>
                    </label>
                `;
        })
        .join("");
    } else {
      container.innerHTML = state.sizes
        .filter((item) => item.visivel !== false)
        .map((item) => {
          const available = item.disponivel === true;

          return `
                    <label
                        class="opcao-tamanho-produto
                        ${available ? "" : "opcao-tamanho-indisponivel"}"
                    >
                        <input
                            type="radio"
                            name="tamanhoMonteSeuOpcao"
                            value="${esc(item.tamanho_ml)}"
                            data-produto-tipo="acai_copo"
                            data-preco-base="${esc(item.preco_base)}"
                            ${available ? "" : "disabled"}
                            ${
                              !isBoxProduct(currentBuilderProduct()) &&
                              Number(currentBuilderProduct()?.tamanho_ml) ===
                                Number(item.tamanho_ml)
                                ? "checked"
                                : ""
                            }
                        >
                        <span>
                            <strong>
                                ${esc(productDisplayName(item))}
                            </strong>
                            <small>
                                ${
                                  available
                                    ? `${money(item.preco_base)} • ${freeComplementLimit(item)} grátis`
                                    : "Em breve"
                                }
                            </small>
                        </span>
                    </label>
                `;
        })
        .join("");
    }

    $$("input[name='tamanhoMonteSeuOpcao']").forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) {
          return;
        }

        if (input.dataset.produtoTipo === "azury_box") {
          selectBox(input.dataset.produtoChave || input.value);
        } else {
          selectSize(input.value, input.dataset.precoBase);
        }
      });
    });
  }

  function renderSizes() {
    $$(".menu-grid > li").forEach((card) => {
      const button = card.querySelector(".btn-montar");
      const current = Number(button?.dataset.tamanho);
      const item = state.sizes.find(
        (size) => Number(size.tamanho_ml) === current,
      );

      if (!button || !item) {
        return;
      }

      const available = item.disponivel === true && item.visivel === true;
      card.hidden = item.visivel === false;
      card.classList.toggle("produto-em-breve", !available);

      const badge = card.querySelector(".badge");
      const title = card.querySelector("h3");
      const description = card.querySelector("h3 + p");
      const price = card.querySelector("h3 + p + strong");

      if (badge) {
        badge.textContent = item.badge || (available ? "Disponível" : "Em breve");
        badge.classList.toggle("badge-em-breve", !available);
      }

      if (title) {
        title.textContent = productDisplayName(item);
      }

      if (description) {
        const freeLimit = freeComplementLimit(item);
        description.textContent =
          available && freeLimit > 0
            ? `${freeLimit} complementos grátis. Extras e ingredientes especiais são cobrados à parte.`
            : item.descricao ||
              "Escolha os complementos do meio e da cobertura.";
      }

      if (price) {
        price.textContent = `${
          available ? "A partir de" : "Preço previsto:"
        } ${money(item.preco_base)}`;
      }

      button.dataset.produtoTipo = "acai_copo";
      button.dataset.precoBase = String(item.preco_base);
      button.dataset.disponibilidade = available ? "disponivel" : "em-breve";
      button.disabled = !available;
    });

    renderBoxCard();
    renderBuilderProductOptions(
      isBoxProduct(currentBuilderProduct()) ? "azury_box" : "acai_copo",
    );
  }

  function complementImagePath(name) {
    const key = norm(name);

    const images = {
      granola: "Imagens/granola.png",

      "leite condensado": "Imagens/leite-condensado.png",

      pacoca: "Imagens/pacoca.png",

      banana: "Imagens/banana.png",

      "coco ralado": "Imagens/coco-ralado.png",

      "leite em po": "Imagens/leite-em-po.png",

      "bombom oreo": "Imagens/bombom-oreo.png",

      oreo: "Imagens/bombom-oreo.png",

      ovomaltine: "Imagens/ovomaltine.png",

      morango: "Imagens/morango.png",

      "uva verde": "Imagens/uva-verde.png",

      uva: "Imagens/uva-verde.png",

      nutella: "Imagens/nutella.png",

      granulado: "Imagens/granulado.png",

      manga: "Imagens/manga.png",

      gomets: "Imagens/gomets.png",

      confete: "Imagens/confete.png",

      "power ball": "Imagens/power-ball.png",
    };

    if (images[key]) {
      return images[key];
    }

    const partial = Object.keys(images).find(
      (imageKey) => key.includes(imageKey) || imageKey.includes(key),
    );

    return partial ? images[partial] : "";
  }

  function ensureComplementPickerStyles() {
    const styleId = "azury-complementos-novo-estilo";

    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");

    style.id = styleId;

    style.textContent = `
            .azury-complementos-ajuda {
                margin: -4px 0 14px;
                color: #64748b;
                font-size: 14px;
                line-height: 1.5;
            }

            .azury-complementos-ajuda strong {
                color: #0051ff;
            }

            .azury-complementos-progresso {
                width: 100%;
                margin: 0 0 16px;
                padding: 13px 14px 14px;
                color: #334155;
                background: #f8fbff;
                border: 1px solid #d7e4ff;
                border-radius: 14px;
                box-sizing: border-box;
                transition:
                    background 180ms ease,
                    border-color 180ms ease;
            }

            .azury-complementos-progresso-cabecalho {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 9px;
            }

            .azury-complementos-progresso-titulo {
                color: #334155;
                font-size: 13px;
                font-weight: 800;
                line-height: 1.3;
            }

            .azury-complementos-progresso-contagem {
                flex: 0 0 auto;
                color: #0051ff;
                font-size: 13px;
                font-weight: 900;
                line-height: 1.3;
            }

            .azury-complementos-progresso-trilho {
                width: 100%;
                height: 10px;
                overflow: hidden;
                border-radius: 999px;
                background: #dce7f8;
                box-shadow:
                    inset 0 1px 2px
                    rgba(15, 23, 42, 0.08);
            }

            .azury-complementos-progresso-barra {
                display: block;
                width: 0%;
                height: 100%;
                border-radius: inherit;
                background:
                    linear-gradient(
                        90deg,
                        #0051ff 0%,
                        #2875ff 100%
                    );
                transition:
                    width 260ms ease;
            }

            .azury-complementos-progresso-mensagem {
                display: block;
                margin-top: 8px;
                color: #64748b;
                font-size: 12px;
                font-weight: 700;
                line-height: 1.4;
            }

            .azury-complementos-progresso.limite-atingido {
                background: #eef4ff;
                border-color: #9fbcff;
            }

            .azury-complementos-progresso.limite-atingido
            .azury-complementos-progresso-mensagem {
                color: #0758f8;
            }

            .azury-complementos-progresso.com-extras {
                background: #fff8ed;
                border-color: #f3c98b;
            }

            .azury-complementos-progresso.com-extras
            .azury-complementos-progresso-contagem,
            .azury-complementos-progresso.com-extras
            .azury-complementos-progresso-mensagem {
                color: #b45309;
            }

            @media (max-width: 420px) {
                .azury-complementos-progresso {
                    padding: 12px;
                }

                .azury-complementos-progresso-cabecalho {
                    gap: 8px;
                }

                .azury-complementos-progresso-titulo,
                .azury-complementos-progresso-contagem {
                    font-size: 12px;
                }
            }

            .menu-grid > li h3 {
                white-space: nowrap;
                font-size: 19px;
                line-height: 1.25;
                letter-spacing: -0.02em;
            }

            #btnAdicionarSacola.azury-adicionar-substituido {
                display: none !important;
            }

            .azury-barra-montagem-espaco {
                width: 100%;
                height: 104px;
                pointer-events: none;
            }

            .azury-barra-montagem[hidden] {
                display: none !important;
            }

            .azury-barra-montagem {
                position: fixed;
                left: 50%;
                bottom: max(10px, env(safe-area-inset-bottom));
                z-index: 100050;
                width: min(860px, calc(100vw - 24px));
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto auto auto;
                gap: 12px;
                align-items: center;
                padding: 11px 12px;
                border: 1px solid rgba(0, 81, 255, 0.18);
                border-radius: 18px;
                background: rgba(255, 255, 255, 0.97);
                box-shadow:
                    0 14px 38px rgba(15, 23, 42, 0.20),
                    0 2px 10px rgba(0, 81, 255, 0.08);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                box-sizing: border-box;
                transform: translateX(-50%);
            }

            .azury-barra-montagem-produto {
                min-width: 0;
            }

            .azury-barra-montagem-produto small,
            .azury-barra-montagem-preco small {
                display: block;
                margin-bottom: 2px;
                color: #64748b;
                font-size: 10.5px;
                font-weight: 800;
                line-height: 1.2;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .azury-barra-montagem-produto strong {
                display: block;
                overflow: hidden;
                color: #17305c;
                font-size: 14px;
                font-weight: 900;
                line-height: 1.25;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .azury-barra-montagem-sacola {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                min-height: 34px;
                padding: 7px 10px;
                border: 1px solid #d7e4ff;
                border-radius: 999px;
                background: #f5f8ff;
                color: #17305c;
                font-size: 12px;
                font-weight: 900;
                line-height: 1.2;
                white-space: nowrap;
            }

            .azury-barra-montagem-sacola span[aria-hidden="true"] {
                font-size: 14px;
                line-height: 1;
            }

            .azury-barra-montagem-preco {
                text-align: right;
                white-space: nowrap;
            }

            .azury-barra-montagem-preco strong {
                display: block;
                color: #0051ff;
                font-size: 17px;
                font-weight: 900;
                line-height: 1.2;
            }

            .azury-barra-montagem-adicionar {
                min-height: 46px;
                padding: 10px 17px;
                border: 0;
                border-radius: 13px;
                background: #0051ff;
                color: #ffffff;
                box-shadow: 0 7px 18px rgba(0, 81, 255, 0.24);
                font: inherit;
                font-size: 13px;
                font-weight: 900;
                line-height: 1.1;
                cursor: pointer;
                transition:
                    transform 160ms ease,
                    box-shadow 160ms ease,
                    opacity 160ms ease;
            }

            .azury-barra-montagem-adicionar:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 9px 22px rgba(0, 81, 255, 0.30);
            }

            .azury-barra-montagem-adicionar:disabled {
                cursor: default;
                opacity: 0.55;
                box-shadow: none;
            }

            .lista-complementos.azury-complementos-grid {
                display: grid;
                grid-template-columns:
                    repeat(2, minmax(0, 1fr));
                gap: 14px;
            }

            .azury-complementos-secao {
                grid-column: 1 / -1;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin: 2px 0 0;
                padding: 12px 14px;
                border: 1px solid #d7e4ff;
                border-radius: 14px;
                background: #f8fbff;
            }

            .azury-complementos-secao-texto {
                min-width: 0;
            }

            .azury-complementos-secao strong {
                display: block;
                color: #17305c;
                font-size: 14px;
                font-weight: 900;
                line-height: 1.3;
            }

            .azury-complementos-secao small {
                display: block;
                margin-top: 3px;
                color: #64748b;
                font-size: 11px;
                font-weight: 600;
                line-height: 1.4;
            }

            .azury-complementos-secao-badge {
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 28px;
                padding: 5px 9px;
                border-radius: 999px;
                background: #e8f0ff;
                color: #0051ff;
                font-size: 11px;
                font-weight: 900;
                line-height: 1;
                white-space: nowrap;
            }

            .azury-complementos-secao.especiais {
                margin-top: 8px;
                border-color: #f3c98b;
                background: #fff8ed;
            }

            .azury-complementos-secao.especiais strong {
                color: #9a4c00;
            }

            .azury-complementos-secao.especiais
            .azury-complementos-secao-badge {
                background: #ffedd5;
                color: #b45309;
            }

            .complemento-card.especial-pago:not(.selecionado) {
                border-color: #f1d2a7;
                background: #fffaf4;
            }

            .complemento-card.especial-pago:not(.selecionado)
            .complemento-card-imagem {
                background: #ffffff;
            }

            .complemento-card {
                min-width: 0;
                overflow: hidden;
                border: 1px solid #dbe5f5;
                border-radius: 18px;
                background: #ffffff;
                box-shadow:
                    0 8px 24px
                    rgba(15, 23, 42, 0.07);
                transition:
                    border-color 180ms ease,
                    background 180ms ease,
                    box-shadow 180ms ease,
                    transform 180ms ease;
            }

            .complemento-card.selecionado {
                border-color: #0051ff;
                background: #f4f8ff;
                box-shadow:
                    0 12px 30px
                    rgba(0, 81, 255, 0.18),
                    inset 0 0 0 1px #0051ff;
                transform: translateY(-2px);
            }

            .complemento-card-selecao {
                display: grid;
                grid-template-columns:
                    76px minmax(0, 1fr) auto;
                gap: 12px;
                align-items: center;
                padding: 14px;
                cursor: pointer;
                transition:
                    background 180ms ease;
            }

            .complemento-card.selecionado
            .complemento-card-selecao {
                background:
                    linear-gradient(
                        135deg,
                        rgba(0, 81, 255, 0.08),
                        rgba(0, 81, 255, 0.02)
                    );
            }

            .complemento-card-imagem {
                width: 76px;
                height: 76px;
                display: grid;
                place-items: center;
                overflow: hidden;
                border: 1px solid transparent;
                border-radius: 15px;
                background: #f8fafc;
                transition:
                    border-color 180ms ease,
                    box-shadow 180ms ease,
                    background 180ms ease;
            }

            .complemento-card.selecionado
            .complemento-card-imagem {
                border-color:
                    rgba(0, 81, 255, 0.18);
                background: #ffffff;
                box-shadow:
                    0 5px 14px
                    rgba(0, 81, 255, 0.10);
            }

            .complemento-card-imagem img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

            .complemento-card-imagem.sem-imagem {
                display: none;
            }

            .complemento-card-info {
                min-width: 0;
            }

            .complemento-card-info strong {
                display: block;
                color: #0f172a;
                font-size: 15px;
                line-height: 1.3;
            }

            .complemento-card.selecionado
            .complemento-card-info strong {
                color: #003fc7;
            }

            .complemento-card-info small {
                display: block;
                margin-top: 5px;
                color: #64748b;
                font-size: 12px;
                line-height: 1.4;
            }

            .complemento-card-info small.especial {
                color: #b45309;
                font-weight: 700;
            }

            .complemento-card.selecionado
            .complemento-card-info::after {
                content: "✓ Selecionado";
                width: fit-content;
                display: inline-flex;
                align-items: center;
                margin-top: 7px;
                padding: 4px 8px;
                border-radius: 999px;
                background: #0051ff;
                color: #ffffff;
                font-size: 11px;
                font-weight: 900;
                line-height: 1;
                letter-spacing: 0.01em;
            }

            .complemento-card-check {
                width: 24px;
                height: 24px;
                accent-color: #0051ff;
                cursor: pointer;
                transition:
                    transform 160ms ease,
                    filter 160ms ease;
            }

            .complemento-card-check:checked {
                transform: scale(1.10);
                filter:
                    drop-shadow(
                        0 2px 4px
                        rgba(0, 81, 255, 0.24)
                    );
            }

            .complemento-camadas {
                display: grid;
                grid-template-columns:
                    repeat(3, minmax(0, 1fr));
                gap: 7px;
                padding: 0 14px 14px;
            }

            .complemento-camadas label {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                min-height: 38px;
                padding: 7px 8px;
                border: 1px solid #dbe5f5;
                border-radius: 11px;
                background: #f8fafc;
                color: #334155;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                user-select: none;
                transition:
                    border-color 160ms ease,
                    background 160ms ease,
                    color 160ms ease,
                    box-shadow 160ms ease,
                    transform 160ms ease;
            }

            .complemento-camadas label:has(
                input:checked:not(:disabled)
            ) {
                border-color: #0051ff;
                background: #0051ff;
                color: #ffffff;
                box-shadow:
                    0 5px 12px
                    rgba(0, 81, 255, 0.18);
                transform: translateY(-1px);
            }

            .complemento-camadas label:has(
                input:disabled
            ) {
                opacity: 0.44;
                cursor: default;
                background: #f8fafc;
                border-color: #dbe5f5;
                color: #64748b;
                box-shadow: none;
                transform: none;
            }

            .complemento-camadas input {
                accent-color: #0051ff;
            }

            .complemento-camadas label:has(
                input:checked:not(:disabled)
            ) input {
                accent-color: #ffffff;
            }

            @media (max-width: 720px) {

                .menu-grid > li h3 {
                    font-size: 18px;
                }

                .azury-barra-montagem-espaco {
                    height: 172px;
                }

                .azury-barra-montagem {
                    width: calc(100vw - 16px);
                    bottom:
                        max(
                            8px,
                            env(safe-area-inset-bottom)
                        );
                    grid-template-columns:
                        minmax(0, 1fr) auto;
                    gap: 8px 10px;
                    padding: 10px;
                    border-radius: 16px;
                }

                .azury-barra-montagem-produto strong {
                    font-size: 13px;
                }

                .azury-barra-montagem-preco strong {
                    font-size: 16px;
                }

                .azury-barra-montagem-sacola {
                    grid-column: 1 / -1;
                    justify-content: flex-start;
                    width: 100%;
                    min-height: 32px;
                    padding: 6px 9px;
                    box-sizing: border-box;
                    font-size: 11.5px;
                }

                .azury-barra-montagem-adicionar {
                    grid-column: 1 / -1;
                    width: 100%;
                    min-height: 43px;
                    padding: 9px 12px;
                }

                .lista-complementos.azury-complementos-grid {
                    grid-template-columns: 1fr;
                }

                .azury-complementos-secao {
                    align-items: flex-start;
                    padding: 11px 12px;
                }

                .azury-complementos-secao strong {
                    font-size: 13px;
                }

                .azury-complementos-secao small {
                    font-size: 10.5px;
                }

                .complemento-card-selecao {
                    grid-template-columns:
                        68px minmax(0, 1fr) auto;
                }

                .complemento-card-imagem {
                    width: 68px;
                    height: 68px;
                }
            }

            @media (max-width: 420px) {

                .complemento-camadas {
                    gap: 5px;
                    padding:
                        0 10px 12px;
                }

                .complemento-camadas label {
                    padding: 7px 4px;
                    font-size: 11px;
                }
            }
        `;

    document.head.appendChild(style);
  }

  function ensureAssemblyStickyBar() {
    if (!d.step1) {
      return;
    }

    let spacer = d.step1.querySelector(".azury-barra-montagem-espaco");

    if (!spacer) {
      spacer = document.createElement("div");

      spacer.className = "azury-barra-montagem-espaco";

      spacer.setAttribute("aria-hidden", "true");

      d.step1.appendChild(spacer);
    }

    let bar = document.getElementById("barraFixaMontagem");

    if (!bar) {
      bar = document.createElement("div");

      bar.id = "barraFixaMontagem";

      bar.className = "azury-barra-montagem";

      bar.hidden = true;

      bar.setAttribute("aria-label", "Resumo da montagem atual");

      bar.innerHTML = `
                <div
                    class="azury-barra-montagem-produto"
                >
                    <small>
                        Montagem atual
                    </small>

                    <strong
                        id="barraFixaMontagemProduto"
                    >
                        Açaí
                    </strong>
                </div>


                <div
                    class="azury-barra-montagem-sacola"
                    aria-label="Resumo da sacola"
                >

                    <span
                        aria-hidden="true"
                    >
                        \u{1F6CD}\uFE0F
                    </span>

                    <strong
                        id="barraFixaMontagemSacola"
                    >
                        Sacola: 0 itens • ${money(0)}
                    </strong>

                </div>


                <div
                    class="azury-barra-montagem-preco"
                >
                    <small>
                        Subtotal
                    </small>

                    <strong
                        id="barraFixaMontagemSubtotal"
                    >
                        ${money(0)}
                    </strong>
                </div>


                <button
                    type="button"
                    class="azury-barra-montagem-adicionar"
                    id="btnAdicionarSacolaFixo"
                >
                    Adicionar à sacola
                </button>
            `;

      document.body.appendChild(bar);
    }

    if (d.add) {
      d.add.classList.add("azury-adicionar-substituido");
    }

    d.stickyBar = bar;

    d.stickyProduct = bar.querySelector("#barraFixaMontagemProduto");

    d.stickySubtotal = bar.querySelector("#barraFixaMontagemSubtotal");

    d.stickyCart = bar.querySelector("#barraFixaMontagemSacola");

    d.stickyAdd = bar.querySelector("#btnAdicionarSacolaFixo");

    updateAssemblyStickyBar(state.subtotal);

    syncAssemblyStickyBarVisibility();
  }

  function syncAssemblyStickyBarVisibility(firstStep = null) {
    if (!d.stickyBar) {
      return;
    }

    const modalOpen = d.modal?.style.display === "flex";

    const builderOpen =
      firstStep === null
        ? Boolean(d.step1 && !d.step1.hidden)
        : Boolean(firstStep);

    d.stickyBar.hidden = !(modalOpen && builderOpen);
  }

  function updateAssemblyStickyBar(value = state.subtotal, status = null) {
    if (!d.stickyBar) {
      return;
    }

    const product = currentBuilderProduct();

    if (d.stickyProduct) {
      d.stickyProduct.textContent = productDisplayName(product);
    }

    if (d.stickySubtotal) {
      d.stickySubtotal.textContent = money(value);
    }

    if (d.stickyCart) {
      const units = cartUnits();
      const subtotal = cartSubtotal();
      d.stickyCart.textContent = `Sacola: ${units} ${
        units === 1 ? "item" : "itens"
      } • ${money(subtotal)}`;
    }

    const currentStatus = status || storeState();

    if (d.stickyAdd) {
      d.stickyAdd.disabled = !currentStatus.open;
      d.stickyAdd.textContent = currentStatus.open
        ? "Adicionar à sacola"
        : "Loja fechada";
    }
  }

  function renderComplements() {
    if (!d.middle) {
      return;
    }

    ensureComplementPickerStyles();
    ensureAssemblyStickyBar();

    const product = currentBuilderProduct();
    const boxMode = isBoxProduct(product);
    const middleGroup = d.middle.closest(".grupo-monte-seu");
    const topGroup = d.top?.closest(".grupo-monte-seu");

    if (topGroup && topGroup !== middleGroup) {
      topGroup.hidden = true;
    }

    if (d.top) {
      d.top.innerHTML = "";
    }

    if (middleGroup) {
      const title = middleGroup.querySelector("h3");

      if (title) {
        title.textContent = "Escolha seus complementos";
      }

      let help = middleGroup.querySelector(".azury-complementos-ajuda");

      if (!help) {
        help = document.createElement("p");
        help.className = "azury-complementos-ajuda";

        if (title) {
          title.insertAdjacentElement("afterend", help);
        } else {
          middleGroup.prepend(help);
        }
      }

      help.innerHTML = boxMode
        ? `Escolha <strong>qualquer complemento disponível</strong>. Todos ficam incluídos sem custo até o limite da sua Azury Box. <strong>Somente o que passar do limite entra como adicional.</strong>`
        : `Escolha o complemento <strong>uma vez</strong> e defina onde ele vai: meio, cobertura ou nos dois. <strong>“Nos dois” continua contando como 1 complemento.</strong>`;

      let freeCounter = middleGroup.querySelector(
        ".azury-complementos-progresso",
      );

      if (!freeCounter) {
        freeCounter = document.createElement("div");
        freeCounter.className = "azury-complementos-progresso";
        freeCounter.id = "contadorComplementosGratis";
        freeCounter.setAttribute("role", "status");
        freeCounter.setAttribute("aria-live", "polite");
        freeCounter.innerHTML = `
                    <div class="azury-complementos-progresso-cabecalho">
                        <strong class="azury-complementos-progresso-titulo">
                            Complementos grátis
                        </strong>
                        <span
                            class="azury-complementos-progresso-contagem"
                            id="contadorComplementosGratisTexto"
                        >
                            0 de 0
                        </span>
                    </div>
                    <div
                        class="azury-complementos-progresso-trilho"
                        id="barraComplementosGratis"
                        role="progressbar"
                        aria-label="Uso dos complementos incluídos"
                        aria-valuemin="0"
                        aria-valuemax="0"
                        aria-valuenow="0"
                    >
                        <span
                            class="azury-complementos-progresso-barra"
                            id="barraComplementosGratisPreenchimento"
                        ></span>
                    </div>
                    <small
                        class="azury-complementos-progresso-mensagem"
                        id="mensagemComplementosGratis"
                    >
                        Escolha seus complementos.
                    </small>
                `;
        help.insertAdjacentElement("afterend", freeCounter);
      }

      const counterTitle = freeCounter.querySelector(
        ".azury-complementos-progresso-titulo",
      );

      if (counterTitle) {
        counterTitle.textContent = boxMode
          ? "Complementos incluídos"
          : "Complementos grátis";
      }
    }

    d.middle.classList.add("azury-complementos-grid");

    const indexedComplements = state.complements.map((item, index) => ({
      item,
      index,
    }));

    const regularComplements = indexedComplements.filter(
      ({ item }) => !isAlwaysPaidComplement(item.nome),
    );
    const specialComplements = indexedComplements.filter(({ item }) =>
      isAlwaysPaidComplement(item.nome),
    );

    const renderComplementCard = ({ item, index }) => {
      const alwaysPaid = !boxMode && isAlwaysPaidComplement(item.nome);
      const priceText = boxMode
        ? `Incluído dentro do limite • Adicional ${money(item.preco)}`
        : alwaysPaid
          ? `Adicional pago • ${money(item.preco)}`
          : `Grátis dentro do limite • Extra ${money(item.preco)}`;
      const image = complementImagePath(item.nome);
      const groupName = `camada-complemento-${index}`;
      const layerControls = boxMode
        ? ""
        : `
                        <div
                            class="complemento-camadas"
                            aria-label="Posição de ${esc(item.nome)}"
                        >
                            <label>
                                <input
                                    type="radio"
                                    class="complemento-camada"
                                    name="${groupName}"
                                    value="meio"
                                    disabled
                                >
                                Meio
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    class="complemento-camada"
                                    name="${groupName}"
                                    value="cobertura"
                                    disabled
                                >
                                Cobertura
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    class="complemento-camada"
                                    name="${groupName}"
                                    value="ambos"
                                    checked
                                    disabled
                                >
                                Nos dois
                            </label>
                        </div>
                    `;

      return `
                    <div
                        class="complemento-card ${alwaysPaid ? "especial-pago" : ""}"
                        data-complement-card
                    >
                        <label
                            class="complemento-card-selecao"
                            for="complemento-${index}"
                        >
                            <span
                                class="complemento-card-imagem ${image ? "" : "sem-imagem"}"
                            >
                                ${
                                  image
                                    ? `
                                            <img
                                                src="${esc(image)}"
                                                alt="${esc(item.nome)}"
                                                loading="lazy"
                                            >
                                        `
                                    : ""
                                }
                            </span>
                            <span class="complemento-card-info">
                                <strong>${esc(item.nome)}</strong>
                                <small class="${alwaysPaid ? "especial" : ""}">
                                    ${esc(priceText)}
                                </small>
                            </span>
                            <input
                                type="checkbox"
                                class="complemento-monte-seu complemento-card-check"
                                value="${esc(item.nome)}"
                                data-id="${esc(item.id || "")}"
                                data-preco="${esc(item.preco)}"
                                data-especial-pago="${alwaysPaid ? "true" : "false"}"
                                id="complemento-${index}"
                            >
                        </label>
                        ${layerControls}
                    </div>
                `;
    };

    if (boxMode) {
      d.middle.innerHTML = `
                <div
                    class="azury-complementos-secao"
                    aria-label="Complementos disponíveis para Azury Box"
                >
                    <div class="azury-complementos-secao-texto">
                        <strong>Todos os complementos disponíveis</strong>
                        <small>
                            Qualquer complemento pode ser escolhido sem custo dentro do limite da Box. Acima do limite, o valor individual é cobrado.
                        </small>
                    </div>
                    <span class="azury-complementos-secao-badge">
                        Todos liberados
                    </span>
                </div>
                ${indexedComplements.map(renderComplementCard).join("")}
            `;
    } else {
      const regularSection = regularComplements.length
        ? `
                    <div
                        class="azury-complementos-secao"
                        aria-label="Complementos grátis e extras"
                    >
                        <div class="azury-complementos-secao-texto">
                            <strong>Complementos grátis / extras</strong>
                            <small>
                                Entram no limite grátis do seu açaí. Depois do limite, o valor extra é cobrado.
                            </small>
                        </div>
                        <span class="azury-complementos-secao-badge">
                            Limite do produto
                        </span>
                    </div>
                    ${regularComplements.map(renderComplementCard).join("")}
                `
        : "";

      const specialSection = specialComplements.length
        ? `
                    <div
                        class="azury-complementos-secao especiais"
                        aria-label="Complementos especiais pagos"
                    >
                        <div class="azury-complementos-secao-texto">
                            <strong>Especiais pagos</strong>
                            <small>
                                São cobrados à parte e não ocupam nenhuma vaga dos complementos grátis.
                            </small>
                        </div>
                        <span class="azury-complementos-secao-badge">
                            Pagos
                        </span>
                    </div>
                    ${specialComplements.map(renderComplementCard).join("")}
                `
        : "";

      d.middle.innerHTML = regularSection + specialSection;
    }

    d.middle
      .querySelectorAll(".complemento-card-imagem img")
      .forEach((image) => {
        image.addEventListener(
          "error",
          () => {
            image
              .closest(".complemento-card-imagem")
              ?.classList.add("sem-imagem");
            image.remove();
          },
          { once: true },
        );
      });

    allComplements().forEach((input) => {
      input.addEventListener("change", () => {
        const card = input.closest(".complemento-card");
        const layerInputs = card
          ? Array.from(card.querySelectorAll(".complemento-camada"))
          : [];

        if (input.checked) {
          complementSelectionCounter += 1;
          input.dataset.ordemSelecao = String(complementSelectionCounter);

          layerInputs.forEach((layerInput) => {
            layerInput.disabled = false;
          });

          if (!layerInputs.some((layerInput) => layerInput.checked)) {
            const both = layerInputs.find(
              (layerInput) => layerInput.value === "ambos",
            );

            if (both) {
              both.checked = true;
            }
          }
        } else {
          delete input.dataset.ordemSelecao;

          layerInputs.forEach((layerInput) => {
            layerInput.disabled = true;
          });
        }

        card?.classList.toggle("selecionado", input.checked);
        calculate();
      });
    });

    d.middle.querySelectorAll(".complemento-camada").forEach((input) => {
      input.addEventListener("change", () => {
        calculate();
      });
    });

    updateFreeComplementCounter([]);
  }

  function nowLocal() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: state.config?.fuso_horario || "America/Sao_Paulo",

      year: "numeric",

      month: "2-digit",

      day: "2-digit",

      hour: "2-digit",

      minute: "2-digit",

      hourCycle: "h23",
    }).formatToParts(new Date());

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );

    return {
      day: new Date(
        Date.UTC(values.year, values.month - 1, values.day),
      ).getUTCDay(),

      minutes: values.hour * 60 + values.minute,
    };
  }

  function schedule(day) {
    return state.schedules.find(
      (item) => Number(item.dia_semana) === Number(day),
    );
  }

  function storeState() {
    if (!state.operationReady) {
      return {
        open: false,

        title: "CARREGANDO CARDÁPIO",

        text: "Aguarde alguns segundos.",

        alert: "O cardápio ainda está carregando.",
      };
    }

    if (state.config.pedidos_ativos !== true) {
      const text =
        state.config.mensagem_pausa ||
        "Os pedidos estão temporariamente pausados.";

      return {
        open: false,

        title: "PEDIDOS PAUSADOS",

        text,

        alert: text,
      };
    }

    const now = nowLocal();

    const today = schedule(now.day);

    let open = false;

    if (today?.ativo) {
      const start = timeMinutes(today.abre_as);

      const end = timeMinutes(today.fecha_as);

      if (start !== null && end !== null) {
        open =
          end > start
            ? now.minutes >= start && now.minutes < end
            : now.minutes >= start;
      }
    }

    if (!open) {
      const previous = schedule((now.day + 6) % 7);

      if (previous?.ativo) {
        const start = timeMinutes(previous.abre_as);

        const end = timeMinutes(previous.fecha_as);

        if (
          start !== null &&
          end !== null &&
          end < start &&
          now.minutes < end
        ) {
          open = true;
        }
      }
    }

    if (open) {
      return {
        open: true,

        title: "ABERTO AGORA",

        text: `Faça seu pedido — atendimento até ${
          timeLabel(today?.fecha_as) || "00:00"
        }.`,

        alert: "",
      };
    }

    const names = [
      "domingo",
      "segunda-feira",
      "terça-feira",
      "quarta-feira",
      "quinta-feira",
      "sexta-feira",
      "sábado",
    ];

    for (let offset = 0; offset < 8; offset += 1) {
      const day = (now.day + offset) % 7;

      const item = schedule(day);

      const start = timeMinutes(item?.abre_as);

      if (
        !item?.ativo ||
        start === null ||
        (offset === 0 && now.minutes >= start)
      ) {
        continue;
      }

      const when = offset === 0 ? "hoje" : offset === 1 ? "amanhã" : names[day];

      const text = `Abrimos ${when} às ${timeLabel(item.abre_as)}.`;

      return {
        open: false,

        title: "FECHADO NO MOMENTO",

        text,

        alert: `A Azury está fechada no momento. ${text}`,
      };
    }

    return {
      open: false,

      title: "FECHADO NO MOMENTO",

      text: "Consulte novamente em breve.",

      alert: "A Azury está fechada no momento.",
    };
  }

  function syncOrderButtons(status) {
    const hasItems = state.cart.length > 0;

    if (d.add) {
      d.add.disabled = !status.open;

      d.add.textContent = status.open ? "Adicionar à sacola" : "Loja fechada";
    }

    if (d.next) {
      d.next.disabled = !status.open || !hasItems;

      d.next.textContent = !status.open
        ? "Loja fechada"
        : hasItems
          ? "Continuar para entrega"
          : "Adicione um item à sacola";
    }

    if (d.send && !state.sending) {
      d.send.disabled = !status.open || !hasItems;

      d.send.textContent = !status.open
        ? "Loja fechada"
        : hasItems
          ? "Finalizar pedido"
          : "Sacola vazia";
    }

    updateAssemblyStickyBar(state.subtotal, status);
  }

  function updateStore() {
    const status = storeState();

    d.store?.classList.toggle("aberta", status.open);
    d.store?.classList.toggle("fechada", !status.open);

    if (d.storeTitle) {
      d.storeTitle.textContent = status.title;
    }

    if (d.storeMsg) {
      d.storeMsg.textContent = status.text;
    }

    $$(".btn-montar").forEach((button) => {
      const available = button.dataset.disponibilidade !== "em-breve";
      const openText =
        button.dataset.textoAberto ||
        (button.dataset.produtoTipo === "azury_box"
          ? "Montar minha Box"
          : "Montar meu açaí");

      button.disabled = !available || !status.open;
      button.classList.toggle("btn-loja-fechada", available && !status.open);
      button.textContent = !available
        ? "Disponível em breve"
        : status.open
          ? openText
          : "Loja fechada";
    });

    syncOrderButtons(status);
    return status;
  }

  function requireOpen() {
    const status = updateStore();

    if (status.open) {
      return true;
    }

    alert(status.alert);

    return false;
  }

  function updateWhatsapp() {
    const number = String(state.config?.whatsapp || "5511960220402").replace(
      /\D/g,
      "",
    );

    $$(".js-pedido-horario").forEach((link) => {
      link.href = `https://wa.me/${number}`;
    });
  }

  function updateBuilderCopy(product) {
    const boxMode = isBoxProduct(product);
    const title = document.getElementById("tituloMontagemProduto");
    const intro = document.getElementById("descricaoMontagemProduto");
    const sizeTitle = document.getElementById("tituloEscolhaTamanho");
    const structureTitle = document.getElementById("tituloEstruturaProduto");
    const structureText = document.getElementById("textoEstruturaProduto");
    const structureDetail = document.getElementById("detalheEstruturaProduto");
    const subtotalLabel = document.getElementById("rotuloSubtotalProduto");

    if (title) {
      title.textContent = boxMode ? "📦 Monte sua Azury Box" : "🥤 Monte o Seu Açaí";
    }

    if (intro) {
      intro.textContent = boxMode
        ? "Escolha o tamanho da Box, selecione seus complementos e adicione à sacola."
        : "Monte cada copo, adicione à sacola e finalize tudo em um único pedido.";
    }

    if (sizeTitle) {
      sizeTitle.textContent = boxMode
        ? "Escolha o tamanho da Azury Box"
        : "Escolha o tamanho do copo";
    }

    if (structureTitle) {
      structureTitle.textContent = boxMode
        ? "Como funciona a Azury Box"
        : "Montagem do copo";
    }

    if (structureText) {
      structureText.textContent = boxMode
        ? "Escolha qualquer complemento disponível para montar sua Azury Box do seu jeito."
        : "Metade do açaí no fundo, complementos no meio, a outra metade do açaí por cima e complementos na cobertura.";
    }

    if (structureDetail) {
      structureDetail.textContent = boxMode
        ? `Todos os complementos ficam incluídos sem custo até o limite de ${freeComplementLimit(product)} da Box escolhida. Somente o que ultrapassar esse limite é cobrado como adicional.`
        : "Cada tamanho inclui uma quantidade de complementos grátis. Ingredientes especiais e extras acima do limite são cobrados à parte.";
    }

    if (subtotalLabel) {
      subtotalLabel.textContent = boxMode
        ? "Subtotal desta Box"
        : "Subtotal deste copo";
    }
  }

  function selectSize(size, base) {
    const item = state.sizes.find(
      (row) =>
        Number(row.tamanho_ml) === Number(size) &&
        row.disponivel === true &&
        row.visivel === true,
    );

    if (!item) {
      return;
    }

    const previousBoxMode = isBoxProduct(state.currentProduct);
    state.currentProduct = {
      ...item,
      produto_tipo: "acai_copo",
      produto_chave: null,
    };

    if (previousBoxMode) {
      renderBuilderProductOptions("acai_copo");
      renderComplements();
    }

    if (d.size) {
      d.size.value = String(item.tamanho_ml);
    }

    if (d.base) {
      d.base.value = String(item.preco_base ?? base);
    }

    $$("input[name='tamanhoMonteSeuOpcao']").forEach((input) => {
      input.checked =
        input.dataset.produtoTipo !== "azury_box" &&
        Number(input.value) === Number(item.tamanho_ml);
    });

    updateBuilderCopy(item);
    calculate();
  }

  function selectBox(key) {
    const box = boxByKey(key);

    if (!box || !productIsAvailable(box)) {
      return;
    }

    const previousBoxMode = isBoxProduct(state.currentProduct);
    state.currentProduct = {
      ...box,
      produto_tipo: "azury_box",
      produto_chave: productKey(box),
    };

    if (!previousBoxMode) {
      renderBuilderProductOptions("azury_box");
      renderComplements();
    }

    if (d.size) {
      d.size.value = productKey(box);
    }

    if (d.base) {
      d.base.value = String(box.preco_base);
    }

    $$("input[name='tamanhoMonteSeuOpcao']").forEach((input) => {
      input.checked =
        input.dataset.produtoTipo === "azury_box" &&
        resolveBoxKey(input.dataset.produtoChave || input.value) ===
          productKey(box);
    });

    updateBuilderCopy(box);
    calculate();
  }

  function allComplements() {
    return $$(".complemento-monte-seu");
  }

  function currentComplementSelections() {
    const boxMode = isBoxProduct(currentBuilderProduct());

    return allComplements()
      .filter((input) => input.checked)
      .map((input, index) => {
        const card = input.closest(".complemento-card");
        const layerInput = card?.querySelector(".complemento-camada:checked");

        return {
          id: input.dataset.id || null,
          nome: input.value,
          camada: boxMode ? "unica" : layerInput?.value || "ambos",
          preco: num(input.dataset.preco, 0),
          ordem_selecao: Math.max(
            1,
            Math.floor(num(input.dataset.ordemSelecao, index + 1)),
          ),
        };
      });
  }

  function selected(layer) {
    return currentComplementSelections().filter(
      (complement) =>
        complement.camada === layer || complement.camada === "ambos",
    );
  }

  function updateFreeComplementCounter(
    complements = currentComplementSelections(),
  ) {
    const counter = document.getElementById("contadorComplementosGratis");
    const countText = document.getElementById("contadorComplementosGratisTexto");
    const progressTrack = document.getElementById("barraComplementosGratis");
    const progressFill = document.getElementById(
      "barraComplementosGratisPreenchimento",
    );
    const messageText = document.getElementById("mensagemComplementosGratis");
    const titleText = counter?.querySelector(
      ".azury-complementos-progresso-titulo",
    );

    if (
      !counter ||
      !countText ||
      !progressTrack ||
      !progressFill ||
      !messageText
    ) {
      return;
    }

    const product = currentBuilderProduct();
    const boxMode = isBoxProduct(product);
    const limit = freeComplementLimit(product);

    if (limit <= 0) {
      counter.hidden = true;
      return;
    }

    counter.hidden = false;

    if (titleText) {
      titleText.textContent = boxMode
        ? "Complementos incluídos"
        : "Complementos grátis";
    }

    const eligibleKeys = new Set(
      (complements || [])
        .filter(
          (complement) => boxMode || !isAlwaysPaidComplement(complement.nome),
        )
        .map((complement) => norm(complement.nome))
        .filter(Boolean),
    );

    const selectedCount = eligibleKeys.size;
    const usedFree = Math.min(selectedCount, limit);
    const extras = Math.max(selectedCount - limit, 0);
    const percentage = Math.min((usedFree / limit) * 100, 100);

    progressFill.style.width = `${percentage}%`;
    progressTrack.setAttribute("aria-valuemax", String(limit));
    progressTrack.setAttribute("aria-valuenow", String(usedFree));
    countText.textContent = `${usedFree} de ${limit}`;
    counter.classList.toggle(
      "limite-atingido",
      usedFree >= limit && extras === 0,
    );
    counter.classList.toggle("com-extras", extras > 0);

    if (extras > 0) {
      messageText.textContent = boxMode
        ? `${usedFree} de ${limit} incluídos • ${extras} ${
            extras === 1 ? "adicional será cobrado" : "adicionais serão cobrados"
          }.`
        : `${usedFree} de ${limit} grátis • ${extras} ${
            extras === 1 ? "extra será cobrado" : "extras serão cobrados"
          }.`;
      return;
    }

    if (usedFree >= limit) {
      messageText.textContent = boxMode
        ? "Limite incluído atingido. Novas escolhas entram como adicional."
        : "Limite grátis atingido.";
      return;
    }

    const remaining = limit - usedFree;

    if (boxMode) {
      messageText.textContent =
        remaining === 1
          ? "Você ainda pode escolher 1 complemento sem custo."
          : `Você ainda pode escolher ${remaining} complementos sem custo.`;
      return;
    }

    messageText.textContent =
      remaining === 1
        ? "Você ainda pode escolher 1 complemento grátis."
        : `Você ainda pode escolher ${remaining} complementos grátis.`;
  }

  function calculate() {
    const product = currentBuilderProduct();
    const base = product ? productBasePrice(product) : num(d.base?.value, 0);
    const complements = currentComplementSelections();

    updateFreeComplementCounter(complements);

    const value = product
      ? itemUnitPrice(product, base, complements)
      : num(base, 0);

    state.subtotal = value;

    if (d.subtotal) {
      d.subtotal.textContent = money(value);
    }

    updateAssemblyStickyBar(value);
    return value;
  }

  function updateTotal() {
    const subtotal = cartSubtotal();

    const fee = subtotal > 0 ? num(d.fee?.value, 0) : 0;

    const total = subtotal + fee;

    if (d.total) {
      d.total.textContent = money(total);
    }

    return total;
  }

  function showStep(step) {
    const first = step === 1;

    if (d.step1) {
      d.step1.hidden = !first;

      d.step1.classList.toggle("ativo", first);
    }

    if (d.step2) {
      d.step2.hidden = first;

      d.step2.classList.toggle("ativo", !first);
    }

    d.indicators.forEach((item) => {
      const value = Number(item.dataset.indicadorEtapa);

      item.classList.toggle("ativa", value === step);

      item.classList.toggle("concluida", value < step);
    });

    if (d.content) {
      d.content.scrollTop = 0;
    }

    syncAssemblyStickyBarVisibility(first);
  }

  function openModal() {
    if (!d.modal) {
      return;
    }

    d.modal.style.display = "flex";

    document.body.style.overflow = "hidden";

    syncAssemblyStickyBarVisibility();
  }

  function closeModal() {
    if (!d.modal) {
      return;
    }

    d.modal.style.display = "none";

    document.body.style.overflow = "";

    syncAssemblyStickyBarVisibility(false);
  }

  function resetAddress(
    text = "Informe um CEP válido para calcular a entrega.",
    type = "",
  ) {
    state.zipRequest += 1;

    state.consultingZip = false;

    if (d.addressOk) {
      d.addressOk.value = "false";
    }

    if (d.fee) {
      d.fee.value = "0";
    }

    if (d.districtId) {
      d.districtId.value = "";
    }

    if (d.street) {
      d.street.value = "";
    }

    if (d.district) {
      d.district.value = "";
    }

    if (d.feeText) {
      d.feeText.textContent = "A calcular";
    }

    message(text, type);

    updateTotal();
  }

  function findDistrict(name) {
    const key = norm(name);

    if (!key) {
      return null;
    }

    if (state.districtMap.has(key)) {
      return state.districtMap.get(key);
    }

    const alias = state.aliases.find(
      (item) => key.includes(item) || item.includes(key),
    );

    return alias ? state.districtMap.get(alias) : null;
  }

  async function consultZip(zip) {
    const requestId = ++state.zipRequest;

    state.consultingZip = true;

    message("Consultando o CEP...", "carregando");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);

      if (!response.ok) {
        throw new Error("Falha ao consultar CEP.");
      }

      const data = await response.json();

      if (requestId !== state.zipRequest) {
        return;
      }

      if (data.erro || !data.bairro || !data.logradouro) {
        resetAddress("CEP inexistente ou sem endereço completo.", "erro");

        return;
      }

      const district = findDistrict(data.bairro);

      if (!district) {
        resetAddress(`Ainda não entregamos no bairro ${data.bairro}.`, "erro");

        return;
      }

      if (d.street) {
        d.street.value = data.logradouro;
      }

      if (d.district) {
        d.district.value = district.nome;
      }

      if (d.districtId) {
        d.districtId.value = String(district.id);
      }

      if (d.addressOk) {
        d.addressOk.value = "true";
      }

      if (d.fee) {
        d.fee.value = String(district.taxa);
      }

      if (d.feeText) {
        d.feeText.textContent = money(district.taxa);
      }

      message(
        `Endereço validado. Entrega para ${district.nome}: ${money(district.taxa)}.`,
        "sucesso",
      );

      updateTotal();
    } catch (error) {
      if (requestId === state.zipRequest) {
        resetAddress(
          "Não foi possível validar o CEP agora. Tente novamente.",
          "erro",
        );
      }
    } finally {
      if (requestId === state.zipRequest) {
        state.consultingZip = false;
      }
    }
  }

  function setupZip() {
    d.zip?.addEventListener("input", () => {
      const digits = d.zip.value.replace(/\D/g, "").slice(0, 8);

      d.zip.value =
        digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;

      resetAddress();

      if (digits.length === 8) {
        consultZip(digits);
      }
    });
  }

  async function fillCustomer() {
    try {
      const { data } = await sb.auth.getSession();

      const user = data.session?.user;

      if (!user) {
        return;
      }

      let profile = {};

      const result = await sb
        .from("perfis")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!result.error) {
        profile = result.data || {};
      }

      if (d.name && !d.name.value.trim()) {
        d.name.value =
          profile.nome ||
          profile.nome_completo ||
          user.user_metadata?.nome ||
          user.email?.split("@")[0] ||
          "";
      }

      if (d.phone && !d.phone.value.trim()) {
        d.phone.value = profile.telefone || "";
      }
    } catch (_) {}
  }

  function resetBuilder() {
    complementSelectionCounter = 0;

    allComplements().forEach((input) => {
      input.checked = false;

      delete input.dataset.ordemSelecao;

      const card = input.closest(".complemento-card");

      card?.classList.remove("selecionado");

      const layerInputs = card
        ? Array.from(card.querySelectorAll(".complemento-camada"))
        : [];

      layerInputs.forEach((layerInput) => {
        layerInput.disabled = true;

        layerInput.checked = layerInput.value === "ambos";
      });
    });

    calculate();
  }

  function resetOrder() {
    resetBuilder();

    $$("input[name='formaPagamentoMonteSeu']").forEach((item) => {
      item.checked = false;
    });

    if (d.zip) {
      d.zip.value = "";
    }

    if (d.number) {
      d.number.value = "";
    }

    if (d.addressExtra) {
      d.addressExtra.value = "";
    }

    if (d.change) {
      d.change.value = "";
    }

    resetAddress();
  }

  function payment() {
    const value =
      $("input[name='formaPagamentoMonteSeu']:checked")?.value || "";

    return (
      {
        "Cartão de crédito": "cartao_credito",

        "Cartão de débito": "cartao_debito",

        Pix: "pix",

        Dinheiro: "dinheiro",
      }[value] || value
    );
  }

  function paymentLabel(value) {
    return (
      {
        cartao_credito: "Cartão de crédito",

        cartao_debito: "Cartão de débito",

        pix: "Pix",

        dinheiro: "Dinheiro",
      }[value] || value
    );
  }

  function addressValid() {
    return (
      d.addressOk?.value === "true" &&
      d.districtId?.value &&
      d.name?.value.trim() &&
      d.zip?.value.replace(/\D/g, "").length === 8 &&
      d.street?.value.trim() &&
      d.number?.value.trim()
    );
  }

  async function createOrder() {
    if (state.sending || !requireOpen()) {
      return;
    }

    if (!state.cart.length) {
      alert("Adicione pelo menos um item à sacola.");

      showStep(1);

      return;
    }

    if (state.consultingZip) {
      alert("Aguarde a validação do CEP.");

      return;
    }

    if (!addressValid()) {
      showOrderWarning("Informe um endereço válido de um bairro atendido.");

      return;
    }

    const pay = payment();

    if (!pay) {
      alert("Escolha a forma de pagamento.");

      return;
    }

    const { data: sessionData } = await sb.auth.getSession();

    if (!sessionData.session) {
      saveCart();

      sessionStorage.setItem("azuryRetornoLogin", "index.html#Cardapio");

      alert(
        "Entre na sua conta Azury para registrar o pedido. Sua sacola ficará salva.",
      );

      window.location.href = "login.html";

      return;
    }

    state.sending = true;

    d.send.disabled = true;

    d.send.textContent = "Registrando pedido...";

    const whatsappWindow = window.open("about:blank", "_blank");

    const payload = {
      cliente: {
        nome: d.name.value.trim(),

        telefone: d.phone?.value.trim() || null,
      },

      entrega: {
        bairro_entrega_id: Number(d.districtId.value),

        cep: d.zip.value.trim(),

        rua: d.street.value.trim(),

        numero: d.number.value.trim(),

        complemento: d.addressExtra?.value.trim() || null,
      },

      pagamento: {
        forma: pay,

        troco_para:
          pay === "dinheiro" && d.change?.value
            ? Number(String(d.change.value).replace(",", "."))
            : null,
      },

      itens: state.cart.map((item) => ({
        produto_tipo: isBoxProduct(item) ? "azury_box" : "acai_copo",
        produto_chave: isBoxProduct(item) ? productKey(item) : null,
        tamanho_ml: isBoxProduct(item) ? null : Number(item.tamanho_ml),
        tamanho_label: isBoxProduct(item) ? item.tamanho_label || null : null,
        quantidade: Number(item.quantidade),
        complementos: (item.complementos || []).map((complement) => ({
          nome: complement.nome,
          camada: isBoxProduct(item) ? "unica" : complement.camada,
        })),
      })),

      observacoes: null,
    };

    try {
      const { data, error } = await sb.rpc("criar_pedido_completo", {
        p_dados: payload,
      });

      if (error) {
        throw error;
      }

      const code = data?.codigo || "";

      const productValue = num(data?.valor_produtos, cartSubtotal());

      const fee = num(data?.taxa_entrega, d.fee.value);

      const total = num(data?.valor_total, productValue + fee);

      const list = (items) =>
        items.length
          ? items.map((item) => `• ${item.nome}`).join("\n")
          : "• Nenhum complemento";

      const itemsText = state.cart
        .map((item, index) => {
          const boxMode = isBoxProduct(item);
          const all = item.complementos || [];
          const middle = all.filter(
            (complement) =>
              complement.camada === "meio" || complement.camada === "ambos",
          );
          const top = all.filter(
            (complement) =>
              complement.camada === "cobertura" ||
              complement.camada === "ambos",
          );

          const complementText = boxMode
            ? `*Complementos escolhidos:*\n${list(all)}`
            : `*Complementos no meio:*\n${list(middle)}\n\n` +
              `*Complementos na cobertura:*\n${list(top)}`;

          return (
            `*${index + 1}. ${item.quantidade}× ${productDisplayName(item)}*\n` +
            `Subtotal do item: ${money(
              item.preco_unitario * item.quantidade,
            )}\n\n` +
            complementText
          );
        })
        .join("\n\n————————————\n\n");

      const text =
        `Olá! Quero confirmar este pedido na AZURY:\n\n` +
        `AZURY_EMOJI_RECIBO *Pedido:* ${code}\n` +
        `AZURY_EMOJI_CLIENTE *Cliente:* ${d.name.value.trim()}\n\n` +
        `AZURY_EMOJI_LOCAL *Endereço de entrega:*\n` +
        `${d.street.value.trim()}, nº ${d.number.value.trim()}\n` +
        `Bairro: ${d.district.value.trim()}\n` +
        `CEP: ${d.zip.value.trim()}\n` +
        `Complemento: ${d.addressExtra?.value.trim() || "Não informado"}\n\n` +
        `AZURY_EMOJI_PAGAMENTO *Forma de pagamento:*\n` +
        `${paymentLabel(pay)}\n\n` +
        `AZURY_EMOJI_COPO *Itens da sacola:*\n\n` +
        `${itemsText}\n\n` +
        `AZURY_EMOJI_RECIBO *Resumo:*\n` +
        `Produtos: ${money(productValue)}\n` +
        `Entrega: ${money(fee)}\n` +
        `AZURY_EMOJI_DINHEIRO *Total: ${money(total)}*`;

      const number = String(state.config.whatsapp || "5511960220402").replace(
        /\D/g,
        "",
      );

      const whatsappEmojiUtf8 = {
        AZURY_EMOJI_RECIBO: "%F0%9F%A7%BE",

        AZURY_EMOJI_CLIENTE: "%F0%9F%91%A4",

        AZURY_EMOJI_LOCAL: "%F0%9F%93%8D",

        AZURY_EMOJI_PAGAMENTO: "%F0%9F%92%B3",

        AZURY_EMOJI_COPO: "%F0%9F%A5%A4",

        AZURY_EMOJI_DINHEIRO: "%F0%9F%92%B0",
      };

      let encodedWhatsappText = encodeURIComponent(text);

      Object.entries(whatsappEmojiUtf8).forEach(([token, encodedEmoji]) => {
        encodedWhatsappText = encodedWhatsappText
          .split(token)
          .join(encodedEmoji);
      });

      const url = `https://web.whatsapp.com/send?phone=${number}&text=${encodedWhatsappText}`;

      saveLastOrderSnapshot({
        codigo: code,

        pedido_id: data?.pedido_id ?? data?.id ?? null,

        criado_em:
          data?.criado_em ?? data?.created_at ?? new Date().toISOString(),

        valor_produtos: productValue,

        taxa_entrega: fee,

        valor_total: total,

        pontos_gerados: num(data?.pontos_gerados, 0),

        cliente: {
          ...payload.cliente,
        },

        entrega: {
          ...payload.entrega,

          bairro: d.district.value.trim(),
        },

        pagamento: {
          ...payload.pagamento,

          forma_label: paymentLabel(pay),
        },

        itens: state.cart.map((item) => ({
          produto_tipo: isBoxProduct(item) ? "azury_box" : "acai_copo",
          produto_chave: isBoxProduct(item) ? productKey(item) : null,
          tamanho_ml: isBoxProduct(item) ? null : Number(item.tamanho_ml),
          tamanho_label: isBoxProduct(item) ? item.tamanho_label || null : null,
          produto: productDisplayName(item),
          quantidade: Number(item.quantidade),
          preco_unitario: num(item.preco_unitario),
          complementos: (item.complementos || []).map((complement) => ({
            nome: complement.nome,
            camada: isBoxProduct(item) ? "unica" : complement.camada,
          })),
        })),
      });

      closeModal();

      showOrderSuccess(code);

      clearCart();

      resetOrder();

      if (whatsappWindow) {
        whatsappWindow.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      whatsappWindow?.close();

      console.error("Erro ao registrar pedido:", error);

      alert(error.message || "Não foi possível registrar o pedido.");
    } finally {
      state.sending = false;

      updateStore();
    }
  }

  function bind() {
    $$(".btn-montar").forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.dataset.disponibilidade === "em-breve" || !requireOpen()) {
          return;
        }

        resetBuilder();

        if (button.dataset.produtoTipo === "azury_box") {
          const selectedBox =
            boxByKey(button.dataset.produtoChave) ||
            state.boxes.find(productIsAvailable);

          if (!selectedBox) {
            alert("A Azury Box está indisponível no momento.");
            return;
          }

          selectBox(productKey(selectedBox));
        } else {
          selectSize(button.dataset.tamanho, button.dataset.precoBase);
        }

        await fillCustomer();
        renderCart();
        showStep(1);
        openModal();
      });
    });

    d.add?.addEventListener("click", addCurrentToCart);

    d.stickyAdd?.addEventListener("click", addCurrentToCart);

    d.cartList?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-cart-action]");

      if (!button) {
        return;
      }

      const id = button.dataset.id || "";

      const action = button.dataset.cartAction;

      if (action === "increase") {
        changeCartItem(id, 1);
      } else if (action === "decrease") {
        changeCartItem(id, -1);
      } else if (action === "remove") {
        removeCartItem(id);
      }
    });

    d.next?.addEventListener("click", () => {
      if (!requireOpen()) {
        return;
      }

      if (!state.cart.length) {
        alert("Adicione pelo menos um item à sacola.");

        return;
      }

      renderCart();

      showStep(2);
    });

    d.back?.addEventListener("click", () => showStep(1));

    d.close?.addEventListener("click", closeModal);

    d.modal?.addEventListener("click", (event) => {
      if (event.target === d.modal) {
        closeModal();
      }
    });

    d.send?.addEventListener("click", createOrder);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }

  function ensureDistrictField() {
    if (d.districtId || !d.addressOk) {
      return;
    }

    const hidden = document.createElement("input");

    hidden.type = "hidden";

    hidden.id = "bairroEntregaId";

    hidden.value = "";

    d.addressOk.insertAdjacentElement("afterend", hidden);

    d.districtId = hidden;
  }

  function selectFirstAvailableSize() {
    const firstAvailable = state.sizes.find(
      (item) => item.disponivel === true && item.visivel === true,
    );

    if (firstAvailable) {
      selectSize(
        firstAvailable.tamanho_ml,

        firstAvailable.preco_base,
      );
    }
  }

  async function openRepeatedOrderIfNeeded() {
    let repeatedOrder = null;

    try {
      const stored = sessionStorage.getItem("azuryPedidoRepetido");
      repeatedOrder = stored ? JSON.parse(stored) : null;
    } catch (_) {
      repeatedOrder = null;
    }

    if (!repeatedOrder) {
      return;
    }

    try {
      sessionStorage.removeItem("azuryPedidoRepetido");
    } catch (_) {}

    const boxMode = isBoxProduct(repeatedOrder);
    const product = boxMode
      ? boxByKey(
          repeatedOrder.produto_chave ||
            repeatedOrder.tamanho_label ||
            repeatedOrder.produto,
        )
      : state.sizes.find(
          (item) =>
            Number(item.tamanho_ml) === Number(repeatedOrder.tamanho_ml) &&
            productIsAvailable(item),
        );

    if (!product || !productIsAvailable(product)) {
      alert("Este produto não está disponível no cardápio atual.");
      return;
    }

    state.cart = [];

    try {
      sessionStorage.removeItem(CART_KEY);
    } catch (_) {}

    renderCart();
    resetBuilder();

    if (boxMode) {
      selectBox(productKey(product));
    } else {
      selectSize(product.tamanho_ml, product.preco_base);
    }

    await fillCustomer();
    renderCart();
    showStep(1);
    openModal();

    if (d.cartFeedback) {
      const feedback =
        "Produto do pedido anterior selecionado. Escolha seus complementos novamente.";
      d.cartFeedback.textContent = feedback;

      window.setTimeout(() => {
        if (d.cartFeedback && d.cartFeedback.textContent === feedback) {
          d.cartFeedback.textContent = "";
        }
      }, 5000);
    }
  }

  function initializeInterface() {
    if (state.interfaceReady) {
      renderSizes();

      renderComplements();

      updateWhatsapp();

      renderCart();

      updateStore();

      selectFirstAvailableSize();

      return;
    }

    state.interfaceReady = true;

    renderSizes();

    renderComplements();

    loadCart();

    updateWhatsapp();

    setupZip();

    bind();

    selectFirstAvailableSize();

    renderCart();

    showStep(1);

    updateStore();

    void openRepeatedOrderIfNeeded();

    window.setInterval(updateStore, 30000);
  }

  function showOperationUnavailable() {
    state.operationReady = false;

    if (d.storeTitle) {
      d.storeTitle.textContent = "CARDÁPIO TEMPORARIAMENTE INDISPONÍVEL";
    }

    if (d.storeMsg) {
      d.storeMsg.textContent =
        "Estamos tentando restabelecer o cardápio automaticamente.";
    }

    d.store?.classList.remove("aberta");

    d.store?.classList.add("fechada");

    $$(".btn-montar").forEach((button) => {
      button.disabled = true;

      button.textContent = "Carregando cardápio...";
    });

    if (d.add) {
      d.add.disabled = true;
    }

    if (d.stickyAdd) {
      d.stickyAdd.disabled = true;

      d.stickyAdd.textContent = "Carregando cardápio...";
    }

    if (d.next) {
      d.next.disabled = true;
    }

    if (d.send) {
      d.send.disabled = true;
    }
  }

  function stopOperationRecovery() {
    if (!state.recoveryTimer) {
      return;
    }

    window.clearInterval(state.recoveryTimer);

    state.recoveryTimer = null;
  }

  async function recoverOperation() {
    if (state.refreshingOperation) {
      return;
    }

    state.refreshingOperation = true;

    try {
      await loadOperation();

      initializeInterface();

      stopOperationRecovery();

      console.info("Conexão com o cardápio restabelecida.");
    } catch (error) {
      console.warn("O cardápio continua aguardando reconexão.", error);
    } finally {
      state.refreshingOperation = false;
    }
  }

  function startOperationRecovery() {
    if (state.recoveryTimer) {
      return;
    }

    state.recoveryTimer = window.setInterval(
      recoverOperation,
      OPERATION_RECOVERY_INTERVAL,
    );
  }

  ensureDistrictField();

  try {
    await loadOperation();

    initializeInterface();
  } catch (error) {
    console.error("Falha inicial ao carregar a operação Azury:", error);

    const cacheLoaded = applyCachedOperation();

    if (cacheLoaded) {
      initializeInterface();
    } else {
      showOperationUnavailable();
    }

    startOperationRecovery();
  }
});