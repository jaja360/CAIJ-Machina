package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/jaja360/CAIJ-Machina/internal/database"
	"golang.org/x/net/html"
)

var contractHeadingNumberRE = regexp.MustCompile(`^(\d+(?:\.\d+)*)\.?\s+(.*)$`)

type contractSection struct {
	Anchor string
	Number string
	Title  string
	Blocks []string
}

func (cfg *apiConfig) ChunkHTMLContract(ctx context.Context, sourceFile, htmlContent string, opts ChunkOptions) (ChunkDocument, error) {
	_ = ctx
	_ = opts
	return parseHTMLContractChunks(sourceFile, htmlContent)
}

func (cfg *apiConfig) ChunkHTMLContractFile(ctx context.Context, path string, opts ChunkOptions) (ChunkDocument, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return ChunkDocument{}, err
	}
	return cfg.ChunkHTMLContract(ctx, filepath.Base(path), string(content), opts)
}

func (cfg *apiConfig) IngestHTMLContract(ctx context.Context, sourceFile, htmlContent string, opts ChunkOptions) (ChunkDocument, error) {
	if cfg == nil || cfg.db == nil {
		return ChunkDocument{}, errors.New("apiConfig with db is required for ingestion")
	}
	document, err := cfg.ChunkHTMLContract(ctx, sourceFile, htmlContent, opts)
	if err != nil {
		return ChunkDocument{}, err
	}
	if _, _, err := cfg.storeContractChunkDocument(ctx, document); err != nil {
		return ChunkDocument{}, err
	}
	return document, nil
}

func (cfg *apiConfig) IngestHTMLContractFile(ctx context.Context, path string, opts ChunkOptions) (ChunkDocument, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return ChunkDocument{}, err
	}
	return cfg.IngestHTMLContract(ctx, filepath.Base(path), string(content), opts)
}

func parseHTMLContractChunks(sourceFile, content string) (ChunkDocument, error) {
	titleParts := parseChunkTitleParts(content)
	citation := ""
	documentTitle := ""
	if len(titleParts) > 0 {
		citation = titleParts[0]
		documentTitle = titleParts[0]
	}

	sections, h1Title, err := parseContractSections(content)
	if err != nil {
		return ChunkDocument{}, err
	}
	if strings.TrimSpace(documentTitle) == "" {
		documentTitle = h1Title
	}
	if strings.TrimSpace(citation) == "" {
		citation = documentTitle
	}
	if strings.TrimSpace(documentTitle) == "" {
		documentTitle = filepath.Base(sourceFile)
	}
	if len(sections) == 0 {
		return ChunkDocument{}, errors.New("no contract sections found")
	}

	records := buildContractChunkRecords(sourceFile, documentTitle, citation, sections)
	return ChunkDocument{
		SourceFile:    sourceFile,
		DocumentTitle: documentTitle,
		Citation:      citation,
		RecordCount:   len(records),
		Records:       records,
	}, nil
}

func parseContractSections(content string) ([]contractSection, string, error) {
	tokenizer := html.NewTokenizer(strings.NewReader(content))
	sections := make([]contractSection, 0)
	currentSection := -1
	currentTag := ""
	currentText := strings.Builder{}
	skipDepth := 0
	h1Title := ""

	ensureIntro := func() {
		if len(sections) > 0 {
			return
		}
		sections = append(sections, contractSection{Anchor: "introduction", Title: "Introduction"})
		currentSection = 0
	}

	finishTag := func(name string) {
		if currentTag != name {
			return
		}
		text := chunkNormalizeWhitespace(currentText.String())
		currentTag = ""
		currentText.Reset()
		if text == "" {
			return
		}

		switch name {
		case "h1":
			if h1Title == "" {
				h1Title = text
			}
		case "h2":
			number, title := parseContractSectionHeading(text)
			anchor := contractSectionAnchor(number, title)
			sections = append(sections, contractSection{
				Anchor: anchor,
				Number: number,
				Title:  title,
			})
			currentSection = len(sections) - 1
		case "p":
			if currentSection < 0 {
				ensureIntro()
			}
			sections[currentSection].Blocks = append(sections[currentSection].Blocks, text)
		}
	}

	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			err := tokenizer.Err()
			if err == nil || err.Error() == "EOF" {
				for i := range sections {
					sections[i].Blocks = normalizeChunkBlocks(sections[i].Blocks)
				}
				return sections, h1Title, nil
			}
			return nil, "", err
		case html.StartTagToken:
			token := tokenizer.Token()
			name := strings.ToLower(token.Data)
			if name == "script" || name == "style" || name == "head" {
				skipDepth++
				continue
			}
			if skipDepth > 0 {
				continue
			}
			if name == "h1" || name == "h2" || name == "p" {
				currentTag = name
				currentText.Reset()
			}
		case html.EndTagToken:
			token := tokenizer.Token()
			name := strings.ToLower(token.Data)
			if skipDepth > 0 {
				if name == "script" || name == "style" || name == "head" {
					skipDepth--
				}
				continue
			}
			finishTag(name)
		case html.TextToken:
			if skipDepth > 0 || currentTag == "" {
				continue
			}
			currentText.WriteString(" ")
			currentText.Write(tokenizer.Text())
		}
	}
}

func parseContractSectionHeading(value string) (string, string) {
	value = chunkNormalizeWhitespace(value)
	match := contractHeadingNumberRE.FindStringSubmatch(value)
	if len(match) != 3 {
		return "", value
	}
	title := chunkNormalizeWhitespace(match[2])
	if title == "" {
		title = value
	}
	return match[1], title
}

func contractSectionAnchor(number, title string) string {
	if strings.TrimSpace(number) != "" {
		return "sec" + strings.ReplaceAll(number, ".", "-")
	}
	if slug := chunkSlugify(title); slug != "" {
		return slug
	}
	return "section"
}

func buildContractChunkRecords(sourceFile, documentTitle, citation string, sections []contractSection) []ChunkRecord {
	records := make([]ChunkRecord, 0)
	for _, section := range sections {
		if len(section.Blocks) == 0 {
			continue
		}
		sentenceIndex := 1
		for _, block := range section.Blocks {
			for _, sentence := range splitChunkSentences(block) {
				records = append(records, ChunkRecord{
					SourceFile:    sourceFile,
					DocumentTitle: documentTitle,
					Citation:      citation,
					SectionAnchor: section.Anchor,
					SectionNumber: section.Number,
					SectionTitle:  section.Title,
					Tag:           contractChunkTag(section),
					SentenceIndex: sentenceIndex,
					Text:          sentence,
					Domains:       []string{},
					Embedding:     []float64{},
				})
				sentenceIndex++
			}
		}
	}
	return records
}

func contractChunkTag(section contractSection) string {
	parts := make([]string, 0, 2)
	if strings.TrimSpace(section.Number) != "" {
		parts = append(parts, "section-"+strings.ReplaceAll(section.Number, ".", "-"))
	}
	if slug := chunkSlugify(section.Title); slug != "" {
		parts = append(parts, slug)
	}
	if len(parts) == 0 {
		return section.Anchor
	}
	return strings.Join(parts, "::")
}

func (cfg *apiConfig) storeContractChunkDocument(ctx context.Context, document ChunkDocument) (database.Document, []database.Subdocument, error) {
	placed := document.DatePlaced
	if placed == nil {
		now := time.Now()
		placed = &now
	}
	citation := strings.TrimSpace(document.Citation)
	if citation == "" {
		citation = strings.TrimSpace(document.DocumentTitle)
	}
	if citation == "" {
		citation = strings.TrimSpace(document.SourceFile)
	}

	created, err := cfg.db.CreateDocument(ctx, database.CreateDocumentParams{
		Citation:     citation,
		DatePlaced:   chunkNullTime(placed),
		DateReplaced: chunkNullTime(document.DateReplaced),
	})
	if err != nil {
		return database.Document{}, nil, err
	}

	seen := map[string]struct{}{}
	subdocuments := make([]database.Subdocument, 0)
	for _, record := range document.Records {
		key := strings.TrimSpace(record.SectionAnchor)
		if key == "" {
			key = strings.TrimSpace(record.Tag)
		}
		if key == "" {
			key = strings.TrimSpace(record.SectionTitle)
		}
		if key == "" {
			key = strings.TrimSpace(record.Text)
		}
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		name := strings.TrimSpace(record.SectionTitle)
		if name == "" {
			name = key
		}
		subCitation := strings.TrimSpace(record.SectionAnchor)
		if subCitation == "" {
			subCitation = strings.TrimSpace(record.Citation)
		}
		if subCitation == "" {
			subCitation = name
		}

		subdocument, err := cfg.db.CreateSubdocument(ctx, database.CreateSubdocumentParams{
			Name:         name,
			DocumentID:   created.ID,
			Citation:     subCitation,
			DatePlaced:   chunkNullTime(placed),
			DateReplaced: chunkNullTime(document.DateReplaced),
		})
		if err != nil {
			return database.Document{}, nil, err
		}
		subdocuments = append(subdocuments, subdocument)
	}

	return created, subdocuments, nil
}

func LoadContractsFromFolder(root string) ([]ChunkDocument, error) {
	paths, err := filepath.Glob(filepath.Join(root, "*.html"))
	if err != nil {
		return nil, fmt.Errorf("glob contracts: %w", err)
	}
	documents := make([]ChunkDocument, 0, len(paths))
	for _, path := range paths {
		document, err := (*apiConfig)(nil).ChunkHTMLContractFile(context.Background(), path, ChunkOptions{})
		if err != nil {
			return nil, err
		}
		documents = append(documents, document)
	}
	return documents, nil
}
