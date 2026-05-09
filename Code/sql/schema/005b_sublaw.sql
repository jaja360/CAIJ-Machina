-- +goose up
CREATE TABLE sublaw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  document_id UUID NOT NULL REFERENCES law(id),
  citation TEXT NOT NULL,
  sequence TEXT NULL,
  anchor TEXT NULL,
  text TEXT NULL,
  embedding TEXT NULL,
  keywords TEXT NULL
);

-- +goose down
DROP TABLE sublaw;
