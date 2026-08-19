const fs = require("fs");

const file = "admin/js/admin-dev.js";

const backup =
  "admin/js/admin-dev.backup-before-whatsapp-confirmacao-20260819.js";

if (!fs.existsSync(file)) {
  throw new Error(`Arquivo não encontrado: ${file}`);
}

const raw = fs.readFileSync(file, "utf8");

const eol =
  raw.includes("\r\n")
    ? "\r\n"
    : "\n";

let text =
  raw.replace(/\r\n/g, "\n");


/* =========================================================
   SEGURANÇA
========================================================= */

if (
  !text.includes(
    "normalizarConfiguracaoPhAtualizacao20260819"
  )
) {
  throw new Error(
    "Parei por segurança: este admin-dev.js não contém a última atualização da PH."
  );
}

if (
  !text.includes(
    "Informe se o cliente deseja salada"
  )
) {
  throw new Error(
    "Parei por segurança: a regra nova de salada da PH não foi encontrada."
  );
}

if (
  text.includes(
    "data-manual-register-confirmation"
  )
) {
  throw new Error(
    "A confirmação profissional pelo WhatsApp já parece estar instalada."
  );
}

fs.copyFileSync(
  file,
  backup
);


function replaceOnce(
  search,
  replacement,
  label
) {
  const first =
    text.indexOf(search);

  const second =
    first === -1
      ? -1
      : text.indexOf(
          search,
          first + search.length
        );

  if (first === -1) {
    throw new Error(
      `Marcador não encontrado: ${label}`
    );
  }

  if (second !== -1) {
    throw new Error(
      `Marcador duplicado: ${label}`
    );
  }

  text =
    text.slice(0, first) +
    replacement +
    text.slice(
      first + search.length
    );
}


/* =========================================================
   TRANSFORMA O PAYLOAD ATUAL EM FUNÇÃO REUTILIZÁVEL
========================================================= */

replaceOnce(
  `  async function submitManualOrder(formNode) {`,
  `  function buildManualOrderPayload(formNode) {`,
  "início do pedido manual"
);


replaceOnce(
  `    const data = await rpc("criar_pedido_manual_admin", {
      p_dados: payload,
    });
    await refreshOrders();
    showMessage(
      \`Pedido \${data.codigo || ""} registrado com sucesso pelo WhatsApp.\`,
    );
  }
  async function openManualOrderModal() {`,

  `    return payload;
  }

  async function submitManualOrder(formNode) {
    const payload =
      buildManualOrderPayload(
        formNode
      );

    const data =
      await rpc(
        "criar_pedido_manual_admin",
        {
          p_dados:
            payload
        }
      );

    await refreshOrders();

    showMessage(
      \`Pedido \${data.codigo || ""} registrado com sucesso pelo WhatsApp.\`
    );
  }


  /* =======================================================
     CONFIRMAÇÃO PROFISSIONAL PELO WHATSAPP
  ======================================================= */

  function manualOrderPaymentLabel(
    value
  ) {
    const labels = {
      pix:
        "Pix",

      dinheiro:
        "Dinheiro",

      cartao_debito:
        "Cartão de débito",

      cartao_credito:
        "Cartão de crédito"
    };

    return (
      labels[
        String(
          value ||
          ""
        )
      ] ||
      String(
        value ||
        "Não informado"
      )
    );
  }


  function manualOrderItemConfirmationLines(
    item,
    establishment
  ) {
    const quantity =
      Number(
        item?.quantidade ||
        1
      );

    const unitPrice =
      Number(
        item?.preco_unitario ||
        0
      );

    const totalItem =
      unitPrice *
      quantity;

    const productName =
      String(
        item?.produto_nome ||
        "Item"
      ).trim();

    const sizeLabel =
      String(
        item?.tamanho_label ||
        ""
      ).trim();

    const sizeMl =
      Number(
        item?.tamanho_ml
      );

    let sizeText =
      "";


    if (
      sizeLabel &&
      !productName
        .toLowerCase()
        .endsWith(
          \` \${sizeLabel.toLowerCase()}\`
        )
    ) {
      sizeText =
        \` — \${sizeLabel}\`;
    }

    else if (
      Number.isFinite(
        sizeMl
      ) &&
      sizeMl > 0 &&
      !productName.includes(
        String(
          sizeMl
        )
      )
    ) {
      sizeText =
        \` — \${sizeMl} ml\`;
    }


    const lines = [
      \`• \${quantity}x \${productName}\${sizeText} — \${formatMoney(totalItem)}\`
    ];


    const complements =
      Array.isArray(
        item?.complementos
      )
        ? item.complementos
        : [];


    if (
      complements.length
    ) {
      if (
        establishment ===
        "ph_sabor_cia"
      ) {
        const salad =
          complements.find(
            complement => {
              const name =
                normalizeKey(
                  complement
                    ?.nome ||
                  ""
                );

              return (
                name ===
                  "com salada" ||
                name ===
                  "sem salada"
              );
            }
          );


        if (salad) {
          lines.push(
            \`  Salada: \${salad.nome}\`
          );
        }
      }

      else {
        const details =
          complements.map(
            complement => {
              const name =
                String(
                  complement
                    ?.nome ||
                  "Complemento"
                ).trim();


              const layer =
                String(
                  complement
                    ?.camada ||
                  ""
                ).trim();


              const layerText =
                layer ===
                "meio"

                  ? " (meio)"

                  : layer ===
                    "cobertura"

                    ? " (cobertura)"

                    : "";


              const charged =
                Number(
                  complement
                    ?.preco_unitario ||
                  0
                );


              const chargedText =
                charged > 0

                  ? \` +\${formatMoney(charged)}\`

                  : "";


              return (
                \`\${name}\${layerText}\${chargedText}\`
              );
            }
          );


        lines.push(
          \`  Complementos: \${details.join(", ")}\`
        );
      }
    }


    if (
      quantity > 1
    ) {
      lines.push(
        \`  Unitário: \${formatMoney(unitPrice)}\`
      );
    }


    return lines;
  }


  function buildManualOrderConfirmationMessage(
    payload,
    orderCode = ""
  ) {
    const establishment =
      String(
        payload
          ?.estabelecimento ||
        "azury"
      );


    const storeName =
      establishment ===
      "ph_sabor_cia"

        ? "PH Sabor & Cia"

        : "Azury";


    const customerName =
      String(
        payload
          ?.cliente_nome ||
        "cliente"
      ).trim();


    const items =
      Array.isArray(
        payload
          ?.itens
      )

        ? payload.itens

        : [];


    const productsTotal =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Number(
            item
              ?.preco_unitario ||
            0
          ) *
          Number(
            item
              ?.quantidade ||
            0
          ),

        0
      );


    const deliveryFee =
      Number(
        payload
          ?.taxa_entrega ||
        0
      );


    const discount =
      Number(
        payload
          ?.desconto ||
        0
      );


    const total =
      Math.max(
        0,

        productsTotal +
        deliveryFee -
        discount
      );


    const addressParts = [
      String(
        payload
          ?.rua ||
        ""
      ).trim(),

      String(
        payload
          ?.numero ||
        ""
      ).trim()

        ? \`nº \${String(payload.numero).trim()}\`

        : "",

      String(
        payload
          ?.bairro ||
        ""
      ).trim(),

      String(
        payload
          ?.cep ||
        ""
      ).trim()

        ? \`CEP \${String(payload.cep).trim()}\`

        : ""
    ].filter(
      Boolean
    );


    const itemLines =
      items.flatMap(
        item =>
          manualOrderItemConfirmationLines(
            item,
            establishment
          )
      );


    const lines = [
      "🧾 *CONFIRMAÇÃO DO PEDIDO*",

      \`*\${storeName}*\`,

      orderCode
        ? \`Pedido *\${orderCode}*\`
        : "",

      "",

      \`Olá, \${customerName}! Confira se o seu pedido está correto:\`,

      "",

      "*Itens*",

      ...itemLines,

      "",

      \`Produtos: \${formatMoney(productsTotal)}\`,

      \`Taxa de entrega: \${formatMoney(deliveryFee)}\`,

      discount > 0
        ? \`Desconto: -\${formatMoney(discount)}\`
        : null,

      \`*Total: \${formatMoney(total)}*\`,

      "",

      \`Pagamento: \${manualOrderPaymentLabel(
        payload?.forma_pagamento
      )}\`,

      payload
          ?.forma_pagamento ===
          "dinheiro" &&
        Number(
          payload
            ?.troco_para
        ) > 0

        ? \`Troco para: \${formatMoney(
            payload.troco_para
          )}\`

        : null,

      addressParts.length

        ? \`Entrega: \${addressParts.join(", ")}\`

        : null,

      payload
        ?.complemento_endereco

        ? \`Complemento: \${payload.complemento_endereco}\`

        : null,

      payload
        ?.observacoes

        ? \`Observações: \${payload.observacoes}\`

        : null,

      "",

      "Se estiver tudo certo, responda *CONFIRMO* para iniciarmos o preparo. ✅"
    ];


    return lines
      .filter(
        line =>
          line !== null &&
          line !== undefined
      )
      .join(
        "\\n"
      );
  }


  async function registerManualOrderAndSendConfirmation(
    formNode
  ) {
    if (
      !formNode.reportValidity()
    ) {
      return false;
    }


    const payload =
      buildManualOrderPayload(
        formNode
      );


    const normalizedPhone =
      normalizeWhatsAppPhone(
        payload
          .cliente_telefone
      );


    if (
      normalizedPhone.length <
      12
    ) {
      throw new Error(
        "Informe um telefone/WhatsApp válido para enviar a confirmação do pedido."
      );
    }


    let preparedWindow =
      null;


    try {
      preparedWindow =
        window.open(
          "about:blank",
          "_blank"
        );


      if (
        preparedWindow
      ) {
        preparedWindow
          .document
          .title =
          "Abrindo WhatsApp...";
      }
    }

    catch (error) {
      preparedWindow =
        null;
    }


    let data;


    try {
      data =
        await rpc(
          "criar_pedido_manual_admin",
          {
            p_dados:
              payload
          }
        );
    }

    catch (error) {
      try {
        preparedWindow
          ?.close();
      }

      catch (closeError) {
        console.warn(
          "Não foi possível fechar a janela preparada.",
          closeError
        );
      }

      throw error;
    }


    try {
      await refreshOrders();
    }

    catch (refreshError) {
      console.error(
        "O pedido foi registrado, mas a lista não atualizou imediatamente.",
        refreshError
      );
    }


    const code =
      data
        ?.codigo ||
      "";


    const message =
      buildManualOrderConfirmationMessage(
        payload,
        code
      );


    const url =
      \`https://wa.me/\${normalizedPhone}?text=\${encodeURIComponent(
        message
      )}\`;


    let whatsappOpened =
      false;


    if (
      preparedWindow &&
      !preparedWindow.closed
    ) {
      preparedWindow
        .location
        .href =
        url;

      whatsappOpened =
        true;
    }


    if (
      !whatsappOpened
    ) {
      try {
        await navigator
          .clipboard
          .writeText(
            message
          );
      }

      catch (
        clipboardError
      ) {
        console.warn(
          "Não foi possível copiar a confirmação para a área de transferência.",
          clipboardError
        );
      }
    }


    closeModal();


    showMessage(
      whatsappOpened

        ? \`Pedido \${code} registrado como recebido e aberto no WhatsApp para confirmação.\`

        : \`Pedido \${code} registrado. O navegador bloqueou o WhatsApp; a mensagem de confirmação foi copiada.\`,

      whatsappOpened
        ? "success"
        : "warning"
    );


    return true;
  }


  async function openManualOrderModal() {`,

  "final do pedido manual e confirmação WhatsApp"
);


/* =========================================================
   NOVOS BOTÕES DO MODAL
========================================================= */

replaceOnce(
  `      <div
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
      </div>`,

  `      <div
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
      </div>`,

  "ações do modal de pedido manual"
);


/* =========================================================
   EVENTO DO NOVO BOTÃO
========================================================= */

replaceOnce(
  `    const addManualItem = event.target.closest("[data-manual-add-item]");`,

  `    const manualConfirmationButton =
      event.target.closest(
        "[data-manual-register-confirmation]"
      );

    if (
      manualConfirmationButton
    ) {
      const originalText =
        manualConfirmationButton
          .textContent;

      manualConfirmationButton
        .disabled =
        true;

      manualConfirmationButton
        .textContent =
        "Registrando...";


      registerManualOrderAndSendConfirmation(
        el.dynamicModalForm
      )
        .catch(
          error => {
            console.error(
              error
            );

            showMessage(
              error.message,
              "error"
            );
          }
        )

        .finally(
          () => {
            if (
              document.body.contains(
                manualConfirmationButton
              )
            ) {
              manualConfirmationButton
                .disabled =
                false;

              manualConfirmationButton
                .textContent =
                originalText;
            }
          }
        );


      return;
    }


    const addManualItem =
      event.target.closest(
        "[data-manual-add-item]"
      );`,

  "evento de registrar e enviar confirmação"
);


/* =========================================================
   SALVAR
========================================================= */

fs.writeFileSync(
  file,
  text.replace(
    /\n/g,
    eol
  ),
  "utf8"
);


console.log(
  `OK: ${file}`
);

console.log(
  `Backup: ${backup}`
);

console.log(
  "Novo fluxo: Registrar pedido OU Registrar e enviar confirmação."
);

console.log(
  "Nenhuma regra de preço, copo, Box ou cardápio foi alterada."
);