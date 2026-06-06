package main

import (
	"log"

	config "github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/configs"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/handlers"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/middleware"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/repository"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/internal/service"
	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/pkg/db"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	// Database
	database := db.NewPostgresConnection(cfg)

	// Repositories
	userRepo := repository.NewUserRepository(database)
	codeRepo := repository.NewLoginCodeRepository(database)
	sessionRepo := repository.NewSessionRepository(database)
	dashboardRepo := repository.NewDashboardRepository(database)

	// Services
	tokenSvc := service.NewTokenService(cfg.JWTSecret)
	authSvc := service.NewAuthService(userRepo, codeRepo, sessionRepo, tokenSvc)
	dashboardSvc := service.NewDashboardService(dashboardRepo)

	// Handlers
	authHandler := handlers.NewAuthHandler(authSvc)
	dashboardHandler := handlers.NewDashboardHandler(dashboardSvc)

	// Router
	r := gin.Default()

	api := r.Group("/api")
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/assign-token", authHandler.AssignToken)
		authGroup.POST("/refresh-token", authHandler.RefreshToken)
	}

	// Protected routes
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware(tokenSvc))
	{
		protected.GET("/me", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"userID": c.GetInt64("userID"),
				"email":  c.GetString("email"),
			})
		})
		protected.GET("/dashboard", dashboardHandler.GetDashboard)
	}

	log.Printf("Server starting on :%s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
