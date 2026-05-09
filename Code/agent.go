package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

func (c *apiConfig) createConvo(w http.ResponseWriter, r *http.Request) {
	userID, err := c.requireUser(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	type input struct {
		ClientID string `json:"client_id"`
	}
	var in input
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&in)
	}

	clientID := uuid.NullUUID{}
	if strings.TrimSpace(in.ClientID) != "" {
		parsed, err := uuid.Parse(in.ClientID)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid client_id")
			return
		}
		clientID = uuid.NullUUID{UUID: parsed, Valid: true}
	}

	conversation, err := c.db.CreateAgentConversation(r.Context(), database.CreateAgentConversationParams{
		ClientID: clientID,
		UserID:   uuid.NullUUID{UUID: userID, Valid: true},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusCreated, conversation)
}

func (c *apiConfig) contactAgent(w http.ResponseWriter, r *http.Request) {
	userID, err := c.requireUser(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	convoID, err := uuid.Parse(r.PathValue("convoId"))
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid conversation id")
		return
	}
	type input struct {
		Message string `json:"message"`
	}
	var in input
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Message) == "" {
		respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	conversation, err := c.db.GetAgentConversation(r.Context(), convoID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Conversation not found")
		return
	}
	if !conversation.UserID.Valid || conversation.UserID.UUID != userID {
		respondWithError(w, http.StatusForbidden, "Forbidden")
		return
	}

	history, err := c.db.ListAgentConversationMessages(r.Context(), convoID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	userMessage, err := c.db.CreateAgentConversationMessage(r.Context(), database.CreateAgentConversationMessageParams{
		ConversationID: convoID,
		Speaker:        "user",
		Message:        strings.TrimSpace(in.Message),
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	prompt := buildAgentPrompt(history, in.Message)
	answer, err := c.getAzureResponse(prompt)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	assistantMessage, err := c.db.CreateAgentConversationMessage(r.Context(), database.CreateAgentConversationMessageParams{
		ConversationID: convoID,
		Speaker:        "assistant",
		Message:        answer,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := c.db.TouchAgentConversation(r.Context(), convoID); err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]any{
		"user_message":      userMessage,
		"assistant_message": assistantMessage,
	})
}

func buildAgentPrompt(history []database.AgentConversationMessage, latest string) string {
	var b strings.Builder
	b.WriteString("Réponds à l'utilisateur en tenant compte de tout l'historique suivant.\n\n")
	b.WriteString("Conversation:\n")
	for _, message := range history {
		b.WriteString(fmt.Sprintf("%s: %s\n", message.Speaker, message.Message))
	}
	b.WriteString(fmt.Sprintf("user: %s\n", strings.TrimSpace(latest)))
	return b.String()
}
