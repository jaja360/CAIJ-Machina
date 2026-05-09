package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
)

const createLaw = `
INSERT INTO law (name, citation, date_placed, date_replaced)
VALUES ($1, $2, $3, $4)
RETURNING id, created_at, updated_at, name, citation, date_placed, date_replaced
`

type Law struct {
	ID           uuid.UUID    `json:"id"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
	Name         string       `json:"name"`
	Citation     string       `json:"citation"`
	DatePlaced   sql.NullTime `json:"date_placed"`
	DateReplaced sql.NullTime `json:"date_replaced"`
}

type CreateLawParams struct {
	Name         string       `json:"name"`
	Citation     string       `json:"citation"`
	DatePlaced   sql.NullTime `json:"date_placed"`
	DateReplaced sql.NullTime `json:"date_replaced"`
}

func (q *Queries) CreateLaw(ctx context.Context, arg CreateLawParams) (Law, error) {
	row := q.db.QueryRowContext(ctx, createLaw, arg.Name, arg.Citation, arg.DatePlaced, arg.DateReplaced)
	var law Law
	err := row.Scan(
		&law.ID,
		&law.CreatedAt,
		&law.UpdatedAt,
		&law.Name,
		&law.Citation,
		&law.DatePlaced,
		&law.DateReplaced,
	)
	return law, err
}

const createSublaw = `
INSERT INTO sublaw (document_id, citation, sequence, anchor, text, embedding, keywords)
VALUES ($1, $2, $3, $4, $5, $6, $7)
`

type CreateSublawParams struct {
	DocumentID uuid.UUID      `json:"document_id"`
	Citation   string         `json:"citation"`
	Sequence   sql.NullString `json:"sequence"`
	Anchor     sql.NullString `json:"anchor"`
	Text       sql.NullString `json:"text"`
	Embedding  sql.NullString `json:"embedding"`
	Keywords   sql.NullString `json:"keywords"`
}

func (q *Queries) CreateSublaw(ctx context.Context, arg CreateSublawParams) error {
	_, err := q.db.ExecContext(ctx, createSublaw, arg.DocumentID, arg.Citation, arg.Sequence, arg.Anchor, arg.Text, arg.Embedding, arg.Keywords)
	return err
}
