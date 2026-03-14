package main

import (
	"regexp"
	"strconv"
	"strings"
)

// parseGoogleMapsHTML parsea el HTML de Google Maps y extrae información
func parseGoogleMapsHTML(html, query string) *SearchResult {
	result := &SearchResult{
		Query:      query,
		Found:      false,
		HasResults: false,
		RequiresJS: false,
	}

	// Google Maps inyecta datos JSON dentro del HTML
	// Buscamos patrones específicos

	// Patrón 1: Verificar si existe placeId
	placeID := extractPlaceID(html)
	if placeID != "" {
		result.Found = true
		result.PlaceID = placeID
	}

	// Patrón 2: Extraer nombre del negocio
	name := extractBusinessName(html)
	if name != "" {
		result.Name = name
		result.Found = true
	}

	// Patrón 3: Extraer dirección
	address := extractAddress(html)
	if address != "" {
		result.Address = address
	}

	// Patrón 4: Extraer rating
	rating, reviewCount := extractRating(html)
	if rating > 0 {
		result.Rating = rating
		result.ReviewCount = reviewCount
	}

	// Patrón 5: Verificar si hay resultados de búsqueda
	if detectSearchResults(html) {
		result.HasResults = true
	}

	// Patrón 6: Detectar si requiere JavaScript
	if detectRequiresJS(html) {
		result.RequiresJS = true
	}

	// Contar resultados encontrados
	result.ResultCount = countResults(html)

	return result
}

// extractPlaceID extrae el placeId de Google Maps
func extractPlaceID(html string) string {
	// Patrón 1: "placeId":"ChIJ..."
	re1 := regexp.MustCompile(`"placeId":"(ChIJ[a-zA-Z0-9_-]+)"`)
	if matches := re1.FindStringSubmatch(html); len(matches) > 1 {
		return matches[1]
	}

	// Patrón 2: data-place-id="ChIJ..."
	re2 := regexp.MustCompile(`data-place-id="(ChIJ[a-zA-Z0-9_-]+)"`)
	if matches := re2.FindStringSubmatch(html); len(matches) > 1 {
		return matches[1]
	}

	// Patrón 3: /place/.../(ChIJ...)
	re3 := regexp.MustCompile(`/place/[^/]+/(ChIJ[a-zA-Z0-9_-]+)`)
	if matches := re3.FindStringSubmatch(html); len(matches) > 1 {
		return matches[1]
	}

	return ""
}

// extractBusinessName extrae el nombre del negocio
func extractBusinessName(html string) string {
	// Patrón 1: "name":"Nombre del Negocio"
	re1 := regexp.MustCompile(`"name"\s*:\s*"([^"]{3,100})"`)
	if matches := re1.FindStringSubmatch(html); len(matches) > 1 {
		return cleanText(matches[1])
	}

	// Patrón 2: <meta property="og:title" content="Nombre...">
	re2 := regexp.MustCompile(`<meta\s+property="og:title"\s+content="([^"]+)"`)
	if matches := re2.FindStringSubmatch(html); len(matches) > 1 {
		return cleanText(matches[1])
	}

	// Patrón 3: <title>Nombre - Google Maps</title>
	re3 := regexp.MustCompile(`<title>([^<]+?)\s*[-–]\s*Google Maps</title>`)
	if matches := re3.FindStringSubmatch(html); len(matches) > 1 {
		return cleanText(matches[1])
	}

	return ""
}

// extractAddress extrae la dirección
func extractAddress(html string) string {
	// Patrón 1: "address":"Calle..."
	re1 := regexp.MustCompile(`"address"\s*:\s*"([^"]{5,200})"`)
	if matches := re1.FindStringSubmatch(html); len(matches) > 1 {
		return cleanText(matches[1])
	}

	// Patrón 2: "formattedAddress":"Calle..."
	re2 := regexp.MustCompile(`"formattedAddress"\s*:\s*"([^"]{5,200})"`)
	if matches := re2.FindStringSubmatch(html); len(matches) > 1 {
		return cleanText(matches[1])
	}

	// Patrón 3: data-address="Calle..."
	re3 := regexp.MustCompile(`data-address="([^"]{5,200})"`)
	if matches := re3.FindStringSubmatch(html); len(matches) > 1 {
		return cleanText(matches[1])
	}

	return ""
}

// extractRating extrae rating y número de reseñas
func extractRating(html string) (float64, int) {
	var rating float64
	var reviewCount int

	// Patrón 1: "rating":4.5,"userRatingsTotal":123
	re1 := regexp.MustCompile(`"rating"\s*:\s*([0-9.]+)\s*,\s*"userRatingsTotal"\s*:\s*([0-9]+)`)
	if matches := re1.FindStringSubmatch(html); len(matches) > 2 {
		rating, _ = strconv.ParseFloat(matches[1], 64)
		reviewCount, _ = strconv.Atoi(matches[2])
		return rating, reviewCount
	}

	// Patrón 2: "rating":4.5 (separado)
	re2 := regexp.MustCompile(`"rating"\s*:\s*([0-9.]+)`)
	if matches := re2.FindStringSubmatch(html); len(matches) > 1 {
		rating, _ = strconv.ParseFloat(matches[1], 64)
	}

	// Patrón 3: "userRatingsTotal":123 (separado)
	re3 := regexp.MustCompile(`"userRatingsTotal"\s*:\s*([0-9]+)`)
	if matches := re3.FindStringSubmatch(html); len(matches) > 1 {
		reviewCount, _ = strconv.Atoi(matches[1])
	}

	// Patrón 4: aria-label="4.5 stars" o similar
	re4 := regexp.MustCompile(`aria-label="([0-9.]+)\s+(?:stars|estrellas)"`)
	if matches := re4.FindStringSubmatch(html); len(matches) > 1 && rating == 0 {
		rating, _ = strconv.ParseFloat(matches[1], 64)
	}

	// Patrón 5: (123 reseñas) o (123 reviews)
	re5 := regexp.MustCompile(`\(([0-9,]+)\s+(?:reseñas|reviews|opiniones)\)`)
	if matches := re5.FindStringSubmatch(html); len(matches) > 1 && reviewCount == 0 {
		countStr := strings.ReplaceAll(matches[1], ",", "")
		reviewCount, _ = strconv.Atoi(countStr)
	}

	return rating, reviewCount
}

// detectSearchResults detecta si hay resultados de búsqueda
func detectSearchResults(html string) bool {
	patterns := []string{
		`"searchResults"`,
		`"results":\[`,
		`data-result-index=`,
		`class=".*search.*result.*"`,
		`"features":\[`,
	}

	for _, pattern := range patterns {
		if matched, _ := regexp.MatchString(pattern, html); matched {
			return true
		}
	}

	return false
}

// detectRequiresJS detecta si la página requiere JavaScript
func detectRequiresJS(html string) bool {
	indicators := []string{
		`"requiresJS":true`,
		`noscript`,
		`Please enable JavaScript`,
		`JavaScript is required`,
		`Por favor activa JavaScript`,
	}

	htmlLower := strings.ToLower(html)

	for _, indicator := range indicators {
		if strings.Contains(htmlLower, strings.ToLower(indicator)) {
			return true
		}
	}

	// Si el HTML es muy pequeño (< 1KB) probablemente requiere JS
	if len(html) < 1024 {
		return true
	}

	return false
}

// countResults cuenta el número de resultados encontrados
func countResults(html string) int {
	// Patrón 1: Contar placeIds únicos
	re1 := regexp.MustCompile(`ChIJ[a-zA-Z0-9_-]+`)
	matches := re1.FindAllString(html, -1)

	// Eliminar duplicados
	unique := make(map[string]bool)
	for _, match := range matches {
		unique[match] = true
	}

	count := len(unique)

	// Si encontramos resultados, mínimo 1
	if count == 0 && detectSearchResults(html) {
		count = 1
	}

	return count
}

// cleanText limpia texto extraído del HTML
func cleanText(text string) string {
	// Eliminar caracteres especiales de escape
	text = strings.ReplaceAll(text, "\\n", " ")
	text = strings.ReplaceAll(text, "\\r", " ")
	text = strings.ReplaceAll(text, "\\t", " ")
	text = strings.ReplaceAll(text, "\\\"", "\"")
	text = strings.ReplaceAll(text, "\\/", "/")

	// Eliminar HTML entities
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.ReplaceAll(text, "&#39;", "'")
	text = strings.ReplaceAll(text, "&nbsp;", " ")

	// Eliminar espacios múltiples
	re := regexp.MustCompile(`\s+`)
	text = re.ReplaceAllString(text, " ")

	return strings.TrimSpace(text)
}

// ExtractAllPlaceIDs extrae todos los placeIds únicos del HTML
func ExtractAllPlaceIDs(html string) []string {
	re := regexp.MustCompile(`ChIJ[a-zA-Z0-9_-]+`)
	matches := re.FindAllString(html, -1)

	// Eliminar duplicados
	unique := make(map[string]bool)
	var result []string

	for _, match := range matches {
		if !unique[match] {
			unique[match] = true
			result = append(result, match)
		}
	}

	return result
}

// DetectBusinessType intenta detectar el tipo de negocio
func DetectBusinessType(html string) string {
	types := map[string][]string{
		"restaurante": {`"restaurante"`, `"restaurant"`, `"comida"`},
		"hotel":       {`"hotel"`, `"alojamiento"`, `"accommodation"`},
		"tienda":      {`"tienda"`, `"store"`, `"shop"`},
		"servicio":    {`"servicio"`, `"service"`},
		"salud":       {`"médico"`, `"doctor"`, `"hospital"`, `"clínica"`},
		"educación":   {`"escuela"`, `"school"`, `"universidad"`},
	}

	htmlLower := strings.ToLower(html)

	for businessType, keywords := range types {
		for _, keyword := range keywords {
			if strings.Contains(htmlLower, keyword) {
				return businessType
			}
		}
	}

	return "general"
}
