package service

import (
	"context"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
)

type LocationService interface {
	GetCountries(ctx context.Context) ([]models.Country, error)
	GetStates(ctx context.Context, countryID int16) ([]models.State, error)
}

type locationService struct {
	repo repository.LocationRepository
}

func NewLocationService(repo repository.LocationRepository) LocationService {
	return &locationService{repo: repo}
}

func (s *locationService) GetCountries(ctx context.Context) ([]models.Country, error) {
	return s.repo.GetAllCountries(ctx)
}

func (s *locationService) GetStates(ctx context.Context, countryID int16) ([]models.State, error) {
	return s.repo.GetStatesByCountry(ctx, countryID)
}
