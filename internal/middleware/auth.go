package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
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

		// Extrai apenas o token, tirando o "Bearer "
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")

		if jwtSecret == "" {
			fmt.Println("⛔ ERRO: Variável SUPABASE_JWT_SECRET ausente.")
			http.Error(w, "Erro interno do servidor", http.StatusInternalServerError)
			return
		}

		// Faz o parsing e a validação do token usando o segredo do Supabase
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de assinatura inesperado: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		// Verifica se houve erro na leitura ou se o token está expirado/inválido
		if err != nil || !token.Valid {
			fmt.Println("⛔ RECUSADO: Token JWT inválido ou expirado:", err)
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		// Extrai os dados internos (claims) do token
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			fmt.Println("⛔ RECUSADO: Falha ao extrair claims do token.")
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		// O Supabase guarda o ID do usuário no claim "sub" (subject)
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			fmt.Println("⛔ RECUSADO: Falha ao ler ID (sub) do usuário.")
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		// Repassa o ID do usuário validado para o contexto da requisição
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}