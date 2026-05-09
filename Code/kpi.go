package main

import "net/http"

func (c *apiConfig) getKpi(w http.ResponseWriter, r *http.Request) {
	if _, err := c.requireUser(r); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}

	alerts, err := c.db.CountRecentAlerts(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	lawChanges, err := c.db.CountRecentLawChanges(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	laws, err := c.db.CountRecentLaws(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]int64{
		"alerts_24h":      alerts,
		"law_changes_24h": lawChanges,
		"laws_24h":        laws,
	})
}
