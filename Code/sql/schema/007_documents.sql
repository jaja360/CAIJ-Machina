-- +goose up
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  citation TEXT NOT NULL,
  date_placed TIMESTAMP NULL,
  date_replaced TIMESTAMP NULL
);

-- +goose down
DROP TABLE documents;
