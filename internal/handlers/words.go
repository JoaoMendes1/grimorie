package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"grimoire/internal/database"
	"grimoire/internal/middleware"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type WordRequest struct {
	Term        string `json:"term"`
	Translation string `json:"translation"`
	AudioURL    string `json:"audioUrl"`
	CategoryID  *int   `json:"category_id"`
}

type WordResponse struct {
	ID          int    `json:"id"`
	Term        string `json:"term"`
	Translation string `json:"translation"`
	AudioURL    string `json:"audioUrl"`
	Status      string `json:"status"`
	CategoryID  *int   `json:"category_id"`
}

func getUserID(r *http.Request) (string, bool) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	return userID, ok
}

func SaveWordHandler(w http.ResponseWriter, r *http.Request) {
	var req WordRequest
	json.NewDecoder(r.Body).Decode(&req)

	userID, ok := getUserID(r)
	if !ok || userID == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	comando := `INSERT INTO vocabularies (term, translation, audio_url, user_id, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`

	var id int64
	err := database.DB.QueryRow(comando, req.Term, req.Translation, req.AudioURL, userID, req.CategoryID).Scan(&id)

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

	linhas, err := database.DB.Query(`SELECT id, term, translation, audio_url, status, category_id FROM vocabularies WHERE user_id = $1 ORDER BY id DESC`, userID)
	if err != nil {
		http.Error(w, "Falha na busca", http.StatusInternalServerError)
		return
	}
	defer linhas.Close()

	var words []WordResponse
	for linhas.Next() {
		var word WordResponse
		var audioURL, status sql.NullString
		var catID sql.NullInt32

		err := linhas.Scan(&word.ID, &word.Term, &word.Translation, &audioURL, &status, &catID)
		if err != nil {
			continue
		}

		if audioURL.Valid {
			word.AudioURL = audioURL.String
		}
		if status.Valid {
			word.Status = status.String
		}
		if catID.Valid {
			val := int(catID.Int32)
			word.CategoryID = &val
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

	_, err := database.DB.Exec("DELETE FROM vocabularies WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		http.Error(w, "Erro ao apagar", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func UpdateWordHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok || userID == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	wordID := chi.URLParam(r, "id")

	var req WordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Dados inválidos", http.StatusBadRequest)
		return
	}

	_, err := database.DB.Exec(
		"UPDATE vocabularies SET term = $1, translation = $2, category_id = $3, audio_url = $4 WHERE id = $5 AND user_id = $6",
		req.Term, req.Translation, req.CategoryID, req.AudioURL, wordID, userID,
	)
	if err != nil {
		http.Error(w, "Erro ao atualizar", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}