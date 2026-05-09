-- +goose up
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  email TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL DEFAULT 'unset'
);

-- +goose down
DROP TABLE users;
