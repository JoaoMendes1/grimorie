package database

import (
	"database/sql"
	"fmt"

	_ "github.com/glebarez/go-sqlite"
)

var DB *sql.DB

func InitDB() error {
	var err error

	DB, err = sql.Open("sqlite", "./vocab.db")
	if err != nil {
		return fmt.Errorf("falha ao conectar ao sqlite: %w", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS vocabularies (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	term TEXT NOT NULL, 
	translation TEXT NOT NULL,
	audio_url TEXT,
	status TEXT DEFAULT 'Pendente',
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = DB.Exec(query)
	if err != nil {
		return fmt.Errorf("Falha ao criar tabela: %w", err)
	}

	return nil
}
