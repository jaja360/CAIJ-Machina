-- +goose up
CREATE TABLE law_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  document_id_old UUID NOT NULL REFERENCES law(id),
  document_id_new UUID NOT NULL REFERENCES law(id),
  sub_document_id_old UUID NOT NULL REFERENCES sublaw(id),
  sub_document_id_new UUID NOT NULL REFERENCES sublaw(id),
  explanation TEXT NOT NULL
);

-- +goose down
DROP TABLE law_changes;
