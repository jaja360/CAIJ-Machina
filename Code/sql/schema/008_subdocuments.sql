-- +goose up
CREATE TABLE law (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  citation TEXT NOT NULL,
  date_placed TIMESTAMP NULL,
  date_replaced TIMESTAMP NULL
);

-- +goose down
DROP TABLE law;
