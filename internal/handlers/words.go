package handlers

import (
	"database/sql"
	"encoding/json"
	"grimoire/internal/database"
	"net/http"
	"fmt"

	"github.com/go-chi/chi/v5"
	"grimoire/internal/middleware"

)

type WordRequest struct {
	Term        string `json:"term"`
	Translation string `json:"translation"`
	AudioURL    string `json:"audioUrl"`
}

type WordResponse struct {
	ID          int    `json:"id"`
	Term        string `json:"term"`
	Translation string `json:"translation"`
	AudioURL    string `json:"audioUrl"`
	Status      string `json:"status"`
}

func getUserID(r *http.Request) (string, bool) {
    userID, ok := r.Context().Value(middleware.UserIDKey).(string)
    return userID, ok
}


func SaveWordHandler(w http.ResponseWriter, r *http.Request) {
	var req WordRequest
	json.NewDecoder(r.Body).Decode(&req)

	// Recupera a identificação de quem está a usar
	userID, ok := getUserID(r)
if !ok || userID == "" {
    http.Error(w, "Não autorizado", http.StatusUnauthorized)
    return
}


	comando := `INSERT INTO vocabularies (term, translation, audio_url, user_id) VALUES ($1, $2, $3, $4) RETURNING id`
	
	var id int64
	err := database.DB.QueryRow(comando, req.Term, req.Translation, req.AudioURL, userID).Scan(&id)

	if err != nil {
		fmt.Println("Erro ao inserir:", err) 
		http.Error(w, "Falha ao gravar", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int64{"id": id})
}

func ListWordsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
if !ok || userID == "" {
    http.Error(w, "Não autorizado", http.StatusUnauthorized)
    return
}


	// Filtra os dados pelo ID
	linhas, err := database.DB.Query(`SELECT id, term, translation, audio_url, status FROM vocabularies WHERE user_id = $1 ORDER BY id DESC`, userID)
	if err != nil {
		http.Error(w, "Falha na busca", http.StatusInternalServerError)
		return
	}
	defer linhas.Close()

	var words []WordResponse
	for linhas.Next() {
		var word WordResponse
		var audioURL, status sql.NullString 

		err := linhas.Scan(&word.ID, &word.Term, &word.Translation, &audioURL, &status)
		if err != nil {
			continue 
		}

		if audioURL.Valid {
			word.AudioURL = audioURL.String
		}
		if status.Valid {
			word.Status = status.String 
		}

		words = append(words, word)
	}

	if words == nil {
		words = []WordResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(words)
}

func DeleteWordHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID, ok := getUserID(r)
if !ok || userID == "" {
    http.Error(w, "Não autorizado", http.StatusUnauthorized)
    return
}


	// Garante a eliminação apenas dos dados corretos
	_, err := database.DB.Exec("DELETE FROM vocabularies WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		http.Error(w, "Erro ao apagar", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}