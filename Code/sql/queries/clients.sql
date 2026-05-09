-- name: CreateClient :one
INSERT INTO clients (name, icon, user_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetClient :one
SELECT *
FROM clients
WHERE id = $1;

-- name: ListClients :many
SELECT *
FROM clients
ORDER BY name ASC;

-- name: ListClientsByUser :many
SELECT *
FROM clients
WHERE user_id = $1
ORDER BY name ASC;

-- name: SearchClients :many
SELECT *
FROM clients
WHERE name ILIKE '%' || $1 || '%'
ORDER BY name ASC;

-- name: UpdateClient :one
UPDATE clients
SET name = $2, icon = $3, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteClient :exec
DELETE FROM clients
WHERE id = $1;
