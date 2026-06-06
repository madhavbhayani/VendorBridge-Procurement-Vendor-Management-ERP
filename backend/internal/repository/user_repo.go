package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
)

type UserRepository interface {
	CreateVendorUser(ctx context.Context, tx *sql.Tx, email, fullName string) (int64, error)
	SetPassword(ctx context.Context, userID int64, hashedPassword string) error
	SetPendingVendorPassword(ctx context.Context, userID int64, hashedPassword string) (bool, error)

	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByID(ctx context.Context, id int64) (*models.User, error)
	UpdateLastLogin(ctx context.Context, userID int64) error
}

type userRepo struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `SELECT id, email, password_hash, full_name, phone, role, status, last_login_at, created_at, updated_at
              FROM users WHERE email = $1`
	row := r.db.QueryRowContext(ctx, query, email)

	var user models.User
	err := row.Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName,
		&user.Phone, &user.Role, &user.Status, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) GetByID(ctx context.Context, id int64) (*models.User, error) {
	query := `SELECT id, email, password_hash, full_name, phone, role, status, last_login_at, created_at, updated_at
              FROM users WHERE id = $1`
	row := r.db.QueryRowContext(ctx, query, id)

	var user models.User
	err := row.Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.FullName,
		&user.Phone, &user.Role, &user.Status, &user.LastLoginAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) UpdateLastLogin(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET last_login_at = NOW() WHERE id = $1", userID)
	return err
}

func (r *userRepo) CreateVendorUser(ctx context.Context, tx *sql.Tx, email, fullName string) (int64, error) {
	query := `
		INSERT INTO users (email, password_hash, full_name, role, status)
		VALUES ($1, 'NA', $2, 'vendor', 'active')
		RETURNING id
	`
	var id int64
	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query, email, fullName).Scan(&id)
	} else {
		err = r.db.QueryRowContext(ctx, query, email, fullName).Scan(&id)
	}
	return id, err
}

func (r *userRepo) SetPassword(ctx context.Context, userID int64, hashedPassword string) error {
	query := "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2"
	_, err := r.db.ExecContext(ctx, query, hashedPassword, userID)
	return err
}

func (r *userRepo) SetPendingVendorPassword(ctx context.Context, userID int64, hashedPassword string) (bool, error) {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = NOW()
		WHERE id = $2
		  AND role = 'vendor'
		  AND password_hash = 'NA'
	`
	result, err := r.db.ExecContext(ctx, query, hashedPassword, userID)
	if err != nil {
		return false, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}
