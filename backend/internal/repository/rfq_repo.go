package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
)

type RFQRepository interface {
	Create(ctx context.Context, rfq *models.RFQ) (int64, string, error)
	AddItem(ctx context.Context, item *models.RFQItem) error
	AddAttachment(ctx context.Context, attachment *models.RFQAttachment) error
	AddVendorInvitation(ctx context.Context, rfqID, vendorID int64) error
	Search(ctx context.Context, search string, status *string, limit, offset int) ([]models.RFQ, int, error)
	GetVendorInvitations(ctx context.Context, vendorID int64) ([]models.RFQ, error)
	GetByID(ctx context.Context, id int64) (*models.RFQ, error)
	GetItemsByRFQ(ctx context.Context, rfqID int64) ([]models.RFQItem, error)
	GetAttachmentsByRFQ(ctx context.Context, rfqID int64) ([]models.RFQAttachment, error)
	GetInvitationsByRFQ(ctx context.Context, rfqID int64) ([]models.RFQVendorInvitation, error)
	Update(ctx context.Context, rfq *models.RFQ) error
	DeleteItems(ctx context.Context, rfqID int64) error
	DeleteInvitations(ctx context.Context, rfqID int64) error
	Delete(ctx context.Context, id int64) error
}

type rfqRepo struct {
	db *sql.DB
}

func NewRFQRepository(db *sql.DB) RFQRepository {
	return &rfqRepo{db: db}
}

func (r *rfqRepo) Create(ctx context.Context, rfq *models.RFQ) (int64, string, error) {
	query := `
		INSERT INTO rfqs (title, description, status, submission_deadline, delivery_deadline, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, rfq_number
	`
	var id int64
	var rfqNumber string
	err := r.db.QueryRowContext(ctx, query,
		rfq.Title, rfq.Description, rfq.Status, rfq.SubmissionDeadline, rfq.DeliveryDeadline, rfq.CreatedBy,
	).Scan(&id, &rfqNumber)
	if err != nil {
		return 0, "", err
	}
	return id, rfqNumber, nil
}

func (r *rfqRepo) AddItem(ctx context.Context, item *models.RFQItem) error {
	query := `
		INSERT INTO rfq_items (rfq_id, product_category_id, item_name, description, quantity, unit_id, estimated_unit_price, specifications, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`
	return r.db.QueryRowContext(ctx, query,
		item.RFQID, item.ProductCategoryID, item.ItemName, item.Description,
		item.Quantity, item.UnitID, item.EstimatedUnitPrice, item.Specifications, item.SortOrder,
	).Scan(&item.ID)
}

func (r *rfqRepo) AddAttachment(ctx context.Context, att *models.RFQAttachment) error {
	query := `
		INSERT INTO rfq_attachments (rfq_id, file_name, file_url, file_size_bytes, uploaded_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, uploaded_at
	`
	return r.db.QueryRowContext(ctx, query,
		att.RFQID, att.FileName, att.FileURL, att.FileSizeBytes, att.UploadedBy,
	).Scan(&att.ID, &att.UploadedAt)
}

func (r *rfqRepo) AddVendorInvitation(ctx context.Context, rfqID, vendorID int64) error {
	query := `
		INSERT INTO rfq_vendor_invitations (rfq_id, vendor_id)
		VALUES ($1, $2)
	`
	_, err := r.db.ExecContext(ctx, query, rfqID, vendorID)
	return err
}

func (r *rfqRepo) Search(ctx context.Context, search string, status *string, limit, offset int) ([]models.RFQ, int, error) {
	conditions := []string{}
	args := []interface{}{}
	argPos := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR rfq_number ILIKE $%d)", argPos, argPos))
		args = append(args, "%"+search+"%")
		argPos++
	}
	if status != nil && *status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, *status)
		argPos++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM rfqs %s", whereClause)
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, rfq_number, title, description, status, submission_deadline, delivery_deadline, created_by, closed_at, created_at, updated_at
		FROM rfqs
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argPos, argPos+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	rfqs := []models.RFQ{}
	for rows.Next() {
		var rfq models.RFQ
		err := rows.Scan(
			&rfq.ID, &rfq.RFQNumber, &rfq.Title, &rfq.Description, &rfq.Status,
			&rfq.SubmissionDeadline, &rfq.DeliveryDeadline, &rfq.CreatedBy,
			&rfq.ClosedAt, &rfq.CreatedAt, &rfq.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		rfqs = append(rfqs, rfq)
	}
	return rfqs, total, nil
}
func (r *rfqRepo) GetByID(ctx context.Context, id int64) (*models.RFQ, error) {
	query := `
		SELECT id, rfq_number, title, description, status, submission_deadline, delivery_deadline, created_by, closed_at, created_at, updated_at
		FROM rfqs
		WHERE id = $1
	`
	var rfq models.RFQ
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rfq.ID, &rfq.RFQNumber, &rfq.Title, &rfq.Description, &rfq.Status,
		&rfq.SubmissionDeadline, &rfq.DeliveryDeadline, &rfq.CreatedBy,
		&rfq.ClosedAt, &rfq.CreatedAt, &rfq.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("rfq not found")
		}
		return nil, err
	}
	return &rfq, nil
}

func (r *rfqRepo) GetItemsByRFQ(ctx context.Context, rfqID int64) ([]models.RFQItem, error) {
	query := `
		SELECT id, rfq_id, product_category_id, item_name, description, quantity, unit_id, estimated_unit_price, specifications, sort_order
		FROM rfq_items
		WHERE rfq_id = $1
		ORDER BY sort_order ASC, id ASC
	`
	rows, err := r.db.QueryContext(ctx, query, rfqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.RFQItem{}
	for rows.Next() {
		var item models.RFQItem
		err := rows.Scan(
			&item.ID, &item.RFQID, &item.ProductCategoryID, &item.ItemName, &item.Description,
			&item.Quantity, &item.UnitID, &item.EstimatedUnitPrice, &item.Specifications, &item.SortOrder,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *rfqRepo) GetAttachmentsByRFQ(ctx context.Context, rfqID int64) ([]models.RFQAttachment, error) {
	query := `
		SELECT id, rfq_id, file_name, file_url, file_size_bytes, uploaded_by, uploaded_at
		FROM rfq_attachments
		WHERE rfq_id = $1
		ORDER BY uploaded_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, rfqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attachments := []models.RFQAttachment{}
	for rows.Next() {
		var att models.RFQAttachment
		err := rows.Scan(
			&att.ID, &att.RFQID, &att.FileName, &att.FileURL, &att.FileSizeBytes, &att.UploadedBy, &att.UploadedAt,
		)
		if err != nil {
			return nil, err
		}
		attachments = append(attachments, att)
	}
	return attachments, nil
}

func (r *rfqRepo) GetInvitationsByRFQ(ctx context.Context, rfqID int64) ([]models.RFQVendorInvitation, error) {
	query := `
		SELECT rfq_id, vendor_id, invited_at, notified_at
		FROM rfq_vendor_invitations
		WHERE rfq_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, rfqID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invitations := []models.RFQVendorInvitation{}
	for rows.Next() {
		var inv models.RFQVendorInvitation
		err := rows.Scan(
			&inv.RFQID, &inv.VendorID, &inv.InvitedAt, &inv.NotifiedAt,
		)
		if err != nil {
			return nil, err
		}
		invitations = append(invitations, inv)
	}
	return invitations, nil
}

func (r *rfqRepo) Update(ctx context.Context, rfq *models.RFQ) error {
	query := `
		UPDATE rfqs
		SET title = $1, description = $2, status = $3, submission_deadline = $4, delivery_deadline = $5, updated_at = NOW()
		WHERE id = $6
	`
	_, err := r.db.ExecContext(ctx, query,
		rfq.Title, rfq.Description, rfq.Status, rfq.SubmissionDeadline, rfq.DeliveryDeadline, rfq.ID,
	)
	return err
}

func (r *rfqRepo) DeleteItems(ctx context.Context, rfqID int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM rfq_items WHERE rfq_id = $1", rfqID)
	return err
}

func (r *rfqRepo) DeleteInvitations(ctx context.Context, rfqID int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM rfq_vendor_invitations WHERE rfq_id = $1", rfqID)
	return err
}

func (r *rfqRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM rfqs WHERE id = $1", id)
	return err
}

func (r *rfqRepo) GetVendorInvitations(ctx context.Context, vendorID int64) ([]models.RFQ, error) {
	query := `
		SELECT r.id, r.rfq_number, r.title, r.description, r.status, r.submission_deadline, r.delivery_deadline, r.created_by, r.closed_at, r.created_at
		FROM rfqs r
		JOIN rfq_vendor_invitations i ON r.id = i.rfq_id
		WHERE i.vendor_id = $1
		ORDER BY r.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rfqs := []models.RFQ{}
	for rows.Next() {
		var rfq models.RFQ
		if err := rows.Scan(
			&rfq.ID,
			&rfq.RFQNumber,
			&rfq.Title,
			&rfq.Description,
			&rfq.Status,
			&rfq.SubmissionDeadline,
			&rfq.DeliveryDeadline,
			&rfq.CreatedBy,
			&rfq.ClosedAt,
			&rfq.CreatedAt,
		); err != nil {
			return nil, err
		}
		rfqs = append(rfqs, rfq)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return rfqs, nil
}
