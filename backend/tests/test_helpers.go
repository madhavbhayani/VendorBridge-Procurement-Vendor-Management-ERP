package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/configs"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/handlers"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/pkg/db"

	"github.com/gin-gonic/gin"
)

func SetupTestRouter() (*gin.Engine, *service.AuthService) {
	cfg := config.Load()
	database := db.NewPostgresConnection(cfg)

	userRepo := repository.NewUserRepository(database)
	codeRepo := repository.NewLoginCodeRepository(database)
	sessionRepo := repository.NewSessionRepository(database)
	tokenSvc := service.NewTokenService(cfg.JWTSecret)
	authSvc := service.NewAuthService(userRepo, codeRepo, sessionRepo, tokenSvc)
	authHandler := handlers.NewAuthHandler(authSvc)

	r := gin.Default()
	api := r.Group("/api/auth")
	{
		api.POST("/login", authHandler.Login)
		api.POST("/assign-token", authHandler.AssignToken)
		api.POST("/refresh-token", authHandler.RefreshToken)
	}
	return r, authSvc
}

func JSONRequest(method, url string, body interface{}) (*httptest.ResponseRecorder, *gin.Engine) {
	w := httptest.NewRecorder()
	r, _ := SetupTestRouter()
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest(method, url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	return w, r
}
