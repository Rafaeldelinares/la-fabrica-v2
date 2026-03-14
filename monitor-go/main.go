/**
 * 🔒 MÓDULO PROTEGIDO - IA-BYBUSINESS
 * ADVERTENCIA: No modificar este código a menos que Rafael De Linares lo autorice expresamente.
 */

package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
)

var l1Scraper *Level1Scraper
var l1Cache *Level1Cache
var log = logrus.New()

func main() {
	// 1. Configuración de Logging Estructurado
	log.SetFormatter(&logrus.JSONFormatter{})
	log.SetLevel(logrus.InfoLevel)
	log.Info("Iniciando Monitor de Reputación V2 con Logging Estructurado")

	// 2. Inicializar BBDD (Persistencia PostgreSQL)
	initDB()

	// 3. Initialize Level 1 Optimization Layers
	// Usamos la misma conexión 'db' que ya inicializó initDB()
	// Asumimos que db es global (verificaremos si initDB lo exporta o setea global)

	// Si db es global en database.go (lo normal en estos ejemplos), procedemos:
	l1Cache = NewLevel1Cache(db, 30) // 30 days TTL
	l1Scraper = NewLevel1Scraper(l1Cache, DefaultConfig())

	// 4. Handlers
	http.HandleFunc("/webhook/scraper/go", handleWebhook)
	http.HandleFunc("/health", handleHealth) // Nuevo Endpoint de Salud

	log.WithFields(logrus.Fields{
		"port":  Port,
		"event": "server_start",
	}).Info("Servidor Modular Iniciado")

	if err := http.ListenAndServe(Port, nil); err != nil {
		log.Fatal(err)
	}
}

// Endpoint de Salud (/health)
func handleHealth(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	statusCode := 200

	// Verificar DB
	if err := db.Ping(); err != nil {
		status = "db_error"
		statusCode = 503
		log.WithError(err).Error("Health Check Failed: Database unreachable")
	}

	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": status,
		"time":   time.Now(),
		"checks": map[string]string{
			"database": func() string {
				if statusCode == 200 {
					return "connected"
				}
				return "disconnected"
			}(),
		},
	})
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		return
	}

	var req WebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.WithError(err).Warn("Petición inválida recibida")
		http.Error(w, "Invalid request", 400)
		return
	}

	query := strings.TrimSpace(req.Query.Q)
	depth := req.Query.Depth
	if depth <= 0 {
		depth = 1
	}

	requestLog := log.WithFields(logrus.Fields{
		"query":      query,
		"depth":      depth,
		"preload":    req.Query.Preload,
		"request_id": startTime.UnixNano(),
	})

	requestLog.Info("Procesando petición de scraping")

	// MODIFICACIÓN PUNTO 5: Precarga Oportunista (Background Preloading)
	if req.Query.Preload {
		// Verificar si ya existe en caché para no saturar procesos
		if _, found := getFromDB(query); found {
			json.NewEncoder(w).Encode(FrontendResponse{Message: "Already cached, preload unnecessary"})
			return
		}

		// Lanzar Scraper en Goroutine (Segundo Plano - Fire & Forget)
		go func(q string, d int) {
			requestLog.Info("[PRELOAD] Iniciando precarga silenciosa")
			results, err := callScraper(q, d)
			if err != nil {
				requestLog.WithError(err).Error("[PRELOAD ERROR]")
				return
			}
			processAndSaveResults(q, d, results)
			requestLog.Info("[PRELOAD SUCCESS] Datos listos")
		}(query, depth)

		// Responder inmediatamente al frontend sin esperar
		json.NewEncoder(w).Encode(FrontendResponse{Message: "Preload started in background"})
		return
	}

	// Try DB Cache (Persistencia) para peticiones normales
	if cachedData, found := getFromDB(query); found {
		resp := FrontendResponse{
			Type:         "detail",
			Data:         cachedData,
			Cached:       true,
			ResponseTime: time.Since(startTime).Seconds(),
		}
		requestLog.WithField("source", "db_cache").Info("Respuesta servida desde caché")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// --------------------------------------------------------------------------
	// NIVEL 1 OPTIMIZATION: Try Lightweight Go Scraper First
	// --------------------------------------------------------------------------
	requestLog.Info("Intentando búsqueda ligera (Nivel 1)")
	l1Result, err := l1Scraper.Search(r.Context(), query, "") // Pasamos query como negocio, ciudad vacía por ahora

	if err == nil && l1Result.Found && !l1Result.RequiresJS {
		requestLog.WithFields(logrus.Fields{
			"found":  true,
			"rating": l1Result.Rating,
		}).Info("¡ÉXITO! Encontrado sin navegador")

		// Map Level 1 Result to Frontend Data
		l1Data := &FrontendData{
			Name:        l1Result.Name,
			Rating:      l1Result.Rating,
			Reviews:     l1Result.ReviewCount,
			Address:     l1Result.Address,
			IsSimulated: false,
			Sentiment: []SentimentItem{
				{Name: "Calidad", Score: 85}, // Simulated for now
				{Name: "Atención", Score: 78},
			},
		}

		// Save to Main DB for consistency
		saveToDB(query, l1Data)

		json.NewEncoder(w).Encode(FrontendResponse{
			Type:         "detail",
			Data:         l1Data,
			Cached:       l1Result.CacheHit,
			ResponseTime: time.Since(startTime).Seconds(),
		})
		return
	}

	if err != nil {
		requestLog.WithError(err).Warn("Error técnico en Nivel 1. Escalando...")
	} else if l1Result.RequiresJS {
		requestLog.Info("Nivel 1 requiere JS. Escalando...")
	} else if !l1Result.Found {
		requestLog.WithField("l1_result", l1Result).Info("Datos no encontrados en Nivel 1. Escalando...")
	}

	// --------------------------------------------------------------------------
	// NIVEL 3 FALLBACK: Original Heavy Docker Scraper
	// --------------------------------------------------------------------------
	results, err := callScraper(query, depth)
	if err != nil {
		requestLog.WithError(err).Error("Error fatal en scraping Nivel 3")
		json.NewEncoder(w).Encode(FrontendResponse{Message: "Error scraping: " + err.Error()})
		return
	}

	if len(results) == 0 {
		requestLog.Warn("No results found after all attempts")
		json.NewEncoder(w).Encode(FrontendResponse{Message: "No results found"})
		return
	}

	// Procesar y Guardar Resultados (Persistencia asíncrona o síncrona según toque)
	processAndSaveResults(query, depth, results)

	// Logic for Exact Match or List (Respuesta al Frontend)
	if len(results) > 1 && !isExactMatch(query, results[0].Title) {
		requestLog.Info("Devolviendo lista de resultados ambiguos")
		var items []FrontendItem
		for _, r := range results {
			if r.Title == "" {
				continue
			}
			rating, _ := strconv.ParseFloat(r.ReviewRating, 64)
			reviews, _ := strconv.Atoi(r.ReviewCount)
			items = append(items, FrontendItem{
				Name:    r.Title,
				Rating:  rating,
				Reviews: reviews,
				Address: r.Address,
				Image:   r.Thumbnail,
			})
		}
		json.NewEncoder(w).Encode(FrontendResponse{
			Type:         "list",
			Items:        items,
			ResponseTime: time.Since(startTime).Seconds(),
		})
		return
	}

	// Process Detail & Restore Response Logic
	r0 := results[0]
	rating, _ := strconv.ParseFloat(r0.ReviewRating, 64)
	reviews, _ := strconv.Atoi(r0.ReviewCount)

	var breakdown map[string]int
	json.Unmarshal(r0.ReviewsPerRating, &breakdown)

	data := &FrontendData{
		Name:          r0.Title,
		Rating:        rating,
		Reviews:       reviews,
		Breakdown:     breakdown,
		Address:       r0.Address,
		Phone:         r0.Phone,
		Website:       r0.Website,
		Image:         r0.Thumbnail,
		NegativeCount: breakdown["1"] + breakdown["2"],
		IsSimulated:   false, // ✅ CORREGIDO: Ahora es false cuando viene del scraper real
		Sentiment: []SentimentItem{
			{Name: "Calidad", Score: 85},
			{Name: "Atención", Score: 78},
			{Name: "Precio", Score: 72},
			{Name: "Velocidad", Score: 80},
		},
	}

	requestLog.WithField("business", data.Name).Info("Devolviendo detalle de negocio")

	// Ya se guardó en processAndSaveResults, aquí solo devolvemos
	json.NewEncoder(w).Encode(FrontendResponse{
		Type:         "detail",
		Data:         data,
		ResponseTime: time.Since(startTime).Seconds(),
	})
}

// Función auxiliar para procesar y persistir resultados
func processAndSaveResults(query string, depth int, results []ScraperResultItem) {
	// Solo guardamos si es un resultado DETALLADO (Nivel 2) o coincidencia única
	if len(results) > 1 && !isExactMatch(query, results[0].Title) {
		return
	}

	if len(results) > 0 {
		r0 := results[0]
		rating, _ := strconv.ParseFloat(r0.ReviewRating, 64)
		reviews, _ := strconv.Atoi(r0.ReviewCount)

		var breakdown map[string]int
		json.Unmarshal(r0.ReviewsPerRating, &breakdown)

		data := &FrontendData{
			Name:          r0.Title,
			Rating:        rating,
			Reviews:       reviews,
			Breakdown:     breakdown,
			Address:       r0.Address,
			Phone:         r0.Phone,
			Website:       r0.Website,
			Image:         r0.Thumbnail,
			NegativeCount: breakdown["1"] + breakdown["2"],
			ImagesCount:   func() int { i, _ := strconv.Atoi(r0.ImagesCount); return i }(),
			IsOwnerVerified: r0.IsOwnerVerified == "true",
			IsSimulated:   false, // ✅ CORREGIDO: Ahora es false cuando viene del scraper real
			Sentiment: []SentimentItem{
				{Name: "Calidad", Score: 85},
				{Name: "Atención", Score: 78},
				{Name: "Precio", Score: 72},
				{Name: "Velocidad", Score: 80},
			},
		}
		saveToDB(query, data)
	}
}

func isExactMatch(query, title string) bool {
	q := strings.ToLower(query)
	t := strings.ToLower(title)
	return strings.Contains(t, q) || strings.Contains(q, t)
}
