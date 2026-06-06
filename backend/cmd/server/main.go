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
	vendorRepo := repository.NewVendorRepository(database)

	// Services
	tokenSvc := service.NewTokenService(cfg.JWTSecret)
	authSvc := service.NewAuthService(userRepo, codeRepo, sessionRepo, tokenSvc)
	dashboardSvc := service.NewDashboardService(dashboardRepo)
	vendorSvc := service.NewVendorService(vendorRepo)

	// Handlers
	authHandler := handlers.NewAuthHandler(authSvc)
	dashboardHandler := handlers.NewDashboardHandler(dashboardSvc)
	vendorHandler := handlers.NewVendorHandler(vendorSvc)

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

		// Vendor management (all roles procurement_officer or admin)
		vendorGroup := protected.Group("/vendors")
		vendorGroup.Use(middleware.RequireRole("admin", "procurement_officer"))
		{
			vendorGroup.POST("", vendorHandler.CreateVendor)
			vendorGroup.GET("/search", vendorHandler.SearchVendors)
			vendorGroup.GET("", vendorHandler.ListVendors)
			vendorGroup.GET("/:id", vendorHandler.GetVendor)
			vendorGroup.PUT("/:id", vendorHandler.UpdateVendor)
			vendorGroup.DELETE("/:id", vendorHandler.DeleteVendor)
		}

		// Public categories (no extra role, but still authenticated)
		protected.GET("/vendor-categories", vendorHandler.GetVendorCategories)
	}

	log.Printf("Server starting on :%s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
