package service

import (
    "context"
    "errors"
    "time"

    "github.com/google/uuid"
    "github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
    "github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
    "github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/utils"
)

var (
    ErrInvalidCredentials    = errors.New("invalid email or password")
    ErrUserInactive          = errors.New("user account is not active")
    ErrInvalidCode           = errors.New("invalid or expired login code")
    ErrCodeAlreadyUsed       = errors.New("login code already used")
    ErrInvalidRefreshToken   = errors.New("invalid or expired refresh token")
    ErrTokenRevoked          = errors.New("refresh token has been revoked")
)

type AuthService struct {
    userRepo    repository.UserRepository
    codeRepo    repository.LoginCodeRepository
    sessionRepo repository.SessionRepository
    tokenSvc    *TokenService
}

func NewAuthService(
    userRepo repository.UserRepository,
    codeRepo repository.LoginCodeRepository,
    sessionRepo repository.SessionRepository,
    tokenSvc *TokenService,
) *AuthService {
    return &AuthService{
        userRepo:    userRepo,
        codeRepo:    codeRepo,
        sessionRepo: sessionRepo,
        tokenSvc:    tokenSvc,
    }
}

// Login validates credentials and returns a one-time login code.
func (s *AuthService) Login(ctx context.Context, email, password string) (string, error) {
    user, err := s.userRepo.GetByEmail(ctx, email)
    if err != nil {
        return "", err
    }
    if user == nil {
        return "", ErrInvalidCredentials
    }
    if user.Status != "active" {
        return "", ErrUserInactive
    }
    if !utils.CheckPasswordHash(password, user.PasswordHash) {
        return "", ErrInvalidCredentials
    }

    // Generate UUID v4 code
    code := uuid.New().String()
    loginCode := &models.LoginCode{
        Code:      code,
        UserID:    user.ID,
        ExpiresAt: time.Now().Add(5 * time.Minute),
    }
    if err := s.codeRepo.Create(ctx, loginCode); err != nil {
        return "", err
    }
    // Update last login (optional)
    _ = s.userRepo.UpdateLastLogin(ctx, user.ID)
    return code, nil
}

// AssignToken exchanges a login code for access + refresh tokens.
func (s *AuthService) AssignToken(ctx context.Context, code string) (accessToken, refreshToken string, err error) {
    loginCode, err := s.codeRepo.GetValidCode(ctx, code)
    if err != nil {
        return "", "", err
    }
    if loginCode == nil {
        return "", "", ErrInvalidCode
    }
    if loginCode.UsedAt != nil {
        return "", "", ErrCodeAlreadyUsed
    }

    // Mark code as used atomically
    if err := s.codeRepo.MarkUsed(ctx, loginCode.ID); err != nil {
        return "", "", err
    }

    user, err := s.userRepo.GetByID(ctx, loginCode.UserID)
    if err != nil || user == nil {
        return "", "", ErrInvalidCode
    }

    // Generate tokens
    accessToken, err = s.tokenSvc.GenerateAccessToken(user.ID, user.Email, user.Role)
    if err != nil {
        return "", "", err
    }
    refreshToken = s.tokenSvc.GenerateRefreshToken()

    // Store refresh token (valid for 7 days)
    session := &models.UserSession{
        UserID:       user.ID,
        RefreshToken: refreshToken,
        ExpiresAt:    time.Now().Add(7 * 24 * time.Hour),
    }
    if err := s.sessionRepo.Create(ctx, session); err != nil {
        return "", "", err
    }

    return accessToken, refreshToken, nil
}

// RefreshToken returns a new access token using a valid refresh token.
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (string, error) {
    session, err := s.sessionRepo.GetValidRefreshToken(ctx, refreshToken)
    if err != nil {
        return "", err
    }
    if session == nil {
        return "", ErrInvalidRefreshToken
    }
    if session.RevokedAt != nil {
        return "", ErrTokenRevoked
    }

    user, err := s.userRepo.GetByID(ctx, session.UserID)
    if err != nil || user == nil {
        return "", ErrInvalidRefreshToken
    }
    if user.Status != "active" {
        return "", ErrUserInactive
    }

    // Issue new access token
    newAccessToken, err := s.tokenSvc.GenerateAccessToken(user.ID, user.Email, user.Role)
    if err != nil {
        return "", err
    }
    // Optionally rotate refresh token here (not implemented for brevity)
    return newAccessToken, nil
}

// CreateVendorUser creates a vendor user with pending password.
func (s *AuthService) CreateVendorUser(ctx context.Context, email, companyName string) (int64, error) {
    return s.userRepo.CreateVendorUser(ctx, nil, email, companyName)
}