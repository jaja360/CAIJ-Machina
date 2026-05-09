-- +goose up
CREATE TABLE user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES user(id),
  keyword UUID NOT NULL REFERENCES keywords(id),
);

-- +goose down
DROP TABLE user_accounts;
