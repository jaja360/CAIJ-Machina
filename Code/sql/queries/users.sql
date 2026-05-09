-- name: CreateUser :one
INSERT INTO users (email, hashed_password, job_title, first_name, last_name)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, created_at, updated_at, email, job_title, first_name, last_name;

-- name: GetUserByEmail :one
SELECT id, created_at, updated_at, email, hashed_password, job_title, first_name, last_name
FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT id, created_at, updated_at, email, hashed_password, job_title, first_name, last_name
FROM users
WHERE id = $1;

-- name: UpdateUserInfo :one
UPDATE users
SET email = $2, hashed_password = $3, job_title = $4, first_name = $5, last_name = $6, updated_at = NOW()
WHERE id = $1
RETURNING id, created_at, updated_at, email, hashed_password, job_title, first_name, last_name;

-- name: ResetUserTable :exec
DELETE FROM users;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;
