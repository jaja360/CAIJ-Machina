-- +goose up
CREATE TABLE sublaws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  citation TEXT NOT NULL,
  sequence TEXT NULL,
  anchor TEXT NULL,
  content TEXT NULL,
  embedding TEXT NULL,
  keywords TEXT NULL,
  document_id UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE
);

-- +goose down
DROP TABLE sublaws;
