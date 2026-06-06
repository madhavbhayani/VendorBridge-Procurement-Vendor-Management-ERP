package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

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
		if errors.Is(err, service.ErrQuotationAlreadySubmitted) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save quotation", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, q)
}

func (h *QuotationHandler) GetVendorQuotations(c *gin.Context) {
	userID := c.GetInt64("userID")
	quotations, err := h.quotationSvc.GetVendorQuotations(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quotations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"quotations": quotations})
}

func (h *QuotationHandler) GetAllQuotations(c *gin.Context) {
	quotations, err := h.quotationSvc.GetAllQuotations(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quotations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"quotations": quotations})
}

func (h *QuotationHandler) GetQuotation(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid quotation id"})
		return
	}
	quotation, err := h.quotationSvc.GetQuotationByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch quotation"})
		return
	}
	if quotation == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "quotation not found"})
		return
	}
	c.JSON(http.StatusOK, quotation)
}

func (h *QuotationHandler) RequestApproval(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid quotation id"})
		return
	}
	var req struct {
		Remarks *string `json:"remarks"`
	}
	_ = c.ShouldBindJSON(&req)
	userID := c.GetInt64("userID")
	if err := h.quotationSvc.RequestApproval(c.Request.Context(), id, userID, req.Remarks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to request approval", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "quotation moved to under review"})
}

func (h *QuotationHandler) RejectQuotation(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid quotation id"})
		return
	}
	var req struct {
		Remarks *string `json:"remarks"`
	}
	_ = c.ShouldBindJSON(&req)
	if err := h.quotationSvc.RejectQuotation(c.Request.Context(), id, req.Remarks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject quotation"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "quotation rejected"})
}

func (h *QuotationHandler) GetApprovals(c *gin.Context) {
	userID := c.GetInt64("userID")
	role := c.GetString("role")
	approvals, err := h.quotationSvc.GetApprovals(c.Request.Context(), userID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch approvals"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"approvals": approvals})
}

func (h *QuotationHandler) DecideApproval(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid approval id"})
		return
	}
	var req struct {
		Status  string  `json:"status" binding:"required"`
		Remarks *string `json:"remarks"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.quotationSvc.DecideApproval(c.Request.Context(), id, req.Status, req.Remarks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update approval", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "approval updated"})
}

func (h *QuotationHandler) GetPurchaseOrders(c *gin.Context) {
	orders, err := h.quotationSvc.GetPurchaseOrders(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase orders"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"purchase_orders": orders})
}

func (h *QuotationHandler) DownloadPurchaseOrderPDF(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid purchase order id"})
		return
	}
	order, err := h.quotationSvc.GetPurchaseOrderByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchase order"})
		return
	}
	if order == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "purchase order not found"})
		return
	}
	pdf := buildPurchaseOrderPDF(order)
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.pdf\"", order.PONumber))
	c.Data(http.StatusOK, "application/pdf", pdf)
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

func buildPurchaseOrderPDF(order *models.PurchaseOrder) []byte {
	lines := []string{
		"Purchase Order " + order.PONumber,
		"Vendor: " + order.VendorName,
		"RFQ: " + order.RFQTitle,
		"Status: " + order.Status,
		"Currency: " + order.Currency,
		"",
		"Items",
	}
	total := 0.0
	for _, item := range order.Items {
		total += item.LineTotal
		lines = append(lines, fmt.Sprintf("%s | Qty %.3f | Unit %.2f | Total %.2f", item.ItemName, item.Quantity, item.UnitPrice, item.LineTotal))
	}
	lines = append(lines, "", fmt.Sprintf("Total: %.2f", total))

	var content strings.Builder
	content.WriteString("BT\n/F1 12 Tf\n50 780 Td\n")
	for index, line := range lines {
		if index > 0 {
			content.WriteString("0 -18 Td\n")
		}
		content.WriteString(fmt.Sprintf("(%s) Tj\n", escapePDFText(line)))
	}
	content.WriteString("ET\n")

	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(content.String()), content.String()),
	}

	var buffer bytes.Buffer
	buffer.WriteString("%PDF-1.4\n")
	offsets := []int{0}
	for index, object := range objects {
		offsets = append(offsets, buffer.Len())
		buffer.WriteString(fmt.Sprintf("%d 0 obj\n%s\nendobj\n", index+1, object))
	}
	xrefOffset := buffer.Len()
	buffer.WriteString(fmt.Sprintf("xref\n0 %d\n0000000000 65535 f \n", len(objects)+1))
	for _, offset := range offsets[1:] {
		buffer.WriteString(fmt.Sprintf("%010d 00000 n \n", offset))
	}
	buffer.WriteString(fmt.Sprintf("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF", len(objects)+1, xrefOffset))
	return buffer.Bytes()
}

func escapePDFText(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "(", "\\(")
	value = strings.ReplaceAll(value, ")", "\\)")
	return value
}
