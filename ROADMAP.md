# Roadmap do Projeto

Este documento mapeia a evolução do projeto, detalhando o que já foi estabelecido, as correções imediatas e a visão futura de lançamento móvel.

## Fase 1: MVP Web (✅ Concluído)

- [x] Criar servidor backend estruturado em Go[cite: 1].
- [x] Configurar banco de dados local SQLite[cite: 1].
- [x] Desenvolver rotas da API (GET, POST, DELETE)[cite: 1].
- [x] Construir interface de usuário "Terminal" com Tailwind CSS[cite: 1].
- [x] Separar as camadas de visualização em `index.html`, `style.css` e `app.js`[cite: 1].
- [x] Implementar tradução automática via API externa[cite: 1].
- [x] Adicionar reprodução de áudio híbrida (API + Web Speech).

## Fase 2: Correções e Refinamentos (🔄 Em Andamento)

- [ ] **Issue #10 - Segurança:** Corrigir middleware de autenticação no backend para bloquear requisições sem PIN válido.
- [ ] **Issue #11 - Usabilidade de Áudio:** Implementar trava no JavaScript para pausar áudios em execução antes de iniciar um novo.
- [ ] **Issue #12 - Limpeza Visual:** Remover a etiqueta "SALVO" da listagem de palavras para reduzir poluição visual.
- [ ] **Issue #13 - Tradução Bidirecional:** Atualizar API Go para detectar o idioma automaticamente e traduzir nos dois sentidos (Inglês <-> Português).

## Fase 3: Preparação para Nuvem (A Fazer)

- [ ] Hospedar a API Go em plataforma de nuvem (ex: Railway, Render).
- [ ] Migrar banco de dados SQLite local para banco relacional em nuvem (ex: PostgreSQL via Supabase).
- [ ] Configurar variáveis de ambiente seguras (CORS, PIN de acesso, Chaves de API).

## Fase 4: Aplicativo Mobile Nativo (A Fazer)

- [ ] Iniciar repositório separado para o aplicativo mobile.
- [ ] Configurar ambiente de desenvolvimento com **React Native**.
- [ ] Recriar interface visual (UI) adaptada para telas de celular e interação por toque.
- [ ] Conectar aplicativo React Native com a API Go hospedada na nuvem.
- [ ] Configurar conta de desenvolvedor do Google.
- [ ] Empacotar aplicação e lançar oficialmente na **Google Play Store**.
