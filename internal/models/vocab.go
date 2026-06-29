package models

type TranslateRequest struct {
	Term string `json:"term"`
}

type TranslateResponse struct {
	Translation string `json:"translation"`
	Error       string `json:"error,omitempty"`
}

type AudioRequest struct {
	Term string `json: "term"`
}

type AudioResponse struct {
	AudioURL string `json: "audioUrl"`
	Error    string `json: "error,omitempty"`
}
