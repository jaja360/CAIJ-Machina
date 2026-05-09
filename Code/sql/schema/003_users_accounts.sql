-- +goose up
CREATE TABLE user_metadatas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  UNIQUE(user_id, keyword)
);

-- +goose down
DROP TABLE user_metadatas;
