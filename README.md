# Terminal Vocab (Grimoire)

Dicionário pessoal interativo desenvolvido para facilitar o registro e o estudo de novos termos. O sistema decodifica palavras em tempo real, gera áudio de pronúncia e armazena o vocabulário para consultas rápidas.

## 🛠 Tecnologias Utilizadas

*   **Backend:** Go (Golang) para processamento veloz e seguro[cite: 1].
*   **Banco de Dados:** SQLite (`vocab.db`) para armazenamento leve e local[cite: 1].
*   **Frontend:** HTML5, CSS3 e Vanilla JavaScript (`app.js`) isolados para fácil manutenção[cite: 1].
*   **Estilização:** Tailwind CSS (via CDN) com tema escuro de alto contraste[cite: 1].

## ✨ Funcionalidades Atuais

*   **Autenticação Simples:** Acesso protegido por PIN.
*   **Tradução em Tempo Real:** Decodificação automática (Inglês -> Português) durante a digitação utilizando técnica de *debounce*.
*   **Motor de Áudio Híbrido:** Reprodução via API para termos curtos e via motor nativo do navegador (`SpeechSynthesis`) para textos longos.
*   **Busca Dinâmica:** Filtro em tempo real das palavras salvas na interface.
*   **Design Responsivo:** Interface fluida para uso em computadores e navegadores de dispositivos móveis.

## 📂 Arquitetura do Projeto

O código segue o padrão de separação de responsabilidades[cite: 1]:
*   `/cmd/web/main.go`: Ponto de entrada do servidor Go[cite: 1].
*   `/internal/handlers/`: Controladores da API (áudio, tradução, palavras)[cite: 1].
*   `/internal/database/`: Conexão e regras do SQLite[cite: 1].
*   `/static/`: Arquivos da interface de usuário (`index.html`, `style.css`, `app.js`)[cite: 1].

## 🚀 Como Executar Localmente

1. Clone o repositório.
2. No terminal, navegue até a raiz do projeto.
3. Execute o comando: `go run cmd/web/main.go`
4. Acesse `http://localhost:8080` no navegador.
