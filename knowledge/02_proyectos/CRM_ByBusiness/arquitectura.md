# CRM ByBusiness — Arquitectura

## 📋 Visión

Sistema de gestión de relaciones con clientes (CRM) para pequeños negocios. Permite gestionar leads, ventas, productos y operaciones comerciales.

## 🏗️ Stack Técnico

- **Backend**: PHP (API REST)
- **Frontend**: React + Vite
- **Base de Datos**: PostgreSQL (crm_bybusiness)
- **Integración**: n8n (orquestación)

## 📊 Bases de Datos

### Principales Schemas
```
crm_bybusiness
├── crm_bybusiness (leads, ventas, productos)
├── marketing (leads cualificados)
├── operaciones (tablas de barrido)
├── rrhh (candidatos, procesos)
└── social (posts, DMs)
```

## 🔄 Flujos Principales

1. **Ingesta de Leads**: Scripts Python + n8n
2. **Gestión de Ventas**: PHP API
3. **Reportes**: PostgreSQL queries

## 📁 Estructura del Proyecto
```
CRM_ByBusiness/
├── src/ (código React)
├── public/
├── ingest_leads.py (ingesta de datos)
├── ingest_protocol_v2.py (protocolo v2)
├── insert_users.sql (setup inicial)
├── migration_email.sql (migraciones)
├── package.json (dependencias)
└── vite.config.js (configuración)
```

## 🎯 Componentes Clave

- Gestión de leads
- Dashboard de ventas
- Reportes de operaciones
- Integración social (posts, DMs)

## 🚀 Estado

- ✅ Backend API funcional
- ✅ BD PostgreSQL activa
- ⏳ Frontend en desarrollo

