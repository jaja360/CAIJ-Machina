-- +goose up
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL
);

CREATE TABLE agent_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('user', 'assistant')),
  message TEXT NOT NULL
);

-- +goose down
DROP TABLE agent_conversation_messages;
DROP TABLE agent_conversations;
