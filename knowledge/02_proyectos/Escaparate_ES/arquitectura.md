# Escaparate ES — Arquitectura

## 📋 Visión

Plataforma de e-commerce para pequeños negocios españoles. Permite crear y gestionar tiendas virtuales con catálogos de productos.

## 🏗️ Stack Técnico

- **Frontend**: React + Vite (SPA moderna)
- **Backend**: PHP (API REST)
- **Base de Datos**: PostgreSQL
- **Infraestructura**: Docker + n8n

## 🎨 Estándares Visuales

Sigue **Navy Industrial**:
- Paleta: `bg-slate-950`, `bg-slate-900/90`
- Acento: `#D00000` (botones primarios)
- Fuentes: Inter + JetBrains Mono
- Componentes: Max 150 líneas

## 📁 Estructura del Proyecto
```
escaparate-es/
├── src/ (componentes React)
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── styles/
├── public/ (assets)
├── dist/ (build)
├── package.json
├── vite.config.js
├── index.html
├── informe_frontend_escaparate.md (documentación)
└── README.md
```

## 🎯 Funcionalidades Principales

1. **Catálogo de Productos**
   - CRUD de productos
   - Galería de imágenes
   - Gestión de inventario

2. **Carrito de Compras**
   - Persistencia de sesión
   - Cálculo de totales
   - Aplicación de descuentos

3. **Checkout**
   - Formulario de envío
   - Procesamiento de pagos
   - Confirmación de pedidos

4. **Dashboard Vendedor**
   - Gestión de tienda
   - Estadísticas de ventas
   - Reporte de pedidos

## 🚀 Estado

- ✅ Frontend React completamente funcional
- ✅ Compilación con Vite optimizada
- ✅ Navy Industrial implementado
- ⏳ Integración con backend PHP

## 🔗 Dependencias

- `react`: Framework UI
- `vite`: Build tool
- `tailwindcss`: Estilos Navy Industrial
- Otros: Ver `package.json`

