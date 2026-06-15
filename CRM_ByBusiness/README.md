# CRM ByBusiness

> Torre de Control + Modo Túnel for the ByBusiness sales team.
> React 19 + Vite + n8n + PostgreSQL.

## Quick Start

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
```

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Full system architecture, deployment, conventions
- **[docs/crm-operator-flow.md](docs/crm-operator-flow.md)** — Operator (Modo Túnel) call workflow
- **[docs/n8n-custom-image.md](docs/n8n-custom-image.md)** — Custom n8n Docker image with patches

## Project Standards

- **Style**: Navy Industrial (`bg-slate-950`, `rounded-sm`, `#D00000` accent)
- **Components**: max 150 lines, PropTypes or TypeScript
- **No circular spinners** — use Skeleton screens
- **Functions**: JSDoc comments for public APIs
- **No console.log**, no hardcoded secrets, no empty catch blocks

## Stack

- React 19 + React Compiler
- Vite 7
- Tailwind CSS v4
- n8n (orchestration backend)
- PostgreSQL (VPS)
- PHP/Python auth-service

## Deploy

```bash
npm run build
rsync -az --delete dist/ root@72.60.191.179:/var/www/crm.ia-bybusiness.com/
```

## Status

**Production deployed**: 2026-06-15
- 0 lint errors
- 0 console.log in production code
- 60+ raw fetch calls migrated to n8nGet/n8nPost
- 5 workflows hardened against SQL injection
- Custom n8n image with 2 performance patches

See `docs/ARCHITECTURE.md` for full details.
