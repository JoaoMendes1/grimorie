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

async function iniciarApp() {
    const res = await fetch('/api/config');
    const config = await res.json();
    clienteSupabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

    clienteSupabase.auth.onAuthStateChange(async (event, session) => {
        if(session) {
            document.getElementById('tela-login').style.display = 'none'; 
            document.getElementById('tela-app').style.display = 'block';
            await carregarCategorias();
            carregarLista();  
        } else {
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

window.entrarComGoogle = async function() {
    await clienteSupabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } });
}
window.sair = async function() {
    await clienteSupabase.auth.signOut();
    document.getElementById('lista-palavras').innerHTML = ''; 
}

// TRADUÇÃO
function configurarTraducao(idOrigem, idDestino) {
    const campoOrigem = document.getElementById(idOrigem);
    const campoDestino = document.getElementById(idDestino);
    campoOrigem.addEventListener('input', function() {
        clearTimeout(timerDigitacao);
        const termo = this.value.trim();
        ultimoCampoEditado = idOrigem; 
        if (!termo) { campoDestino.value = ''; return; }
        timerDigitacao = setTimeout(async () => {
            if (ultimoCampoEditado !== idOrigem) return;
            try {
                const res = await fetch('/api/translate', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termo }) });
                const dados = await res.json();
                campoDestino.value = dados.translation || "Erro";
                idiomaOrigemAtual = dados.sourceLang || 'en'; 
            } catch (error) {}
        }, 600); 
    });
}
configurarTraducao('novo-termo', 'traducao-automatica');
configurarTraducao('traducao-automatica', 'novo-termo');
configurarTraducao('novo-termo-mobile', 'traducao-mobile');
configurarTraducao('traducao-mobile', 'novo-termo-mobile');
configurarTraducao('edit-termo', 'edit-traducao');
configurarTraducao('edit-traducao', 'edit-termo');

// MATEMÁTICA DE CORES PREMIUM (Sem Categoria isolado em Verde)
function obterEstiloCategoria(id) {
    if (!id) {
        // Se ID for null, sempre retorna Verde (Sem Categoria)
        return { corHex: '#00e676', bgTransparente: 'bg-[#00e676]/10', texto: 'text-[#00e676]' }; 
    }
    
    // Lista de cores premium para categorias normais
    const estilos = [
        { corHex: '#00e5ff', bgTransparente: 'bg-[#00e5ff]/10', texto: 'text-[#00e5ff]' }, // Cyan
        { corHex: '#b388ff', bgTransparente: 'bg-[#b388ff]/10', texto: 'text-[#b388ff]' }, // Purple
        { corHex: '#ffc107', bgTransparente: 'bg-[#ffc107]/10', texto: 'text-[#ffc107]' }, // Amber
        { corHex: '#f472b6', bgTransparente: 'bg-[#f472b6]/10', texto: 'text-[#f472b6]' }, // Pink
        { corHex: '#34d399', bgTransparente: 'bg-[#34d399]/10', texto: 'text-[#34d399]' }  // Emerald
    ];
    return estilos[id % estilos.length];
}

async function carregarCategorias(idParaSelecionar = null) {
    const res = await fetch('/api/categories', { method: 'GET', headers: await getHeaders()});
    categoriasAtuais = await res.json(); 
    
    renderizarCustomSelect('categoria', 'categoria-text', 'categoria-dropdown', categoriasAtuais, idParaSelecionar);
    renderizarCustomSelect('categoria-mobile', 'categoria-text-mobile', 'categoria-dropdown-mobile', categoriasAtuais, idParaSelecionar);
    renderizarCustomSelect('edit-categoria', 'edit-categoria-text', 'edit-categoria-dropdown', categoriasAtuais, idParaSelecionar);
}

function renderizarCustomSelect(idInput, idText, idDropdown, categorias, idParaSelecionar) {
    const dropdown = document.getElementById(idDropdown);
    const hiddenInput = document.getElementById(idInput);
    const textDisplay = document.getElementById(idText);
    
    // Adiciona a opção vazia (Sem Categoria) no topo
    let htmlDropdown = `<div class="px-4 py-3 text-sm text-[#00e676] hover:bg-[#1f2937] cursor-pointer border-b border-gray-800 font-bold" onclick="selecionarOpcaoDropdown('${idInput}', '${idText}', '${idDropdown}', '', 'Sem Categoria')">Sem Categoria</div>`;
    
    categorias.forEach(cat => {
        htmlDropdown += `<div class="px-4 py-3 text-sm text-gray-300 hover:bg-[#1f2937] cursor-pointer border-b border-gray-800 last:border-0" onclick="selecionarOpcaoDropdown('${idInput}', '${idText}', '${idDropdown}', '${cat.id}', '${cat.name.replace(/'/g, "\\'")}')">${cat.name}</div>`;
    });
    dropdown.innerHTML = htmlDropdown;

    let selected = idParaSelecionar ? categorias.find(c => c.id == idParaSelecionar) : categorias.find(c => c.id == hiddenInput.value);
    
    if (selected) { 
        hiddenInput.value = selected.id; textDisplay.textContent = selected.name; 
    } else {
        hiddenInput.value = ''; textDisplay.textContent = 'Sem Categoria'; 
    }
}

window.selecionarOpcaoDropdown = function(idInput, idText, idDropdown, valor, nome) {
    document.getElementById(idInput).value = valor;
    document.getElementById(idText).textContent = nome;
    document.getElementById(idDropdown).classList.add('hidden');
}

window.toggleDropdown = function(id) {
    document.querySelectorAll('.custom-select-container .absolute').forEach(d => { if (d.id !== id) d.classList.add('hidden'); });
    document.getElementById(id).classList.toggle('hidden');
}

// MODAL NOVA CATEGORIA
window.abrirModalCategoria = function() {
    document.getElementById('nova-categoria-nome').value = '';
    const m = document.getElementById('modal-categoria');
    m.classList.remove('hidden'); m.classList.add('flex');
    setTimeout(() => document.getElementById('nova-categoria-nome').focus(), 100);
}

window.fecharModalCategoria = function() {
    const m = document.getElementById('modal-categoria');
    m.classList.add('hidden'); m.classList.remove('flex');
}

window.salvarNovaCategoria = async function() {
    const nome = document.getElementById('nova-categoria-nome').value.trim();
    if (!nome) return;
    const res = await fetch('/api/categories', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ name: nome }) });
    const dados = await res.json();
    await carregarCategorias(dados.id); 
    fecharModalCategoria();
}

function renderizarFiltros() {
    const wrap = document.getElementById('filter-chips');
    // Adiciona "Todos", Categorias, e explicitamente "Sem Categoria"
    const nomesCategorias = ['Todos', ...categoriasAtuais.map(c => c.name), 'Sem Categoria'];
    
    wrap.innerHTML = nomesCategorias.map(nome => {
        let estilo;
        if (nome === 'Todos') {
            estilo = { corHex: '#9ca3af', bgTransparente: 'bg-transparent', texto: 'text-gray-400' };
        } else if (nome === 'Sem Categoria') {
            estilo = obterEstiloCategoria(null); // Puxa o Verde
        } else {
            const cat = categoriasAtuais.find(c => c.name === nome);
            estilo = obterEstiloCategoria(cat ? cat.id : null);
        }
        
        const ativo = filtroAtivo === nome;
        const styleAtivo = ativo ? `background-color: ${estilo.corHex}; color: #000; border-color: transparent;` : `color: ${estilo.corHex}; border-color: ${nome === 'Todos' ? '#374151' : estilo.corHex + '66'};`;
        
        return `<button onclick="selecionarFiltro('${nome}')" class="whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all ${ativo ? 'shadow-[0_0_10px_rgba(255,255,255,0.15)]' : 'hover:bg-white/5'}" style="${styleAtivo}">${nome}</button>`;
    }).join('');
}

window.selecionarFiltro = function(nome) { filtroAtivo = nome; renderizarFiltros(); aplicarFiltrosEBuscar(); }
window.filtrarLista = function(termo) { termoBuscaAtual = termo.toLowerCase(); aplicarFiltrosEBuscar(); }

// PALAVRAS (Salvar, Listar, Editar)
window.salvarPalavra = async function(origem = 'desktop') {
    const sufixo = origem === 'mobile' ? '-mobile' : '';
    const termo = document.getElementById('novo-termo' + sufixo).value.trim();
    const traducao = document.getElementById('traducao' + (origem === 'mobile' ? '-mobile' : '-automatica')).value.trim();
    const catValue = document.getElementById('categoria' + sufixo).value;
    const categoriaSelecionadaId = catValue ? parseInt(catValue) : null;
    
    if (!termo || !traducao) return;

    let termoFinal = termo; let traducaoFinal = traducao; 
    const origemPt = idiomaOrigemAtual.toLowerCase().startsWith('pt');
    if ((ultimoCampoEditado && ultimoCampoEditado.includes('termo') && origemPt) || (ultimoCampoEditado && ultimoCampoEditado.includes('traducao') && !origemPt)) {
        termoFinal = traducao; traducaoFinal = termo;  
    }

    const resAud = await fetch('/api/audio', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termoFinal }) });
    const dadosAud = await resAud.json();

    await fetch('/api/words', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termoFinal, translation: traducaoFinal, audioUrl: dadosAud.audioUrl || "", category_id: categoriaSelecionadaId }) });

    document.getElementById('novo-termo' + sufixo).value = ''; document.getElementById('traducao' + (origem === 'mobile' ? '-mobile' : '-automatica')).value = '';
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
        const estilo = obterEstiloCategoria(palavra.category_id);

        lista.innerHTML += `
            <div class="registro-item panel p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl flex flex-col relative overflow-hidden transition-all cursor-pointer group border border-[#1f2937]/50" onclick="this.classList.toggle('revealed')">
                <div class="absolute left-0 top-0 bottom-0 w-1 opacity-80" style="background-color: ${estilo.corHex};"></div>
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[9px] font-bold ${estilo.texto} uppercase tracking-wider px-2.5 py-1 rounded-full border border-[${estilo.corHex}40] flex items-center gap-1.5 ${estilo.bgTransparente}">
                        ${nomeCategoria}
                    </span>
                    <div class="flex items-center gap-3 text-gray-500 opacity-60 group-hover:opacity-100 transition-opacity" onclick="event.stopPropagation()">
                        <button onclick="tocarAudio(this, ${index})" class="hover:text-[#00e5ff] p-1"><i class="ph-fill ph-speaker-high text-lg"></i></button>
                        <button onclick="prepararEdicao(${index})" class="hover:text-white p-1"><i class="ph-fill ph-pencil-simple text-lg"></i></button>
                        <button onclick="excluirPalavra(${palavra.id})" class="hover:text-red-500 p-1"><i class="ph-fill ph-trash text-lg"></i></button>
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
    document.getElementById('edit-termo').value = palavra.term || ""; document.getElementById('edit-traducao').value = palavra.translation || "";
    
    if (palavra.category_id) {
        const cat = categoriasAtuais.find(c => c.id == palavra.category_id);
        if (cat) { document.getElementById('edit-categoria').value = cat.id; document.getElementById('edit-categoria-text').textContent = cat.name; }
    } else {
        document.getElementById('edit-categoria').value = ''; document.getElementById('edit-categoria-text').textContent = 'Sem Categoria';
    }
    
    const m = document.getElementById('modal-edicao');
    m.classList.remove('hidden'); m.classList.add('flex');
}

window.fecharModal = function() { 
    palavraEmEdicaoId = null; 
    const m = document.getElementById('modal-edicao');
    m.classList.add('hidden'); m.classList.remove('flex');
}

window.salvarEdicao = async function() {
    if (!palavraEmEdicaoId) return;
    const catValue = document.getElementById('edit-categoria').value;
    await fetch('/api/words/' + palavraEmEdicaoId, { method: 'PUT', headers: await getHeaders(), body: JSON.stringify({ term: document.getElementById('edit-termo').value, translation: document.getElementById('edit-traducao').value, category_id: catValue ? parseInt(catValue) : null }) });
    fecharModal(); carregarLista();
}

window.excluirPalavra = async function(id) { fetch('/api/words/' + id, { method: 'DELETE', headers: await getHeaders() }).then(() => carregarLista()); }

function resetarBotaoAudio() { if (botaoAudioAtual) { botaoAudioAtual.classList.remove('text-[#05070a]'); botaoAudioAtual.classList.add('text-[#00e5ff]'); botaoAudioAtual = null; } }
window.tocarAudio = function(botao, index) {
    const url = ultimaListaPalavras[index].audioUrl || ""; const texto = ultimaListaPalavras[index].term || "";
    if (botaoAudioAtual === botao) { if (audioAtual) audioAtual.pause(); window.speechSynthesis.cancel(); resetarBotaoAudio(); return; }
    if (audioAtual) { audioAtual.pause(); audioAtual.currentTime = 0; } window.speechSynthesis.cancel(); resetarBotaoAudio();
    botaoAudioAtual = botao; botaoAudioAtual.classList.remove('text-[#00e5ff]'); botaoAudioAtual.classList.add('text-[#05070a]');
    if (url && url.startsWith('http')) { audioAtual = new Audio(url); audioAtual.onended = resetarBotaoAudio; audioAtual.play().catch(() => resetarBotaoAudio()); } 
    else { const sintese = new SpeechSynthesisUtterance(texto); sintese.lang = 'en-US'; sintese.onend = resetarBotaoAudio; window.speechSynthesis.speak(sintese); }
}