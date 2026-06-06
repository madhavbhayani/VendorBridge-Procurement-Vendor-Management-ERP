package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"
)

type LocationHandler struct {
	locSvc service.LocationService
}

func NewLocationHandler(locSvc service.LocationService) *LocationHandler {
	return &LocationHandler{locSvc: locSvc}
}

func (h *LocationHandler) GetCountries(c *gin.Context) {
	countries, err := h.locSvc.GetCountries(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, countries)
}

func (h *LocationHandler) GetStates(c *gin.Context) {
	countryIDStr := c.Param("country_id")
	countryID, err := strconv.ParseInt(countryIDStr, 10, 16)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid country id"})
		return
	}

	states, err := h.locSvc.GetStates(c.Request.Context(), int16(countryID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, states)
}
