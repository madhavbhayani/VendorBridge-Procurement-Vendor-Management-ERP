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
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required"`
	ConfirmPassword string `json:"confirm_password" binding:"required"`
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

// VendorSignUp claims an existing vendor user by setting its first password.
func (h *AuthHandler) VendorSignUp(c *gin.Context) {
	var req vendorSignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Password != req.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{"error": "passwords do not match"})
		return
	}

	err := h.authSvc.CompleteVendorSignUp(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		status := http.StatusInternalServerError
		if err == service.ErrVendorNotFound || err == service.ErrVendorUserMissing {
			status = http.StatusNotFound
		}
		if err == service.ErrVendorAlreadyExists {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vendor account password set successfully"})
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
