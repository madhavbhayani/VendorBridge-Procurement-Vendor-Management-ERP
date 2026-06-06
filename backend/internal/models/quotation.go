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
	RFQNumber       string                `json:"rfq_number,omitempty"`
	RFQTitle        string                `json:"rfq_title,omitempty"`
	VendorName      string                `json:"vendor_name,omitempty"`
	TotalAmount     float64               `json:"total_amount,omitempty"`
	IsRecommended   bool                  `json:"is_recommended,omitempty"`
	ApprovalID      *int64                `json:"approval_id,omitempty"`
	ApprovalStatus  *string               `json:"approval_status,omitempty"`
	
	Items           []QuotationItem       `json:"items,omitempty"`
	Attachments     []QuotationAttachment `json:"attachments,omitempty"`
}

// QuotationItem represents the vendor's pricing for a specific RFQ item
type QuotationItem struct {
	ID            int64     `json:"id"`
	QuotationID   int64     `json:"quotation_id"`
	RFQItemID     int64     `json:"rfq_item_id"`
	UnitPrice     float64   `json:"unit_price"`
	Quantity      float64   `json:"quantity"`
	TaxRateID     *int      `json:"tax_rate_id,omitempty"`
	TaxRateIDs    []int     `json:"tax_rate_ids,omitempty"`
	TaxRates      []TaxRate `json:"tax_rates,omitempty"`
	DiscountPct   float64   `json:"discount_pct"`
	LineTotal     float64   `json:"line_total"`
	Notes         *string   `json:"notes,omitempty"`
	
	// Optional joined fields for display
	ItemName        string  `json:"item_name,omitempty"`
	ItemDescription *string `json:"item_description,omitempty"`
	RFQQuantity     float64 `json:"rfq_quantity,omitempty"`
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

type ApprovalRequest struct {
	ID              int64       `json:"id"`
	QuotationID     int64       `json:"quotation_id"`
	RequestedBy     int64       `json:"requested_by"`
	RequestedByName string      `json:"requested_by_name"`
	AssignedTo      int64       `json:"assigned_to"`
	Status          string      `json:"status"`
	Remarks         *string     `json:"remarks,omitempty"`
	ActionedAt      *time.Time  `json:"actioned_at,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Quotation       *Quotation  `json:"quotation,omitempty"`
}

type PurchaseOrder struct {
	ID               int64           `json:"id"`
	PONumber         string          `json:"po_number"`
	QuotationID      int64           `json:"quotation_id"`
	VendorID         int64           `json:"vendor_id"`
	VendorName       string          `json:"vendor_name,omitempty"`
	RFQTitle         string          `json:"rfq_title,omitempty"`
	CreatedBy        int64           `json:"created_by"`
	Status           string          `json:"status"`
	Currency         string          `json:"currency"`
	ShippingAddress  *string         `json:"shipping_address,omitempty"`
	DeliveryDeadline *time.Time      `json:"delivery_deadline,omitempty"`
	ConfirmedAt      *time.Time      `json:"confirmed_at,omitempty"`
	DeliveredAt      *time.Time      `json:"delivered_at,omitempty"`
	Notes            *string         `json:"notes,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	Items            []PurchaseOrderItem `json:"items,omitempty"`
}

type PurchaseOrderItem struct {
	ID              int64   `json:"id"`
	POID            int64   `json:"po_id"`
	QuotationItemID int64   `json:"quotation_item_id"`
	ItemName        string  `json:"item_name"`
	Quantity        float64 `json:"quantity"`
	UnitID          int     `json:"unit_id"`
	UnitPrice       float64 `json:"unit_price"`
	TaxRateID       *int    `json:"tax_rate_id,omitempty"`
	DiscountPct     float64 `json:"discount_pct"`
	LineTotal       float64 `json:"line_total"`
}
