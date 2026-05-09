-- name: CreateLaw :one
INSERT INTO laws (citation, date_placed, date_replaced)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetLaw :one
SELECT *
FROM laws
WHERE id = $1;

-- name: GetLatestLawByCitation :one
SELECT *
FROM laws
WHERE citation = $1
ORDER BY date_placed DESC NULLS LAST, created_at DESC
LIMIT 1;

-- name: ListLaws :many
SELECT *
FROM laws
ORDER BY created_at DESC;

-- name: CountRecentLaws :one
SELECT COUNT(*)
FROM laws
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- name: ListActiveLaws :many
SELECT *
FROM laws
WHERE date_replaced IS NULL
ORDER BY citation ASC;

-- name: SearchLawsByCitation :many
SELECT *
FROM laws
WHERE citation ILIKE '%' || $1 || '%'
ORDER BY citation ASC;

-- name: UpdateLaw :one
UPDATE laws
SET citation = $2, date_placed = $3, date_replaced = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkLawReplaced :one
UPDATE laws
SET date_replaced = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteLaw :exec
DELETE FROM laws
WHERE id = $1;
