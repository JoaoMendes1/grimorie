# Roadmap do Projeto

Este documento mapeia a evolução do projeto, detalhando o que já foi estabelecido, as correções imediatas, a nova identidade visual e a visão futura de lançamento.

## Fase 1: MVP Web (✅ Concluído)
- [x] Criar servidor backend estruturado em Go.
- [x] Configurar banco de dados local SQLite.
- [x] Desenvolver rotas da API (GET, POST, DELETE).
- [x] Construir interface de usuário "Terminal" com Tailwind CSS.
- [x] Separar as camadas de visualização em `index.html`, `style.css` e `app.js`.
- [x] Implementar tradução automática via API externa.
- [x] Adicionar reprodução de áudio híbrida (API + Web Speech).

## Fase 2: Correções e Refinamentos (✅ Concluído)
- [x] **Issue #10 - Segurança:** Corrigir middleware de autenticação no backend para bloquear requisições sem PIN válido.
- [x] **Issue #11 - Usabilidade de Áudio:** Implementar trava no JavaScript para pausar áudios em execução antes de iniciar um novo.
- [x] **Issue #12 - Limpeza Visual:** Remover a etiqueta "SALVO" da listagem de palavras para reduzir poluição visual.
- [x] **Issue #13 - Tradução Bidirecional:** Atualizar API Go para detectar o idioma automaticamente e traduzir nos dois sentidos (Inglês <-> Português).
- [x] **Issue #21 - Estabilidade:** Corrigir bloqueio silencioso de mídia no Service Worker e prevenir erro de leitura no banco de dados.
- [x] **Higiene do Repositório:** Configurar `.gitignore` para blindar o banco de dados (`.db`) e arquivos binários (`.exe`).

## Fase 3: Nuvem, Autenticação e Segurança (✅ Concluído)
- [x] **Issue #22 - Migração de Banco de Dados:** Mudar do SQLite para Supabase (PostgreSQL) para garantir sincronização instantânea.
- [x] **Login com Google (OAuth2):** Vincular os registros à conta pessoal usando a autenticação nativa do Supabase.
- [x] **Issue #26 - Segurança e Refatoração:** Otimizar middleware, realizar injeção segura de dependências no contexto e remover credenciais fixas do frontend.
- [x] **Issue #27 - Arquitetura (Fail-Fast):** Implementar barreira de segurança no `main.go` para abortar a inicialização caso faltem variáveis críticas (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`).
- [x] **Hospedagem:** Configurar variáveis de ambiente e realizar o deploy do servidor Go no Render com suporte a múltiplas origens de redirecionamento.

## Fase 3.5: Dívida Técnica, Categorias e Refatoração (✅ Concluído)
- [x] **Ambiente de Homologação (Staging):** Estabelecer fluxo de testes locais, análise de riscos e roteiro seguro de publicação.
- [x] **Ajuste de Schema do Banco:** Corrigir a dessincronização do `user_id`, criar a tabela `categories` e relacioná-la com `vocabularies`.
- [x] **Lógica de Inversão de Idioma:** Garantir que o inglês seja sempre o termo principal ao salvar, independentemente do idioma de entrada.
- [x] **Rotas de Categorias (API):** Criar rotas CRUD (GET, POST, PUT, DELETE) para o gerenciamento de categorias.
- [x] **Rota de Edição:** Criar a rota `PUT /api/words/{id}` no Go para suportar a atualização de termos.
- [x] **Otimização de Auth:** Substituir a validação remota no middleware por validação local de JWT para reduzir latência.
- [x] **Resiliência da Tradução:** Implementar fallback na API de tradução para evitar bloqueios.
- [x] **Documentação:** Atualizar `README.md` refletindo o PostgreSQL, nuvem e novas variáveis de ambiente.

## Fase 4: Nova Identidade, Flashcards e Edição Premium (✅ Concluído)
- [x] **Edição de Termos:** Funcionalidade de edição imersiva via Pop-up Modal, incluindo atualização em tempo real de áudio TTS com quebra de cache.
- [x] **Tradução Bidirecional Inteligente:** Motor universal de auto-tradução nos modais, com auto-resize para textos longos.
- [x] **Gerenciamento de Categorias Avançado:** Implementação de Dashboard de Categorias e substituição de dropdowns nativos por sistema dinâmico de Chips/Swatches (cores em Hash).
- [x] **Experiência Visual e Login:** Interface imersiva com animações, orbes luminosas, tipografia tech e Empty States elegantes.
- [x] **Sistema de Flashcards Expansíveis:** Cartões estilo "accordion" ocultando a tradução para facilitar o estudo de retenção.
- [x] **Dashboard de Status e Filtros:** Contadores dinâmicos de registros e filtragem instantânea por múltiplas categorias.
- [x] **UX Mobile First:** Botão flutuante (FAB) e reformulação dos formulários em tela cheia para evitar colisão com o teclado virtual.
- [x] **Prevenção de Falhas:** Modais de confirmação global para ações destrutivas (exclusão) e trava contra categorias duplicadas.

## Fase 4.5: Dívida Técnica e Segurança (🚧 Em Planejamento)

### Frontend
- [x] **Issue #46 - XSS em dados de usuário:** Sanitizar `term`, `translation` e nomes de
      categoria antes de inserir via `innerHTML`; eliminar interpolação de string dentro de
      atributos `onclick` (trocar por `data-*` + `addEventListener`).

### Backend
- [x] **Auth JWT Local:** Substituir a chamada remota ao Supabase (`/auth/v1/user`) no
      middleware por validação local do JWT (via JWKS), reduzindo latência e removendo
      dependência de rede em toda requisição autenticada. (A Fase 3.5 já marcava isso como
      concluído — na prática ainda não foi aplicado; esta issue fecha essa dívida de fato.)
- [x] **Índices de Banco:** Adicionar índices em `vocabularies(user_id)` e `categories(user_id)`
      para manter performance de listagem conforme o volume de dados cresce.
- [x] **Rate Limiting:** Limitar as rotas `/api/translate` e `/api/audio` (proxies para serviços
      externos) para evitar abuso e bloqueio do IP do servidor pelos provedores externos.

*Nota: resolver esta fase antes da Fase 5 evita levar a mesma abordagem de auth remota e
falta de sanitização para o motor de IA (Gemini), que vai manipular ainda mais texto livre do usuário.*

## Fase 5: Motor de Decodificação (IA) (🚀 Próximo Passo)
- [ ] **Integração LLM:** Trocar a API de tradução comum pela API do Gemini.
- [ ] **Auto-Correção e Contexto Inteligente:** IA corrige a grafia em inglês, traduz e formula a frase de exemplo automaticamente antes de salvar.

## Fase 6: App Mobile (Android) e Tempo Real
- [ ] **Aplicativo Nativo:** Criar versão Android do Terminal Vocab.
- [ ] **Botão Flutuante (Overlay):** Recurso para sobrepor jogos (ex: Wuthering Waves) e ler diálogos da tela.
- [ ] **Sincronização Instantânea:** Usar a função Realtime do Supabase para o card aparecer no notebook no exato momento em que for capturado no celular.

## Fase 7: Retenção e Gamificação
- [ ] **Repetição Espaçada (SRS):** Algoritmo que agenda revisões antes do esquecimento.
- [ ] **Estatísticas HUD:** Painel com termos registrados e sequência de dias.