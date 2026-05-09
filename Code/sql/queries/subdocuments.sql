-- name: CreateSubdocument :one
INSERT INTO subdocuments (name, document_id, citation, date_placed, date_replaced)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetSubdocument :one
SELECT *
FROM subdocuments
WHERE id = $1;

-- name: ListSubdocumentsByDocument :many
SELECT *
FROM subdocuments
WHERE document_id = $1
ORDER BY citation ASC;

-- name: ListActiveSubdocumentsByDocument :many
SELECT *
FROM subdocuments
WHERE document_id = $1 AND date_replaced IS NULL
ORDER BY citation ASC;

-- name: SearchSubdocuments :many
SELECT *
FROM subdocuments
WHERE name ILIKE '%' || $1 || '%' OR citation ILIKE '%' || $1 || '%'
ORDER BY citation ASC;

-- name: UpdateSubdocument :one
UPDATE subdocuments
SET name = $2, document_id = $3, citation = $4, date_placed = $5, date_replaced = $6, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkSubdocumentReplaced :one
UPDATE subdocuments
SET date_replaced = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteSubdocument :exec
DELETE FROM subdocuments
WHERE id = $1;
