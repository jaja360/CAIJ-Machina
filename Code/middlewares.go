package main

import (
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/jaja360/CAIJ-Machina/internal/auth"
)

func middlewareLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("%s %s\n", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func (c *apiConfig) requireUser(r *http.Request) (uuid.UUID, error) {
	token, err := auth.GetBearerToken(r.Header)
	if err != nil {
		return uuid.Nil, err
	}
	return auth.ValidateJWT(token, c.jwtSecret)
}
