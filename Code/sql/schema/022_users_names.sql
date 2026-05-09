-- +goose up
ALTER TABLE users
ADD COLUMN first_name TEXT NOT NULL DEFAULT '',
ADD COLUMN last_name TEXT NOT NULL DEFAULT '';

-- +goose down
ALTER TABLE users
DROP COLUMN first_name,
DROP COLUMN last_name;
