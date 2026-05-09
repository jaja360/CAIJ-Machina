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
	  <meta name="entryIntoForceDate" content="2026-04-09">
	  <meta name="endInForceDate" content="2026-04-10">
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

func TestChunkHTMLContractParsesRecords(t *testing.T) {
	htmlContent := `<!doctype html>
<html>
<head>
	<title>Exclusive Supply Agreement - Lex Veille and PDrago inc.</title>
</head>
<body>
	<div class="page">
		<h1>Exclusive Supply Agreement</h1>
		<p class="subtitle">Between Lex Veille and PDrago inc.</p>
		<div class="parties">
			<p>This Exclusive Supply Agreement is entered into as of [Effective Date].</p>
		</div>
		<div class="section">
			<h2>1. Purpose</h2>
			<p>The purpose of this Agreement is to establish the terms. It applies immediately.</p>
		</div>
	</div>
</body>
</html>`

	document, err := (*apiConfig)(nil).ChunkHTMLContract(context.Background(), "contract.html", htmlContent, ChunkOptions{})
	if err != nil {
		t.Fatalf("ChunkHTMLContract returned error: %v", err)
	}

	if document.DocumentTitle != "Exclusive Supply Agreement - Lex Veille and PDrago inc." {
		t.Errorf("unexpected document title: %q", document.DocumentTitle)
	}
	if document.Citation != "Exclusive Supply Agreement - Lex Veille and PDrago inc." {
		t.Errorf("unexpected citation: %q", document.Citation)
	}
	if document.RecordCount != len(document.Records) {
		t.Errorf("record_count=%d, len(records)=%d", document.RecordCount, len(document.Records))
	}
	if document.RecordCount < 3 {
		t.Fatalf("expected at least 3 records, got %d", document.RecordCount)
	}

	firstPurpose := false
	for _, record := range document.Records {
		if record.SectionAnchor == "sec1" && record.Text == "The purpose of this Agreement is to establish the terms." {
			firstPurpose = true
			if record.SectionTitle != "Purpose" {
				t.Errorf("expected section title Purpose, got %q", record.SectionTitle)
			}
			if record.Tag != "section-1::purpose" {
				t.Errorf("expected tag section-1::purpose, got %q", record.Tag)
			}
		}
	}
	if !firstPurpose {
		t.Fatal("expected to find first sentence for section 1")
	}
}

func TestParseChunkLawDates(t *testing.T) {
	datePlaced, dateReplaced, err := parseChunkLawDates(`
<meta name="entryIntoForceDate" content="2026-04-09">
<meta name="endInForceDate" content="2026-04-10">`)
	if err != nil {
		t.Fatalf("parseChunkLawDates returned error: %v", err)
	}
	if datePlaced == nil || dateReplaced == nil {
		t.Fatal("expected both dates to be parsed")
	}
	placedWant := time.Date(2026, time.April, 9, 0, 0, 0, 0, time.UTC)
	replacedWant := time.Date(2026, time.April, 10, 0, 0, 0, 0, time.UTC)
	if !datePlaced.Equal(placedWant) {
		t.Errorf("expected datePlaced %v, got %v", placedWant, datePlaced)
	}
	if !dateReplaced.Equal(replacedWant) {
		t.Errorf("expected dateReplaced %v, got %v", replacedWant, dateReplaced)
	}
}

func TestParseChunkLawDatesFallsBackToCommentDates(t *testing.T) {
	datePlaced, dateReplaced, err := parseChunkLawDates(`
<!-- last modification date : April 9, 2026, 3:29:33 AM EDT -->
<!-- update date : April 9, 2026, 8:03:10 AM EDT -->`)
	if err != nil {
		t.Fatalf("parseChunkLawDates returned error: %v", err)
	}
	if datePlaced == nil || dateReplaced == nil {
		t.Fatal("expected fallback dates to be parsed")
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

func TestChunkHTMLContractFixtures(t *testing.T) {
	files, err := filepath.Glob(filepath.Join("contracts", "*.html"))
	if err != nil {
		t.Fatalf("failed to glob contract fixtures: %v", err)
	}
	if len(files) == 0 {
		t.Skip("no contract fixtures found")
	}

	for _, path := range files {
		t.Run(filepath.Base(path), func(t *testing.T) {
			document, err := (*apiConfig)(nil).ChunkHTMLContractFile(context.Background(), path, ChunkOptions{})
			if err != nil {
				t.Fatalf("ChunkHTMLContractFile returned error: %v", err)
			}
			if document.DocumentTitle == "" {
				t.Error("expected document title")
			}
			if document.Citation == "" {
				t.Error("expected citation")
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
