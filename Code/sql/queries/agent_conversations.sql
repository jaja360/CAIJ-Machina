-- name: CreateAgentConversation :one
INSERT INTO agent_conversations (client_id)
VALUES ($1)
RETURNING *;

-- name: GetAgentConversation :one
SELECT *
FROM agent_conversations
WHERE id = $1;

-- name: ListAgentConversations :many
SELECT *
FROM agent_conversations
ORDER BY updated_at DESC;

-- name: ListAgentConversationsByClient :many
SELECT *
FROM agent_conversations
WHERE client_id = $1
ORDER BY updated_at DESC;

-- name: TouchAgentConversation :exec
UPDATE agent_conversations
SET updated_at = NOW()
WHERE id = $1;

-- name: DeleteAgentConversation :exec
DELETE FROM agent_conversations
WHERE id = $1;

-- name: CreateAgentConversationMessage :one
INSERT INTO agent_conversation_messages (conversation_id, speaker, message)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListAgentConversationMessages :many
SELECT *
FROM agent_conversation_messages
WHERE conversation_id = $1
ORDER BY created_at ASC;

-- name: DeleteAgentConversationMessages :exec
DELETE FROM agent_conversation_messages
WHERE conversation_id = $1;
