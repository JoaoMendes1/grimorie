package middleware 

import (
	"net/http"
	"os"
)

// AuthPIN cria uma barreira de segurança andes de liberar o acesso a uma rota. 
func AuthPIN(next http.Handler) http.Handler {
	
	// Retorna a função que vai processar o pedido que acabou de chegar
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// Busca a senha secreta que vamos configurar no sistema (APP_PIN)
		pinSalvo := os.Getenv("APP_PIN")

		// Busca a senha que o visitante enviou junto com o pedido 
		pinRecebido := r.Header.Get("X-App-PIN")

		// Se existe uma senha exigida no sistema e o visitante enviou uma senha diferente, bloqueia o acesso
		if pinSalvo != "" && pinRecebido != pinSalvo {

			// Avisa que o acesso foi negado (Código 401)
			http.Error(w, "Acesso negado", http.StatusUnauthorized)

			// Interrompe e encerra o processo aqui, bloqueando o acesso 
			return
		}

		// Se a senha estiver correta, (ou se nenhuma senha for exigida), libera a passagem
		next.ServeHTTP(w, r)

	})
}