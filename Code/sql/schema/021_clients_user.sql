-- +goose up
ALTER TABLE clients
ADD COLUMN user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

-- +goose down
ALTER TABLE clients
DROP COLUMN user_id;
