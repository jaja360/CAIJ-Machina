-- +goose up
CREATE TABLE client_metadatas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  UNIQUE(client_id, keyword)
);

-- +goose down
DROP TABLE client_metadatas;
