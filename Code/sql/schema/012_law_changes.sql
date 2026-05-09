-- +goose up
CREATE TABLE law_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  explanation TEXT NOT NULL,
  law_id_old UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  law_id_new UUID NOT NULL REFERENCES laws(id) ON DELETE CASCADE,
  sub_law_id_old UUID NOT NULL REFERENCES sublaws(id) ON DELETE CASCADE,
  sub_law_id_new UUID NOT NULL REFERENCES sublaws(id) ON DELETE CASCADE
);

-- +goose down
DROP TABLE law_changes;
