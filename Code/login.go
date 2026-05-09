package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jaja360/CAIJ-Machina/internal/auth"
	"github.com/jaja360/CAIJ-Machina/internal/database"
)

func (c *apiConfig) login(w http.ResponseWriter, r *http.Request) {
	type input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	decoder := json.NewDecoder(r.Body)
	p := input{}
	if err := decoder.Decode(&p); err != nil || p.Email == "" {
		respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	user, err := c.db.GetUserByEmail(r.Context(), p.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusUnauthorized, "Incorrect email or password")
		} else {
			respondWithError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	if passwordOK, err := auth.CheckPasswordHash(p.Password, user.HashedPassword); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error checking password")
	} else if !passwordOK {
		respondWithError(w, http.StatusUnauthorized, "Incorrect email or password")
	} else {
		type loginResponse struct {
			database.User
			Token        string `json:"token"`
			RefreshToken string `json:"refresh_token"`
		}
		jwt, err := auth.MakeJWT(user.ID, c.jwtSecret, time.Hour)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error generating token")
			return
		}
		refresh := auth.MakeRefreshToken()
		err = c.db.InsertRefreshToken(r.Context(), database.InsertRefreshTokenParams{
			UserID:    user.ID,
			Token:     refresh,
			ExpiresAt: time.Now().Add(60 * 24 * time.Hour),
		})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Error generating refresh token")
			return
		}
		respondWithJSON(w, http.StatusOK, loginResponse{User: user, Token: jwt, RefreshToken: refresh})
	}
}

func (c *apiConfig) refresh(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := auth.GetBearerToken(r.Header)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid refresh token")
		return
	}
	user, err := c.db.GetUserFromRefreshToken(r.Context(), refreshToken)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	}
	jwt, err := auth.MakeJWT(user.UserID, c.jwtSecret, time.Hour)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]string{"token": jwt})
}

func (c *apiConfig) revoke(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := auth.GetBearerToken(r.Header)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Missing or invalid refresh token")
		return
	}
	if c.db.RevokeRefreshToken(r.Context(), refreshToken) != nil {
		respondWithError(w, http.StatusInternalServerError, "Error revoking refresh token")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
