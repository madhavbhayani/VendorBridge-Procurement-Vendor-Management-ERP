package repository

import (
	"context"
	"database/sql"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
)

type LocationRepository interface {
	GetAllCountries(ctx context.Context) ([]models.Country, error)
	GetStatesByCountry(ctx context.Context, countryID int16) ([]models.State, error)
}

type locationRepo struct {
	db *sql.DB
}

func NewLocationRepository(db *sql.DB) LocationRepository {
	return &locationRepo{db: db}
}

func (r *locationRepo) GetAllCountries(ctx context.Context) ([]models.Country, error) {
	query := "SELECT id, code, name FROM countries ORDER BY name"
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var countries []models.Country
	for rows.Next() {
		var c models.Country
		if err := rows.Scan(&c.ID, &c.Code, &c.Name); err != nil {
			return nil, err
		}
		countries = append(countries, c)
	}
	return countries, nil
}

func (r *locationRepo) GetStatesByCountry(ctx context.Context, countryID int16) ([]models.State, error) {
	query := "SELECT id, country_id, code, name FROM states WHERE country_id = $1 ORDER BY name"
	rows, err := r.db.QueryContext(ctx, query, countryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var states []models.State
	for rows.Next() {
		var s models.State
		if err := rows.Scan(&s.ID, &s.CountryID, &s.Code, &s.Name); err != nil {
			return nil, err
		}
		states = append(states, s)
	}
	return states, nil
}
