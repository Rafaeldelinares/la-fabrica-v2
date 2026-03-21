import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MapPin, Star, MessageSquare, RefreshCw, AlertCircle, AlertTriangle, CheckCircle, XCircle, TrendingUp, BadgeCheck, Plus, Search, Link, Phone, Globe, Instagram, Facebook } from 'lucide-react';
import { fmtFecha, fmtMesAno } from '../../../../utils/dates';

/**
 * Barra de sentimiento con etiqueta y porcentaje.
 * Usa style width para valor dinámico en runtime — Tailwind no puede generar clases arbitrarias dinámicas.
 */
const SentimentBar = ({ label, value, color }) => {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 font-mono w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-sm overflow-hidden">
        {/* CSS custom property + arbitrary Tailwind — único patrón GGA-válido para ancho dinámico runtime */}
        <div className={`h-full rounded-sm transition-all [width:var(--bar-w)] ${color}`}
          style={{ '--bar-w': `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 font-mono w-8 text-right">
        {value ? `${pct}%` : '—'}
      </span>
    </div>
  );
};

SentimentBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
  color: PropTypes.string.isRequired,
};

/** Mini gráfico SVG de tendencia. */
const Sparkline = ({ points, color = '#10b981', height = 40 }) => {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 200;
  const pad = 4;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={height} className="overflow-visible">
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {points.map((_, i) => {
        const [cx, cy] = coords[i].split(',');
        return <circle key={i} cx={cx} cy={cy} r="2.5" fill={color} />;
      })}
    </svg>
  );
};

Sparkline.propTypes = {
  points: PropTypes.arrayOf(PropTypes.number).isRequired,
  color:  PropTypes.string,
  height: PropTypes.number,
};


/** Detalle expandido de una ficha GBP con rating, reseñas y sentiment. */
const FichaDetalle = ({ ficha, historico }) => {
  const parseSentiment = (s) => {
    if (!s) return null;
    if (typeof s === 'object') return s;
    try { return JSON.parse(s); } catch { return null; }
  };

  const sentimentData    = parseSentiment(ficha.gmaps_sentiment);
  const breakdown        = sentimentData?.breakdown || null;
  const overallSentiment = typeof sentimentData?.sentiment === 'number' ? sentimentData.sentiment : null;
  const histRating  = (historico || []).map(h => h.gmaps_rating  ? Number(h.gmaps_rating)  : null).filter(Boolean);
  const histReseñas = (historico || []).map(h => h.gmaps_reseñas ? Number(h.gmaps_reseñas) : null).filter(Boolean);
  const histFechas  = (historico || []).map(h => h.fecha_snapshot ? fmtMesAno(h.fecha_snapshot) : '').filter(Boolean);

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <Star size={18} className="text-amber-400 fill-amber-400" />
              <span className="text-3xl font-black text-white font-mono">
                {ficha.gmaps_rating ? Number(ficha.gmaps_rating).toFixed(1) : '—'}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">Valoración</p>
          </div>
          <div className="w-px h-10 bg-slate-700 shrink-0" />
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={16} className="text-slate-500" />
              <span className="text-2xl font-black text-slate-200 font-mono">{ficha.gmaps_reseñas || '—'}</span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">Reseñas</p>
          </div>
          {ficha.gmaps_url && (
            <>
              <div className="w-px h-10 bg-slate-700 shrink-0" />
              <a href={ficha.gmaps_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors">
                <MapPin size={12} /> Ver en Maps
              </a>
            </>
          )}
        </div>
      </div>

      {ficha.gmaps_address && (
        <div className="flex items-start gap-2 text-xs text-slate-400 font-mono">
          <MapPin size={12} className="text-slate-600 mt-0.5 shrink-0" />
          {ficha.gmaps_address}
        </div>
      )}

      {historico?.length >= 2 && (
        <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <TrendingUp size={10} /> Evolución ({historico.length} snapshots)
          </p>
          <div className="grid grid-cols-2 gap-4">
            {histRating.length >= 2 && (
              <div>
                <p className="text-[9px] text-slate-600 font-mono mb-1.5 flex items-center gap-1">
                  <Star size={8} className="text-amber-400" /> Valoración
                </p>
                <Sparkline points={histRating} color="#f59e0b" height={36} />
                <div className="flex justify-between text-[9px] text-slate-700 font-mono mt-1">
                  <span>{histFechas[0]}</span><span>{histFechas[histFechas.length - 1]}</span>
                </div>
              </div>
            )}
            {histReseñas.length >= 2 && (
              <div>
                <p className="text-[9px] text-slate-600 font-mono mb-1.5 flex items-center gap-1">
                  <MessageSquare size={8} /> Reseñas
                </p>
                <Sparkline points={histReseñas} color="#6366f1" height={36} />
                <div className="flex justify-between text-[9px] text-slate-700 font-mono mt-1">
                  <span>{histFechas[0]}</span><span>{histFechas[histFechas.length - 1]}</span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 overflow-auto max-h-28">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-slate-600 border-b border-slate-800">
                  <th className="text-left pb-1">Fecha</th>
                  <th className="text-right pb-1">⭐</th>
                  <th className="text-right pb-1">Reseñas</th>
                </tr>
              </thead>
              <tbody>
                {[...historico].reverse().map((h, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="py-0.5 text-slate-500">{fmtFecha(h.fecha_snapshot)}</td>
                    <td className="py-0.5 text-right text-amber-400">{h.gmaps_rating ? Number(h.gmaps_rating).toFixed(1) : '—'}</td>
                    <td className="py-0.5 text-right text-slate-300">{h.gmaps_reseñas ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(overallSentiment !== null || breakdown) && (
        <div className="border border-slate-700 rounded-sm p-4 bg-slate-900/50">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <TrendingUp size={10} /> Análisis de sentimiento
          </p>
          {overallSentiment !== null && (() => {
            const pct = Math.round(overallSentiment * 100);
            const barColor = overallSentiment >= 0.7 ? 'bg-emerald-500' : overallSentiment >= 0.4 ? 'bg-amber-400' : 'bg-red-500';
            return (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-slate-500 font-mono w-20 shrink-0">General</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-sm overflow-hidden">
                  {/* CSS custom property + arbitrary Tailwind — único patrón GGA-válido para ancho dinámico runtime */}
                  <div className={`h-full rounded-sm [width:var(--bar-w)] ${barColor}`}
                    style={{ '--bar-w': `${pct}%` }} />
                </div>
                <span className="text-[10px] font-mono w-8 text-right text-slate-300">{pct}%</span>
              </div>
            );
          })()}
          {breakdown && (
            <div className="flex flex-col gap-1.5">
              {Object.entries(breakdown).map(([k, v]) => (
                <SentimentBar key={k} label={k} value={typeof v === 'number' ? v : null}
                  color={v >= 0.7 ? 'bg-emerald-500' : v >= 0.4 ? 'bg-amber-400' : 'bg-red-500'} />
              ))}
            </div>
          )}
        </div>
      )}

      {(ficha.gmaps_phone || ficha.gmaps_website) && (
        <div className="flex flex-col gap-1.5">
          {ficha.gmaps_phone && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Phone size={11} className="text-slate-600 shrink-0" />
              {ficha.gmaps_phone}
            </div>
          )}
          {ficha.gmaps_website && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <Globe size={11} className="text-slate-600 shrink-0" />
              <a href={ficha.gmaps_website} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors truncate">
                {ficha.gmaps_website}
              </a>
            </div>
          )}
        </div>
      )}
      {ficha.google_cid && <p className="text-[10px] text-slate-700 font-mono">CID: {ficha.google_cid}</p>}
    </div>
  );
};

FichaDetalle.propTypes = {
  ficha: PropTypes.shape({
    gmaps_rating:    PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    gmaps_reseñas:   PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    gmaps_url:       PropTypes.string,
    gmaps_address:   PropTypes.string,
    gmaps_phone:     PropTypes.string,
    gmaps_website:   PropTypes.string,
    gmaps_sentiment: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    google_cid:      PropTypes.string,
  }).isRequired,
  historico: PropTypes.array,
};

/** Panel de selección de candidatos GBP encontrados por el motor. */
const CandidatosPanel = ({ candidatos, onConfirmar, onCancelar, confirmando }) => (
  <div className="border border-amber-500/30 bg-amber-500/5 rounded-sm p-4 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <p className="text-[10px] text-amber-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
        <Search size={10} /> {candidatos.length} candidato{candidatos.length !== 1 ? 's' : ''} encontrado{candidatos.length !== 1 ? 's' : ''}
      </p>
      <button onClick={onCancelar} className="text-[10px] text-slate-600 hover:text-slate-400 font-mono transition-colors">
        Cancelar
      </button>
    </div>
    <p className="text-[10px] text-amber-600/70 font-mono">Selecciona la ficha correcta para este cliente</p>
    <div className="flex flex-col gap-2">
      {candidatos.map((c, i) => (
        <div key={c.cid || c.name || i} className="border border-slate-700 rounded-sm p-3 bg-slate-900/50 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white font-mono truncate">{c.name}</p>
            {c.address && <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{c.address}</p>}
            <div className="flex items-center gap-3 mt-1">
              {c.rating > 0 && <span className="text-[10px] text-amber-400 font-mono">{Number(c.rating).toFixed(1)} ★</span>}
              {c.reviews > 0 && <span className="text-[10px] text-slate-500 font-mono">{c.reviews} reseñas</span>}
            </div>
          </div>
          <button onClick={() => onConfirmar(c)} disabled={confirmando}
            className="shrink-0 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest border border-emerald-500/40 rounded-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40">
            {confirmando ? '…' : 'Usar esta'}
          </button>
        </div>
      ))}
    </div>
  </div>
);

CandidatosPanel.propTypes = {
  candidatos: PropTypes.arrayOf(PropTypes.shape({
    name:    PropTypes.string,
    address: PropTypes.string,
    rating:  PropTypes.number,
    reviews: PropTypes.number,
    cid:     PropTypes.string,
  })).isRequired,
  onConfirmar: PropTypes.func.isRequired,
  onCancelar:  PropTypes.func.isRequired,
  confirmando: PropTypes.bool,
};

/** Detecta el tipo de URL introducida por el admin. */
const detectUrlType = (url) => {
  if (!url) return null;
  const u = url.trim().toLowerCase();
  if (u.includes('maps.google.com') || u.includes('google.com/maps')) return 'maps';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('facebook.com') || u.includes('fb.com')) return 'facebook';
  return 'web';
};

const URL_TYPE_LABELS = {
  maps:      { label: 'URL de Maps',  icon: MapPin,      color: 'text-emerald-400' },
  web:       { label: 'Página web',   icon: Globe,       color: 'text-blue-400'    },
  instagram: { label: 'Instagram',    icon: Instagram,   color: 'text-pink-400'    },
  facebook:  { label: 'Facebook',     icon: Facebook,    color: 'text-blue-500'    },
};

/**
 * TabGbp — Pestaña de fichas Google Business del cliente con evolución y sentiment.
 * @param {{ cliente: object, n8nUrl: string }} props
 */
const TabGbp = ({ cliente, n8nUrl }) => {
  const [fichas,      setFichas]      = useState(null);
  const [selIdx,      setSelIdx]      = useState(0);
  const [historico,   setHistorico]   = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [candidatos,  setCandidatos]  = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [addMode,     setAddMode]     = useState(false);
  const [addUrl,      setAddUrl]      = useState('');
  const [capturando,  setCapturando]  = useState(false);
  const [preview,     setPreview]     = useState(null);
  const [gestionada,  setGestionada]  = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [errorAction, setErrorAction] = useState(null);
  const [errorCarga,  setErrorCarga]  = useState(null);

  const fetchFichas = useCallback(() => {
    setErrorCarga(null);
    fetch(`${n8nUrl}/crm-gbp-fichas-cliente?cliente_id=${cliente.id}`)
      .then(res => res.text())
      .then(text => {
        const data = text ? JSON.parse(text) : {};
        if (data.ok && data.fichas?.length > 0) {
          setFichas(data.fichas);
        } else {
          // Fallback: usar datos del objeto cliente (importados en clientes.clientes)
          const legacy = {
            id: null, tipo: 'principal',
            gmaps_nombre:    cliente.gmaps_nombre || cliente.nombre_comercial,
            gmaps_url:       cliente.gmaps_url,
            google_cid:      cliente.google_cid,
            gmaps_rating:    cliente.gmaps_rating,
            gmaps_reseñas:   cliente.gmaps_reseñas,
            gmaps_address:   cliente.gmaps_address,
            gmaps_sentiment: cliente.gmaps_sentiment,
            gmaps_pendiente_validar: cliente.gmaps_pendiente_validar,
            gestionada_por_bybusiness: false,
            gmaps_last_updated: cliente.gmaps_last_updated,
          };
          setFichas(legacy.gmaps_rating || legacy.gmaps_url ? [legacy] : []);
        }
      })
      .catch(() => { setFichas([]); setErrorCarga('Error al cargar fichas GBP'); });
  }, [cliente.id, cliente.gmaps_nombre, cliente.nombre_comercial, cliente.gmaps_url, cliente.google_cid, cliente.gmaps_rating, cliente.gmaps_reseñas, cliente.gmaps_address, cliente.gmaps_sentiment, cliente.gmaps_pendiente_validar, cliente.gmaps_last_updated, n8nUrl]);

  useEffect(() => { fetchFichas(); }, [fetchFichas]);

  useEffect(() => {
    if (fichas === null) return;
    const fichaId = fichas?.[selIdx]?.id;
    const params = new URLSearchParams({ cliente_id: cliente.id });
    if (fichaId) params.set('ficha_id', fichaId);
    fetch(`${n8nUrl}/crm-gbp-historico-cliente?${params}`)
      .then(res => res.json())
      .then(data => setHistorico(data.ok ? data.historico : []))
      .catch(() => { setHistorico([]); setErrorCarga('Error al cargar historial GBP'); });
  }, [cliente.id, selIdx, fichas, n8nUrl]);

  const fichaActual = fichas?.[selIdx] || null;

  /** Busca la ficha GBP del cliente en Maps y muestra candidatos para selección humana. */
  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorAction(null);
    setCandidatos(null);
    try {
      const localidad = cliente.localidad_negocio || cliente.localidad || '';
      const query = `${cliente.nombre_comercial}${localidad ? ' ' + localidad : ''}`;
      const res = await fetch(`${n8nUrl}/crm-gbp-refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          query,
          web: cliente.web || null,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (data.ok && data.type === 'list' && data.candidatos?.length > 0) {
        setCandidatos(data.candidatos);
      } else {
        fetchFichas();
      }
    } catch { setErrorAction('Error al actualizar fichas'); } finally { setRefreshing(false); }
  };

  /** Confirma un candidato seleccionado y lo guarda como ficha del cliente. */
  const handleConfirmar = async (candidato) => {
    setConfirmando(true);
    setErrorAction(null);
    try {
      await fetch(`${n8nUrl}/crm-gbp-confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          nombre:  candidato.name,
          rating:  candidato.rating,
          reviews: candidato.reviews,
          address: candidato.address,
        }),
      });
      setCandidatos(null);
      fetchFichas();
    } catch { setErrorAction('Error al confirmar ficha'); } finally { setConfirmando(false); }
  };

  /** Valida (confirma/rechaza) una ficha encontrada automáticamente. */
  const handleValidar = async (fichaId, accion) => {
    setErrorAction(null);
    try {
      await fetch(`${n8nUrl}/crm-gbp-validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, ficha_id: fichaId, accion }),
      });
      fetchFichas();
    } catch { setErrorAction('Error al validar ficha'); }
  };

  /** Resetea el estado del flujo de añadir ficha manual. */
  const resetAdd = () => {
    setAddMode(false);
    setAddUrl('');
    setPreview(null);
    setGestionada(false);
    setCapturando(false);
    setVerificando(false);
    setCandidatos(null);
  };

  /** Paso 1 del flujo añadir: extrae datos del negocio a partir de la URL introducida. */
  const handleCapturar = async () => {
    if (!addUrl.trim()) return;
    setCapturando(true);
    setErrorAction(null);
    setPreview(null);
    try {
      const urlType = detectUrlType(addUrl.trim());
      const res = await fetch(`${n8nUrl}/crm-gbp-verificar-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmaps_url: addUrl.trim(),
          url_type: urlType,
          nombre_comercial: cliente.nombre_comercial,
          localidad: cliente.localidad_negocio || cliente.localidad || '',
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (data.ok && data.nombre) {
        setPreview(data);
      } else {
        setErrorAction(data.error || 'No se pudieron obtener datos de esa URL');
      }
    } catch { setErrorAction('Error al capturar datos de la URL'); } finally { setCapturando(false); }
  };

  /** Paso 2 del flujo añadir: guarda la ficha previamente capturada como ficha del cliente. */
  const handleVerificar = async () => {
    if (!preview) return;
    setVerificando(true);
    setErrorAction(null);
    try {
      await fetch(`${n8nUrl}/crm-gbp-confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          nombre:  preview.nombre,
          rating:  preview.rating,
          reviews: preview.reviews,
          address: preview.address,
          gmaps_url: addUrl.trim(),
          cid: preview.cid,
          gestionada_por_bybusiness: gestionada,
        }),
      });
      resetAdd();
      fetchFichas();
    } catch { setErrorAction('Error al guardar ficha'); } finally { setVerificando(false); }
  };

  if (fichas === null) return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {[1,2].map(i => <div key={i} className="h-16 bg-slate-800/40 rounded-sm animate-pulse" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {(errorAction || errorCarga) && (
        <p className="text-[10px] text-red-400 font-mono bg-red-900/10 border border-red-800/30 rounded-sm px-3 py-2">
          {errorAction || errorCarga}
        </p>
      )}
      {candidatos !== null && (
        <CandidatosPanel
          candidatos={candidatos}
          onConfirmar={handleConfirmar}
          onCancelar={() => setCandidatos(null)}
          confirmando={confirmando}
        />
      )}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
          {fichas.length} {fichas.length === 1 ? 'ficha' : 'fichas'} registradas
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => { setAddMode(a => !a); setPreview(null); setAddUrl(''); setErrorAction(null); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-dashed border-slate-700 text-slate-600 hover:text-slate-400 hover:border-slate-500 text-[10px] font-mono transition-colors">
            <Plus size={10} /> Añadir
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Buscando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {fichas.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {fichas.map((ficha, fichaIdx) => (
            <button key={ficha.id || ficha.tipo || fichaIdx} onClick={() => setSelIdx(fichaIdx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-mono uppercase tracking-widest transition-colors ${
                selIdx === fichaIdx
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}>
              {ficha.gestionada_por_bybusiness && <BadgeCheck size={9} className="text-[#D00000]" />}
              {ficha.tipo || 'principal'}
              {ficha.gmaps_pendiente_validar && <AlertTriangle size={9} className="text-amber-400" />}
              {ficha.gmaps_rating && <span className="text-amber-400 ml-1">{Number(ficha.gmaps_rating).toFixed(1)}★</span>}
            </button>
          ))}
        </div>
      )}

      {addMode && (
        <div className="border border-slate-700 rounded-sm p-3 bg-slate-900/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Buscar ficha</p>
            {cliente.web && (
              <button
                onClick={() => { setAddUrl(cliente.web); setPreview(null); }}
                className="flex items-center gap-1 text-[9px] font-mono text-blue-500 hover:text-blue-400 border border-blue-500/20 rounded-sm px-2 py-0.5 transition-colors">
                <Globe size={9} /> Usar web del cliente
              </button>
            )}
          </div>

          {/* Paso 1 — URL con detección de tipo */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              {(() => {
                const type = detectUrlType(addUrl);
                const meta = type ? URL_TYPE_LABELS[type] : null;
                const Icon = meta ? meta.icon : Link;
                return <Icon size={11} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${meta ? meta.color : 'text-slate-600'}`} />;
              })()}
              <input
                placeholder="URL de Maps, web del negocio, Instagram, Facebook…"
                value={addUrl}
                onChange={e => { setAddUrl(e.target.value); setPreview(null); }}
                className="bg-slate-950 border border-slate-700 rounded-sm pl-7 pr-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full"
              />
            </div>
            <button onClick={handleCapturar} disabled={capturando || !addUrl.trim()}
              className="shrink-0 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-600 rounded-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40">
              {capturando ? '…' : 'Capturar datos'}
            </button>
          </div>
          {detectUrlType(addUrl) && (
            <p className="text-[9px] font-mono text-slate-600 -mt-1">
              {(() => {
                const t = detectUrlType(addUrl);
                if (t === 'maps') return 'Se navegará directamente a la ficha de Maps';
                if (t === 'instagram' || t === 'facebook') return 'Se buscará por nombre del negocio usando el perfil social';
                return 'Se buscará en Maps por la web del negocio';
              })()}
            </p>
          )}

          {/* Paso 2 — Preview + confirmar */}
          {preview && (
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-sm p-3 flex flex-col gap-2">
              <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle size={10} /> Datos capturados — confirma para guardar
              </p>
              <p className="text-[11px] font-bold text-white font-mono">{preview.nombre}</p>
              {preview.address && <p className="text-[10px] text-slate-500 font-mono">{preview.address}</p>}
              <div className="flex items-center gap-3">
                {preview.rating > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                    <Star size={9} className="fill-amber-400" /> {Number(preview.rating).toFixed(1)}
                  </span>
                )}
                {preview.reviews > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <MessageSquare size={9} /> {preview.reviews}
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 text-[10px] text-slate-500 font-mono cursor-pointer mt-1">
                <input type="checkbox" checked={gestionada} onChange={e => setGestionada(e.target.checked)}
                  className="accent-[#D00000]" />
                Gestionada por ByBusiness
              </label>
              <button onClick={handleVerificar} disabled={verificando}
                className="w-full py-1.5 text-[10px] font-mono uppercase tracking-widest border border-emerald-500/40 rounded-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 mt-1">
                {verificando ? 'Guardando…' : 'Verificar y guardar'}
              </button>
            </div>
          )}

          <button onClick={resetAdd}
            className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors self-start">
            Cancelar
          </button>
        </div>
      )}

      {!cliente.web && (
        <div className="flex items-center gap-2 px-3 py-2 border border-amber-500/20 bg-amber-500/5 rounded-sm">
          <Globe size={11} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-500/80 font-mono flex-1">
            Este cliente no tiene web registrada
          </p>
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/30 rounded-sm px-1.5 py-0.5">
            Oportunidad
          </span>
        </div>
      )}

      {cliente.bybusiness_url && fichas.length > 0 && !fichas.some(f => f.gmaps_website?.toLowerCase() === cliente.bybusiness_url.toLowerCase()) && (
        <div className="flex items-center gap-2 px-3 py-2 border border-amber-500/20 bg-amber-500/5 rounded-sm">
          <Link size={11} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-500/80 font-mono flex-1">
            La tarjeta digital no está enlazada en Google Maps
          </p>
          <a href={cliente.bybusiness_url} target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/30 rounded-sm px-1.5 py-0.5 hover:bg-amber-500/10 transition-colors font-mono shrink-0">
            Ver tarjeta
          </a>
        </div>
      )}

      {fichas.length === 0 && !addMode && (
        <div className="text-center py-10 flex flex-col items-center gap-3">
          <AlertCircle size={24} className="text-slate-700" />
          <p className="text-slate-600 text-xs font-mono">Sin fichas de Google Business</p>
          <p className="text-slate-700 text-[10px] font-mono">
            {cliente.web
              ? 'Pulsa "Actualizar" para buscar por web del cliente'
              : 'Pulsa "Añadir" para registrar la ficha de Maps manualmente'}
          </p>
        </div>
      )}

      {fichaActual && (
        <>
          {fichaActual.gmaps_pendiente_validar && (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-sm p-3 flex items-start gap-3">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-300 mb-0.5">Ficha pendiente de validación</p>
                <p className="text-[10px] text-amber-500/80 font-mono">Encontrada automáticamente — ¿es la ficha correcta?</p>
                {fichaActual.gmaps_url && (
                  <a href={fichaActual.gmaps_url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-mono mt-1 block truncate">
                    {fichaActual.gmaps_url}
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => handleValidar(fichaActual.id, 'confirmar')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  <CheckCircle size={9} /> Sí
                </button>
                <button onClick={() => handleValidar(fichaActual.id, 'rechazar')}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors">
                  <XCircle size={9} /> No
                </button>
              </div>
            </div>
          )}

          {fichaActual.gmaps_nombre && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-300 font-mono">{fichaActual.gmaps_nombre}</p>
              {fichaActual.gestionada_por_bybusiness && (
                <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#D00000]/10 border border-[#D00000]/20 text-[#D00000]/80">
                  <BadgeCheck size={9} /> ByBusiness
                </span>
              )}
              <p className="text-[10px] text-slate-600 font-mono ml-auto">
                {fichaActual.gmaps_last_updated ? `↻ ${fmtFecha(fichaActual.gmaps_last_updated)}` : ''}
              </p>
            </div>
          )}

          <FichaDetalle ficha={fichaActual} historico={historico} />
        </>
      )}
    </div>
  );
};

TabGbp.propTypes = {
  cliente: PropTypes.shape({
    id:                      PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    nombre_comercial:        PropTypes.string,
    localidad_negocio:       PropTypes.string,
    localidad:               PropTypes.string,
    web:                     PropTypes.string,
    gmaps_nombre:            PropTypes.string,
    gmaps_url:               PropTypes.string,
    google_cid:              PropTypes.string,
    gmaps_rating:            PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    gmaps_reseñas:           PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    gmaps_address:           PropTypes.string,
    gmaps_sentiment:         PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    gmaps_pendiente_validar: PropTypes.bool,
    gmaps_last_updated:      PropTypes.string,
    bybusiness_url:          PropTypes.string,
  }).isRequired,
  n8nUrl: PropTypes.string.isRequired,
};

export default TabGbp;
