package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

    "github.com/gin-gonic/gin"
    "github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/models"
    "github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"
)

type VendorHandler struct {
    vendorSvc *service.VendorService
}

func NewVendorHandler(vendorSvc *service.VendorService) *VendorHandler {
    return &VendorHandler{vendorSvc: vendorSvc}
}

// CreateVendor POST /api/vendors
func (h *VendorHandler) CreateVendor(c *gin.Context) {
    var req struct {
        CompanyName    string                   `json:"company_name" binding:"required"`
        TradeName      *string                  `json:"trade_name"`
        GSTNumber      *string                  `json:"gst_number"`
        PANNumber      *string                  `json:"pan_number"`
        Email          string                   `json:"email" binding:"required,email"`
        Phone          string                   `json:"phone" binding:"required"`
        AlternatePhone *string                  `json:"alternate_phone"`
        Website        *string                  `json:"website"`
        Status         string                   `json:"status"`
        Notes          *string                  `json:"notes"`
        CategoryIDs    []int64                  `json:"category_ids"`
        Addresses      []models.VendorAddress   `json:"addresses"`
        BankDetails    []models.VendorBankDetail `json:"bank_details"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Set default status if not provided
    if req.Status == "" {
        req.Status = "pending"
    }

    userID := c.GetInt64("userID")
    vendor := &models.Vendor{
        CompanyName:    req.CompanyName,
        TradeName:      req.TradeName,
        GSTNumber:      req.GSTNumber,
        PANNumber:      req.PANNumber,
        Email:          req.Email,
        Phone:          req.Phone,
        AlternatePhone: req.AlternatePhone,
        Website:        req.Website,
        Status:         req.Status,
        Notes:          req.Notes,
        CreatedBy:      &userID,
    }
    vendorID, err := h.vendorSvc.CreateVendor(c.Request.Context(), vendor, req.CategoryIDs, req.Addresses, req.BankDetails)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"message": "Vendor created successfully", "vendor_id": vendorID})
}

// SearchVendors GET /api/vendors/search
func (h *VendorHandler) SearchVendors(c *gin.Context) {
    q := c.Query("q")
    categoryStr := c.Query("category")
    status := c.Query("status")
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

    var categoryID *int64
    if categoryStr != "" {
        if id, err := strconv.ParseInt(categoryStr, 10, 64); err == nil {
            categoryID = &id
        }
    }
    var statusPtr *string
    if status != "" {
        statusPtr = &status
    }
    result, err := h.vendorSvc.SearchVendors(c.Request.Context(), q, categoryID, statusPtr, limit, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, result)
}

// ListVendors GET /api/vendors?page=1&limit=20
func (h *VendorHandler) ListVendors(c *gin.Context) {
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    if page < 1 {
        page = 1
    }
    if limit < 1 {
        limit = 20
    }
    if limit > 100 {
        limit = 100
    }
    offset := (page - 1) * limit

    result, err := h.vendorSvc.SearchVendors(c.Request.Context(), "", nil, nil, limit, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    totalPages := (result.Total + limit - 1) / limit
    c.JSON(http.StatusOK, gin.H{
        "page":        page,
        "limit":       limit,
        "total":       result.Total,
        "total_pages": totalPages,
        "vendors":     result.Vendors,
    })
}

// GetVendor GET /api/vendors/:id
func (h *VendorHandler) GetVendor(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vendor id"})
        return
    }
    detail, err := h.vendorSvc.GetVendorDetail(c.Request.Context(), id)
    if err != nil {
        if err.Error() == "vendor not found" {
            c.JSON(http.StatusNotFound, gin.H{"error": "vendor not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        }
        return
    }
    c.JSON(http.StatusOK, detail)
}

// UpdateVendor PUT /api/vendors/:id
func (h *VendorHandler) UpdateVendor(c *gin.Context) {
    id, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vendor id"})
        return
    }
    var body map[string]interface{}
    if err := c.ShouldBindJSON(&body); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

	// Extract categories, addresses, bank details from body if present
	var categoryIDs []int64
	if cats, ok := body["category_ids"].([]interface{}); ok {
		for _, cat := range cats {
			if f, ok := cat.(float64); ok {
				categoryIDs = append(categoryIDs, int64(f))
			}
		}
		delete(body, "category_ids")
	}

	var addresses []models.VendorAddress
	if addrs, ok := body["addresses"]; ok {
		importJson, _ := json.Marshal(addrs)
		json.Unmarshal(importJson, &addresses)
		delete(body, "addresses")
	}

	var bankDetails []models.VendorBankDetail
	if banks, ok := body["bank_details"]; ok {
		importJson, _ := json.Marshal(banks)
		json.Unmarshal(importJson, &bankDetails)
		delete(body, "bank_details")
	}

    // Update
    if err := h.vendorSvc.UpdateVendor(c.Request.Context(), id, body, categoryIDs, addresses, bankDetails); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Vendor updated successfully", "vendor_id": id})
}

// GetVendorCategories GET /api/vendor-categories
func (h *VendorHandler) GetVendorCategories(c *gin.Context) {
    categories, err := h.vendorSvc.GetAllCategories(c.Request.Context())
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, categories)
}

func (h *VendorHandler) DeleteVendor(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vendor id"})
		return
	}

	if err := h.vendorSvc.DeleteVendor(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "vendor deleted successfully"})
}