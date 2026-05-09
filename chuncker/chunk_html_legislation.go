package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

const (
	metadataScriptID = "caijtdm"
	originalDocument = "originalDocument"
	domainPrompt     = "You classify a legal text chunk into up to 3 domains from a fixed keyword list. Return only strict JSON with the shape {\"domains\": [\"keyword1\", \"keyword2\"]}. Use only exact keywords from the provided list. Return an empty array when none apply."
)

var (
	whitespaceRE          = regexp.MustCompile(`\s+`)
	leadingSectionMarker  = regexp.MustCompile(`^(\d+\.|\(\d+\))\s*`)
	titleRE               = regexp.MustCompile(`(?is)<title>(.*?)</title>`)
	metadataScriptRE      = regexp.MustCompile(`(?is)<script[^>]*id=["']` + metadataScriptID + `["'][^>]*>(.*?)</script>`)
	startDivOriginalDocRE = regexp.MustCompile(`(?is)<div\b[^>]*id=["']` + originalDocument + `["'][^>]*>`)
	tagRE                 = regexp.MustCompile(`(?is)<[^>]+>`)
	attrRE                = regexp.MustCompile(`([a-zA-Z_:][a-zA-Z0-9_:\-]*)\s*=\s*(["'])(.*?)\2`)
	abbreviations         = []string{"R.S.O.", "S.O.", "c.", "s.", "ss.", "Sched.", "No.", "Inc.", "Ltd."}
	textClasses           = map[string]bool{
		"section-e":    true,
		"subsection-e": true,
		"clause-e":     true,
		"subclause-e":  true,
		"firstdef-e":   true,
		"definition-e": true,
	}
)

type config struct {
	InputDir        string
	OutputDir       string
	RequestsFile    string
	APIBaseURL      string
	DomainModel     string
	EmbeddingModel  string
	EmbeddingBatch  int
	HTTPTimeout     time.Duration
	SkipDomains     bool
	SkipEmbeddings  bool
	WriteIndented   bool
	HTTPClient      *http.Client
	APIKey          string
	DomainKeywords  []string
	DomainKeywordsS map[string]struct{}
}

type sectionMeta struct {
	Anchor          string `json:"anchor"`
	SectionNumber   string `json:"sectionNumber"`
	ParagraphNumber string `json:"paragraphNumber"`
	MarginalNote    string `json:"marginalNote"`
}

func (s sectionMeta) tag() string {
	parts := make([]string, 0, 3)
	if s.SectionNumber != "" {
		parts = append(parts, "section-"+strings.TrimSuffix(s.SectionNumber, "."))
	}
	if s.ParagraphNumber != "" {
		parts = append(parts, "subsection-"+s.ParagraphNumber)
	}
	if s.MarginalNote != "" {
		slug := slugify(s.MarginalNote)
		if slug != "" {
			parts = append(parts, slug)
		}
	}
	if len(parts) == 0 {
		return s.Anchor
	}
	return strings.Join(parts, "::")
}

type record struct {
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

type documentOutput struct {
	SourceFile      string   `json:"source_file"`
	DocumentTitle   string   `json:"document_title"`
	Citation        string   `json:"citation"`
	RecordCount     int      `json:"record_count"`
	DomainModel     string   `json:"domain_model,omitempty"`
	EmbeddingModel  string   `json:"embedding_model,omitempty"`
	RequestsFile    string   `json:"requests_file,omitempty"`
	Records         []record `json:"records"`
}

type parserState struct {
	InHeadnote       bool
	HeadnoteParts    []string
	PendingHeadnote  string
	CaptureBlock     bool
	BlockParts       []string
	CurrentAnchor    string
	PendingAnchor    string
	SectionOrder     []string
	SectionText      map[string][]string
	AnchorAliases    map[string]string
	CurrentPClasses  map[string]bool
	InsideP          bool
}

type deepseekChatRequest struct {
	Model       string                   `json:"model"`
	Messages    []map[string]string      `json:"messages"`
	Temperature float64                  `json:"temperature,omitempty"`
	ResponseFmt map[string]string        `json:"response_format,omitempty"`
}

type deepseekChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type deepseekEmbeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

type deepseekEmbeddingResponse struct {
	Data []struct {
		Embedding []float64 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}

	inputDir := flag.String("input-dir", ".", "Directory containing rso-*.html files")
	outputDir := flag.String("output-dir", ".", "Directory to write JSON output files")
	requestsFile := flag.String("requests-file", "requests.txt", "Path to newline-delimited domain keywords")
	apiBaseURL := flag.String("api-base-url", "https://api.deepseek.com", "DeepSeek API base URL")
	domainModel := flag.String("domain-model", "deepseek-chat", "DeepSeek model for domain classification")
	embeddingModel := flag.String("embedding-model", "deepseek-embedding", "DeepSeek model for embeddings")
	embeddingBatch := flag.Int("embedding-batch-size", 64, "Number of chunks per embedding request")
	timeout := flag.Duration("http-timeout", 90*time.Second, "HTTP timeout")
	skipDomains := flag.Bool("skip-domains", false, "Skip domain classification calls")
	skipEmbeddings := flag.Bool("skip-embeddings", false, "Skip embedding calls")
	writeIndented := flag.Bool("indent", true, "Write indented JSON output")
	flag.Parse()

	if apiKey == "" && (!*skipDomains || !*skipEmbeddings) {
		return errors.New("DEEPSEEK_API_KEY or OPENAI_API_KEY must be set unless both --skip-domains and --skip-embeddings are enabled")
	}

	keywords, err := loadKeywords(*requestsFile)
	if err != nil {
		return err
	}

	files, err := filepath.Glob(filepath.Join(*inputDir, "rso-*.html"))
	if err != nil {
		return err
	}
	if len(files) == 0 {
		return fmt.Errorf("no files matched %s", filepath.Join(*inputDir, "rso-*.html"))
	}
	sort.Strings(files)

	if err := os.MkdirAll(*outputDir, 0o755); err != nil {
		return err
	}

	cfg := config{
		InputDir:        *inputDir,
		OutputDir:       *outputDir,
		RequestsFile:    *requestsFile,
		APIBaseURL:      strings.TrimRight(*apiBaseURL, "/"),
		DomainModel:     *domainModel,
		EmbeddingModel:  *embeddingModel,
		EmbeddingBatch:  max(1, *embeddingBatch),
		HTTPTimeout:     *timeout,
		SkipDomains:     *skipDomains,
		SkipEmbeddings:  *skipEmbeddings,
		WriteIndented:   *writeIndented,
		HTTPClient:      &http.Client{Timeout: *timeout},
		APIKey:          apiKey,
		DomainKeywords:  keywords,
		DomainKeywordsS: toSet(keywords),
	}

	for _, file := range files {
		if err := processFile(cfg, file); err != nil {
			return fmt.Errorf("%s: %w", filepath.Base(file), err)
		}
	}

	return nil
}

func processFile(cfg config, path string) error {
	contentBytes, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	content := string(contentBytes)

	titleParts := parseTitleParts(content)
	citation := ""
	documentTitle := ""
	if len(titleParts) > 0 {
		citation = titleParts[0]
		documentTitle = titleParts[0]
	}
	if len(titleParts) > 1 {
		documentTitle = titleParts[1]
	}

	sectionMetaByAnchor, err := parseSectionMetadata(content)
	if err != nil {
		return err
	}

	originalDoc, err := extractOriginalDocument(content)
	if err != nil {
		return err
	}

	state := parseDocumentContent(originalDoc)
	records, sectionTextByAnchor := buildRecords(filepath.Base(path), documentTitle, citation, state, sectionMetaByAnchor)

	if !cfg.SkipDomains {
		for index := range records {
			sectionText := sectionTextByAnchor[records[index].SectionAnchor]
			otherText := strings.TrimSpace(strings.Replace(sectionText, records[index].Text, "", 1))
			if otherText == "" {
				otherText = sectionText
			}
			domains, err := classifyDomains(cfg, records[index].Text, otherText)
			if err != nil {
				return err
			}
			records[index].Domains = domains
			fmt.Fprintf(os.Stderr, "Tagged domains for %s: %d/%d\n", filepath.Base(path), index+1, len(records))
		}
	}

	if !cfg.SkipEmbeddings {
		if err := embedRecords(cfg, filepath.Base(path), records); err != nil {
			return err
		}
	}

	output := documentOutput{
		SourceFile:   filepath.Base(path),
		DocumentTitle: documentTitle,
		Citation:     citation,
		RecordCount:  len(records),
		Records:      records,
		RequestsFile: filepath.Base(cfg.RequestsFile),
	}
	if !cfg.SkipDomains {
		output.DomainModel = cfg.DomainModel
	}
	if !cfg.SkipEmbeddings {
		output.EmbeddingModel = cfg.EmbeddingModel
	}

	encoded, err := marshalOutput(output, cfg.WriteIndented)
	if err != nil {
		return err
	}
	outputPath := filepath.Join(cfg.OutputDir, strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))+".json")
	if err := os.WriteFile(outputPath, encoded, 0o644); err != nil {
		return err
	}

	fmt.Printf("Wrote %d records to %s\n", len(records), outputPath)
	return nil
}

func parseTitleParts(content string) []string {
	match := titleRE.FindStringSubmatch(content)
	if len(match) < 2 {
		return nil
	}
	raw := normalizeWhitespace(html.UnescapeString(stripTags(match[1])))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, "|")
	cleaned := make([]string, 0, len(parts))
	for _, part := range parts {
		part = normalizeWhitespace(part)
		if part != "" {
			cleaned = append(cleaned, part)
		}
	}
	return cleaned
}

func parseSectionMetadata(content string) (map[string]sectionMeta, error) {
	match := metadataScriptRE.FindStringSubmatch(content)
	if len(match) < 2 {
		return map[string]sectionMeta{}, nil
	}
	var items []sectionMeta
	if err := json.Unmarshal([]byte(html.UnescapeString(match[1])), &items); err != nil {
		return nil, err
	}
	byAnchor := make(map[string]sectionMeta, len(items))
	for _, item := range items {
		if item.Anchor != "" {
			byAnchor[item.Anchor] = item
		}
	}
	return byAnchor, nil
}

func extractOriginalDocument(content string) (string, error) {
	loc := startDivOriginalDocRE.FindStringIndex(content)
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

func parseDocumentContent(content string) parserState {
	state := parserState{
		SectionText:   map[string][]string{},
		AnchorAliases: map[string]string{},
	}

	last := 0
	matches := tagRE.FindAllStringIndex(content, -1)
	for _, match := range matches {
		textPart := content[last:match[0]]
		appendText(&state, textPart)
		tag := content[match[0]:match[1]]
		handleTag(&state, tag)
		last = match[1]
	}
	appendText(&state, content[last:])
	return state
}

func appendText(state *parserState, raw string) {
	text := normalizeWhitespace(html.UnescapeString(stripTags(raw)))
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

func handleTag(state *parserState, rawTag string) {
	tag := strings.TrimSpace(rawTag)
	lower := strings.ToLower(tag)
	if strings.HasPrefix(lower, "<!--") {
		return
	}
	if strings.HasPrefix(lower, "</") {
		name := strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(lower, "</"), ">"))
		handleEndTag(state, name)
		return
	}
	selfClosing := strings.HasSuffix(lower, "/>")
	name, attrs := parseTag(tag)
	handleStartTag(state, strings.ToLower(name), attrs)
	if selfClosing {
		handleEndTag(state, strings.ToLower(name))
	}
}

func handleStartTag(state *parserState, name string, attrs map[string]string) {
	switch name {
	case "a":
		anchor := firstNonEmpty(attrs["id"], attrs["name"])
		if anchor == "" {
			return
		}
		if state.CaptureBlock && state.CurrentAnchor == "" {
			state.CurrentAnchor = anchor
		} else if !state.CaptureBlock {
			state.PendingAnchor = anchor
		}
	case "p":
		state.InsideP = true
		classes := classSet(attrs["class"])
		state.CurrentPClasses = classes
		if classes["headnote-e"] {
			state.InHeadnote = true
			state.HeadnoteParts = nil
		}
		if intersectsTextClasses(classes) {
			state.CaptureBlock = true
			state.BlockParts = nil
			state.CurrentAnchor = state.PendingAnchor
			state.PendingAnchor = ""
		}
	}
}

func handleEndTag(state *parserState, name string) {
	if name != "p" {
		return
	}
	if state.InHeadnote {
		headnote := normalizeWhitespace(strings.Join(state.HeadnoteParts, " "))
		if headnote != "" {
			state.PendingHeadnote = headnote
		}
		state.InHeadnote = false
		state.HeadnoteParts = nil
	}
	if state.CaptureBlock {
		text := normalizeWhitespace(strings.Join(state.BlockParts, " "))
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
	state.InsideP = false
	state.CurrentPClasses = nil
}

func parseTag(raw string) (string, map[string]string) {
	trimmed := strings.TrimSuffix(strings.TrimPrefix(strings.TrimSpace(raw), "<"), ">")
	trimmed = strings.TrimSuffix(trimmed, "/")
	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return "", map[string]string{}
	}
	name := parts[0]
	attrs := map[string]string{}
	for _, match := range attrRE.FindAllStringSubmatch(trimmed, -1) {
		if len(match) == 4 {
			attrs[strings.ToLower(match[1])] = match[3]
		}
	}
	return name, attrs
}

func classSet(classAttr string) map[string]bool {
	classes := map[string]bool{}
	for _, class := range strings.Fields(classAttr) {
		classes[class] = true
	}
	return classes
}

func intersectsTextClasses(classes map[string]bool) bool {
	for class := range classes {
		if textClasses[class] {
			return true
		}
	}
	return false
}

func buildRecords(sourceFile, documentTitle, citation string, state parserState, metaByAnchor map[string]sectionMeta) ([]record, map[string]string) {
	records := make([]record, 0)
	sectionTextByAnchor := make(map[string]string, len(state.SectionOrder))
	for _, anchor := range state.SectionOrder {
		meta := metaByAnchor[anchor]
		if meta.Anchor == "" {
			meta = sectionMeta{Anchor: anchor, MarginalNote: state.AnchorAliases[anchor]}
		}
		sectionBlocks := append([]string(nil), state.SectionText[anchor]...)
		if len(sectionBlocks) > 0 {
			sectionBlocks[0] = stripLeadingSectionMarker(sectionBlocks[0])
		}
		sectionText := normalizeWhitespace(strings.Join(sectionBlocks, " "))
		if sectionText == "" {
			continue
		}
		sectionTextByAnchor[anchor] = sectionText
		sentences := splitSentences(sectionText)
		for i, sentence := range sentences {
			records = append(records, record{
				SourceFile:       sourceFile,
				DocumentTitle:    documentTitle,
				Citation:         citation,
				SectionAnchor:    anchor,
				SectionNumber:    meta.SectionNumber,
				SubsectionNumber: meta.ParagraphNumber,
				SectionTitle:     firstNonEmpty(meta.MarginalNote, state.AnchorAliases[anchor]),
				Tag:              meta.tag(),
				SentenceIndex:    i + 1,
				Text:             sentence,
				Domains:          []string{},
				Embedding:        []float64{},
			})
		}
	}
	return records, sectionTextByAnchor
}

func embedRecords(cfg config, sourceFile string, records []record) error {
	for start := 0; start < len(records); start += cfg.EmbeddingBatch {
		end := start + cfg.EmbeddingBatch
		if end > len(records) {
			end = len(records)
		}
		inputs := make([]string, 0, end-start)
		for i := start; i < end; i++ {
			inputs = append(inputs, records[i].Text)
		}
		vectors, err := requestEmbeddings(cfg, inputs)
		if err != nil {
			return err
		}
		for i := range vectors {
			records[start+i].Embedding = vectors[i]
		}
		fmt.Fprintf(os.Stderr, "Embedded chunks for %s: %d/%d\n", sourceFile, end, len(records))
	}
	return nil
}

func classifyDomains(cfg config, recordText, sectionText string) ([]string, error) {
	body := deepseekChatRequest{
		Model: cfg.DomainModel,
		Messages: []map[string]string{
			{"role": "system", "content": domainPrompt},
			{
				"role": "user",
				"content": fmt.Sprintf(
					"Allowed keywords:\n%s\n\nCurrent record text:\n%s\n\nOther text from the same section:\n%s",
					mustJSON(cfg.DomainKeywords),
					recordText,
					sectionText,
				),
			},
		},
		Temperature: 0,
		ResponseFmt: map[string]string{"type": "json_object"},
	}

	var response deepseekChatResponse
	if err := postJSON(cfg, cfg.APIBaseURL+"/chat/completions", body, &response); err != nil {
		return nil, err
	}
	if len(response.Choices) == 0 {
		return nil, errors.New("domain classification returned no choices")
	}

	var payload struct {
		Domains []string `json:"domains"`
	}
	if err := json.Unmarshal([]byte(response.Choices[0].Message.Content), &payload); err != nil {
		return nil, fmt.Errorf("could not parse domain JSON: %w", err)
	}

	selected := make([]string, 0, 3)
	seen := map[string]struct{}{}
	for _, domain := range payload.Domains {
		if _, ok := cfg.DomainKeywordsS[domain]; !ok {
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

func requestEmbeddings(cfg config, inputs []string) ([][]float64, error) {
	body := deepseekEmbeddingRequest{Model: cfg.EmbeddingModel, Input: inputs}
	var response deepseekEmbeddingResponse
	if err := postJSON(cfg, cfg.APIBaseURL+"/embeddings", body, &response); err != nil {
		return nil, err
	}
	if len(response.Data) != len(inputs) {
		return nil, fmt.Errorf("embedding response length mismatch: got %d want %d", len(response.Data), len(inputs))
	}
	vectors := make([][]float64, len(inputs))
	for _, item := range response.Data {
		if item.Index < 0 || item.Index >= len(inputs) {
			return nil, fmt.Errorf("embedding index out of range: %d", item.Index)
		}
		vectors[item.Index] = item.Embedding
	}
	return vectors, nil
}

func postJSON(cfg config, url string, requestBody any, responseBody any) error {
	encoded, err := json.Marshal(requestBody)
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(encoded))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := cfg.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("api request failed (%s): %s", resp.Status, strings.TrimSpace(string(body)))
	}
	if err := json.Unmarshal(body, responseBody); err != nil {
		return err
	}
	return nil
}

func loadKeywords(path string) ([]string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	seen := map[string]struct{}{}
	keywords := make([]string, 0)
	for _, line := range strings.Split(string(content), "\n") {
		keyword := normalizeWhitespace(strings.TrimPrefix(line, "\ufeff"))
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

func normalizeWhitespace(value string) string {
	value = strings.ReplaceAll(value, "\u00a0", " ")
	value = whitespaceRE.ReplaceAllString(value, " ")
	return strings.TrimSpace(value)
}

func stripLeadingSectionMarker(value string) string {
	return strings.TrimSpace(leadingSectionMarker.ReplaceAllString(value, ""))
}

func splitSentences(text string) []string {
	text = normalizeWhitespace(text)
	if text == "" {
		return nil
	}
	replacements := make(map[string]string, len(abbreviations))
	protected := text
	for i, abbr := range abbreviations {
		token := fmt.Sprintf("__ABBR_%d__", i+1)
		replacements[token] = abbr
		protected = strings.ReplaceAll(protected, abbr, token)
	}
	parts := splitSentenceProtected(protected)
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		for token, abbr := range replacements {
			part = strings.ReplaceAll(part, token, abbr)
		}
		part = normalizeWhitespace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

func splitSentenceProtected(text string) []string {
	parts := make([]string, 0)
	start := 0
	for i := 0; i < len(text); i++ {
		switch text[i] {
		case '.', '!', '?':
			j := i + 1
			for j < len(text) && unicode.IsSpace(rune(text[j])) {
				j++
			}
			if j >= len(text) {
				continue
			}
			r, _ := utf8.DecodeRuneInString(text[j:])
			if isSentenceStartRune(r) {
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

func isSentenceStartRune(r rune) bool {
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

func stripTags(value string) string {
	return tagRE.ReplaceAllString(value, " ")
}

func slugify(value string) string {
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

func marshalOutput(output documentOutput, indent bool) ([]byte, error) {
	if indent {
		return json.MarshalIndent(output, "", "  ")
	}
	return json.Marshal(output)
}

func mustJSON(value any) string {
	encoded, _ := json.Marshal(value)
	return string(encoded)
}

func toSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}
	return set
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
