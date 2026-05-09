package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

type lawIngestRequest struct {
	Filename string `json:"filename"`
	HTML     string `json:"html"`
	OldLawID string `json:"old_law_id"`
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
	var in lawIngestRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.HTML) == "" {
		respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if strings.TrimSpace(in.Filename) == "" {
		in.Filename = "law.html"
	}

	withAI := r.URL.Query().Get("with_ai") == "true"
	opts := ChunkOptions{}
	if withAI {
		keywords, err := c.systemKeywordNames(r)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if len(keywords) > 0 {
			opts.IncludeDomains = true
			opts.DomainKeywords = keywords
		}
	}

	chunked, err := c.ChunkHTMLLegislation(r.Context(), in.Filename, in.HTML, opts)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	law, sublaws, err := c.storeChunkDocument(r.Context(), chunked)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var oldLawID uuid.UUID
	if strings.TrimSpace(in.OldLawID) != "" {
		oldLawID, err = uuid.Parse(in.OldLawID)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid old_law_id")
			return
		}
	}
	lawChanges := []database.LawChange{}
	if oldLawID != uuid.Nil {
		lawChanges, err = c.createLawChangesForIngest(r.Context(), oldLawID, law.ID, sublaws)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	alertsCount, err := c.analyzeLawAndCreateAlerts(r.Context(), law, sublaws, lawChanges)
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

func (c *apiConfig) createLawChangesForIngest(ctx context.Context, oldLawID, newLawID uuid.UUID, newSublaws []database.Sublaw) ([]database.LawChange, error) {
	changes := []database.LawChange{}
	for _, newSublaw := range newSublaws {
		if !newSublaw.Anchor.Valid {
			continue
		}
		oldSublaw, err := c.db.GetSublawByLawAndAnchor(ctx, database.GetSublawByLawAndAnchorParams{DocumentID: oldLawID, Anchor: newSublaw.Anchor})
		if err != nil {
			if err == sql.ErrNoRows {
				continue
			}
			return nil, err
		}
		if oldSublaw.Content.String == newSublaw.Content.String {
			continue
		}
		explanation := c.describeLawChange(oldSublaw, newSublaw)
		change, err := c.db.CreateLawChange(ctx, database.CreateLawChangeParams{
			Explanation: explanation,
			LawIDOld:    oldLawID,
			LawIDNew:    newLawID,
			SubLawIDOld: oldSublaw.ID,
			SubLawIDNew: newSublaw.ID,
		})
		if err != nil {
			return nil, err
		}
		changes = append(changes, change)
	}
	return changes, nil
}

func (c *apiConfig) describeLawChange(oldSublaw, newSublaw database.Sublaw) string {
	anchor := newSublaw.Anchor.String
	prompt := fmt.Sprintf("Résume brièvement en français le changement juridique entre ces deux versions de l'article %s. Ancien: %s\n\nNouveau: %s", anchor, truncateForPrompt(oldSublaw.Content.String), truncateForPrompt(newSublaw.Content.String))
	if response, err := c.getAzureResponse(prompt); err == nil && strings.TrimSpace(response) != "" {
		return response
	}
	return fmt.Sprintf("Contenu modifié pour %s", anchor)
}

func truncateForPrompt(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 1200 {
		return value
	}
	return value[:1200] + "..."
}
