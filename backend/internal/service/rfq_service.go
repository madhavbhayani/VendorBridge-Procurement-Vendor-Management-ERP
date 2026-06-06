package service

import (
	"context"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
)

type RFQService struct {
	rfqRepo repository.RFQRepository
}

func NewRFQService(rfqRepo repository.RFQRepository) *RFQService {
	return &RFQService{rfqRepo: rfqRepo}
}

func (s *RFQService) CreateRFQ(ctx context.Context, rfq *models.RFQ, items []models.RFQItem, vendorIDs []int64, attachments []models.RFQAttachment) (int64, string, error) {
	// 1. Create base RFQ
	rfqID, rfqNum, err := s.rfqRepo.Create(ctx, rfq)
	if err != nil {
		return 0, "", err
	}

	// 2. Add items
	for _, item := range items {
		item.RFQID = rfqID
		if err := s.rfqRepo.AddItem(ctx, &item); err != nil {
			return rfqID, rfqNum, err
		}
	}

	// 3. Add vendor invitations
	for _, vendorID := range vendorIDs {
		if err := s.rfqRepo.AddVendorInvitation(ctx, rfqID, vendorID); err != nil {
			return rfqID, rfqNum, err
		}
	}

	// 4. Add attachments
	for _, att := range attachments {
		att.RFQID = rfqID
		if err := s.rfqRepo.AddAttachment(ctx, &att); err != nil {
			return rfqID, rfqNum, err
		}
	}

	return rfqID, rfqNum, nil
}

func (s *RFQService) SearchRFQs(ctx context.Context, search string, status *string, limit, offset int) (*models.RFQSearchResult, error) {
	rfqs, total, err := s.rfqRepo.Search(ctx, search, status, limit, offset)
	if err != nil {
		return nil, err
	}

	totalPages := (total + limit - 1) / limit
	page := (offset / limit) + 1

	return &models.RFQSearchResult{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		RFQs:       rfqs,
	}, nil
}

func (s *RFQService) GetRFQDetail(ctx context.Context, id int64) (*models.RFQ, error) {
	// 1. Get base RFQ
	rfq, err := s.rfqRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 2. Get items
	items, err := s.rfqRepo.GetItemsByRFQ(ctx, id)
	if err != nil {
		return nil, err
	}
	rfq.Items = items

	// 3. Get attachments
	attachments, err := s.rfqRepo.GetAttachmentsByRFQ(ctx, id)
	if err != nil {
		return nil, err
	}
	rfq.Attachments = attachments

	// 4. Get invitations
	invitations, err := s.rfqRepo.GetInvitationsByRFQ(ctx, id)
	if err != nil {
		return nil, err
	}
	rfq.Invitations = invitations

	return rfq, nil
}

func (s *RFQService) UpdateRFQ(ctx context.Context, id int64, rfq *models.RFQ, items []models.RFQItem, vendorIDs []int64, newAttachments []models.RFQAttachment) error {
	rfq.ID = id
	if err := s.rfqRepo.Update(ctx, rfq); err != nil {
		return err
	}

	if items != nil {
		if err := s.rfqRepo.DeleteItems(ctx, id); err != nil {
			return err
		}
		for _, item := range items {
			item.RFQID = id
			if err := s.rfqRepo.AddItem(ctx, &item); err != nil {
				return err
			}
		}
	}

	if vendorIDs != nil {
		if err := s.rfqRepo.DeleteInvitations(ctx, id); err != nil {
			return err
		}
		for _, vendorID := range vendorIDs {
			if err := s.rfqRepo.AddVendorInvitation(ctx, id, vendorID); err != nil {
				return err
			}
		}
	}

	// For attachments, we just append new ones. Existing ones are kept.
	// If a user wants to delete an attachment, a separate route `DELETE /rfqs/:id/attachments/:attId` could be created, but for now we append.
	if len(newAttachments) > 0 {
		for _, att := range newAttachments {
			att.RFQID = id
			if err := s.rfqRepo.AddAttachment(ctx, &att); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *RFQService) DeleteRFQ(ctx context.Context, id int64) error {
	return s.rfqRepo.Delete(ctx, id)
}
