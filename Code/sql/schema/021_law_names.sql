-- +goose up
ALTER TABLE laws
ADD COLUMN name TEXT NOT NULL DEFAULT '';

ALTER TABLE sublaws
ADD COLUMN name TEXT NULL;

-- +goose down
ALTER TABLE sublaws
DROP COLUMN name;

ALTER TABLE laws
DROP COLUMN name;
