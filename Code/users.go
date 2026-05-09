package main

import (
	"encoding/json"
	"net/http"

	"github.com/jaja360/CAIJ-Machina/internal/auth"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

type userInput struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	JobTitle  string `json:"job_title"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (c *apiConfig) putUsers(w http.ResponseWriter, r *http.Request) {
	token, err := auth.GetBearerToken(r.Header)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid token")
		return
	}
	userID, err := auth.ValidateJWT(token, c.jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid token")
		return
	}
	decoder := json.NewDecoder(r.Body)
	p := userInput{}
	if err := decoder.Decode(&p); err != nil || p.Email == "" {
		respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	hashedPwd := ""
	if p.Password == "" {
		current, err := c.db.GetUserByID(r.Context(), userID)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error updating user")
			return
		}
		hashedPwd = current.HashedPassword
	} else {
		var err error
		hashedPwd, err = auth.HashPassword(p.Password)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error hashing password")
			return
		}
	}
	if user, err := c.db.UpdateUserInfo(r.Context(), database.UpdateUserInfoParams{
		ID:             userID,
		Email:          p.Email,
		HashedPassword: hashedPwd,
		JobTitle:       normalizeUserJobTitle(p.JobTitle),
		FirstName:      p.FirstName,
		LastName:       p.LastName,
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
	} else {
		respondWithJSON(w, http.StatusOK, user)
	}
}

func (c *apiConfig) postUsers(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	p := userInput{}
	if err := decoder.Decode(&p); err != nil || p.Email == "" {
		respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	hashedPwd, err := auth.HashPassword(p.Password)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error hashing password")
		return
	}
	if out, err := c.db.CreateUser(r.Context(), database.CreateUserParams{
		Email:          p.Email,
		HashedPassword: hashedPwd,
		JobTitle:       normalizeUserJobTitle(p.JobTitle),
		FirstName:      p.FirstName,
		LastName:       p.LastName,
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, err.Error())
	} else {
		respondWithJSON(w, http.StatusCreated, out)
	}
}

func normalizeUserJobTitle(jobTitle string) string {
	if jobTitle == "" {
		return "Unknown"
	}
	return jobTitle
}
