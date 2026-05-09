-- +goose up
ALTER TABLE keywords
ADD CONSTRAINT keywords_name_key UNIQUE (name);

-- +goose down
ALTER TABLE keywords
DROP CONSTRAINT keywords_name_key;
