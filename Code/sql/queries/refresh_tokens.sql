-- name: InsertRefreshToken :exec
INSERT INTO refresh_tokens (user_id, token, expires_at)
VALUES ($1, $2, $3);

-- name: GetUserFromRefreshToken :one
SELECT *
FROM refresh_tokens
WHERE token = $1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked_at = NOW(), updated_at = NOW()
WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW();

-- name: DeleteExpiredRefreshTokens :exec
DELETE FROM refresh_tokens
WHERE expires_at <= NOW();

-- name: DeleteRefreshTokensForUser :exec
DELETE FROM refresh_tokens
WHERE user_id = $1;
