package main

import (
	"testing"
	"time"
)

// TestBuildSearchQuery verifica construcción de queries
func TestBuildSearchQuery(t *testing.T) {
	tests := []struct {
		name     string
		negocio  string
		ciudad   string
		expected string
	}{
		{
			name:     "query simple",
			negocio:  "Restaurante El Patio",
			ciudad:   "Málaga",
			expected: "Restaurante El Patio Málaga",
		},
		{
			name:     "con espacios extra",
			negocio:  "  Hotel Costa  ",
			ciudad:   "  Marbella  ",
			expected: "Hotel Costa Marbella",
		},
		{
			name:     "caracteres especiales",
			negocio:  "Bar & Grill",
			ciudad:   "Sevilla",
			expected: "Bar & Grill Sevilla",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := buildSearchQuery(tt.negocio, tt.ciudad)
			if result != tt.expected {
				t.Errorf("buildSearchQuery() = %v, esperado %v", result, tt.expected)
			}
		})
	}
}

// TestExtractPlaceID verifica extracción de placeID
func TestExtractPlaceID(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected string
	}{
		{
			name:     "formato JSON",
			html:     `{"placeId":"ChIJabcdef123456"}`,
			expected: "ChIJabcdef123456",
		},
		{
			name:     "data attribute",
			html:     `<div data-place-id="ChIJ987654321xyz">`,
			expected: "ChIJ987654321xyz",
		},
		{
			name:     "URL format",
			html:     `/place/Restaurante/ChIJtest123/`,
			expected: "ChIJtest123",
		},
		{
			name:     "no placeID",
			html:     `<div>Sin placeID aquí</div>`,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractPlaceID(tt.html)
			if result != tt.expected {
				t.Errorf("extractPlaceID() = %v, esperado %v", result, tt.expected)
			}
		})
	}
}

// TestExtractBusinessName verifica extracción de nombre
func TestExtractBusinessName(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected string
	}{
		{
			name:     "formato JSON",
			html:     `{"name":"Restaurante El Patio"}`,
			expected: "Restaurante El Patio",
		},
		{
			name:     "meta tag",
			html:     `<meta property="og:title" content="Hotel Costa del Sol">`,
			expected: "Hotel Costa del Sol",
		},
		{
			name:     "title tag",
			html:     `<title>Bar Central - Google Maps</title>`,
			expected: "Bar Central",
		},
		{
			name:     "con escape characters",
			html:     `{"name":"Caf\\u00e9 Par\\u00eds"}`,
			expected: "Café París",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractBusinessName(tt.html)
			if result != tt.expected {
				t.Errorf("extractBusinessName() = %v, esperado %v", result, tt.expected)
			}
		})
	}
}

// TestExtractRating verifica extracción de rating
func TestExtractRating(t *testing.T) {
	tests := []struct {
		name                string
		html                string
		expectedRating      float64
		expectedReviewCount int
	}{
		{
			name:                "completo",
			html:                `{"rating":4.5,"userRatingsTotal":234}`,
			expectedRating:      4.5,
			expectedReviewCount: 234,
		},
		{
			name:                "solo rating",
			html:                `{"rating":3.8}`,
			expectedRating:      3.8,
			expectedReviewCount: 0,
		},
		{
			name:                "aria-label",
			html:                `<div aria-label="4.2 estrellas">`,
			expectedRating:      4.2,
			expectedReviewCount: 0,
		},
		{
			name:                "sin datos",
			html:                `<div>Sin rating</div>`,
			expectedRating:      0,
			expectedReviewCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rating, reviewCount := extractRating(tt.html)
			if rating != tt.expectedRating {
				t.Errorf("extractRating() rating = %v, esperado %v", rating, tt.expectedRating)
			}
			if reviewCount != tt.expectedReviewCount {
				t.Errorf("extractRating() reviewCount = %v, esperado %v", reviewCount, tt.expectedReviewCount)
			}
		})
	}
}

// TestDetectSearchResults verifica detección de resultados
func TestDetectSearchResults(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected bool
	}{
		{
			name:     "con resultados",
			html:     `{"searchResults":[{"name":"Test"}]}`,
			expected: true,
		},
		{
			name:     "data attribute",
			html:     `<div data-result-index="0">`,
			expected: true,
		},
		{
			name:     "sin resultados",
			html:     `<div>Página vacía</div>`,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detectSearchResults(tt.html)
			if result != tt.expected {
				t.Errorf("detectSearchResults() = %v, esperado %v", result, tt.expected)
			}
		})
	}
}

// TestDetectRequiresJS verifica detección de necesidad de JS
func TestDetectRequiresJS(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected bool
	}{
		{
			name:     "requiere JS",
			html:     `<noscript>Please enable JavaScript</noscript>`,
			expected: true,
		},
		{
			name:     "HTML muy pequeño",
			html:     `<div>X</div>`,
			expected: true,
		},
		{
			name:     "HTML normal",
			html:     string(make([]byte, 2000)),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detectRequiresJS(tt.html)
			if result != tt.expected {
				t.Errorf("detectRequiresJS() = %v, esperado %v", result, tt.expected)
			}
		})
	}
}

// TestCleanText verifica limpieza de texto
func TestCleanText(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "con escapes",
			input:    "Texto\\ncon\\tsaltos",
			expected: "Texto con saltos",
		},
		{
			name:     "HTML entities",
			input:    "Café &amp; Bar",
			expected: "Café & Bar",
		},
		{
			name:     "espacios múltiples",
			input:    "Texto   con     espacios",
			expected: "Texto con espacios",
		},
		{
			name:     "combinado",
			input:    "  \\nRestaurante\\t&quot;El&nbsp;Patio&quot;  ",
			expected: `Restaurante "El Patio"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := cleanText(tt.input)
			if result != tt.expected {
				t.Errorf("cleanText() = %q, esperado %q", result, tt.expected)
			}
		})
	}
}

// TestExtractAllPlaceIDs verifica extracción múltiple
func TestExtractAllPlaceIDs(t *testing.T) {
	html := `
		<div data-place-id="ChIJ123">
			<a href="/place/test/ChIJ456">
			{"placeId":"ChIJ123"}
			{"placeId":"ChIJ789"}
		</div>
	`

	result := ExtractAllPlaceIDs(html)

	// Debe encontrar IDs únicos
	if len(result) < 3 {
		t.Errorf("ExtractAllPlaceIDs() encontró %d IDs, esperado al menos 3", len(result))
	}

	// Verificar que son únicos
	seen := make(map[string]bool)
	for _, id := range result {
		if seen[id] {
			t.Errorf("ExtractAllPlaceIDs() retornó ID duplicado: %s", id)
		}
		seen[id] = true
	}
}

// TestDetectBusinessType verifica detección de tipo de negocio
func TestDetectBusinessType(t *testing.T) {
	tests := []struct {
		name     string
		html     string
		expected string
	}{
		{
			name:     "restaurante",
			html:     `<div>Este es un restaurante</div>`,
			expected: "restaurante",
		},
		{
			name:     "hotel",
			html:     `{"type":"hotel","name":"Hotel Costa"}`,
			expected: "hotel",
		},
		{
			name:     "desconocido",
			html:     `<div>Negocio sin tipo</div>`,
			expected: "general",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := DetectBusinessType(tt.html)
			if result != tt.expected {
				t.Errorf("DetectBusinessType() = %v, esperado %v", result, tt.expected)
			}
		})
	}
}

// TestNewLevel1Scraper verifica inicialización
func TestNewLevel1Scraper(t *testing.T) {
	config := DefaultConfig()
	scraper := NewLevel1Scraper(nil, config)

	if scraper == nil {
		t.Error("NewLevel1Scraper() retornó nil")
	}

	if scraper.httpClient == nil {
		t.Error("httpClient no inicializado")
	}

	if scraper.config == nil {
		t.Error("config no inicializado")
	}
}

// TestDefaultConfig verifica configuración por defecto
func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()

	if config.Timeout == 0 {
		t.Error("Timeout no configurado")
	}

	if config.MaxRetries == 0 {
		t.Error("MaxRetries no configurado")
	}

	if config.UserAgent == "" {
		t.Error("UserAgent vacío")
	}

	if config.CacheTTLDays == 0 {
		t.Error("CacheTTLDays no configurado")
	}
}

// BenchmarkExtractPlaceID benchmark de extracción de placeID
func BenchmarkExtractPlaceID(b *testing.B) {
	html := `{"placeId":"ChIJabcdef123456","name":"Test"}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		extractPlaceID(html)
	}
}

// BenchmarkParseGoogleMapsHTML benchmark de parseo completo
func BenchmarkParseGoogleMapsHTML(b *testing.B) {
	html := `
		<!DOCTYPE html>
		<html>
		<head><title>Restaurante Test - Google Maps</title></head>
		<body>
			<div data-place-id="ChIJ123">
				{"name":"Restaurante Test","rating":4.5,"userRatingsTotal":100}
			</div>
		</body>
		</html>
	`
	query := "Restaurante Test Madrid"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parseGoogleMapsHTML(html, query)
	}
}

// TestSearchResult verifica estructura de resultado
func TestSearchResult(t *testing.T) {
	result := &SearchResult{
		Query:     "Test Query",
		Found:     true,
		PlaceID:   "ChIJ123",
		Name:      "Test Business",
		Level:     1,
		Timestamp: time.Now(),
		CacheHit:  false,
	}

	if result.Query != "Test Query" {
		t.Error("Query no asignado correctamente")
	}

	if !result.Found {
		t.Error("Found debe ser true")
	}

	if result.Level != 1 {
		t.Error("Level debe ser 1")
	}
}

// Ejemplo de test de integración (requiere DB)
// func TestLevel1ScraperIntegration(t *testing.T) {
// 	if testing.Short() {
// 		t.Skip("Skipping integration test")
// 	}
//
// 	db, err := sql.Open("postgres", "...")
// 	if err != nil {
// 		t.Fatal(err)
// 	}
// 	defer db.Close()
//
// 	cache := NewLevel1Cache(db, 30)
// 	scraper := NewLevel1Scraper(cache, DefaultConfig())
//
// 	ctx := context.Background()
// 	result, err := scraper.Search(ctx, "Restaurante", "Madrid")
//
// 	if err != nil {
// 		t.Fatalf("Error en búsqueda: %v", err)
// 	}
//
// 	if result == nil {
// 		t.Fatal("Resultado es nil")
// 	}
// }
