-- name: CreateDocumentRevision :one
INSERT INTO document_revisions (explanation, document_id_old, document_id_new, sub_document_id_old, sub_document_id_new)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetDocumentRevision :one
SELECT *
FROM document_revisions
WHERE id = $1;

-- name: ListDocumentRevisionsByDocument :many
SELECT *
FROM document_revisions
WHERE document_id_old = $1 OR document_id_new = $1
ORDER BY created_at DESC;

-- name: ListDocumentRevisionsBySubdocument :many
SELECT *
FROM document_revisions
WHERE sub_document_id_old = $1 OR sub_document_id_new = $1
ORDER BY created_at DESC;

-- name: DeleteDocumentRevision :exec
DELETE FROM document_revisions
WHERE id = $1;
