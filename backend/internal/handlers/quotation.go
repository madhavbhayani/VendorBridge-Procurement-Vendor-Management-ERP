package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"
)

type QuotationHandler struct {
	quotationSvc *service.QuotationService
}

func NewQuotationHandler(quotationSvc *service.QuotationService) *QuotationHandler {
	return &QuotationHandler{quotationSvc: quotationSvc}
}

func (h *QuotationHandler) GetTaxRates(c *gin.Context) {
	rates, err := h.quotationSvc.GetTaxRates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tax rates"})
		return
	}
	c.JSON(http.StatusOK, rates)
}

func (h *QuotationHandler) GetVendorInvitations(c *gin.Context) {
	userID := c.GetInt64("userID")
	rfqs, err := h.quotationSvc.GetVendorInvitations(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vendor invitations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"invitations": rfqs})
}

func (h *QuotationHandler) CreateQuotation(c *gin.Context) {
	err := c.Request.ParseMultipartForm(32 << 20) // 32 MB max
	if err != nil && err != http.ErrNotMultipart {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	userID := c.GetInt64("userID")
	vendorID, err := h.quotationSvc.GetVendorIDByUserID(c.Request.Context(), userID)
	if err != nil || vendorID == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only registered vendors can submit quotations"})
		return
	}

	var req struct {
		RFQID        int64                  `json:"rfq_id"`
		DeliveryDays int16                  `json:"delivery_days"`
		ValidityDays int16                  `json:"validity_days"`
		PaymentTerms *string                `json:"payment_terms"`
		Currency     string                 `json:"currency"`
		Notes        *string                `json:"notes"`
		Items        []models.QuotationItem `json:"items"`
	}

	if c.Request.MultipartForm != nil {
		dataStr := c.PostForm("data")
		if dataStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing 'data' field"})
			return
		}
		if err := json.Unmarshal([]byte(dataStr), &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON", "details": err.Error()})
			return
		}
	} else {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	// Generate quotation number (e.g. QT-{VENDOR}-{RFQ})
	quotationNumber := fmt.Sprintf("QT-%d-%d", vendorID, req.RFQID)

	q := &models.Quotation{
		QuotationNumber: quotationNumber,
		RFQID:           req.RFQID,
		VendorID:        vendorID,
		Status:          "submitted",
		DeliveryDays:    req.DeliveryDays,
		ValidityDays:    req.ValidityDays,
		PaymentTerms:    req.PaymentTerms,
		Currency:        req.Currency,
		Notes:           req.Notes,
	}

	var attachments []models.QuotationAttachment

	if c.Request.MultipartForm != nil {
		files := c.Request.MultipartForm.File["attachments"]
		if len(files) > 0 {
			uploadDir := "./uploads/quotations"
			if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
				return
			}

			for _, file := range files {
				ext := filepath.Ext(file.Filename)
				newFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
				filePath := filepath.Join(uploadDir, newFileName)
				
				fileUrl := fmt.Sprintf("/uploads/quotations/%s", newFileName)

				if err := c.SaveUploadedFile(file, filePath); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
					return
				}
				
				attachments = append(attachments, models.QuotationAttachment{
					FileName:      file.Filename,
					FileURL:       fileUrl,
					FileSizeBytes: file.Size,
				})
			}
		}
	}

	if err := h.quotationSvc.CreateQuotation(c.Request.Context(), q, req.Items, attachments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save quotation", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, q)
}


func (h *QuotationHandler) GetVendorRFQ(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rfq id"})
		return
	}

	userID := c.GetInt64("userID")
	
	vendorID, err := h.quotationSvc.GetVendorIDByUserID(c.Request.Context(), userID)
	if err != nil || vendorID == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only registered vendors can view RFQs"})
		return
	}

	rfq, err := h.quotationSvc.GetVendorRFQ(c.Request.Context(), id, vendorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch RFQ details"})
		return
	}
	if rfq == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "RFQ not found or not invited"})
		return
	}

	c.JSON(http.StatusOK, rfq)
}
