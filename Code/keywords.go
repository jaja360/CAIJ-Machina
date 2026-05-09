package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jaja360/CAIJ-Machina/internal/database"
)

func (c *apiConfig) getKeywords(w http.ResponseWriter, r *http.Request) {
	if _, err := c.requireUser(r); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	keywords, err := c.db.ListKeywords(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, keywords)
}

func (c *apiConfig) replaceKeywords(w http.ResponseWriter, r *http.Request) {
	userID, err := c.requireUser(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	type input struct {
		Keywords []string `json:"keywords"`
	}
	var in input
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	seen := map[string]struct{}{}
	created := make([]database.Keyword, 0, len(in.Keywords))
	for _, name := range in.Keywords {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		keyword, err := c.db.UpsertKeywordByName(r.Context(), name)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		created = append(created, keyword)
	}

	if err := c.db.RemoveAllUserKeywords(r.Context(), userID); err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	for _, keyword := range created {
		_, err := c.db.AddUserKeyword(r.Context(), database.AddUserKeywordParams{UserID: userID, Keyword: keyword.ID})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	respondWithJSON(w, http.StatusOK, created)
}
