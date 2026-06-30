package handlers

import (
	"encoding/json"
	"net/http"

	"grimoire/internal/database"
)

// Estruturas para receber e enviar dados das palavras
type WordRequest struct {
	Term            string `json:"term"`
	Translation     string `json: "translation"`
	AudioURL        string `json: "audioUrl"`
}

type WordResponse struct {
	ID              int   `json:"id"`
	Term            string `json:"term"`
	Translation     string `json: "translation"`
	AudioURL        string `json: "audioUrl"`
	Status          string `json: "status"`
}

// SaveWordHandler grava uma nova palavra no banco de dados 
func SaveWordHandler(w http.ResponseWriter, r *http.Request) {
	var req WordRequest
	json.NewDecoder(r.Body).Decode(&req)

	comando := `INSERT INTO vocabularies (term, translation, audio_url) VALUES (?, ?, ?)`
	resultado, err := database.DB.Exec(comando, req.Term, req.Translation, req.AudioURL)

	if err != nil {
		http.Error(w, "Falha ao salvar no banco", http.StatusInternalServerError)
		return
	}

	id, _ := resultado.LastInsertId()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int64{"id": id})

}

// ListWordsHandler lista todas as palavras salva do banco de dados
func ListWordsHandler(w http.ResponseWriter, r *http.Request) {
	linhas, err := database.DB.Query(`SELECT id, term, translation, audio_url, status FROM vocabularies ORDER BY id DESC`)
	if err != nil {
		http.Error(w, "Falha ao buscar dados", http.StatusInternalServerError)
		return 
	}

	defer linhas.Close()

	var words []WordResponse
	for linhas.Next() {
		    var word WordResponse
			linhas.Scan(&word.ID, &word.Term, &word.Translation, &word.AudioURL, &word.Status)
			words = append(words, word)
	}

	// Se o banco estiver vazio, retorna uma lista vazia 
	if words == nil { 
		words = []WordResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(words)
}