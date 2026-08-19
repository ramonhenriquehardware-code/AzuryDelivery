const fs = require("fs");

const file = "admin/js/admin-dev.js";

if (!fs.existsSync(file)) {
  throw new Error(`Arquivo não encontrado: ${file}`);
}

const raw = fs.readFileSync(file, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
let text = raw.replace(/\r\n/g, "\n");

const regex =
  /  async function registerManualOrderAndSendConfirmation\(\s*formNode\s*\) \{[\s\S]*?\n  \}\n\n\n  async function openManualOrderModal\(\) \{/;

const matches = text.match(regex);

if (!matches) {
  throw new Error(
    "Parei por segurança: não encontrei a função de confirmação do WhatsApp."
  );
}

const replacement = `  async function registerManualOrderAndSendConfirmation(
    formNode
  ) {
    if (!formNode.reportValidity()) {
      return false;
    }

    const payload =
      buildManualOrderPayload(
        formNode
      );

    const normalizedPhone =
      normalizeWhatsAppPhone(
        payload.cliente_telefone
      );

    if (normalizedPhone.length < 12) {
      throw new Error(
        "Informe um telefone/WhatsApp válido para enviar a confirmação do pedido."
      );
    }

    const data =
      await rpc(
        "criar_pedido_manual_admin",
        {
          p_dados: payload
        }
      );

    try {
      await refreshOrders();
    } catch (refreshError) {
      console.error(
        "O pedido foi registrado, mas a lista não atualizou imediatamente.",
        refreshError
      );
    }

    const code =
      data?.codigo || "";

    const message =
      buildManualOrderConfirmationMessage(
        payload,
        code
      );

    const url =
      \`https://wa.me/\${normalizedPhone}?text=\${encodeURIComponent(
        message
      )}\`;

    const opened =
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

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
      \`Pedido \${code} registrado e aberto no WhatsApp para confirmação.\`,
      "success"
    );

    return true;
  }


  async function openManualOrderModal() {`;

text = text.replace(
  regex,
  replacement
);

fs.writeFileSync(
  file,
  text.replace(/\n/g, eol),
  "utf8"
);

console.log("OK: abertura do WhatsApp corrigida.");
console.log(
  "Se popup for bloqueado, o WhatsApp abrirá na própria aba."
);
console.log(
  "Nenhuma regra de produto/preço/cardápio foi alterada."
);