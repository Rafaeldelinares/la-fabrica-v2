/**
 * GbpIndex — Entry point del tab GBP dentro de ClienteDrawer.
 *
 * Refactor (2026-08-12) — Sidebar layout con 6 items navegables:
 *   - Resumen: GbpHeader + GbpFichaActual (vista principal)
 *   - Auditoría: GbpAuditTrail (timeline snapshots)
 *   - Actividad: GbpHeatmapActividad (popular_times 24×7)
 *   - Sector: GbpSectorCard (comparación vs sector)
 *   - Config: GbpCompetitiveConfig + GbpConfigActions
 *   - Place ID: GbpGestionPlaceId
 *
 * Mantiene export default + props `{ cliente }` (compat con ClienteDrawer).
 *
 * @since gbp-ficha-improvements S2 (2026-08-05)
 * @updated gbp-ficha-redesign 2026-08-12 (sidebar layout)
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useRbac } from '../../../../../shared/auth/useRbac';
import AccessDenied from '../../../../../shared/ui/AccessDenied';
import GbpFichaLayout from './GbpFichaLayout';
import GbpSidebarItems from './GbpSidebarItems';
import GbpHeader from './GbpHeader';
import GbpFichaActual from './GbpFichaActual';
import GbpAudit from './GbpAudit';
import GbpAuditTrail from './GbpAuditTrail';
import GbpGestionPlaceId from './GbpGestionPlaceId';
import GbpCompetitiveConfig from './GbpCompetitiveConfig';
import GbpConfigActions from './GbpConfigActions';
import GbpHeatmapActividad from './GbpHeatmapActividad';
import GbpSectorCard from './GbpSectorCard';
import { useGbpFichas } from './hooks/useGbpFichas';
import { useGbpAuditHistory } from './hooks/useGbpAuditHistory';

const DEFAULT_ITEM = 'resumen';

const GbpIndex = ({ cliente }) => {
  // ─── Hooks (always called, in this exact order) ─────────────────────────
  const rbac = useRbac();

  const [activeItem,  setActiveItem]  = useState(DEFAULT_ITEM);
  const [auditData,    setAuditData]    = useState(() => {
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

  // Audit history hook (for sidebar badge + audit view)
  // useGbpAuditHistory expects placeId (cliente.google_cid).
  const { data: auditHistoryData } = useGbpAuditHistory(cliente.google_cid);
  const snapshots = auditHistoryData?.ok
    ? (auditHistoryData.snapshots ?? [])
    : [];

  const fichaActual = useMemo(() => {
    if (fichas.length > 0) return fichas[0];
    if (cliente.google_cid) {
      return {
        id: null,
        google_cid: cliente.google_cid,
        tipo: 'principal',
        gmaps_nombre: cliente.nombre_comercial || '',
        gmaps_rating: null,
        gmaps_reseñas: null,
        gms_last_updated: null,
      };
    }
    return null;
  }, [fichas, cliente.google_cid, cliente.nombre_comercial]);

  // Sidebar items with live badges
  const sidebarItems = useMemo(
    () => GbpSidebarItems({ snapshotCount: snapshots.length, sectorCount: 0 }),
    [snapshots.length]
  );

  const handleItemChange = useCallback((itemId) => setActiveItem(itemId), []);

  const handleAuditComplete = useCallback((data) => {
    setAuditData(data);
    try {
      if (data) {
        sessionStorage.setItem(`gbp-audit-${cliente.id}`, JSON.stringify(data));
      } else {
        sessionStorage.removeItem(`gbp-audit-${cliente.id}`);
      }
    } catch (e) { /* sessionStorage no disponible */ }
  }, [cliente.id]);

  // Cleanup on cliente change
  useEffect(() => {
    return () => {
      try { sessionStorage.removeItem(`gbp-audit-${cliente.id}`); } catch (e) {}
    };
  }, [cliente.id]);

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
    <GbpFichaLayout
      items={sidebarItems}
      activeItem={activeItem}
      onItemChange={handleItemChange}
    >
      {activeItem === 'resumen' && (
        <div>
          <GbpHeader
            audit={auditData || (fichaActual ? {
              place_id: placeId,
              rating: fichaActual.gmaps_rating,
              reviews_count: fichaActual.gmaps_reseñas,
              _cached: true,
              _cached_at: fichaActual.gms_last_updated,
            } : null)}
          />
          {fichas.length > 1 && (
            <div className="flex gap-1.5 mt-2 px-5 flex-wrap">
              {fichas.map((f, i) => (
                <button key={f.id || i} onClick={() => {/* TODO: ficha select */}}
                  className={`px-2 py-1 rounded-sm text-[9px] font-mono border transition-colors ${
                    i === 0
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}>
                  {f.tipo || 'principal'} {f.google_cid ? f.google_cid.slice(0, 8) + '…' : ''}
                </button>
              ))}
            </div>
          )}
          <GbpFichaActual audit={auditData} />
        </div>
      )}

      {activeItem === 'auditoria' && (
        <GbpAuditTrail snapshots={snapshots} />
      )}

      {activeItem === 'actividad' && (
        <GbpHeatmapActividad
          audit={auditData || (fichaActual ? { popular_times: [] } : null)}
        />
      )}

      {activeItem === 'sector' && (
        <GbpSectorCard cliente={cliente} />
      )}

      {activeItem === 'config' && (
        <div>
          <GbpCompetitiveConfig cliente={cliente} />
          <GbpConfigActions cliente={cliente} />
        </div>
      )}

      {activeItem === 'placeid' && (
        <GbpGestionPlaceId clienteId={cliente.id} initialPlaceId={placeId} />
      )}
    </GbpFichaLayout>
  );
};

GbpIndex.propTypes = { cliente: PropTypes.object.isRequired };

export default GbpIndex;
