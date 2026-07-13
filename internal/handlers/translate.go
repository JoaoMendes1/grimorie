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
	SourceLang  string `json:"sourceLang"`
}

func TranslateHandler(w http.ResponseWriter, r *http.Request) {
	var req TranslateRequest
	json.NewDecoder(r.Body).Decode(&req)

	if req.Term == "" {
		http.Error(w, "Termo em branco", http.StatusBadRequest)
		return
	}

	textoSeguro := url.QueryEscape(req.Term)
	
	// TENTATIVA 1: Endpoint Principal
	apiURL := fmt.Sprintf("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=%s", textoSeguro)
	traduzido, idiomaDetectado, err := processarTraducao(apiURL)

	// TENTATIVA 2 (Fallback): Se o primeiro falhar, tenta o endpoint alternativo do Chrome
	if err != nil || traduzido == "" {
		fmt.Println("⚠️ Tradução primária falhou, acionando Fallback...")
		fallbackURL := fmt.Sprintf("https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=pt&q=%s", textoSeguro)
		traduzido, idiomaDetectado, _ = processarTraducaoFallback(fallbackURL)
	}

	// Se for Pt->En
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

// Lógica de leitura para o Endpoint 1
func processarTraducao(urlReq string) (string, string, error) {
	resp, err := http.Get(urlReq)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var traduzido, idiomaDetectado string
	var dados []interface{}
	
	if err := json.Unmarshal(body, &dados); err == nil && len(dados) > 0 {
		if blocos, ok := dados[0].([]interface{}); ok && len(blocos) > 0 {
			for _, bloco := range blocos {
				if pedaco, ok := bloco.([]interface{}); ok && len(pedaco) > 0 {
					traduzido += fmt.Sprintf("%v", pedaco[0])
				}
			}
		}
		if len(dados) > 2 {
			if lang, ok := dados[2].(string); ok {
				idiomaDetectado = lang
			}
		}
	}
	return traduzido, idiomaDetectado, nil
}

// Lógica de leitura mais simples para o Endpoint 2 (Fallback)
func processarTraducaoFallback(urlReq string) (string, string, error) {
	resp, err := http.Get(urlReq)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var dados map[string]interface{}
	
	if err := json.Unmarshal(body, &dados); err == nil {
		if sentences, ok := dados["sentences"].([]interface{}); ok && len(sentences) > 0 {
			if first, ok := sentences[0].(map[string]interface{}); ok {
				if trans, ok := first["trans"].(string); ok {
					return trans, "en", nil // Força 'en' por simplicidade no fallback
				}
			}
		}
	}
	return "", "en", fmt.Errorf("fallback falhou")
}