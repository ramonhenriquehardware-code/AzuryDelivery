const fs = require("fs");

const file = "admin/js/admin-dev.js";
const backup = "admin/js/admin-dev.backup-before-ph-20260819.js";

if (!fs.existsSync(file)) {
  throw new Error(`Arquivo não encontrado: ${file}`);
}

const originalRaw = fs.readFileSync(file, "utf8");
const eol = originalRaw.includes("\r\n") ? "\r\n" : "\n";
let text = originalRaw.replace(/\r\n/g, "\n");
const originalLines = (text.match(/\n/g) || []).length;

if (originalLines !== 6733) {
  throw new Error(
    `Parei por segurança: admin-dev.js tem ${originalLines} linhas; eu esperava exatamente 6733.`,
  );
}

fs.copyFileSync(file, backup);

function replaceOnce(search, replacement, label) {
  const first = text.indexOf(search);
  const second =
    first === -1 ? -1 : text.indexOf(search, first + search.length);

  if (first === -1) {
    throw new Error(`Marcador não encontrado: ${label}`);
  }

  if (second !== -1) {
    throw new Error(`Marcador duplicado: ${label}`);
  }

  text =
    text.slice(0, first) +
    replacement +
    text.slice(first + search.length);
}

replaceOnce(
  `            <span>
              Acompanhamento
            </span>`,
  `            <span>
              Salada
            </span>`,
  "pedido manual PH / rótulo",
);

replaceOnce(
  `          \`Escolha o acompanhamento de \${productData.product.nome}.\`,`,
  `          \`Informe se o cliente deseja salada em \${productData.product.nome}.\`,`,
  "pedido manual PH / validação",
);

replaceOnce(
  `          <p>
            Somente produtos e acompanhamentos. Funcionamento foi movido para Loja e horários.
          </p>
        </div>
        <button
          class="btn btn-secondary"
          data-ph-config-reload
          type="button"
        >
          Atualizar dados PH
        </button>`,
  `          <p>
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
        </div>`,
  "cabeçalho Cardápio PH",
);

replaceOnce(
  `          Acompanhamentos das marmitas`,
  `          Salada das marmitas`,
  "título salada PH",
);

replaceOnce(
  `                            <p>Acompanhamento de marmita</p>`,
  `                            <p>Preferência de salada</p>`,
  "card salada PH",
);

replaceOnce(
  `                  Nenhum acompanhamento cadastrado.`,
  `                  Nenhuma opção de salada cadastrada.`,
  "vazio salada PH",
);

replaceOnce(
  `          label: "Nome do acompanhamento",`,
  `          label: "Opção de salada",`,
  "modal salada PH",
);

replaceOnce(
  `      submitText: "Salvar acompanhamento",`,
  `      submitText: "Salvar opção",`,
  "botão modal salada PH",
);

replaceOnce(
  `            "O acompanhamento não foi encontrado na configuração da PH.",`,
  `            "A opção de salada não foi encontrada na configuração da PH.",`,
  "erro modal salada PH",
);

const migration = `  function criarTamanhoPhAtualizacao(nome, capacidadeMl, descricao, preco, ativo) {
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
            Number(tamanho?.capacidade_ml) ===
            Number(padrao.capacidade_ml),
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

    const { next, changed } =
      normalizarConfiguracaoPhAtualizacao20260819(state.phConfig);

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
      console.warn(
        "Não foi possível salvar o backup local da PH.",
        error,
      );
    }

    await savePhConfig(
      next,
      "Cardápio PH atualizado: Contra Filé, Picadinho e nova regra de salada aplicados.",
    );
  }
`;

replaceOnce(
  `  async function loadPhConfig(message = "") {`,
  `${migration}  async function loadPhConfig(message = "") {`,
  "funções atualização PH",
);

replaceOnce(
  `    const phReload = event.target.closest("[data-ph-config-reload]");`,
  `    const phApplyUpdate = event.target.closest(
      "[data-ph-aplicar-atualizacao-cardapio]",
    );

    if (phApplyUpdate) {
      aplicarAtualizacaoCardapioPh20260819().catch((error) => {
        console.error(error);
        showMessage(error.message, "error");
      });

      return;
    }

    const phReload = event.target.closest("[data-ph-config-reload]");`,
  "evento Aplicar atualização PH",
);

const finalRaw = text.replace(/\n/g, eol);

fs.writeFileSync(file, finalRaw, "utf8");

const newLines = (text.match(/\n/g) || []).length;

console.log(`OK: ${file}`);
console.log(`Backup: ${backup}`);
console.log(
  `Linhas: ${originalLines} -> ${newLines} (${
    newLines - originalLines >= 0 ? "+" : ""
  }${newLines - originalLines})`,
);
console.log("Somente blocos PH foram alterados.");