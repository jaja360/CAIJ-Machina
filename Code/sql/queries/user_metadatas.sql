-- name: AddUserKeyword :one
INSERT INTO user_metadatas (user_id, keyword)
VALUES ($1, $2)
ON CONFLICT (user_id, keyword) DO UPDATE SET updated_at = NOW()
RETURNING *;

-- name: ListUserKeywords :many
SELECT user_metadatas.*, keywords.name AS keyword_name
FROM user_metadatas
JOIN keywords ON keywords.id = user_metadatas.keyword
WHERE user_metadatas.user_id = $1
ORDER BY keywords.name ASC;

-- name: ListUsersByKeyword :many
SELECT users.*
FROM user_metadatas
JOIN users ON users.id = user_metadatas.user_id
WHERE user_metadatas.keyword = $1
ORDER BY users.email ASC;

-- name: RemoveUserKeyword :exec
DELETE FROM user_metadatas
WHERE user_id = $1 AND keyword = $2;

-- name: RemoveAllUserKeywords :exec
DELETE FROM user_metadatas
WHERE user_id = $1;
