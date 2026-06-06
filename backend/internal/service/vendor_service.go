package service

import (
	"context"
	"errors"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
)

type VendorService struct {
	vendorRepo repository.VendorRepository
}

func NewVendorService(vendorRepo repository.VendorRepository) *VendorService {
	return &VendorService{vendorRepo: vendorRepo}
}

// CreateVendor creates a new vendor with categories, addresses, bank details
func (s *VendorService) CreateVendor(ctx context.Context, vendor *models.Vendor, categoryIDs []int64, addresses []models.VendorAddress, bankDetails []models.VendorBankDetail) (int64, error) {
	// Insert vendor
	vendorID, err := s.vendorRepo.Create(ctx, vendor)
	if err != nil {
		return 0, err
	}
	// Add categories
	for _, catID := range categoryIDs {
		if err := s.vendorRepo.AddCategory(ctx, vendorID, catID); err != nil {
			return 0, err
		}
	}
	// Add addresses
	for _, addr := range addresses {
		addr.VendorID = vendorID
		if err := s.vendorRepo.AddAddress(ctx, &addr); err != nil {
			return 0, err
		}
	}
	// Add bank details
	for _, bank := range bankDetails {
		bank.VendorID = vendorID
		if err := s.vendorRepo.AddBankDetail(ctx, &bank); err != nil {
			return 0, err
		}
	}
	return vendorID, nil
}

type VendorSearchResult struct {
	Total   int             `json:"total"`
	Vendors []VendorSummary `json:"vendors"`
}

type VendorSummary struct {
	ID          int64    `json:"id"`
	CompanyName string   `json:"company_name"`
	GSTNumber   *string  `json:"gst_number"`
	Phone       string   `json:"phone"`
	Status      string   `json:"status"`
	Categories  []string `json:"categories"`
}

func (s *VendorService) SearchVendors(ctx context.Context, search string, categoryID *int64, status *string, limit, offset int) (*VendorSearchResult, error) {
	vendors, total, err := s.vendorRepo.Search(ctx, search, categoryID, status, limit, offset)
	if err != nil {
		return nil, err
	}
	result := &VendorSearchResult{Total: total, Vendors: []VendorSummary{}}
	for _, v := range vendors {
		cats, _ := s.vendorRepo.GetCategoriesByVendor(ctx, v.ID)
		catNames := []string{}
		for _, c := range cats {
			catNames = append(catNames, c.Name)
		}
		result.Vendors = append(result.Vendors, VendorSummary{
			ID:          v.ID,
			CompanyName: v.CompanyName,
			GSTNumber:   v.GSTNumber,
			Phone:       v.Phone,
			Status:      v.Status,
			Categories:  catNames,
		})
	}
	return result, nil
}

type VendorDetail struct {
	models.Vendor
	Categories  []models.VendorCategory   `json:"categories"`
	Addresses   []models.VendorAddress    `json:"addresses"`
	BankDetails []models.VendorBankDetail `json:"bank_details"`
}

func (s *VendorService) GetVendorDetail(ctx context.Context, id int64) (*VendorDetail, error) {
	vendor, err := s.vendorRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if vendor == nil {
		return nil, errors.New("vendor not found")
	}
	categories, _ := s.vendorRepo.GetCategoriesByVendor(ctx, id)
	addresses, _ := s.vendorRepo.GetAddressesByVendor(ctx, id)
	banks, _ := s.vendorRepo.GetBankDetailsByVendor(ctx, id)

	return &VendorDetail{
		Vendor:      *vendor,
		Categories:  categories,
		Addresses:   addresses,
		BankDetails: banks,
	}, nil
}

func (s *VendorService) UpdateVendor(ctx context.Context, id int64, updates map[string]interface{}, categoryIDs []int64, addresses []models.VendorAddress, bankDetails []models.VendorBankDetail) error {
	// First update basic vendor fields
	if len(updates) > 0 {
		vendor := &models.Vendor{ID: id}
		// Map fields (simplified, you can expand)
		if v, ok := updates["company_name"]; ok {
			vendor.CompanyName = v.(string)
		}
		if v, ok := updates["trade_name"]; ok {
			vendor.TradeName = v.(*string)
		}
		if v, ok := updates["gst_number"]; ok {
			vendor.GSTNumber = v.(*string)
		}
		if v, ok := updates["pan_number"]; ok {
			vendor.PANNumber = v.(*string)
		}
		if v, ok := updates["email"]; ok {
			vendor.Email = v.(string)
		}
		if v, ok := updates["phone"]; ok {
			vendor.Phone = v.(string)
		}
		if v, ok := updates["alternate_phone"]; ok {
			vendor.AlternatePhone = v.(*string)
		}
		if v, ok := updates["website"]; ok {
			vendor.Website = v.(*string)
		}
		if v, ok := updates["status"]; ok {
			vendor.Status = v.(string)
		}
		if v, ok := updates["rating"]; ok {
			vendor.Rating = v.(*float64)
		}
		if v, ok := updates["notes"]; ok {
			vendor.Notes = v.(*string)
		}
		if err := s.vendorRepo.Update(ctx, vendor); err != nil {
			return err
		}
	}
	// Replace categories
	if categoryIDs != nil {
		if err := s.vendorRepo.DeleteCategories(ctx, id); err != nil {
			return err
		}
		for _, catID := range categoryIDs {
			if err := s.vendorRepo.AddCategory(ctx, id, catID); err != nil {
				return err
			}
		}
	}
	// Replace addresses (delete all, then insert new)
	if addresses != nil {
		if err := s.vendorRepo.DeleteAddresses(ctx, id); err != nil {
			return err
		}
		for _, addr := range addresses {
			addr.VendorID = id
			if err := s.vendorRepo.AddAddress(ctx, &addr); err != nil {
				return err
			}
		}
	}
	// Replace bank details
	if bankDetails != nil {
		if err := s.vendorRepo.DeleteBankDetails(ctx, id); err != nil {
			return err
		}
		for _, bank := range bankDetails {
			bank.VendorID = id
			if err := s.vendorRepo.AddBankDetail(ctx, &bank); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *VendorService) GetAllCategories(ctx context.Context) ([]models.VendorCategory, error) {
	return s.vendorRepo.GetAllCategories(ctx)
}

func (s *VendorService) DeleteVendor(ctx context.Context, id int64) error {
	return s.vendorRepo.Delete(ctx, id)
}
