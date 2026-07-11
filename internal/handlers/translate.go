package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type TranslateRequest struct {
	Term string `json:"term"`
}

type TranslateResponse struct {
	Translation string `json:"translation"`
	SourceLang string `json:"sourceLang"`
}

func TranslateHandler(w http.ResponseWriter, r *http.Request) {
	var req TranslateRequest
	json.NewDecoder(r.Body).Decode(&req)

	if req.Term == "" {
		http.Error(w, "Termo em branco", http.StatusBadRequest)
		return
	}

	textoSeguro := url.QueryEscape(req.Term)
	
	// Primeira tentativa: autodeteta o idioma e tenta traduzir para português
	apiURL := fmt.Sprintf("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=%s", textoSeguro)

	traduzido, idiomaDetectado, err := processarTraducao(apiURL)
	if err != nil {
		http.Error(w, "Erro na API de tradução", http.StatusInternalServerError)
		return
	}

	// Se o idioma detetado for português, refaz o pedido traduzindo para inglês
	if strings.HasPrefix(strings.ToLower(idiomaDetectado), "pt") {
		apiURL = fmt.Sprintf("https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=en&dt=t&q=%s", textoSeguro)
		traduzido, _, _ = processarTraducao(apiURL)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TranslateResponse{
		Translation: traduzido,
		SourceLang:  idiomaDetectado,
	})

}

// Função isolada para evitar repetição 
func processarTraducao(urlReq string) (string, string, error) {
	resp, err := http.Get(urlReq)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var traduzido string
	var idiomaDetectado string
	var dados []interface{}
	
	if err := json.Unmarshal(body, &dados); err == nil && len(dados) > 0 {
		// Extrai o texto traduzido (índice 0)
		if blocos, ok := dados[0].([]interface{}); ok && len(blocos) > 0 {
			for _, bloco := range blocos {
				if pedaco, ok := bloco.([]interface{}); ok && len(pedaco) > 0 {
					traduzido += fmt.Sprintf("%v", pedaco[0])
				}
			}
		}
		
		// Extrai o idioma detetado (índice 2)
		if len(dados) > 2 {
			if lang, ok := dados[2].(string); ok {
				idiomaDetectado = lang
			}
		}
	}

	return traduzido, idiomaDetectado, nil
}