-- +goose up
ALTER TABLE laws
ADD COLUMN name TEXT NOT NULL DEFAULT '';

ALTER TABLE sublaws
ADD COLUMN name TEXT NULL;

ALTER TABLE law_changes
ADD COLUMN old_text TEXT NOT NULL DEFAULT '',
ADD COLUMN new_text TEXT NOT NULL DEFAULT '';

-- +goose down
ALTER TABLE law_changes
DROP COLUMN old_text,
DROP COLUMN new_text;

ALTER TABLE sublaws
DROP COLUMN name;

ALTER TABLE laws
DROP COLUMN name;
