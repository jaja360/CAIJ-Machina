package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

func (c *apiConfig) createLawChanges(ctx context.Context, oldLawID, newLawID uuid.UUID) ([]database.LawChange, error) {
	oldSublaws, err := c.db.ListSublawsByLaw(ctx, oldLawID)
	if err != nil {
		return nil, err
	}
	newSublaws, err := c.db.ListSublawsByLaw(ctx, newLawID)
	if err != nil {
		return nil, err
	}
	if err := c.db.DeleteLawChangesBetween(ctx, database.DeleteLawChangesBetweenParams{
		LawIDOld: oldLawID,
		LawIDNew: newLawID,
	}); err != nil {
		return nil, err
	}

	oldByIdentifier := make(map[string]database.Sublaw, len(oldSublaws))
	for _, sublaw := range oldSublaws {
		identifier := sublawIdentifier(sublaw)
		if identifier == "" {
			continue
		}
		oldByIdentifier[identifier] = sublaw
	}

	changes := make([]database.LawChange, 0)
	for _, newSublaw := range newSublaws {
		identifier := sublawIdentifier(newSublaw)
		if identifier == "" {
			continue
		}
		oldSublaw, ok := oldByIdentifier[identifier]
		if !ok {
			continue
		}

		oldText := strings.TrimSpace(nullStringValue(oldSublaw.Content))
		newText := strings.TrimSpace(nullStringValue(newSublaw.Content))
		if oldText == newText {
			continue
		}

		explanation, err := c.describeLawChange(ctx, identifier, oldSublaw, newSublaw)
		if err != nil {
			return nil, err
		}
		change, err := c.db.CreateLawChange(ctx, database.CreateLawChangeParams{
			Explanation: explanation,
			OldText:     oldText,
			NewText:     newText,
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

func (c *apiConfig) describeLawChange(ctx context.Context, identifier string, oldSublaw, newSublaw database.Sublaw) (string, error) {
	prompt := fmt.Sprintf(
		"Explique en francais, en 2 ou 3 phrases, le raisonnement juridique probable derriere la modification de la section %s. Utilise le texte comme source principale et les embeddings Azure OpenAI comme signal semantique complementaire.\n\nAncienne version: %s\n\nNouvelle version: %s\n\nEmbedding ancienne version: %s\n\nEmbedding nouvelle version: %s",
		identifier,
		truncateForPrompt(nullStringValue(oldSublaw.Content)),
		truncateForPrompt(nullStringValue(newSublaw.Content)),
		truncateForPrompt(nullStringValue(oldSublaw.Embedding)),
		truncateForPrompt(nullStringValue(newSublaw.Embedding)),
	)
	response, err := c.getAzureResponse(prompt)
	if err != nil {
		return "", err
	}
	response = strings.TrimSpace(response)
	if response == "" {
		return fmt.Sprintf("Modification detectee pour la section %s.", identifier), nil
	}
	return response, nil
}

func sublawIdentifier(sublaw database.Sublaw) string {
	if value := strings.TrimSpace(nullStringValue(sublaw.Anchor)); value != "" {
		return value
	}
	if value := strings.TrimSpace(sublaw.Citation); value != "" {
		return value
	}
	return strings.TrimSpace(nullStringValue(sublaw.Sequence))
}

func nullStringValue(value sql.NullString) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func truncateForPrompt(value string) string {
	value = strings.TrimSpace(value)
	if len(value) <= 1200 {
		return value
	}
	return value[:1200] + "..."
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
