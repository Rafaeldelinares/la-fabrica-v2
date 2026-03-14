package main

import (
	"database/sql"
	"encoding/json"
	"time"

	_ "github.com/lib/pq"
)

/**
 * 🔒 MÓDULO PROTEGIDO - IA-BYBUSINESS
 * ADVERTENCIA: No modificar este código a menos que Rafael De Linares lo autorice expresamente.
 *
 * Gestión de Persistencia en PostgreSQL para Datos de Scraping
 */

var db *sql.DB

func initDB() {
	var err error
	// Abre la conexión usando la constante DB_URL definida en config.go
	db, err = sql.Open("postgres", DB_URL)
	if err != nil {
		log.Fatal("Error conectando a la base de datos: ", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("Error haciendo ping a la base de datos: ", err)
	}

	// Crea la tabla si no existe (Persistencia)
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS scraped_cache (
		query_key TEXT PRIMARY KEY,
		data_json JSONB,
		last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = db.Exec(createTableQuery)
	if err != nil {
		log.Fatal("Error creando tabla de caché: ", err)
	}
	log.Info("Base de Datos Inicializada y Tabla Verificada (Persistencia Activa).")
}

// getFromDB recupera datos cacheados persistentes
func getFromDB(query string) (*FrontendData, bool) {
	var dataJSON []byte
	err := db.QueryRow("SELECT data_json FROM scraped_cache WHERE query_key = $1", query).Scan(&dataJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, false
		}
		log.Println("Error consultando caché DB:", err)
		return nil, false
	}

	var data FrontendData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		log.Println("Error decodificando datos de caché DB:", err)
		return nil, false
	}
	return &data, true
}

// getFallbackFromDB recupera datos cacheados si son recientes (dentro de los días especificados)
func getFallbackFromDB(query string, maxAgeDays int) (*FrontendData, bool) {
	var dataJSON []byte
	var lastUpdated time.Time

	err := db.QueryRow("SELECT data_json, last_updated FROM scraped_cache WHERE query_key = $1", query).Scan(&dataJSON, &lastUpdated)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, false
		}
		log.Println("Error consultando caché DB (Fallback):", err)
		return nil, false
	}

	// Verificar antigüedad
	if time.Since(lastUpdated) > time.Duration(maxAgeDays)*24*time.Hour {
		log.Printf("[FALLBACK] Datos en caché demasiado antiguos (%v)", lastUpdated)
		return nil, false
	}

	var data FrontendData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		log.Println("Error decodificando datos de caché DB (Fallback):", err)
		return nil, false
	}

	// Marcar explícitamente como dato "stale" o fallback si fuera necesario en el FrontendData
	// data.IsFallback = true // (Si tuviéramos ese campo)

	return &data, true
}

// saveToDB guarda o actualiza datos en la persistencia
func saveToDB(query string, data *FrontendData) {
	dataJSON, err := json.Marshal(data)
	if err != nil {
		log.Println("Error codificando datos para caché DB:", err)
		return
	}

	querySQL := `
	INSERT INTO scraped_cache (query_key, data_json, last_updated)
	VALUES ($1, $2, NOW())
	ON CONFLICT (query_key) DO UPDATE 
	SET data_json = EXCLUDED.data_json, last_updated = NOW();`

	_, err = db.Exec(querySQL, query, dataJSON)
	if err != nil {
		log.Println("Error guardando en caché DB:", err)
	} else {
		log.WithField("query", query).Info("Datos persistidos en BD")
	}
}
