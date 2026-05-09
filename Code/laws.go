package main

import (
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

type lawIngestRequest struct {
	Filename string `json:"filename"`
	HTML     string `json:"html"`
}

func (c *apiConfig) getLaws(w http.ResponseWriter, r *http.Request) {
	if _, err := c.requireUser(r); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	laws, err := c.db.ListLaws(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, laws)
}

func (c *apiConfig) addLaws(w http.ResponseWriter, r *http.Request) {
	if _, err := c.requireUser(r); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	in, err := decodeHTMLIngestRequest(r, "law.html")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	keywords, err := c.systemKeywordNames(r)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	opts := ChunkOptions{
		DomainKeywords:    keywords,
		IncludeDomains:    len(keywords) > 0,
		EmbeddingModel:    azureEmbeddingModel(),
		IncludeEmbeddings: azureEmbeddingModel() != "",
	}

	chunked, err := c.ChunkHTMLLegislation(r.Context(), in.Filename, in.HTML, opts)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	previousLaw, hasPreviousLaw, err := c.latestLawByCitation(r.Context(), chunked.Citation)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	law, sublaws, err := c.storeChunkDocument(r.Context(), chunked)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	lawChanges := []database.LawChange{}
	if hasPreviousLaw {
		lawChanges, err = c.createLawChanges(r.Context(), previousLaw.ID, law.ID)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	alertsCount, err := c.createAlertsForLawChanges(r.Context(), lawChanges)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusCreated, map[string]any{
		"law":               law,
		"sublaws_count":     len(sublaws),
		"law_changes_count": len(lawChanges),
		"alerts_count":      alertsCount,
	})
}

func azureEmbeddingModel() string {
	model := strings.TrimSpace(os.Getenv("AZURE_EMBEDDING_MODEL"))
	if model == "" {
		return "text-embedding-3-small"
	}
	return model
}

func (c *apiConfig) getLawChanges(w http.ResponseWriter, r *http.Request) {
	if _, err := c.requireUser(r); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	lawA, err := uuid.Parse(r.PathValue("lawA"))
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid lawA")
		return
	}
	lawB, err := uuid.Parse(r.PathValue("lawB"))
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid lawB")
		return
	}
	changes, err := c.db.GetLawChangesBetween(r.Context(), database.GetLawChangesBetweenParams{LawIDOld: lawA, LawIDNew: lawB})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, changes)
}

func (c *apiConfig) getAlerts(w http.ResponseWriter, r *http.Request) {
	userID, err := c.requireUser(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	alerts, err := c.db.ListAlertsForUser(r.Context(), uuid.NullUUID{UUID: userID, Valid: true})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, alerts)
}

func (c *apiConfig) systemKeywordNames(r *http.Request) ([]string, error) {
	keywords, err := c.db.ListKeywords(r.Context())
	if err != nil {
		return nil, err
	}
	names := make([]string, 0, len(keywords))
	for _, keyword := range keywords {
		if strings.TrimSpace(keyword.Name) != "" {
			names = append(names, keyword.Name)
		}
	}
	return names, nil
}
