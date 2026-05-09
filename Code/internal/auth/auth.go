package auth

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/alexedwards/argon2id"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func HashPassword(password string) (string, error) {
	return argon2id.CreateHash(password, argon2id.DefaultParams)
}

func CheckPasswordHash(password, hash string) (bool, error) {
	return argon2id.ComparePasswordAndHash(password, hash)
}

func getAuthToken(headers http.Header, prefix string) (string, error) {
	authHeader := headers.Get("Authorization")
	fullPrefix := prefix + " "
	if len(authHeader) <= len(fullPrefix) || authHeader[:len(fullPrefix)] != fullPrefix {
		return "", http.ErrNoCookie
	}
	return authHeader[len(fullPrefix):], nil
}

func GetAPIKey(headers http.Header) (string, error) {
	return getAuthToken(headers, "ApiKey")
}

func GetBearerToken(headers http.Header) (string, error) {
	return getAuthToken(headers, "Bearer")
}

func MakeRefreshToken() string {
	b := make([]byte, 32)
	n, _ := rand.Read(b)
	if n != len(b) {
		panic("failed to generate refresh token")
	}
	return hex.EncodeToString(b)
}

func MakeJWT(userID uuid.UUID, tokenSecret string, expiresIn time.Duration) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Issuer:    "CAIJ-Machina-access",
		IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
		ExpiresAt: jwt.NewNumericDate(time.Now().UTC().Add(expiresIn)),
		Subject:   userID.String(),
	})
	return token.SignedString([]byte(tokenSecret))
}

func ValidateJWT(tokenString, tokenSecret string) (uuid.UUID, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(*jwt.Token) (any, error) {
		return []byte(tokenSecret), nil
	})
	if err != nil {
		return uuid.UUID{}, err
	}
	subject, err := token.Claims.GetSubject()
	if err != nil {
		return uuid.UUID{}, err
	}
	return uuid.Parse(subject)
}
