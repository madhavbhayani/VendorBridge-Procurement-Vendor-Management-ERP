package service

import (
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/utils"
)

type TokenService struct {
	jwt *utils.JWTService
}

func NewTokenService(secret []byte) *TokenService {
	return &TokenService{
		jwt: utils.NewJWTService(secret),
	}
}

func (s *TokenService) GenerateAccessToken(userID int64, email string, role string) (string, error) {
	return s.jwt.GenerateAccessToken(userID, email, role)
}

func (s *TokenService) ValidateAccessToken(token string) (*utils.JWTClaims, error) {
	return s.jwt.ValidateAccessToken(token)
}

func (s *TokenService) GenerateRefreshToken() string {
	return utils.GenerateRandomToken()
}
