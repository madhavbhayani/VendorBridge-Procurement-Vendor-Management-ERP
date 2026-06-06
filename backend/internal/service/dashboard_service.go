package service

import (
	"context"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
)

type DashboardService struct {
	dashboardRepo repository.DashboardRepository
}

func NewDashboardService(dashboardRepo repository.DashboardRepository) *DashboardService {
	return &DashboardService{dashboardRepo: dashboardRepo}
}

type DashboardData struct {
	ActiveRFQs              int                   `json:"active_rfqs"`
	PendingApprovals        int                   `json:"pending_approvals"`
	PurchaseOrdersThisMonth int                   `json:"purchase_orders_this_month"`
	OverdueInvoices         int                   `json:"overdue_invoices"`
	RecentPurchaseOrders    []repository.RecentPO `json:"recent_purchase_orders"`
}

func (s *DashboardService) GetDashboardData(ctx context.Context) (*DashboardData, error) {
	activeRFQs, err := s.dashboardRepo.CountActiveRFQs(ctx)
	if err != nil {
		return nil, err
	}
	pendingApprovals, err := s.dashboardRepo.CountPendingApprovals(ctx)
	if err != nil {
		return nil, err
	}
	posThisMonth, err := s.dashboardRepo.CountPurchaseOrdersThisMonth(ctx)
	if err != nil {
		return nil, err
	}
	overdueInvoices, err := s.dashboardRepo.CountOverdueInvoices(ctx)
	if err != nil {
		return nil, err
	}
	recentPOs, err := s.dashboardRepo.GetRecentPurchaseOrders(ctx, 5)
	if err != nil {
		return nil, err
	}

	return &DashboardData{
		ActiveRFQs:              activeRFQs,
		PendingApprovals:        pendingApprovals,
		PurchaseOrdersThisMonth: posThisMonth,
		OverdueInvoices:         overdueInvoices,
		RecentPurchaseOrders:    recentPOs,
	}, nil
}
