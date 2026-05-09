package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/database"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/responses"
	"github.com/openai/openai-go/v3/shared"
)

const agentQueryRowLimit = 50

var agentAllowedTables = map[string]struct{}{
	"alerts":             {},
	"client_metadatas":   {},
	"clients":            {},
	"document_revisions": {},
	"documents":          {},
	"keywords":           {},
	"law_changes":        {},
	"laws":               {},
	"subdocuments":       {},
	"sublaws":            {},
}

var agentForbiddenSQLPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|copy|execute|call|do|vacuum|analyze)\b`),
	regexp.MustCompile(`(?i)--`),
	regexp.MustCompile(`/\*`),
}

var agentTableReferencePattern = regexp.MustCompile(`(?i)\b(?:from|join)\s+([a-z_][a-z0-9_]*)`)

type agentSQLPlan struct {
	Query string `json:"query"`
}

type agentQueryResult struct {
	Columns []string         `json:"columns"`
	Rows    []map[string]any `json:"rows"`
	Count   int              `json:"count"`
}

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

	clientID, err := parseNullableClientID(strings.TrimSpace(in.ClientID))
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid client_id")
		return
	}
	if err := c.ensureClientExists(r.Context(), clientID); err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	azureConversationID, err := c.createAzureConversation(r.Context(), clientID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	conversation, err := c.db.CreateAgentConversation(r.Context(), database.CreateAgentConversationParams{
		ClientID:            clientID,
		UserID:              uuid.NullUUID{UUID: userID, Valid: true},
		AzureConversationID: sql.NullString{String: azureConversationID, Valid: true},
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
	in.Message = strings.TrimSpace(in.Message)

	conversation, err := c.db.GetAgentConversation(r.Context(), convoID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Conversation not found")
		return
	}
	if !conversation.UserID.Valid || conversation.UserID.UUID != userID {
		respondWithError(w, http.StatusForbidden, "Forbidden")
		return
	}

	conversation, err = c.ensureAzureConversationID(r.Context(), conversation)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	userMessage, err := c.db.CreateAgentConversationMessage(r.Context(), database.CreateAgentConversationMessageParams{
		ConversationID: convoID,
		Speaker:        "user",
		Message:        in.Message,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	answer, sqlQuery, queryResult, err := c.answerAgentMessage(r.Context(), conversation, in.Message)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
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
		"user_message":         userMessage,
		"assistant_message":    assistantMessage,
		"sql_query":            sqlQuery,
		"sql_result_row_count": queryResult.Count,
	})
}

func parseNullableClientID(raw string) (uuid.NullUUID, error) {
	if raw == "" {
		return uuid.NullUUID{}, nil
	}
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return uuid.NullUUID{}, err
	}
	return uuid.NullUUID{UUID: parsed, Valid: true}, nil
}

func (c *apiConfig) ensureClientExists(ctx context.Context, clientID uuid.NullUUID) error {
	if !clientID.Valid {
		return nil
	}
	_, err := c.db.GetClient(ctx, clientID.UUID)
	if err == nil {
		return nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("Client not found")
	}
	return err
}

func (c *apiConfig) ensureAzureConversationID(ctx context.Context, conversation database.AgentConversation) (database.AgentConversation, error) {
	if conversation.AzureConversationID.Valid && strings.TrimSpace(conversation.AzureConversationID.String) != "" {
		return conversation, nil
	}

	azureConversationID, err := c.createAzureConversation(ctx, conversation.ClientID)
	if err != nil {
		return conversation, err
	}

	return c.db.SetAgentConversationAzureID(ctx, database.SetAgentConversationAzureIDParams{
		ID:                  conversation.ID,
		AzureConversationID: sql.NullString{String: azureConversationID, Valid: true},
	})
}

func (c *apiConfig) createAzureConversation(ctx context.Context, clientID uuid.NullUUID) (string, error) {
	response, err := c.openaiClient.Responses.New(ctx, responses.ResponseNewParams{
		Instructions: openai.String(agentConversationInstructions(clientID)),
		Input: responses.ResponseNewParamsInputUnion{
			OfString: openai.String("Initialise une nouvelle conversation client et confirme que le contexte est pret."),
		},
		Model: openai.ChatModelGPT5_4Nano,
		Store: openai.Bool(true),
		Text: responses.ResponseTextConfigParam{
			Format: responses.ResponseFormatTextConfigUnionParam{OfText: &shared.ResponseFormatTextParam{}},
		},
	})
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(response.Conversation.ID) == "" {
		return "", errors.New("Azure OpenAI did not return a conversation id")
	}
	return response.Conversation.ID, nil
}

func (c *apiConfig) answerAgentMessage(ctx context.Context, conversation database.AgentConversation, clientMessage string) (string, string, agentQueryResult, error) {
	plan, err := c.buildAgentSQLPlan(ctx, conversation.ClientID, clientMessage)
	if err != nil {
		return "", "", agentQueryResult{}, err
	}

	queryResult, err := c.runAgentSQLQuery(ctx, plan.Query)
	if err != nil {
		return "", plan.Query, agentQueryResult{}, err
	}

	answer, err := c.createAgentReply(ctx, conversation.AzureConversationID.String, conversation.ClientID, clientMessage, plan.Query, queryResult)
	if err != nil {
		return "", plan.Query, queryResult, err
	}

	return answer, plan.Query, queryResult, nil
}

func (c *apiConfig) buildAgentSQLPlan(ctx context.Context, clientID uuid.NullUUID, clientMessage string) (agentSQLPlan, error) {
	response, err := c.openaiClient.Responses.New(ctx, responses.ResponseNewParams{
		Instructions: openai.String(agentSQLPlannerInstructions(clientID)),
		Input: responses.ResponseNewParamsInputUnion{
			OfString: openai.String(clientMessage),
		},
		Model:       openai.ChatModelGPT5_4Nano,
		Temperature: openai.Float(0),
		Text: responses.ResponseTextConfigParam{
			Format: responses.ResponseFormatTextConfigParamOfJSONSchema("agent_sql_plan", map[string]any{
				"type":                 "object",
				"additionalProperties": false,
				"properties": map[string]any{
					"query": map[string]any{"type": "string"},
				},
				"required": []string{"query"},
			}),
		},
	})
	if err != nil {
		return agentSQLPlan{}, err
	}

	var plan agentSQLPlan
	if err := json.Unmarshal([]byte(response.OutputText()), &plan); err != nil {
		return agentSQLPlan{}, fmt.Errorf("invalid SQL plan returned by Azure OpenAI: %w", err)
	}
	plan.Query = normalizeSQL(plan.Query)
	if err := validateAgentSQL(plan.Query); err != nil {
		return agentSQLPlan{}, err
	}
	return plan, nil
}

func (c *apiConfig) runAgentSQLQuery(ctx context.Context, query string) (agentQueryResult, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	rows, err := c.sqlDB.QueryContext(queryCtx, query)
	if err != nil {
		return agentQueryResult{}, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return agentQueryResult{}, err
	}

	result := agentQueryResult{Columns: columns}
	for rows.Next() {
		values := make([]any, len(columns))
		pointers := make([]any, len(columns))
		for i := range values {
			pointers[i] = &values[i]
		}
		if err := rows.Scan(pointers...); err != nil {
			return agentQueryResult{}, err
		}

		row := make(map[string]any, len(columns))
		for i, column := range columns {
			row[column] = normalizeSQLValue(values[i])
		}
		result.Rows = append(result.Rows, row)
		if len(result.Rows) >= agentQueryRowLimit {
			break
		}
	}
	if err := rows.Err(); err != nil {
		return agentQueryResult{}, err
	}

	result.Count = len(result.Rows)
	return result, nil
}

func (c *apiConfig) createAgentReply(ctx context.Context, azureConversationID string, clientID uuid.NullUUID, clientMessage, sqlQuery string, queryResult agentQueryResult) (string, error) {
	queryResultJSON, err := json.Marshal(queryResult)
	if err != nil {
		return "", err
	}

	response, err := c.openaiClient.Responses.New(ctx, responses.ResponseNewParams{
		Conversation: responses.ResponseNewParamsConversationUnion{
			OfConversationObject: &responses.ResponseConversationParam{ID: azureConversationID},
		},
		Instructions: openai.String(agentReplyInstructions(clientID)),
		Input: responses.ResponseNewParamsInputUnion{
			OfString: openai.String(fmt.Sprintf(
				"Question du client:\n%s\n\nRequete SQL utilisee en interne:\n%s\n\nResultat SQL JSON:\n%s",
				clientMessage,
				sqlQuery,
				string(queryResultJSON),
			)),
		},
		Model: openai.ChatModelGPT5_4Nano,
		Store: openai.Bool(true),
		Text: responses.ResponseTextConfigParam{
			Format: responses.ResponseFormatTextConfigUnionParam{OfText: &shared.ResponseFormatTextParam{}},
		},
	})
	if err != nil {
		return "", err
	}

	answer := strings.TrimSpace(response.OutputText())
	if answer == "" {
		return "", errors.New("Azure OpenAI returned an empty reply")
	}
	return answer, nil
}

func normalizeSQL(query string) string {
	query = strings.TrimSpace(query)
	query = strings.TrimSuffix(query, ";")
	return strings.TrimSpace(query)
}

func validateAgentSQL(query string) error {
	if query == "" {
		return errors.New("Azure OpenAI returned an empty SQL query")
	}

	lower := strings.ToLower(strings.TrimSpace(query))
	if !strings.HasPrefix(lower, "select ") && !strings.HasPrefix(lower, "with ") {
		return errors.New("Only read-only SELECT queries are allowed")
	}
	if strings.Contains(query, ";") {
		return errors.New("Only one SQL statement is allowed")
	}
	for _, pattern := range agentForbiddenSQLPatterns {
		if pattern.MatchString(query) {
			return errors.New("Unsafe SQL generated by Azure OpenAI was rejected")
		}
	}

	tableMatches := agentTableReferencePattern.FindAllStringSubmatch(query, -1)
	if len(tableMatches) == 0 {
		return errors.New("SQL query must reference at least one allowed table")
	}

	referencedTables := make([]string, 0, len(tableMatches))
	for _, match := range tableMatches {
		tableName := strings.ToLower(match[1])
		if _, ok := agentAllowedTables[tableName]; !ok {
			return fmt.Errorf("Table %q is not allowed in agent SQL", tableName)
		}
		referencedTables = append(referencedTables, tableName)
	}
	sort.Strings(referencedTables)
	return nil
}

func normalizeSQLValue(value any) any {
	switch v := value.(type) {
	case nil:
		return nil
	case []byte:
		return string(v)
	case time.Time:
		return v.UTC().Format(time.RFC3339)
	default:
		return v
	}
}

func agentConversationInstructions(clientID uuid.NullUUID) string {
	if clientID.Valid {
		return fmt.Sprintf("Tu geres une conversation pour le client %s. Garde les futures reponses en francais clair et utilise uniquement les donnees fournies par le serveur.", clientID.UUID)
	}
	return "Tu geres une conversation pour un utilisateur CAIJ-Machina. Garde les futures reponses en francais clair et utilise uniquement les donnees fournies par le serveur."
}

func agentSQLPlannerInstructions(clientID uuid.NullUUID) string {
	clientScope := "Aucun client_id specifique n'est impose."
	if clientID.Valid {
		clientScope = fmt.Sprintf("Le client courant est %s. Quand la question touche aux donnees client, filtre explicitement sur cet identifiant.", clientID.UUID)
	}

	return fmt.Sprintf(`Tu traduis une demande utilisateur en une requete PostgreSQL en lecture seule.
Retourne uniquement un objet JSON de la forme {"query":"..."}.
La requete doit utiliser uniquement les tables autorisees suivantes:
- clients(id, created_at, updated_at, name, icon)
- client_metadatas(id, created_at, updated_at, client_id, keyword)
- keywords(id, created_at, updated_at, name)
- documents(id, created_at, updated_at, citation, date_placed, date_replaced)
- subdocuments(id, created_at, updated_at, name, document_id, citation, date_placed, date_replaced)
- laws(id, created_at, updated_at, citation, date_placed, date_replaced)
- sublaws(id, created_at, updated_at, citation, sequence, anchor, content, embedding, keywords, document_id)
- law_changes(id, created_at, updated_at, explanation, law_id_old, law_id_new, sub_law_id_old, sub_law_id_new)
- document_revisions(id, created_at, updated_at, explanation, document_id_old, document_id_new, sub_document_id_old, sub_document_id_new)
- alerts(id, created_at, updated_at, user_id, client_id, contact_method, send_at, priority, law_change_id, message)
Contraintes:
- Une seule requete.
- SELECT ou WITH seulement.
- Aucune ecriture, aucun commentaire SQL.
- Utilise des alias explicites si utile.
- Limite les resultats a %d lignes maximum.
- Preferer ILIKE pour la recherche textuelle libre.
%s`, agentQueryRowLimit, clientScope)
}

func agentReplyInstructions(clientID uuid.NullUUID) string {
	clientScope := ""
	if clientID.Valid {
		clientScope = fmt.Sprintf("Le client courant est %s.\n", clientID.UUID)
	}

	return fmt.Sprintf(`Tu es l'assistant CAIJ-Machina.
%sReponds en francais, de facon concise et professionnelle.
Base-toi uniquement sur le resultat SQL JSON fourni.
Si le resultat est vide, dis clairement qu'aucune donnee correspondante n'a ete trouvee.
N'invente aucune donnee.
N'expose pas la requete SQL sauf si l'utilisateur le demande explicitement.`, clientScope)
}
