# Terminal Vocab (Grimoire)

Dicionário pessoal interativo com temática *Sci-Fi / Terminal*, desenvolvido para facilitar o registro e o estudo de novos termos (Inglês ↔ Português).

## 🛠 Tecnologias Utilizadas

* **Backend:** Go (Golang) com roteamento super-rápido via `chi`.
* **Banco de Dados & Auth:** Supabase (PostgreSQL) + JWT.
* **Frontend:** HTML5, CSS3 e Vanilla JS isolados. Sem frameworks pesados.
* **Estilização:** Tailwind CSS (via CDN) com Glassmorphism.

## ✨ Funcionalidades Atuais
* **Login com Google:** Autenticação segura na nuvem.
* **Tradução Bidirecional Automática:** Motor inteligente que previne loops infinitos e traduz enquanto digita.
* **Categorias Dinâmicas:** Dropdowns customizados e criação em tempo real.
* **Edição Imersiva:** Modal focado e responsivo para ajuste de termos salvos.
* **Motor de Áudio Híbrido:** Reprodução via API e `SpeechSynthesis`.

## 🚀 Requisitos de Ambiente (Env Vars)
Para rodar, o sistema exige:
`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY` e `SUPABASE_JWT_SECRET`.