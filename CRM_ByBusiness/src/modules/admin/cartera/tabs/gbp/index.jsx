/**
 * tabs/gbp/index.jsx — S2 entry point.
 *
 * Unified GBP tab composing 7 collapsible sub-components:
 * GbpHeader, GbpFichaActual, GbpAudit, GbpCompetitiveConfig,
 * GbpCompetitiveAnalysis, GbpHistorico, GbpGestionPlaceId.
 *
 * RBAC: requires gbp.read (admin+supervisor). Write actions gate internally
 * with useRbac.can('gbp.write') — no "trust the parent" pattern.
 *
 * GGA: ≤150 LOC per sub-component file.
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 * @updated competitive-config-s1 (2026-08-09) — moved hooks above
 *           conditional returns to satisfy react-hooks/rules-of-hooks.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useRbac } from '../../../../../shared/auth/useRbac';
import AccessDenied from '../../../../../shared/ui/AccessDenied';
import GbpHeader from './GbpHeader';
import GbpFichaActual from './GbpFichaActual';
import GbpAudit from './GbpAudit';
import GbpHistorico from './GbpHistorico';
import GbpGestionPlaceId from './GbpGestionPlaceId';
import GbpCompetitiveAnalysis from './GbpCompetitiveAnalysis';
import GbpCompetitiveConfig from './GbpCompetitiveConfig';
import { useGbpFichas } from './hooks/useGbpFichas';

/** Section collapse defaults: Header + FichaActual open */
const DEFAULT_OPEN = { header: true, fichaActual: true, audit: false, historico: false, gestion: false, competitive: false, competitiveConfig: false };

/** Collapsible section wrapper */
const Section = ({ id, isOpen, onToggle, title, children }) => (
  <div className="border border-slate-800 rounded-sm">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-slate-900 transition-colors"
    >
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{title}</span>
      <span className="text-slate-600 text-xs">{isOpen ? '▾' : '�'}</span>
    </button>
    {isOpen && <div className="px-3 pb-3">{children}</div>}
  </div>
);
Section.propTypes = {
  id: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};

/**
 * GBP unified tab.
 *
 * Hook order (REQUIRED — do not reorder):
 *   1. useRbac, useState x3, useGbpFichas (data), useMemo, useCallback
 *   2. Conditional returns / JSX (no hooks below this line)
 *
 * @param {{ cliente: object }} props
 */
export default function GbpIndex({ cliente }) {
  // ─── Hooks (always called, in this exact order) ─────────────────────────
  const rbac = useRbac();

  const [open,        setOpen]        = useState(DEFAULT_OPEN);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [auditData,   setAuditData]   = useState(() => {
    // Restaurar desde sessionStorage para que persista entre navegaciones/recargas
    try {
      const cached = sessionStorage.getItem(`gbp-audit-${cliente.id}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) { return null; }
  });

  const { data: fichasData, isLoading: loadingFichas } = useGbpFichas(cliente.id);
  const fichas = useMemo(
    () => (fichasData?.ok ? (fichasData.fichas ?? []) : []),
    [fichasData]
  );

  const fichaActual = useMemo(() => {
    if (fichas.length > 0) return fichas[selectedIdx];
    if (cliente.google_place_id) {
      return {
        id: null,
        google_cid: cliente.google_place_id,
        tipo: 'principal',
        gmaps_nombre: cliente.nombre_comercial || '',
        gmaps_rating: null,
        gmaps_reseñas: null,
        gms_last_updated: null,
      };
    }
    return null;
  }, [fichas, selectedIdx, cliente.google_place_id, cliente.nombre_comercial]);

  const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  const handleAuditComplete = useCallback((data) => {
    setAuditData(data);
    // Persistir en sessionStorage para que sobreviva navegaciones y recargas del drawer
    try {
      if (data) {
        sessionStorage.setItem(`gbp-audit-${cliente.id}`, JSON.stringify(data));
      } else {
        sessionStorage.removeItem(`gbp-audit-${cliente.id}`);
      }
    } catch (e) { /* sessionStorage no disponible */ }
  }, [cliente.id]);

  // Si cambia el cliente seleccionado, limpiar audit cache
  useEffect(() => {
    return () => {
      try { sessionStorage.removeItem(`gbp-audit-${cliente.id}`); } catch (e) {}
    };
  }, [cliente.id]);
  // ─── End of hooks ────────────────────────────────────────────────────────

  // ─── Conditional returns (AFTER all hooks) ──────────────────────────────
  if (!rbac.can('gbp.read')) {
    return <AccessDenied permission="gbp.read" />;
  }

  if (loadingFichas) {
    return (
      <div className="flex flex-col gap-3 px-3 py-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-slate-800/40 rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  const placeId = fichaActual?.google_cid || '';
  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 px-3 py-4">
      <Section id="header" isOpen={open.header} onToggle={toggle} title="Header">
        <GbpHeader audit={auditData || (fichaActual ? {
          place_id: placeId,
          rating_promedio: fichaActual.gmaps_rating,
          reviews_count: fichaActual.gmaps_reseñas,
          _cached: true,
          _cached_at: fichaActual.gms_last_updated,
        } : null)} />
        {fichas.length > 1 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {fichas.map((f, i) => (
              <button key={f.id || i} onClick={() => setSelectedIdx(i)}
                className={`px-2 py-1 rounded-sm text-[9px] font-mono border transition-colors ${
                  selectedIdx === i
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}>
                {f.tipo || 'principal'} {f.google_cid ? f.google_cid.slice(0, 8) + '…' : ''}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section id="fichaActual" isOpen={open.fichaActual} onToggle={toggle} title="Ficha actual">
        <GbpFichaActual audit={auditData} />
      </Section>

      <Section id="audit" isOpen={open.audit} onToggle={toggle} title="Audit">
        <GbpAudit placeId={placeId} onAuditComplete={handleAuditComplete} />
      </Section>

      <Section id="competitiveConfig" isOpen={open.competitiveConfig} onToggle={toggle} title="Config. análisis competitivo">
        <GbpCompetitiveConfig cliente={cliente} />
      </Section>

      <Section id="competitive" isOpen={open.competitive} onToggle={toggle} title="Comparar con sector">
        <GbpCompetitiveAnalysis clienteId={cliente.id} existingAudit={auditData} />
      </Section>

      <Section id="historico" isOpen={open.historico} onToggle={toggle} title="Histórico">
        <GbpHistorico placeId={placeId} />
      </Section>

      <Section id="gestion" isOpen={open.gestion} onToggle={toggle} title="Gestión place_id">
        <GbpGestionPlaceId clienteId={cliente.id} initialPlaceId={placeId} />
      </Section>
    </div>
  );
}

GbpIndex.propTypes = { cliente: PropTypes.object.isRequired };
