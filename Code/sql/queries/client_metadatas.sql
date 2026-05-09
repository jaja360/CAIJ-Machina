-- name: AddClientKeyword :one
INSERT INTO client_metadatas (client_id, keyword)
VALUES ($1, $2)
ON CONFLICT (client_id, keyword) DO UPDATE SET updated_at = NOW()
RETURNING *;

-- name: ListClientKeywords :many
SELECT client_metadatas.*, keywords.name AS keyword_name
FROM client_metadatas
JOIN keywords ON keywords.id = client_metadatas.keyword
WHERE client_metadatas.client_id = $1
ORDER BY keywords.name ASC;

-- name: ListClientsByKeyword :many
SELECT clients.*
FROM client_metadatas
JOIN clients ON clients.id = client_metadatas.client_id
WHERE client_metadatas.keyword = $1
ORDER BY clients.name ASC;

-- name: RemoveClientKeyword :exec
DELETE FROM client_metadatas
WHERE client_id = $1 AND keyword = $2;

-- name: RemoveAllClientKeywords :exec
DELETE FROM client_metadatas
WHERE client_id = $1;
