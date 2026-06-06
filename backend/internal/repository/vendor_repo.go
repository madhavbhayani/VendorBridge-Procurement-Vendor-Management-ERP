package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
)

type VendorRepository interface {
	Create(ctx context.Context, vendor *models.Vendor) (int64, error)
	AddCategory(ctx context.Context, vendorID, categoryID int64) error
	AddAddress(ctx context.Context, addr *models.VendorAddress) error
	AddBankDetail(ctx context.Context, bank *models.VendorBankDetail) error
	Search(ctx context.Context, search string, categoryID *int64, status *string, limit, offset int) ([]models.Vendor, int, error)
	List(ctx context.Context, limit, offset int) ([]models.Vendor, int, error)
	GetByUserID(ctx context.Context, userID int64) (*models.Vendor, error)
	GetByID(ctx context.Context, id int64) (*models.Vendor, error)
	GetCategoriesByVendor(ctx context.Context, vendorID int64) ([]models.VendorCategory, error)
	GetAddressesByVendor(ctx context.Context, vendorID int64) ([]models.VendorAddress, error)
	GetBankDetailsByVendor(ctx context.Context, vendorID int64) ([]models.VendorBankDetail, error)
	Update(ctx context.Context, vendor *models.Vendor) error
	DeleteCategories(ctx context.Context, vendorID int64) error
	DeleteAddresses(ctx context.Context, vendorID int64) error
	DeleteBankDetails(ctx context.Context, vendorID int64) error
	GetAllCategories(ctx context.Context) ([]models.VendorCategory, error)
	Delete(ctx context.Context, id int64) error
}

type vendorRepo struct {
	db *sql.DB
}

func NewVendorRepository(db *sql.DB) VendorRepository {
	return &vendorRepo{db: db}
}

// Create vendor, returns new ID
func (r *vendorRepo) Create(ctx context.Context, vendor *models.Vendor) (int64, error) {
	query := `
        INSERT INTO vendors (company_name, trade_name, gst_number, pan_number, email, phone,
                             alternate_phone, website, status, notes, user_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
    `
	var id int64
	err := r.db.QueryRowContext(ctx, query,
		vendor.CompanyName, vendor.TradeName, vendor.GSTNumber, vendor.PANNumber,
		vendor.Email, vendor.Phone, vendor.AlternatePhone, vendor.Website,
		vendor.Status, vendor.Notes, vendor.UserID, vendor.CreatedBy,
	).Scan(&id)
	return id, err
}

func (r *vendorRepo) AddCategory(ctx context.Context, vendorID, categoryID int64) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO vendor_category_map (vendor_id, category_id) VALUES ($1, $2)", vendorID, categoryID)
	return err
}

func (r *vendorRepo) AddAddress(ctx context.Context, addr *models.VendorAddress) error {
	query := `
        INSERT INTO vendor_addresses (vendor_id, address_type, address_line1, address_line2,
                                      city, state_id, pincode, country_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `
	return r.db.QueryRowContext(ctx, query,
		addr.VendorID, addr.AddressType, addr.AddressLine1, addr.AddressLine2,
		addr.City, addr.StateID, addr.Pincode, addr.CountryID,
	).Scan(&addr.ID)
}

func (r *vendorRepo) AddBankDetail(ctx context.Context, bank *models.VendorBankDetail) error {
	query := `
        INSERT INTO vendor_bank_details (vendor_id, account_holder_name, account_number, bank_name,
                                         branch_name, ifsc_code, swift_code, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
    `
	return r.db.QueryRowContext(ctx, query,
		bank.VendorID, bank.AccountHolderName, bank.AccountNumber, bank.BankName,
		bank.BranchName, bank.IFSCode, bank.SwiftCode, bank.IsPrimary,
	).Scan(&bank.ID)
}

func (r *vendorRepo) Search(ctx context.Context, search string, categoryID *int64, status *string, limit, offset int) ([]models.Vendor, int, error) {
	// Build dynamic query
	conditions := []string{}
	args := []interface{}{}
	argPos := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(v.company_name ILIKE $%d OR v.trade_name ILIKE $%d OR v.gst_number ILIKE $%d OR v.phone ILIKE $%d)", argPos, argPos, argPos, argPos))
		args = append(args, "%"+search+"%")
		argPos++
	}
	if categoryID != nil {
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM vendor_category_map vcm WHERE vcm.vendor_id = v.id AND vcm.category_id = $%d)", argPos))
		args = append(args, *categoryID)
		argPos++
	}
	if status != nil {
		conditions = append(conditions, fmt.Sprintf("v.status = $%d", argPos))
		args = append(args, *status)
		argPos++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vendors v %s", whereClause)
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Fetch vendors
	query := fmt.Sprintf(`
        SELECT v.id, v.company_name, v.trade_name, v.gst_number, v.pan_number, v.email,
               v.phone, v.alternate_phone, v.website, v.status, v.rating, v.notes,
               v.created_by, v.created_at, v.updated_at
        FROM vendors v
        %s
        ORDER BY v.id DESC
        LIMIT $%d OFFSET $%d
    `, whereClause, argPos, argPos+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var vendors []models.Vendor
	for rows.Next() {
		var v models.Vendor
		err := rows.Scan(
			&v.ID, &v.CompanyName, &v.TradeName, &v.GSTNumber, &v.PANNumber,
			&v.Email, &v.Phone, &v.AlternatePhone, &v.Website, &v.Status,
			&v.Rating, &v.Notes, &v.CreatedBy, &v.CreatedAt, &v.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		vendors = append(vendors, v)
	}
	return vendors, total, nil
}

func (r *vendorRepo) List(ctx context.Context, limit, offset int) ([]models.Vendor, int, error) {
	return r.Search(ctx, "", nil, nil, limit, offset)
}

func (r *vendorRepo) GetByID(ctx context.Context, id int64) (*models.Vendor, error) {
	query := `
        SELECT id, company_name, trade_name, gst_number, pan_number, email, phone,
               alternate_phone, website, status, rating, notes, created_by, created_at, updated_at
        FROM vendors WHERE id = $1
    `
	var v models.Vendor
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&v.ID, &v.CompanyName, &v.TradeName, &v.GSTNumber, &v.PANNumber,
		&v.Email, &v.Phone, &v.AlternatePhone, &v.Website, &v.Status,
		&v.Rating, &v.Notes, &v.CreatedBy, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *vendorRepo) GetCategoriesByVendor(ctx context.Context, vendorID int64) ([]models.VendorCategory, error) {
	query := `
        SELECT vc.id, vc.name, vc.description
        FROM vendor_categories vc
        JOIN vendor_category_map vcm ON vcm.category_id = vc.id
        WHERE vcm.vendor_id = $1
    `
	rows, err := r.db.QueryContext(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var categories []models.VendorCategory
	for rows.Next() {
		var c models.VendorCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Description); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func (r *vendorRepo) GetAddressesByVendor(ctx context.Context, vendorID int64) ([]models.VendorAddress, error) {
	query := `
        SELECT va.id, va.vendor_id, va.address_type, va.address_line1, va.address_line2,
               va.city, va.state_id, s.name as state_name, va.pincode, va.country_id, c.name as country_name
        FROM vendor_addresses va
        LEFT JOIN states s ON s.id = va.state_id
        LEFT JOIN countries c ON c.id = va.country_id
        WHERE va.vendor_id = $1
    `
	rows, err := r.db.QueryContext(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var addresses []models.VendorAddress
	for rows.Next() {
		var a models.VendorAddress
		err := rows.Scan(
			&a.ID, &a.VendorID, &a.AddressType, &a.AddressLine1, &a.AddressLine2,
			&a.City, &a.StateID, &a.StateName, &a.Pincode, &a.CountryID, &a.CountryName,
		)
		if err != nil {
			return nil, err
		}
		addresses = append(addresses, a)
	}
	return addresses, nil
}

func (r *vendorRepo) GetBankDetailsByVendor(ctx context.Context, vendorID int64) ([]models.VendorBankDetail, error) {
	query := `
        SELECT id, vendor_id, account_holder_name, account_number, bank_name,
               branch_name, ifsc_code, swift_code, is_primary
        FROM vendor_bank_details WHERE vendor_id = $1
    `
	rows, err := r.db.QueryContext(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var banks []models.VendorBankDetail
	for rows.Next() {
		var b models.VendorBankDetail
		err := rows.Scan(
			&b.ID, &b.VendorID, &b.AccountHolderName, &b.AccountNumber, &b.BankName,
			&b.BranchName, &b.IFSCode, &b.SwiftCode, &b.IsPrimary,
		)
		if err != nil {
			return nil, err
		}
		banks = append(banks, b)
	}
	return banks, nil
}

func (r *vendorRepo) Update(ctx context.Context, vendor *models.Vendor) error {
	query := `
        UPDATE vendors SET
            company_name = COALESCE($2, company_name),
            trade_name = COALESCE($3, trade_name),
            gst_number = COALESCE($4, gst_number),
            pan_number = COALESCE($5, pan_number),
            email = COALESCE($6, email),
            phone = COALESCE($7, phone),
            alternate_phone = COALESCE($8, alternate_phone),
            website = COALESCE($9, website),
            status = COALESCE($10, status),
            rating = COALESCE($11, rating),
            notes = COALESCE($12, notes),
            updated_at = NOW()
        WHERE id = $1
    `
	_, err := r.db.ExecContext(ctx, query,
		vendor.ID, vendor.CompanyName, vendor.TradeName, vendor.GSTNumber,
		vendor.PANNumber, vendor.Email, vendor.Phone, vendor.AlternatePhone,
		vendor.Website, vendor.Status, vendor.Rating, vendor.Notes,
	)
	return err
}

func (r *vendorRepo) DeleteCategories(ctx context.Context, vendorID int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM vendor_category_map WHERE vendor_id = $1", vendorID)
	return err
}

func (r *vendorRepo) DeleteAddresses(ctx context.Context, vendorID int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM vendor_addresses WHERE vendor_id = $1", vendorID)
	return err
}

func (r *vendorRepo) DeleteBankDetails(ctx context.Context, vendorID int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM vendor_bank_details WHERE vendor_id = $1", vendorID)
	return err
}

func (r *vendorRepo) GetAllCategories(ctx context.Context) ([]models.VendorCategory, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT id, name, description FROM vendor_categories ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var categories []models.VendorCategory
	for rows.Next() {
		var c models.VendorCategory
		if err := rows.Scan(&c.ID, &c.Name, &c.Description); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func (r *vendorRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM vendors WHERE id = $1", id)
	return err
}

func (r *vendorRepo) GetByUserID(ctx context.Context, userID int64) (*models.Vendor, error) {
	query := `
		SELECT id, user_id, company_name, trade_name, gst_number, pan_number, email, phone, alternate_phone, website,
		       status, rating, notes, created_by, created_at, updated_at
		FROM vendors
		WHERE user_id = $1
	`
	var v models.Vendor
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&v.ID, &v.UserID, &v.CompanyName, &v.TradeName, &v.GSTNumber, &v.PANNumber,
		&v.Email, &v.Phone, &v.AlternatePhone, &v.Website,
		&v.Status, &v.Rating, &v.Notes, &v.CreatedBy,
		&v.CreatedAt, &v.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}
