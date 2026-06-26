package main

import (
	"fmt"
	"net/http"

	"grimoire/internal/database"
	"grimoire/internal/handlers"

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
	r.Post("/api/translate", handlers.TranslateHandler)

	fmt.Println("Servidor rodando na porta 8080...")
	http.ListenAndServe(":8080", r)
}