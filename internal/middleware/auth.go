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

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		jwtSecret := os.Getenv("SUPABASE_JWT_SECRET")

		if jwtSecret == "" {
			fmt.Println("⛔ ERRO CRÍTICO: SUPABASE_JWT_SECRET não definido no ambiente.")
			http.Error(w, "Erro interno do servidor", http.StatusInternalServerError)
			return
		}

		// Faz a validação matemática do token localmente (Super rápido)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de assinatura inesperado: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			fmt.Println("⛔ RECUSADO: Token JWT Inválido ou Expirado:", err)
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		// Extrai o ID do usuário (sub) de dentro do token
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			http.Error(w, "Acesso negado", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}