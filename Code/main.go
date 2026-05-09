package main

import (
	"database/sql"
	"net/http"
	"fmt"
	"os"

	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

type apiConfig struct {
	db *database.Queries
	jwtSecret string
	platform string
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
		db: database.New(db),
		jwtSecret: os.Getenv("JWT_SECRET"),
		platform: os.Getenv("PLATFORM"),
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
	mux.HandleFunc("POST /api/refresh", cfg.refresh)
	mux.HandleFunc("POST /api/revoke", cfg.revoke)
	mux.HandleFunc("POST /admin/reset", cfg.reset)
	server := &http.Server{
		Addr:    ":8080",
		Handler: middlewareLog(mux),
	}
	server.ListenAndServe()
}
