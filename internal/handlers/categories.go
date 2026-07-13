package handlers

import (
	"encoding/json"
	"grimoire/internal/database"
	"net/http"
)

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

func ListCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok || userID == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	linhas, err := database.DB.Query("SELECT id, name FROM categories WHERE user_id = $1 ORDER BY name ASC", userID)
	if err != nil {
		http.Error(w, "Erro na busca", http.StatusInternalServerError)
		return
	}
	defer linhas.Close()

	var categories []Category
	for linhas.Next() {
		var cat Category
		if err := linhas.Scan(&cat.ID, &cat.Name); err == nil {
			categories = append(categories, cat)
		}
	}

	if categories == nil {
		categories = []Category{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func CreateCategoryHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok || userID == "" {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var req Category
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "Nome inválido", http.StatusBadRequest)
		return
	}

	var id int
	err := database.DB.QueryRow("INSERT INTO categories (name, user_id) VALUES ($1, $2) RETURNING id", req.Name, userID).Scan(&id)
	if err != nil {
		http.Error(w, "Falha ao gravar", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{"id": id})
}