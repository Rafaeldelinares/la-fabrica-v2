package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// Level1Cache maneja el caché de resultados en PostgreSQL
type Level1Cache struct {
	db      *sql.DB
	ttlDays int
}

// NewLevel1Cache crea una nueva instancia del caché
func NewLevel1Cache(db *sql.DB, ttlDays int) *Level1Cache {
	return &Level1Cache{
		db:      db,
		ttlDays: ttlDays,
	}
}

// Level1CacheEntry entrada en la tabla de caché
type Level1CacheEntry struct {
	ID           int64           `json:"id"`
	Query        string          `json:"query"`
	Found        bool            `json:"found"`
	PlaceID      sql.NullString  `json:"place_id"`
	Name         sql.NullString  `json:"name"`
	Address      sql.NullString  `json:"address"`
	Rating       sql.NullFloat64 `json:"rating"`
	ReviewCount  sql.NullInt64   `json:"review_count"`
	HasResults   bool            `json:"has_results"`
	RequiresJS   bool            `json:"requires_js"`
	ResultCount  int             `json:"result_count"`
	ResultData   sql.NullString  `json:"result_data"` // JSON completo del resultado
	CachedAt     time.Time       `json:"cached_at"`
	LastAccessAt sql.NullTime    `json:"last_access_at"`
	AccessCount  int             `json:"access_count"`
	TTLDays      int             `json:"ttl_days"`
}

// Get obtiene un resultado del caché
func (c *Level1Cache) Get(ctx context.Context, query string) (*SearchResult, error) {
	querySQL := `
		SELECT 
			id, query, found, place_id, name, address, 
			rating, review_count, has_results, requires_js, 
			result_count, result_data, cached_at, last_access_at, 
			access_count, ttl_days
		FROM level1_cache
		WHERE query = $1
		AND cached_at > NOW() - INTERVAL '1 day' * ttl_days
		LIMIT 1
	`

	var entry Level1CacheEntry
	err := c.db.QueryRowContext(ctx, querySQL, query).Scan(
		&entry.ID,
		&entry.Query,
		&entry.Found,
		&entry.PlaceID,
		&entry.Name,
		&entry.Address,
		&entry.Rating,
		&entry.ReviewCount,
		&entry.HasResults,
		&entry.RequiresJS,
		&entry.ResultCount,
		&entry.ResultData,
		&entry.CachedAt,
		&entry.LastAccessAt,
		&entry.AccessCount,
		&entry.TTLDays,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No encontrado en caché
	}
	if err != nil {
		return nil, fmt.Errorf("error consultando caché: %w", err)
	}

	// Actualizar contador de accesos (async)
	go c.incrementAccessCount(context.Background(), entry.ID)

	// Convertir a SearchResult
	result := &SearchResult{
		Query:       entry.Query,
		Found:       entry.Found,
		HasResults:  entry.HasResults,
		RequiresJS:  entry.RequiresJS,
		ResultCount: entry.ResultCount,
		Level:       1,
		Timestamp:   entry.CachedAt,
		CacheHit:    true,
	}

	if entry.PlaceID.Valid {
		result.PlaceID = entry.PlaceID.String
	}
	if entry.Name.Valid {
		result.Name = entry.Name.String
	}
	if entry.Address.Valid {
		result.Address = entry.Address.String
	}
	if entry.Rating.Valid {
		result.Rating = entry.Rating.Float64
	}
	if entry.ReviewCount.Valid {
		result.ReviewCount = int(entry.ReviewCount.Int64)
	}

	return result, nil
}

// Set guarda un resultado en el caché
func (c *Level1Cache) Set(ctx context.Context, query string, result *SearchResult) error {
	// Serializar resultado completo a JSON
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("error serializando resultado: %w", err)
	}

	insertSQL := `
		INSERT INTO level1_cache (
			query, found, place_id, name, address, 
			rating, review_count, has_results, requires_js, 
			result_count, result_data, cached_at, ttl_days
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (query) 
		DO UPDATE SET
			found = EXCLUDED.found,
			place_id = EXCLUDED.place_id,
			name = EXCLUDED.name,
			address = EXCLUDED.address,
			rating = EXCLUDED.rating,
			review_count = EXCLUDED.review_count,
			has_results = EXCLUDED.has_results,
			requires_js = EXCLUDED.requires_js,
			result_count = EXCLUDED.result_count,
			result_data = EXCLUDED.result_data,
			cached_at = EXCLUDED.cached_at,
			ttl_days = EXCLUDED.ttl_days
	`

	var placeID, name, address interface{}
	var rating interface{}
	var reviewCount interface{}

	if result.PlaceID != "" {
		placeID = result.PlaceID
	}
	if result.Name != "" {
		name = result.Name
	}
	if result.Address != "" {
		address = result.Address
	}
	if result.Rating > 0 {
		rating = result.Rating
	}
	if result.ReviewCount > 0 {
		reviewCount = result.ReviewCount
	}

	_, err = c.db.ExecContext(ctx, insertSQL,
		query,
		result.Found,
		placeID,
		name,
		address,
		rating,
		reviewCount,
		result.HasResults,
		result.RequiresJS,
		result.ResultCount,
		string(resultJSON),
		time.Now(),
		c.ttlDays,
	)

	if err != nil {
		return fmt.Errorf("error guardando en caché: %w", err)
	}

	return nil
}

// incrementAccessCount incrementa contador de accesos
func (c *Level1Cache) incrementAccessCount(ctx context.Context, id int64) {
	updateSQL := `
		UPDATE level1_cache 
		SET 
			access_count = access_count + 1,
			last_access_at = NOW()
		WHERE id = $1
	`

	_, err := c.db.ExecContext(ctx, updateSQL, id)
	if err != nil {
		// Log error pero no fallar
		fmt.Printf("Error incrementando access_count: %v\n", err)
	}
}

// Delete elimina una entrada del caché
func (c *Level1Cache) Delete(ctx context.Context, query string) error {
	deleteSQL := `DELETE FROM level1_cache WHERE query = $1`

	_, err := c.db.ExecContext(ctx, deleteSQL, query)
	if err != nil {
		return fmt.Errorf("error eliminando del caché: %w", err)
	}

	return nil
}

// CleanExpired limpia entradas expiradas del caché
func (c *Level1Cache) CleanExpired(ctx context.Context) (int64, error) {
	deleteSQL := `
		DELETE FROM level1_cache 
		WHERE cached_at < NOW() - INTERVAL '1 day' * ttl_days
	`

	result, err := c.db.ExecContext(ctx, deleteSQL)
	if err != nil {
		return 0, fmt.Errorf("error limpiando caché expirado: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	return rowsAffected, nil
}

// GetStats obtiene estadísticas del caché
func (c *Level1Cache) GetStats(ctx context.Context) (*CacheStats, error) {
	statsSQL := `
		SELECT 
			COUNT(*) as total_entries,
			COUNT(CASE WHEN found = true THEN 1 END) as found_entries,
			COUNT(CASE WHEN cached_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_entries,
			SUM(access_count) as total_accesses,
			AVG(access_count) as avg_accesses,
			MAX(access_count) as max_accesses,
			MIN(cached_at) as oldest_entry,
			MAX(cached_at) as newest_entry
		FROM level1_cache
		WHERE cached_at > NOW() - INTERVAL '1 day' * ttl_days
	`

	var stats CacheStats
	var oldestEntry, newestEntry sql.NullTime

	err := c.db.QueryRowContext(ctx, statsSQL).Scan(
		&stats.TotalEntries,
		&stats.FoundEntries,
		&stats.RecentEntries,
		&stats.TotalAccesses,
		&stats.AvgAccesses,
		&stats.MaxAccesses,
		&oldestEntry,
		&newestEntry,
	)

	if err != nil {
		return nil, fmt.Errorf("error obteniendo estadísticas: %w", err)
	}

	if oldestEntry.Valid {
		stats.OldestEntry = oldestEntry.Time
	}
	if newestEntry.Valid {
		stats.NewestEntry = newestEntry.Time
	}

	// Calcular hit rate
	if stats.TotalAccesses > 0 {
		stats.HitRate = float64(stats.FoundEntries) / float64(stats.TotalEntries) * 100
	}

	return &stats, nil
}

// CacheStats estadísticas del caché
type CacheStats struct {
	TotalEntries  int64     `json:"total_entries"`
	FoundEntries  int64     `json:"found_entries"`
	RecentEntries int64     `json:"recent_entries"`
	TotalAccesses int64     `json:"total_accesses"`
	AvgAccesses   float64   `json:"avg_accesses"`
	MaxAccesses   int64     `json:"max_accesses"`
	HitRate       float64   `json:"hit_rate"`
	OldestEntry   time.Time `json:"oldest_entry"`
	NewestEntry   time.Time `json:"newest_entry"`
}

// GetTopQueries obtiene las queries más buscadas
func (c *Level1Cache) GetTopQueries(ctx context.Context, limit int) ([]TopQuery, error) {
	querySQL := `
		SELECT query, access_count, cached_at, last_access_at
		FROM level1_cache
		WHERE cached_at > NOW() - INTERVAL '1 day' * ttl_days
		ORDER BY access_count DESC
		LIMIT $1
	`

	rows, err := c.db.QueryContext(ctx, querySQL, limit)
	if err != nil {
		return nil, fmt.Errorf("error obteniendo top queries: %w", err)
	}
	defer rows.Close()

	var topQueries []TopQuery

	for rows.Next() {
		var tq TopQuery
		var lastAccess sql.NullTime

		err := rows.Scan(&tq.Query, &tq.AccessCount, &tq.CachedAt, &lastAccess)
		if err != nil {
			return nil, fmt.Errorf("error escaneando fila: %w", err)
		}

		if lastAccess.Valid {
			tq.LastAccessAt = lastAccess.Time
		}

		topQueries = append(topQueries, tq)
	}

	return topQueries, nil
}

// TopQuery query más buscada
type TopQuery struct {
	Query        string    `json:"query"`
	AccessCount  int       `json:"access_count"`
	CachedAt     time.Time `json:"cached_at"`
	LastAccessAt time.Time `json:"last_access_at"`
}

// Warmup precarga las queries más comunes en memoria
func (c *Level1Cache) Warmup(ctx context.Context, queries []string) error {
	for _, query := range queries {
		_, err := c.Get(ctx, query)
		if err != nil {
			// Log pero continuar
			fmt.Printf("Error en warmup para query '%s': %v\n", query, err)
		}
	}

	return nil
}

// Close cierra la conexión a la base de datos
func (c *Level1Cache) Close() error {
	return c.db.Close()
}
