package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/jaja360/CAIJ-Machina/internal/database"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/responses"
	"github.com/openai/openai-go/v3/shared"
)

const (
	chunkMetadataScriptID = "caijtdm"
	chunkOriginalDocument = "originalDocument"
	chunkDomainPrompt     = "You classify a legal text chunk into up to 3 domains from a fixed keyword list given here [Agriculture,Agricultural,Food, Food and safety, Population safety] Return only strict JSON with the shape {\"domains\": [\"keyword1\", \"keyword2\"]}. Use only exact keywords from the provided list. Return an empty array when none apply."
)

var (
	chunkWhitespaceRE          = regexp.MustCompile(`\s+`)
	chunkLeadingSectionMarker  = regexp.MustCompile(`^([A-Z]\.\d+(?:\.\d+)*(?:[A-Z])?(?:\s+and\s+[A-Z]\.\d+(?:\.\d+)*)?|\d+(?:\.\d+)*\.?|\([0-9]+(?:\.[0-9]+)?\)|\([a-z]\)|\([ivxlcdm]+\)|\([A-Z]\))\s*`)
	chunkTitleRE               = regexp.MustCompile(`(?is)<title>(.*?)</title>`)
	chunkMetadataScriptRE      = regexp.MustCompile(`(?is)<script[^>]*id=["']` + chunkMetadataScriptID + `["'][^>]*>(.*?)</script>`)
	chunkStartDivOriginalDocRE = regexp.MustCompile(`(?is)<div\b[^>]*id=["']` + chunkOriginalDocument + `["'][^>]*>`)
	chunkLastModifiedDateRE    = regexp.MustCompile(`(?is)<!--\s*last modification date\s*:\s*(.*?)\s*-->`)
	chunkUpdateDateRE          = regexp.MustCompile(`(?is)<!--\s*update date\s*:\s*(.*?)\s*-->`)
	chunkTagRE                 = regexp.MustCompile(`(?is)<[^>]+>`)
	chunkAttrRE                = regexp.MustCompile(`([a-zA-Z_:][a-zA-Z0-9_:\-]*)\s*=\s*["']([^"']*)["']`)
	chunkAbbreviations         = []string{"R.S.O.", "S.O.", "c.", "s.", "ss.", "Sched.", "No.", "Inc.", "Ltd."}
	chunkTextClasses           = map[string]bool{
		"Section":                    true,
		"SecSubSec":                  true,
		"Subsection":                 true,
		"ContinuedSectionSubsection": true,
		"Paragraph":                  true,
		"Subparagraph":               true,
		"Clause":                     true,
		"Definition":                 true,
		"BilingualItemFirst":         true,
		"BilingualItemSecond":        true,
		"caption":                    true,
		"tableTitle":                 true,
		"indent-0-0":                 true,
		"indent-1-1":                 true,
		"indent-2-2":                 true,
		"section-e":                  true,
		"subsection-e":               true,
		"clause-e":                   true,
		"subclause-e":                true,
		"firstdef-e":                 true,
		"definition-e":               true,
	}
)

type ChunkOptions struct {
	DomainKeywords     []string
	DomainModel        string
	EmbeddingModel     string
	EmbeddingBatchSize int
	IncludeDomains     bool
	IncludeEmbeddings  bool
}

type ChunkRecord struct {
	SourceFile       string    `json:"source_file"`
	DocumentTitle    string    `json:"document_title"`
	Citation         string    `json:"citation"`
	SectionAnchor    string    `json:"section_anchor"`
	SectionNumber    string    `json:"section_number,omitempty"`
	SubsectionNumber string    `json:"subsection_number,omitempty"`
	SectionTitle     string    `json:"section_title,omitempty"`
	Tag              string    `json:"tag"`
	SentenceIndex    int       `json:"sentence_index"`
	Text             string    `json:"text"`
	Domains          []string  `json:"domains"`
	Embedding        []float64 `json:"embedding"`
}

type ChunkDocument struct {
	SourceFile     string        `json:"source_file"`
	DocumentTitle  string        `json:"document_title"`
	Citation       string        `json:"citation"`
	DatePlaced     *time.Time    `json:"date_placed,omitempty"`
	DateReplaced   *time.Time    `json:"date_replaced,omitempty"`
	RecordCount    int           `json:"record_count"`
	DomainModel    string        `json:"domain_model,omitempty"`
	EmbeddingModel string        `json:"embedding_model,omitempty"`
	Records        []ChunkRecord `json:"records"`
}

type chunkParseResult struct {
	Document            ChunkDocument
	SectionTextByAnchor map[string]string
}

type chunkSectionMeta struct {
	Anchor          string `json:"anchor"`
	SectionNumber   string `json:"sectionNumber"`
	ParagraphNumber string `json:"paragraphNumber"`
	MarginalNote    string `json:"marginalNote"`
}

func (s chunkSectionMeta) tag() string {
	parts := make([]string, 0, 3)
	if s.SectionNumber != "" {
		parts = append(parts, "section-"+strings.TrimSuffix(s.SectionNumber, "."))
	}
	if s.ParagraphNumber != "" {
		parts = append(parts, "subsection-"+s.ParagraphNumber)
	}
	if s.MarginalNote != "" {
		if slug := chunkSlugify(s.MarginalNote); slug != "" {
			parts = append(parts, slug)
		}
	}
	if len(parts) == 0 {
		return s.Anchor
	}
	return strings.Join(parts, "::")
}

type chunkParserState struct {
	InHeadnote      bool
	HeadnoteParts   []string
	PendingHeadnote string
	CaptureBlock    bool
	BlockParts      []string
	CurrentAnchor   string
	PendingAnchor   string
	SectionOrder    []string
	SectionText     map[string][]string
	AnchorAliases   map[string]string
}

func (cfg *apiConfig) ChunkHTMLLegislation(ctx context.Context, sourceFile, htmlContent string, opts ChunkOptions) (ChunkDocument, error) {
	parsed, err := parseHTMLLegislationChunks(sourceFile, htmlContent)
	if err != nil {
		return ChunkDocument{}, err
	}
	document := parsed.Document

	if opts.IncludeDomains {
		if cfg == nil {
			return ChunkDocument{}, errors.New("apiConfig is required for domain classification")
		}
		if len(opts.DomainKeywords) == 0 {
			return ChunkDocument{}, errors.New("domain keywords are required for domain classification")
		}
		model := opts.DomainModel
		if model == "" {
			model = openai.ChatModelGPT5_2
		}
		keywordSet := chunkToSet(opts.DomainKeywords)
		for index := range document.Records {
			sectionText := parsed.SectionTextByAnchor[document.Records[index].SectionAnchor]
			otherText := strings.TrimSpace(strings.Replace(sectionText, document.Records[index].Text, "", 1))
			if otherText == "" {
				otherText = sectionText
			}
			domains, err := cfg.classifyChunkDomains(ctx, document.Records[index].Text, otherText, opts.DomainKeywords, keywordSet, model)
			if err != nil {
				return ChunkDocument{}, err
			}
			document.Records[index].Domains = domains
		}
		document.DomainModel = model
	}

	if opts.IncludeEmbeddings {
		if cfg == nil {
			return ChunkDocument{}, errors.New("apiConfig is required for embeddings")
		}
		if opts.EmbeddingModel == "" {
			return ChunkDocument{}, errors.New("embedding model is required for embeddings")
		}
		if err := cfg.embedChunkRecords(ctx, document.Records, opts.EmbeddingModel, opts.EmbeddingBatchSize); err != nil {
			return ChunkDocument{}, err
		}
		document.EmbeddingModel = opts.EmbeddingModel
	}

	document.RecordCount = len(document.Records)
	return document, nil
}

func (cfg *apiConfig) ChunkHTMLLegislationFile(ctx context.Context, path string, opts ChunkOptions) (ChunkDocument, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return ChunkDocument{}, err
	}
	return cfg.ChunkHTMLLegislation(ctx, filepath.Base(path), string(content), opts)
}

func (cfg *apiConfig) IngestHTMLLegislation(ctx context.Context, sourceFile, htmlContent string, opts ChunkOptions) (ChunkDocument, error) {
	if cfg == nil || cfg.db == nil {
		return ChunkDocument{}, errors.New("apiConfig with db is required for ingestion")
	}
	document, err := cfg.ChunkHTMLLegislation(ctx, sourceFile, htmlContent, opts)
	if err != nil {
		return ChunkDocument{}, err
	}
	if _, _, err := cfg.storeChunkDocument(ctx, document); err != nil {
		return ChunkDocument{}, err
	}
	return document, nil
}

func (cfg *apiConfig) IngestHTMLLegislationFile(ctx context.Context, path string, opts ChunkOptions) (ChunkDocument, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return ChunkDocument{}, err
	}
	return cfg.IngestHTMLLegislation(ctx, filepath.Base(path), string(content), opts)
}

func parseHTMLLegislationChunks(sourceFile, content string) (chunkParseResult, error) {
	titleParts := parseChunkTitleParts(content)
	citation := ""
	documentTitle := ""
	if len(titleParts) > 0 {
		citation = titleParts[0]
		documentTitle = titleParts[0]
	}
	if len(titleParts) > 1 {
		documentTitle = titleParts[1]
	}

	datePlaced, dateReplaced, err := parseChunkLawDates(content)
	if err != nil {
		return chunkParseResult{}, err
	}

	sectionMetaByAnchor, err := parseChunkSectionMetadata(content)
	if err != nil {
		return chunkParseResult{}, err
	}

	originalDoc, err := extractChunkOriginalDocument(content)
	if err != nil {
		return chunkParseResult{}, err
	}

	state := parseChunkDocumentContent(originalDoc)
	records, sectionTextByAnchor := buildChunkRecords(sourceFile, documentTitle, citation, state, sectionMetaByAnchor)
	document := ChunkDocument{
		SourceFile:     sourceFile,
		DocumentTitle:  documentTitle,
		Citation:       citation,
		DatePlaced:     datePlaced,
		DateReplaced:   dateReplaced,
		RecordCount:    len(records),
		DomainModel:    "",
		EmbeddingModel: "",
		Records:        records,
	}
	return chunkParseResult{Document: document, SectionTextByAnchor: sectionTextByAnchor}, nil
}

func parseChunkLawDates(content string) (*time.Time, *time.Time, error) {
	datePlaced, err := parseChunkDateMatch(content, chunkUpdateDateRE)
	if err != nil {
		return nil, nil, err
	}
	dateReplaced, err := parseChunkDateMatch(content, chunkLastModifiedDateRE)
	if err != nil {
		return nil, nil, err
	}
	return datePlaced, dateReplaced, nil
}

func parseChunkDateMatch(content string, re *regexp.Regexp) (*time.Time, error) {
	match := re.FindStringSubmatch(content)
	if len(match) < 2 {
		return nil, nil
	}
	raw := strings.NewReplacer("\u00a0", " ", "\u202f", " ").Replace(strings.TrimSpace(html.UnescapeString(match[1])))
	raw = strings.Join(strings.Fields(raw), " ")
	if raw == "" {
		return nil, nil
	}
	parsed, err := time.Parse("January 2, 2006, 3:04:05 PM MST", raw)
	if err != nil {
		return nil, fmt.Errorf("parse chunk date %q: %w", raw, err)
	}
	return &parsed, nil
}

func parseChunkTitleParts(content string) []string {
	match := chunkTitleRE.FindStringSubmatch(content)
	if len(match) < 2 {
		return nil
	}
	raw := chunkNormalizeWhitespace(html.UnescapeString(chunkStripTags(match[1])))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, "|")
	cleaned := make([]string, 0, len(parts))
	for _, part := range parts {
		part = chunkNormalizeWhitespace(part)
		if part != "" {
			cleaned = append(cleaned, part)
		}
	}
	return cleaned
}

func parseChunkSectionMetadata(content string) (map[string]chunkSectionMeta, error) {
	match := chunkMetadataScriptRE.FindStringSubmatch(content)
	if len(match) < 2 {
		return map[string]chunkSectionMeta{}, nil
	}
	var items []chunkSectionMeta
	if err := json.Unmarshal([]byte(html.UnescapeString(match[1])), &items); err != nil {
		return nil, err
	}
	byAnchor := make(map[string]chunkSectionMeta, len(items))
	for _, item := range items {
		if item.Anchor != "" {
			byAnchor[item.Anchor] = item
		}
	}
	return byAnchor, nil
}

func extractChunkOriginalDocument(content string) (string, error) {
	loc := chunkStartDivOriginalDocRE.FindStringIndex(content)
	if loc == nil {
		return "", errors.New("could not find originalDocument div")
	}
	startTagEnd := strings.Index(content[loc[0]:loc[1]], ">")
	if startTagEnd < 0 {
		return "", errors.New("malformed originalDocument div")
	}
	start := loc[0] + startTagEnd + 1
	depth := 1
	for i := start; i < len(content); {
		next := strings.Index(content[i:], "<")
		if next < 0 {
			break
		}
		tagStart := i + next
		tagEndRel := strings.Index(content[tagStart:], ">")
		if tagEndRel < 0 {
			break
		}
		tagEnd := tagStart + tagEndRel + 1
		tag := strings.ToLower(content[tagStart:tagEnd])
		if strings.HasPrefix(tag, "<div") {
			depth++
		} else if strings.HasPrefix(tag, "</div") {
			depth--
			if depth == 0 {
				return content[start:tagStart], nil
			}
		}
		i = tagEnd
	}
	return "", errors.New("could not extract originalDocument contents")
}

func parseChunkDocumentContent(content string) chunkParserState {
	state := chunkParserState{
		SectionText:   map[string][]string{},
		AnchorAliases: map[string]string{},
	}

	last := 0
	matches := chunkTagRE.FindAllStringIndex(content, -1)
	for _, match := range matches {
		appendChunkText(&state, content[last:match[0]])
		handleChunkTag(&state, content[match[0]:match[1]])
		last = match[1]
	}
	appendChunkText(&state, content[last:])
	return state
}

func appendChunkText(state *chunkParserState, raw string) {
	text := chunkNormalizeWhitespace(html.UnescapeString(chunkStripTags(raw)))
	if text == "" {
		return
	}
	if state.InHeadnote {
		state.HeadnoteParts = append(state.HeadnoteParts, text)
	}
	if state.CaptureBlock {
		state.BlockParts = append(state.BlockParts, text)
	}
}

func handleChunkTag(state *chunkParserState, rawTag string) {
	tag := strings.TrimSpace(rawTag)
	lower := strings.ToLower(tag)
	if strings.HasPrefix(lower, "<!--") {
		return
	}
	if strings.HasPrefix(lower, "</") {
		name := strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(lower, "</"), ">"))
		handleChunkEndTag(state, name)
		return
	}
	selfClosing := strings.HasSuffix(lower, "/>")
	name, attrs := parseChunkTag(tag)
	handleChunkStartTag(state, strings.ToLower(name), attrs)
	if selfClosing {
		handleChunkEndTag(state, strings.ToLower(name))
	}
}

func handleChunkStartTag(state *chunkParserState, name string, attrs map[string]string) {
	switch name {
	case "a":
		anchor := attrs["name"]
		if anchor == "" || chunkClassSet(attrs["class"])["sectionLabel"] {
			anchor = attrs["id"]
		}
		if anchor == "" {
			return
		}
		if state.CaptureBlock && chunkIsProvisionAnchor(anchor) {
			state.CurrentAnchor = anchor
		} else if !state.CaptureBlock && chunkIsProvisionAnchor(anchor) {
			state.PendingAnchor = anchor
		}
	case "p":
		classes := chunkClassSet(attrs["class"])
		if classes["headnote-e"] || classes["MarginalNote"] {
			state.InHeadnote = true
			state.HeadnoteParts = nil
		}
		if intersectsChunkTextClasses(classes) {
			state.CaptureBlock = true
			state.BlockParts = nil
			state.CurrentAnchor = state.PendingAnchor
			state.PendingAnchor = ""
		}
	}
}

func handleChunkEndTag(state *chunkParserState, name string) {
	if name != "p" {
		return
	}
	if state.InHeadnote {
		headnote := chunkNormalizeWhitespace(strings.Join(state.HeadnoteParts, " "))
		if headnote != "" {
			state.PendingHeadnote = headnote
		}
		state.InHeadnote = false
		state.HeadnoteParts = nil
	}
	if state.CaptureBlock {
		text := chunkNormalizeWhitespace(strings.Join(state.BlockParts, " "))
		if text != "" {
			anchor := state.CurrentAnchor
			if anchor == "" && len(state.SectionOrder) > 0 {
				anchor = state.SectionOrder[len(state.SectionOrder)-1]
			}
			if anchor != "" {
				if _, ok := state.SectionText[anchor]; !ok {
					state.SectionOrder = append(state.SectionOrder, anchor)
					state.SectionText[anchor] = []string{}
				}
				state.SectionText[anchor] = append(state.SectionText[anchor], text)
				if state.PendingHeadnote != "" {
					if _, ok := state.AnchorAliases[anchor]; !ok {
						state.AnchorAliases[anchor] = state.PendingHeadnote
					}
				}
			}
		}
		state.CaptureBlock = false
		state.BlockParts = nil
		state.CurrentAnchor = ""
	}
}

func parseChunkTag(raw string) (string, map[string]string) {
	trimmed := strings.TrimSuffix(strings.TrimPrefix(strings.TrimSpace(raw), "<"), ">")
	trimmed = strings.TrimSuffix(trimmed, "/")
	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return "", map[string]string{}
	}
	attrs := map[string]string{}
	for _, match := range chunkAttrRE.FindAllStringSubmatch(trimmed, -1) {
		if len(match) == 3 {
			attrs[strings.ToLower(match[1])] = match[2]
		}
	}
	return parts[0], attrs
}

func chunkIsProvisionAnchor(anchor string) bool {
	return strings.HasPrefix(anchor, "sec") || strings.HasPrefix(anchor, "art") || strings.HasPrefix(anchor, "s-")
}

func chunkClassSet(classAttr string) map[string]bool {
	classes := map[string]bool{}
	for _, class := range strings.Fields(classAttr) {
		classes[class] = true
	}
	return classes
}

func intersectsChunkTextClasses(classes map[string]bool) bool {
	for class := range classes {
		if chunkTextClasses[class] {
			return true
		}
	}
	return false
}

func buildChunkRecords(sourceFile, documentTitle, citation string, state chunkParserState, metaByAnchor map[string]chunkSectionMeta) ([]ChunkRecord, map[string]string) {
	records := make([]ChunkRecord, 0)
	sectionTextByAnchor := make(map[string]string, len(state.SectionOrder))
	for _, anchor := range state.SectionOrder {
		meta := chunkMetaForAnchor(anchor, state.AnchorAliases[anchor], metaByAnchor)
		sectionBlocks := normalizeChunkBlocks(state.SectionText[anchor])
		sectionText := chunkNormalizeWhitespace(strings.Join(sectionBlocks, " "))
		if sectionText == "" {
			continue
		}
		sectionTextByAnchor[anchor] = sectionText
		sentenceIndex := 1
		sectionTitle := meta.MarginalNote
		if strings.TrimSpace(sectionTitle) == "" {
			sectionTitle = state.AnchorAliases[anchor]
		}
		for _, block := range sectionBlocks {
			for _, sentence := range splitChunkSentences(block) {
				records = append(records, ChunkRecord{
					SourceFile:       sourceFile,
					DocumentTitle:    documentTitle,
					Citation:         citation,
					SectionAnchor:    anchor,
					SectionNumber:    meta.SectionNumber,
					SubsectionNumber: meta.ParagraphNumber,
					SectionTitle:     sectionTitle,
					Tag:              meta.tag(),
					SentenceIndex:    sentenceIndex,
					Text:             sentence,
					Domains:          []string{},
					Embedding:        []float64{},
				})
				sentenceIndex++
			}
		}
	}
	return records, sectionTextByAnchor
}

func normalizeChunkBlocks(blocks []string) []string {
	normalized := make([]string, 0, len(blocks))
	for i, block := range blocks {
		block = chunkNormalizeWhitespace(block)
		if i == 0 {
			block = stripLeadingChunkSectionMarker(block)
		}
		if block != "" {
			normalized = append(normalized, block)
		}
	}
	return normalized
}

func chunkMetaForAnchor(anchor, marginalNote string, metaByAnchor map[string]chunkSectionMeta) chunkSectionMeta {
	meta := metaByAnchor[anchor]
	if meta.Anchor == "" {
		meta = chunkSectionMeta{Anchor: anchor, MarginalNote: marginalNote}
	}
	sectionNumber, subsectionNumber := chunkSectionAndSubsectionFromAnchor(anchor)
	if meta.SectionNumber == "" {
		meta.SectionNumber = sectionNumber
	}
	if meta.ParagraphNumber == "" {
		meta.ParagraphNumber = subsectionNumber
	}
	return meta
}

func chunkSectionAndSubsectionFromAnchor(anchor string) (string, string) {
	if strings.HasPrefix(anchor, "s-") {
		return strings.ReplaceAll(strings.TrimPrefix(anchor, "s-"), "_and_", " and "), ""
	}
	if strings.HasPrefix(anchor, "art") {
		value := strings.TrimPrefix(anchor, "art")
		section, subsection, found := strings.Cut(value, "par")
		if !found {
			return section, ""
		}
		return strings.ReplaceAll(section, "_", "."), strings.ReplaceAll(subsection, "_", ".")
	}
	if !strings.HasPrefix(anchor, "sec") {
		return "", ""
	}
	value := strings.TrimPrefix(anchor, "sec")
	if value == "" {
		return "", ""
	}
	section, subsection, found := strings.Cut(value, "subsec")
	if !found {
		return section, ""
	}
	return section, subsection
}

func (cfg *apiConfig) classifyChunkDomains(ctx context.Context, recordText, sectionText string, keywords []string, keywordSet map[string]struct{}, model string) ([]string, error) {
	jsonFormat := shared.NewResponseFormatJSONObjectParam()
	allowedKeywords, err := json.Marshal(keywords)
	if err != nil {
		return nil, err
	}
	response, err := cfg.openaiClient.Responses.New(ctx, responses.ResponseNewParams{
		Instructions: openai.String(chunkDomainPrompt),
		Input: responses.ResponseNewParamsInputUnion{OfString: openai.String(fmt.Sprintf(
			"Allowed keywords:\n%s\n\nCurrent record text:\n%s\n\nOther text from the same section:\n%s",
			string(allowedKeywords),
			recordText,
			sectionText,
		))},
		Model:       model,
		Temperature: openai.Float(0),
		Text: responses.ResponseTextConfigParam{
			Format: responses.ResponseFormatTextConfigUnionParam{OfJSONObject: &jsonFormat},
		},
	})
	if err != nil {
		return nil, err
	}

	var payload struct {
		Domains []string `json:"domains"`
	}
	if err := json.Unmarshal([]byte(response.OutputText()), &payload); err != nil {
		return nil, fmt.Errorf("could not parse domain JSON: %w", err)
	}

	selected := make([]string, 0, 3)
	seen := map[string]struct{}{}
	for _, domain := range payload.Domains {
		if _, ok := keywordSet[domain]; !ok {
			continue
		}
		if _, ok := seen[domain]; ok {
			continue
		}
		seen[domain] = struct{}{}
		selected = append(selected, domain)
		if len(selected) == 3 {
			break
		}
	}
	return selected, nil
}

func (cfg *apiConfig) embedChunkRecords(ctx context.Context, records []ChunkRecord, model string, batchSize int) error {
	if batchSize < 1 {
		batchSize = 1
	}
	for start := 0; start < len(records); start += batchSize {
		end := start + batchSize
		if end > len(records) {
			end = len(records)
		}
		inputs := make([]string, 0, end-start)
		for i := start; i < end; i++ {
			inputs = append(inputs, records[i].Text)
		}

		response, err := cfg.openaiClient.Embeddings.New(ctx, openai.EmbeddingNewParams{
			Model:          model,
			Input:          openai.EmbeddingNewParamsInputUnion{OfArrayOfStrings: inputs},
			EncodingFormat: openai.EmbeddingNewParamsEncodingFormatFloat,
		})
		if err != nil {
			return err
		}
		if len(response.Data) != len(inputs) {
			return fmt.Errorf("embedding response length mismatch: got %d want %d", len(response.Data), len(inputs))
		}
		for _, item := range response.Data {
			index := int(item.Index)
			if index < 0 || index >= len(inputs) {
				return fmt.Errorf("embedding index out of range: %d", item.Index)
			}
			records[start+index].Embedding = item.Embedding
		}
	}
	return nil
}

func LoadChunkDomainKeywords(path string) ([]string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	keywords := make([]string, 0)
	for _, line := range strings.Split(string(content), "\n") {
		keyword := chunkNormalizeWhitespace(strings.TrimPrefix(line, "\ufeff"))
		if keyword == "" || strings.HasPrefix(keyword, "#") {
			continue
		}
		if _, ok := seen[keyword]; ok {
			continue
		}
		seen[keyword] = struct{}{}
		keywords = append(keywords, keyword)
	}
	if len(keywords) == 0 {
		return nil, fmt.Errorf("requests file is empty: %s", path)
	}
	return keywords, nil
}

func chunkNormalizeWhitespace(value string) string {
	value = strings.ReplaceAll(value, "\u00a0", " ")
	value = chunkWhitespaceRE.ReplaceAllString(value, " ")
	value = strings.NewReplacer(
		" .", ".",
		" ,", ",",
		" ;", ";",
		" :", ":",
		" !", "!",
		" ?", "?",
		" )", ")",
		"( ", "(",
	).Replace(value)
	return strings.TrimSpace(value)
}

func stripLeadingChunkSectionMarker(value string) string {
	return strings.TrimSpace(chunkLeadingSectionMarker.ReplaceAllString(value, ""))
}

func splitChunkSentences(text string) []string {
	text = chunkNormalizeWhitespace(text)
	if text == "" {
		return nil
	}
	parts := splitChunkSentenceProtected(text)
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = chunkNormalizeWhitespace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

func splitChunkSentenceProtected(text string) []string {
	parts := make([]string, 0)
	start := 0
	for i := 0; i < len(text); i++ {
		switch text[i] {
		case '.', '!', '?':
			if chunkPunctuationIsInAbbreviation(text, i) {
				continue
			}
			if chunkEndsWithAbbreviation(text[:i+1]) {
				continue
			}
			j := i + 1
			for j < len(text) && unicode.IsSpace(rune(text[j])) {
				j++
			}
			if j >= len(text) {
				continue
			}
			r, _ := utf8.DecodeRuneInString(text[j:])
			if isChunkSentenceStartRune(r) {
				parts = append(parts, strings.TrimSpace(text[start:j]))
				start = j
			}
		}
	}
	parts = append(parts, strings.TrimSpace(text[start:]))
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			filtered = append(filtered, part)
		}
	}
	return filtered
}

func chunkPunctuationIsInAbbreviation(text string, index int) bool {
	for _, abbr := range chunkAbbreviations {
		searchStart := 0
		for searchStart < len(text) {
			match := strings.Index(text[searchStart:], abbr)
			if match < 0 {
				break
			}
			match += searchStart
			if chunkHasAbbreviationBoundary(text, match) && index >= match && index < match+len(abbr) {
				return true
			}
			searchStart = match + 1
		}
	}
	return false
}

func chunkEndsWithAbbreviation(value string) bool {
	value = strings.TrimSpace(value)
	for _, abbr := range chunkAbbreviations {
		if !strings.HasSuffix(value, abbr) {
			continue
		}
		start := len(value) - len(abbr)
		if start == 0 {
			return true
		}
		if chunkHasAbbreviationBoundary(value, start) {
			return true
		}
	}
	return false
}

func chunkHasAbbreviationBoundary(value string, start int) bool {
	if start == 0 {
		return true
	}
	previous, _ := utf8.DecodeLastRuneInString(value[:start])
	return unicode.IsSpace(previous) || strings.ContainsRune("([{'\"“,;:", previous)
}

func isChunkSentenceStartRune(r rune) bool {
	if unicode.IsUpper(r) || unicode.IsDigit(r) {
		return true
	}
	switch r {
	case '"', '\'', '“', '”', '‘', '’', '(':
		return true
	default:
		return false
	}
}

func chunkStripTags(value string) string {
	return chunkTagRE.ReplaceAllString(value, " ")
}

func chunkSlugify(value string) string {
	value = strings.ToLower(value)
	var b strings.Builder
	lastDash := false
	for _, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			b.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

func chunkToSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}
	return set
}

func (cfg *apiConfig) storeChunkDocument(ctx context.Context, document ChunkDocument) (database.Law, []database.Sublaw, error) {
	law, err := cfg.db.CreateLaw(ctx, database.CreateLawParams{
		Citation:     document.Citation,
		DatePlaced:   chunkNullTime(document.DatePlaced),
		DateReplaced: chunkNullTime(document.DateReplaced),
	})
	if err != nil {
		return database.Law{}, nil, err
	}
	sublaws := make([]database.Sublaw, 0, len(document.Records))
	for i, record := range document.Records {
		embedding, err := chunkJSONText(record.Embedding)
		if err != nil {
			return database.Law{}, nil, err
		}
		keywords, err := chunkJSONText(record.Domains)
		if err != nil {
			return database.Law{}, nil, err
		}
		sublaw, err := cfg.db.CreateSublaw(ctx, database.CreateSublawParams{
			Citation:   record.Citation,
			Sequence:   chunkNullString(strconv.Itoa(i + 1)),
			Anchor:     chunkNullString(record.SectionAnchor),
			Content:    chunkNullString(record.Text),
			Embedding:  embedding,
			Keywords:   keywords,
			DocumentID: law.ID,
		})
		if err != nil {
			return database.Law{}, nil, err
		}
		sublaws = append(sublaws, sublaw)
	}
	return law, sublaws, nil
}

func chunkNullString(value string) sql.NullString {
	if strings.TrimSpace(value) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: value, Valid: true}
}

func chunkNullTime(value *time.Time) sql.NullTime {
	if value == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: *value, Valid: true}
}

func chunkJSONText(value any) (sql.NullString, error) {
	bytes, err := json.Marshal(value)
	if err != nil {
		return sql.NullString{}, err
	}
	if string(bytes) == "null" || string(bytes) == "[]" {
		return sql.NullString{}, nil
	}
	return sql.NullString{String: string(bytes), Valid: true}, nil
}
