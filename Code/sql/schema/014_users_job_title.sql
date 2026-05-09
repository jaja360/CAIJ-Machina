-- +goose up
ALTER TABLE users
ADD COLUMN job_title TEXT NOT NULL DEFAULT 'Unknown';

-- +goose down
ALTER TABLE users
DROP COLUMN job_title;
