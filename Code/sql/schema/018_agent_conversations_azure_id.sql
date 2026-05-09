-- +goose up
ALTER TABLE agent_conversations
ADD COLUMN azure_conversation_id TEXT NULL UNIQUE;

-- +goose down
ALTER TABLE agent_conversations
DROP COLUMN azure_conversation_id;
