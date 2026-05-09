package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jaja360/CAIJ-Machina/internal/database"
)

type htmlIngestRequest struct {
	Filename string `json:"filename"`
	HTML     string `json:"html"`
}

func (c *apiConfig) getDocuments(w http.ResponseWriter, r *http.Request) {
	if _, err := c.requireUser(r); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	documents, err := c.db.ListDocuments(r.Context())
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusOK, documents)
}

func (c *apiConfig) addDocuments(w http.ResponseWriter, r *http.Request) {
	if _, err := c.requireUser(r); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	in, err := decodeHTMLIngestRequest(r, "document.html")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	chunked, err := c.ChunkHTMLLegislation(r.Context(), in.Filename, in.HTML, ChunkOptions{})
	if err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	document, count, err := c.storeChunkAsDocument(r.Context(), chunked)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondWithJSON(w, http.StatusCreated, map[string]any{
		"document":           document,
		"subdocuments_count": count,
	})
}

func (c *apiConfig) storeChunkAsDocument(ctx context.Context, document ChunkDocument) (database.Document, int, error) {
	placed := document.DatePlaced
	if placed == nil {
		now := time.Now()
		placed = &now
	}
	created, err := c.db.CreateDocument(ctx, database.CreateDocumentParams{
		Citation:     document.Citation,
		DatePlaced:   chunkNullTime(placed),
		DateReplaced: chunkNullTime(document.DateReplaced),
	})
	if err != nil {
		return database.Document{}, 0, err
	}

	seen := map[string]struct{}{}
	count := 0
	for _, record := range document.Records {
		key := record.SectionAnchor
		if key == "" {
			key = record.Tag
		}
		if key == "" {
			key = record.Text
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		name := record.SectionTitle
		if strings.TrimSpace(name) == "" {
			name = key
		}
		citation := record.SectionAnchor
		if strings.TrimSpace(citation) == "" {
			citation = record.Citation
		}
		_, err := c.db.CreateSubdocument(ctx, database.CreateSubdocumentParams{
			Name:         name,
			DocumentID:   created.ID,
			Citation:     citation,
			DatePlaced:   chunkNullTime(placed),
			DateReplaced: chunkNullTime(document.DateReplaced),
		})
		if err != nil {
			return database.Document{}, 0, err
		}
		count++
	}
	return created, count, nil
}

func decodeHTMLIngestRequest(r *http.Request, defaultFilename string) (htmlIngestRequest, error) {
	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			return htmlIngestRequest{}, err
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			return htmlIngestRequest{}, err
		}
		defer file.Close()
		contents, err := io.ReadAll(file)
		if err != nil {
			return htmlIngestRequest{}, err
		}
		filename := defaultFilename
		if header != nil && strings.TrimSpace(header.Filename) != "" {
			filename = header.Filename
		}
		return htmlIngestRequest{Filename: filename, HTML: string(contents)}, nil
	}

	var in htmlIngestRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		return htmlIngestRequest{}, err
	}
	if strings.TrimSpace(in.HTML) == "" {
		return htmlIngestRequest{}, fmt.Errorf("html is required")
	}
	if strings.TrimSpace(in.Filename) == "" {
		in.Filename = defaultFilename
	}
	return in, nil
}
