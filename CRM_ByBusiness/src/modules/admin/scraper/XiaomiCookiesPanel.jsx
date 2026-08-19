/**
 * XiaomiCookiesPanel — panel de administración de cookies del Xiaomi-12.
 *
 * Muestra el estado actual de los cookies (desde el workflow STATUS) y permite
 * subir un archivo JSON de cookies (formatos Chrome / curl / Playwright) al
 * workflow UPLOAD para persistir en DB.
 *
 * El Xiaomi-12 polléa la DB cada 5 minutos; los cookies quedan disponibles
 * automáticamente para el scraper tras la subida.
 *
 * Permiso RBAC: admin.system.config
 *
 * @since xiaomi-cookies-admin 2026-08-12
 */
import React, { useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Upload, AlertTriangle, CheckCircle, FileJson, RefreshCw, Clock } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import AccessDenied from '../../../shared/ui/AccessDenied';
import { useRbac } from '../../../shared/auth/useRbac';
import { useXiaomiCookies } from './useXiaomiCookies';
import { useToast } from '../../../shared/context/ToastContext';
import { reportError } from '../../../shared/errors/reportError';

/**
 * Normaliza un array de cookies en cualquiera de los tres formatos conocidos
 * (Chrome/Playwright, curl, string plano) hacia el formato interno
 * { name, value, domain, expirationDate }.
 *
 * @param {Array|object|string} raw
 * @returns {Array<object>}
 */
const parseCookiesRaw = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    // Wrapped: { cookies: [...] } o { cookies_json: '[...]' }
    if (raw.cookies && Array.isArray(raw.cookies)) return raw.cookies;
    if (raw.cookies_json) {
      return JSON.parse(raw.cookies_json);  // parse failure surfaces to caller (XiaomiCookiesPanel handler)
    }
    // Could be single cookie object — wrap in array
    return [raw];
  }
  if (typeof raw === 'string') {
    return JSON.parse(raw);  // parse failure surfaces to caller (XiaomiCookiesPanel handler)
  }
  return [];
};

/**
 * Formatea una fecha ISO para mostrar en zona horaria local.
 */
const formatDate = (isoString) => {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

/**
 * Renderiza un chip de estado con color según urgency.
 * @param {{ days: number|null|undefined }} props
 */
const StatusChip = ({ days }) => {
  if (days === null || days === undefined) return null;
  const urgent = days <= 7;
  const warning = days <= 30;
  return (
    <span
      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm ${
        urgent
          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
          : warning
          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25'
          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
      }`}
    >
      {days === 0 ? 'EXPIRADO HOY' : `${days}d`}
    </span>
  );
};

StatusChip.propTypes = {
  days: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null, undefined])]),
};

const XiaomiCookiesPanel = () => {
  const rbac = useRbac();
  const fileInputRef = useRef(null);
  const toast = useToast();

  const {
    status,
    isStatusLoading,
    isStatusError,
    refetchStatus,
    uploadCookies,
    isUploading,
    uploadResult,
    uploadError,
    notification,
  } = useXiaomiCookies();

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const cookies = parseCookiesRaw(parsed);
          if (cookies.length === 0) {
            toast.error('El archivo no contiene cookies válidos.');
            return;
          }
          uploadCookies(cookies);
        } catch (err) {
          toast.error('No se pudo parsear el archivo como JSON.');
          reportError(err, { zoneId: 'XiaomiCookiesPanel.file-upload' });
        }
      };
      reader.readAsText(file);
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [uploadCookies, toast]
  );

  if (!rbac.can('admin.system.config')) {
    return <AccessDenied permission="admin.system.config" />;
  }

  const hasData = status?.hasData === true;
  const days = status?.days_until_earliest_expiry ?? null;
  const cookieCount = status?.cookie_count ?? (hasData ? '?' : 0);
  const earliestExpiry = status?.earliest_expiry_at ?? null;
  const latestExpiry = status?.latest_expiry_at ?? null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-widest">
          Cookies Xiaomi-12
        </h2>
        <button
          onClick={() => refetchStatus()}
          disabled={isStatusLoading}
          className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm disabled:opacity-40"
        >
          {isStatusLoading ? (
            <span className="w-2.5 h-2.5 bg-slate-600 rounded-sm animate-pulse" />
          ) : (
            <RefreshCw size={11} />
          )}
          Refrescar
        </button>
      </div>

      {/* ── Status card ── */}
      <Card className="!p-0 p-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
              Estado actual
            </p>
            <StatusChip days={days} />
          </div>

          {isStatusError ? (
            <p className="text-[11px] font-mono text-red-400">
              Error al obtener estado. Reintenta.
            </p>
          ) : !hasData ? (
            <p className="text-[11px] font-mono text-slate-500">
              Sin datos de cookies. Subí un archivo para activar el scraper.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] font-mono text-slate-600">Cookies activos</p>
                <p className="text-[13px] font-mono font-bold text-white">{cookieCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-600">Próximo expiry</p>
                <p className="text-[13px] font-mono font-bold text-white">{formatDate(earliestExpiry)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-600">Último expiry</p>
                <p className="text-[13px] font-mono text-slate-400">{formatDate(latestExpiry)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-slate-600">Días hasta expiry</p>
                <p className="text-[13px] font-mono font-bold text-white">
                  {days === 0 ? 'EXPIRADO' : `${days} días`}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Upload card ── */}
      <Card className="!p-0 p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Upload size={12} className="text-slate-500" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
              Subir cookies
            </p>
          </div>

          <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
            Seleccioná el archivo <span className="text-slate-400">google_session.json</span> del
            Xiaomi-12 (directorio <span className="text-slate-400">~/xiaomi-gb-scape/lib/</span>).
            Formatos soportados: Chrome/Playwright, curl y string JSON.
          </p>

          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-mono font-semibold text-white bg-[#D00000] hover:bg-[#B00000] disabled:opacity-40 disabled:cursor-not-allowed rounded-sm transition-colors w-full justify-center"
          >
            {isUploading ? (
              <>
                <span className="w-2.5 h-2.5 bg-white/40 rounded-sm animate-pulse" />
                Subiendo…
              </>
            ) : (
              <>
                <FileJson size={12} />
                Seleccionar archivo JSON
              </>
            )}
          </button>

          {/* Upload result */}
          {uploadResult && !uploadError && (
            <div className="flex items-start gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-sm">
              <CheckCircle size={11} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Subida exitosa</p>
                <p className="text-emerald-400/80">
                  {uploadResult.cookie_count} cookies · earliest:{' '}
                  {formatDate(uploadResult.earliest_expiry_at)} · latest:{' '}
                  {formatDate(uploadResult.latest_expiry_at)}
                </p>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="flex items-start gap-2 text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-sm">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Error en la subida</p>
                <p className="text-red-400/80">{uploadError.message}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Info card ── */}
      <Card className="!p-0 p-4">
        <div className="flex items-start gap-2.5">
          <Clock size={11} className="text-slate-600 mt-0.5 shrink-0" />
          <p className="text-[10px] font-mono text-slate-600 leading-relaxed">
            El Xiaomi-12 polléa la base de datos cada 5 minutos. Los cookies
            quedan disponibles automáticamente tras la subida. Si el expiry es
            inminente, renová los cookies desde el teléfono y volvé a subir.
          </p>
        </div>
      </Card>

      {/* ── Global notification ── */}
      {notification && (
        <div
          className={`text-[11px] font-mono px-4 py-3 rounded-sm border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

XiaomiCookiesPanel.propTypes = {
  /** Placeholder for future prop API — currently uses global tab routing */
};

export default XiaomiCookiesPanel;
