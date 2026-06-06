package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
)

type LoginCodeRepository interface {
	Create(ctx context.Context, code *models.LoginCode) error
	GetValidCode(ctx context.Context, code string) (*models.LoginCode, error)
	MarkUsed(ctx context.Context, id int64) error
}

type loginCodeRepo struct {
	db *sql.DB
}

func NewLoginCodeRepository(db *sql.DB) LoginCodeRepository {
	return &loginCodeRepo{db: db}
}

func (r *loginCodeRepo) Create(ctx context.Context, code *models.LoginCode) error {
	query := `INSERT INTO login_codes (code, user_id, expires_at) VALUES ($1, $2, $3) RETURNING id, created_at`
	return r.db.QueryRowContext(ctx, query, code.Code, code.UserID, code.ExpiresAt).
		Scan(&code.ID, &code.CreatedAt)
}

func (r *loginCodeRepo) GetValidCode(ctx context.Context, code string) (*models.LoginCode, error) {
	query := `SELECT id, code, user_id, expires_at, used_at, created_at
              FROM login_codes WHERE code = $1 AND expires_at > NOW()`
	row := r.db.QueryRowContext(ctx, query, code)

	var lc models.LoginCode
	err := row.Scan(&lc.ID, &lc.Code, &lc.UserID, &lc.ExpiresAt, &lc.UsedAt, &lc.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &lc, nil
}

func (r *loginCodeRepo) MarkUsed(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "UPDATE login_codes SET used_at = NOW() WHERE id = $1", id)
	return err
}
