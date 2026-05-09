package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

func (c *apiConfig) getClients(w http.ResponseWriter, r *http.Request) {
	userID, err := c.requireUser(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	clients, err := c.db.ListClientsByUser(r.Context(), uuid.NullUUID{UUID: userID, Valid: true})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, clients)
}

func (c *apiConfig) addClients(w http.ResponseWriter, r *http.Request) {
	userID, err := c.requireUser(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	type input struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	var in input
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	client, err := c.db.CreateClient(r.Context(), database.CreateClientParams{
		Name:   strings.TrimSpace(in.Name),
		Icon:   nullString(in.Icon),
		UserID: uuid.NullUUID{UUID: userID, Valid: true},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusCreated, client)
}

func nullString(value string) sql.NullString {
	value = strings.TrimSpace(value)
	if value == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}
