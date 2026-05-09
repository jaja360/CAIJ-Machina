-- +goose up
ALTER TABLE agent_conversations
ADD COLUMN user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE;

-- +goose down
ALTER TABLE agent_conversations
DROP COLUMN user_id;
