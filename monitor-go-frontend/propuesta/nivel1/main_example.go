package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"./nivel1"
	_ "github.com/lib/pq"
)

// Server estructura principal del servidor
type Server struct {
	db             *sql.DB
	level1Scraper  *nivel1.Level1Scraper
	chromiumURL    string // URL del contenedor Docker de scraping
	port           string
}

// NewServer crea una nueva instancia del servidor
func NewServer() (*Server, error) {
	// Configuración desde variables de entorno
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "reputacion_user")
	dbPass := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "reputacion")
	chromiumURL := getEnv("CHROMIUM_URL", "http://localhost:8080")
	serverPort := getEnv("PORT", "8082")

	// Conectar a PostgreSQL
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("error conectando a PostgreSQL: %w", err)
	}

	// Verificar conexión
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("error verificando conexión a PostgreSQL: %w", err)
	}

	log.Println("✓ Conectado a PostgreSQL")

	// Configurar pool de conexiones
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Inicializar caché nivel 1
	cache := nivel1.NewLevel1Cache(db, 30) // TTL de 30 días

	// Inicializar scraper nivel 1
	config := nivel1.DefaultConfig()
	level1Scraper := nivel1.NewLevel1Scraper(cache, config)

	log.Println("✓ Scraper Nivel 1 inicializado")

	return &Server{
		db:            db,
		level1Scraper: level1Scraper,
		chromiumURL:   chromiumURL,
		port:          serverPort,
	}, nil
}

// Start inicia el servidor HTTP
func (s *Server) Start() error {
	// Configurar rutas
	http.HandleFunc("/api/search", s.handleSearch)
	http.HandleFunc("/api/batch-search", s.handleBatchSearch)
	http.HandleFunc("/api/stats", s.handleStats)
	http.HandleFunc("/api/health", s.handleHealth)

	log.Printf("🚀 Servidor iniciado en :%s", s.port)
	log.Println("📊 Endpoints disponibles:")
	log.Println("   GET  /api/search?negocio=X&ciudad=Y")
	log.Println("   POST /api/batch-search")
	log.Println("   GET  /api/stats")
	log.Println("   GET  /api/health")

	return http.ListenAndServe(":"+s.port, nil)
}

// handleSearch maneja búsquedas individuales con cascada de niveles
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()

	// Parsear parámetros
	negocio := r.URL.Query().Get("negocio")
	ciudad := r.URL.Query().Get("ciudad")
	forceChromium := r.URL.Query().Get("force_chromium") == "true"

	if negocio == "" || ciudad == "" {
		respondError(w, http.StatusBadRequest, "Parámetros 'negocio' y 'ciudad' son requeridos")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	var result interface{}
	var level int
	var err error

	// ========================================================================
	// CASCADA DE NIVELES
	// ========================================================================

	if !forceChromium {
		// NIVEL 1: Intentar con HTTP puro
		log.Printf("🔍 [Nivel 1] Buscando: %s en %s", negocio, ciudad)
		
		level1Result, err := s.level1Scraper.Search(ctx, negocio, ciudad)
		if err != nil {
			log.Printf("⚠️  [Nivel 1] Error: %v", err)
		} else {
			level = 1

			// Verificar si necesita JavaScript
			if level1Result.RequiresJS {
				log.Printf("⬆️  [Nivel 1→2] Requiere JavaScript, escalando a Chromium")
				// Continuar al siguiente nivel
			} else if level1Result.Found {
				// ✅ ÉXITO en Nivel 1
				log.Printf("✅ [Nivel 1] Encontrado en %.2fms (caché: %v)", 
					float64(level1Result.LatencyMs), level1Result.CacheHit)
				
				result = level1Result

				// Opcional: Precarga profunda en background
				if !level1Result.CacheHit && level1Result.PlaceID != "" {
					go s.deepScrapeAsync(level1Result.PlaceID)
				}

				goto respond
			} else if level1Result.ResultCount == 0 {
				// ❌ No encontrado en Nivel 1
				log.Printf("❌ [Nivel 1] No encontrado")
				result = level1Result
				goto respond
			}
		}
	}

	// NIVEL 2/3: Chromium (si Nivel 1 falló o force_chromium=true)
	log.Printf("🌐 [Nivel 2] Usando Chromium headless")
	level = 2

	chromiumResult, err := s.chromiumScrape(ctx, negocio, ciudad)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("Error en scraping: %v", err))
		return
	}

	result = chromiumResult

respond:
	// Agregar metadata de rendimiento
	response := map[string]interface{}{
		"data":        result,
		"level":       level,
		"latency_ms":  time.Since(startTime).Milliseconds(),
		"timestamp":   time.Now().Format(time.RFC3339),
	}

	respondJSON(w, response)
}

// handleBatchSearch maneja búsquedas múltiples en paralelo
func (s *Server) handleBatchSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var request struct {
		Queries []struct {
			Negocio string `json:"negocio"`
			Ciudad  string `json:"ciudad"`
		} `json:"queries"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		respondError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	if len(request.Queries) == 0 {
		respondError(w, http.StatusBadRequest, "Array 'queries' vacío")
		return
	}

	if len(request.Queries) > 50 {
		respondError(w, http.StatusBadRequest, "Máximo 50 queries por lote")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Convertir a formato del scraper
	queryPairs := make([]nivel1.QueryPair, len(request.Queries))
	for i, q := range request.Queries {
		queryPairs[i] = nivel1.QueryPair{
			Negocio: q.Negocio,
			Ciudad:  q.Ciudad,
		}
	}

	// Ejecutar búsqueda batch
	results, err := s.level1Scraper.BatchSearch(ctx, queryPairs)
	if err != nil {
		log.Printf("⚠️  Error en batch search: %v", err)
	}

	respondJSON(w, map[string]interface{}{
		"results": results,
		"count":   len(results),
	})
}

// handleStats devuelve estadísticas del caché
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	cache := nivel1.NewLevel1Cache(s.db, 30)
	
	stats, err := cache.GetStats(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("Error obteniendo stats: %v", err))
		return
	}

	topQueries, err := cache.GetTopQueries(ctx, 10)
	if err != nil {
		log.Printf("⚠️  Error obteniendo top queries: %v", err)
	}

	response := map[string]interface{}{
		"cache_stats": stats,
		"top_queries": topQueries,
	}

	respondJSON(w, response)
}

// handleHealth endpoint de salud
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	// Verificar conexión a DB
	if err := s.db.Ping(); err != nil {
		respondError(w, http.StatusServiceUnavailable, "Database no disponible")
		return
	}

	respondJSON(w, map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.0",
		"level1":    "enabled",
	})
}

// chromiumScrape delega al contenedor Docker de Chromium
func (s *Server) chromiumScrape(ctx context.Context, negocio, ciudad string) (map[string]interface{}, error) {
	// Implementar llamada al contenedor Docker existente
	// Esto es un placeholder - adaptar a tu implementación actual
	
	log.Printf("🌐 Llamando a Chromium: %s", s.chromiumURL)
	
	// Ejemplo:
	// client := &http.Client{Timeout: 30 * time.Second}
	// url := fmt.Sprintf("%s/scrape?negocio=%s&ciudad=%s", s.chromiumURL, negocio, ciudad)
	// resp, err := client.Get(url)
	// ...
	
	return map[string]interface{}{
		"message": "Chromium scraping (implementar según tu código actual)",
		"negocio": negocio,
		"ciudad":  ciudad,
	}, nil
}

// deepScrapeAsync lanza scraping profundo en background
func (s *Server) deepScrapeAsync(placeID string) {
	log.Printf("🔄 [Background] Scraping profundo de placeID: %s", placeID)
	// Implementar lógica de scraping profundo
}

// respondJSON responde con JSON
func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// respondError responde con error
func respondError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   message,
		"code":    code,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// getEnv obtiene variable de entorno con valor por defecto
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Close cierra conexiones
func (s *Server) Close() error {
	if s.level1Scraper != nil {
		s.level1Scraper.Close()
	}
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// main punto de entrada
func main() {
	log.Println("🚀 Iniciando Monitor de Reputación Digital - Backend")
	log.Println("📦 Versión 1.2 con Nivel 1 (HTTP Puro)")

	server, err := NewServer()
	if err != nil {
		log.Fatalf("❌ Error iniciando servidor: %v", err)
	}
	defer server.Close()

	if err := server.Start(); err != nil {
		log.Fatalf("❌ Error en servidor: %v", err)
	}
}
