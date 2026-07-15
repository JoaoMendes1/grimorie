let clienteSupabase;
let audioAtual = null; 
let botaoAudioAtual = null; 
let timerDigitacao;
let ultimaListaPalavras = [];
let idiomaOrigemAtual = [];
let categoriasAtuais = []; 
let palavraEmEdicaoId = null;
let ultimoCampoEditado = null; 
let filtroAtivo = 'Todos';
let termoBuscaAtual = '';

let catSelecionadaDesktop = null;
let catSelecionadaMobile = null;
let catSelecionadaEdit = null;
let acaoConfirmacaoPendente = null;

// --- UTILITÁRIOS DE SEGURANÇA ---
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- DELEGAÇÃO DE EVENTOS GLOBAL ---
document.addEventListener('click', function(e) {
    // Intercepta qualquer clique em elementos que tenham o atributo 'data-action'
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    
    // Ações de Palavras
    if (action === 'tocar-audio') {
        e.stopPropagation(); // Evita que o card expanda ao clicar no áudio
        tocarAudio(btn, btn.getAttribute('data-index'));
    }
    if (action === 'editar-palavra') {
        e.stopPropagation();
        prepararEdicao(btn.getAttribute('data-index'));
    }
    if (action === 'excluir-palavra') {
        e.stopPropagation();
        excluirPalavra(btn.getAttribute('data-id'));
    }
    // Ação de expandir/recolher card
    if (action === 'revelar-card') {
        // O 'btn' neste caso é o próprio card
        btn.classList.toggle('revealed');
    }
    
    // Ações de Categorias (Swatches)
    if (action === 'selecionar-categoria') {
        const id = btn.getAttribute('data-id') === 'null' ? null : parseInt(btn.getAttribute('data-id'));
        const origem = btn.getAttribute('data-origem');
        if (origem === 'desktop') selecionarCatDesktop(id);
        if (origem === 'mobile') selecionarCatMobile(id);
        if (origem === 'edit') selecionarCatEdit(id);
    }

    // Ação de Filtros
    if (action === 'selecionar-filtro') {
        const nome = btn.getAttribute('data-nome');
        selecionarFiltro(nome);
    }
    
    // Ações do Gerenciador de Categorias
    if (action === 'editar-categoria') iniciarEdicaoCategoria(btn.getAttribute('data-id'));
    if (action === 'salvar-categoria') salvarEdicaoCategoria(btn.getAttribute('data-id'));
    if (action === 'excluir-categoria') excluirCategoria(btn.getAttribute('data-id'));
});

// --- DELEGAÇÃO DE EVENTOS DE TECLADO ---
document.addEventListener('keydown', function(e) {
    const target = e.target;
    // Salvar categoria no gerenciador com "Enter"
    if (e.key === 'Enter' && target.matches('[data-action="enter-salvar-categoria"]')) {
        e.preventDefault(); // Evita qualquer comportamento padrão de formulário
        salvarEdicaoCategoria(target.getAttribute('data-id'));
    }
});

async function iniciarApp() {
    const res = await fetch('/api/config');
    const config = await res.json();
    clienteSupabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

    const { data: { session } } = await clienteSupabase.auth.getSession();
    document.getElementById('tela-loading').style.display = 'none';

    if (session) {
        document.getElementById('tela-login').style.display = 'none'; 
        document.getElementById('tela-app').style.display = 'block';
        document.getElementById('assinatura').style.display = 'block';
        await carregarCategorias();
        carregarLista(); 
    } else {
        document.getElementById('tela-login').style.display = 'flex'; 
        document.getElementById('tela-app').style.display = 'none';
        document.getElementById('assinatura').style.display = 'block';
    }

    clienteSupabase.auth.onAuthStateChange(async (event, sessionChange) => {
        if(sessionChange && !session) { 
            document.getElementById('tela-login').style.display = 'none'; 
            document.getElementById('tela-app').style.display = 'block';
            await carregarCategorias();
            carregarLista();  
        } else if (!sessionChange) { 
            document.getElementById('tela-login').style.display = 'flex'; 
            document.getElementById('tela-app').style.display = 'none';
        }
    });

    configurarAutoResize();
}
iniciarApp();

async function getHeaders() {
    const { data } = await clienteSupabase.auth.getSession();
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (data.session?.access_token || '') };
}

window.entrarComGoogle = async function() { await clienteSupabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } }); }
window.sair = async function() { await clienteSupabase.auth.signOut(); document.getElementById('lista-palavras').innerHTML = ''; }

// AUTO RESIZE PERFEITO PARA AS CAIXAS DE TEXTO
function configurarAutoResize() {
    const textareas = document.querySelectorAll('.auto-resize');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    });
}

function dispararResize(elementId) {
    const el = document.getElementById(elementId);
    if(el) {
        el.style.height = 'auto';
        el.style.height = (el.scrollHeight) + 'px';
    }
}

// TRADUÇÃO INTELIGENTE
function configurarTraducao(idOrigem, idDestino) {
    const campoOrigem = document.getElementById(idOrigem);
    const campoDestino = document.getElementById(idDestino);
    campoOrigem.addEventListener('input', function() {
        clearTimeout(timerDigitacao);
        const termo = this.value.trim();
        ultimoCampoEditado = idOrigem; 
        if (!termo) { campoDestino.value = ''; dispararResize(idDestino); return; }
        timerDigitacao = setTimeout(async () => {
            if (ultimoCampoEditado !== idOrigem) return;
            try {
                const res = await fetch('/api/translate', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termo }) });
                const dados = await res.json();
                campoDestino.value = dados.translation || "Erro";
                idiomaOrigemAtual = dados.sourceLang || 'en'; 
                dispararResize(idDestino);
            } catch (error) {}
        }, 600); 
    });
}
configurarTraducao('novo-termo', 'traducao-automatica'); configurarTraducao('traducao-automatica', 'novo-termo');
configurarTraducao('novo-termo-mobile', 'traducao-mobile'); configurarTraducao('traducao-mobile', 'novo-termo-mobile');
configurarTraducao('edit-termo', 'edit-traducao'); configurarTraducao('edit-traducao', 'edit-termo');

// MATEMÁTICA DE CORES
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash);
}

function obterEstiloCategoria(id, nome = "") {
    if (!id) return { corHex: '#00e676', bgTransparente: 'bg-[#00e676]/10', texto: 'text-[#00e676]' }; 
    const paleta = ['#00e5ff', '#b388ff', '#ffc107', '#f472b6', '#34d399', '#fb923c', '#818cf8', '#a78bfa', '#f87171', '#2dd4bf', '#e879f9', '#facc15'];
    const index = nome ? hashCode(nome) % paleta.length : id % paleta.length;
    const cor = paleta[index];
    return { corHex: cor, bgTransparente: `bg-[${cor}]/10`, texto: `text-[${cor}]` }; 
}

// SISTEMA DE CHIPS
async function carregarCategorias() {
    const res = await fetch('/api/categories', { method: 'GET', headers: await getHeaders()});
    categoriasAtuais = await res.json(); 
    atualizarSwatchesForms();
}

function renderSwatches(containerId, varSelecionada, origem) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const lista = [{id: null, name: 'Sem Categoria'}, ...categoriasAtuais];
    wrap.innerHTML = lista.map(cat => {
        const isSel = varSelecionada == cat.id;
        const estilo = obterEstiloCategoria(cat.id, cat.name);
        const bg = isSel ? hexToRgba(estilo.corHex, 0.2) : hexToRgba(estilo.corHex, 0.05);
        return `<button type="button" class="cat-swatch ${isSel ? 'selected' : ''} flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-[11px] font-semibold" style="background:${bg}; color:${estilo.corHex};" data-action="selecionar-categoria" data-id="${cat.id}" data-origem="${origem}">
                  <span class="w-3.5 h-3.5 rounded-full inline-block" style="background:${estilo.corHex};"></span>${escapeHTML(cat.name)}
                </button>`;
    }).join('');
}

window.selecionarCatDesktop = function(id) { catSelecionadaDesktop = id; atualizarSwatchesForms(); }
window.selecionarCatMobile = function(id) { catSelecionadaMobile = id; atualizarSwatchesForms(); }
window.selecionarCatEdit = function(id) { catSelecionadaEdit = id; atualizarSwatchesForms(); }

function atualizarSwatchesForms() {
    renderSwatches('cat-swatches-desktop', catSelecionadaDesktop, 'desktop');
    renderSwatches('cat-swatches-mobile', catSelecionadaMobile, 'mobile');
    renderSwatches('cat-swatches-edit', catSelecionadaEdit, 'edit');
}

window.toggleNovaCategoriaUI = function(origem) { document.getElementById(`new-cat-row-${origem}`).classList.toggle('hidden'); }

window.salvarNovaCategoriaUI = async function(origem) {
    const input = document.getElementById(`new-cat-input-${origem}`);
    const nome = input.value.trim();
    if (!nome) return;

    const existente = categoriasAtuais.find(c => c.name.toLowerCase() === nome.toLowerCase());
    if (existente) {
        input.value = ''; document.getElementById(`new-cat-row-${origem}`).classList.add('hidden');
        if(origem === 'desktop') selecionarCatDesktop(existente.id);
        if(origem === 'mobile') selecionarCatMobile(existente.id);
        return; 
    }

    const res = await fetch('/api/categories', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ name: nome }) });
    const dados = await res.json();
    await carregarCategorias();
    input.value = ''; document.getElementById(`new-cat-row-${origem}`).classList.add('hidden');
    if(origem === 'desktop') selecionarCatDesktop(dados.id);
    if(origem === 'mobile') selecionarCatMobile(dados.id);
}

// GERENCIADOR DE CATEGORIAS
window.abrirGerenciadorCategorias = function() { renderizarListaGerenciador(); document.getElementById('modal-gerenciador-categorias').classList.replace('hidden', 'flex'); }
window.fecharGerenciadorCategorias = function() { document.getElementById('modal-gerenciador-categorias').classList.replace('flex', 'hidden'); }

function renderizarListaGerenciador() {
    const container = document.getElementById('lista-categorias-gerenciador');
    if(categoriasAtuais.length === 0) { container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Nenhuma categoria criada.</p>'; return; }
    
    container.innerHTML = categoriasAtuais.map(cat => {
        const estilo = obterEstiloCategoria(cat.id, cat.name);
        const nomeSeguro = escapeHTML(cat.name);
        return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-[#1f2937]/30 border border-[#1f2937] hover:border-[#374151] transition-colors group">
                <div class="flex items-center gap-2 flex-1" id="cat-display-${cat.id}">
                    <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${estilo.corHex};"></span>
                    <span class="text-sm font-semibold text-gray-300">${nomeSeguro}</span>
                </div>
                <div class="hidden flex-1 items-center gap-2" id="cat-edit-${cat.id}">
                    <input type="text" id="cat-input-${cat.id}" value="${nomeSeguro}" class="input-dark w-full px-3 py-1.5 rounded-lg text-xs" data-action="enter-salvar-categoria" data-id="${cat.id}">
                    <button data-action="salvar-categoria" data-id="${cat.id}" class="text-[#00e5ff] hover:text-white p-1"><i class="ph-fill ph-check-circle text-lg pointer-events-none"></i></button>
                </div>
                <div class="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity ml-2" id="cat-actions-${cat.id}">
                    <button data-action="editar-categoria" data-id="${cat.id}" class="text-gray-400 hover:text-white transition-colors"><i class="ph-fill ph-pencil-simple text-base pointer-events-none"></i></button>
                    <button data-action="excluir-categoria" data-id="${cat.id}" class="text-gray-400 hover:text-red-500 transition-colors"><i class="ph-fill ph-trash text-base pointer-events-none"></i></button>
                </div>
            </div>`;
    }).join('');
}

window.iniciarEdicaoCategoria = function(id) {
    document.getElementById(`cat-display-${id}`).classList.add('hidden');
    document.getElementById(`cat-actions-${id}`).classList.add('hidden');
    document.getElementById(`cat-edit-${id}`).classList.remove('hidden'); document.getElementById(`cat-edit-${id}`).classList.add('flex');
    document.getElementById(`cat-input-${id}`).focus();
}

window.salvarEdicaoCategoria = async function(id) {
    const novoNome = document.getElementById(`cat-input-${id}`).value.trim();
    if (!novoNome) return;
    await fetch('/api/categories/' + id, { method: 'PUT', headers: await getHeaders(), body: JSON.stringify({ name: novoNome }) });
    await carregarCategorias(); renderizarListaGerenciador(); carregarLista(); 
}

window.excluirCategoria = function(id) {
    abrirConfirmacao("Excluir Categoria?", "As palavras desta categoria ficarão 'Sem Categoria'.", async () => {
        await fetch('/api/categories/' + id, { method: 'DELETE', headers: await getHeaders() });
        await carregarCategorias(); renderizarListaGerenciador(); carregarLista();
    });
}

// CONFIRMAÇÃO GLOBAL
window.abrirConfirmacao = function(titulo, descricao, acaoConfirma) {
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-desc').textContent = descricao;
    acaoConfirmacaoPendente = acaoConfirma;
    document.getElementById('modal-confirmacao').classList.replace('hidden', 'flex');
}

window.fecharConfirmacao = function() {
    acaoConfirmacaoPendente = null;
    document.getElementById('modal-confirmacao').classList.replace('flex', 'hidden');
}

document.getElementById('confirm-action-btn').addEventListener('click', () => {
    if(acaoConfirmacaoPendente) acaoConfirmacaoPendente();
    fecharConfirmacao();
});

// FILTROS
function renderizarFiltros() {
    const wrap = document.getElementById('filter-chips');
    const nomesCategorias = ['Todos', ...categoriasAtuais.map(c => c.name), 'Sem Categoria'];
    
    wrap.innerHTML = nomesCategorias.map(nome => {
        let estilo = nome === 'Todos' ? { corHex: '#9ca3af' } : (nome === 'Sem Categoria' ? obterEstiloCategoria(null) : obterEstiloCategoria(categoriasAtuais.find(c => c.name === nome)?.id, nome));
        const ativo = filtroAtivo === nome;
        const styleAtivo = ativo ? `background-color: ${estilo.corHex}; color: #000; border-color: transparent;` : `color: ${estilo.corHex}; border-color: ${nome === 'Todos' ? '#374151' : hexToRgba(estilo.corHex, 0.4)};`;
        
        // Sanitiza o nome para não quebrar o HTML nem executar scripts
        const nomeSeguro = escapeHTML(nome);
        
        return `<button data-action="selecionar-filtro" data-nome="${nomeSeguro}" class="whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all ${ativo ? 'shadow-[0_0_10px_rgba(255,255,255,0.15)]' : 'hover:bg-white/5'}" style="${styleAtivo}">${nomeSeguro}</button>`;
    }).join('');
}
window.selecionarFiltro = function(nome) { filtroAtivo = nome; renderizarFiltros(); aplicarFiltrosEBuscar(); }
window.filtrarLista = function(termo) { termoBuscaAtual = termo.toLowerCase(); aplicarFiltrosEBuscar(); }

// PALAVRAS (Salvar, Listar, Editar)
window.salvarPalavra = async function(origem = 'desktop') {
    const sufixo = origem === 'mobile' ? '-mobile' : '';
    const termo = document.getElementById('novo-termo' + sufixo).value.trim();
    const traducao = document.getElementById('traducao' + (origem === 'mobile' ? '-mobile' : '-automatica')).value.trim();
    const categoriaId = origem === 'mobile' ? catSelecionadaMobile : catSelecionadaDesktop;
    
    if (!termo || !traducao) return;

    let termoFinal = termo; let traducaoFinal = traducao; 
    const origemPt = idiomaOrigemAtual.toLowerCase().startsWith('pt');
    if ((ultimoCampoEditado && ultimoCampoEditado.includes('termo') && origemPt) || (ultimoCampoEditado && ultimoCampoEditado.includes('traducao') && !origemPt)) {
        termoFinal = traducao; traducaoFinal = termo;  
    }

    const resAud = await fetch('/api/audio', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termoFinal }) });
    const dadosAud = await resAud.json();

    await fetch('/api/words', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termoFinal, translation: traducaoFinal, audioUrl: dadosAud.audioUrl || "", category_id: categoriaId }) });

    document.getElementById('novo-termo' + sufixo).value = ''; dispararResize('novo-termo' + sufixo);
    document.getElementById('traducao' + (origem === 'mobile' ? '-mobile' : '-automatica')).value = ''; dispararResize('traducao' + (origem === 'mobile' ? '-mobile' : '-automatica'));

    if(origem === 'mobile') fecharModalMobile();
    carregarLista();
}

function aplicarFiltrosEBuscar() {
    const lista = document.getElementById('lista-palavras');
    const emptyState = document.getElementById('empty-state');
    lista.innerHTML = '';

    const palavrasFiltradas = ultimaListaPalavras.filter(palavra => {
        let nomeCat = "Sem Categoria";
        if (palavra.category_id) { const cat = categoriasAtuais.find(c => c.id === palavra.category_id); if (cat) nomeCat = cat.name; }
        const passaFiltro = filtroAtivo === 'Todos' || nomeCat === filtroAtivo;
        const passaBusca = !termoBuscaAtual || (palavra.term + " " + palavra.translation).toLowerCase().includes(termoBuscaAtual);
        return passaFiltro && passaBusca;
    });

    document.getElementById('stat-line').textContent = `${palavrasFiltradas.length} REGISTRO${palavrasFiltradas.length !== 1 ? 'S' : ''} · ${categoriasAtuais.length} CATEGORIAS`;

    if (palavrasFiltradas.length === 0) { emptyState.classList.replace('hidden', 'flex'); return; }
    emptyState.classList.replace('flex', 'hidden');

    palavrasFiltradas.forEach((palavra, index) => {
        let nomeCategoria = "Sem Categoria";
        if (palavra.category_id) { const cat = categoriasAtuais.find(c => c.id === palavra.category_id); if (cat) nomeCategoria = cat.name; }
        const estilo = obterEstiloCategoria(palavra.category_id, nomeCategoria !== "Sem Categoria" ? nomeCategoria : "");

       lista.innerHTML += `
            <div class="registro-item panel p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl flex flex-col relative overflow-hidden transition-all cursor-pointer group border border-[#1f2937]/50" data-action="revelar-card">
                <div class="absolute left-0 top-0 bottom-0 w-1 opacity-80" style="background-color: ${estilo.corHex};"></div>
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[9px] font-bold ${estilo.texto} uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5" style="border-color:${hexToRgba(estilo.corHex,0.3)}; background:${hexToRgba(estilo.corHex,0.1)};">
                        ${escapeHTML(nomeCategoria)}
                    </span>
                    <div class="flex items-center gap-3 text-gray-500 opacity-60 group-hover:opacity-100 transition-opacity" data-action="stop-propagation">
                        <button data-action="tocar-audio" data-index="${index}" class="btn-audio hover:text-[#00e5ff] p-1 transition-colors"><i class="ph-fill ph-speaker-high text-lg pointer-events-none"></i></button>
                        <button data-action="editar-palavra" data-index="${index}" class="hover:text-white p-1 transition-colors"><i class="ph-fill ph-pencil-simple text-lg pointer-events-none"></i></button>
                        <button data-action="excluir-palavra" data-id="${palavra.id}" class="hover:text-red-500 p-1 transition-colors"><i class="ph-fill ph-trash text-lg pointer-events-none"></i></button>
                        <i class="ph ph-caret-down chevron text-sm ml-1 text-gray-400 pointer-events-none"></i>
                    </div>
                </div>
                <h3 class="text-[15px] sm:text-[17px] font-semibold text-white leading-snug pr-2">${escapeHTML(palavra.term || "")}</h3>
                <div class="flashcard-reveal">
                    <div>
                        <div class="h-px w-full bg-[#1f2937] my-3 relative"><div class="absolute left-0 top-0 h-full w-12" style="background: linear-gradient(90deg, ${estilo.corHex}, transparent);"></div></div>
                        <p class="text-[13px] sm:text-[14px] text-gray-400 leading-relaxed pb-1">${escapeHTML(palavra.translation || "")}</p>
                    </div>
                </div>
            </div>`;
    });
}

async function carregarLista() {
    fetch('/api/words', { method: 'GET', headers: await getHeaders() }).then(res => res.json()).then(dados => {
        ultimaListaPalavras = dados; renderizarFiltros(); aplicarFiltrosEBuscar();
    });
}

window.prepararEdicao = function(index) {
    const palavra = ultimaListaPalavras[index]; palavraEmEdicaoId = palavra.id;
    document.getElementById('edit-termo').value = palavra.term || ""; 
    document.getElementById('edit-traducao').value = palavra.translation || "";
    selecionarCatEdit(palavra.category_id); 
    
    document.getElementById('modal-edicao').classList.replace('hidden', 'flex');

    setTimeout(() => {
        dispararResize('edit-termo');
        dispararResize('edit-traducao');
    }, 10);
}

window.fecharModal = function() { palavraEmEdicaoId = null; document.getElementById('modal-edicao').classList.replace('flex', 'hidden'); }

window.salvarEdicao = async function() {
    if (!palavraEmEdicaoId) return;
    const termo = document.getElementById('edit-termo').value.trim();
    const traducao = document.getElementById('edit-traducao').value.trim();
    
    // Força o servidor a recriar o áudio do texto atualizado
    const resAud = await fetch('/api/audio', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termo }) });
    const dadosAud = await resAud.json();

    await fetch('/api/words/' + palavraEmEdicaoId, { 
        method: 'PUT', headers: await getHeaders(), 
        body: JSON.stringify({ term: termo, translation: traducao, category_id: catSelecionadaEdit, audioUrl: dadosAud.audioUrl || "" }) 
    });
    fecharModal(); carregarLista();
}

window.excluirPalavra = function(id) {
    abrirConfirmacao("Excluir Registro?", "Esta ação é irreversível.", async () => {
        await fetch('/api/words/' + id, { method: 'DELETE', headers: await getHeaders() });
        carregarLista();
    });
}

// CORREÇÃO DO CACHE DE ÁUDIO NO NAVEGADOR
function resetarBotaoAudio() { 
    document.querySelectorAll('.btn-audio').forEach(btn => btn.classList.remove('text-[#00e5ff]'));
    botaoAudioAtual = null; 
}

window.tocarAudio = async function(botao, index) {
    const urlOriginal = ultimaListaPalavras[index].audioUrl || ""; 
    const texto = ultimaListaPalavras[index].term || "";
    
    if (botaoAudioAtual === botao) { if (audioAtual) audioAtual.pause(); window.speechSynthesis.cancel(); resetarBotaoAudio(); return; }
    
    if (audioAtual) { audioAtual.pause(); audioAtual.currentTime = 0; } 
    window.speechSynthesis.cancel(); resetarBotaoAudio(); 
    
    botaoAudioAtual = botao; botaoAudioAtual.classList.add('text-[#00e5ff]'); 
    
    try {
        // 1. O botão não toca mais direto! Ele "pede permissão" ao servidor Go primeiro.
        const response = await fetch('/api/audio', {
            method: 'POST',
            headers: await getHeaders(), // Injeta o token JWT de segurança
            body: JSON.stringify({ term: texto }) 
        });

        // 2. O Escudo em ação: Se você clicar rápido demais, o Go devolve o erro 429
        if (response.status === 429) {
            console.warn("🛡️ Servidor Go bloqueou a reprodução por excesso de cliques rápidos.");
            resetarBotaoAudio(); // Desliga a cor do botão
            return; // Aborta tudo AQUI antes de acessar o Google e tomar bloqueio de IP
        }

        if (!response.ok) throw new Error('Falha no servidor ao processar o áudio');

        // 3. O Go liberou! Pegamos o JSON da resposta
        const dadosAud = await response.json();
        
        // Usamos a URL retornada pelo Go (ou a do banco de dados como garantia)
        const urlSegura = dadosAud.audioUrl || urlOriginal;

        if (urlSegura && urlSegura.startsWith('http')) { 
            // Quebra o cache do navegador
            const urlSemCache = urlSegura + (urlSegura.includes('?') ? '&' : '?') + 'cb=' + new Date().getTime(); // Evita cache
            
            audioAtual = new Audio(urlSemCache); 
            audioAtual.onended = resetarBotaoAudio; 
            audioAtual.play().catch(() => resetarBotaoAudio()); 
        } else { 
            // Plano B (Fallback nativo do navegador)
            const sintese = new SpeechSynthesisUtterance(texto); 
            sintese.lang = 'en-US'; 
            sintese.onend = resetarBotaoAudio; 
            window.speechSynthesis.speak(sintese); 
        }

    } catch (erro) {
        console.error('Erro na requisição de áudio:', erro);
        resetarBotaoAudio();
    }
}
// MOBILE
window.abrirModalMobile = function() { 
    document.getElementById('modal-mobile').classList.replace('hidden', 'flex'); 
    document.body.style.overflow = 'hidden'; 
}
window.fecharModalMobile = function() { 
    document.getElementById('modal-mobile').classList.replace('flex', 'hidden'); 
    document.body.style.overflow = ''; 
}

// 🚀 AUTOSCROLL DO TECLADO
// Quando um campo ganha foco, rola o modal para mostrar o botão "Salvar"
document.querySelectorAll('#modal-mobile textarea, #modal-mobile input').forEach(campo => {
    campo.addEventListener('focus', () => {
        setTimeout(() => {
            const modal = document.getElementById('modal-mobile');
            modal.scrollTo({
                top: modal.scrollHeight,
                behavior: 'smooth'
            });
        }, 350); // 350ms é o tempo médio da animação do teclado subir
    });
});