# Local SEO Best Practices (BrightLocal 2026 + Comunidad)

> Documentación de referencia para el equipo del CRM ByBusiness sobre SEO local y GBP (Google Business Profile). Basado en el ranking factors survey de BrightLocal 2026 + comunidad open source.

---

## Top 15 Local Pack Ranking Factors (BrightLocal 2026)

| # | Factor | Peso | ¿Lo scrapeamos? | Acción |
|---|--------|------|-----------------|--------|
| 1 | Primary GBP category | 32% | ✅ | En informe |
| 2 | Proximity to search | - | ❌ | No scrapeable |
| 3 | Keywords en business title | - | ❌ | Requiere scraping profundo |
| 4 | Physical address en city | - | ✅ | lat/lng |
| 5 | Business open at search time | 32% | ✅ | horarios |
| 6 | High star ratings | 20% | ✅ | rating |
| 7 | Address shows on GBP | - | ✅ | address |
| 8 | **Additional GBP categories** | 32% | ✅ | categorias_adicionales |
| 9 | Number of native reviews with text | 20% | ✅ | reviews_count |
| 10 | Map pin placed correctly | - | ❌ | No scrapeable |
| 11 | **Recency of reviews** | 20% | ✅ | ultima_review_fecha |
| 12 | Proximity to center | - | ❌ | No scrapeable |
| 13 | Click-through rate | - | ❌ | No scrapeable |
| 14 | **Steady growth of reviews** | 20% | ⚠️ parcial | Requiere histórico |
| 15 | **HTML NAP matching GBP NAP** | 5% | ✅ | nap_consistency check |

**Pesos por grupo** (Local Pack 2026):
- GBP: 32%
- Reviews: 20%
- On-page: 15%
- Behavioral: 9%
- Links: 8%
- Citations: 6%
- Personalization: 6%
- Social: 5%

---

## Lo que SÍ scrapeamos (8 factores de los top 15)

| Factor | Implementación |
|--------|----------------|
| Categoría principal | `categoria_principal` del wrapper |
| Rating | `rating` del wrapper |
| Reviews count | `reviews_count` del wrapper |
| Categorías adicionales | `categorias_adicionales` (array) del wrapper |
| Horarios | `horarios` (dict 7 días) del wrapper |
| Reviews recientes | `ultima_review_fecha` (timestamp) |
| Antigüedad perfil | `antiguedad_dias` (calculado desde "Se unió en") |
| NAP consistency | análisis sobre nombre/dirección/teléfono |

## Lo que NO scrapeamos (7 factores)

| Factor | Por qué |
|--------|---------|
| Proximity | Depende de la ubicación del usuario que busca |
| Keywords en business title | Requiere scraping profundo del HTML |
| Click-through rate | Solo Google tiene esa data |
| Map pin placement | No scrapeable |
| Backlinks/Citations | Requieren APIs externas o scraping masivo |
| Behavioral signals | CTR, dwell time — solo Google los ve |
| Steady growth of reviews | Necesitamos histórico (no tenemos DB de 6 meses) |

---

## Recursos externos utilizados

### Repos clonados/integrados

1. **[gbp-industry-categories](https://github.com/carbondigitalus/gbp-industry-categories)** (carbondigitalus)
   - Tabla PostgreSQL con ~4000 categorías GBP oficiales
   - Usado como **Source 1** (oficial) en `categorias_curadas.validate()`
   - Importado en `infraestructura.gbp_industry_categories`

2. **[tribu-seo-local](https://github.com/marcgarciaseo/tribu-seo-local)** (marcgarciaseo)
   - Skill SEO local **en ESPAÑOL** para España/México/LATAM
   - Referencia para adaptar el informe a mercado hispano

3. **[google-business-profile-skill](https://github.com/qianquandong/google-business-profile-skill)** (qianquandong)
   - Field guide bilingüe 44 capítulos
   - Referencia para edge cases y decisiones

4. **[gbp-reviews-insights](https://github.com/novotergum/gbp-reviews-insights)** (novotergum)
   - Patrón para automatizar exports de reviews
   - Roadmap: integración futura con nuestro CRM

5. **[napdetector](https://github.com/mgracen/napdetector)** (mgracen)
   - Lógica NAP consistency
   - Adaptado a `analisis_competencia.py:analyze_nap_consistency()`

### Repos referenciados (no integrados)

- [gbp-optimizer](https://github.com/Adambrett14/gbp-optimizer) — generador PDF audit (futuro)
- [ai-answer-check](https://github.com/FoundagentTest/ai-answer-check) — AI visibility monitoring (futuro)
- [local-falcon/mcp](https://github.com/local-falcon/mcp) — geo-grid (requiere API key)
- [semperi/restaurant-marketing-skills](https://github.com/semperi/restaurant-marketing-skills) — solo restaurantes

---

## Flujo del Informe Competitivo

```
Para cada cliente:
  1. Wrapper scrapea top 10 competidores (con cookies Google válidas)
  2. detector + analisis_competencia.py genera informe:
     - Plus SEO scoring (7 factores + NAP = 8)
     - Lista curada valida sugerencias de categoria
     - Heurísticas: rating, reviews, fotos, horarios, antiguedad, NAP
  3. Output JSON se inserta en clientes.informes_competencia
  4. UI admin-only muestra:
     - Score visual (verde/amarillo/rojo)
     - Tabla comparativa cliente vs competidores
     - Recomendaciones priorizadas
     - Histórico de evolución
```

## Cómo funciona la lista curada (categorias_curadas.py)

```
Lista curada (lib/data/gbp-categories-curated.json):
  - Bootstrap inicial: 13 categorías del mercado español real
  - Discovery: cada scrape agrega categorías de clientes y competidores
  - Win count: incrementa cuando un competidor rankea mejor
  - Gold: 3+ wins + rating_avg >=4.3

Validación (validate):
  Nivel 1 (alta confianza): gold OR oficial GBP
  Nivel 2 (media): validada por discovery OR en oficial
  Nivel 3 (baja): no encontrada (experimental)
```

---

## Lo que NO impacta ranking (¡importante!)

BrightLocal 2026 confirma:
- ❌ Geo-tagged photos uploaded to GBP
- ❌ Keywords en owner responses
- ❌ Keywords en GBP description
- ❌ Quantity of Google posts/updates
- ❌ Quantity of questions in Q&A

Y lo que SÍ impacta negativamente:
- ❌ Incorrect Primary Category
- ❌ Multiple profiles same category at same address
- ❌ Business marked as Temporarily/Permanently Closed
- ❌ Low star ratings

---

## Glosario

- **GBP**: Google Business Profile (antes Google My Business)
- **NAP**: Name, Address, Phone (consistencia crítica para SEO local)
- **GCID**: Google Category ID
- **Local Pack**: Los 3 resultados locales que Google muestra arriba del orgánico
- **Plus SEO**: Conjunto de factores "extra" más allá de categoría/rating/reviews

---

## Roadmap futuro

- [ ] AI visibility check (ai-answer-check)
- [ ] PDF audit export (gbp-optimizer)
- [ ] Historical growth tracking (steady growth of reviews)
- [ ] Click-through rate proxy (via GMB Insights API cuando esté disponible)
- [ ] Reviews sentiment analysis (no solo count)
- [ ] Multi-location dashboard (cuando tengamos 10+ clientes GBP)
