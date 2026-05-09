-- name: CreateAlert :one
INSERT INTO alerts (user_id, client_id, contact_method, send_at, priority, law_change_id, sublaw_id, keywords, message)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetAlert :one
SELECT *
FROM alerts
WHERE id = $1;

-- name: ListAlertsForUser :many
SELECT *
FROM alerts
WHERE user_id = $1
ORDER BY send_at DESC;

-- name: ListAlertsForClient :many
SELECT *
FROM alerts
WHERE client_id = $1
ORDER BY send_at DESC;

-- name: ListRecentAlerts :many
SELECT *
FROM alerts
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- name: CountRecentAlerts :one
SELECT COUNT(*)
FROM alerts
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- name: DeleteAlert :exec
DELETE FROM alerts
WHERE id = $1;
