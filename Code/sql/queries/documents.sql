-- name: CreateDocument :one
INSERT INTO documents (citation, date_placed, date_replaced)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetDocument :one
SELECT *
FROM documents
WHERE id = $1;

-- name: ListDocuments :many
SELECT *
FROM documents
ORDER BY created_at DESC;

-- name: ListActiveDocuments :many
SELECT *
FROM documents
WHERE date_replaced IS NULL
ORDER BY citation ASC;

-- name: SearchDocumentsByCitation :many
SELECT *
FROM documents
WHERE citation ILIKE '%' || $1 || '%'
ORDER BY citation ASC;

-- name: UpdateDocument :one
UPDATE documents
SET citation = $2, date_placed = $3, date_replaced = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: MarkDocumentReplaced :one
UPDATE documents
SET date_replaced = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteDocument :exec
DELETE FROM documents
WHERE id = $1;
