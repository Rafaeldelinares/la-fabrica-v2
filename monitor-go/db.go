package main

/**
 * 🔒 MÓDULO PROTEGIDO - IA-BYBUSINESS
 * ADVERTENCIA: No modificar este código a menos que Rafael De Linares lo autorice expresamente.
 *
 * Gestión de Persistencia en PostgreSQL para Datos de Scraping
 */

import (
	"database/sql"
	"encoding/json"
	"time"

	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
)

// initDB abre y verifica la conexión a PostgreSQL, creando la tabla de caché si no existe.
func initDB(dbURL string) *sql.DB {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		logrus.Fatal("Error conectando a la base de datos: ", err)
	}

	if err = db.Ping(); err != nil {
		logrus.Fatal("Error haciendo ping a la base de datos: ", err)
	}

	createTableQuery := `
	CREATE TABLE IF NOT EXISTS scraped_cache (
		query_key TEXT PRIMARY KEY,
		data_json JSONB,
		last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err = db.Exec(createTableQuery); err != nil {
		logrus.Fatal("Error creando tabla de caché: ", err)
	}
	logrus.Info("Base de Datos Inicializada y Tabla Verificada (Persistencia Activa).")
	return db
}

// getFromDB recupera datos cacheados persistentes para la query indicada.
func (a *app) getFromDB(query string) (*FrontendData, bool) {
	var dataJSON []byte
	err := a.db.QueryRow("SELECT data_json FROM scraped_cache WHERE query_key = $1", query).Scan(&dataJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, false
		}
		logrus.WithError(err).Error("Error consultando caché DB")
		return nil, false
	}

	var data FrontendData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		logrus.WithError(err).Error("Error decodificando datos de caché DB")
		return nil, false
	}
	return &data, true
}

// getFallbackFromDB recupera datos cacheados si son más recientes que maxAgeDays días.
func (a *app) getFallbackFromDB(query string, maxAgeDays int) (*FrontendData, bool) {
	var dataJSON []byte
	var lastUpdated time.Time

	err := a.db.QueryRow("SELECT data_json, last_updated FROM scraped_cache WHERE query_key = $1", query).Scan(&dataJSON, &lastUpdated)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, false
		}
		logrus.WithError(err).Error("Error consultando caché DB (Fallback)")
		return nil, false
	}

	if time.Since(lastUpdated) > time.Duration(maxAgeDays)*24*time.Hour {
		logrus.Warnf("[FALLBACK] Datos en caché demasiado antiguos (%v)", lastUpdated)
		return nil, false
	}

	var data FrontendData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		logrus.WithError(err).Error("Error decodificando datos de caché DB (Fallback)")
		return nil, false
	}

	return &data, true
}

// saveToDB guarda o actualiza datos en la persistencia cacheada.
func (a *app) saveToDB(query string, data *FrontendData) {
	dataJSON, err := json.Marshal(data)
	if err != nil {
		logrus.WithError(err).Error("Error codificando datos para caché DB")
		return
	}

	querySQL := `
	INSERT INTO scraped_cache (query_key, data_json, last_updated)
	VALUES ($1, $2, NOW())
	ON CONFLICT (query_key) DO UPDATE
	SET data_json = EXCLUDED.data_json, last_updated = NOW();`

	if _, err = a.db.Exec(querySQL, query, dataJSON); err != nil {
		logrus.WithError(err).Error("Error guardando en caché DB")
	} else {
		logrus.WithField("query", query).Info("Datos persistidos en BD")
	}
}
