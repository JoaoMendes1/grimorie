package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

type contextKey string
const UserIDKey contextKey = "userID"

func AuthSupabase(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		supabaseURL := os.Getenv("SUPABASE_URL")
		supabaseKey := os.Getenv("SUPABASE_PUBLIC_KEY")

		if supabaseURL == "" || supabaseKey == "" {
			fmt.Println("⛔ ERRO: Variáveis do Supabase ausentes.")
			http.Error(w, "Erro interno do servidor", http.StatusInternalServerError)
			return
		}

		// Validação direta com a API do Supabase (Imune a trocas de tipo de chave ECC/HS256)
		reqSB, err := http.NewRequest("GET", supabaseURL+"/auth/v1/user", nil)
		if err != nil {
			http.Error(w, "Erro interno ao montar requisição", http.StatusInternalServerError)
			return
		}
		
		reqSB.Header.Add("Authorization", authHeader)
		reqSB.Header.Add("apikey", supabaseKey)

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(reqSB)

		if err != nil {
			fmt.Println("⛔ RECUSADO: Erro de rede ao contactar Supabase:", err)
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			fmt.Println("⛔ RECUSADO: Supabase rejeitou o token (Status:", resp.StatusCode, ")")
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		var dadosUsuario struct {
			ID string `json:"id"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&dadosUsuario); err != nil || dadosUsuario.ID == "" {
			fmt.Println("⛔ RECUSADO: Falha ao ler ID do usuário.")
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, dadosUsuario.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}