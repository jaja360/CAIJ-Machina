-- +goose up
CREATE TABLE document_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  explanation TEXT NOT NULL,
  document_id_old UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_id_new UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sub_document_id_old UUID NOT NULL REFERENCES subdocuments(id) ON DELETE CASCADE,
  sub_document_id_new UUID NOT NULL REFERENCES subdocuments(id) ON DELETE CASCADE
);

-- +goose down
DROP TABLE document_revisions;
