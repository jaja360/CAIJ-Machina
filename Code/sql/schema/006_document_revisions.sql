-- +goose up
CREATE TABLE document_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  document_id_old UUID NOT NULL REFERENCES documents(id),
  document_id_new UUID NOT NULL REFERENCES documents(id),
  sub_document_id_old UUID NOT NULL REFERENCES subdocuments(id),
  sub_document_id_new UUID NOT NULL REFERENCES subdocuments(id),
  explanation TEXT NOT NULL
);

-- +goose down
DROP TABLE document_revisions;
