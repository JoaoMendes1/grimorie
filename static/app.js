let clienteSupabase;
let audioAtual = null; 
let botaoAudioAtual = null; 
let timerDigitacao;
let ultimaListaPalavras = [];
let idiomaOrigemAtual = [];
let categoriasAtuais = []; 
let palavraEmEdicaoId = null;
let ultimoCampoEditado = null; 

async function iniciarApp() {
    try {
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
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

iniciarApp();

async function getHeaders() {
    const { data } = await clienteSupabase.auth.getSession();
    const token = data.session?.access_token || '';
    return { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };
}

window.entrarComGoogle = async function() {
    const { error } = await clienteSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/' } 
    });
    if (error) alert("Erro Google:" + error.message); 
}

window.sair = async function() {
    const { error } = await clienteSupabase.auth.signOut();
    if (!error) document.getElementById('lista-palavras').innerHTML = ''; 
}

// TRADUÇÃO INTELIGENTE
function configurarTraducao(idOrigem, idDestino) {
    const campoOrigem = document.getElementById(idOrigem);
    const campoDestino = document.getElementById(idDestino);

    campoOrigem.addEventListener('input', function() {
        clearTimeout(timerDigitacao);
        const termo = this.value.trim();
        ultimoCampoEditado = idOrigem; 
        
        if (!termo) {
            campoDestino.value = '';
            campoDestino.style.height = 'auto';
            return;
        }

        timerDigitacao = setTimeout(async () => {
            if (ultimoCampoEditado !== idOrigem) return;

            try {
                const res = await fetch('/api/translate', { 
                    method: 'POST', 
                    headers: await getHeaders(), 
                    body: JSON.stringify({ term: termo }) 
                });
                const dados = await res.json();
                
                campoDestino.value = dados.translation || "Erro na decodificação";
                idiomaOrigemAtual = dados.sourceLang || 'en'; 
                
                campoDestino.style.height = 'auto'; 
                campoDestino.style.height = campoDestino.scrollHeight + 'px';
            } catch (error) {}
        }, 600); 
    });
}

configurarTraducao('novo-termo', 'traducao-automatica');
configurarTraducao('traducao-automatica', 'novo-termo');
configurarTraducao('edit-termo', 'edit-traducao');
configurarTraducao('edit-traducao', 'edit-termo');

document.getElementById('novo-termo').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); salvarPalavra(); }
});
document.getElementById('traducao-automatica').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); salvarPalavra(); }
});

// CATEGORIAS E DROPDOWNS
async function carregarCategorias(idParaSelecionar = null) {
    const res = await fetch('/api/categories', { method: 'GET', headers: await getHeaders()});
    categoriasAtuais = await res.json(); 

    if (categoriasAtuais.length === 0) {
        await fetch('/api/categories', {
            method: 'POST', 
            headers: await getHeaders(), 
            body: JSON.stringify({ name: 'Geral'})
        });
        return carregarCategorias(); 
    }

    renderizarCustomSelect('categoria', 'categoria-text', 'categoria-dropdown', categoriasAtuais, idParaSelecionar);
    renderizarCustomSelect('edit-categoria', 'edit-categoria-text', 'edit-categoria-dropdown', categoriasAtuais, idParaSelecionar);
}

function renderizarCustomSelect(idInput, idText, idDropdown, categorias, idParaSelecionar) {
    const dropdown = document.getElementById(idDropdown);
    const hiddenInput = document.getElementById(idInput);
    const textDisplay = document.getElementById(idText);

    dropdown.innerHTML = '';

    categorias.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'px-4 py-3 text-sm text-gray-300 hover:bg-[#45a29e] hover:text-[#0b0c10] cursor-pointer transition-colors border-b border-gray-800 last:border-0';
        div.textContent = cat.name;
        div.onclick = () => {
            hiddenInput.value = cat.id;
            textDisplay.textContent = cat.name;
            dropdown.classList.add('hidden');
        };
        dropdown.appendChild(div);
    });

    let selected = null;
    if (idParaSelecionar) {
        selected = categorias.find(c => c.id == idParaSelecionar);
    } else if (hiddenInput.value) { 
        selected = categorias.find(c => c.id == hiddenInput.value);
    }
    
    if (!selected && categorias.length > 0) selected = categorias[0];

    if (selected) {
        hiddenInput.value = selected.id;
        textDisplay.textContent = selected.name;
    }
}

window.toggleDropdown = function(id) {
    document.querySelectorAll('.custom-select-container .absolute').forEach(d => {
        if (d.id !== id) d.classList.add('hidden');
    });
    document.getElementById(id).classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-container')) {
        document.querySelectorAll('.custom-select-container .absolute').forEach(d => d.classList.add('hidden'));
    }
});

window.abrirModalCategoria = function() {
    document.getElementById('nova-categoria-nome').value = '';
    document.getElementById('modal-categoria').classList.remove('hidden');
    setTimeout(() => document.getElementById('nova-categoria-nome').focus(), 100);
}

window.fecharModalCategoria = function() {
    document.getElementById('modal-categoria').classList.add('hidden');
}

window.salvarNovaCategoria = async function() {
    const nome = document.getElementById('nova-categoria-nome').value.trim();
    if (!nome) return;

    const res = await fetch('/api/categories', {
        method: 'POST', 
        headers: await getHeaders(), 
        body: JSON.stringify({ name: nome })
    });
    
    const dados = await res.json();
    await carregarCategorias(dados.id); 
    fecharModalCategoria();
}

// PALAVRAS
window.salvarPalavra = async function() {
    const termo = document.getElementById('novo-termo').value.trim();
    const traducao = document.getElementById('traducao-automatica').value.trim();
    const categoriaSelecionadaId = parseInt(document.getElementById('categoria').value);
    
    if (!termo || !traducao) return;

    let termoFinal = termo; 
    let traducaoFinal = traducao; 

    const origemPt = idiomaOrigemAtual.toLowerCase().startsWith('pt');
    if ((ultimoCampoEditado === 'novo-termo' && origemPt) || (ultimoCampoEditado === 'traducao-automatica' && !origemPt)) {
        termoFinal = traducao; 
        traducaoFinal = termo;  
    }

    const resAud = await fetch('/api/audio', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termoFinal }) });
    const dadosAud = await resAud.json();
    const audioCorreto = dadosAud.audioUrl || "";

    await fetch('/api/words', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ 
            term: termoFinal, 
            translation: traducaoFinal, 
            audioUrl: audioCorreto,
            category_id: categoriaSelecionadaId
        })
    });

    document.getElementById('novo-termo').value = '';
    document.getElementById('novo-termo').style.height = 'auto';
    document.getElementById('traducao-automatica').value = '';
    document.getElementById('traducao-automatica').style.height = 'auto';
    ultimoCampoEditado = null; 
    
    carregarLista();
}

window.prepararEdicao = function(index) {
    const palavra = ultimaListaPalavras[index];
    palavraEmEdicaoId = palavra.id;
    
    const modal = document.getElementById('modal-edicao');
    const inputTermo = document.getElementById('edit-termo');
    const inputTraducao = document.getElementById('edit-traducao');

    inputTermo.value = palavra.term || "";
    inputTraducao.value = palavra.translation || "";
    ultimoCampoEditado = null; 
    
    const inputCategoria = document.getElementById('edit-categoria');
    const textCategoria = document.getElementById('edit-categoria-text');
    
    if (palavra.category_id) {
        const cat = categoriasAtuais.find(c => c.id == palavra.category_id);
        if (cat) {
            inputCategoria.value = cat.id;
            textCategoria.textContent = cat.name;
        }
    } else if (categoriasAtuais.length > 0) {
        inputCategoria.value = categoriasAtuais[0].id;
        textCategoria.textContent = categoriasAtuais[0].name;
    }

    modal.classList.remove('hidden');
    
    setTimeout(() => {
        inputTermo.style.height = 'auto';
        inputTermo.style.height = inputTermo.scrollHeight + 'px';
        inputTraducao.style.height = 'auto';
        inputTraducao.style.height = inputTraducao.scrollHeight + 'px';
    }, 10);
}

window.fecharModal = function() {
    palavraEmEdicaoId = null;
    document.getElementById('modal-edicao').classList.add('hidden');
}

window.salvarEdicao = async function() {
    if (!palavraEmEdicaoId) return;

    const termo = document.getElementById('edit-termo').value.trim();
    const traducao = document.getElementById('edit-traducao').value.trim();
    const categoriaId = parseInt(document.getElementById('edit-categoria').value);

    if (!termo || !traducao) return;

    await fetch('/api/words/' + palavraEmEdicaoId, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify({ 
            term: termo, 
            translation: traducao, 
            category_id: categoriaId
        })
    });

    fecharModal();
    carregarLista();
}

async function carregarLista() {
    fetch('/api/words', { method: 'GET', headers: await getHeaders() })
    .then(res => res.json())
    .then(dados => {
        ultimaListaPalavras = dados;
        const lista = document.getElementById('lista-palavras');
        lista.innerHTML = ''; 

        dados.forEach((palavra, index) => {
            const id = palavra.id;
            const termo = palavra.term || "";
            const traducao = palavra.translation || "";
            
            let nomeCategoria = "SEM CATEGORIA";
            if (palavra.category_id) {
                const catEncontrada = categoriasAtuais.find(c => c.id === palavra.category_id);
                if (catEncontrada) nomeCategoria = catEncontrada.name;
            }

            lista.innerHTML += `
                <div class="registro-item panel p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors hover:border-[#45a29e]">
                    <div class="flex-1 w-full">
                        <span class="text-[10px] font-bold text-[#45a29e] uppercase tracking-widest block mb-3">${nomeCategoria}</span>
                        <div class="flex flex-col gap-1">
                            <h4 class="text-lg font-bold text-white whitespace-pre-wrap">${termo}</h4>
                            <p class="text-sm text-gray-400 whitespace-pre-wrap">${traducao}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 sm:border-l border-gray-700 sm:pl-5 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0">
                        <button onclick="tocarAudio(this, ${index})"  class="p-2 rounded-full bg-[#0b0c10] border border-[#2c353f] text-[#66fcf1] hover:bg-[#45a29e] hover:text-[#0b0c10] transition" title="Ouvir">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/><path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/></svg>
                        </button>

                        <button onclick="prepararEdicao(${index})" class="text-gray-500 hover:text-[#9d8bff] transition ml-2" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                        </button>
                
                        <button onclick="excluirPalavra(${id})" class="text-gray-500 hover:text-red-500 transition ml-2" title="Excluir">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                        </button>
                    </div>
                </div>`;
        });
    });
}

window.filtrarLista = function(termoBusca) {
    const itens = document.querySelectorAll('.registro-item');
    const busca = termoBusca.toLowerCase();
    
    itens.forEach(item => {
        const texto = item.innerText.toLowerCase();
        item.style.display = texto.includes(busca) ? 'flex' : 'none';
    });
}

function resetarBotaoAudio() {
    if (botaoAudioAtual) {
        botaoAudioAtual.classList.remove('bg-[#66fcf1]', 'text-[#0b0c10]');
        botaoAudioAtual.classList.add('bg-[#0b0c10]', 'text-[#66fcf1]');
        botaoAudioAtual = null;
    }
}

window.tocarAudio = function(botao, index) {
    const palavra = ultimaListaPalavras[index];
    const url = palavra.audioUrl || "";
    const texto = palavra.term || "";
    
    if (botaoAudioAtual === botao) {
        if (audioAtual) audioAtual.pause();
        window.speechSynthesis.cancel(); 
        resetarBotaoAudio(); 
        return; 
    }

    if (audioAtual) {
        audioAtual.pause(); 
        audioAtual.currentTime = 0; 
    }

    window.speechSynthesis.cancel(); 
    resetarBotaoAudio(); 

    botaoAudioAtual = botao;
    botaoAudioAtual.classList.remove('bg-[#0b0c10]', 'text-[#66fcf1]');
    botaoAudioAtual.classList.add('bg-[#66fcf1]', 'text-[#0b0c10]');

    if (texto && texto.length > 150) {
        const sintese = new SpeechSynthesisUtterance(texto);
        sintese.lang = 'en-US'; 
        sintese.onend = resetarBotaoAudio; 
        window.speechSynthesis.speak(sintese);
        return; 
    }

    if (url && url.startsWith('http')) {
        audioAtual = new Audio(url);
        audioAtual.onended = resetarBotaoAudio;
        audioAtual.play().catch(() => {
            alert("Áudio bloqueado pelo navegador"); 
            resetarBotaoAudio();
        }); 
    }
}

window.excluirPalavra = async function(id) {
    fetch('/api/words/' + id, { method: 'DELETE', headers: await getHeaders() }).then(() => carregarLista());
}