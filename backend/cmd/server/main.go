package main

import (
	"log"
	"os"
	"strconv"

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
	rfqRepo := repository.NewRFQRepository(database)

	// Initialize Email Service (using env variables)
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPortStr := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	smtpFrom := os.Getenv("SMTP_FROM")
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}
	if smtpPortStr == "" {
		smtpPortStr = "465"
	}
	if smtpUser == "" {
		smtpUser = os.Getenv("SEND_EMAIL")
	}
	if smtpPass == "" {
		smtpPass = os.Getenv("GOOGLE_APP_PASSWORD")
	}
	if smtpFrom == "" {
		smtpFrom = smtpUser
	}
	smtpPort, _ := strconv.Atoi(smtpPortStr)
	emailSvc := service.NewEmailService(smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom)

	// Services
	tokenSvc := service.NewTokenService(cfg.JWTSecret)
	authSvc := service.NewAuthService(userRepo, vendorRepo, codeRepo, sessionRepo, tokenSvc)
	dashboardSvc := service.NewDashboardService(dashboardRepo)
	vendorSvc := service.NewVendorService(vendorRepo, userRepo, emailSvc)
	rfqSvc := service.NewRFQService(rfqRepo)
	quotationRepo := repository.NewQuotationRepository(database)
	quotationSvc := service.NewQuotationService(quotationRepo, rfqRepo, vendorRepo)

	// Handlers
	authHandler := handlers.NewAuthHandler(authSvc, emailSvc)
	dashboardHandler := handlers.NewDashboardHandler(dashboardSvc)
	vendorHandler := handlers.NewVendorHandler(vendorSvc)
	rfqHandler := handlers.NewRFQHandler(rfqSvc)
	quotationHandler := handlers.NewQuotationHandler(quotationSvc)

	// Router
	r := gin.Default()

	// Serve static files from the uploads directory
	r.Static("/uploads", "./uploads")

	api := r.Group("/api")
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/assign-token", authHandler.AssignToken)
		authGroup.POST("/refresh-token", authHandler.RefreshToken)
		authGroup.POST("/signup", authHandler.VendorSignUp)
		authGroup.POST("/signin", authHandler.VendorSignUp)
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

		// Locations
		locationRepo := repository.NewLocationRepository(database)
		locationSvc := service.NewLocationService(locationRepo)
		locationHandler := handlers.NewLocationHandler(locationSvc)

		protected.GET("/countries", locationHandler.GetCountries)
		protected.GET("/countries/:country_id/states", locationHandler.GetStates)

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

		protected.GET("/tax-rates", quotationHandler.GetTaxRates)

		reviewQuotationGroup := protected.Group("/quotation-review")
		reviewQuotationGroup.Use(middleware.RequireRole("admin", "procurement_officer", "manager"))
		{
			reviewQuotationGroup.GET("", quotationHandler.GetAllQuotations)
			reviewQuotationGroup.GET("/:id", quotationHandler.GetQuotation)
			reviewQuotationGroup.POST("/:id/request-approval", quotationHandler.RequestApproval)
			reviewQuotationGroup.POST("/:id/reject", quotationHandler.RejectQuotation)
		}

		approvalGroup := protected.Group("/approvals")
		approvalGroup.Use(middleware.RequireRole("admin", "procurement_officer", "manager"))
		{
			approvalGroup.GET("", quotationHandler.GetApprovals)
		}
		approvalDecisionGroup := protected.Group("/approvals")
		approvalDecisionGroup.Use(middleware.RequireRole("admin", "manager"))
		{
			approvalDecisionGroup.POST("/:id/decision", quotationHandler.DecideApproval)
		}

		poGroup := protected.Group("/purchase-orders")
		poGroup.Use(middleware.RequireRole("admin", "procurement_officer", "manager", "vendor"))
		{
			poGroup.GET("", quotationHandler.GetPurchaseOrders)
			poGroup.GET("/:id/pdf", quotationHandler.DownloadPurchaseOrderPDF)
		}

		// Vendor specifically
		vendorMeGroup := protected.Group("/vendor")
		vendorMeGroup.Use(middleware.RequireRole("vendor"))
		{
			vendorMeGroup.GET("/invitations", quotationHandler.GetVendorInvitations)
			vendorMeGroup.GET("/quotations", quotationHandler.GetVendorQuotations)
			vendorMeGroup.GET("/rfqs/:id", quotationHandler.GetVendorRFQ)
		}

		quotationGroup := protected.Group("/quotations")
		quotationGroup.Use(middleware.RequireRole("vendor"))
		{
			quotationGroup.POST("", quotationHandler.CreateQuotation)
		}

		// RFQ management (all roles procurement_officer or admin)
		rfqGroup := protected.Group("/rfqs")
		rfqGroup.Use(middleware.RequireRole("admin", "procurement_officer"))
		{
			rfqGroup.POST("", rfqHandler.CreateRFQ)
			rfqGroup.GET("/search", rfqHandler.SearchRFQs)
			rfqGroup.GET("/:id", rfqHandler.GetRFQ)
			rfqGroup.PUT("/:id", rfqHandler.UpdateRFQ)
			rfqGroup.DELETE("/:id", rfqHandler.DeleteRFQ)
		}
	}

	log.Printf("Server starting on :%s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
