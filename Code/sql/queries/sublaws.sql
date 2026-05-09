-- name: CreateSublaw :one
INSERT INTO sublaws (citation, sequence, anchor, content, embedding, keywords, document_id)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetSublaw :one
SELECT *
FROM sublaws
WHERE id = $1;

-- name: ListSublawsByLaw :many
SELECT *
FROM sublaws
WHERE document_id = $1
ORDER BY sequence ASC NULLS LAST, created_at ASC;

-- name: GetSublawByLawAndAnchor :one
SELECT *
FROM sublaws
WHERE document_id = $1 AND anchor = $2;

-- name: SearchSublawsContent :many
SELECT *
FROM sublaws
WHERE content ILIKE '%' || $1 || '%'
ORDER BY created_at DESC;

-- name: SearchSublawsKeywords :many
SELECT *
FROM sublaws
WHERE keywords ILIKE '%' || $1 || '%'
ORDER BY created_at DESC;

-- name: UpdateSublaw :one
UPDATE sublaws
SET citation = $2, sequence = $3, anchor = $4, content = $5, embedding = $6, keywords = $7, document_id = $8, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteSublaw :exec
DELETE FROM sublaws
WHERE id = $1;

-- name: DeleteSublawsByLaw :exec
DELETE FROM sublaws
WHERE document_id = $1;
