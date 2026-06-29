package main

import (
	"fmt"
	"net/http"

	"grimoire/internal/database"
	"grimoire/internal/handlers"

	// Importar a nova pasta de segurança 
	"grimoire/internal/middleware"

	"github.com/go-chi/chi/v5"
)

func main() {
	fmt.Println("Iniciando Grimoire...")

	err := database.InitDB()
	if err != nil {
		fmt.Printf("Erro crítico no banco: %v\n", err)
		return
	}

	r := chi.NewRouter()

// 1. Tela visual livre de bloqueios
	fs := http.FileServer(http.Dir("static"))
	r.Handle("/*", fs)

	// 2. Proteção aplicada apenas nas rotas de processamento usando "r.With"
	r.With(middleware.AuthPIN).Post("/api/translate", handlers.TranslateHandler)
	r.With(middleware.AuthPIN).Post("/api/audio", handlers.AudioHandler)

	fmt.Println("Servidor rodando na porta 8080...")
	http.ListenAndServe(":8080", r)
}