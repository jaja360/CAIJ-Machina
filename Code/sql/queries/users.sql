-- name: CreateUser :one
INSERT INTO users (email, hashed_password, job_title) VALUES ( $1, $2, $3 )
RETURNING id, created_at, updated_at, email, job_title;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = $1;

-- name: UpdateUserInfo :one
UPDATE users
SET email = $2, hashed_password = $3, job_title = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ResetUserTable :exec
DELETE FROM users;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;
