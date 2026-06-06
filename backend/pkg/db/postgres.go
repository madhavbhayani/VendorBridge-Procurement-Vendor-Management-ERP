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

	// Auto-migrate tables
	schema := `
	CREATE TABLE IF NOT EXISTS vendors (
		id SERIAL PRIMARY KEY,
		company_name VARCHAR(255) NOT NULL,
		trade_name VARCHAR(255),
		gst_number VARCHAR(50),
		pan_number VARCHAR(50),
		email VARCHAR(255) NOT NULL,
		phone VARCHAR(50) NOT NULL,
		alternate_phone VARCHAR(50),
		website VARCHAR(255),
		status VARCHAR(50) DEFAULT 'pending',
		rating NUMERIC(3,2),
		notes TEXT,
		created_by INTEGER,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS vendor_categories (
		id SERIAL PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		description TEXT
	);

	CREATE TABLE IF NOT EXISTS vendor_category_map (
		vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
		category_id INTEGER REFERENCES vendor_categories(id) ON DELETE CASCADE,
		PRIMARY KEY (vendor_id, category_id)
	);

	CREATE TABLE IF NOT EXISTS vendor_addresses (
		id SERIAL PRIMARY KEY,
		vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
		address_type VARCHAR(50) NOT NULL,
		address_line1 VARCHAR(255) NOT NULL,
		address_line2 VARCHAR(255),
		city VARCHAR(100) NOT NULL,
		state_id INTEGER,
		pincode VARCHAR(20) NOT NULL,
		country_id INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS vendor_bank_details (
		id SERIAL PRIMARY KEY,
		vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
		account_holder_name VARCHAR(255) NOT NULL,
		account_number VARCHAR(100) NOT NULL,
		bank_name VARCHAR(255) NOT NULL,
		branch_name VARCHAR(255),
		ifsc_code VARCHAR(50),
		swift_code VARCHAR(50),
		is_primary BOOLEAN DEFAULT false
	);

	INSERT INTO vendor_categories (name, description) 
	SELECT 'IT Services', 'Hardware and Software'
	WHERE NOT EXISTS (SELECT 1 FROM vendor_categories WHERE name = 'IT Services');

	INSERT INTO vendor_categories (name, description) 
	SELECT 'Office Supplies', 'Stationery, Desks'
	WHERE NOT EXISTS (SELECT 1 FROM vendor_categories WHERE name = 'Office Supplies');
	`
	if _, err := db.Exec(schema); err != nil {
		log.Println("Schema auto-migration error:", err)
	} else {
		log.Println("Schema auto-migrated successfully.")
	}

	return db
}
