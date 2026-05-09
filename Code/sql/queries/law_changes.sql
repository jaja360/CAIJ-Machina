-- name: CreateLawChange :one
INSERT INTO law_changes (explanation, law_id_old, law_id_new, sub_law_id_old, sub_law_id_new, old_text, new_text)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetLawChange :one
SELECT *
FROM law_changes
WHERE id = $1;

-- name: ListLawChangesByLaw :many
SELECT *
FROM law_changes
WHERE law_id_old = $1 OR law_id_new = $1
ORDER BY created_at DESC;

-- name: GetLawChangesBetween :many
SELECT *
FROM law_changes
WHERE law_id_old = $1 AND law_id_new = $2
ORDER BY created_at DESC;

-- name: CountRecentLawChanges :one
SELECT COUNT(*)
FROM law_changes
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- name: ListLawChangesBySublaw :many
SELECT *
FROM law_changes
WHERE sub_law_id_old = $1 OR sub_law_id_new = $1
ORDER BY created_at DESC;

-- name: DeleteLawChangesBetween :exec
DELETE FROM law_changes
WHERE law_id_old = $1 AND law_id_new = $2;

-- name: DeleteLawChange :exec
DELETE FROM law_changes
WHERE id = $1;
