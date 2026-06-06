import re

with open("internal/repository/user_repo.go", "r") as f:
    content = f.read()

# Add to interface
interface_marker = "type UserRepository interface {"
interface_addition = """
	CreateVendorUser(ctx context.Context, tx *sql.Tx, email, fullName string) (int64, error)
	SetPassword(ctx context.Context, userID int64, hashedPassword string) error
"""
content = content.replace(interface_marker, interface_marker + interface_addition)

# Add implementation
impl_addition = """
func (r *userRepo) CreateVendorUser(ctx context.Context, tx *sql.Tx, email, fullName string) (int64, error) {
	query := `
		INSERT INTO users (email, password_hash, full_name, role, status)
		VALUES ($1, 'PENDING_SETUP', $2, 'vendor', 'active')
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
"""

content += impl_addition

with open("internal/repository/user_repo.go", "w") as f:
    f.write(content)
