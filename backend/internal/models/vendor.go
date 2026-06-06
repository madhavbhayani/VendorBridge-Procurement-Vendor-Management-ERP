package models

import "time"

type Vendor struct {
	ID             int64     `json:"id"`
	UserID         *int64    `json:"user_id"`
	CompanyName    string    `json:"company_name"`
	TradeName      *string   `json:"trade_name"`
	GSTNumber      *string   `json:"gst_number"`
	PANNumber      *string   `json:"pan_number"`
	Email          string    `json:"email"`
	Phone          string    `json:"phone"`
	AlternatePhone *string   `json:"alternate_phone"`
	Website        *string   `json:"website"`
	Status         string    `json:"status"`
	Rating         *float64  `json:"rating"`
	Notes          *string   `json:"notes"`
	CreatedBy      *int64    `json:"created_by"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type VendorCategory struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type VendorAddress struct {
	ID           int64   `json:"id"`
	VendorID     int64   `json:"vendor_id"`
	AddressType  string  `json:"address_type"`
	AddressLine1 string  `json:"address_line1"`
	AddressLine2 *string `json:"address_line2"`
	City         string  `json:"city"`
	StateID      *int64  `json:"state_id"`
	StateName    *string `json:"state_name,omitempty"`
	Pincode      string  `json:"pincode"`
	CountryID    int64   `json:"country_id"`
	CountryName  *string `json:"country_name,omitempty"`
}

type VendorBankDetail struct {
	ID                int64   `json:"id"`
	VendorID          int64   `json:"vendor_id"`
	AccountHolderName string  `json:"account_holder_name"`
	AccountNumber     string  `json:"account_number"`
	BankName          string  `json:"bank_name"`
	BranchName        *string `json:"branch_name"`
	IFSCode           *string `json:"ifsc_code"`
	SwiftCode         *string `json:"swift_code"`
	IsPrimary         bool    `json:"is_primary"`
}
