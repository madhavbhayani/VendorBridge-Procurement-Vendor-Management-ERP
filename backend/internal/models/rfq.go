package models

import "time"

type RFQ struct {
	ID                 int64                 `json:"id"`
	RFQNumber          string                `json:"rfq_number"`
	Title              string                `json:"title"`
	Description        *string               `json:"description,omitempty"`
	Status             string                `json:"status"`
	SubmissionDeadline time.Time             `json:"submission_deadline"`
	DeliveryDeadline   *time.Time            `json:"delivery_deadline,omitempty"`
	CreatedBy          int64                 `json:"created_by"`
	ClosedAt           *time.Time            `json:"closed_at,omitempty"`
	CreatedAt          time.Time             `json:"created_at"`
	UpdatedAt          time.Time             `json:"updated_at"`
	Items              []RFQItem             `json:"items,omitempty"`
	Attachments        []RFQAttachment       `json:"attachments,omitempty"`
	Invitations        []RFQVendorInvitation `json:"invitations,omitempty"`
}

type RFQItem struct {
	ID                 int64    `json:"id"`
	RFQID              int64    `json:"rfq_id"`
	ProductCategoryID  *int     `json:"product_category_id,omitempty"`
	ItemName           string   `json:"item_name"`
	Description        *string  `json:"description,omitempty"`
	Quantity           float64  `json:"quantity"`
	UnitID             int      `json:"unit_id"`
	EstimatedUnitPrice *float64 `json:"estimated_unit_price,omitempty"`
	Specifications     *string  `json:"specifications,omitempty"`
	SortOrder          int16    `json:"sort_order"`
}

type RFQAttachment struct {
	ID            int64     `json:"id"`
	RFQID         int64     `json:"rfq_id"`
	FileName      string    `json:"file_name"`
	FileURL       string    `json:"file_url"`
	FileSizeBytes *int64    `json:"file_size_bytes,omitempty"`
	UploadedBy    int64     `json:"uploaded_by"`
	UploadedAt    time.Time `json:"uploaded_at"`
}

type RFQVendorInvitation struct {
	RFQID      int64      `json:"rfq_id"`
	VendorID   int64      `json:"vendor_id"`
	InvitedAt  time.Time  `json:"invited_at"`
	NotifiedAt *time.Time `json:"notified_at,omitempty"`
}

type RFQSearchResult struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int   `json:"total"`
	TotalPages int   `json:"total_pages"`
	RFQs       []RFQ `json:"rfqs"`
}
