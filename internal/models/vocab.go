package models

type TranslateRequest struct {
	Term string `json:"term"`
}

type TranslateResponse struct {
	Translation string `json:"translation"`
	Error       string `json:"error,omitempty"`
}