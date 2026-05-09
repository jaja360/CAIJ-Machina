-- +goose up
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  client_id UUID NOT NULL REFERENCES clients(id),
  keyword UUID NOT NULL REFERENCES keywords(id),
);

-- +goose down
DROP TABLE client_accounts;
