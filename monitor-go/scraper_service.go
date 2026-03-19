/**
 * 🔒 MÓDULO PROTEGIDO - IA-BYBUSINESS
 * ADVERTENCIA: No modificar este código a menos que Rafael De Linares lo autorice expresamente.
 */

package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// callScraper gestiona la lógica de fallback de scrapers para una query de texto.
func (a *app) callScraper(ctx context.Context, query string, depth int) ([]ScraperResultItem, error) {
	if err := a.limiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limiter error: %v", err)
	}

	var results []ScraperResultItem
	var err error

	orchestratorLog := logrus.WithFields(logrus.Fields{
		"component": "orchestrator",
		"query":     query,
		"depth":     depth,
	})

	// 1. Try Nano Scraper (Only for low depth)
	if depth <= 3 {
		orchestratorLog.Info("Attempting Nano Scraper")
		results, err = a.executeScraperJob(ctx, query, depth, "NANO")
		if err == nil {
			return results, nil
		}
		orchestratorLog.WithError(err).Warn("Nano failed. Switching to Heavy...")
	}

	// 2. Try Heavy Scraper (If Nano failed OR if depth > 3)
	orchestratorLog.Info("Attempting Heavy Scraper")
	results, err = a.executeScraperJob(ctx, query, depth, "HEAVY")
	if err == nil {
		return results, nil
	}
	orchestratorLog.WithError(err).Warn("Heavy failed. Checking stale cache...")

	// 3. Try Maps Scraper (last resort — simulates real user on maps.google.com)
	orchestratorLog.Info("Attempting Maps Scraper")
	results, err = a.executeMapsJob(ctx, query)
	if err == nil {
		return results, nil
	}
	orchestratorLog.WithError(err).Warn("Maps failed. Checking stale cache...")

	// 4. Fallback to Stale Cache (absolute last resort - up to 7 days old)
	if cachedData, found := a.getFallbackFromDB(query, 7); found {
		orchestratorLog.Info("Recovered data from stale cache")
		return convertFrontendDataToScraperResult(cachedData), nil
	}

	return nil, fmt.Errorf("ALL SYSTEMS FAILED: Nano, Heavy, Maps, and Cache. Last error: %v", err)
}

// executeScraperJob ejecuta un job en el scraper indicado (NANO o HEAVY) y retorna los resultados.
func (a *app) executeScraperJob(ctx context.Context, query string, depth int, scraperType string) ([]ScraperResultItem, error) {
	targetURL := a.cfg.NanoScraperURL
	timeoutDuration := a.cfg.NanoTimeout

	if scraperType == "HEAVY" {
		targetURL = a.cfg.HeavyScraperURL
		timeoutDuration = a.cfg.HeavyTimeout
	}

	jobLog := logrus.WithFields(logrus.Fields{
		"component": "scraper_job",
		"type":      scraperType,
		"query":     query,
	})

	jobReq := ScraperJobRequest{
		Name:     "ReputationScan-" + time.Now().Format("150405"),
		Keywords: []string{query},
		Lang:     "es",
		Depth:    depth,
		MaxTime:  depth * 60,
	}

	body, err := json.Marshal(jobReq)
	if err != nil {
		return nil, fmt.Errorf("error serializando petición para %s: %v", scraperType, err)
	}

	// Post for Job ID
	postReq, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("error creando request para %s: %v", scraperType, err)
	}
	postReq.Header.Set("Content-Type", "application/json")

	resp, err := a.cfg.HTTPClient.Do(postReq)
	if err != nil {
		return nil, fmt.Errorf("error al iniciar job en %s: %v", scraperType, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error al iniciar job en %s: status %d", scraperType, resp.StatusCode)
	}

	var jobStatus ScraperStatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&jobStatus); err != nil {
		return nil, fmt.Errorf("error decodificando status inicial de %s: %v", scraperType, err)
	}

	if jobStatus.ID == "" {
		return nil, fmt.Errorf("no se recibió ID de trabajo del scraper %s", scraperType)
	}

	jobLog.WithField("job_id", jobStatus.ID).Info("Job started. Polling...")

	// Polling for completion
	startTime := time.Now()

	for {
		if time.Since(startTime) > timeoutDuration {
			return nil, fmt.Errorf("timeout en el scraper %s superado (%v)", scraperType, timeoutDuration)
		}

		select {
		case <-ctx.Done():
			return nil, fmt.Errorf("contexto cancelado durante polling de %s: %v", scraperType, ctx.Err())
		case <-time.After(2 * time.Second):
		}

		statusURL := targetURL + "/" + jobStatus.ID
		statusReq, err := http.NewRequestWithContext(ctx, http.MethodGet, statusURL, nil)
		if err != nil {
			jobLog.WithError(err).Warn("Error creando status request")
			continue
		}

		statusResp, err := a.cfg.HTTPClient.Do(statusReq)
		if err != nil {
			jobLog.WithError(err).Warn("Error polling status")
			continue
		}

		var currentStatus ScraperStatusResponse
		if err := json.NewDecoder(statusResp.Body).Decode(&currentStatus); err != nil {
			statusResp.Body.Close()
			jobLog.WithError(err).Warn("Error decodificando status, reintentando")
			continue
		}
		statusResp.Body.Close()

		if currentStatus.Status == "finished" {
			break
		}
		if currentStatus.Status == "failed" {
			return nil, fmt.Errorf("el trabajo de scraping falló en %s: %s", scraperType, currentStatus.Error)
		}
	}

	// Download and parse CSV
	csvURL := fmt.Sprintf("%s/%s/results/csv", targetURL, jobStatus.ID)
	csvReq, err := http.NewRequestWithContext(ctx, http.MethodGet, csvURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creando request CSV para %s: %v", scraperType, err)
	}

	csvResp, err := a.cfg.HTTPClient.Do(csvReq)
	if err != nil {
		return nil, fmt.Errorf("error al descargar resultados de %s: %v", scraperType, err)
	}
	defer csvResp.Body.Close()

	if csvResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error en respuesta CSV de %s: status %d", scraperType, csvResp.StatusCode)
	}

	return parseScraperCSV(csvResp.Body)
}

// parseScraperCSV parsea el CSV de resultados de un job de scraping y devuelve los items válidos.
func parseScraperCSV(r io.Reader) ([]ScraperResultItem, error) {
	reader := csv.NewReader(r)
	headers, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("error leyendo cabeceras CSV: %v", err)
	}

	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[h] = i
	}

	// Validación de columnas críticas para evitar pánicos
	required := []string{"title", "review_rating", "review_count", "reviews_per_rating"}
	for _, req := range required {
		if _, ok := headerMap[req]; !ok {
			return nil, fmt.Errorf("columna requerida '%s' no encontrada en CSV", req)
		}
	}

	var items []ScraperResultItem
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			logrus.WithError(err).Warn("error leyendo fila CSV, omitiendo")
			continue
		}

		// Protección contra filas cortas
		if len(row) < len(headers) {
			continue
		}

		item := ScraperResultItem{
			Title:            row[headerMap["title"]],
			ReviewRating:     row[headerMap["review_rating"]],
			ReviewCount:      row[headerMap["review_count"]],
			ReviewsPerRating: json.RawMessage(row[headerMap["reviews_per_rating"]]),
			Address:          getValue(row, headerMap, "address"),
			Phone:            getValue(row, headerMap, "phone"),
			Website:          getValue(row, headerMap, "website"),
			Thumbnail:        getValue(row, headerMap, "thumbnail"),
			Cid:              getValue(row, headerMap, "cid"),
			ImagesCount:      getValue(row, headerMap, "images_count"),
			IsOwnerVerified:  getValue(row, headerMap, "is_owner_verified"),
		}

		// Filtrar títulos vacíos o resultados conocidos como basura
		if item.Title == "" || item.Title == "opositare" {
			continue
		}

		items = append(items, item)
	}
	return items, nil
}

// executeMapsJob llama al scraper-maps con búsqueda por texto (último recurso).
func (a *app) executeMapsJob(ctx context.Context, query string) ([]ScraperResultItem, error) {
	type mapsRequest struct {
		Query string `json:"query"`
	}
	type mapsData struct {
		Name      string         `json:"name"`
		Rating    float64        `json:"rating"`
		Reviews   int            `json:"reviews"`
		Address   string         `json:"address"`
		Phone     string         `json:"phone"`
		Website   string         `json:"website"`
		Cid       string         `json:"cid"`
		Breakdown map[string]int `json:"breakdown"`
	}
	type mapsResponse struct {
		Found bool     `json:"found"`
		Data  mapsData `json:"data"`
	}

	body, err := json.Marshal(mapsRequest{Query: query})
	if err != nil {
		return nil, fmt.Errorf("error serializando petición maps: %v", err)
	}

	mapsClient := &http.Client{Timeout: a.cfg.MapsTimeout}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.cfg.MapsScraperURL, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("error creando request maps: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := mapsClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("maps scraper unavailable: %v", err)
	}
	defer resp.Body.Close()

	var result mapsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("maps scraper decode error: %v", err)
	}
	if !result.Found || result.Data.Name == "" {
		return nil, fmt.Errorf("maps scraper: no result found for '%s'", query)
	}

	breakdownJSON, err := json.Marshal(result.Data.Breakdown)
	if err != nil {
		breakdownJSON = []byte("{}")
	}
	item := ScraperResultItem{
		Title:            result.Data.Name,
		ReviewRating:     strconv.FormatFloat(result.Data.Rating, 'f', 1, 64),
		ReviewCount:      strconv.Itoa(result.Data.Reviews),
		ReviewsPerRating: json.RawMessage(breakdownJSON),
		Address:          result.Data.Address,
		Phone:            result.Data.Phone,
		Website:          result.Data.Website,
		Cid:              result.Data.Cid,
	}
	return []ScraperResultItem{item}, nil
}

// extractCIDFromURL extrae el CID numérico de una URL de Google Maps.
// Soporta: ?cid=DECIMAL, !1s0x{hex}:0x{hex} (el segundo hex en decimal es el CID),
// y el formato antiguo !19s{decimal}.
func extractCIDFromURL(rawURL string) (string, error) {
	// Patrón 1: ?cid=DECIMAL o &cid=DECIMAL
	if m := regexp.MustCompile(`[?&]cid=(\d+)`).FindStringSubmatch(rawURL); len(m) > 1 {
		return m[1], nil
	}

	// Patrón 2: !1s0x{hex1}:0x{hex2} — el segundo número hex es el CID como uint64
	if m := regexp.MustCompile(`!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)`).FindStringSubmatch(rawURL); len(m) > 1 {
		parts := strings.Split(m[1], ":")
		if len(parts) == 2 {
			hexStr := strings.TrimPrefix(parts[1], "0x")
			if n, err := strconv.ParseUint(hexStr, 16, 64); err == nil {
				return strconv.FormatUint(n, 10), nil
			}
		}
	}

	// Patrón 3: !19s{decimal} (formato legado)
	if m := regexp.MustCompile(`!19s(\d+)`).FindStringSubmatch(rawURL); len(m) > 1 {
		return m[1], nil
	}

	return "", fmt.Errorf("CID no encontrado en la URL")
}

// executeMapsJobByCID llama al scraper-maps navegando directamente a la URL con CID (sin búsqueda ciega).
func (a *app) executeMapsJobByCID(ctx context.Context, cidURL string) ([]ScraperResultItem, error) {
	type urlRequest struct {
		URL string `json:"url"`
	}
	type mapsData struct {
		Name      string         `json:"name"`
		Rating    float64        `json:"rating"`
		Reviews   int            `json:"reviews"`
		Address   string         `json:"address"`
		Phone     string         `json:"phone"`
		Website   string         `json:"website"`
		Cid       string         `json:"cid"`
		Breakdown map[string]int `json:"breakdown"`
	}
	type mapsResponse struct {
		Found bool     `json:"found"`
		Data  mapsData `json:"data"`
	}

	mapsURLEndpoint := strings.Replace(a.cfg.MapsScraperURL, "/maps/search", "/maps/url", 1)
	body, err := json.Marshal(urlRequest{URL: cidURL})
	if err != nil {
		return nil, fmt.Errorf("error serializando petición maps-url: %v", err)
	}

	mapsClient := &http.Client{Timeout: a.cfg.MapsTimeout}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, mapsURLEndpoint, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("error creando request maps-url: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := mapsClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("maps url scraper unavailable: %v", err)
	}
	defer resp.Body.Close()

	var result mapsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("maps url scraper decode error: %v", err)
	}
	if !result.Found || result.Data.Name == "" {
		return nil, fmt.Errorf("maps url scraper: sin datos para '%s'", cidURL)
	}

	breakdownJSON, err := json.Marshal(result.Data.Breakdown)
	if err != nil {
		breakdownJSON = []byte("{}")
	}
	item := ScraperResultItem{
		Title:            result.Data.Name,
		ReviewRating:     strconv.FormatFloat(result.Data.Rating, 'f', 1, 64),
		ReviewCount:      strconv.Itoa(result.Data.Reviews),
		ReviewsPerRating: json.RawMessage(breakdownJSON),
		Address:          result.Data.Address,
		Phone:            result.Data.Phone,
		Website:          result.Data.Website,
		Cid:              result.Data.Cid,
	}
	return []ScraperResultItem{item}, nil
}

// getValue devuelve el valor de la columna `key` de una fila CSV, o "" si no existe.
func getValue(row []string, m map[string]int, key string) string {
	if idx, ok := m[key]; ok && idx < len(row) {
		return row[idx]
	}
	return ""
}

// convertFrontendDataToScraperResult reconstruye un ScraperResultItem desde datos de caché.
func convertFrontendDataToScraperResult(data *FrontendData) []ScraperResultItem {
	breakdownJSON, marshalErr := json.Marshal(data.Breakdown)
	if marshalErr != nil {
		breakdownJSON = []byte("{}")
	}

	item := ScraperResultItem{
		Title:            data.Name,
		ReviewRating:     fmt.Sprintf("%.1f", data.Rating),
		ReviewCount:      strconv.Itoa(data.Reviews),
		ReviewsPerRating: json.RawMessage(breakdownJSON),
		Address:          data.Address,
		Phone:            data.Phone,
		Website:          data.Website,
		Thumbnail:        data.Image,
		Cid:              data.Cid,
	}

	return []ScraperResultItem{item}
}
