package main

import (
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

var (
	NanoScraperURL  string
	HeavyScraperURL string
	Port            string
	DB_URL          string
	NanoTimeout     time.Duration
	HeavyTimeout    time.Duration
)

func init() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using defaults where possible")
	}

	NanoScraperURL = getEnv("NANO_SCRAPER_URL", "http://localhost:8090/api/v1/jobs")
	HeavyScraperURL = getEnv("HEAVY_SCRAPER_URL", "http://localhost:8091/api/v1/jobs")
	Port = getEnv("SERVER_PORT", ":8092")

	// DB_URL is required, we do not provide a default with password for security
	DB_URL = os.Getenv("DB_URL")
	if DB_URL == "" {
		// Fallback for development only if absolutely necessary, but better to fail
		// Using a safe default without password or warn
		log.Println("WARNING: DB_URL not set in environment")
	}

	// Timeouts
	var err error
	NanoTimeout, err = time.ParseDuration(getEnv("NANO_TIMEOUT", "2m"))
	if err != nil {
		log.Printf("Invalid NANO_TIMEOUT: %v, defaulting to 2m", err)
		NanoTimeout = 2 * time.Minute
	}

	HeavyTimeout, err = time.ParseDuration(getEnv("HEAVY_TIMEOUT", "10m"))
	if err != nil {
		log.Printf("Invalid HEAVY_TIMEOUT: %v, defaulting to 10m", err)
		HeavyTimeout = 10 * time.Minute
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

var client = &http.Client{
	Timeout: 30 * time.Second,
}
