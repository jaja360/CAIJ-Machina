package main

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func TestChunkHTMLLegislationParsesRecords(t *testing.T) {
	htmlContent := `<!doctype html>
<html>
<head>
  <!-- last modification date : April 9, 2026, 3:29:33 AM EDT -->
  <!-- update date : April 9, 2026, 8:03:10 AM EDT -->
  <title>R.S.O. 1990, c. E.1 | Example Act</title>
  <script id="caijtdm">[{"anchor":"sec1","sectionNumber":"1.","paragraphNumber":"","marginalNote":"Purpose"}]</script>
</head>
<body>
  <div id="originalDocument">
    <p class="headnote-e">Purpose</p>
    <a id="sec1"></a>
    <p class="section-e">1. This Act applies to corporations. It binds the Crown.</p>
  </div>
</body>
</html>`

	document, err := (*apiConfig)(nil).ChunkHTMLLegislation(context.Background(), "example.html", htmlContent, ChunkOptions{})
	if err != nil {
		t.Fatalf("ChunkHTMLLegislation returned error: %v", err)
	}

	if document.SourceFile != "example.html" {
		t.Errorf("expected source file example.html, got %q", document.SourceFile)
	}
	if document.DocumentTitle != "Example Act" {
		t.Errorf("expected document title Example Act, got %q", document.DocumentTitle)
	}
	if document.Citation != "R.S.O. 1990, c. E.1" {
		t.Errorf("expected citation R.S.O. 1990, c. E.1, got %q", document.Citation)
	}
	if document.DatePlaced == nil {
		t.Fatal("expected date placed to be parsed")
	}
	if document.DateReplaced == nil {
		t.Fatal("expected date replaced to be parsed")
	}
	if document.RecordCount != 2 {
		t.Fatalf("expected 2 records, got %d", document.RecordCount)
	}

	first := document.Records[0]
	if first.SectionAnchor != "sec1" {
		t.Errorf("expected section anchor sec1, got %q", first.SectionAnchor)
	}
	if first.SectionNumber != "1." {
		t.Errorf("expected section number 1., got %q", first.SectionNumber)
	}
	if first.SectionTitle != "Purpose" {
		t.Errorf("expected section title Purpose, got %q", first.SectionTitle)
	}
	if first.Tag != "section-1::purpose" {
		t.Errorf("expected tag section-1::purpose, got %q", first.Tag)
	}
	if first.Text != "This Act applies to corporations." {
		t.Errorf("unexpected first text: %q", first.Text)
	}
	if first.SentenceIndex != 1 {
		t.Errorf("expected sentence index 1, got %d", first.SentenceIndex)
	}
	if len(first.Domains) != 0 {
		t.Errorf("expected no domains without IncludeDomains, got %v", first.Domains)
	}
	if len(first.Embedding) != 0 {
		t.Errorf("expected no embedding without IncludeEmbeddings, got %v", first.Embedding)
	}
}

func TestChunkHTMLLegislationMissingOriginalDocument(t *testing.T) {
	_, err := (*apiConfig)(nil).ChunkHTMLLegislation(context.Background(), "missing.html", `<html><body></body></html>`, ChunkOptions{})
	if err == nil {
		t.Fatal("expected error for missing originalDocument div")
	}
}

func TestParseChunkLawDates(t *testing.T) {
	datePlaced, dateReplaced, err := parseChunkLawDates(`
<!-- last modification date : April 9, 2026, 3:29:33 AM EDT -->
<!-- update date : April 9, 2026, 8:03:10 AM EDT -->`)
	if err != nil {
		t.Fatalf("parseChunkLawDates returned error: %v", err)
	}
	if datePlaced == nil || dateReplaced == nil {
		t.Fatal("expected both dates to be parsed")
	}
	placedWant := time.Date(2026, time.April, 9, 8, 3, 10, 0, datePlaced.Location())
	replacedWant := time.Date(2026, time.April, 9, 3, 29, 33, 0, dateReplaced.Location())
	if !datePlaced.Equal(placedWant) {
		t.Errorf("expected datePlaced %v, got %v", placedWant, datePlaced)
	}
	if !dateReplaced.Equal(replacedWant) {
		t.Errorf("expected dateReplaced %v, got %v", replacedWant, dateReplaced)
	}
}

func TestChunkHTMLLegislationDocumentsFixtures(t *testing.T) {
	files, err := filepath.Glob(filepath.Join("..", "documents", "*.html"))
	if err != nil {
		t.Fatalf("failed to glob document fixtures: %v", err)
	}
	if len(files) == 0 {
		t.Skip("no document fixtures found")
	}

	for _, path := range files {
		t.Run(filepath.Base(path), func(t *testing.T) {
			document, err := (*apiConfig)(nil).ChunkHTMLLegislationFile(context.Background(), path, ChunkOptions{})
			if err != nil {
				t.Fatalf("ChunkHTMLLegislationFile returned error: %v", err)
			}
			t.Logf("parsed %d chunks", document.RecordCount)
			if document.Citation == "" {
				t.Error("expected citation from title")
			}
			if document.DocumentTitle == "" {
				t.Error("expected document title from title")
			}
			if document.RecordCount == 0 {
				t.Fatal("expected at least one chunk record")
			}
			if document.RecordCount != len(document.Records) {
				t.Errorf("record_count=%d, len(records)=%d", document.RecordCount, len(document.Records))
			}
		})
	}
}

func TestChunkHTMLLegislationCanLIIFixtureMetadata(t *testing.T) {
	path := filepath.Join("..", "documents", "CRC, c 870 _ Food and Drug Regulations _ CanLII.html")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("fixture not available: %v", err)
	}

	document, err := (*apiConfig)(nil).ChunkHTMLLegislationFile(context.Background(), path, ChunkOptions{})
	if err != nil {
		t.Fatalf("ChunkHTMLLegislationFile returned error: %v", err)
	}

	for _, record := range document.Records {
		if record.SectionAnchor == "s-A.01.001" {
			if record.SectionNumber != "A.01.001" {
				t.Errorf("expected section number A.01.001, got %q", record.SectionNumber)
			}
			if record.Text != "These Regulations may be cited as the Food and Drug Regulations." {
				t.Errorf("unexpected section A.01.001 text: %q", record.Text)
			}
			return
		}
	}
	t.Fatal("expected a chunk for section anchor s-A.01.001")
}

func TestSplitChunkSentencesKeepsAbbreviations(t *testing.T) {
	tests := []struct {
		name string
		text string
		want []string
	}{
		{
			name: "regular sentence split",
			text: "This Act applies to corporations. It binds the Crown.",
			want: []string{"This Act applies to corporations.", "It binds the Crown."},
		},
		{
			name: "abbreviation kept together",
			text: "R.S.O. references remain together. This is separate.",
			want: []string{"R.S.O. references remain together.", "This is separate."},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := splitChunkSentences(tt.text)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("expected %v, got %v", tt.want, got)
			}
		})
	}
}

func TestLoadChunkDomainKeywords(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "requests.txt")
	if err := os.WriteFile(path, []byte("\ufeffprivacy\n# comment\nprivacy\ncontracts\n\n"), 0o644); err != nil {
		t.Fatalf("failed to write keywords file: %v", err)
	}

	got, err := LoadChunkDomainKeywords(path)
	if err != nil {
		t.Fatalf("LoadChunkDomainKeywords returned error: %v", err)
	}
	want := []string{"privacy", "contracts"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("expected %v, got %v", want, got)
	}
}
