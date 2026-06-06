package repository

import (
	"context"
	"database/sql"
	"fmt"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
)

type QuotationRepository struct {
	db *sql.DB
}

func NewQuotationRepository(db *sql.DB) *QuotationRepository {
	return &QuotationRepository{db: db}
}

func (r *QuotationRepository) CreateQuotation(ctx context.Context, q *models.Quotation, items []models.QuotationItem, attachments []models.QuotationAttachment) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert Quotation
	query := `
		INSERT INTO quotations (quotation_number, rfq_id, vendor_id, status, delivery_days, validity_days, payment_terms, currency, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, submitted_at, updated_at
	`
	status := q.Status
	if status == "" {
		status = "submitted"
	}
	currency := q.Currency
	if currency == "" {
		currency = "INR"
	}

	err = tx.QueryRowContext(ctx, query,
		q.QuotationNumber,
		q.RFQID,
		q.VendorID,
		status,
		q.DeliveryDays,
		q.ValidityDays,
		q.PaymentTerms,
		currency,
		q.Notes,
	).Scan(&q.ID, &q.SubmittedAt, &q.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to insert quotation: %w", err)
	}

	// 2. Insert Quotation Items
	for i, item := range items {
		itemQuery := `
			INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, quantity, tax_rate_id, discount_pct, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, line_total
		`
		err = tx.QueryRowContext(ctx, itemQuery,
			q.ID,
			item.RFQItemID,
			item.UnitPrice,
			item.Quantity,
			item.TaxRateID,
			item.DiscountPct,
			item.Notes,
		).Scan(&items[i].ID, &items[i].LineTotal)
		if err != nil {
			return fmt.Errorf("failed to insert quotation item: %w", err)
		}
	}
	q.Items = items

	// 3. Insert Attachments
	for i, att := range attachments {
		attQuery := `
			INSERT INTO quotation_attachments (quotation_id, file_name, file_url, file_size_bytes)
			VALUES ($1, $2, $3, $4)
			RETURNING id, uploaded_at
		`
		err = tx.QueryRowContext(ctx, attQuery,
			q.ID,
			att.FileName,
			att.FileURL,
			att.FileSizeBytes,
		).Scan(&attachments[i].ID, &attachments[i].UploadedAt)
		if err != nil {
			return fmt.Errorf("failed to insert attachment: %w", err)
		}
	}
	q.Attachments = attachments

	// 4. Update RFQ Invitation status to submitted
	updateInvQuery := `
		UPDATE rfq_vendor_invitations 
		SET status = 'submitted'
		WHERE rfq_id = $1 AND vendor_id = $2
	`
	_, err = tx.ExecContext(ctx, updateInvQuery, q.RFQID, q.VendorID)
	if err != nil {
		return fmt.Errorf("failed to update invitation status: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (r *QuotationRepository) GetTaxRates(ctx context.Context) ([]models.TaxRate, error) {
	query := `SELECT id, name, rate, is_active, created_at FROM tax_rates WHERE is_active = true ORDER BY rate ASC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rates []models.TaxRate
	for rows.Next() {
		var t models.TaxRate
		if err := rows.Scan(&t.ID, &t.Name, &t.Rate, &t.IsActive, &t.CreatedAt); err != nil {
			return nil, err
		}
		rates = append(rates, t)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return rates, nil
}
