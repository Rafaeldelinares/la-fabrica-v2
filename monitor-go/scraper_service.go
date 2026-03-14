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
	"strconv"
	"time"

	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
)

// Rate Limiter: 10 requests per minute
var googleLimiter = rate.NewLimiter(rate.Every(time.Minute/10), 1)

// Orchestrator: callScraper manages the high-level fallback logic
func callScraper(query string, depth int) ([]ScraperResultItem, error) {
	// 0. Rate Limiting Check
	if err := googleLimiter.Wait(context.Background()); err != nil {
		return nil, fmt.Errorf("rate limiter error: %v", err)
	}

	var results []ScraperResultItem
	var err error

	orchestratorLog := log.WithFields(logrus.Fields{
		"component": "orchestrator",
		"query":     query,
		"depth":     depth,
	})

	// 1. Try Nano Scraper (Only for low depth)
	if depth <= 3 {
		orchestratorLog.Info("Attempting Nano Scraper")
		results, err = executeScraperJob(query, depth, "NANO")
		if err == nil {
			return results, nil
		}
		orchestratorLog.WithError(err).Warn("Nano failed. Switching to Heavy...")
	}

	// 2. Try Heavy Scraper (If Nano failed OR if depth > 3)
	orchestratorLog.Info("Attempting Heavy Scraper")
	results, err = executeScraperJob(query, depth, "HEAVY")
	if err == nil {
		return results, nil
	}
	orchestratorLog.WithError(err).Warn("Heavy failed. Checking stale cache...")

	// 3. Fallback to Stale Cache (Last Resort - up to 7 days old)
	if cachedData, found := getFallbackFromDB(query, 7); found {
		orchestratorLog.Info("Recovered data from stale cache")
		return convertFrontendDataToScraperResult(cachedData), nil
	}

	return nil, fmt.Errorf("ALL SYSTEMS FAILED: Nano, Heavy, and Cache. Last error: %v", err)
}

// Low-level execution of a single scraper job
func executeScraperJob(query string, depth int, scraperType string) ([]ScraperResultItem, error) {
	targetURL := NanoScraperURL
	timeoutDuration := NanoTimeout

	if scraperType == "HEAVY" {
		targetURL = HeavyScraperURL
		timeoutDuration = HeavyTimeout
	}

	jobLog := log.WithFields(logrus.Fields{
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

	body, _ := json.Marshal(jobReq)

	// Post for Job ID
	resp, err := client.Post(targetURL, "application/json", bytes.NewBuffer(body))
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
		
		time.Sleep(2 * time.Second)

		statusResp, err := client.Get(targetURL + "/" + jobStatus.ID)
		if err != nil {
			jobLog.WithError(err).Warn("Error polling status")
			continue 
		}

		var currentStatus ScraperStatusResponse
		if err := json.NewDecoder(statusResp.Body).Decode(&currentStatus); err != nil {
			statusResp.Body.Close()
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
	csvUrl := fmt.Sprintf("%s/%s/results/csv", targetURL, jobStatus.ID)
	csvResp, err := client.Get(csvUrl)
	if err != nil {
		return nil, fmt.Errorf("error al descargar resultados de %s: %v", scraperType, err)
	}
	defer csvResp.Body.Close()

	if csvResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error en respuesta CSV de %s: status %d", scraperType, csvResp.StatusCode)
	}

	return parseScraperCSV(csvResp.Body)
}

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
		
		// ✅ FILTRO NUEVO: Ignorar resultados basura (rating=0, reviews=0)
		// Estos son típicamente datos de prueba o scrapers que no extrajeron bien
		//rating, _ := strconv.ParseFloat(item.ReviewRating, 64)
		//reviewCount, _ := strconv.Atoi(item.ReviewCount)
		
		// Si tiene rating 0 Y reviews 0 Y tiene nombre, probablemente es basura
		// PERO: permitimos pasar si tiene dirección o teléfono (puede ser negocio nuevo)
		
		//if rating == 0 && reviewCount == 0 {
		//	hasRealData := item.Address != "" || item.Phone != "" || item.Website != ""
		//	if !hasRealData {
		//		// Skip este resultado - es basura
		//		continue
		//	}
		//}

		// solo filtrar si el titulo esta vacio o es claramente basura
		if item.Title == "" || item.Title == "opositare" {
			continue
		}


		
		items = append(items, item)
	}
	return items, nil
}

func getValue(row []string, m map[string]int, key string) string {
	if idx, ok := m[key]; ok && idx < len(row) {
		return row[idx]
	}
	return ""
}

// Helper for Fallback: Convert FrontendData back to ScraperResultItem
func convertFrontendDataToScraperResult(data *FrontendData) []ScraperResultItem {
	// Reconstruct JSON for reviews_per_rating map
	breakdownJSON, _ := json.Marshal(data.Breakdown)

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
