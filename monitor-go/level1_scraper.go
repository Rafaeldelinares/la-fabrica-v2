package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Level1Scraper implementa el scraping HTTP puro sin navegador headless
type Level1Scraper struct {
	httpClient *http.Client
	cache      *Level1Cache
	config     *Level1Config
}

// Level1Config configuración del scraper nivel 1
type Level1Config struct {
	Timeout        time.Duration
	MaxRetries     int
	RetryDelay     time.Duration
	UserAgent      string
	AcceptLanguage string
	EnableCache    bool
	CacheTTLDays   int
	MaxConcurrent  int
}

// DefaultConfig retorna configuración por defecto
func DefaultConfig() *Level1Config {
	return &Level1Config{
		Timeout:        10 * time.Second,
		MaxRetries:     3,
		RetryDelay:     2 * time.Second,
		UserAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		AcceptLanguage: "es-ES,es;q=0.9,en;q=0.8",
		EnableCache:    true,
		CacheTTLDays:   30,
		MaxConcurrent:  5,
	}
}

// SearchResult resultado de búsqueda nivel 1
type SearchResult struct {
	Query        string    `json:"query"`
	Found        bool      `json:"found"`
	PlaceID      string    `json:"place_id,omitempty"`
	Name         string    `json:"name,omitempty"`
	Address      string    `json:"address,omitempty"`
	Rating       float64   `json:"rating,omitempty"`
	ReviewCount  int       `json:"review_count,omitempty"`
	HasResults   bool      `json:"has_results"`
	RequiresJS   bool      `json:"requires_js"`
	ResultCount  int       `json:"result_count"`
	Level        int       `json:"level"`
	Timestamp    time.Time `json:"timestamp"`
	LatencyMs    int64     `json:"latency_ms"`
	CacheHit     bool      `json:"cache_hit"`
	ErrorMessage string    `json:"error_message,omitempty"`
}

// NewLevel1Scraper crea una nueva instancia del scraper nivel 1
func NewLevel1Scraper(cache *Level1Cache, config *Level1Config) *Level1Scraper {
	if config == nil {
		config = DefaultConfig()
	}

	return &Level1Scraper{
		httpClient: &http.Client{
			Timeout: config.Timeout,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
				DisableCompression:  false,
				DisableKeepAlives:   false,
			},
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				// Permitir hasta 10 redirecciones
				if len(via) >= 10 {
					return errors.New("demasiadas redirecciones")
				}
				return nil
			},
		},
		cache:  cache,
		config: config,
	}
}

// Search realiza búsqueda en Google Maps usando HTTP puro
func (s *Level1Scraper) Search(ctx context.Context, negocio, ciudad string) (*SearchResult, error) {
	startTime := time.Now()

	// Construir query
	query := buildSearchQuery(negocio, ciudad)

	// Verificar caché si está habilitado
	if s.config.EnableCache {
		if cached, err := s.cache.Get(ctx, query); err == nil && cached != nil {
			cached.CacheHit = true
			cached.LatencyMs = time.Since(startTime).Milliseconds()
			return cached, nil
		}
	}

	// Realizar búsqueda HTTP
	result, err := s.searchWithRetry(ctx, query, negocio, ciudad)
	if err != nil {
		return &SearchResult{
			Query:        query,
			Found:        false,
			Level:        1,
			Timestamp:    time.Now(),
			LatencyMs:    time.Since(startTime).Milliseconds(),
			CacheHit:     false,
			ErrorMessage: err.Error(),
		}, err
	}

	// Calcular latencia
	result.LatencyMs = time.Since(startTime).Milliseconds()
	result.CacheHit = false

	// Guardar en caché si encontramos resultado
	if s.config.EnableCache && result.Found {
		go s.cache.Set(context.Background(), query, result)
	}

	return result, nil
}

// searchWithRetry realiza búsqueda con reintentos
func (s *Level1Scraper) searchWithRetry(ctx context.Context, query, negocio, ciudad string) (*SearchResult, error) {
	var lastErr error

	for attempt := 0; attempt < s.config.MaxRetries; attempt++ {
		if attempt > 0 {
			// Esperar antes de reintentar
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(s.config.RetryDelay):
			}
		}

		result, err := s.executeSearch(ctx, query, negocio, ciudad)
		if err == nil {
			return result, nil
		}

		lastErr = err

		// No reintentar en ciertos errores
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			break
		}
	}

	return nil, fmt.Errorf("búsqueda falló después de %d intentos: %w", s.config.MaxRetries, lastErr)
}

// executeSearch ejecuta una búsqueda HTTP individual
func (s *Level1Scraper) executeSearch(ctx context.Context, query, negocio, ciudad string) (*SearchResult, error) {
	// Construir URL
	mapsURL := buildMapsURL(query)

	// Crear request
	req, err := http.NewRequestWithContext(ctx, "GET", mapsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creando request: %w", err)
	}

	// Configurar headers realistas
	s.setRealisticHeaders(req)

	// Ejecutar request
	fmt.Printf("[DEBUG] Iniciando HTTP Request a: %s\n", mapsURL)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error ejecutando request: %w", err)
	}
	defer resp.Body.Close()
	fmt.Printf("[DEBUG] HTTP Response recibido. Status: %d\n", resp.StatusCode)

	// Verificar status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status code inesperado: %d", resp.StatusCode)
	}

	// Leer respuesta
	fmt.Println("[DEBUG] Leyendo cuerpo de respuesta...")
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error leyendo respuesta: %w", err)
	}
	fmt.Printf("[DEBUG] Cuerpo leído. Tamaño: %d bytes\n", len(body))

	// Parsear HTML
	fmt.Println("[DEBUG] Iniciando parsing de HTML...")
	result := parseGoogleMapsHTML(string(body), query)
	fmt.Println("[DEBUG] Parsing finalizado.")

	result.Level = 1
	result.Timestamp = time.Now()

	return result, nil
}

// setRealisticHeaders configura headers HTTP realistas
func (s *Level1Scraper) setRealisticHeaders(req *http.Request) {
	req.Header.Set("User-Agent", s.config.UserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", s.config.AcceptLanguage)
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("DNT", "1")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "none")
	req.Header.Set("Cache-Control", "max-age=0")
	// Cookies para saltar consentimiento (CRÍTICO)
	req.Header.Set("Cookie", "CONSENT=YES+CB.20230220-10-p0.es+FX+266; SOCS=CAESAg==; NID=511=e0gEwaGYe3Yx-E6t_uGgD2yI9A_gJ8qKxZcQ9lR1vT0.D0u4r3o2n1a.M4i5s6s7i8o9n")
}

// buildSearchQuery construye query de búsqueda
func buildSearchQuery(negocio, ciudad string) string {
	return fmt.Sprintf("%s %s", strings.TrimSpace(negocio), strings.TrimSpace(ciudad))
}

// buildMapsURL construye URL de Google Maps
func buildMapsURL(query string) string {
	return fmt.Sprintf("https://www.google.com/maps/search/%s", url.QueryEscape(query))
}

// BatchSearch realiza búsquedas múltiples en paralelo (limitado por MaxConcurrent)
func (s *Level1Scraper) BatchSearch(ctx context.Context, queries []QueryPair) ([]*SearchResult, error) {
	results := make([]*SearchResult, len(queries))
	errors := make([]error, len(queries))

	// Canal para limitar concurrencia
	semaphore := make(chan struct{}, s.config.MaxConcurrent)

	// WaitGroup para esperar todas las goroutines
	type job struct {
		index int
		query QueryPair
	}

	jobs := make(chan job, len(queries))

	// Lanzar workers
	workerCount := min(s.config.MaxConcurrent, len(queries))
	for i := 0; i < workerCount; i++ {
		go func() {
			for j := range jobs {
				semaphore <- struct{}{}
				result, err := s.Search(ctx, j.query.Negocio, j.query.Ciudad)
				results[j.index] = result
				errors[j.index] = err
				<-semaphore
			}
		}()
	}

	// Enviar trabajos
	for i, q := range queries {
		jobs <- job{index: i, query: q}
	}
	close(jobs)

	// Esperar a que terminen todos
	for i := 0; i < s.config.MaxConcurrent; i++ {
		semaphore <- struct{}{}
	}

	// Verificar si hubo errores críticos
	var firstError error
	for _, err := range errors {
		if err != nil && firstError == nil {
			firstError = err
		}
	}

	return results, firstError
}

// QueryPair par de negocio-ciudad para búsquedas batch
type QueryPair struct {
	Negocio string
	Ciudad  string
}

// min helper function
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Close cierra el scraper y libera recursos
func (s *Level1Scraper) Close() error {
	s.httpClient.CloseIdleConnections()
	return nil
}
