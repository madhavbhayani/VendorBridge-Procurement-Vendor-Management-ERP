package db

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/madhavbhayani/VendorBridge-Procurement-Vendor-Management-ERP/configs"

	_ "github.com/lib/pq"
)

func NewPostgresConnection(cfg *config.Config) *sql.DB {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("Database unreachable:", err)
	}

	log.Println("PostgreSQL connected")
	return db
}
