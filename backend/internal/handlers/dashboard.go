package handlers

import (
	"net/http"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	dashboardService *service.DashboardService
}

func NewDashboardHandler(dashboardService *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashboardService: dashboardService}
}

func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	data, err := h.dashboardService.GetDashboardData(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch dashboard data"})
		return
	}
	c.JSON(http.StatusOK, data)
}
