---
title: "Jerarquía Frontend React — Torre de Control y Modo Túnel"
date: 2026-08-24
project: CRM_ByBusiness
version: 1.0.0
---

# Diagrama 3: Jerarquía Frontend React

**Stack**: React 19 + React Compiler + Vite 7 + Tailwind CSS v4  
**Routing**: Tab-based SPA (NO React Router)  
**State**: React Query + AuthContext  
**Auth**: 2FA TOTP vía n8n webhook

## Arquitectura de Providers (App.jsx)

```mermaid
graph TD
    A[App] --> B[QueryProvider<br/>React Query]
    A --> C[AuthProvider<br/>AuthContext]
    A --> D[ToastProvider<br/>Notificaciones]
    A --> E[ErrorBoundary]
    A --> F[N8nStatusBanner<br/>Heartbeat 2min]
    
    B --> G[n8nFetch<br/>BASE_URL: VITE_N8N_URL]
    C --> H[localStorage: op_user]
    F --> G
```

## Componentes Raíz

```mermaid
graph LR
    A[App.jsx] --> B[isAuthenticated?]
    B -->|yes| C[Dashboard.jsx]
    B -->|no| D[Login.jsx]
    
    C --> E[Layout.jsx]
    E --> F[Sidebar.jsx]
    E --> G[WorkBody.jsx]
```

## Routing por Rol (WorkBody.jsx)

```mermaid
flowchart TB
    A[WorkBody activeTab] --> B{role}
    
    B -->|admin| C[Torre de Control<br/>14 panels]
    B -->|operador| D[Modo Túnel<br/>NEXT_CALL]
    B -->|en_practicas| E[Entrenamiento<br/>TrainingMode]
    B -->|supervisor| F[SupervisorPanel<br/>Training oversight]
    
    C --> G[DASHBOARD_EXE<br/>DashboardPanel]
    C --> H[AGENDA_GLOB<br/>AgendaGlobalPanel]
    C --> I[MONITOR<br/>ScraperStatusPanel<br/>ScraperConfigPanel<br/>XiaomiCookiesPanel]
    C --> J[GBP_MGMT<br/>GbpPanel]
    C --> K[CARTERA<br/>CarteraPanel]
    C --> L[CAMPAÑAS<br/>CampanasPanel]
    C --> M[LEADS_MGMT<br/>LeadsPanel]
    C --> N[LEADS_GESTON<br/>LeadsLandingPanel]
    C --> O[CANDIDATOS<br/>CandidatosPanel]
    C --> P[USUARIOS<br/>UsuariosList]
    C --> Q[AUDITORIA<br/>AuditoriaPanel]
    C --> R[BACKUP<br/>BackupPanel]
    C --> S[AUDIT_NEW<br/>AdminAuditPanel]
    C --> T[VENTAS<br/>VentasPanel]
    C --> U[FACTURACION<br/>FacturacionPanel]
    C --> V[GESTORIA<br/>GestoriaPanel]
    
    D --> W[OperatorDashboard<br/>Zones 1-4]
    
    E --> X[EntrenamientoPanel]
    F --> Y[SupervisorPanel]
```

## Torre de Control — 14 Paneles Admin

```mermaid
graph TD
    subgraph Torre de Control ["🕐 Torre de Control (Admin)"]
        A[DASHBOARD_EXE<br/>DashboardPanel] 
        B[AGENDA_GLOB<br/>AgendaGlobalPanel]
        C[MONITOR<br/>ScraperStatusPanel<br/>ScraperConfigPanel<br/>XiaomiCookiesPanel]
        D[GBP_MGMT<br/>GbpPanel<br/>GbpDashboardPanel]
        E[CARTERA<br/>CarteraPanel<br/>tabs/gbp/<br/>tabs/facturas/<br/>tabs/contratos/]
        F[CAMPAÑAS<br/>CampanasPanel<br/>GeneradorCampanasPanel<br/>AsignarOperadoresModal]
        G[LEADS_MGMT<br/>LeadsPanel]
        H[LEADS_GESTON<br/>LeadsLandingPanel]
        I[CANDIDATOS<br/>CandidatosPanel]
        J[USUARIOS<br/>UsuariosList<br/>HorarioModal]
        K[AUDITORIA<br/>AuditoriaPanel]
        L[BACKUP<br/>BackupPanel]
        M[AUDIT_NEW<br/>AdminAuditPanel]
        N[VENTAS<br/>VentasPanel]
        O[FACTURACION<br/>FacturacionPanel<br/>GestoriaPanel]
    end
```

## Modo Túnel — 4 Zonas (OperatorDashboard)

```mermaid
graph TD
    subgraph "Modo Túnel (Operador)"
        A[OperatorDashboard] --> B[Zone1: Filtros<br/>localidad<br/>tipoNegocio<br/>campanaSeleccionada]
        A --> C[Zone2: Lead + Acción<br/>CRM_REGISTRAR_RESULTADO<br/>7 botones resultado]
        A --> D[Zone3: Callbacks<br/>llamadas_programadas<br/>pendientes]
        A --> E[Zone4: KPIs<br/>useKpiStripLogic<br/>MisFreezeList]
    end
```

## Hooks Clave

| Hook | Archivo | Uso |
|------|---------|-----|
| `useN8n` | `shared/hooks/useN8n.js` | n8nGet/n8nPost, 12s timeout, 1 retry |
| `useN8nQuery` | `shared/hooks/useN8n.js` | React Query GET |
| `useN8nMutation` | `shared/hooks/useN8n.js` | React Query POST |
| `useAuth` | `modules/auth/AuthContext.jsx` | user, login, logout, registerActivity |
| `useRbac` | `shared/auth/useRbac.js` | can(permission), permisos |
| `useOperatorData` | `hooks/useOperatorData.js` | Datos operador |
| `n8nHealthCheck` | `shared/hooks/useN8n.js` | Heartbeat n8n, 5s timeout |

## Lazy Loading (Code Splitting)

```mermaid
graph LR
    A[Initial Bundle<br/>602KB] -->|split| B[DashboardPanel]
    A -->|split| C[OperatorDashboard]
    A -->|split| D[AgendaGlobalPanel]
    A -->|split| E[CarteraPanel]
    A -->|split| F[...13 more]
    
    B -.->|lazy| G[route: DASHBOARD_EXE]
    C -.->|lazy| H[route: NEXT_CALL]
    D -.->|lazy| I[route: AGENDA_GLOB]
```

## Auth Flow

```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as Login.jsx
    participant N as n8n webhook
    participant A as AuthContext
    
    U->>L: email + password
    L->>N: POST crm-login
    N-->>L: {ok, usuario, totp_*}
    
    alt 2FA no habilitado
        L->>A: login(usuario)
        A->>A: setUser + localStorage
    else 2FA habilitado, no configurado
        L->>L: show Setup2FAScreen
        U->>L: TOTP code
        L->>N: verify totp
        N-->>L: ok
        L->>A: login(usuario)
    else 2FA configurado
        L->>L: show Verify2FAScreen
        U->>L: TOTP 6-digit
        L->>N: verify totp
        N-->>L: ok
        L->>A: login(usuario)
    end
```

## Roles y Permisos

| Rol | Panels Accesibles |
|-----|-------------------|
| admin | Torre de Control (14 panels) + Modo Túnel |
| supervisor | Training oversight + Modo Túnel |
| operador | Modo Túnel (NEXT_CALL) |
| en_practicas | Entrenamiento + Modo Túnel limitado |

## Navegación Tab-Based (NO React Router)

```javascript
// WorkBody.jsx — tab-based routing
const tabs = {
  DASHBOARD_EXE: DashboardPanel,
  AGENDA_GLOB: AgendaGlobalPanel,
  NEXT_CALL: OperatorDashboard,
  MONITOR: <ScraperStatusPanel /> + <ScraperConfigPanel />,
  // ... 14+ more
};

// activeTab string → conditional render
{activeTab === 'DASHBOARD_EXE' && <DashboardPanel />}
{activeTab === 'NEXT_CALL' && <OperatorDashboard />}
```

## Anti-patterns Frontend (NO hacer)

- ❌ console.log en producción → usar `console.warn` o logger wrapper
- ❌ setTimeout sin clearTimeout → usar refs
- ❌ Spinners circulares → usar Skeleton screens
- ❌ rounded-xl/rounded-full → usar `rounded-sm` (Navy Industrial)
- ❌ Componentes >150 líneas → split
