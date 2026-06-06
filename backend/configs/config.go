package config

import (
	"log"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  []byte
	ServerPort string
}

func Load() *Config {
	// Find and load .env file by searching upwards from current directory
	loadEnvFile()

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     dbPort,
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "vendorbridge"),
		JWTSecret:  []byte(getEnv("JWT_SECRET", "default-secret-change-me")),
		ServerPort: getEnv("SERVER_PORT", "8080"),
	}
}

// loadEnvFile searches for .env starting from current directory and moving up
func loadEnvFile() {
	dir, err := os.Getwd()
	if err != nil {
		log.Println("Could not get working directory:", err)
		godotenv.Load() // fallback
		return
	}

	for {
		envPath := filepath.Join(dir, ".env")
		if _, err := os.Stat(envPath); err == nil {
			if err := godotenv.Load(envPath); err == nil {
				log.Println("Loaded .env from", envPath)
				return
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	// If not found, try default (current directory)
	log.Println("No .env file found, using environment variables")
	godotenv.Load()
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
