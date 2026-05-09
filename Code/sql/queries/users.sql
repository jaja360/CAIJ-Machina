-- name: CreateUser :one
INSERT INTO users (email, hashed_password) VALUES ( $1, $2 )
RETURNING id, created_at, updated_at, email;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = $1;

-- name: UpdateUserInfo :one
UPDATE users
SET email = $2, hashed_password = $3, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ResetUserTable :exec
DELETE FROM users;
