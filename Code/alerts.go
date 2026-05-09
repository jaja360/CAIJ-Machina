package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

type alertTarget struct {
	UserID   uuid.NullUUID
	ClientID uuid.NullUUID
}

func (c *apiConfig) analyzeLawAndCreateAlerts(ctx context.Context, law database.Law, sublaws []database.Sublaw, changes []database.LawChange) (int, error) {
	targetKeywords := map[alertTarget]map[string]struct{}{}
	for _, sublaw := range sublaws {
		for _, keywordName := range sublawKeywordNames(sublaw) {
			keyword, err := c.db.GetKeywordByName(ctx, keywordName)
			if err != nil {
				continue
			}
			users, err := c.db.ListUsersByKeyword(ctx, keyword.ID)
			if err != nil {
				return 0, err
			}
			for _, user := range users {
				addTargetKeyword(targetKeywords, alertTarget{UserID: uuid.NullUUID{UUID: user.ID, Valid: true}}, keyword.Name)
			}
			clients, err := c.db.ListClientsByKeyword(ctx, keyword.ID)
			if err != nil {
				return 0, err
			}
			for _, client := range clients {
				addTargetKeyword(targetKeywords, alertTarget{ClientID: uuid.NullUUID{UUID: client.ID, Valid: true}}, keyword.Name)
			}
		}
	}

	if len(targetKeywords) == 0 {
		return 0, nil
	}
	lawChangeID := uuid.NullUUID{}
	if len(changes) > 0 {
		lawChangeID = uuid.NullUUID{UUID: changes[0].ID, Valid: true}
	}
	count := 0
	for target, keywordSet := range targetKeywords {
		keywords := setToSlice(keywordSet)
		priority := "medium"
		if len(keywords) >= 3 {
			priority = "high"
		}
		message := c.alertMessage(law.Citation, keywords)
		_, err := c.db.CreateAlert(ctx, database.CreateAlertParams{
			UserID:        target.UserID,
			ClientID:      target.ClientID,
			ContactMethod: "email",
			SendAt:        time.Now(),
			Priority:      priority,
			LawChangeID:   lawChangeID,
			Message:       message,
		})
		if err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

func sublawKeywordNames(sublaw database.Sublaw) []string {
	if !sublaw.Keywords.Valid || strings.TrimSpace(sublaw.Keywords.String) == "" {
		return nil
	}
	var names []string
	if err := json.Unmarshal([]byte(sublaw.Keywords.String), &names); err != nil {
		return nil
	}
	cleaned := make([]string, 0, len(names))
	for _, name := range names {
		name = strings.TrimSpace(name)
		if name != "" {
			cleaned = append(cleaned, name)
		}
	}
	return cleaned
}

func addTargetKeyword(targetKeywords map[alertTarget]map[string]struct{}, target alertTarget, keyword string) {
	if _, ok := targetKeywords[target]; !ok {
		targetKeywords[target] = map[string]struct{}{}
	}
	targetKeywords[target][keyword] = struct{}{}
}

func setToSlice(set map[string]struct{}) []string {
	items := make([]string, 0, len(set))
	for item := range set {
		items = append(items, item)
	}
	return items
}

func (c *apiConfig) alertMessage(citation string, keywords []string) string {
	message := fmt.Sprintf("Nouvelle mise à jour pour %s liée aux mots-clés: %s.", citation, strings.Join(keywords, ", "))
	prompt := "Rédige une alerte concise et exploitable en français pour un client juridique. " + message
	if response, err := c.getAzureResponse(prompt); err == nil && strings.TrimSpace(response) != "" {
		return response
	}
	return message
}
