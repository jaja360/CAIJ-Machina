package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jaja360/CAIJ-Machina/internal/database"
)

type fakeDBTX struct {
	execCalls []string
}

var _ database.DBTX = (*fakeDBTX)(nil)

func (f *fakeDBTX) ExecContext(_ context.Context, query string, _ ...any) (sql.Result, error) {
	f.execCalls = append(f.execCalls, query)
	return &fakeResult{}, nil
}

func (f *fakeDBTX) PrepareContext(_ context.Context, _ string) (*sql.Stmt, error) {
	return nil, nil
}

func (f *fakeDBTX) QueryContext(_ context.Context, _ string, _ ...any) (*sql.Rows, error) {
	return nil, nil
}

func (f *fakeDBTX) QueryRowContext(_ context.Context, _ string, _ ...any) *sql.Row {
	return nil
}

type fakeResult struct{}

func (r *fakeResult) LastInsertId() (int64, error) { return 0, nil }
func (r *fakeResult) RowsAffected() (int64, error) { return 0, nil }

func TestHealthz(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/api/healthz", nil)
	healthz(w, r)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	ct := resp.Header.Get("Content-Type")
	if ct != "text/plain; charset=utf-8" {
		t.Errorf("expected Content-Type text/plain; charset=utf-8, got %q", ct)
	}
	if body := w.Body.String(); body != "OK" {
		t.Errorf("expected body OK, got %q", body)
	}
}

func TestAzureOpenAIEndpoint(t *testing.T) {
	tests := []struct {
		name         string
		resourceName string
		want         string
	}{
		{
			name:         "resource name",
			resourceName: "caij-openai",
			want:         "https://caij-openai.openai.azure.com",
		},
		{
			name:         "endpoint URL",
			resourceName: "https://caij-openai.openai.azure.com/",
			want:         "https://caij-openai.openai.azure.com",
		},
		{
			name:         "empty",
			resourceName: "",
			want:         "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := azureOpenAIEndpoint(tt.resourceName); got != tt.want {
				t.Errorf("expected endpoint %q, got %q", tt.want, got)
			}
		})
	}
}

func TestRespondWithJSON(t *testing.T) {
	w := httptest.NewRecorder()
	payload := map[string]string{"message": "hello"}
	respondWithJSON(w, http.StatusCreated, payload)

	resp := w.Result()
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status 201, got %d", resp.StatusCode)
	}
	ct := resp.Header.Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode JSON body: %v", err)
	}
	if body["message"] != "hello" {
		t.Errorf("expected body.message 'hello', got %q", body["message"])
	}
}

func TestRespondWithError(t *testing.T) {
	w := httptest.NewRecorder()
	respondWithError(w, http.StatusBadRequest, "invalid request")

	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
	ct := resp.Header.Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode JSON body: %v", err)
	}
	if body["error"] != "invalid request" {
		t.Errorf("expected body.error 'invalid request', got %q", body["error"])
	}
}

func TestMiddlewareLog(t *testing.T) {
	var nextCalled bool
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusTeapot)
	})

	handler := middlewareLog(next)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	handler.ServeHTTP(w, r)

	if !nextCalled {
		t.Error("expected next handler to be called by middlewareLog")
	}
	if w.Code != http.StatusTeapot {
		t.Errorf("expected status 418 from next handler, got %d", w.Code)
	}
}

func TestResetForbidden(t *testing.T) {
	cfg := &apiConfig{
		db:       database.New(&fakeDBTX{}),
		platform: "production",
	}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/admin/reset", nil)
	cfg.reset(w, r)

	resp := w.Result()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", resp.StatusCode)
	}
	if body := w.Body.String(); body != "Forbidden" {
		t.Errorf("expected body 'Forbidden', got %q", body)
	}
}

func TestResetDev(t *testing.T) {
	fake := &fakeDBTX{}
	cfg := &apiConfig{
		db:       database.New(fake),
		platform: "dev",
	}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/admin/reset", nil)
	cfg.reset(w, r)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	if len(fake.execCalls) != 1 {
		t.Fatalf("expected 1 ExecContext call on fake DBTX, got %d", len(fake.execCalls))
	}
	if !strings.Contains(fake.execCalls[0], "DELETE FROM users") {
		t.Errorf("expected ExecContext call containing 'DELETE FROM users', got %q", fake.execCalls[0])
	}
}
