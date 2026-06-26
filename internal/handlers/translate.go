package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"grimoire/internal/models"
)

// Estrutura para ler a resposta da API de tradução externa
type APIResponse struct {
	ResponseData struct {
		TranslatedText string `json:"translatedText"`
	} `json:"responseData"`
}

func TranslateHandler(w http.ResponseWriter, r *http.Request) {
	var req models.TranslateRequest
	
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil || req.Term == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.TranslateResponse{Error: "Termo inválido"})
		return
	}

	// Prepara a URL da API gratuita (Inglês para Português)
	textoSeguro := url.QueryEscape(req.Term)
	urlTraducao := fmt.Sprintf("https://api.mymemory.translated.net/get?q=%s&langpair=en|pt", textoSeguro)
	
	// Faz a requisição para a internet
	resp, err := http.Get(urlTraducao)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(models.TranslateResponse{Error: "Erro ao conectar com tradutor"})
		return
	}
	defer resp.Body.Close()

	// Lê o resultado
	var apiRes APIResponse
	json.NewDecoder(resp.Body).Decode(&apiRes)

	// Monta a nossa resposta final
	res := models.TranslateResponse{Translation: apiRes.ResponseData.TranslatedText}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}