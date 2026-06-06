package models

import "time"

// Quotation represents a submitted bid by a vendor against an RFQ
type Quotation struct {
	ID              int64                 `json:"id"`
	QuotationNumber string                `json:"quotation_number"`
	RFQID           int64                 `json:"rfq_id"`
	VendorID        int64                 `json:"vendor_id"`
	Status          string                `json:"status"` // 'submitted', 'under_review', 'accepted', 'rejected'
	DeliveryDays    int16                 `json:"delivery_days"`
	ValidityDays    int16                 `json:"validity_days"`
	PaymentTerms    *string               `json:"payment_terms,omitempty"`
	Currency        string                `json:"currency"`
	Notes           *string               `json:"notes,omitempty"`
	SubmittedAt     time.Time             `json:"submitted_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
	
	Items           []QuotationItem       `json:"items,omitempty"`
	Attachments     []QuotationAttachment `json:"attachments,omitempty"`
}

// QuotationItem represents the vendor's pricing for a specific RFQ item
type QuotationItem struct {
	ID            int64   `json:"id"`
	QuotationID   int64   `json:"quotation_id"`
	RFQItemID     int64   `json:"rfq_item_id"`
	UnitPrice     float64 `json:"unit_price"`
	Quantity      float64 `json:"quantity"`
	TaxRateID     *int    `json:"tax_rate_id,omitempty"`
	DiscountPct   float64 `json:"discount_pct"`
	LineTotal     float64 `json:"line_total"`
	Notes         *string `json:"notes,omitempty"`
	
	// Optional joined fields for display
	ItemName      string  `json:"item_name,omitempty"`
	RFQQuantity   float64 `json:"rfq_quantity,omitempty"`
}

// QuotationAttachment represents files uploaded with the quotation
type QuotationAttachment struct {
	ID            int64     `json:"id"`
	QuotationID   int64     `json:"quotation_id"`
	FileName      string    `json:"file_name"`
	FileURL       string    `json:"file_url"`
	FileSizeBytes int64     `json:"file_size_bytes"`
	UploadedAt    time.Time `json:"uploaded_at"`
}

// TaxRate represents a tax percentage (e.g. GST)
type TaxRate struct {
	ID        int     `json:"id"`
	Name      string  `json:"name"`
	Rate      float64 `json:"rate"`
	IsActive  bool    `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}
