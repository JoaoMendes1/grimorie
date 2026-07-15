package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// NOVO: Estrutura que guarda o limitador e a hora do último acesso do usuário
type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	// O mapa agora guarda a nossa estrutura 'client'
	clients = make(map[string]*client)
	mu      sync.Mutex
	once    sync.Once
)

// getLimiter busca o limitador de um IP específico ou cria um novo
func getLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	c, exists := clients[ip]
	if !exists {
		// Regra: 2 requisições por segundo, com capacidade para picos de até 20 simultâneas.
		c = &client{
			limiter: rate.NewLimiter(rate.Every(time.Second/2), 20),
		}
		clients[ip] = c
	}

	// Atualiza o "relógio" toda vez que o IP fizer uma requisição
	c.lastSeen = time.Now()
	return c.limiter
}

// cleanupClients remove IPs que não fazem requisições há algum tempo.
func cleanupClients() {
	for {
		// Aguarda 3 minutos antes de cada limpeza
		time.Sleep(3 * time.Minute)

		mu.Lock()
		for ip, c := range clients {
			// CORREÇÃO: Se passou mais de 3 minutos desde a última requisição, o IP é apagado
			if time.Since(c.lastSeen) > 3*time.Minute {
				delete(clients, ip)
			}
		}
		mu.Unlock()
	}
}

// RateLimitAPI é o escudo que vai na frente das nossas rotas sensíveis
func RateLimitAPI(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Garante que a rotina de limpeza seja iniciada apenas uma vez.
		once.Do(func() {
			go cleanupClients()
		})

		// Pega o IP original do usuário
		ip := r.RemoteAddr

		// Como vamos rodar no Render (que usa Proxy), precisamos pegar o IP real do header
		forwarded := r.Header.Get("X-Forwarded-For")
		if forwarded != "" {
			// O X-Forwarded-For pode conter uma lista de IPs, pegamos o primeiro
			ips := strings.Split(forwarded, ",")
			ip = strings.TrimSpace(ips[0])
		} else {
			// Limpa a porta do RemoteAddr caso seja localhost (ex: 127.0.0.1:54321 -> 127.0.0.1)
			ip = strings.Split(ip, ":")[0]
		}

		limiter := getLimiter(ip)

		// Se o usuário estourar o limite, ele toma um bloqueio instantâneo
		if !limiter.Allow() {
			http.Error(w, `{"error": "Muitas requisições. Tente novamente em alguns instantes."}`, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}