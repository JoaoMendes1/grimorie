package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("variável de ambiente DATABASE_URL não foi definida")
	}

	var err error
	DB, err = sql.Open("postgres", dbURL)
	if err != nil {
		return fmt.Errorf("falha ao conectar ao supabase: %w", err)
	}

	// Lista de migrações estruturadas e em ordem lógica
	migracoes := []string{
		// Passo 1: Garantir que as tabelas principais existam
		`CREATE TABLE IF NOT EXISTS categories (
			id SERIAL PRIMARY KEY, 
			name TEXT NOT NULL, 
			user_id TEXT NOT NULL, 
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS vocabularies (
			id SERIAL PRIMARY KEY,
			term TEXT NOT NULL, 
			translation TEXT NOT NULL,
			audio_url TEXT,
			status TEXT DEFAULT 'Pendente',
			user_id TEXT DEFAULT '', 
			category_id INT REFERENCES categories(id) ON DELETE SET NULL, 
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		// Passo 3: Criação de Índices para ultra-performance nas buscas
		`CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_vocabularies_user_id ON vocabularies(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_vocabularies_category_id ON vocabularies(category_id);`,
	}

	// Executa cada instrução SQL de uma vez. Se uma falhar, ele aborta e avisa qual foi.
	for _, query := range migracoes {
		if _, err := DB.Exec(query); err != nil {
			return fmt.Errorf("erro ao inicializar schema do DB: %w \nQuery: %s", err, query)
		}
	}

	fmt.Println("✅ Schema e Índices do banco de dados verificados com sucesso.")
	return nil
}
