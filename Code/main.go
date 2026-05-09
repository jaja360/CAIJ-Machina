package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"

	"github.com/jaja360/CAIJ-Machina/internal/database"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/openai/openai-go/v3"
)

type apiConfig struct {
	db           *database.Queries
	openaiClient openai.Client
	jwtSecret    string
	platform     string
}

func healthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func main() {
	godotenv.Load()
	db, err := sql.Open("postgres", os.Getenv("DB_URL"))
	if err != nil {
		fmt.Printf("Error connecting to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	cfg := &apiConfig{
		db:           database.New(db),
		openaiClient: newOpenAIClient(),
		jwtSecret:    os.Getenv("JWT_SECRET"),
		platform:     os.Getenv("PLATFORM"),
	}
	mux := http.NewServeMux()
	mux.Handle("/app/", http.StripPrefix("/app", http.FileServer(http.Dir("."))))
	mux.HandleFunc("GET /api/healthz", healthz)
	// mux.HandleFunc("GET /api/chirps", cfg.getChirps)
	// mux.HandleFunc("GET /api/chirps/{chirpID}", cfg.getChirpsId)
	// mux.HandleFunc("DELETE /api/chirps/{chirpID}", cfg.deleteChirpsId)
	// mux.HandleFunc("POST /api/chirps", cfg.postChirps)
	mux.HandleFunc("POST /api/login", cfg.login)
	mux.HandleFunc("POST /api/users", cfg.postUsers)
	mux.HandleFunc("PUT /api/users", cfg.putUsers)
	mux.HandleFunc("GET /api/me", cfg.getMe)
	mux.HandleFunc("GET /api/clients", cfg.getClients)
	mux.HandleFunc("PUT /api/clients", cfg.addClients)
	mux.HandleFunc("GET /api/kpi", cfg.getKpi)
	mux.HandleFunc("GET /api/documents", cfg.getDocuments)
	mux.HandleFunc("POST /api/documents", cfg.addDocuments)
	mux.HandleFunc("PUT /api/laws", cfg.addLaws)
	mux.HandleFunc("GET /api/laws", cfg.getLaws)
	mux.HandleFunc("GET /api/laws/changes/{lawA}/{lawB}", cfg.getLawChanges)
	mux.HandleFunc("GET /api/alerts", cfg.getAlerts)
	mux.HandleFunc("GET /api/keywords", cfg.getKeywords)
	mux.HandleFunc("POST /api/keywords", cfg.replaceKeywords)
	mux.HandleFunc("POST /api/refresh", cfg.refresh)
	mux.HandleFunc("POST /api/revoke", cfg.revoke)
	mux.HandleFunc("POST /admin/reset", cfg.reset)
	server := &http.Server{
		Addr:    ":8080",
		Handler: middlewareLog(mux),
	}
	fmt.Println("Server is running on port 8080")
	server.ListenAndServe()
}
