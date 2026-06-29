package handlers

import (
	"encoding/json"
	"fmt"
	"grimoire/internal/models"
	"net/http"
	"net/url"
)

func AudioHandler(w http.ResponseWriter, r *http.Request) {
	var req models.AudioRequest

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil || req.Term == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(models.AudioResponse{Error: "Termo em branco "})
		return
	}

	textoSeguro := url.QueryEscape(req.Term)
	urlAudio := fmt.Sprintf("https://translate.google.com/translate_tts?ie=UTF-8&q=%s&tl=en&client=tw-ob", textoSeguro)

	res := models.AudioResponse{AudioURL: urlAudio}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}
