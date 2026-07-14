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

async function iniciarApp() {
    const res = await fetch('/api/config');
    const config = await res.json();
    clienteSupabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

    const { data: { session } } = await clienteSupabase.auth.getSession();
    document.getElementById('tela-loading').style.display = 'none';

    if (session) {
        document.getElementById('tela-login').style.display = 'none'; 
        document.getElementById('tela-app').style.display = 'block';
        await carregarCategorias();
        carregarLista(); 
    } else {
        document.getElementById('tela-login').style.display = 'flex'; 
        document.getElementById('tela-app').style.display = 'none';
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
}
iniciarApp();

async function getHeaders() {
    const { data } = await clienteSupabase.auth.getSession();
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (data.session?.access_token || '') };
}

window.entrarComGoogle = async function() { await clienteSupabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } }); }
window.sair = async function() { await clienteSupabase.auth.signOut(); document.getElementById('lista-palavras').innerHTML = ''; }

// TRADUÇÃO INTELIGENTE
function configurarTraducao(idOrigem, idDestino) {
    const campoOrigem = document.getElementById(idOrigem);
    const campoDestino = document.getElementById(idDestino);
    campoOrigem.addEventListener('input', function() {
        clearTimeout(timerDigitacao);
        const termo = this.value.trim();
        ultimoCampoEditado = idOrigem; 
        if (!termo) { campoDestino.value = ''; campoDestino.style.height = 'auto'; return; }
        timerDigitacao = setTimeout(async () => {
            if (ultimoCampoEditado !== idOrigem) return;
            try {
                const res = await fetch('/api/translate', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termo }) });
                const dados = await res.json();
                campoDestino.value = dados.translation || "Erro";
                idiomaOrigemAtual = dados.sourceLang || 'en'; 
                campoDestino.style.height = 'auto'; campoDestino.style.height = campoDestino.scrollHeight + 'px';
            } catch (error) {}
        }, 600); 
    });
}
configurarTraducao('novo-termo', 'traducao-automatica'); configurarTraducao('traducao-automatica', 'novo-termo');
configurarTraducao('novo-termo-mobile', 'traducao-mobile'); configurarTraducao('traducao-mobile', 'novo-termo-mobile');
configurarTraducao('edit-termo', 'edit-traducao'); configurarTraducao('edit-traducao', 'edit-termo');

// MATEMÁTICA DE CORES PREMIUM (Usando Hash do Nome para evitar repetição)
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
    if (!id) return { corHex: '#00e676', bgTransparente: 'bg-[#00e676]/10', texto: 'text-[#00e676]' }; // Sem Categoria = Verde
    
    // Paleta estendida para 12 cores sci-fi
    const paleta = ['#00e5ff', '#b388ff', '#ffc107', '#f472b6', '#34d399', '#fb923c', '#818cf8', '#a78bfa', '#f87171', '#2dd4bf', '#e879f9', '#facc15'];
    const index = nome ? hashCode(nome) % paleta.length : id % paleta.length;
    const cor = paleta[index];
    
    return { corHex: cor, bgTransparente: `bg-[${cor}]/10`, texto: `text-[${cor}]` }; 
}

// SISTEMA DE CHIPS E CATEGORIAS
async function carregarCategorias() {
    const res = await fetch('/api/categories', { method: 'GET', headers: await getHeaders()});
    categoriasAtuais = await res.json(); 
    atualizarSwatchesForms();
}

function renderSwatches(containerId, varSelecionada, onChangeCallback) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    
    const lista = [{id: null, name: 'Sem Categoria'}, ...categoriasAtuais];
    wrap.innerHTML = lista.map(cat => {
        const isSel = varSelecionada == cat.id;
        const estilo = obterEstiloCategoria(cat.id, cat.name);
        const bg = isSel ? hexToRgba(estilo.corHex, 0.2) : hexToRgba(estilo.corHex, 0.05);
        
        return `<button type="button" class="cat-swatch ${isSel ? 'selected' : ''} flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-[11px] font-semibold" style="background:${bg}; color:${estilo.corHex};" onclick="${onChangeCallback}(${cat.id})">
                  <span class="w-3.5 h-3.5 rounded-full inline-block" style="background:${estilo.corHex};"></span>${cat.name}
                </button>`;
    }).join('');
}

window.selecionarCatDesktop = function(id) { catSelecionadaDesktop = id; atualizarSwatchesForms(); }
window.selecionarCatMobile = function(id) { catSelecionadaMobile = id; atualizarSwatchesForms(); }
window.selecionarCatEdit = function(id) { catSelecionadaEdit = id; atualizarSwatchesForms(); }

function atualizarSwatchesForms() {
    renderSwatches('cat-swatches-desktop', catSelecionadaDesktop, 'selecionarCatDesktop');
    renderSwatches('cat-swatches-mobile', catSelecionadaMobile, 'selecionarCatMobile');
    renderSwatches('cat-swatches-edit', catSelecionadaEdit, 'selecionarCatEdit');
}

window.toggleNovaCategoriaUI = function(origem) { document.getElementById(`new-cat-row-${origem}`).classList.toggle('hidden'); }

window.salvarNovaCategoriaUI = async function(origem) {
    const input = document.getElementById(`new-cat-input-${origem}`);
    const nome = input.value.trim();
    if (!nome) return;

    // Trava de Duplicidade (Case Insensitive)
    const existente = categoriasAtuais.find(c => c.name.toLowerCase() === nome.toLowerCase());
    if (existente) {
        input.value = ''; document.getElementById(`new-cat-row-${origem}`).classList.add('hidden');
        if(origem === 'desktop') selecionarCatDesktop(existente.id);
        if(origem === 'mobile') selecionarCatMobile(existente.id);
        return; // Sai da função sem salvar no banco
    }

    const res = await fetch('/api/categories', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ name: nome }) });
    const dados = await res.json();
    
    await carregarCategorias();
    input.value = ''; document.getElementById(`new-cat-row-${origem}`).classList.add('hidden');
    if(origem === 'desktop') selecionarCatDesktop(dados.id);
    if(origem === 'mobile') selecionarCatMobile(dados.id);
}

// GERENCIADOR DE CATEGORIAS (Editar/Excluir)
window.abrirGerenciadorCategorias = function() {
    renderizarListaGerenciador();
    const m = document.getElementById('modal-gerenciador-categorias');
    m.classList.remove('hidden'); m.classList.add('flex');
}

window.fecharGerenciadorCategorias = function() {
    const m = document.getElementById('modal-gerenciador-categorias');
    m.classList.add('hidden'); m.classList.remove('flex');
}

function renderizarListaGerenciador() {
    const container = document.getElementById('lista-categorias-gerenciador');
    if(categoriasAtuais.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Nenhuma categoria criada.</p>';
        return;
    }
    
    container.innerHTML = categoriasAtuais.map(cat => {
        const estilo = obterEstiloCategoria(cat.id, cat.name);
        return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-[#1f2937]/30 border border-[#1f2937] hover:border-[#374151] transition-colors group">
                <div class="flex items-center gap-2 flex-1" id="cat-display-${cat.id}">
                    <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${estilo.corHex};"></span>
                    <span class="text-sm font-semibold text-gray-300">${cat.name}</span>
                </div>
                <div class="hidden flex-1 items-center gap-2" id="cat-edit-${cat.id}">
                    <input type="text" id="cat-input-${cat.id}" value="${cat.name.replace(/"/g, '&quot;')}" class="input-dark w-full px-3 py-1.5 rounded-lg text-xs" onkeypress="if(event.key === 'Enter') salvarEdicaoCategoria(${cat.id})">
                    <button onclick="salvarEdicaoCategoria(${cat.id})" class="text-[#00e5ff] hover:text-white p-1"><i class="ph-fill ph-check-circle text-lg"></i></button>
                </div>
                <div class="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity ml-2" id="cat-actions-${cat.id}">
                    <button onclick="iniciarEdicaoCategoria(${cat.id})" class="text-gray-400 hover:text-white transition-colors"><i class="ph-fill ph-pencil-simple text-base"></i></button>
                    <button onclick="excluirCategoria(${cat.id})" class="text-gray-400 hover:text-red-500 transition-colors"><i class="ph-fill ph-trash text-base"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.iniciarEdicaoCategoria = function(id) {
    document.getElementById(`cat-display-${id}`).classList.add('hidden');
    document.getElementById(`cat-actions-${id}`).classList.add('hidden');
    document.getElementById(`cat-edit-${id}`).classList.remove('hidden');
    document.getElementById(`cat-edit-${id}`).classList.add('flex');
    document.getElementById(`cat-input-${id}`).focus();
}

window.salvarEdicaoCategoria = async function(id) {
    const input = document.getElementById(`cat-input-${id}`);
    const novoNome = input.value.trim();
    if (!novoNome) return;

    await fetch('/api/categories/' + id, { method: 'PUT', headers: await getHeaders(), body: JSON.stringify({ name: novoNome }) });
    await carregarCategorias();
    renderizarListaGerenciador();
    carregarLista(); // Atualiza a tela principal para refletir a nova cor/nome
}

window.excluirCategoria = function(id) {
    abrirConfirmacao("Excluir Categoria?", "As palavras desta categoria não serão apagadas, mas ficarão 'Sem Categoria'.", async () => {
        await fetch('/api/categories/' + id, { method: 'DELETE', headers: await getHeaders() });
        await carregarCategorias();
        renderizarListaGerenciador();
        carregarLista();
    });
}

// CONFIRMAÇÃO GLOBAL
window.abrirConfirmacao = function(titulo, descricao, acaoConfirma) {
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-desc').textContent = descricao;
    acaoConfirmacaoPendente = acaoConfirma;
    const m = document.getElementById('modal-confirmacao');
    m.classList.remove('hidden'); m.classList.add('flex');
}

window.fecharConfirmacao = function() {
    acaoConfirmacaoPendente = null;
    const m = document.getElementById('modal-confirmacao');
    m.classList.add('hidden'); m.classList.remove('flex');
}

document.getElementById('confirm-action-btn').addEventListener('click', () => {
    if(acaoConfirmacaoPendente) acaoConfirmacaoPendente();
    fecharConfirmacao();
});

// FILTROS PRINCIPAIS DA TELA
function renderizarFiltros() {
    const wrap = document.getElementById('filter-chips');
    const nomesCategorias = ['Todos', ...categoriasAtuais.map(c => c.name), 'Sem Categoria'];
    
    wrap.innerHTML = nomesCategorias.map(nome => {
        let estilo;
        if (nome === 'Todos') { estilo = { corHex: '#9ca3af' }; } 
        else if (nome === 'Sem Categoria') { estilo = obterEstiloCategoria(null); } 
        else { const cat = categoriasAtuais.find(c => c.name === nome); estilo = obterEstiloCategoria(cat ? cat.id : null, nome); }
        
        const ativo = filtroAtivo === nome;
        const styleAtivo = ativo ? `background-color: ${estilo.corHex}; color: #000; border-color: transparent;` : `color: ${estilo.corHex}; border-color: ${nome === 'Todos' ? '#374151' : hexToRgba(estilo.corHex, 0.4)};`;
        
        return `<button onclick="selecionarFiltro('${nome}')" class="whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all ${ativo ? 'shadow-[0_0_10px_rgba(255,255,255,0.15)]' : 'hover:bg-white/5'}" style="${styleAtivo}">${nome}</button>`;
    }).join('');
}

window.selecionarFiltro = function(nome) { filtroAtivo = nome; renderizarFiltros(); aplicarFiltrosEBuscar(); }
window.filtrarLista = function(termo) { termoBuscaAtual = termo.toLowerCase(); aplicarFiltrosEBuscar(); }

// PALAVRAS (Salvar, Listar, Editar, Excluir)
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

    const elTermo = document.getElementById('novo-termo' + sufixo);
    const elTrad = document.getElementById('traducao' + (origem === 'mobile' ? '-mobile' : '-automatica'));
    elTermo.value = ''; elTermo.style.height = 'auto';
    elTrad.value = ''; elTrad.style.height = 'auto';

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

    if (palavrasFiltradas.length === 0) { emptyState.classList.remove('hidden'); emptyState.classList.add('flex'); return; }
    emptyState.classList.add('hidden'); emptyState.classList.remove('flex');

    palavrasFiltradas.forEach((palavra, index) => {
        let nomeCategoria = "Sem Categoria";
        if (palavra.category_id) { const cat = categoriasAtuais.find(c => c.id === palavra.category_id); if (cat) nomeCategoria = cat.name; }
        const estilo = obterEstiloCategoria(palavra.category_id, nomeCategoria !== "Sem Categoria" ? nomeCategoria : "");

        lista.innerHTML += `
            <div class="registro-item panel p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl flex flex-col relative overflow-hidden transition-all cursor-pointer group border border-[#1f2937]/50" onclick="this.classList.toggle('revealed')">
                <div class="absolute left-0 top-0 bottom-0 w-1 opacity-80" style="background-color: ${estilo.corHex};"></div>
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[9px] font-bold ${estilo.texto} uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5" style="border-color:${hexToRgba(estilo.corHex,0.3)}; background:${hexToRgba(estilo.corHex,0.1)};">
                        ${nomeCategoria}
                    </span>
                    <div class="flex items-center gap-3 text-gray-500 opacity-60 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation()">
                        <button onclick="tocarAudio(this, ${index})" class="btn-audio hover:text-[#00e5ff] p-1 transition-colors"><i class="ph-fill ph-speaker-high text-lg"></i></button>
                        <button onclick="prepararEdicao(${index})" class="hover:text-white p-1 transition-colors"><i class="ph-fill ph-pencil-simple text-lg"></i></button>
                        <button onclick="excluirPalavra(${palavra.id})" class="hover:text-red-500 p-1 transition-colors"><i class="ph-fill ph-trash text-lg"></i></button>
                        <i class="ph ph-caret-down chevron text-sm ml-1 text-gray-400"></i>
                    </div>
                </div>
                <h3 class="text-[15px] sm:text-[17px] font-semibold text-white leading-snug pr-2">${palavra.term || ""}</h3>
                <div class="flashcard-reveal">
                    <div>
                        <div class="h-px w-full bg-[#1f2937] my-3 relative"><div class="absolute left-0 top-0 h-full w-12" style="background: linear-gradient(90deg, ${estilo.corHex}, transparent);"></div></div>
                        <p class="text-[13px] sm:text-[14px] text-gray-400 leading-relaxed pb-1">${palavra.translation || ""}</p>
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
    const inputTermo = document.getElementById('edit-termo');
    const inputTraducao = document.getElementById('edit-traducao');
    
    inputTermo.value = palavra.term || ""; 
    inputTraducao.value = palavra.translation || "";
    selecionarCatEdit(palavra.category_id); 
    
    const m = document.getElementById('modal-edicao');
    m.classList.remove('hidden'); m.classList.add('flex');

    setTimeout(() => {
        inputTermo.style.height = 'auto'; inputTermo.style.height = inputTermo.scrollHeight + 'px';
        inputTraducao.style.height = 'auto'; inputTraducao.style.height = inputTraducao.scrollHeight + 'px';
    }, 10);
}

window.fecharModal = function() { 
    palavraEmEdicaoId = null; 
    const m = document.getElementById('modal-edicao');
    m.classList.add('hidden'); m.classList.remove('flex');
}

window.salvarEdicao = async function() {
    if (!palavraEmEdicaoId) return;
    const termo = document.getElementById('edit-termo').value.trim();
    const traducao = document.getElementById('edit-traducao').value.trim();
    
    const resAud = await fetch('/api/audio', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termo }) });
    const dadosAud = await resAud.json();

    await fetch('/api/words/' + palavraEmEdicaoId, { 
        method: 'PUT', headers: await getHeaders(), 
        body: JSON.stringify({ term: termo, translation: traducao, category_id: catSelecionadaEdit, audioUrl: dadosAud.audioUrl || "" }) 
    });
    fecharModal(); carregarLista();
}

window.excluirPalavra = function(id) {
    abrirConfirmacao(
        "Excluir Registro?", 
        "Esta ação é irreversível. O registro será apagado permanentemente.", 
        async () => {
            await fetch('/api/words/' + id, { method: 'DELETE', headers: await getHeaders() });
            carregarLista();
        }
    );
}

// ÁUDIO INTELIGENTE
function resetarBotaoAudio() { 
    document.querySelectorAll('.btn-audio').forEach(btn => btn.classList.remove('text-[#00e5ff]'));
    botaoAudioAtual = null; 
}

window.tocarAudio = function(botao, index) {
    const url = ultimaListaPalavras[index].audioUrl || ""; const texto = ultimaListaPalavras[index].term || "";
    if (botaoAudioAtual === botao) { if (audioAtual) audioAtual.pause(); window.speechSynthesis.cancel(); resetarBotaoAudio(); return; }
    
    if (audioAtual) { audioAtual.pause(); audioAtual.currentTime = 0; } 
    window.speechSynthesis.cancel(); resetarBotaoAudio(); 
    
    botaoAudioAtual = botao; botaoAudioAtual.classList.add('text-[#00e5ff]'); 
    
    if (url && url.startsWith('http')) { 
        audioAtual = new Audio(url); audioAtual.onended = resetarBotaoAudio; audioAtual.play().catch(() => resetarBotaoAudio()); 
    } else { 
        const sintese = new SpeechSynthesisUtterance(texto); sintese.lang = 'en-US'; sintese.onend = resetarBotaoAudio; window.speechSynthesis.speak(sintese); 
    }
}

// MOBILE
window.abrirModalMobile = function() { const bg = document.getElementById('modal-mobile'); bg.classList.remove('hidden'); bg.classList.add('flex'); }
window.fecharModalMobile = function() { const bg = document.getElementById('modal-mobile'); bg.classList.add('hidden'); bg.classList.remove('flex'); }