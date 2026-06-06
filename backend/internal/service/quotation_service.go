package service

import (
	"context"
	"errors"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
)

var ErrQuotationAlreadySubmitted = errors.New("quotation already submitted for this RFQ")

type QuotationService struct {
	quotationRepo *repository.QuotationRepository
	rfqRepo       repository.RFQRepository
	vendorRepo    repository.VendorRepository
}

func NewQuotationService(quotationRepo *repository.QuotationRepository, rfqRepo repository.RFQRepository, vendorRepo repository.VendorRepository) *QuotationService {
	return &QuotationService{
		quotationRepo: quotationRepo,
		rfqRepo:       rfqRepo,
		vendorRepo:    vendorRepo,
	}
}

func (s *QuotationService) CreateQuotation(ctx context.Context, q *models.Quotation, items []models.QuotationItem, attachments []models.QuotationAttachment) error {
	exists, err := s.quotationRepo.QuotationExists(ctx, q.RFQID, q.VendorID)
	if err != nil {
		return err
	}
	if exists {
		return ErrQuotationAlreadySubmitted
	}
	return s.quotationRepo.CreateQuotation(ctx, q, items, attachments)
}

func (s *QuotationService) GetVendorQuotations(ctx context.Context, userID int64) ([]models.Quotation, error) {
	vendor, err := s.vendorRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if vendor == nil {
		return []models.Quotation{}, nil
	}
	return s.quotationRepo.GetVendorQuotations(ctx, vendor.ID)
}

func (s *QuotationService) GetAllQuotations(ctx context.Context) ([]models.Quotation, error) {
	return s.quotationRepo.GetAllQuotations(ctx)
}

func (s *QuotationService) GetQuotationByID(ctx context.Context, id int64) (*models.Quotation, error) {
	return s.quotationRepo.GetQuotationByID(ctx, id)
}

func (s *QuotationService) RequestApproval(ctx context.Context, quotationID, requestedBy int64, remarks *string) error {
	return s.quotationRepo.RequestApproval(ctx, quotationID, requestedBy, remarks)
}

func (s *QuotationService) RejectQuotation(ctx context.Context, quotationID int64, remarks *string) error {
	return s.quotationRepo.RejectQuotation(ctx, quotationID, remarks)
}

func (s *QuotationService) GetApprovals(ctx context.Context, userID int64, role string) ([]models.ApprovalRequest, error) {
	return s.quotationRepo.GetApprovals(ctx, userID, role)
}

func (s *QuotationService) DecideApproval(ctx context.Context, approvalID int64, status string, remarks *string) error {
	if status != "approved" && status != "rejected" {
		return errors.New("invalid approval status")
	}
	return s.quotationRepo.DecideApproval(ctx, approvalID, status, remarks)
}

func (s *QuotationService) GetPurchaseOrders(ctx context.Context) ([]models.PurchaseOrder, error) {
	return s.quotationRepo.GetPurchaseOrders(ctx)
}

func (s *QuotationService) GetPurchaseOrderByID(ctx context.Context, id int64) (*models.PurchaseOrder, error) {
	return s.quotationRepo.GetPurchaseOrderByID(ctx, id)
}

func (s *QuotationService) GetTaxRates(ctx context.Context) ([]models.TaxRate, error) {
	return s.quotationRepo.GetTaxRates(ctx)
}

func (s *QuotationService) GetVendorInvitations(ctx context.Context, userID int64) ([]models.RFQ, error) {
	vendor, err := s.vendorRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if vendor == nil {
		return []models.RFQ{}, nil
	}
	return s.rfqRepo.GetVendorInvitations(ctx, vendor.ID)
}

func (s *QuotationService) GetVendorIDByUserID(ctx context.Context, userID int64) (int64, error) {
	vendor, err := s.vendorRepo.GetByUserID(ctx, userID)
	if err != nil {
		return 0, err
	}
	if vendor == nil {
		return 0, nil
	}
	return vendor.ID, nil
}

func (s *QuotationService) GetVendorRFQ(ctx context.Context, rfqID int64, vendorID int64) (*models.RFQ, error) {
	// First check if vendor is invited
	invitations, err := s.rfqRepo.GetInvitationsByRFQ(ctx, rfqID)
	if err != nil {
		return nil, err
	}
	isInvited := false
	for _, inv := range invitations {
		if inv.VendorID == vendorID {
			isInvited = true
			break
		}
	}
	if !isInvited {
		return nil, nil // Not authorized
	}

	// Fetch RFQ and attach items and attachments
	rfq, err := s.rfqRepo.GetByID(ctx, rfqID)
	if err != nil || rfq == nil {
		return nil, err
	}
	items, _ := s.rfqRepo.GetItemsByRFQ(ctx, rfqID)
	rfq.Items = items
	attachments, _ := s.rfqRepo.GetAttachmentsByRFQ(ctx, rfqID)
	rfq.Attachments = attachments
	
	return rfq, nil
}
