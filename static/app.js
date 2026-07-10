let clienteSupabase;
let audioAtual = null; 
let botaoAudioAtual = null; 
let timerDigitacao;
let ultimaListaPalavras = [];

// 1. INICIALIZAÇÃO SEGURA (Busca as chaves no backend)
async function iniciarApp() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        
        clienteSupabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

        // Ouve as mudanças de login
        clienteSupabase.auth.onAuthStateChange((event, session) => {
            if(session) {
                // Conta validada: esconde o botão e mostra o app 
                document.getElementById('tela-login').style.display = 'none'; 
                document.getElementById('tela-app').style.display = 'block';
                carregarLista();  
            } else {
                // Sem conta: garante que só o botão de login apareça
                document.getElementById('tela-login').style.display = 'flex'; 
                document.getElementById('tela-app').style.display = 'none';
            }
        });
    } catch (error) {
        console.error("Erro ao carregar configurações do servidor:", error);
    }
}

// Chama a função para ligar o app
iniciarApp();

// 2. FUNÇÕES DE AUTENTICAÇÃO E CABEÇALHOS
async function getHeaders() {
    const { data } = await clienteSupabase.auth.getSession();
    const token = data.session?.access_token || '';
    return { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };
}

window.entrarComGoogle = async function() {
    const { data, error } = await clienteSupabase.auth.signInWithOAuth({
        provider: 'google', 
    });

    if (error) {
        alert("Erro ao tentar entrar com o Google:" + error.message); 
    }
}

window.sair = async function() {
    const { error } = await clienteSupabase.auth.signOut();
    if (error) {
        alert("Erro ao sair: " + error.message);
    } else {
        document.getElementById('lista-palavras').innerHTML = ''; // Limpa os dados da tela
    }
}

// 3. TRADUÇÃO AUTOMÁTICA
document.getElementById('novo-termo').addEventListener('input', function() {
    clearTimeout(timerDigitacao);
    const termo = this.value.trim();
    const campoTraducao = document.getElementById('traducao-automatica');
    
    if (!termo) {
        campoTraducao.value = '';
        campoTraducao.style.height = 'auto';
        return;
    }

    campoTraducao.value = 'Decodificando...';
    
    timerDigitacao = setTimeout(async () => {
        const res = await fetch('/api/translate', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termo }) });
        const dados = await res.json();
        campoTraducao.value = dados.translation || "Erro na decodificação";
        
        // Ajusta o tamanho da caixa de tradução
        campoTraducao.style.height = ''; 
        campoTraducao.style.height = campoTraducao.scrollHeight + 'px';
    }, 600); 
});

// Salvar com Enter (evita pular linha acidentalmente no textarea)
document.getElementById('novo-termo').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        salvarPalavra();
    }
});

// 4. GESTÃO DE PALAVRAS (Salvar, Carregar, Excluir, Filtrar)
async function salvarPalavra() {
    const termo = document.getElementById('novo-termo').value.trim();
    const traducao = document.getElementById('traducao-automatica').value;
    const categoriaBox = document.getElementById('categoria');
    const categoriaSelecionada = categoriaBox.options[categoriaBox.selectedIndex].text;
    
    if (!termo || traducao === 'Decodificando...') return;

    const resAud = await fetch('/api/audio', { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ term: termo }) });
    const dadosAud = await resAud.json();
    const audioCorreto = dadosAud.audioUrl || "";

    // O backend ainda não salva a categoria, mas enviamos o resto normalmente
    await fetch('/api/words', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ term: termo, translation: traducao, audioUrl: audioCorreto })
    });

    document.getElementById('novo-termo').value = '';
    document.getElementById('novo-termo').style.height = 'auto';
    document.getElementById('traducao-automatica').value = '';
    document.getElementById('traducao-automatica').style.height = 'auto';
    
    // Força a categoria selecionada aparecer no topo provisoriamente
    window.ultimaCategoria = categoriaSelecionada; 
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
            const audio = palavra.audioUrl || "";
            
            // Usa a categoria salva na sessão para o item mais novo, ou "GERAL" para os antigos
            const catExibida = (index === 0 && window.ultimaCategoria) ? window.ultimaCategoria : "GERAL";

            lista.innerHTML += `
                <div class="registro-item panel p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors hover:border-[#45a29e]">
                    <div class="flex-1 w-full">
                        <span class="text-[10px] font-bold text-[#45a29e] uppercase tracking-widest block mb-3">${catExibida}</span>
                        <div class="flex flex-col gap-1">
                            <h4 class="text-lg font-bold text-white whitespace-pre-wrap">${termo}</h4>
                            <p class="text-sm text-gray-400 whitespace-pre-wrap">${traducao}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 sm:border-l border-gray-700 sm:pl-5 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0">
                        <button onclick="tocarAudio(this, ${index})"  class="p-2 rounded-full bg-[#0b0c10] border border-[#2c353f] text-[#66fcf1] hover:bg-[#45a29e] hover:text-[#0b0c10] transition" title="Ouvir">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/><path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/></svg>
                        </button>
                        
                
                        <button onclick="excluirPalavra(${id})" class="text-gray-500 hover:text-red-500 transition ml-2" title="Excluir">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                        </button>
                    </div>
                </div>`;
        });
    });
}

function filtrarLista(termoBusca) {
    const itens = document.querySelectorAll('.registro-item');
    const busca = termoBusca.toLowerCase();
    
    itens.forEach(item => {
        const texto = item.innerText.toLowerCase();
        item.style.display = texto.includes(busca) ? 'flex' : 'none';
    });
}

// 5. MOTOR DE ÁUDIO
function resetarBotaoAudio() {
    if (botaoAudioAtual) {
        botaoAudioAtual.classList.remove('bg-[#66fcf1]', 'text-[#0b0c10]');
        botaoAudioAtual.classList.add('bg-[#0b0c10]', 'text-[#66fcf1]');
        botaoAudioAtual = null;
    }
}

function tocarAudio(botao, index) {
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

async function excluirPalavra(id) {
    fetch('/api/words/' + id, { method: 'DELETE', headers: await getHeaders() }).then(() => carregarLista());
}