package utils

import (
    "errors"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
    UserID int64  `json:"sub"`
    Email  string `json:"email"`
    jwt.RegisteredClaims
}

type JWTService struct {
    secret []byte
}

func NewJWTService(secret []byte) *JWTService {
    return &JWTService{secret: secret}
}

func (j *JWTService) GenerateAccessToken(userID int64, email string) (string, error) {
    claims := JWTClaims{
        UserID: userID,
        Email:  email,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(20 * time.Minute)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(j.secret)
}

func (j *JWTService) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
        return j.secret, nil
    })
    if err != nil {
        return nil, err
    }
    if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
        return claims, nil
    }
    return nil, errors.New("invalid token")
}