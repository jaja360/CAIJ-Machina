package main

import (
	"net/http"
)

func (cfg *apiConfig) reset(w http.ResponseWriter, r *http.Request) {
	if cfg.platform != "dev" {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte("Forbidden"))
		return
	}
	cfg.db.ResetUserTable(r.Context())
	w.WriteHeader(http.StatusOK)
}
