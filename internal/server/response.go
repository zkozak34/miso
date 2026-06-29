package server

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/zeynelkozak/miso/internal/store"
)

// Response is the envelope every JSON REST endpoint returns. Success carries the
// payload in Data with an empty Error; failure carries a human-readable message
// in Error with a null Data. Streaming endpoints (SSE) are the only exception.
type Response struct {
	Success bool   `json:"success"`
	Data    any    `json:"data"`
	Error   string `json:"error"`
}

// writeData encodes a success envelope wrapping data with the given status code.
func writeData(w http.ResponseWriter, code int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(Response{Success: true, Data: data})
}

// writeJSON sends a 200 success envelope wrapping v.
func writeJSON(w http.ResponseWriter, v any) {
	writeData(w, http.StatusOK, v)
}

// writeCreated sends a 201 success envelope wrapping v.
func writeCreated(w http.ResponseWriter, v any) {
	writeData(w, http.StatusCreated, v)
}

// writeErrorMsg sends a failure envelope with the given status code and message.
func writeErrorMsg(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(Response{Success: false, Error: message})
}

// writeError maps an error to a failure envelope, using 404 for not-found and
// 500 otherwise.
func writeError(w http.ResponseWriter, err error) {
	code := http.StatusInternalServerError
	if errors.Is(err, store.ErrNotFound) {
		code = http.StatusNotFound
	}
	writeErrorMsg(w, code, err.Error())
}

// decodeJSON decodes the request body into v, writing a 400 failure envelope and
// returning false when the body is not valid JSON.
func decodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeErrorMsg(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}
