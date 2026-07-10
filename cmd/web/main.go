package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

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

	// Rota pública para entregar as chaves do Supabase ao frontend
	r.Get("/api/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"supabaseUrl": os.Getenv("SUPABASE_URL"),
			"supabaseKey": os.Getenv("SUPABASE_PUBLIC_KEY"),
		})
	})

	// 2. Proteção aplicada apenas nas rotas de processamento usando "r.With"
	r.With(middleware.AuthSupabase).Post("/api/translate", handlers.TranslateHandler)
	r.With(middleware.AuthSupabase).Post("/api/audio", handlers.AudioHandler)

	r.With(middleware.AuthSupabase).Post("/api/words", handlers.SaveWordHandler)
	r.With(middleware.AuthSupabase).Get("/api/words", handlers.ListWordsHandler)

	// Rota para deletar uma palavra específica
	r.With(middleware.AuthSupabase).Delete("/api/words/{id}", handlers.DeleteWordHandler)

	// Lê a porta que a nuvem fornecer. Se estiver vazio usa a 8080 (para testes locais)
	porta := os.Getenv("PORT")
	if porta == "" {
		porta = "8080"
	}

	fmt.Println("Servidor rodando na porta", porta, "...")

	// Usa a porta dinâmica 
	err = http.ListenAndServe(":"+porta, r)
	if err != nil {
		fmt.Println("Erro FATAL NO SERVIDOR:", err)
	}
}