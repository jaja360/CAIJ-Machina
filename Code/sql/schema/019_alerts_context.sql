-- +goose up
ALTER TABLE alerts
ADD COLUMN sublaw_id UUID NULL REFERENCES sublaws(id) ON DELETE SET NULL,
ADD COLUMN keywords TEXT NULL;

-- +goose down
ALTER TABLE alerts
DROP COLUMN keywords,
DROP COLUMN sublaw_id;
