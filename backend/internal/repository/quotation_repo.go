package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

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
	q.Currency = currency

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
		taxRateID := item.TaxRateID
		if taxRateID == nil && len(item.TaxRateIDs) > 0 {
			firstTaxRateID := item.TaxRateIDs[0]
			taxRateID = &firstTaxRateID
		}

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
			taxRateID,
			item.DiscountPct,
			item.Notes,
		).Scan(&items[i].ID, &items[i].LineTotal)
		if err != nil {
			return fmt.Errorf("failed to insert quotation item: %w", err)
		}

		for _, taxRateID := range item.TaxRateIDs {
			if taxRateID == 0 {
				continue
			}
			taxQuery := `
				INSERT INTO quotation_item_taxes (quotation_item_id, tax_rate_id)
				VALUES ($1, $2)
				ON CONFLICT DO NOTHING
			`
			if _, err := tx.ExecContext(ctx, taxQuery, items[i].ID, taxRateID); err != nil {
				return fmt.Errorf("failed to insert quotation item tax: %w", err)
			}
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

func (r *QuotationRepository) QuotationExists(ctx context.Context, rfqID, vendorID int64) (bool, error) {
	var exists bool
	query := `SELECT EXISTS (SELECT 1 FROM quotations WHERE rfq_id = $1 AND vendor_id = $2)`
	if err := r.db.QueryRowContext(ctx, query, rfqID, vendorID).Scan(&exists); err != nil {
		return false, err
	}
	return exists, nil
}

func (r *QuotationRepository) GetVendorQuotations(ctx context.Context, vendorID int64) ([]models.Quotation, error) {
	query := `
		SELECT q.id, q.quotation_number, q.rfq_id, q.vendor_id, q.status, q.delivery_days, q.validity_days,
		       q.payment_terms, q.currency, q.notes, q.submitted_at, q.updated_at, r.rfq_number, r.title
		FROM quotations q
		JOIN rfqs r ON r.id = q.rfq_id
		WHERE q.vendor_id = $1
		ORDER BY q.submitted_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, vendorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	quotations := []models.Quotation{}
	for rows.Next() {
		var q models.Quotation
		if err := rows.Scan(
			&q.ID, &q.QuotationNumber, &q.RFQID, &q.VendorID, &q.Status,
			&q.DeliveryDays, &q.ValidityDays, &q.PaymentTerms, &q.Currency,
			&q.Notes, &q.SubmittedAt, &q.UpdatedAt, &q.RFQNumber, &q.RFQTitle,
		); err != nil {
			return nil, err
		}

		items, err := r.getQuotationItems(ctx, q.ID)
		if err != nil {
			return nil, err
		}
		q.Items = items
		quotations = append(quotations, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return quotations, nil
}

func (r *QuotationRepository) GetAllQuotations(ctx context.Context) ([]models.Quotation, error) {
	query := `
		SELECT q.id, q.quotation_number, q.rfq_id, q.vendor_id, q.status, q.delivery_days, q.validity_days,
		       q.payment_terms, q.currency, q.notes, q.submitted_at, q.updated_at, r.rfq_number, r.title,
		       v.company_name, a.id, a.status
		FROM quotations q
		JOIN rfqs r ON r.id = q.rfq_id
		JOIN vendors v ON v.id = q.vendor_id
		LEFT JOIN approvals a ON a.quotation_id = q.id AND a.status = 'pending'
		ORDER BY q.rfq_id DESC, q.submitted_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	quotations := []models.Quotation{}
	for rows.Next() {
		var q models.Quotation
		if err := rows.Scan(
			&q.ID, &q.QuotationNumber, &q.RFQID, &q.VendorID, &q.Status,
			&q.DeliveryDays, &q.ValidityDays, &q.PaymentTerms, &q.Currency,
			&q.Notes, &q.SubmittedAt, &q.UpdatedAt, &q.RFQNumber, &q.RFQTitle,
			&q.VendorName, &q.ApprovalID, &q.ApprovalStatus,
		); err != nil {
			return nil, err
		}
		if err := r.attachQuotationItems(ctx, &q); err != nil {
			return nil, err
		}
		quotations = append(quotations, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	markRecommended(quotations)
	return quotations, nil
}

func (r *QuotationRepository) GetQuotationByID(ctx context.Context, id int64) (*models.Quotation, error) {
	query := `
		SELECT q.id, q.quotation_number, q.rfq_id, q.vendor_id, q.status, q.delivery_days, q.validity_days,
		       q.payment_terms, q.currency, q.notes, q.submitted_at, q.updated_at, r.rfq_number, r.title,
		       v.company_name, a.id, a.status
		FROM quotations q
		JOIN rfqs r ON r.id = q.rfq_id
		JOIN vendors v ON v.id = q.vendor_id
		LEFT JOIN approvals a ON a.quotation_id = q.id AND a.status = 'pending'
		WHERE q.id = $1
	`
	var q models.Quotation
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&q.ID, &q.QuotationNumber, &q.RFQID, &q.VendorID, &q.Status,
		&q.DeliveryDays, &q.ValidityDays, &q.PaymentTerms, &q.Currency,
		&q.Notes, &q.SubmittedAt, &q.UpdatedAt, &q.RFQNumber, &q.RFQTitle,
		&q.VendorName, &q.ApprovalID, &q.ApprovalStatus,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := r.attachQuotationItems(ctx, &q); err != nil {
		return nil, err
	}
	return &q, nil
}

func (r *QuotationRepository) RequestApproval(ctx context.Context, quotationID, requestedBy int64, remarks *string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var assignedTo int64
	managerQuery := `
		SELECT id
		FROM users
		WHERE role = 'manager' AND status = 'active'
		ORDER BY id ASC
		LIMIT 1
	`
	if err := tx.QueryRowContext(ctx, managerQuery).Scan(&assignedTo); err != nil {
		return fmt.Errorf("failed to find active manager: %w", err)
	}

	insertQuery := `
		INSERT INTO approvals (quotation_id, requested_by, assigned_to, status, remarks)
		VALUES ($1, $2, $3, 'pending', $4)
	`
	if _, err := tx.ExecContext(ctx, insertQuery, quotationID, requestedBy, assignedTo, remarks); err != nil {
		return fmt.Errorf("failed to create approval: %w", err)
	}

	if _, err := tx.ExecContext(ctx, "UPDATE quotations SET status = 'under_review', updated_at = NOW() WHERE id = $1", quotationID); err != nil {
		return fmt.Errorf("failed to update quotation status: %w", err)
	}

	return tx.Commit()
}

func (r *QuotationRepository) RejectQuotation(ctx context.Context, quotationID int64, remarks *string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE quotations SET status = 'rejected', notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $1", quotationID, remarks)
	return err
}

func (r *QuotationRepository) GetApprovals(ctx context.Context, userID int64, role string) ([]models.ApprovalRequest, error) {
	conditions := []string{}
	args := []interface{}{}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT a.id, a.quotation_id, a.requested_by, COALESCE(u.full_name, u.email), a.assigned_to,
		       a.status, a.remarks, a.actioned_at, a.created_at, a.updated_at
		FROM approvals a
		LEFT JOIN users u ON u.id = a.requested_by
		%s
		ORDER BY a.created_at DESC
	`, whereClause)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	approvals := []models.ApprovalRequest{}
	for rows.Next() {
		var approval models.ApprovalRequest
		if err := rows.Scan(
			&approval.ID, &approval.QuotationID, &approval.RequestedBy, &approval.RequestedByName,
			&approval.AssignedTo, &approval.Status, &approval.Remarks, &approval.ActionedAt,
			&approval.CreatedAt, &approval.UpdatedAt,
		); err != nil {
			return nil, err
		}
		quotation, err := r.GetQuotationByID(ctx, approval.QuotationID)
		if err != nil {
			return nil, err
		}
		approval.Quotation = quotation
		approvals = append(approvals, approval)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return approvals, nil
}

func (r *QuotationRepository) DecideApproval(ctx context.Context, approvalID int64, status string, remarks *string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var quotationID int64
	if err := tx.QueryRowContext(ctx, "SELECT quotation_id FROM approvals WHERE id = $1", approvalID).Scan(&quotationID); err != nil {
		return err
	}

	updateQuery := `
		UPDATE approvals
		SET status = $2, remarks = COALESCE($3, remarks), actioned_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'pending'
	`
	result, err := tx.ExecContext(ctx, updateQuery, approvalID, status, remarks)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("approval is not pending")
	}

	if status == "rejected" {
		if _, err := tx.ExecContext(ctx, "UPDATE quotations SET status = 'rejected', updated_at = NOW() WHERE id = $1", quotationID); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if status == "approved" {
		return r.populateLatestPOItems(ctx, quotationID)
	}
	return nil
}

func (r *QuotationRepository) GetPurchaseOrders(ctx context.Context) ([]models.PurchaseOrder, error) {
	query := `
		SELECT po.id, po.po_number, po.quotation_id, po.vendor_id, v.company_name, r.title, po.created_by,
		       po.status, po.currency, po.shipping_address, po.delivery_deadline, po.confirmed_at,
		       po.delivered_at, po.notes, po.created_at, po.updated_at
		FROM purchase_orders po
		JOIN vendors v ON v.id = po.vendor_id
		JOIN quotations q ON q.id = po.quotation_id
		JOIN rfqs r ON r.id = q.rfq_id
		ORDER BY po.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := []models.PurchaseOrder{}
	for rows.Next() {
		var po models.PurchaseOrder
		if err := rows.Scan(
			&po.ID, &po.PONumber, &po.QuotationID, &po.VendorID, &po.VendorName, &po.RFQTitle,
			&po.CreatedBy, &po.Status, &po.Currency, &po.ShippingAddress, &po.DeliveryDeadline,
			&po.ConfirmedAt, &po.DeliveredAt, &po.Notes, &po.CreatedAt, &po.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items, err := r.getPurchaseOrderItems(ctx, po.ID)
		if err != nil {
			return nil, err
		}
		po.Items = items
		orders = append(orders, po)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return orders, nil
}

func (r *QuotationRepository) GetPurchaseOrderByID(ctx context.Context, id int64) (*models.PurchaseOrder, error) {
	orders, err := r.GetPurchaseOrders(ctx)
	if err != nil {
		return nil, err
	}
	for _, order := range orders {
		if order.ID == id {
			return &order, nil
		}
	}
	return nil, nil
}

func (r *QuotationRepository) getQuotationItems(ctx context.Context, quotationID int64) ([]models.QuotationItem, error) {
	query := `
		SELECT qi.id, qi.quotation_id, qi.rfq_item_id, qi.unit_price, qi.quantity, qi.tax_rate_id,
		       qi.discount_pct, qi.line_total, qi.notes, ri.item_name, ri.description, ri.quantity
		FROM quotation_items qi
		JOIN rfq_items ri ON ri.id = qi.rfq_item_id
		WHERE qi.quotation_id = $1
		ORDER BY ri.sort_order ASC, qi.id ASC
	`
	rows, err := r.db.QueryContext(ctx, query, quotationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.QuotationItem{}
	for rows.Next() {
		var item models.QuotationItem
		if err := rows.Scan(
			&item.ID, &item.QuotationID, &item.RFQItemID, &item.UnitPrice,
			&item.Quantity, &item.TaxRateID, &item.DiscountPct, &item.LineTotal,
			&item.Notes, &item.ItemName, &item.ItemDescription, &item.RFQQuantity,
		); err != nil {
			return nil, err
		}

		taxRates, err := r.getQuotationItemTaxes(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		item.TaxRates = taxRates
		for _, taxRate := range taxRates {
			item.TaxRateIDs = append(item.TaxRateIDs, taxRate.ID)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *QuotationRepository) attachQuotationItems(ctx context.Context, quotation *models.Quotation) error {
	items, err := r.getQuotationItems(ctx, quotation.ID)
	if err != nil {
		return err
	}
	quotation.Items = items
	quotation.TotalAmount = quotationTotal(items)
	return nil
}

func (r *QuotationRepository) getQuotationItemTaxes(ctx context.Context, quotationItemID int64) ([]models.TaxRate, error) {
	query := `
		SELECT tr.id, tr.name, tr.rate, tr.is_active, tr.created_at
		FROM quotation_item_taxes qit
		JOIN tax_rates tr ON tr.id = qit.tax_rate_id
		WHERE qit.quotation_item_id = $1
		ORDER BY tr.rate ASC, tr.name ASC
	`
	rows, err := r.db.QueryContext(ctx, query, quotationItemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	taxRates := []models.TaxRate{}
	for rows.Next() {
		var taxRate models.TaxRate
		if err := rows.Scan(&taxRate.ID, &taxRate.Name, &taxRate.Rate, &taxRate.IsActive, &taxRate.CreatedAt); err != nil {
			return nil, err
		}
		taxRates = append(taxRates, taxRate)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return taxRates, nil
}

func (r *QuotationRepository) populateLatestPOItems(ctx context.Context, quotationID int64) error {
	var poID int64
	query := "SELECT id FROM purchase_orders WHERE quotation_id = $1 ORDER BY created_at DESC LIMIT 1"
	if err := r.db.QueryRowContext(ctx, query, quotationID).Scan(&poID); err != nil {
		return err
	}
	_, err := r.db.ExecContext(ctx, "CALL proc_populate_po_items($1)", poID)
	return err
}

func (r *QuotationRepository) getPurchaseOrderItems(ctx context.Context, poID int64) ([]models.PurchaseOrderItem, error) {
	query := `
		SELECT id, po_id, quotation_item_id, item_name, quantity, unit_id, unit_price, tax_rate_id, discount_pct, line_total
		FROM po_items
		WHERE po_id = $1
		ORDER BY id ASC
	`
	rows, err := r.db.QueryContext(ctx, query, poID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.PurchaseOrderItem{}
	for rows.Next() {
		var item models.PurchaseOrderItem
		if err := rows.Scan(
			&item.ID, &item.POID, &item.QuotationItemID, &item.ItemName, &item.Quantity,
			&item.UnitID, &item.UnitPrice, &item.TaxRateID, &item.DiscountPct, &item.LineTotal,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

func quotationTotal(items []models.QuotationItem) float64 {
	total := 0.0
	for _, item := range items {
		lineTotal := item.LineTotal
		taxAmount := 0.0
		for _, taxRate := range item.TaxRates {
			taxAmount += lineTotal * taxRate.Rate / 100
		}
		total += lineTotal + taxAmount
	}
	return total
}

func markRecommended(quotations []models.Quotation) {
	lowestByRFQ := map[int64]float64{}
	for _, quotation := range quotations {
		current, exists := lowestByRFQ[quotation.RFQID]
		if !exists || quotation.TotalAmount < current {
			lowestByRFQ[quotation.RFQID] = quotation.TotalAmount
		}
	}
	for i := range quotations {
		quotations[i].IsRecommended = quotations[i].TotalAmount == lowestByRFQ[quotations[i].RFQID]
	}
}
