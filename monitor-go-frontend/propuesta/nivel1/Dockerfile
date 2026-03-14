# ============================================================================
# Dockerfile Multi-Stage para Nivel 1 HTTP Scraper
# Optimizado para producción - Imagen final < 15MB
# ============================================================================

# ============================================================================
# STAGE 1: Builder
# ============================================================================
FROM golang:1.21-alpine AS builder

# Metadata
LABEL maintainer="rafael@ia-bybusiness.com"
LABEL description="Nivel 1 HTTP Scraper - Monitor de Reputación Digital"
LABEL version="1.0"

# Instalar dependencias de compilación
RUN apk add --no-cache git ca-certificates tzdata

# Directorio de trabajo
WORKDIR /build

# Copiar archivos de dependencias primero (para aprovechar caché de Docker)
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fuente
COPY nivel1/ ./nivel1/
COPY main_example.go ./

# Compilar con optimizaciones
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/reputacion-monitor \
    main_example.go

# ============================================================================
# STAGE 2: Runtime (Imagen final ultra-ligera)
# ============================================================================
FROM alpine:3.18

# Instalar solo certificados SSL y timezone data
RUN apk add --no-cache ca-certificates tzdata

# Crear usuario no-root para seguridad
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Crear directorios necesarios
RUN mkdir -p /app/logs /app/temp && \
    chown -R appuser:appuser /app

# Copiar binario compilado desde builder
COPY --from=builder /app/reputacion-monitor /app/reputacion-monitor

# Copiar archivos de migración (opcionales)
COPY nivel1/migrations/ /app/migrations/

# Cambiar a usuario no-root
USER appuser

# Directorio de trabajo
WORKDIR /app

# Variables de entorno por defecto
ENV PORT=8082 \
    DB_HOST=postgres \
    DB_PORT=5432 \
    DB_USER=reputacion_user \
    DB_NAME=reputacion \
    CHROMIUM_URL=http://chromium:8080 \
    LOG_LEVEL=info \
    TZ=Europe/Madrid

# Exponer puerto
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Comando de inicio
CMD ["/app/reputacion-monitor"]
