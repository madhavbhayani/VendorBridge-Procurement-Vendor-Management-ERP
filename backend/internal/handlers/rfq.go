package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"
)

type RFQHandler struct {
	rfqSvc *service.RFQService
}

func NewRFQHandler(rfqSvc *service.RFQService) *RFQHandler {
	return &RFQHandler{rfqSvc: rfqSvc}
}

func (h *RFQHandler) CreateRFQ(c *gin.Context) {
	// Parse multipart form
	err := c.Request.ParseMultipartForm(32 << 20) // 32 MB max
	if err != nil && err != http.ErrNotMultipart {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	userID := c.GetInt64("userID")

	var req struct {
		Title              string             `json:"title"`
		Description        *string            `json:"description"`
		Status             string             `json:"status"`
		SubmissionDeadline time.Time          `json:"submission_deadline"`
		DeliveryDeadline   *time.Time         `json:"delivery_deadline"`
		Items              []models.RFQItem   `json:"items"`
		VendorIDs          []int64            `json:"vendor_ids"`
	}

	if c.Request.MultipartForm != nil {
		// Expect 'data' field containing JSON string
		dataStr := c.PostForm("data")
		if dataStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing 'data' field in multipart form"})
			return
		}
		if err := json.Unmarshal([]byte(dataStr), &req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON in 'data' field", "details": err.Error()})
			return
		}
	} else {
		// Fallback for regular JSON if no attachments
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	rfq := &models.RFQ{
		Title:              req.Title,
		Description:        req.Description,
		Status:             req.Status,
		SubmissionDeadline: req.SubmissionDeadline,
		DeliveryDeadline:   req.DeliveryDeadline,
		CreatedBy:          userID,
	}

	var attachments []models.RFQAttachment

	// Handle file uploads
	if c.Request.MultipartForm != nil {
		files := c.Request.MultipartForm.File["attachments"]
		if len(files) > 0 {
			// Ensure uploads directory exists
			uploadDir := "./uploads"
			if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
				return
			}

			for _, file := range files {
				ext := filepath.Ext(file.Filename)
				newFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
				filePath := filepath.Join(uploadDir, newFileName)
				
				fileUrl := fmt.Sprintf("/uploads/%s", newFileName)

				// Save file
				if err := c.SaveUploadedFile(file, filePath); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file", "filename": file.Filename})
					return
				}
				
				size := file.Size
				attachments = append(attachments, models.RFQAttachment{
					FileName:      file.Filename,
					FileURL:       fileUrl,
					FileSizeBytes: &size,
					UploadedBy:    userID,
				})
			}
		}
	}

	id, rfqNumber, err := h.rfqSvc.CreateRFQ(c.Request.Context(), rfq, req.Items, req.VendorIDs, attachments)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "RFQ created successfully",
		"id":         id,
		"rfq_number": rfqNumber,
	})
}

func (h *RFQHandler) SearchRFQs(c *gin.Context) {
	q := c.Query("q")
	status := c.Query("status")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	var statusPtr *string
	if status != "" {
		statusPtr = &status
	}

	result, err := h.rfqSvc.SearchRFQs(c.Request.Context(), q, statusPtr, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *RFQHandler) GetRFQ(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rfq id"})
		return
	}

	detail, err := h.rfqSvc.GetRFQDetail(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "rfq not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "rfq not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, detail)
}

func (h *RFQHandler) UpdateRFQ(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rfq id"})
		return
	}

	err = c.Request.ParseMultipartForm(32 << 20)
	if err != nil && err != http.ErrNotMultipart {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	userID := c.GetInt64("userID")

	var req struct {
		Title              string             `json:"title"`
		Description        *string            `json:"description"`
		Status             string             `json:"status"`
		SubmissionDeadline time.Time          `json:"submission_deadline"`
		DeliveryDeadline   *time.Time         `json:"delivery_deadline"`
		Items              []models.RFQItem   `json:"items"`
		VendorIDs          []int64            `json:"vendor_ids"`
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

	rfq := &models.RFQ{
		Title:              req.Title,
		Description:        req.Description,
		Status:             req.Status,
		SubmissionDeadline: req.SubmissionDeadline,
		DeliveryDeadline:   req.DeliveryDeadline,
	}

	var attachments []models.RFQAttachment
	if c.Request.MultipartForm != nil {
		files := c.Request.MultipartForm.File["attachments"]
		if len(files) > 0 {
			uploadDir := "./uploads"
			os.MkdirAll(uploadDir, os.ModePerm)

			for _, file := range files {
				ext := filepath.Ext(file.Filename)
				newFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
				filePath := filepath.Join(uploadDir, newFileName)
				
				fileUrl := fmt.Sprintf("/uploads/%s", newFileName)

				if err := c.SaveUploadedFile(file, filePath); err == nil {
					size := file.Size
					attachments = append(attachments, models.RFQAttachment{
						FileName:      file.Filename,
						FileURL:       fileUrl,
						FileSizeBytes: &size,
						UploadedBy:    userID,
					})
				}
			}
		}
	}

	if err := h.rfqSvc.UpdateRFQ(c.Request.Context(), id, rfq, req.Items, req.VendorIDs, attachments); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "RFQ updated successfully"})
}

func (h *RFQHandler) DeleteRFQ(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid rfq id"})
		return
	}

	if err := h.rfqSvc.DeleteRFQ(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "RFQ deleted successfully"})
}
