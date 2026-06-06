package repository

import (
	"context"
	"database/sql"
)

type DashboardRepository interface {
	CountActiveRFQs(ctx context.Context) (int, error)
	CountPendingApprovals(ctx context.Context) (int, error)
	CountPurchaseOrdersThisMonth(ctx context.Context) (int, error)
	CountOverdueInvoices(ctx context.Context) (int, error)
	GetRecentPurchaseOrders(ctx context.Context, limit int) ([]RecentPO, error)
}

type RecentPO struct {
	ID         int64   `json:"id"`
	PONumber   string  `json:"po_number"`
	VendorName string  `json:"vendor_name"`
	Amount     float64 `json:"amount"`
	Status     string  `json:"status"`
}

type dashboardRepo struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) DashboardRepository {
	return &dashboardRepo{db: db}
}

func (r *dashboardRepo) CountActiveRFQs(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM rfqs WHERE status = 'published' AND submission_deadline > NOW()`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

func (r *dashboardRepo) CountPendingApprovals(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM approvals WHERE status = 'pending'`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

func (r *dashboardRepo) CountPurchaseOrdersThisMonth(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM purchase_orders WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

func (r *dashboardRepo) CountOverdueInvoices(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM invoices WHERE status = 'overdue'`
	var count int
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	return count, err
}

func (r *dashboardRepo) GetRecentPurchaseOrders(ctx context.Context, limit int) ([]RecentPO, error) {
	query := `
        SELECT po.id, po.po_number, v.company_name, 
               COALESCE(SUM(ii.line_total), 0) as amount,
               po.status
        FROM purchase_orders po
        JOIN vendors v ON v.id = po.vendor_id
        LEFT JOIN invoices i ON i.po_id = po.id
        LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
        GROUP BY po.id, po.po_number, v.company_name, po.status
        ORDER BY po.created_at DESC
        LIMIT $1
    `
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []RecentPO
	for rows.Next() {
		var rp RecentPO
		if err := rows.Scan(&rp.ID, &rp.PONumber, &rp.VendorName, &rp.Amount, &rp.Status); err != nil {
			return nil, err
		}
		results = append(results, rp)
	}
	return results, nil
}
