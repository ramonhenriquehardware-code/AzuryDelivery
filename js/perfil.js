const AZURY_AVATAR_BUCKET = "avatars";
const AZURY_AVATAR_FILE = "avatar.jpg";
const AZURY_AVATAR_OUTPUT = 512;

const fotoPerfilState = {
    userId: "",
    supabase: null,
    path: "",
    avatarUrl: "",
    sourceUrl: "",
    image: null,
    minScale: 1,
    scale: 1,
    x: 0,
    y: 0,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    bound: false,
    saving: false
};

function inicializarPerfil(usuario) {
    const nome = document.getElementById("nomeCliente");
    if (nome) nome.textContent = usuario.nome;

    const avatarInicial = document.getElementById("avatarInicial");
    const avatar = document.querySelector(".avatar-cliente");
    if (avatarInicial) avatarInicial.textContent = "";

    const nivel = String(usuario.nivel || "Bronze").trim().toLowerCase();

    let nomeNivel = "Bronze";
    let emoji = "🥉";
    let borda = "#b87333";
    let sombra =
        "0 0 0 4px rgba(184,115,51,.14),0 8px 22px rgba(184,115,51,.20)";

    if (nivel.includes("prata")) {
        nomeNivel = "Prata";
        emoji = "🥈";
        borda = "#aeb4bd";
        sombra =
            "0 0 0 4px rgba(174,180,189,.18),0 8px 22px rgba(120,130,145,.22)";
    } else if (nivel.includes("ouro")) {
        nomeNivel = "Ouro";
        emoji = "🥇";
        borda = "#d4af37";
        sombra =
            "0 0 0 4px rgba(212,175,55,.18),0 8px 24px rgba(212,175,55,.28)";
    } else if (nivel.includes("diamante")) {
        nomeNivel = "Diamante";
        emoji = "💎";
        borda = "#62cfff";
        sombra =
            "0 0 0 4px rgba(98,207,255,.20),0 0 22px rgba(0,81,255,.30),0 8px 28px rgba(98,207,255,.24)";
    }

    if (avatar) {
        avatar.style.borderColor = borda;
        avatar.style.boxShadow = sombra;
    }

    const nivelCard =
        document.getElementById("nivelClienteCard");

    if (nivelCard) {
        nivelCard.textContent =
            `${emoji} Cliente ${nomeNivel}`;
    }

    const pontos =
        usuario.pontos || 0;

    const pontosEl =
        document.getElementById("pontos");

    const pontosCard =
        document.getElementById("pontosCard");

    const progresso =
        document.getElementById("progresso");

    const faltam =
        document.getElementById("faltam");

    if (pontosEl) {
        pontosEl.textContent = pontos;
    }

    if (pontosCard) {
        pontosCard.textContent = pontos;
    }

    if (progresso) {
        progresso.style.width =
            Math.min(
                (pontos / 100) * 100,
                100
            ) + "%";
    }

    if (faltam) {
        faltam.textContent =
            `Faltam ${Math.max(100 - pontos, 0)} pontos para ganhar um Açaí 300ml.`;
    }

    prepararFotoPerfil(usuario);
}

function garantirInterfaceFotoPerfil() {
    const container =
        document.querySelector(".avatar-container");

    const avatar =
        document.querySelector(".avatar-cliente");

    if (!container || !avatar) {
        return;
    }

    if (
        !document.getElementById(
            "azuryFotoPerfilEstilos"
        )
    ) {
        const style =
            document.createElement("style");

        style.id =
            "azuryFotoPerfilEstilos";

        style.textContent = `
#fotoPerfilCliente{
    width:100%;
    height:100%;
    display:block;
    object-fit:cover;
    object-position:center;
    border-radius:50%;
}

#fotoPerfilCliente[hidden],
#avatarInicial[hidden],
.status-foto-perfil[hidden]{
    display:none!important;
}

.btn-editar-foto-perfil{
    width:46px;
    height:46px;
    padding:0;

    display:grid;
    place-items:center;

    position:absolute;
    right:0;
    bottom:5px;
    z-index:5;

    color:#fff;
    background:#0758f8;

    border:4px solid #fff;
    border-radius:50%;

    box-shadow:
        0 7px 18px
        rgba(0,81,255,.28);

    font-size:19px;
    line-height:1;

    transition:.18s;
}

.btn-editar-foto-perfil:hover{
    background:#0048df;
    transform:scale(1.06);
}

.btn-editar-foto-perfil:focus-visible{
    outline:
        3px solid
        rgba(0,81,255,.26);

    outline-offset:3px;
}

.modal-foto-perfil{
    max-width:620px;
    padding:28px;

    position:relative;

    overflow:hidden;

    text-align:left;
}

.foto-perfil-cabecalho{
    margin:0 42px 20px 0;
}

.foto-perfil-cabecalho h2{
    margin:0 0 6px;

    color:#171717;

    font-size:24px;
    font-weight:900;
    line-height:1.2;
}

.foto-perfil-cabecalho p{
    margin:0;

    color:#5e6673;

    font-size:14px;
    line-height:1.5;
}

.btn-fechar-foto-perfil{
    width:38px;
    height:38px;
    padding:0;

    display:grid;
    place-items:center;

    position:absolute;
    top:18px;
    right:18px;

    color:#637083;
    background:#f3f6fb;

    border:
        1px solid
        #e0e6ef;

    border-radius:50%;

    font-size:23px;
    line-height:1;
}

.btn-fechar-foto-perfil:hover{
    color:#0758f8;
    background:#edf3ff;
}

.foto-perfil-opcoes{
    display:grid;

    grid-template-columns:
        repeat(
            2,
            minmax(0,1fr)
        );

    gap:12px;
}

.btn-opcao-foto{
    min-height:108px;

    padding:18px 16px;

    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:8px;

    color:#17305c;
    background:#f8faff;

    border:
        1px solid
        #d9e4fa;

    border-radius:14px;

    font-weight:800;
    line-height:1.3;

    transition:.18s;
}

.btn-opcao-foto:hover{
    border-color:#0758f8;
    background:#edf3ff;

    transform:
        translateY(-1px);
}

.icone-opcao-foto{
    font-size:28px;
    line-height:1;
}

.btn-remover-foto-perfil{
    width:100%;
    min-height:44px;

    margin-top:12px;
    padding:10px 16px;

    color:#b42318;
    background:#fff7f6;

    border:
        1px solid
        #f2c5c0;

    border-radius:10px;

    font-weight:800;
}

.btn-remover-foto-perfil:hover:not(:disabled){
    background:#fff0ee;
}

.btn-remover-foto-perfil:disabled{
    opacity:.6;
    cursor:default;
}

.foto-perfil-recorte-instrucao{
    margin:0 0 14px;

    color:#505a69;

    font-size:14px;
    line-height:1.5;

    text-align:center;
}

.recorte-foto-area{
    width:min(320px,76vw);
    aspect-ratio:1;

    margin:
        0 auto 18px;

    overflow:hidden;

    background:#e8eef7;

    border:
        4px solid
        #fff;

    border-radius:50%;

    box-shadow:
        0 0 0 2px #0758f8,
        0 14px 32px
        rgba(27,54,98,.16);
}

#canvasFotoPerfil{
    width:100%;
    height:100%;

    display:block;

    border-radius:50%;

    cursor:grab;

    touch-action:none;
    user-select:none;
}

#canvasFotoPerfil:active{
    cursor:grabbing;
}

.controle-zoom-foto{
    max-width:420px;

    margin:
        0 auto 16px;
}

.controle-zoom-foto label{
    margin-bottom:8px;

    display:flex;
    justify-content:space-between;
    gap:12px;

    color:#303846;

    font-size:13px;
    font-weight:800;
}

#zoomFotoPerfil{
    width:100%;

    accent-color:#0758f8;
}

.acoes-recorte-foto{
    display:grid;

    grid-template-columns:
        repeat(
            3,
            minmax(0,1fr)
        );

    gap:10px;
}

.acoes-recorte-foto .btn{
    min-width:0;
}

.btn-centralizar-foto{
    color:#0758f8;
    background:#edf3ff;

    border-color:#c7d8ff;
}

.btn-centralizar-foto:hover{
    color:#fff;
    background:#0758f8;
}

.status-foto-perfil{
    margin:15px 0 0;
    padding:10px 12px;

    border-radius:9px;

    font-size:13px;
    font-weight:700;
    line-height:1.45;

    text-align:center;
}

.status-foto-perfil.carregando{
    color:#174ea6;
    background:#edf4ff;

    border:
        1px solid
        #bad0ff;
}

.status-foto-perfil.sucesso{
    color:#18713d;
    background:#eafaf0;

    border:
        1px solid
        #9ed8b3;
}

.status-foto-perfil.erro{
    color:#ad2828;
    background:#fff0f0;

    border:
        1px solid
        #efb4b4;
}

@media(max-width:650px){

    .btn-editar-foto-perfil{
        width:42px;
        height:42px;

        right:-1px;
        bottom:2px;

        border-width:3px;

        font-size:17px;
    }

    .modal-foto-perfil{
        width:
            calc(100% - 20px);

        max-height:
            calc(100vh - 20px);

        padding:
            24px 17px;

        overflow-y:auto;
    }

    .foto-perfil-opcoes,
    .acoes-recorte-foto{
        grid-template-columns:1fr;
    }

    .btn-opcao-foto{
        min-height:82px;

        flex-direction:row;
    }
}

@media(max-width:420px){

    .modal-foto-perfil{
        width:100%;

        min-height:100vh;
        max-height:100vh;

        padding:
            22px 14px;

        border-radius:0;
    }

    .foto-perfil-cabecalho{
        margin-right:38px;
    }

    .foto-perfil-cabecalho h2{
        font-size:21px;
    }

    .recorte-foto-area{
        width:
            min(300px,82vw);
    }
}
        `;

        document.head.appendChild(
            style
        );
    }

    if (
        !document.getElementById(
            "fotoPerfilCliente"
        )
    ) {
        const img =
            document.createElement("img");

        img.id =
            "fotoPerfilCliente";

        img.alt =
            "Foto de perfil do cliente";

        img.hidden = true;

        avatar.prepend(img);
    }

    if (
        !document.getElementById(
            "btnEditarFotoPerfil"
        )
    ) {
        const btn =
            document.createElement("button");

        btn.type = "button";

        btn.id =
            "btnEditarFotoPerfil";

        btn.className =
            "btn-editar-foto-perfil";

        btn.setAttribute(
            "aria-label",
            "Adicionar ou alterar foto de perfil"
        );

        btn.title =
            "Alterar foto de perfil";

        btn.textContent =
            "📷";

        container.appendChild(btn);
    }

    if (
        !document.getElementById(
            "modalFotoPerfil"
        )
    ) {
        const modal =
            document.createElement("div");

        modal.id =
            "modalFotoPerfil";

        modal.className =
            "modal";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.innerHTML = `
<div
    class="modal-content modal-foto-perfil"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tituloFotoPerfil"
>

    <button
        type="button"
        id="btnFecharFotoPerfil"
        class="btn-fechar-foto-perfil"
        aria-label="Fechar foto de perfil"
    >
        ×
    </button>

    <div class="foto-perfil-cabecalho">

        <h2 id="tituloFotoPerfil">
            Foto de perfil
        </h2>

        <p>
            Escolha uma foto, ajuste o enquadramento e salve.
        </p>

    </div>

    <div id="fotoPerfilEtapaEscolha">

        <div class="foto-perfil-opcoes">

            <button
                type="button"
                id="btnEscolherFotoPerfil"
                class="btn-opcao-foto"
            >
                <span
                    class="icone-opcao-foto"
                    aria-hidden="true"
                >
                    🖼️
                </span>

                Escolher da galeria
            </button>

            <button
                type="button"
                id="btnCameraFotoPerfil"
                class="btn-opcao-foto"
            >
                <span
                    class="icone-opcao-foto"
                    aria-hidden="true"
                >
                    📷
                </span>

                Usar câmera
            </button>

        </div>

        <button
            type="button"
            id="btnRemoverFotoPerfil"
            class="btn-remover-foto-perfil"
            hidden
        >
            Remover foto
        </button>

        <input
            type="file"
            id="inputFotoPerfil"
            accept="image/jpeg,image/png,image/webp"
            hidden
        >

        <input
            type="file"
            id="inputCameraFotoPerfil"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            hidden
        >

    </div>

    <div
        id="fotoPerfilEtapaRecorte"
        hidden
    >

        <p class="foto-perfil-recorte-instrucao">
            Arraste a foto para posicionar seu rosto e use o zoom para ajustar.
        </p>

        <div class="recorte-foto-area">

            <canvas
                id="canvasFotoPerfil"
                width="320"
                height="320"
                aria-label="Pré-visualização do recorte da foto"
            ></canvas>

        </div>

        <div class="controle-zoom-foto">

            <label for="zoomFotoPerfil">

                <span>
                    Zoom
                </span>

                <span aria-hidden="true">
                    − &nbsp; +
                </span>

            </label>

            <input
                type="range"
                id="zoomFotoPerfil"
                min="1"
                max="3"
                step="0.01"
                value="1"
            >

        </div>

        <div class="acoes-recorte-foto">

            <button
                type="button"
                id="btnCentralizarFotoPerfil"
                class="btn btn-centralizar-foto"
            >
                Centralizar
            </button>

            <button
                type="button"
                id="btnCancelarFotoPerfil"
                class="btn btn-outline"
            >
                Cancelar
            </button>

            <button
                type="button"
                id="btnSalvarFotoPerfil"
                class="btn"
            >
                Salvar foto
            </button>

        </div>

    </div>

    <p
        id="statusFotoPerfil"
        class="status-foto-perfil"
        role="status"
        aria-live="polite"
        hidden
    ></p>

</div>
        `;

        document.body.appendChild(
            modal
        );
    }
}

function elsFoto() {
    return {
        avatarInicial:
            document.getElementById(
                "avatarInicial"
            ),

        foto:
            document.getElementById(
                "fotoPerfilCliente"
            ),

        abrir:
            document.getElementById(
                "btnEditarFotoPerfil"
            ),

        modal:
            document.getElementById(
                "modalFotoPerfil"
            ),

        fechar:
            document.getElementById(
                "btnFecharFotoPerfil"
            ),

        cancelar:
            document.getElementById(
                "btnCancelarFotoPerfil"
            ),

        escolher:
            document.getElementById(
                "btnEscolherFotoPerfil"
            ),

        camera:
            document.getElementById(
                "btnCameraFotoPerfil"
            ),

        remover:
            document.getElementById(
                "btnRemoverFotoPerfil"
            ),

        salvar:
            document.getElementById(
                "btnSalvarFotoPerfil"
            ),

        centralizar:
            document.getElementById(
                "btnCentralizarFotoPerfil"
            ),

        arquivo:
            document.getElementById(
                "inputFotoPerfil"
            ),

        cameraInput:
            document.getElementById(
                "inputCameraFotoPerfil"
            ),

        escolha:
            document.getElementById(
                "fotoPerfilEtapaEscolha"
            ),

        recorte:
            document.getElementById(
                "fotoPerfilEtapaRecorte"
            ),

        canvas:
            document.getElementById(
                "canvasFotoPerfil"
            ),

        zoom:
            document.getElementById(
                "zoomFotoPerfil"
            ),

        status:
            document.getElementById(
                "statusFotoPerfil"
            )
    };
}

function prepararFotoPerfil(usuario) {
    const ctx =
        window.AzuryCliente || {};

    fotoPerfilState.userId =
        String(
            usuario?.id ||
            ctx.session?.user?.id ||
            ""
        );

    fotoPerfilState.supabase =
        ctx.supabase ||
        window.azurySupabase ||
        null;

    fotoPerfilState.path =
        fotoPerfilState.userId
            ? `${fotoPerfilState.userId}/${AZURY_AVATAR_FILE}`
            : "";

    garantirInterfaceFotoPerfil();
    conectarEventosFotoPerfil();
    atualizarBotaoRemover();

    if (
        fotoPerfilState.supabase &&
        fotoPerfilState.path
    ) {
        carregarFotoSalva();
    }
}

function conectarEventosFotoPerfil() {
    if (fotoPerfilState.bound) {
        return;
    }

    const e =
        elsFoto();

    if (!e.modal || !e.canvas) {
        return;
    }

    fotoPerfilState.bound = true;

    e.abrir?.addEventListener(
        "click",
        abrirModalFoto
    );

    e.fechar?.addEventListener(
        "click",
        fecharModalFoto
    );

    e.cancelar?.addEventListener(
        "click",
        fecharModalFoto
    );

    e.escolher?.addEventListener(
        "click",
        () => e.arquivo?.click()
    );

    e.camera?.addEventListener(
        "click",
        () => e.cameraInput?.click()
    );

    e.remover?.addEventListener(
        "click",
        removerFotoPerfil
    );

    e.salvar?.addEventListener(
        "click",
        salvarFotoPerfil
    );

    e.centralizar?.addEventListener(
        "click",
        centralizarFoto
    );

    e.zoom?.addEventListener(
        "input",
        alterarZoom
    );

    e.arquivo?.addEventListener(
        "change",
        event =>
            receberArquivo(
                event.target.files?.[0]
            )
    );

    e.cameraInput?.addEventListener(
        "change",
        event =>
            receberArquivo(
                event.target.files?.[0]
            )
    );

    e.modal.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                e.modal
            ) {
                fecharModalFoto();
            }
        }
    );

    e.canvas.addEventListener(
        "pointerdown",
        iniciarArraste
    );

    e.canvas.addEventListener(
        "pointermove",
        moverFoto
    );

    e.canvas.addEventListener(
        "pointerup",
        encerrarArraste
    );

    e.canvas.addEventListener(
        "pointercancel",
        encerrarArraste
    );

    e.canvas.addEventListener(
        "lostpointercapture",
        encerrarArraste
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                e.modal.style.display ===
                    "flex"
            ) {
                fecharModalFoto();
            }
        }
    );
}

function statusFoto(
    texto,
    tipo = ""
) {
    const el =
        elsFoto().status;

    if (!el) {
        return;
    }

    el.textContent =
        texto;

    el.classList.remove(
        "sucesso",
        "erro",
        "carregando"
    );

    if (tipo) {
        el.classList.add(tipo);
    }

    el.hidden =
        !texto;
}

function abrirModalFoto() {
    const e =
        elsFoto();

    limparFonte();

    if (e.escolha) {
        e.escolha.hidden = false;
    }

    if (e.recorte) {
        e.recorte.hidden = true;
    }

    statusFoto("");

    e.modal.style.display =
        "flex";

    e.modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    setTimeout(
        () => e.escolher?.focus(),
        20
    );
}

function fecharModalFoto() {
    const e =
        elsFoto();

    if (!e.modal) {
        return;
    }

    e.modal.style.display =
        "none";

    e.modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

    if (e.arquivo) {
        e.arquivo.value = "";
    }

    if (e.cameraInput) {
        e.cameraInput.value = "";
    }

    limparFonte();

    if (e.escolha) {
        e.escolha.hidden = false;
    }

    if (e.recorte) {
        e.recorte.hidden = true;
    }

    statusFoto("");
}

function atualizarBotaoRemover() {
    const btn =
        elsFoto().remover;

    if (btn) {
        btn.hidden =
            !Boolean(
                fotoPerfilState.avatarUrl
            );
    }
}

async function carregarFotoSalva() {
    const { data, error } =
        await fotoPerfilState
            .supabase
            .storage
            .from(
                AZURY_AVATAR_BUCKET
            )
            .download(
                fotoPerfilState.path,
                {},
                {
                    cache:
                        "no-store"
                }
            );

    if (error) {
        const msg =
            String(
                error.message || ""
            ).toLowerCase();

        if (
            !msg.includes("not found") &&
            !msg.includes("does not exist")
        ) {
            console.warn(
                "A foto de perfil não pôde ser carregada.",
                error
            );
        }

        mostrarAvatarPadrao();
        return;
    }

    if (data instanceof Blob) {
        mostrarAvatarBlob(data);
    }
}

function liberarAvatarUrl() {
    if (
        fotoPerfilState.avatarUrl
    ) {
        URL.revokeObjectURL(
            fotoPerfilState.avatarUrl
        );
    }

    fotoPerfilState.avatarUrl =
        "";
}

function mostrarAvatarBlob(blob) {
    const e =
        elsFoto();

    if (
        !e.foto ||
        !e.avatarInicial
    ) {
        return;
    }

    liberarAvatarUrl();

    fotoPerfilState.avatarUrl =
        URL.createObjectURL(blob);

    e.foto.src =
        fotoPerfilState.avatarUrl;

    e.foto.hidden =
        false;

    e.avatarInicial.hidden =
        true;

    e.avatarInicial.setAttribute(
        "aria-hidden",
        "true"
    );

    atualizarBotaoRemover();
}

function mostrarAvatarPadrao() {
    const e =
        elsFoto();

    liberarAvatarUrl();

    if (e.foto) {
        e.foto.removeAttribute(
            "src"
        );

        e.foto.hidden =
            true;
    }

    if (e.avatarInicial) {
        e.avatarInicial.hidden =
            false;

        e.avatarInicial.removeAttribute(
            "aria-hidden"
        );
    }

    atualizarBotaoRemover();
}

function receberArquivo(file) {
    if (!file) {
        return;
    }

    if (
        ![
            "image/jpeg",
            "image/png",
            "image/webp"
        ].includes(file.type)
    ) {
        statusFoto(
            "Escolha uma imagem JPG, PNG ou WebP.",
            "erro"
        );

        return;
    }

    if (
        file.size >
        15 * 1024 * 1024
    ) {
        statusFoto(
            "Essa imagem é muito grande. Escolha uma foto de até 15 MB para fazer o recorte.",
            "erro"
        );

        return;
    }

    limparFonte();

    fotoPerfilState.sourceUrl =
        URL.createObjectURL(file);

    const image =
        new Image();

    image.onload = () => {
        fotoPerfilState.image =
            image;

        configurarRecorte();

        const e =
            elsFoto();

        if (e.escolha) {
            e.escolha.hidden =
                true;
        }

        if (e.recorte) {
            e.recorte.hidden =
                false;
        }

        statusFoto("");

        desenharFoto();
    };

    image.onerror = () => {
        statusFoto(
            "Não foi possível abrir essa imagem.",
            "erro"
        );

        limparFonte();
    };

    image.src =
        fotoPerfilState.sourceUrl;
}

function limparFonte() {
    fotoPerfilState.image =
        null;

    fotoPerfilState.dragging =
        false;

    fotoPerfilState.pointerId =
        null;

    if (
        fotoPerfilState.sourceUrl
    ) {
        URL.revokeObjectURL(
            fotoPerfilState.sourceUrl
        );
    }

    fotoPerfilState.sourceUrl =
        "";
}

function configurarRecorte() {
    const e =
        elsFoto();

    const img =
        fotoPerfilState.image;

    if (
        !e.canvas ||
        !img
    ) {
        return;
    }

    fotoPerfilState.minScale =
        Math.max(
            e.canvas.width /
                img.naturalWidth,

            e.canvas.height /
                img.naturalHeight
        );

    fotoPerfilState.scale =
        fotoPerfilState.minScale;

    fotoPerfilState.x =
        (
            e.canvas.width -
            img.naturalWidth *
            fotoPerfilState.scale
        ) / 2;

    fotoPerfilState.y =
        (
            e.canvas.height -
            img.naturalHeight *
            fotoPerfilState.scale
        ) / 2;

    if (e.zoom) {
        e.zoom.value =
            "1";
    }

    limitarFoto();
}

function centralizarFoto() {
    configurarRecorte();
    desenharFoto();
}

function alterarZoom() {
    const e =
        elsFoto();

    const img =
        fotoPerfilState.image;

    if (
        !e.canvas ||
        !e.zoom ||
        !img
    ) {
        return;
    }

    const escalaAnterior =
        fotoPerfilState.scale;

    const centroImagemX =
        (
            e.canvas.width / 2 -
            fotoPerfilState.x
        ) /
        escalaAnterior;

    const centroImagemY =
        (
            e.canvas.height / 2 -
            fotoPerfilState.y
        ) /
        escalaAnterior;

    const multiplicador =
        Math.max(
            1,
            Math.min(
                3,
                Number(
                    e.zoom.value
                ) || 1
            )
        );

    const novaEscala =
        fotoPerfilState.minScale *
        multiplicador;

    fotoPerfilState.scale =
        novaEscala;

    fotoPerfilState.x =
        e.canvas.width / 2 -
        centroImagemX *
        novaEscala;

    fotoPerfilState.y =
        e.canvas.height / 2 -
        centroImagemY *
        novaEscala;

    limitarFoto();
    desenharFoto();
}

function limitarFoto() {
    const e =
        elsFoto();

    const img =
        fotoPerfilState.image;

    if (
        !e.canvas ||
        !img
    ) {
        return;
    }

    const largura =
        img.naturalWidth *
        fotoPerfilState.scale;

    const altura =
        img.naturalHeight *
        fotoPerfilState.scale;

    fotoPerfilState.x =
        Math.min(
            0,
            Math.max(
                e.canvas.width -
                largura,

                fotoPerfilState.x
            )
        );

    fotoPerfilState.y =
        Math.min(
            0,
            Math.max(
                e.canvas.height -
                altura,

                fotoPerfilState.y
            )
        );
}

function desenharFoto() {
    const e =
        elsFoto();

    const img =
        fotoPerfilState.image;

    if (
        !e.canvas ||
        !img
    ) {
        return;
    }

    const ctx =
        e.canvas.getContext(
            "2d"
        );

    if (!ctx) {
        return;
    }

    ctx.clearRect(
        0,
        0,
        e.canvas.width,
        e.canvas.height
    );

    ctx.fillStyle =
        "#eef3fb";

    ctx.fillRect(
        0,
        0,
        e.canvas.width,
        e.canvas.height
    );

    ctx.imageSmoothingEnabled =
        true;

    ctx.imageSmoothingQuality =
        "high";

    ctx.drawImage(
        img,
        fotoPerfilState.x,
        fotoPerfilState.y,
        img.naturalWidth *
            fotoPerfilState.scale,
        img.naturalHeight *
            fotoPerfilState.scale
    );
}

function iniciarArraste(event) {
    if (
        !fotoPerfilState.image
    ) {
        return;
    }

    fotoPerfilState.dragging =
        true;

    fotoPerfilState.pointerId =
        event.pointerId;

    fotoPerfilState.lastX =
        event.clientX;

    fotoPerfilState.lastY =
        event.clientY;

    event.currentTarget
        .setPointerCapture?.(
            event.pointerId
        );

    event.preventDefault();
}

function moverFoto(event) {
    if (
        !fotoPerfilState.dragging ||
        fotoPerfilState.pointerId !==
            event.pointerId
    ) {
        return;
    }

    fotoPerfilState.x +=
        event.clientX -
        fotoPerfilState.lastX;

    fotoPerfilState.y +=
        event.clientY -
        fotoPerfilState.lastY;

    fotoPerfilState.lastX =
        event.clientX;

    fotoPerfilState.lastY =
        event.clientY;

    limitarFoto();
    desenharFoto();

    event.preventDefault();
}

function encerrarArraste(event) {
    if (
        fotoPerfilState.pointerId !==
            null &&
        event.pointerId !==
            undefined &&
        fotoPerfilState.pointerId !==
            event.pointerId
    ) {
        return;
    }

    fotoPerfilState.dragging =
        false;

    fotoPerfilState.pointerId =
        null;
}

function gerarFotoFinal() {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const e =
                elsFoto();

            const img =
                fotoPerfilState.image;

            if (
                !e.canvas ||
                !img
            ) {
                reject(
                    new Error(
                        "Escolha uma foto antes de salvar."
                    )
                );

                return;
            }

            const canvasSaida =
                document.createElement(
                    "canvas"
                );

            canvasSaida.width =
                AZURY_AVATAR_OUTPUT;

            canvasSaida.height =
                AZURY_AVATAR_OUTPUT;

            const ctx =
                canvasSaida
                    .getContext(
                        "2d"
                    );

            if (!ctx) {
                reject(
                    new Error(
                        "Não foi possível preparar a imagem."
                    )
                );

                return;
            }

            const proporcao =
                AZURY_AVATAR_OUTPUT /
                e.canvas.width;

            ctx.fillStyle =
                "#fff";

            ctx.fillRect(
                0,
                0,
                canvasSaida.width,
                canvasSaida.height
            );

            ctx.imageSmoothingEnabled =
                true;

            ctx.imageSmoothingQuality =
                "high";

            ctx.drawImage(
                img,

                fotoPerfilState.x *
                    proporcao,

                fotoPerfilState.y *
                    proporcao,

                img.naturalWidth *
                    fotoPerfilState.scale *
                    proporcao,

                img.naturalHeight *
                    fotoPerfilState.scale *
                    proporcao
            );

            canvasSaida.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(
                            new Error(
                                "Não foi possível gerar a foto final."
                            )
                        );
                    }
                },

                "image/jpeg",
                0.9
            );
        }
    );
}

async function salvarFotoPerfil() {
    if (
        fotoPerfilState.saving
    ) {
        return;
    }

    const e =
        elsFoto();

    if (
        !fotoPerfilState.supabase ||
        !fotoPerfilState.path ||
        !fotoPerfilState.image
    ) {
        statusFoto(
            "Escolha uma foto antes de salvar.",
            "erro"
        );

        return;
    }

    fotoPerfilState.saving =
        true;

    if (e.salvar) {
        e.salvar.disabled =
            true;

        e.salvar.textContent =
            "Salvando...";
    }

    statusFoto(
        "Salvando sua foto...",
        "carregando"
    );

    try {
        const blob =
            await gerarFotoFinal();

        if (
            blob.size >
            2 * 1024 * 1024
        ) {
            throw new Error(
                "A foto final ultrapassou o limite de 2 MB. Escolha outra imagem."
            );
        }

        const { error } =
            await fotoPerfilState
                .supabase
                .storage
                .from(
                    AZURY_AVATAR_BUCKET
                )
                .upload(
                    fotoPerfilState.path,
                    blob,
                    {
                        contentType:
                            "image/jpeg",

                        cacheControl:
                            "3600",

                        upsert:
                            true
                    }
                );

        if (error) {
            throw error;
        }

        mostrarAvatarBlob(blob);

        statusFoto(
            "Foto salva com sucesso.",
            "sucesso"
        );

        setTimeout(
            fecharModalFoto,
            650
        );

    } catch (erro) {
        console.error(
            "Erro ao salvar foto de perfil:",
            erro
        );

        statusFoto(
            erro?.message ||
            "Não foi possível salvar a foto.",
            "erro"
        );

    } finally {
        fotoPerfilState.saving =
            false;

        if (e.salvar) {
            e.salvar.disabled =
                false;

            e.salvar.textContent =
                "Salvar foto";
        }
    }
}

async function removerFotoPerfil() {
    if (
        fotoPerfilState.saving ||
        !fotoPerfilState.supabase ||
        !fotoPerfilState.path
    ) {
        return;
    }

    const confirmou =
        window.confirm(
            "Remover sua foto de perfil? O avatar padrão da Azury voltará a aparecer."
        );

    if (!confirmou) {
        return;
    }

    const e =
        elsFoto();

    fotoPerfilState.saving =
        true;

    if (e.remover) {
        e.remover.disabled =
            true;

        e.remover.textContent =
            "Removendo...";
    }

    statusFoto(
        "Removendo sua foto...",
        "carregando"
    );

    try {
        const { error } =
            await fotoPerfilState
                .supabase
                .storage
                .from(
                    AZURY_AVATAR_BUCKET
                )
                .remove([
                    fotoPerfilState.path
                ]);

        if (error) {
            throw error;
        }

        mostrarAvatarPadrao();

        statusFoto(
            "Foto removida.",
            "sucesso"
        );

        setTimeout(
            fecharModalFoto,
            500
        );

    } catch (erro) {
        console.error(
            "Erro ao remover foto de perfil:",
            erro
        );

        statusFoto(
            erro?.message ||
            "Não foi possível remover a foto.",
            "erro"
        );

    } finally {
        fotoPerfilState.saving =
            false;

        if (e.remover) {
            e.remover.disabled =
                false;

            e.remover.textContent =
                "Remover foto";
        }

        atualizarBotaoRemover();
    }
}