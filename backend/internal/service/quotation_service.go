package service

import (
	"context"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
)

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
	return s.quotationRepo.CreateQuotation(ctx, q, items, attachments)
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
