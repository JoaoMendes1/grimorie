package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"grimoire/internal/database"
	"grimoire/internal/handlers"
	"grimoire/internal/middleware"

	"github.com/go-chi/chi/v5"
)

func main() {
	varsCriticas := []string{"DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLIC_KEY"}
	for _, v := range varsCriticas {
		if os.Getenv(v) == "" {
			fmt.Printf("⛔ ERRO CRÍTICO: Variável de ambiente %s não definida. Servidor abortado.\n", v)
			os.Exit(1)
		}
	}

	fmt.Println("Iniciando Grimoire...")

	err := database.InitDB()
	if err != nil {
		fmt.Printf("Erro crítico na base de dados: %v\n", err)
		return
	}

	r := chi.NewRouter()

	fs := http.FileServer(http.Dir("static"))
	r.Handle("/*", fs)

	r.Get("/api/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"supabaseUrl": os.Getenv("SUPABASE_URL"),
			"supabaseKey": os.Getenv("SUPABASE_PUBLIC_KEY"),
		})
	})

	r.With(middleware.AuthSupabase).Post("/api/translate", handlers.TranslateHandler)
	r.With(middleware.AuthSupabase).Post("/api/audio", handlers.AudioHandler)

	r.With(middleware.AuthSupabase).Post("/api/words", handlers.SaveWordHandler)
	r.With(middleware.AuthSupabase).Get("/api/words", handlers.ListWordsHandler)
	r.With(middleware.AuthSupabase).Delete("/api/words/{id}", handlers.DeleteWordHandler)
	r.With(middleware.AuthSupabase).Put("/api/words/{id}", handlers.UpdateWordHandler)

	r.With(middleware.AuthSupabase).Get("/api/categories", handlers.ListCategoriesHandler)
	r.With(middleware.AuthSupabase).Post("/api/categories", handlers.CreateCategoryHandler)

	r.With(middleware.AuthSupabase).Put("/api/categories/{id}", handlers.UpdateCategoryHandler)
	r.With(middleware.AuthSupabase).Delete("/api/categories/{id}", handlers.DeleteCategoryHandler)

	porta := os.Getenv("PORT")
	if porta == "" {
		porta = "8080"
	}

	fmt.Println("Servidor rodando na porta", porta, "...")

	err = http.ListenAndServe(":"+porta, r)
	if err != nil {
		fmt.Println("Erro FATAL NO SERVIDOR:", err)
	}
}