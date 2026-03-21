/**
 * 🔒 MÓDULO PROTEGIDO - IA-BYBUSINESS
 * ADVERTENCIA: No modificar este código a menos que Rafael De Linares lo autorice expresamente.
 */

package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
)

// app agrupa las dependencias de los handlers del servidor.
type app struct {
	l1Scraper *Level1Scraper  `json:"-"`
	limiter   *rate.Limiter   `json:"-"`
	cfg       AppConfig        `json:"-"`
	db        *sql.DB          `json:"-"`
}

func main() {
	// 1. Configuración de Logging Estructurado (logger estándar logrus)
	logrus.SetFormatter(&logrus.JSONFormatter{})
	logrus.SetLevel(logrus.InfoLevel)
	logrus.Info("Iniciando Monitor de Reputación V2 con Logging Estructurado")

	// 2. Cargar configuración e inicializar BBDD
	cfg := LoadConfig()
	db := initDB(cfg.DBURL)

	// 3. Initialize Level 1 Optimization Layers
	l1Cache := NewLevel1Cache(db, 30) // 30 days TTL
	a := &app{
		l1Scraper: NewLevel1Scraper(l1Cache, DefaultConfig()),
		limiter:   rate.NewLimiter(rate.Every(time.Minute/10), 1),
		cfg:       cfg,
		db:        db,
	}

	// 4. Handlers
	http.HandleFunc("/webhook/scraper/go", a.handleWebhook)
	http.HandleFunc("/webhook/scraper/go-url", a.handleWebhookByURL)
	http.HandleFunc("/health", a.handleHealth)

	logrus.WithFields(logrus.Fields{
		"port":  cfg.Port,
		"event": "server_start",
	}).Info("Servidor Modular Iniciado")

	if err := http.ListenAndServe(cfg.Port, nil); err != nil {
		logrus.Fatal(err)
	}
}

// encodeJSON escribe la respuesta JSON en w y loguea si hay error de encoding.
func encodeJSON(w http.ResponseWriter, v interface{}) {
	if err := json.NewEncoder(w).Encode(v); err != nil {
		logrus.WithError(err).Error("error encoding JSON response")
	}
}

// parseRating convierte un string a float64 logueando si el valor no está vacío y falla.
func parseRating(s string) float64 {
	v, err := strconv.ParseFloat(s, 64)
	if err != nil && s != "" {
		logrus.WithError(err).Warn("invalid rating value: " + s)
	}
	return v
}

// parseReviews convierte un string a int logueando si el valor no está vacío y falla.
func parseReviews(s string) int {
	v, err := strconv.Atoi(s)
	if err != nil && s != "" {
		logrus.WithError(err).Warn("invalid reviews value: " + s)
	}
	return v
}

// handleHealth comprueba la disponibilidad de la base de datos.
func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	statusCode := 200

	if err := a.db.Ping(); err != nil {
		status = "db_error"
		statusCode = 503
		logrus.WithError(err).Error("Health Check Failed: Database unreachable")
	}

	w.WriteHeader(statusCode)
	encodeJSON(w, map[string]interface{}{
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

// handleWebhook procesa peticiones de scraping por texto: busca en caché, Nivel 1, y scraper Docker.
func (a *app) handleWebhook(w http.ResponseWriter, r *http.Request) {
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
		logrus.WithError(err).Warn("Petición inválida recibida")
		http.Error(w, "Invalid request", 400)
		return
	}

	query := strings.TrimSpace(req.Query.Q)
	depth := req.Query.Depth
	if depth <= 0 {
		depth = 1
	}

	requestLog := logrus.WithFields(logrus.Fields{
		"query":      query,
		"depth":      depth,
		"preload":    req.Query.Preload,
		"request_id": startTime.UnixNano(),
	})

	requestLog.Info("Procesando petición de scraping")

	// Precarga Oportunista (Background Preloading)
	if req.Query.Preload {
		if _, found := a.getFromDB(query); found {
			encodeJSON(w, FrontendResponse{Message: "Already cached, preload unnecessary"})
			return
		}

		go func(q string, d int) {
			requestLog.Info("[PRELOAD] Iniciando precarga silenciosa")
			results, err := a.callScraper(context.Background(), q, d)
			if err != nil {
				requestLog.WithError(err).Error("[PRELOAD ERROR]")
				return
			}
			a.processAndSaveResults(q, d, results)
			requestLog.Info("[PRELOAD SUCCESS] Datos listos")
		}(query, depth)

		encodeJSON(w, FrontendResponse{Message: "Preload started in background"})
		return
	}

	// Try DB Cache (Persistencia) para peticiones normales
	if cachedData, found := a.getFromDB(query); found {
		requestLog.WithField("source", "db_cache").Info("Respuesta servida desde caché")
		encodeJSON(w, FrontendResponse{
			Type:         "detail",
			Data:         cachedData,
			Cached:       true,
			ResponseTime: time.Since(startTime).Seconds(),
		})
		return
	}

	// --------------------------------------------------------------------------
	// NIVEL 1 OPTIMIZATION: Try Lightweight Go Scraper First
	// --------------------------------------------------------------------------
	requestLog.Info("Intentando búsqueda ligera (Nivel 1)")
	l1Result, err := a.l1Scraper.Search(r.Context(), query, "")

	if err == nil && l1Result.Found && !l1Result.RequiresJS {
		requestLog.WithFields(logrus.Fields{
			"found":  true,
			"rating": l1Result.Rating,
		}).Info("¡ÉXITO! Encontrado sin navegador")

		l1Data := &FrontendData{
			Name:        l1Result.Name,
			Rating:      l1Result.Rating,
			Reviews:     l1Result.ReviewCount,
			Address:     l1Result.Address,
			IsSimulated: false,
		}

		a.saveToDB(query, l1Data)

		encodeJSON(w, FrontendResponse{
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
	results, err := a.callScraper(r.Context(), query, depth)
	if err != nil {
		requestLog.WithError(err).Error("Error fatal en scraping Nivel 3")
		encodeJSON(w, FrontendResponse{Message: "Error scraping: " + err.Error()})
		return
	}

	if len(results) == 0 {
		requestLog.Warn("No results found after all attempts")
		encodeJSON(w, FrontendResponse{Message: "No results found"})
		return
	}

	a.processAndSaveResults(query, depth, results)

	// Logic for Exact Match or List (Respuesta al Frontend)
	if len(results) > 1 && !isExactMatch(query, results[0].Title) {
		requestLog.Info("Devolviendo lista de resultados ambiguos")
		var items []FrontendItem
		for _, item := range results {
			if item.Title == "" {
				continue
			}
			items = append(items, FrontendItem{
				Name:    item.Title,
				Rating:  parseRating(item.ReviewRating),
				Reviews: parseReviews(item.ReviewCount),
				Address: item.Address,
				Image:   item.Thumbnail,
			})
		}
		encodeJSON(w, FrontendResponse{
			Type:         "list",
			Items:        items,
			ResponseTime: time.Since(startTime).Seconds(),
		})
		return
	}

	r0 := results[0]
	var breakdown map[string]int
	if err := json.Unmarshal(r0.ReviewsPerRating, &breakdown); err != nil {
		logrus.WithError(err).Warn("invalid ReviewsPerRating JSON, using empty breakdown")
		breakdown = map[string]int{}
	}

	data := &FrontendData{
		Name:          r0.Title,
		Rating:        parseRating(r0.ReviewRating),
		Reviews:       parseReviews(r0.ReviewCount),
		Breakdown:     breakdown,
		Address:       r0.Address,
		Phone:         r0.Phone,
		Website:       r0.Website,
		OwnerPostUrl:  r0.OwnerPostUrl,
		Image:         r0.Thumbnail,
		NegativeCount: breakdown["1"] + breakdown["2"],
		IsSimulated:   false,
	}

	requestLog.WithField("business", data.Name).Info("Devolviendo detalle de negocio")

	encodeJSON(w, FrontendResponse{
		Type:         "detail",
		Data:         data,
		ResponseTime: time.Since(startTime).Seconds(),
	})
}

// processAndSaveResults persiste el resultado del scraping si es un match único.
func (a *app) processAndSaveResults(query string, depth int, results []ScraperResultItem) {
	if len(results) > 1 && !isExactMatch(query, results[0].Title) {
		return
	}

	if len(results) == 0 {
		return
	}

	r0 := results[0]
	var breakdown map[string]int
	if err := json.Unmarshal(r0.ReviewsPerRating, &breakdown); err != nil {
		logrus.WithError(err).Warn("invalid ReviewsPerRating JSON, using empty breakdown")
		breakdown = map[string]int{}
	}

	imagesCount, parseErr := strconv.Atoi(r0.ImagesCount)
	if parseErr != nil && r0.ImagesCount != "" {
		logrus.WithError(parseErr).Warn("invalid images_count value: " + r0.ImagesCount)
	}

	data := &FrontendData{
		Name:            r0.Title,
		Rating:          parseRating(r0.ReviewRating),
		Reviews:         parseReviews(r0.ReviewCount),
		Breakdown:       breakdown,
		Address:         r0.Address,
		Phone:           r0.Phone,
		Website:         r0.Website,
		OwnerPostUrl:    r0.OwnerPostUrl,
		Image:           r0.Thumbnail,
		NegativeCount:   breakdown["1"] + breakdown["2"],
		ImagesCount:     imagesCount,
		IsOwnerVerified: r0.IsOwnerVerified == "true",
		IsSimulated:     false,
	}
	a.saveToDB(query, data)
}

// handleWebhookByURL — motor URL directo GBP: extrae CID de la URL y navega sin búsqueda ciega.
func (a *app) handleWebhookByURL(w http.ResponseWriter, r *http.Request) {
	startTime := time.Now()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		return
	}

	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.URL) == "" {
		http.Error(w, `{"message":"campo 'url' requerido"}`, 400)
		return
	}

	reqURL := strings.TrimSpace(req.URL)
	requestLog := logrus.WithFields(logrus.Fields{
		"url":        reqURL,
		"request_id": startTime.UnixNano(),
	})
	requestLog.Info("Petición URL directa GBP recibida")

	// 1. Extraer CID de la URL (opcional — si no hay CID usamos la URL original)
	cid, cidErr := extractCIDFromURL(reqURL)

	// 2. Consultar caché por CID (solo si tenemos CID)
	if cidErr == nil {
		requestLog.WithField("cid", cid).Info("CID extraído de URL")
		cacheKey := "cid:" + cid
		if cachedData, found := a.getFromDB(cacheKey); found {
			requestLog.WithField("source", "db_cache").Info("Respuesta desde caché (CID)")
			encodeJSON(w, FrontendResponse{
				Type:         "detail",
				Data:         cachedData,
				Cached:       true,
				ResponseTime: time.Since(startTime).Seconds(),
			})
			return
		}
	} else {
		requestLog.WithError(cidErr).Info("CID no encontrado — navegando directamente a la URL")
	}

	// 3. Llamar al scraper-maps: URL canónica CID si se extrajo, o URL original
	scrapeURL := reqURL
	if cidErr == nil {
		scrapeURL = "https://www.google.com/maps/?cid=" + cid
	}
	results, err := a.executeMapsJobByCID(r.Context(), scrapeURL)
	if err != nil {
		requestLog.WithError(err).Error("Error en scraping por URL directa")
		encodeJSON(w, FrontendResponse{Message: "Error: " + err.Error()})
		return
	}

	if len(results) == 0 || results[0].Title == "" {
		encodeJSON(w, FrontendResponse{Message: "Sin datos para URL: " + scrapeURL})
		return
	}

	r0 := results[0]
	var breakdown map[string]int
	if err := json.Unmarshal(r0.ReviewsPerRating, &breakdown); err != nil {
		logrus.WithError(err).Warn("invalid ReviewsPerRating JSON, using empty breakdown")
		breakdown = map[string]int{}
	}

	resultCid := r0.Cid
	if resultCid == "" {
		resultCid = cid
	}

	data := &FrontendData{
		Name:          r0.Title,
		Rating:        parseRating(r0.ReviewRating),
		Reviews:       parseReviews(r0.ReviewCount),
		Breakdown:     breakdown,
		Address:       r0.Address,
		Phone:         r0.Phone,
		Website:       r0.Website,
		OwnerPostUrl:  r0.OwnerPostUrl,
		Cid:           resultCid,
		NegativeCount: breakdown["1"] + breakdown["2"],
		IsSimulated:   false,
	}

	cacheSaveKey := scrapeURL
	if cidErr == nil {
		cacheSaveKey = "cid:" + cid
	}
	a.saveToDB(cacheSaveKey, data)
	requestLog.WithField("business", data.Name).Info("Detalle GBP por URL devuelto")

	encodeJSON(w, FrontendResponse{
		Type:         "detail",
		Data:         data,
		ResponseTime: time.Since(startTime).Seconds(),
	})
}

// isExactMatch devuelve true si el título del resultado contiene o está contenido en la query.
func isExactMatch(query, title string) bool {
	q := strings.ToLower(query)
	t := strings.ToLower(title)
	return strings.Contains(t, q) || strings.Contains(q, t)
}
