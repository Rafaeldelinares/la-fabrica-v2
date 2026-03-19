package main

import (
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

// AppConfig agrupa toda la configuración del servidor cargada desde variables de entorno.
type AppConfig struct {
	NanoScraperURL  string        `json:"nano_scraper_url"`
	HeavyScraperURL string        `json:"heavy_scraper_url"`
	MapsScraperURL  string        `json:"maps_scraper_url"`
	Port            string        `json:"port"`
	DBURL           string        `json:"db_url"`
	NanoTimeout     time.Duration `json:"nano_timeout"`
	HeavyTimeout    time.Duration `json:"heavy_timeout"`
	MapsTimeout     time.Duration `json:"maps_timeout"`
	HTTPClient      *http.Client  `json:"-"`
}

// LoadConfig carga la configuración desde variables de entorno con valores por defecto seguros.
func LoadConfig() AppConfig {
	if err := godotenv.Load(); err != nil {
		logrus.Info("No .env file found, using environment variables")
	}

	nanoTimeout := parseDuration("NANO_TIMEOUT", "2m", 2*time.Minute)
	heavyTimeout := parseDuration("HEAVY_TIMEOUT", "10m", 10*time.Minute)
	mapsTimeout := parseDuration("MAPS_TIMEOUT", "90s", 90*time.Second)

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		logrus.Warn("DB_URL not set in environment")
	}

	nanoURL := os.Getenv("NANO_SCRAPER_URL")
	if nanoURL == "" {
		logrus.Warn("NANO_SCRAPER_URL not set in environment")
	}
	heavyURL := os.Getenv("HEAVY_SCRAPER_URL")
	if heavyURL == "" {
		logrus.Warn("HEAVY_SCRAPER_URL not set in environment")
	}
	mapsURL := os.Getenv("MAPS_SCRAPER_URL")
	if mapsURL == "" {
		logrus.Warn("MAPS_SCRAPER_URL not set in environment")
	}

	return AppConfig{
		NanoScraperURL:  nanoURL,
		HeavyScraperURL: heavyURL,
		MapsScraperURL:  mapsURL,
		Port:            getEnv("SERVER_PORT", ":8092"),
		DBURL:           dbURL,
		NanoTimeout:     nanoTimeout,
		HeavyTimeout:    heavyTimeout,
		MapsTimeout:     mapsTimeout,
		HTTPClient:      &http.Client{Timeout: 30 * time.Second},
	}
}

func parseDuration(envKey, fallback string, defaultVal time.Duration) time.Duration {
	d, err := time.ParseDuration(getEnv(envKey, fallback))
	if err != nil {
		logrus.Warnf("Invalid %s: %v, defaulting to %s", envKey, err, fallback)
		return defaultVal
	}
	return d
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
