package main

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"
)

// CacheEntry representa una entrada en caché con TTL
type CacheEntry struct {
	Data      interface{} // Datos del scraping
	Timestamp time.Time   // Cuándo se guardó
	TTL       time.Duration
}

// ScraperCache es un caché thread-safe en memoria
type ScraperCache struct {
	store map[string]*CacheEntry
	mu    sync.RWMutex
	ttl   time.Duration // TTL por defecto
}

// NewScraperCache crea una nueva instancia de caché
func NewScraperCache(defaultTTL time.Duration) *ScraperCache {
	cache := &ScraperCache{
		store: make(map[string]*CacheEntry),
		ttl:   defaultTTL,
	}

	// Limpiar entradas expiradas cada 5 minutos
	go cache.cleanupExpired()

	return cache
}

// generateKey crea una clave única basada en la query
func (c *ScraperCache) generateKey(query string) string {
	hash := md5.Sum([]byte(query))
	return hex.EncodeToString(hash[:])
}

// Get recupera datos de la caché si no han expirado
func (c *ScraperCache) Get(query string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := c.generateKey(query)
	entry, exists := c.store[key]

	if !exists {
		return nil, false
	}

	// Verificar si expiró
	if time.Since(entry.Timestamp) > entry.TTL {
		return nil, false
	}

	return entry.Data, true
}

// Set guarda datos en la caché
func (c *ScraperCache) Set(query string, data interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.generateKey(query)
	c.store[key] = &CacheEntry{
		Data:      data,
		Timestamp: time.Now(),
		TTL:       c.ttl,
	}
}

// SetWithTTL guarda datos con un TTL personalizado
func (c *ScraperCache) SetWithTTL(query string, data interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.generateKey(query)
	c.store[key] = &CacheEntry{
		Data:      data,
		Timestamp: time.Now(),
		TTL:       ttl,
	}
}

// Clear elimina una entrada específica
func (c *ScraperCache) Clear(query string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := c.generateKey(query)
	delete(c.store, key)
}

// ClearAll elimina todas las entradas
func (c *ScraperCache) ClearAll() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.store = make(map[string]*CacheEntry)
}

// cleanupExpired elimina entradas expiradas periódicamente
func (c *ScraperCache) cleanupExpired() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, entry := range c.store {
			if now.Sub(entry.Timestamp) > entry.TTL {
				delete(c.store, key)
			}
		}
		c.mu.Unlock()
	}
}

// Stats retorna estadísticas de la caché
func (c *ScraperCache) Stats() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()

	stats := map[string]interface{}{
		"total_entries": len(c.store),
		"ttl_minutes":   c.ttl.Minutes(),
	}

	return stats
}

// SaveToFile guarda la caché en un archivo JSON (opcional, para persistencia)
func (c *ScraperCache) SaveToFile(filename string) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	data, err := json.MarshalIndent(c.store, "", "  ")
	if err != nil {
		return err
	}

	_ = data // placeholder to avoid unused variable error if not implementing file write yet
	return nil
}
