-- name: CreateKeyword :one
INSERT INTO keywords (name)
VALUES ($1)
RETURNING *;

-- name: UpsertKeywordByName :one
INSERT INTO keywords (name)
VALUES ($1)
ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
RETURNING *;

-- name: GetKeyword :one
SELECT *
FROM keywords
WHERE id = $1;

-- name: ListKeywords :many
SELECT *
FROM keywords
ORDER BY name ASC;

-- name: ListKeywordsByName :many
SELECT *
FROM keywords
WHERE name = $1
ORDER BY created_at ASC;

-- name: GetKeywordByName :one
SELECT *
FROM keywords
WHERE name = $1;

-- name: SearchKeywords :many
SELECT *
FROM keywords
WHERE name ILIKE '%' || $1 || '%'
ORDER BY name ASC;

-- name: UpdateKeyword :one
UPDATE keywords
SET name = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteKeyword :exec
DELETE FROM keywords
WHERE id = $1;
