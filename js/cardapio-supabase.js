document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const sb = window.azurySupabase;
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    const d = {
        modal: $("#modalMonteSeu"), content: $("#modalMonteSeu .conteudo-monte-seu"), close: $("#btnFecharMonteSeu"),
        step1: $("#painelPedido"), step2: $("#painelEntrega"), indicators: $$(".etapa-indicador"),
        next: $("#btnContinuarPedido"), back: $("#btnVoltarPedido"), send: $("#btnEnviarMonteSeu"),
        store: $("#statusLoja"), storeTitle: $("#statusLojaTitulo"), storeMsg: $("#statusLojaMensagem"),
        size: $("#tamanhoMonteSeu"), base: $("#precoBaseMonteSeu"), middle: $("#complementosMeio"), top: $("#complementosTopo"),
        subtotal: $("#subtotalMonteSeu"), subtotal2: $("#resumoSubtotalPedido"), feeText: $("#resumoTaxaEntrega"), total: $("#totalMonteSeu"),
        name: $("#nomeCliente"), phone: $("#telefoneCliente"), zip: $("#cepCliente"), street: $("#ruaCliente"), number: $("#numeroCliente"),
        district: $("#bairroCliente"), addressExtra: $("#complementoCliente"), addressStatus: $("#statusEndereco"),
        addressOk: $("#enderecoValidado"), fee: $("#taxaEntrega"), districtId: $("#bairroEntregaId"), change: $("#trocoParaCliente")
    };

    const state = {
        config: null, schedules: [], sizes: [], complements: [], districts: [], districtMap: new Map(), aliases: [],
        subtotal: 0, sending: false, consultingZip: false, zipRequest: 0, operationReady: false
    };

    const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const timeMinutes = value => {
        const parts = String(value || "").split(":");
        if (parts.length < 2) return null;
        const h = Number(parts[0]), m = Number(parts[1]);
        return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
    };
    const timeLabel = value => {
        const minutes = timeMinutes(value);
        return minutes === null ? "" : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    };

    function message(text, type = "") {
        if (!d.addressStatus) return;
        d.addressStatus.textContent = text;
        d.addressStatus.classList.remove("sucesso", "erro", "carregando");
        if (type) d.addressStatus.classList.add(type);
    }

    async function table(name, configure) {
        let query = sb.from(name).select("*");
        query = configure ? configure(query) : query;
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    function applyOperation(data) {
        const sizes = data.tamanhos || data.sizes || [];
        const complements = data.complementos || data.complements || [];
        const districts = data.bairros || data.bairros_entrega || data.districts || [];
        const schedules = data.horarios || data.horarios_funcionamento || data.schedules || [];
        const config = data.configuracao_loja || data.configuracao || data.config || null;

        if (!sizes.length || !districts.length || !config) {
            throw new Error("Configuração pública incompleta.");
        }

        state.sizes = sizes;
        state.complements = complements.filter(item => item.disponivel !== false && item.visivel !== false);
        state.districts = districts.filter(item => item.ativo !== false);
        state.schedules = schedules;
        state.config = config;
        state.operationReady = true;

        state.districtMap.clear();
        state.districts.forEach(item => {
            const aliases = Array.isArray(item.aliases) ? item.aliases : [];
            [item.nome, ...aliases].filter(Boolean).forEach(alias => state.districtMap.set(norm(alias), item));
        });
        state.aliases = Array.from(state.districtMap.keys()).sort((a, b) => b.length - a.length);
    }

    async function loadOperation() {
        if (!sb) throw new Error("Supabase não carregado.");

        try {
            const [sizes, complements, districts, schedules, configRows] = await Promise.all([
                table("tamanhos_acai", q => q.order("ordem", { ascending: true })),
                table("complementos", q => q.eq("disponivel", true).eq("visivel", true).order("ordem", { ascending: true })),
                table("bairros_entrega", q => q.eq("ativo", true).order("ordem", { ascending: true })),
                table("horarios_funcionamento", q => q.order("dia_semana", { ascending: true })),
                table("configuracoes_loja", q => q.eq("id", 1).limit(1))
            ]);

            applyOperation({
                tamanhos: sizes,
                complementos: complements,
                bairros: districts,
                horarios: schedules,
                configuracao_loja: configRows[0]
            });
            return;
        } catch (directError) {
            console.warn("Leitura direta da operação indisponível; tentando função pública.", directError);

            const functionNames = [
                "listar_operacao_publica",
                "listar_operacao_site",
                "obter_operacao_publica"
            ];

            for (const name of functionNames) {
                const { data, error } = await sb.rpc(name);
                if (!error && data) {
                    applyOperation(data);
                    return;
                }

                const message = String(error?.message || "").toLowerCase();
                const missing =
                    error?.code === "PGRST202" ||
                    message.includes("could not find the function") ||
                    message.includes("does not exist");

                if (error && !missing) throw error;
            }

            throw directError;
        }
    }

    function renderSizes() {
        $$(".menu-grid > li").forEach(card => {
            const button = card.querySelector(".btn-montar");
            const current = Number(button?.dataset.tamanho);
            const item = state.sizes.find(size => Number(size.tamanho_ml) === current);
            if (!button || !item) return;

            const available = item.disponivel === true && item.visivel === true;
            card.hidden = item.visivel === false;
            card.classList.toggle("produto-em-breve", !available);
            const badge = card.querySelector(".badge"), title = card.querySelector("h3"), description = card.querySelector("h3 + p"), price = card.querySelector("h3 + p + strong");
            if (badge) { badge.textContent = item.badge || (available ? "Disponível" : "Em breve"); badge.classList.toggle("badge-em-breve", !available); }
            if (title) title.textContent = item.nome || `Monte o Seu • ${item.tamanho_ml}ml`;
            if (description) description.textContent = item.descricao || "Escolha os complementos do meio e da cobertura.";
            if (price) price.textContent = `${available ? "A partir de" : "Preço previsto:"} ${money(item.preco_base)}`;
            button.dataset.precoBase = String(item.preco_base);
            button.dataset.disponibilidade = available ? "disponivel" : "em-breve";
            button.disabled = !available;
        });

        const container = $(".opcoes-tamanho-monte-seu");
        if (!container) return;
        container.innerHTML = state.sizes.filter(item => item.visivel !== false).map((item, index) => {
            const available = item.disponivel === true;
            return `<label class="opcao-tamanho-produto ${available ? "" : "opcao-tamanho-indisponivel"}">
                <input type="radio" name="tamanhoMonteSeuOpcao" value="${esc(item.tamanho_ml)}" data-preco-base="${esc(item.preco_base)}" ${available ? "" : "disabled"} ${index === 0 && available ? "checked" : ""}>
                <span><strong>${esc(item.tamanho_ml)} ml</strong><small>${available ? money(item.preco_base) : "Em breve"}</small></span>
            </label>`;
        }).join("");

        $$("input[name='tamanhoMonteSeuOpcao']").forEach(input => input.addEventListener("change", () => {
            if (input.checked) selectSize(input.value, input.dataset.precoBase);
        }));
    }

    function renderComplements() {
        const render = (container, layer) => {
            if (!container) return;
            container.innerHTML = state.complements.map((item, index) => `<label>
                <input type="checkbox" class="complemento-monte-seu" value="${esc(item.nome)}" data-id="${esc(item.id || "")}" data-preco="${esc(item.preco)}" data-camada="${layer}" id="${layer}-${index}">
                ${esc(item.nome)} — ${money(item.preco)}
            </label>`).join("");
        };
        render(d.middle, "meio");
        render(d.top, "cobertura");
        $$(".complemento-monte-seu").forEach(input => input.addEventListener("change", calculate));
    }

    function nowLocal() {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: state.config?.fuso_horario || "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
        }).formatToParts(new Date());
        const v = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
        return { day: new Date(Date.UTC(v.year, v.month - 1, v.day)).getUTCDay(), minutes: v.hour * 60 + v.minute };
    }

    function schedule(day) { return state.schedules.find(item => Number(item.dia_semana) === Number(day)); }

    function storeState() {
        if (!state.operationReady) return { open: false, title: "CARREGANDO CARDÁPIO", text: "Aguarde alguns segundos.", alert: "O cardápio ainda está carregando." };
        if (state.config.pedidos_ativos !== true) {
            const text = state.config.mensagem_pausa || "Os pedidos estão temporariamente pausados.";
            return { open: false, title: "PEDIDOS PAUSADOS", text, alert: text };
        }

        const now = nowLocal();
        const today = schedule(now.day);
        let open = false;
        if (today?.ativo) {
            const start = timeMinutes(today.abre_as), end = timeMinutes(today.fecha_as);
            if (start !== null && end !== null) open = end > start ? now.minutes >= start && now.minutes < end : now.minutes >= start;
        }
        if (!open) {
            const previous = schedule((now.day + 6) % 7);
            if (previous?.ativo) {
                const start = timeMinutes(previous.abre_as), end = timeMinutes(previous.fecha_as);
                if (start !== null && end !== null && end < start && now.minutes < end) open = true;
            }
        }
        if (open) return { open: true, title: "ABERTO AGORA", text: `Faça seu pedido — atendimento até ${timeLabel(today?.fecha_as) || "00:00"}.`, alert: "" };

        const names = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
        for (let offset = 0; offset < 8; offset += 1) {
            const day = (now.day + offset) % 7, item = schedule(day), start = timeMinutes(item?.abre_as);
            if (!item?.ativo || start === null || (offset === 0 && now.minutes >= start)) continue;
            const when = offset === 0 ? "hoje" : offset === 1 ? "amanhã" : names[day];
            const text = `Abrimos ${when} às ${timeLabel(item.abre_as)}.`;
            return { open: false, title: "FECHADO NO MOMENTO", text, alert: `A Azury está fechada no momento. ${text}` };
        }
        return { open: false, title: "FECHADO NO MOMENTO", text: "Consulte novamente em breve.", alert: "A Azury está fechada no momento." };
    }

    function updateStore() {
        const status = storeState();
        d.store?.classList.toggle("aberta", status.open);
        d.store?.classList.toggle("fechada", !status.open);
        if (d.storeTitle) d.storeTitle.textContent = status.title;
        if (d.storeMsg) d.storeMsg.textContent = status.text;

        $$(".btn-montar").forEach(button => {
            const available = button.dataset.disponibilidade !== "em-breve";
            button.disabled = !available || !status.open;
            button.classList.toggle("btn-loja-fechada", available && !status.open);
            button.textContent = !available ? "Disponível em breve" : status.open ? "Montar meu açaí" : "Loja fechada";
        });
        if (d.next) { d.next.disabled = !status.open; d.next.textContent = status.open ? "Continuar para entrega" : "Loja fechada"; }
        if (d.send && !state.sending) { d.send.disabled = !status.open; d.send.textContent = status.open ? "Finalizar pedido" : "Loja fechada"; }
        return status;
    }

    function requireOpen() {
        const status = updateStore();
        if (status.open) return true;
        alert(status.alert);
        return false;
    }

    function updateWhatsapp() {
        const number = String(state.config?.whatsapp || "5511960220402").replace(/\D/g, "");
        $$(".js-pedido-horario").forEach(link => link.href = `https://wa.me/${number}`);
    }

    function selectSize(size, base) {
        const item = state.sizes.find(row => Number(row.tamanho_ml) === Number(size) && row.disponivel === true && row.visivel === true);
        if (!item) return;
        if (d.size) d.size.value = String(item.tamanho_ml);
        if (d.base) d.base.value = String(item.preco_base ?? base);
        $$("input[name='tamanhoMonteSeuOpcao']").forEach(input => input.checked = Number(input.value) === Number(item.tamanho_ml));
        calculate();
    }

    function allComplements() { return $$(".complemento-monte-seu"); }
    function selected(layer) { return allComplements().filter(item => item.checked && item.dataset.camada === layer); }
    function calculate() {
        let value = num(d.base?.value, 0);
        allComplements().forEach(item => { if (item.checked) value += num(item.dataset.preco, 0); });
        state.subtotal = value;
        if (d.subtotal) d.subtotal.textContent = money(value);
        if (d.subtotal2) d.subtotal2.textContent = money(value);
        updateTotal();
        return value;
    }
    function updateTotal() {
        const total = state.subtotal + num(d.fee?.value, 0);
        if (d.total) d.total.textContent = money(total);
        return total;
    }

    function showStep(step) {
        const first = step === 1;
        if (d.step1) { d.step1.hidden = !first; d.step1.classList.toggle("ativo", first); }
        if (d.step2) { d.step2.hidden = first; d.step2.classList.toggle("ativo", !first); }
        d.indicators.forEach(item => {
            const value = Number(item.dataset.indicadorEtapa);
            item.classList.toggle("ativa", value === step);
            item.classList.toggle("concluida", value < step);
        });
        if (d.content) d.content.scrollTop = 0;
    }
    function openModal() { if (d.modal) { d.modal.style.display = "flex"; document.body.style.overflow = "hidden"; } }
    function closeModal() { if (d.modal) { d.modal.style.display = "none"; document.body.style.overflow = ""; } }

    function resetAddress(text = "Informe um CEP válido para calcular a entrega.", type = "") {
        state.zipRequest += 1;
        state.consultingZip = false;
        if (d.addressOk) d.addressOk.value = "false";
        if (d.fee) d.fee.value = "0";
        if (d.districtId) d.districtId.value = "";
        if (d.street) d.street.value = "";
        if (d.district) d.district.value = "";
        if (d.feeText) d.feeText.textContent = "A calcular";
        message(text, type);
        updateTotal();
    }

    function findDistrict(name) {
        const key = norm(name);
        if (!key) return null;
        if (state.districtMap.has(key)) return state.districtMap.get(key);
        const alias = state.aliases.find(item => key.includes(item) || item.includes(key));
        return alias ? state.districtMap.get(alias) : null;
    }

    async function consultZip(zip) {
        const requestId = ++state.zipRequest;
        state.consultingZip = true;
        message("Consultando o CEP...", "carregando");
        try {
            const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
            if (!response.ok) throw new Error("Falha ao consultar CEP.");
            const data = await response.json();
            if (requestId !== state.zipRequest) return;
            if (data.erro || !data.bairro || !data.logradouro) { resetAddress("CEP inexistente ou sem endereço completo.", "erro"); return; }
            const district = findDistrict(data.bairro);
            if (!district) { resetAddress(`Ainda não entregamos no bairro ${data.bairro}.`, "erro"); return; }
            if (d.street) d.street.value = data.logradouro;
            if (d.district) d.district.value = district.nome;
            if (d.districtId) d.districtId.value = String(district.id);
            if (d.addressOk) d.addressOk.value = "true";
            if (d.fee) d.fee.value = String(district.taxa);
            if (d.feeText) d.feeText.textContent = money(district.taxa);
            message(`Endereço validado. Entrega para ${district.nome}: ${money(district.taxa)}.`, "sucesso");
            updateTotal();
        } catch (error) {
            if (requestId === state.zipRequest) resetAddress("Não foi possível validar o CEP agora. Tente novamente.", "erro");
        } finally {
            if (requestId === state.zipRequest) state.consultingZip = false;
        }
    }

    function setupZip() {
        d.zip?.addEventListener("input", () => {
            const digits = d.zip.value.replace(/\D/g, "").slice(0, 8);
            d.zip.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
            resetAddress();
            if (digits.length === 8) consultZip(digits);
        });
    }

    async function fillCustomer() {
        try {
            const { data } = await sb.auth.getSession();
            const user = data.session?.user;
            if (!user) return;
            let profile = {};
            const result = await sb.from("perfis").select("*").eq("id", user.id).maybeSingle();
            if (!result.error) profile = result.data || {};
            if (d.name && !d.name.value.trim()) d.name.value = profile.nome || profile.nome_completo || user.user_metadata?.nome || user.email?.split("@")[0] || "";
            if (d.phone && !d.phone.value.trim()) d.phone.value = profile.telefone || "";
        } catch (_) {}
    }

    function resetOrder() {
        allComplements().forEach(item => item.checked = false);
        $$("input[name='formaPagamentoMonteSeu']").forEach(item => item.checked = false);
        if (d.zip) d.zip.value = "";
        if (d.number) d.number.value = "";
        if (d.addressExtra) d.addressExtra.value = "";
        if (d.change) d.change.value = "";
        resetAddress();
    }

    function payment() {
        const value = $("input[name='formaPagamentoMonteSeu']:checked")?.value || "";
        return {
            "Cartão de crédito": "cartao_credito",
            "Cartão de débito": "cartao_debito",
            Pix: "pix",
            Dinheiro: "dinheiro"
        }[value] || value;
    }

    function paymentLabel(value) {
        return { cartao_credito: "Cartão de crédito", cartao_debito: "Cartão de débito", pix: "Pix", dinheiro: "Dinheiro" }[value] || value;
    }

    function addressValid() {
        return d.addressOk?.value === "true" && d.districtId?.value && d.name?.value.trim() && d.zip?.value.replace(/\D/g, "").length === 8 && d.street?.value.trim() && d.number?.value.trim();
    }

    async function createOrder() {
        if (state.sending || !requireOpen()) return;
        if (state.consultingZip) { alert("Aguarde a validação do CEP."); return; }
        if (!addressValid()) { alert("Informe um endereço válido de um bairro atendido."); return; }
        const pay = payment();
        if (!pay) { alert("Escolha a forma de pagamento."); return; }

        const { data: sessionData } = await sb.auth.getSession();
        if (!sessionData.session) {
            sessionStorage.setItem("azuryRetornoLogin", "index.html#Cardapio");
            alert("Entre na sua conta Azury para registrar o pedido.");
            window.location.href = "login.html";
            return;
        }

        state.sending = true;
        d.send.disabled = true;
        d.send.textContent = "Registrando pedido...";
        const whatsappWindow = window.open("about:blank", "_blank");

        const middle = selected("meio"), top = selected("cobertura");
        const payload = {
            cliente: { nome: d.name.value.trim(), telefone: d.phone?.value.trim() || null },
            entrega: {
                bairro_entrega_id: Number(d.districtId.value), cep: d.zip.value.trim(), rua: d.street.value.trim(),
                numero: d.number.value.trim(), complemento: d.addressExtra?.value.trim() || null
            },
            pagamento: {
                forma: pay,
                troco_para: pay === "dinheiro" && d.change?.value ? Number(String(d.change.value).replace(",", ".")) : null
            },
            itens: [{
                tamanho_ml: Number(d.size.value), quantidade: 1,
                complementos: [...middle.map(item => ({ nome: item.value, camada: "meio" })), ...top.map(item => ({ nome: item.value, camada: "cobertura" }))]
            }],
            observacoes: null
        };

        try {
            const { data, error } = await sb.rpc("criar_pedido_completo", { p_dados: payload });
            if (error) throw error;
            const code = data?.codigo || "";
            const productValue = num(data?.valor_produtos, state.subtotal), fee = num(data?.taxa_entrega, d.fee.value), total = num(data?.valor_total, productValue + fee);
            const list = items => items.length ? items.map(item => `• ${item.value}`).join("\n") : "• Nenhum complemento";
            const text = `Olá! Quero confirmar este pedido na AZURY:\n\n🧾 *Pedido:* ${code}\n👤 *Cliente:* ${d.name.value.trim()}\n\n📍 *Endereço de entrega:*\n${d.street.value.trim()}, nº ${d.number.value.trim()}\nBairro: ${d.district.value.trim()}\nCEP: ${d.zip.value.trim()}\nComplemento: ${d.addressExtra?.value.trim() || "Não informado"}\n\n💳 *Forma de pagamento:*\n${paymentLabel(pay)}\n\n🥤 *Monte o Seu • ${d.size.value}ml*\n\n*Complementos no meio:*\n${list(middle)}\n\n*Complementos na cobertura:*\n${list(top)}\n\n🧾 *Resumo:*\nProdutos: ${money(productValue)}\nEntrega: ${money(fee)}\n💰 *Total: ${money(total)}*`;
            const number = String(state.config.whatsapp || "5511960220402").replace(/\D/g, "");
            const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
            if (whatsappWindow) whatsappWindow.location.href = url; else window.open(url, "_blank", "noopener,noreferrer");
            closeModal();
            alert(`Pedido ${code} registrado com sucesso e enviado ao painel Azury.`);
            resetOrder();
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
        $$(".btn-montar").forEach(button => button.addEventListener("click", async () => {
            if (button.dataset.disponibilidade === "em-breve" || !requireOpen()) return;
            resetOrder();
            selectSize(button.dataset.tamanho, button.dataset.precoBase);
            await fillCustomer();
            showStep(1);
            openModal();
        }));
        d.next?.addEventListener("click", () => { if (requireOpen()) { calculate(); showStep(2); } });
        d.back?.addEventListener("click", () => showStep(1));
        d.close?.addEventListener("click", closeModal);
        d.modal?.addEventListener("click", event => { if (event.target === d.modal) closeModal(); });
        d.send?.addEventListener("click", createOrder);
        document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
    }

    try {
        if (!d.districtId && d.addressOk) {
            const hidden = document.createElement("input"); hidden.type = "hidden"; hidden.id = "bairroEntregaId"; hidden.value = "";
            d.addressOk.insertAdjacentElement("afterend", hidden); d.districtId = hidden;
        }
        await loadOperation();
        renderSizes();
        renderComplements();
        updateWhatsapp();
        setupZip();
        bind();
        const firstAvailable = state.sizes.find(item => item.disponivel === true && item.visivel === true);
        if (firstAvailable) selectSize(firstAvailable.tamanho_ml, firstAvailable.preco_base);
        showStep(1);
        updateStore();
        window.setInterval(updateStore, 30000);
    } catch (error) {
        console.error("Erro ao carregar operação Azury:", error);
        state.operationReady = false;
        if (d.storeTitle) d.storeTitle.textContent = "CARDÁPIO INDISPONÍVEL";
        if (d.storeMsg) d.storeMsg.textContent = "Atualize a página em alguns instantes.";
        $$(".btn-montar").forEach(button => { button.disabled = true; button.textContent = "Tente novamente"; });
        alert("Não foi possível carregar o cardápio do Supabase. Atualize a página em alguns instantes.");
    }
});
