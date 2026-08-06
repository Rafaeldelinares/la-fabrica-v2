# Design: GBP Ficha Improvements — Sprint 1

**Change:** `gbp-ficha-improvements`
**Phase:** sdd-design
**Date:** 2026-08-05
**Delivery strategy:** `ask-always` (4 chained slices, ≤400 LOC each, commits ≤3 files)

---

## 1. Technical Approach

Replace two parallel GBP tabs (`TabOptimizacionGbp.jsx` 322 LOC, `TabGbp.jsx` 793 LOC) with a single unified `TabGbpUnified` (≤150 LOC entry) that composes five collapsible sub-components. Close the supervisor RBAC bypass by gating every mutation inside each action handler (`useRbac.can('gbp.write')`), enforce the same gate server-side in n8n via JWT inspection, and convert the audit pipeline from overwrite-cache to **append-only history with drift computation**. Add a deterministic gap-analysis engine (`gaps.js`) that classifies GBP deficiencies into high/med/low severities and renders the top 5 in the Audit section.

**Sprint 1 stays in the frontend + workflow layer.** The Python scraper (`gbp_ficha_audit.py`) is untouched. The wrapper (`gbp_http_wrapper.py`) only changes its cache write target (one function) and adds a startup probe.

References: `openspec/changes/gbp-ficha-improvements/proposal/proposal.md`, `openspec/changes/gbp-ficha-improvements/specs/clientes/spec.md`, engram obs #1534 (existing feature state).

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FRONTEND (React 19 + Vite, Navy Industrial)                │
│                                                                         │
│  ClienteDrawer (cartera/)                                              │
│    └─ activeTab === 'gbp'                                              │
│       └─ <TabGbpUnified cliente={cliente} />    [gbp]                   │
│             │  useRbac().can('gbp.read') early-return guard             │
│             ▼                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  tabs/gbp/   (NEW subdirectory, every file ≤150 LOC)          │    │
│  │  ┌─────────────────────────┐                                   │    │
│  │  │ index.jsx               │ state: {openSections}, <Section>  │    │
│  │  │  ├─ <GbpHeader>         │ score + cache status pill (read)  │    │
│  │  │  ├─ <GbpFichaActual>    │ current audit (read) + top-5 gaps│    │
│  │  │  ├─ <GbpHistorico>      │ drift timeline (read)             │    │
│  │  │  ├─ <GbpAudit>          │ run audit mutation (write gate)   │    │
│  │  │  └─ <GbpGestionPlaceId> │ save place_id (write gate)        │    │
│  │  └─────────────────────────┘                                   │    │
│  │  hooks/useGbpAudit.js  (mutation wrapper, RBAC-aware)          │    │
│  │  pure/gaps.js           (pure rule engine, unit-testable)      │    │
│  └────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS webhooks only (VITE_N8N_URL)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       n8n BFF (VPS, Docker)                             │
│  CRM_GBP_FICHA_AUDIT (existing, kyWibKXBuBknk2QX)  [+ RBAC scope check]│
│  CRM_GBP_AUDIT_HISTORY_GET       (NEW, GET)                            │
│  CRM_GBP_AUDIT_DRIFT_GET         (NEW, GET)                            │
│  CRM_GBP_PLACE_ID_SAVE           (existing + RBAC scope)               │
│  All mutation POSTs: validate JWT → role must include 'gbp.write' → 403 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ SQL only (postgres-vps tunnel :5433)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL VPS — crm_bybusiness DB                                     │
│  ┌────────────────────────┐     ┌────────────────────────────────────┐ │
│  │ clientes.gbp_audit_    │     │ clientes.gbp_audit_history  (NEW) │ │
│  │ cache → DROP in S3     │     │  audit_id BIGSERIAL PK            │ │
│  │ (table was never       │     │  place_id  TEXT NOT NULL          │ │
│  │  created; see R0)      │     │  cliente_id BIGINT                │ │
│  │                        │     │  audit_data JSONB NOT NULL        │ │
│  │                        │     │  audit_source ENUM(...,'scheduled')│ │
│  │                        │     │  scrape_duration_ms INT           │ │
│  │                        │     │  audited_at TIMESTAMPTZ DEFAULT   │ │
│  │                        │     │  INDEX (place_id, audited_at DESC)│ │
│  │                        │     │                                    │ │
│  │  Read-through:         │     │  Append-only source of truth.     │ │
│  │  GET /run?place_id=X   │ ──► │  Wrapper INSERTs after every      │ │
│  │  → wrapper checks last │     │  scrape (cache hit OR miss).      │ │
│  │  history row < 24h     │     │                                    │ │
│  │  → if yes, return it   │     │                                    │ │
│  │  → if no, scrape+INSERT│     │                                    │ │
│  └────────────────────────┘     └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
       │                                                                   │
       ▼                                                                   │
┌─────────────────────────────────────────────────────────────────────────┐
│  /opt/fabrica/scripts/gbp_http_wrapper.py (port 8095)                    │
│  - S3: replace get_cache/save_cache with history read + history insert  │
│  - S3: add startup probe (stderr warning if gbp_audit_history missing)   │
│  - S3: persist audit_source = 'manual' | 'cache-refresh' (from caller)  │
└─────────────────────────────────────────────────────────────────────────┘
       │
       ▼
  Playwright headless (cookies from google_session.json) → google.com/maps
```

**RBAC gates** (red star markers):
1. **Component** — `useRbac().can('gbp.read')` returns early from `TabGbpUnified` for operador.
2. **Component** — `useRbac().can('gbp.write')` inside each action handler (`runAudit`, `savePlaceId`, `refreshCache`).
3. **Server** — RFC 7235 403 returned by n8n before any DB write when JWT role lacks `gbp.write`.

---

## 3. Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| AD-1 | Unified tab entry location | New `src/modules/admin/cartera/tabs/gbp/index.jsx` (replaces both `TabOptimizacionGbp.jsx` and `TabGbp.jsx`) | (a) Edit one of the existing tabs in place; (b) New top-level `TabGbpUnified.jsx` sibling | GGA cap: both legacy files violate 150 LOC by 2×–5×. Adding a sibling keeps the change atomic and allows renaming the legacy files to `.deprecated.jsx` instead of deleting (rollback safety). |
| AD-2 | Section collapse state | `useState<Record<string,boolean>>` in `index.jsx`, default `{header:true, fichaActual:true, audit:false, historico:false, gestion:false}` | Persist to localStorage; URL query params | State is per-drawer-instance; persistence is YAGNI for Sprint 1. Header + Ficha actual default open (most-used view). |
| AD-3 | Mutation transport | `useN8nMutation` (already exists, `useN8n.js:145`) | `useMutation + n8nPost` | Canonical per S06 pattern. `useN8nMutation` is the React Query wrapper used in `TabGbp.jsx:459` for `crm-gbp-rescrape`. |
| AD-4 | Read transport | `useN8nQuery` (existing, `useN8n.js:131`) | `useQuery + n8nGet`; `useEffect + n8nGet` | AD-4 of `crm-3-areas-improvements/design.md` already made `useN8nQuery` canonical. Sprint 1 inherits the pattern. |
| AD-5 | Gap engine location | `src/modules/admin/cartera/tabs/gbp/pure/gaps.js` exporting `computeGaps(auditData) → Gap[]` (pure function, no React) | Inline in `GbpFichaActual.jsx`; run on backend in n8n | Pure function = unit-testable without DOM. Frontend execution avoids an extra round-trip (audit JSONB is already in memory). Heuristics change easily without redeploying n8n. |
| AD-6 | Cache table strategy | **Append to `clientes.gbp_audit_history` (new) AND upsert into `clientes.gbp_audit_cache` (existing).** Wrapper keeps cache as fast-path read-through; history accumulates append-only for drift computation. | Drop cache, history only | **Discovery (R0 amended 2026-08-05):** `clientes.gbp_audit_cache` DOES exist on VPS postgres (verified via `to_regclass`, 3 rows present, last cache 2026-08-05 19:27 UTC). The original "missing table" hypothesis was wrong. S3 adds `gbp_audit_history` alongside the existing cache; UPSERT pattern stays for cache, INSERT for history. |
| AD-7 | Server-side RBAC | n8n Code node in each POST webhook decodes JWT (`$json.headers.authorization`), parses `roles` claim, checks `gbp.write`; returns `{ok:false, code:403}` if absent | Reject all anonymous calls; require signed headers | Spec REQ-2 scenario "cache bypass without gbp.write token" is mandatory. Existing CRM_60 workflow pattern (`HMAC` shared secret) is heavier than the JWT inspection we need here. Use the same JWT issued by the auth subsystem for the rest of the app. |
| AD-8 | RBAC pattern in components | Per-action check inside the handler, not at the top of the component | `useRbac.can()` once at top; HOC wrapper | Spec REQ-2: "RBAC checks MUST be implemented internally within each action handler — no 'trust the parent' delegation." An operador clicking a hidden button via dev tools still fails server-side. |
| AD-9 | Vertical (subdirectory) vs horizontal layout | **`tabs/gbp/` subdirectory** (vertical) | Single `TabGbpUnified.jsx` with helper components | Spec REQ-1 mandates section components ≤150 LOC. Vertical layout enforces the cap visually and matches the convention `src/modules/admin/{agenda,scraper,backup}/` already uses. |
| AD-10 | Drift computation locus | Backend (n8n Code node) | Frontend (in `useGbpAuditHistory`) | Backend avoids shipping the previous audit payload to the client just to compute deltas. The history-row query is small; the deltas are computed server-side over the last 2 rows. |
| AD-11 | Score calculation reuse | Re-include the existing weighted score (atributos 40 / reviews 30 / fotos 15 / desc 10 / qa 3 / posts 2) inline in `GbpHeader.jsx` | Extract to `pure/score.js` for reuse | Score is a single-component concern this sprint. Future sprint may extract if used elsewhere. |
| AD-12 | Tab removal vs `.deprecated.jsx` rename | Rename to `.deprecated.jsx` (file kept, imports removed) | Delete immediately | Saves the rollback path. The `force-chained` precedent in `crm-3-areas-improvements` also keeps legacy in `.deprecated` for safe revert. |
| AD-13 | Place ID save transport | Reuse existing `crm-cliente-google-place-id` workflow (`TabOptimizacionGbp.jsx:78`) | New `CRM_GBP_PLACE_ID_SAVE` | Already exists. Only add RBAC validation to it (S1). |
| AD-14 | Cache status pill behavior | Same UX as existing (`cacheAge` helper, "Cache: hace 3h" pill) | New "Fresh · 12m ago" component | UX continuity. Existing `cacheAge()` helper in `TabOptimizacionGbp.jsx:14-25` is small enough to inline-move into `GbpHeader.jsx`. |

---

## 4. Data Model

### 4.1 New table: `clientes.gbp_audit_history`

```sql
CREATE TABLE clientes.gbp_audit_history (
  audit_id           BIGSERIAL    PRIMARY KEY,
  place_id           TEXT         NOT NULL,
  cliente_id         BIGINT,
  audit_data         JSONB        NOT NULL,
  audit_source       TEXT         NOT NULL
                                  CHECK (audit_source IN ('manual','cache-refresh','scheduled')),
  scrape_duration_ms INTEGER,
  audited_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gbp_audit_history_place_id_audited_at
  ON clientes.gbp_audit_history (place_id, audited_at DESC);

CREATE INDEX idx_gbp_audit_history_cliente_id
  ON clientes.gbp_audit_history (cliente_id)
  WHERE cliente_id IS NOT NULL;
```

**Note on UUID vs BIGSERIAL:** spec REQ-3 says "audit_id (UUID)". BIGSERIAL is chosen because it aligns with existing project conventions (all `crm_bybusiness.gbp_*` tables use `integer`/`bigint` PKs; `information_schema` confirms). UUID adds a dependency on `pgcrypto` extension that hasn't been audited. **Open question (OQ-1)** for verify-phase: confirm with @rafael whether spec UUID is mandatory or whether BIGSERIAL is acceptable.

### 4.2 Wrapper write path (S3)

Replace `save_cache()` (lines 172-192) with `save_history()`:

```python
def save_history(place_id, cliente_id, audit_data, duration_ms, audit_source='manual'):
    """INSERT append-only row into clientes.gbp_audit_history."""
    cur.execute(
        "INSERT INTO clientes.gbp_audit_history "
        "(place_id, cliente_id, audit_data, scrape_duration_ms, audit_source) "
        "VALUES (%s, %s, %s, %s, %s)",
        (place_id, cliente_id, json.dumps(audit_data), duration_ms, audit_source),
    )
```

Replace `get_cache()` (lines 151-169) with `get_recent_history()` — returns the latest row for `place_id` if `audited_at > NOW() - INTERVAL '24 hours'`.

### 4.3 Wrapper startup probe (S3)

```python
def probe_history_table():
    try:
        conn = _get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM clientes.gbp_audit_history LIMIT 1")
        cur.execute("SELECT MAX(audited_at) FROM clientes.gbp_audit_history")
        last = cur.fetchone()[0]
        sys.stderr.write(f"[gbp_wrapper] history OK; last row at {last}\n")
        return True
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] history probe FAILED: {e}\n")
        return False
```

Called once at startup, after `init_browser()`. Visible in `journalctl -u gbp-ficha.service` — surfaces the silent failure that exists today.

### 4.4 Audit source semantics

| Source | When set | Triggered by |
|---|---|---|
| `manual` | User clicks "Auditar" button | `crm-gbp-ficha-audit` webhook default |
| `cache-refresh` | User clicks "⟳" refresh button | `crm-gbp-ficha-audit` with `refresh=true` |
| `scheduled` | (Sprint 2) cron job | not in Sprint 1 |

The n8n workflow `CRM_GBP_FICHA_AUDIT` passes `audit_source` into the wrapper via new query param `source=manual|cache-refresh`. Default: `manual`.

---

## 5. Auth / RBAC Matrix

| Action | UI gate | Server gate | Notes |
|---|---|---|---|
| View GBP tab | `gbp.read` (early-return in `TabGbpUnified`) | n/a (GET) | Operador → tab not visible in TABS list (S1) |
| Section expand (Header, Ficha, Histórico) | `gbp.read` | n/a | n8n GETs return data; no write |
| Run audit | `gbp.write` inside `handleRunAudit` | n8n CRM_GBP_FICHA_AUDIT JWT check | `useRbac.can('gbp.write')` → enable button; else render disabled |
| Save place_id | `gbp.write` inside `handleSavePlaceId` | n8n CRM_GBP_PLACE_ID_SAVE JWT check | Existing endpoint, just add server validation |
| Refresh cache (⟳) | `gbp.write` | same as Run audit (same webhook) | `refresh=true` flag |
| View Histórico | `gbp.read` | n/a (GET) | `CRM_GBP_AUDIT_HISTORY_GET` returns rows |
| View Drift摘要 | `gbp.read` | n/a (GET) | `CRM_GBP_AUDIT_DRIFT_GET` returns deltas |

**Action-permission mapping** (mirror spec REQ-2 table):

| Action | Required Permission |
|---|---|
| View GBP tab | `gbp.read` |
| Run audit | `gbp.write` |
| Save place_id | `gbp.write` |
| Refresh cache | `gbp.write` |
| View histórico | `gbp.read` |

**Existing RBAC permissions reused** (no new ones):
- `gbp.read` — supervisor, admin (ROLE_PERMISSIONS in `rbac.js:75`)
- `gbp.write` — admin only (admin expands to all permissions)

**No new RBAC permissions in this change** (matches AD-6 of `crm-3-areas-improvements/design.md`).

---

## 6. Error Handling

| Layer | Failure | Behavior |
|---|---|---|
| Component (operador opens tab) | `useRbac.can('gbp.read') === false` | Early return `<AccessDenied permission="gbp.read" />` (existing `src/shared/ui/AccessDenied.jsx`) |
| Component (supervisor clicks Auditar) | `useRbac.can('gbp.write') === false` | Button rendered `disabled`; silent no-op (per spec: "fail silently at UI level") |
| Network (n8n 12-s timeout) | Already handled by `n8nFetch` (`useN8n.js:17`) | 1 retry on network failure, no retry on timeout |
| Server (cache bypass without `gbp.write`) | JWT missing or lacks `gbp.write` | n8n Code node returns `{ok:false, code:403, error:"forbidden"}`; UI shows minimal red banner inside the section |
| Server (scraper fails) | `audit_data.error` set | Spec REQ-3 scenario "Invalid place_id": history row NOT created; UI shows "No se pudo auditar" |
| DB (history table missing) | Startup probe logs warning | `/run` works but history gets nothing; `journalctl` shows it |
| Cache hit returns 24h-old data | Normal | `GbpHeader` shows "Cache · hace 3h" pill; `⟳` button forces fresh |

The existing `clientErrorLogging` pattern (S02 of `crm-3-areas-improvements`) covers unhandled exceptions. Sprinter 1 inherits it.

---

## 7. Caching / Query Strategy

| Layer | Pattern | Used For |
|---|---|---|
| n8n workflow `CRM_GBP_AUDIT_HISTORY_GET` | `useN8nQuery(['gbp-history', placeId], 'crm-gbp-audit-history-get', { params: { place_id, limit: 10 }, staleTime: 60_000 })` | Histórico section lazy-loads when expanded |
| n8n workflow `CRM_GBP_AUDIT_DRIFT_GET` | `useN8nQuery(['gbp-drift', placeId], 'crm-gbp-audit-drift-get', { params: { place_id }, staleTime: 60_000 })` | Drift badge next to each history row |
| Wrapper cache (24h read-through) | `SELECT … FROM clientes.gbp_audit_history WHERE place_id = ? AND audited_at > NOW() - INTERVAL '24 hours' ORDER BY audited_at DESC LIMIT 1` | Wrapper-side; reduces Google cookie wear |
| `gaps.js` | Pure function | Synchronous, runs in render of `GbpFichaActual` |

Default `staleTime` 60s for history queries (low-frequency, archive-like data).

---

## 8. Dev / Prod Parity

- **Dev cache table missing:** `clientes.gbp_audit_history` does not exist on dev DB either (postgres-crm query returned empty). The wrapper probe at startup logs the failure; the wrapper itself keeps working (always scrapes). Sprint 1 must include the `CREATE TABLE` migration in the same deploy.
- **n8n workflows missing in dev:** the two new workflows (`CRM_GBP_AUDIT_HISTORY_GET`, `CRM_GBP_AUDIT_DRIFT_GET`) and the JWT validation patching of existing workflows are VPS-only. Dev environment shows "Servicio no disponible" skeleton (matching S08 pattern).
- **No localhost fallback.** All webhook URLs use `VITE_N8N_URL` (`useN8n.js:15`); no hardcoded URLs.
- **No mock data.** The component skeleton states (`"Sin gaps detectados — ficha completa"` etc.) are UI strings, not mock payloads.

---

## 9. Performance / Security / Operability

- **Performance:** 24h wrapper cache reduces Google cookie wear. History queries are O(log N) thanks to the `(place_id, audited_at DESC)` index. Drift computation runs on the last 2 rows only (no full scan).
- **Security:** Frontend never accesses PostgreSQL (rule in `openspec/config.yaml` `rules.design`). All writes via `n8nPost` with JWT validation in n8n. Scraper cookies remain in `google_session.json` (0644 permission issue noted in engram obs #1534 — **out of scope for Sprint 1**).
- **Operability:** New `gbp_audit_history` rows are append-only and never deleted (no archival policy). Volume estimate: ~5 audits/day × 365 days × 50 clients ≈ 90k rows/year at ~5KB each = ~450MB/year — acceptable for Sprint 1; cleanup is a Sprint 2 concern.

---

## 10. Per-Slice Design Notes

> Each slice ≤400 LOC, commits ≤3 files (GGA discipline). Sprint 1 = 4 chained PRs.

### S1 — RBAC mutation gates + legacy tab deprecation

| Aspect | Detail |
|---|---|
| Spec | `specs/clientes/spec.md` REQ-2 |
| Files | `src/modules/admin/cartera/tabs/gbp/index.jsx` (new, ~80 LOC — scaffold with empty sections), `src/modules/admin/cartera/tabs/TabOptimizacionGbp.jsx` → rename `.deprecated.jsx`, `src/modules/admin/cartera/tabs/TabGbp.jsx` → rename `.deprecated.jsx`, `src/modules/admin/cartera/ClienteDrawer.jsx` (modify import line 9+11) |
| Workflows | extend `CRM_GBP_FICHA_AUDIT` (kyWibKXBuBknk2QX) + `CRM_GBP_PLACE_ID_SAVE` with JWT role check; add new `n8n` branch for 403 |
| New endpoints | none |
| Tests | `src/modules/admin/cartera/tabs/gbp/GbpGestionPlaceId.rbac.test.jsx` (3 roles × 5 actions matrix) |
| Slice commit | 1 work-unit (≤3 files): create `gbp/index.jsx` + 2 file renames + 1 import swap |
| Rollback | Revert import; rename files back to `.jsx` |
| **NOT in S1** | Sub-component bodies (placeholders only); history table; gap analysis |

### S2 — Unified GBP tab scaffold (REQ-1)

| Aspect | Detail |
|---|---|
| Spec | `specs/clientes/spec.md` REQ-1 |
| Files | `src/modules/admin/cartera/tabs/gbp/GbpHeader.jsx` (new, ~80), `GbpFichaActual.jsx` (new, ~120), `GbpHistorico.jsx` (new, ~120), `GbpAudit.jsx` (new, ~100), `GbpGestionPlaceId.jsx` (new, ~100), `hooks/useGbpAudit.js` (new, ~50) |
| Workflows | none new (uses existing `crm-gbp-ficha-audit`) |
| Logic split | `GbpHeader` — score + cache status pill (reuses `cacheAge` math). `GbpFichaActual` — current audit display (moves content from `TabOptimizacionGbp.jsx:200-302`). `GbpHistorico` — placeholder (filled in S3). `GbpAudit` — run-audit mutation. `GbpGestionPlaceId` — place_id input + save. |
| Slice commit | 2 work-units: (a) sub-components + index wiring, (b) section collapse state + e2e test |
| Rollback | git revert; legacy tabs already deprecated |
| **NOT in S2** | Real history data (S3); gap analysis (S4) |

### S3 — Append-only audit history + drift detection (REQ-3)

| Aspect | Detail |
|---|---|
| Spec | `specs/clientes/spec.md` REQ-3 |
| Files | `scripts/gbp_http_wrapper.py` (modify `get_cache`/`save_cache` → history read/write + startup probe, ~50 LOC delta), `src/modules/admin/cartera/tabs/gbp/hooks/useGbpAuditHistory.js` (new, ~60), `src/modules/admin/cartera/tabs/gbp/GbpHistorico.jsx` (replace placeholder with real timeline + drift; was ~120 placeholder, stays ~150) |
| Workflows | new `CRM_GBP_AUDIT_HISTORY_GET` (GET, params `{place_id, limit=10}`; SELECT ordered DESC), new `CRM_GBP_AUDIT_DRIFT_GET` (GET, params `{place_id}`; passes last 2 history rows to Code node that computes deltas), extend `CRM_GBP_FICHA_AUDIT` with `source` query param and history INSERT after wrapper call |
| DB | `CREATE TABLE clientes.gbp_audit_history` (DDL in this slice, not separate migration — applies as part of the wrapper deploy) |
| Drift logic | Compute via n8n Code node: `fotos_added = prev.fotos_count == null ? 0 : curr.fotos_count - prev.fotos_count` (clip to ≥0). `reviews_count_delta`, `rating_delta`, `reviews_respondidas_delta` same pattern. `descripcion_changed = curr.descripcion !== prev.descripcion`. Return `{ periodo: {from: prev.audited_at, to: curr.audited_at}, ...deltas }` |
| Slice commit | 2 work-units: (a) wrapper + DB table + workflow DDL, (b) frontend hook + GbpHistorico real content |
| Acceptance dep | (none) — independently mergeable after S2 |
| Rollback | `DROP TABLE clientes.gbp_audit_history`; revert wrapper; remove new workflows |

### S4 — Gap analysis + integration (REQ-4)

| Aspect | Detail |
|---|---|
| Spec | `specs/clientes/spec.md` REQ-4 |
| Files | `src/modules/admin/cartera/tabs/gbp/pure/gaps.js` (new, ~100 LOC engine + JSDoc), `src/modules/admin/cartera/tabs/gbp/pure/gaps.test.js` (new, ~150 LOC unit tests), `src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` (modify to render top-5 gaps under "Recomendaciones" section) |
| Workflows | none |
| New endpoints | none |
| Rule set | 8 rules (high/med/low) — per spec REQ-4 table. Thresholds hardcoded in `gaps.js`; future tunability via Sprint 2 config workflow |
| Integration | `GbpFichaActual.jsx` imports `computeGaps(audit)`, renders top 5 under existing detalles block; severity badge color mirrors `crm-3-areas-improvements` Navy palette |
| Slice commit | 1 work-unit (≤3 files): engine + tests + integration |
| Rollback | Disable engine import; render stale UI |
| Acceptance dep | S2 (depends on the section scaffold) |

---

## 11. File Inventory (Sprint 1 cumulative)

| Status | Path | Purpose |
|---|---|---|
| NEW | `src/modules/admin/cartera/tabs/gbp/index.jsx` | Entry component, RBAC early-return, section state |
| NEW | `src/modules/admin/cartera/tabs/gbp/GbpHeader.jsx` | Score + cache status pill |
| NEW | `src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` | Current audit display + top-5 gaps (S4) |
| NEW | `src/modules/admin/cartera/tabs/gbp/GbpHistorico.jsx` | Drift timeline (S3) |
| NEW | `src/modules/admin/cartera/tabs/gbp/GbpAudit.jsx` | Run-audit mutation |
| NEW | `src/modules/admin/cartera/tabs/gbp/GbpGestionPlaceId.jsx` | Save place_id + RBAC matrix |
| NEW | `src/modules/admin/cartera/tabs/gbp/hooks/useGbpAudit.js` | Mutation wrapper |
| NEW | `src/modules/admin/cartera/tabs/gbp/hooks/useGbpAuditHistory.js` | History query hook (S3) |
| NEW | `src/modules/admin/cartera/tabs/gbp/pure/gaps.js` | Pure rule engine (S4) |
| NEW | `src/modules/admin/cartera/tabs/gbp/pure/gaps.test.js` | Vitest unit tests (S4) |
| NEW | `src/modules/admin/cartera/tabs/gbp/GbpGestionPlaceId.rbac.test.jsx` | Playwright RBAC matrix (S1) |
| MODIFY | `src/modules/admin/cartera/ClienteDrawer.jsx` | Swap import lines 9+11 → single `TabGbpUnified` |
| MODIFY | `scripts/gbp_http_wrapper.py` | Replace cache with history read/write + startup probe (S3) |
| RENAME | `src/modules/admin/cartera/tabs/TabOptimizacionGbp.jsx` → `.deprecated.jsx` (S1) |
| RENAME | `src/modules/admin/cartera/tabs/TabGbp.jsx` → `.deprecated.jsx` (S1) |
| NEW (n8n) | `CRM_GBP_AUDIT_HISTORY_GET` (S3) |
| NEW (n8n) | `CRM_GBP_AUDIT_DRIFT_GET` (S3) |
| MODIFY (n8n) | `CRM_GBP_FICHA_AUDIT` (kyWibKXBuBknk2QX) — JWT check + history INSERT + `source` param (S1+S3) |
| MODIFY (n8n) | `CRM_GBP_PLACE_ID_SAVE` — JWT check (S1) |
| DB | `CREATE TABLE clientes.gbp_audit_history` (S3) |

LOC budgets per slice **strictly ≤400 LOC each** (well under the 800 standard; S1 is the smallest at ~200, S3 largest at ~400).

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation | Owner Slice |
|------|------------|-----------|------------|
| **R0** ~~`clientes.gbp_audit_cache` missing on VPS~~ **AMENDED 2026-08-05: table EXISTS with data, no silent failure.** Original hypothesis was incorrect (verified via pre-apply checklist) | n/a | No mitigation needed | n/a |
| R1 RBAC bypass remains exploitable during transition | Med | S1 ships FIRST and atomically gates both legacy entries (deleted in S2) before any new flow lands | S1 |
| R2 Drill of cache<24h to history: first audit produces null drift | Certain | Expected; drift code returns `null`/0 deltas; UI shows "Primer registro — sin histórico" empty state | S3 |
| R3 Gap thresholds hardcoded → hard to tune after release | Med | `gaps.js` exposes a single `THRESHOLDS` const object at top of file; Sprint 2 can swap for an n8n-served config | S4 |
| R4 Component LOC discipline violated by lazy future edits | Med | PR review rubric: rejects any `.jsx` over 150 LOC; `tabs/gbp/` files all marked `// GGA: ≤150 LOC` in header | every |
| R5 n8n JWT validation requires JWT issuance infrastructure that may not exist on every workflow | Med | Spec REQ-2 server-side check is product-mandatory; if JWT infra missing, blocker is escalated (not skipped) | S1 |
| R6 Wrapper change requires systemd restart + cookie session revalidation | Low | Deploy window: systemd restart on `gbp-ficha.service`; cookies reloaded on next request automatically | S3 |
| R7 VPS postgres-vps tunnel down during migration → `CREATE TABLE` fails | Low | Tunnel is restart=always (already in `tunnel-postgres-vps.service`); migration re-runnable (DDL is `CREATE TABLE IF NOT EXISTS`) | S3 |
| **R8** New workflows `AUDIT_HISTORY_GET` + `AUDIT_DRIFT_GET` not yet defined in dev n8n | Med | Dev environment shows "Servicio no disponible" skeleton (matching S08 pattern) | S3 |
| **R9** Spec REQ-3 says `audit_id (UUID)`; design uses `BIGSERIAL` | Med | Open Question OQ-1; decision deferred to verify-phase with @rafael | S3 |
| **R10** Existing `crm-cliente-google-place-id` workflow may not be JWT-validated | Med | S1 includes an audit of all 4 mutation workflows; any without JWT check gets the same patch | S1 |

---

## 13. Open Questions

- **OQ-1:** Spec REQ-3 says `audit_id (UUID)`. Design uses `BIGSERIAL` for consistency with existing `gbp_*` tables. Confirm with @rafael which is the correct choice before S3 apply.
- **OQ-2:** `crm-gbp-cliente-google-place-id` workflow (used by `TabOptimizacionGbp.jsx:78`) — does it already exist on VPS under that exact name, or is it `crm-cliente-google-place-id` (without `gbp-` prefix)? Verify at apply time.
- **OQ-3:** Two legacy tabs reference `accessibility` strings (e.g., "Sin categorías secundarias") that should be i18n-friendly in the future. Sprint 1 keeps them as-is; **out of scope** for i18n.

---

## 14. Migration / Rollout

| Phase | Action | Reversible? |
|---|---|---|
| S1 deploy | File renames + import swap; n8n JWT patches | Yes — `git revert` reverts the 3 files and 2 n8n workflows |
| S2 deploy | 6 new files mounted; sub-components render | Yes — `git revert` removes the files; legacy `.deprecated.jsx` files can be re-imported |
| S3 deploy | `CREATE TABLE clientes.gbp_audit_history` (idempotent); wrapper restart; 2 new workflows | Yes — `DROP TABLE` + wrapper revert + workflow disable |
| S4 deploy | Engine + tests + integration | Yes — `git revert`; engine is a pure function with no DB state |

Each slice independently shippable. Each can be reverted without affecting earlier slices (additive only). The DB table is created in S3; if S3 is reverted, the table can be dropped (no data dependency from S4 — S4 operates on the audit JSONB which the wrapper already carries).

**Prerequisite check:** verify VPS postgres-vps tunnel is up before S3 deploy. Restart `tunnel-postgres-vps.service` if not.

---

## 15. Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `computeGaps(auditData)` — 8 rules × 3 cases (happy/edge/missing) | Vitest `gaps.test.js` (~150 LOC); runs in `npm run test` |
| E2E RBAC | `GbpGestionPlaceId.rbac.test.jsx` — 3 roles × 5 actions (15 cells) | Playwright; existing `e2e/rbac.spec.js` extended |
| E2E smoke | Unified tab renders 5 sections per role | Playwright `e2e/gbp-ficha-unified.spec.js` (S2) |
| Manual | Visual regression: Navy Industrial styling per section | Per slice |
| Backend | n8n `CRM_GBP_AUDIT_HISTORY_GET` + `CRM_GBP_AUDIT_DRIFT_GET` tested via `n8n-mcp-vps execute` before S3 merge | Per workflow |
| Manual | Verify `journalctl -u gbp-ficha.service` shows startup probe OK after S3 deploy | Post-deploy |

**No new test infrastructure required.** Reuses existing Vitest (placeholder config), Playwright (3 specs already passing), and `n8n-mcp-vps` for workflow execution.

---

## 16. Hard Constraints (self-check)

- [x] Components ≤150 LOC: every new file in `tabs/gbp/` listed in §11 with LOC budget.
- [x] No inline styles (CSS custom-property exception noted in `AGENTS.md` allowed for runtime-proportional widths; `GbpHeader` cache-age bar uses the same `--bar-w` pattern as `TabGbp.jsx:18-20`).
- [x] No new RBAC permissions (AD-6 + §5).
- [x] Frontend never hits PostgreSQL (rule in `openspec/config.yaml` `rules.design`).
- [x] No localhost fallback.
- [x] No mock data.
- [x] Each slice ≤400 changed lines (S3 is the largest at ~400).
- [x] Sprint 1 only — Sprint 2 (PDF reports, email alerts, Qwen summaries, scheduled audits) goes to "Out of Scope".

---

## 17. Out of Scope (Sprint 2+)

- PDF report generation from gaps
- Email / Slack alerts when drift crosses threshold
- Scheduled audit cron job (`audit_source = 'scheduled'`)
- Qwen-driven natural language summaries of gaps
- Multi-tenant isolation
- Google Business Profile API (paid) integration
- Detached attachment of `_cached_at` JSON in audit_data (current audit data is the full JSONB; metadata lives in dedicated columns)
- Per-user audit history views (read-only is enough for Sprint 1)
- Tunable gap thresholds via n8n-served config (Sprint 4 of `crm-3-areas-improvements/archive` shows the pattern)
- Cookie session rotation automation (today: manual every 2-4 weeks per engram obs #1534)
- `google_session.json` file permission hardening (0644 → 0600)

These are tracked in engram obs #1534 follow-ups and will be picked up as separate changes after Sprint 1 ships.
