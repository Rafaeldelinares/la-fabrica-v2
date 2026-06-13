import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { fmtFecha } from '../../../../utils/dates';

const N8N = import.meta.env.VITE_N8N_URL;

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Devuelve las clases CSS del badge de estado de la tarjeta.
 * @param {string} estado - 'activa' | 'pendiente' | 'baja'
 * @returns {string}
 */
const estadoClasses = (estado) => {
  switch (estado) {
    case 'activa':    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 'pendiente': return 'bg-amber-400/10 text-amber-400 border border-amber-400/30';
    case 'baja':      return 'bg-red-500/10 text-red-400 border border-red-500/30';
    default:          return 'bg-slate-800 text-slate-500 border border-slate-700';
  }
};

// ─── sub-componentes ─────────────────────────────────────────────────────────

/**
 * Skeleton de carga — 3 filas de bloques.
 */
const SkeletonTarjeta = () => (
  <div className="flex flex-col gap-4 px-5 py-4 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex flex-col gap-2">
        <div className="h-2.5 w-24 bg-slate-800 rounded-sm" />
        <div className="h-4 w-48 bg-slate-800 rounded-sm" />
        <div className="h-4 w-36 bg-slate-800 rounded-sm" />
      </div>
    ))}
  </div>
);

/**
 * Fila de dato individual en la sección de datos de tarjeta.
 * @param {{ label: string, value: React.ReactNode }} props
 */
const DatoFila = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="font-mono text-sm text-slate-900 dark:text-slate-200">{value || '—'}</span>
  </div>
);

DatoFila.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

/**
 * Fila de discrepancia con botón de sincronización.
 * @param {{ campo: string, valorTarjeta: string, valorCrm: string, clienteId: number|string, onSynced: Function }} props
 */
const DiscrepanciaFila = ({ campo, valorTarjeta, valorCrm, clienteId, onSynced }) => {
  const [syncing,  setSyncing]  = useState(false);
  const [synced,   setSynced]   = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${N8N}/crm-tarjeta-sync-campo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, campo, valor: valorTarjeta }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text || 'Error del servidor'}`);
      }
      const data = await res.json();
      if (data.ok) { setSynced(true); onSynced?.(campo); }
      else { setErrorMsg(data.message || 'Error al sincronizar'); }
    } catch (err) {
      setErrorMsg(err instanceof Error && err.message.startsWith('HTTP') ? 'Error de conexión al sincronizar' : 'Error de conexión al sincronizar');
    } finally {
      setSyncing(false);
    }
  }, [campo, valorTarjeta, clienteId, onSynced]);

  const labelCampo = { tel: 'Teléfono', email: 'Email', web: 'Web' }[campo] ?? campo;

  return (
    <div className="flex flex-col gap-1 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <p className="text-xs text-slate-500 font-mono">
        <span className="font-black text-slate-700 dark:text-slate-300">{labelCampo}</span>
        {' '}en tarjeta:{' '}
        <span className="text-slate-800 dark:text-slate-200">{valorTarjeta || '—'}</span>
        {' / '}En CRM:{' '}
        <span className="text-slate-600">{valorCrm || '—'}</span>
      </p>
      {errorMsg && <p className="text-[10px] text-red-500 font-mono">{errorMsg}</p>}
      <button
        onClick={handleSync}
        disabled={syncing || synced}
        className={`self-start bg-red-600 text-white px-3 py-1 rounded-sm text-xs font-black uppercase transition-opacity ${
          synced ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-700 disabled:opacity-50'
        }`}
      >
        {synced ? 'Sincronizado' : syncing ? 'Sincronizando…' : 'Sincronizar \u2192'}
      </button>
    </div>
  );
};

DiscrepanciaFila.propTypes = {
  campo:        PropTypes.string.isRequired,
  valorTarjeta: PropTypes.string,
  valorCrm:     PropTypes.string,
  clienteId:    PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  onSynced:     PropTypes.func,
};

// ─── componente principal ────────────────────────────────────────────────────

/**
 * TabTarjetaDigital — Pestaña que muestra los datos de la tarjeta digital en bybusiness.es,
 * compara con los datos del CRM y permite sincronizar discrepancias campo a campo.
 * @param {{ cliente: object }} props
 */
const TabTarjetaDigital = ({ cliente }) => {
  const [estado,   setEstado]   = useState('loading'); // 'loading' | 'error' | 'ok'
  const [tarjeta,  setTarjeta]  = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const cargar = useCallback(() => {
    setEstado('loading');
    setErrorMsg('');
    fetch(`${N8N}/crm-tarjeta-get?cliente_id=${cliente.id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setTarjeta(d); setEstado('ok'); })
      .catch(() => { setErrorMsg('Error al cargar la tarjeta — comprueba la conexión'); setEstado('error'); });
  }, [cliente.id]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── loading ──────────────────────────────────────────────────────────────
  if (estado === 'loading') return <SkeletonTarjeta />;

  // ── error ────────────────────────────────────────────────────────────────
  if (estado === 'error') return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="text-xs text-red-400 font-mono">{errorMsg}</p>
      <button
        onClick={cargar}
        className="flex items-center gap-1.5 self-start text-[10px] font-mono uppercase tracking-widest border border-slate-700 rounded-sm px-3 py-1.5 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
      >
        <RefreshCw size={10} /> Reintentar
      </button>
    </div>
  );

  // ── sin tarjeta ──────────────────────────────────────────────────────────
  if (!tarjeta?.tiene_tarjeta) return (
    <div className="flex flex-col gap-3 px-5 py-6">
      <p className="text-xs text-slate-500 font-mono">
        Este cliente no tiene tarjeta digital en bybusiness.es
      </p>
      {cliente.bybusiness_url && (
        <a
          href={cliente.bybusiness_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 self-start text-[10px] font-mono uppercase tracking-widest border border-slate-700 rounded-sm px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:border-slate-500 transition-colors"
        >
          <ExternalLink size={10} /> Ver URL registrada
        </a>
      )}
    </div>
  );

  // ── con tarjeta ──────────────────────────────────────────────────────────
  const td   = tarjeta.tarjeta;
  const crm  = tarjeta.crm;
  const disc = tarjeta.discrepancias ?? {};

  const diffs = [
    disc.tel_diff   && { campo: 'telefono', valorTarjeta: td.telefono,  valorCrm: crm.crm_telefono },
    disc.email_diff && { campo: 'email',    valorTarjeta: td.email,     valorCrm: crm.crm_email    },
    disc.web_diff   && { campo: 'web',      valorTarjeta: td.web,       valorCrm: crm.crm_web      },
  ].filter(Boolean);

  const mostrarAlertaGbp = crm.gmaps_url && td.url !== crm.bybusiness_url;

  return (
    <div className="flex flex-col gap-0">

      {/* SECCIÓN A — Datos de la tarjeta */}
      <div className="px-5 py-4 border-b border-slate-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
          Datos de la tarjeta
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <DatoFila label="Título"     value={td.titulo} />
          <DatoFila label="Ciudad"     value={td.ciudad} />
          <DatoFila label="Teléfono"   value={td.telefono} />
          <DatoFila label="WhatsApp"   value={td.whatsapp} />
          <DatoFila label="Email"      value={td.email} />
          <DatoFila label="Web"        value={td.web} />
          <DatoFila label="Estado" value={
            <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${estadoClasses(td.estado)}`}>
              {td.estado || '—'}
            </span>
          } />
          <DatoFila label="Snapshot" value={td.fecha_snapshot ? fmtFecha(td.fecha_snapshot) : null} />
        </div>

        {/* Redes sociales — solo las que tienen datos */}
        {[
          { label: 'Instagram',   val: td.instagram,   base: 'https://www.instagram.com/' },
          { label: 'Facebook',    val: td.facebook,    base: 'https://www.facebook.com/' },
          { label: 'Twitter / X', val: td.twitter,     base: 'https://twitter.com/' },
          { label: 'YouTube',     val: td.youtube,     base: 'https://youtube.com/' },
          { label: 'TripAdvisor', val: td.tripadvisor, base: null },
          { label: 'Google Maps', val: td.google_maps, base: null },
        ].some(r => r.val) && (
          <div className="mt-4 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Redes y presencia</p>
            {[
              { label: 'Instagram',   val: td.instagram },
              { label: 'Facebook',    val: td.facebook },
              { label: 'Twitter / X', val: td.twitter },
              { label: 'YouTube',     val: td.youtube },
              { label: 'TripAdvisor', val: td.tripadvisor },
              { label: 'Google Maps', val: td.google_maps },
            ].filter(r => r.val).map(({ label, val }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-24 flex-none">{label}</span>
                <a href={val} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-mono text-xs truncate transition-colors">
                  {val}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN B — Discrepancias CRM (solo si existen) */}
      {diffs.length > 0 && (
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} className="text-amber-400" /> Discrepancias CRM
          </p>
          <div className="flex flex-col">
            {diffs.map(d => (
              <DiscrepanciaFila
                key={d.campo}
                campo={d.campo}
                valorTarjeta={d.valorTarjeta}
                valorCrm={d.valorCrm}
                clienteId={cliente.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN C — Preview */}
      {td.url && (
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview tarjeta</p>
            <a
              href={td.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink size={10} /> Abrir
            </a>
          </div>
          <iframe
            src={td.url}
            title="Preview tarjeta digital"
            className="w-full rounded-sm border border-slate-800 h-[480px]"
            loading="lazy"
          />
          {mostrarAlertaGbp && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-sm px-2 py-1 self-start">
              Tarjeta no enlazada en GBP
            </span>
          )}
        </div>
      )}

    </div>
  );
};

TabTarjetaDigital.propTypes = {
  /** Objeto cliente — se requieren al menos: id, nombre_comercial, bybusiness_url */
  cliente: PropTypes.shape({
    id:               PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    nombre_comercial: PropTypes.string,
    bybusiness_url:   PropTypes.string,
  }).isRequired,
};

export default TabTarjetaDigital;
