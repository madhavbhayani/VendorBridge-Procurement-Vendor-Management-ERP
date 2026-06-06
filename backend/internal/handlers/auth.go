package handlers

import (
	"net/http"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authSvc  *service.AuthService
	emailSvc *service.EmailService
}

func NewAuthHandler(authSvc *service.AuthService, emailSvc *service.EmailService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc, emailSvc: emailSvc}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type vendorSignUpRequest struct {
	Email       string `json:"email" binding:"required,email"`
	CompanyName string `json:"company_name" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	code, err := h.authSvc.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		status := http.StatusUnauthorized
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": code})
}

type assignTokenRequest struct {
	Code string `json:"code" binding:"required"`
}

func (h *AuthHandler) AssignToken(c *gin.Context) {
	var req assignTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	accessToken, refreshToken, err := h.authSvc.AssignToken(c.Request.Context(), req.Code)
	if err != nil {
		status := http.StatusUnauthorized
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	})
}

// VendorSignUp creates a vendor user with pending password and sends welcome email
func (h *AuthHandler) VendorSignUp(c *gin.Context) {
	var req vendorSignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Create user with role vendor and placeholder password
	userID, err := h.authSvc.CreateVendorUser(c.Request.Context(), req.Email, req.CompanyName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Send welcome email
	subject := "Welcome to VendorBridge"
	body := "Your vendor account has been created. Please use the sign-in page to set your password."
	if err := h.emailSvc.Send([]string{req.Email}, subject, body); err != nil {
		// Log but don't fail creation
		// (Assuming a logger exists; otherwise ignore)
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Vendor account created", "user_id": userID})
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newAccessToken, err := h.authSvc.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		status := http.StatusUnauthorized
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"access_token": newAccessToken})
}
