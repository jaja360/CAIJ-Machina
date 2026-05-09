package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

func (c *apiConfig) createLawChangesForLawVersions(ctx context.Context, oldLawID, newLawID uuid.UUID) ([]database.LawChange, error) {
	oldSublaws, err := c.db.ListSublawsByLaw(ctx, oldLawID)
	if err != nil {
		return nil, err
	}
	newSublaws, err := c.db.ListSublawsByLaw(ctx, newLawID)
	if err != nil {
		return nil, err
	}

	oldByKey := map[string]database.Sublaw{}
	for _, sublaw := range oldSublaws {
		key := sublawComparisonKey(sublaw)
		if key != "" {
			oldByKey[key] = sublaw
		}
	}

	changes := make([]database.LawChange, 0)
	for _, newSublaw := range newSublaws {
		oldSublaw, ok := oldByKey[sublawComparisonKey(newSublaw)]
		if !ok {
			continue
		}
		if strings.TrimSpace(oldSublaw.Content.String) == strings.TrimSpace(newSublaw.Content.String) {
			continue
		}
		explanation := c.legalChangeExplanation(oldSublaw, newSublaw)
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

func sublawComparisonKey(sublaw database.Sublaw) string {
	if sublaw.Anchor.Valid && strings.TrimSpace(sublaw.Anchor.String) != "" {
		return "anchor:" + strings.TrimSpace(sublaw.Anchor.String)
	}
	if sublaw.Sequence.Valid && strings.TrimSpace(sublaw.Sequence.String) != "" {
		return "sequence:" + strings.TrimSpace(sublaw.Sequence.String)
	}
	return ""
}

func (c *apiConfig) legalChangeExplanation(oldSublaw, newSublaw database.Sublaw) string {
	anchor := newSublaw.Anchor.String
	prompt := fmt.Sprintf(
		"Tu es un analyste juridique. Compare les deux versions suivantes d'une même section législative et explique clairement les raisons, la portée et l'importance du changement. Réponds en français, de façon concise et exploitable.\n\nSection: %s\n\nAncienne version:\n%s\n\nNouvelle version:\n%s",
		anchor,
		truncateForPrompt(oldSublaw.Content.String),
		truncateForPrompt(newSublaw.Content.String),
	)
	if response, err := c.getAzureResponse(prompt); err == nil && strings.TrimSpace(response) != "" {
		return response
	}
	if anchor == "" {
		anchor = newSublaw.ID.String()
	}
	return fmt.Sprintf("Changement détecté dans la section %s.", anchor)
}

func (c *apiConfig) latestLawByCitation(ctx context.Context, citation string) (database.Law, bool, error) {
	law, err := c.db.GetLatestLawByCitation(ctx, citation)
	if err != nil {
		if err == sql.ErrNoRows {
			return database.Law{}, false, nil
		}
		return database.Law{}, false, err
	}
	return law, true, nil
}
