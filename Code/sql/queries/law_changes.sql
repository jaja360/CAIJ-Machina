-- name: CreateLawChange :one
INSERT INTO law_changes (explanation, law_id_old, law_id_new, sub_law_id_old, sub_law_id_new)
VALUES ($1, $2, $3, $4, $5)
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

-- name: ListLawChangesBySublaw :many
SELECT *
FROM law_changes
WHERE sub_law_id_old = $1 OR sub_law_id_new = $1
ORDER BY created_at DESC;

-- name: DeleteLawChange :exec
DELETE FROM law_changes
WHERE id = $1;
