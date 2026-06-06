package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
)

type SessionRepository interface {
	Create(ctx context.Context, session *models.UserSession) error
	GetValidRefreshToken(ctx context.Context, token string) (*models.UserSession, error)
	Revoke(ctx context.Context, token string) error
}

type sessionRepo struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) SessionRepository {
	return &sessionRepo{db: db}
}

func (r *sessionRepo) Create(ctx context.Context, session *models.UserSession) error {
	query := `INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
              VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`
	return r.db.QueryRowContext(ctx, query,
		session.UserID, session.RefreshToken, session.ExpiresAt,
		session.IPAddress, session.UserAgent,
	).Scan(&session.ID, &session.CreatedAt)
}

func (r *sessionRepo) GetValidRefreshToken(ctx context.Context, token string) (*models.UserSession, error) {
	query := `SELECT id, user_id, refresh_token, expires_at, revoked_at, created_at
              FROM user_sessions WHERE refresh_token = $1 AND expires_at > NOW()`
	row := r.db.QueryRowContext(ctx, query, token)

	var s models.UserSession
	err := row.Scan(&s.ID, &s.UserID, &s.RefreshToken, &s.ExpiresAt, &s.RevokedAt, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *sessionRepo) Revoke(ctx context.Context, token string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE user_sessions SET revoked_at = NOW() WHERE refresh_token = $1", token)
	return err
}
