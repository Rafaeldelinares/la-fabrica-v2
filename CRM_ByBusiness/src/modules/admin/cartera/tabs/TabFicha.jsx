import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { Phone, Mail, User, Globe, FileText, Building2, ExternalLink, BadgeCheck, CalendarClock, CheckCircle, AlertTriangle } from 'lucide-react';
import DatePickerField from '../../../../shared/ui/DatePickerField';

/**
 * TabFicha — Pestaña de datos de contacto, localización y próxima acción del cliente.
 * Incluye zona de peligro para dar de baja la empresa (soft delete).
 * @param {{ cliente: object, n8nUrl: string, onGestorChanged: Function, onClienteBaja: Function }} props
 */
const TabFicha = ({ cliente, n8nUrl, onGestorChanged, onClienteBaja }) => {
  const [proximaFecha, setProximaFecha] = useState(cliente.proxima_accion_fecha?.slice(0, 10) || '');
  const [proximaNota,  setProximaNota]  = useState(cliente.proxima_accion_nota  || '');
  const [guardando, setGuardando]       = useState(false);
  const [guardado,  setGuardado]        = useState(false);
  const [gestores,      setGestores]    = useState([]);
  const [gestorId,      setGestorId]    = useState(cliente.gestor_id || '');
  const [guardandoGest, setGuardandoGest] = useState(false);
  const [guardadoGest,  setGuardadoGest]  = useState(false);
  const [errorGest,     setErrorGest]     = useState(null);
  const [errorProxima,  setErrorProxima]  = useState(null);
  const [errorGestores, setErrorGestores] = useState(null);
  const [confirmBaja,   setConfirmBaja]   = useState(null); // null | 'baja' | 'eliminar'
  const [dandoBaja,     setDandoBaja]     = useState(false);
  const [errorBaja,     setErrorBaja]     = useState(null);
  const [byBusinessUrl,  setByBusinessUrl]  = useState(cliente.bybusiness_url || '');
  const [guardandoBy,    setGuardandoBy]    = useState(false);
  const [guardadoBy,     setGuardadoBy]     = useState(false);
  const [errorBy,        setErrorBy]        = useState(null);

  const timerGuardado     = useRef(null);
  const timerGuardadoGest = useRef(null);
  const timerGuardadoBy   = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(timerGuardado.current);
      clearTimeout(timerGuardadoGest.current);
      clearTimeout(timerGuardadoBy.current);
    };
  }, []);

  useEffect(() => {
    fetch(`${n8nUrl}/crm-usuarios-get`)
      .then(res => res.json())
      .then(data => { if (data.ok) setGestores(data.usuarios.filter(usr => usr.rol === 'admin')); })
      .catch(() => { setGestores([]); setErrorGestores('Error al cargar gestores'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveGestor = async () => {
    setGuardandoGest(true);
    setErrorGest(null);
    try {
      await fetch(`${n8nUrl}/crm-cliente-gestor-asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, gestor_id: gestorId || null }),
      });
      setGuardadoGest(true);
      clearTimeout(timerGuardadoGest.current);
      timerGuardadoGest.current = setTimeout(() => setGuardadoGest(false), 2000);
      const gestor = gestores.find(candidato => String(candidato.id) === String(gestorId));
      onGestorChanged?.({ gestor_id: gestorId || null, gestor_nombre: gestor?.nombre || null });
    } catch { setErrorGest('Error al guardar gestor'); } finally { setGuardandoGest(false); }
  };

  const handleSaveProxima = async () => {
    setGuardando(true);
    setErrorProxima(null);
    try {
      await fetch(`${n8nUrl}/crm-cliente-proxima-accion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, fecha: proximaFecha || null, nota: proximaNota || null }),
      });
      setGuardado(true);
      clearTimeout(timerGuardado.current);
      timerGuardado.current = setTimeout(() => setGuardado(false), 2000);
    } catch { setErrorProxima('Error al guardar próxima acción'); } finally { setGuardando(false); }
  };

  const handleSaveByBusinessUrl = async () => {
    setGuardandoBy(true);
    setErrorBy(null);
    try {
      await fetch(`${n8nUrl}/crm-cliente-bybusiness-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, bybusiness_url: byBusinessUrl || null }),
      });
      setGuardadoBy(true);
      clearTimeout(timerGuardadoBy.current);
      timerGuardadoBy.current = setTimeout(() => setGuardadoBy(false), 2000);
    } catch { setErrorBy('Error al guardar'); } finally { setGuardandoBy(false); }
  };

  const handleDarDeBaja = async () => {
    setDandoBaja(true);
    setErrorBaja(null);
    try {
      const res = await fetch(`${n8nUrl}/crm-cliente-baja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: cliente.id, tipo: confirmBaja }),
      });
      const d = await res.json();
      if (d.ok) { onClienteBaja?.(); }
      else { setErrorBaja('Error al procesar'); }
    } catch { setErrorBaja('Error de conexión'); } finally { setDandoBaja(false); }
  };

  const localidadComercialDiferente =
    cliente.localidad_negocio && cliente.localidad_negocio !== cliente.localidad;

  return (
    <div className="flex flex-col gap-0">
      {/* Datos de contacto */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex flex-col gap-2">
          {cliente.telefono && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Phone size={12} className="text-slate-600 shrink-0" />{cliente.telefono}
            </div>
          )}
          {cliente.email && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Mail size={12} className="text-slate-600 shrink-0" />{cliente.email}
            </div>
          )}
          <div className="flex items-center gap-2">
            <User size={12} className="text-slate-600 shrink-0" />
            <select
              value={gestorId}
              onChange={e => { setGestorId(e.target.value); setGuardadoGest(false); }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-sm px-2 py-1 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 transition-colors"
            >
              <option value="">— Sin gestor —</option>
              {gestores.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            <button
              onClick={handleSaveGestor}
              disabled={guardandoGest || String(gestorId) === String(cliente.gestor_id || '')}
              className={`text-[9px] font-mono px-2 py-1 rounded-sm border transition-colors shrink-0 ${
                guardadoGest
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 disabled:opacity-30'
              }`}
            >
              {guardadoGest ? '✓' : guardandoGest ? '…' : 'OK'}
            </button>
          </div>
          {errorGestores && (
            <p className="text-[10px] text-red-400 font-mono">{errorGestores}</p>
          )}
          {errorGest && (
            <p className="text-[10px] text-red-400 font-mono">{errorGest}</p>
          )}
          {cliente.actividad && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <FileText size={12} className="text-slate-600 shrink-0" />{cliente.actividad}
            </div>
          )}
          {cliente.cif && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <FileText size={12} className="text-slate-600 shrink-0" />CIF: {cliente.cif}
            </div>
          )}
          {cliente.web && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Globe size={12} className="text-slate-600 shrink-0" />
              <a href={cliente.web.startsWith('http') ? cliente.web : `https://${cliente.web}`}
                target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate">
                {cliente.web}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2">
            <BadgeCheck size={12} className="text-[#D00000] shrink-0" />
            <input
              type="url"
              value={byBusinessUrl}
              onChange={e => { setByBusinessUrl(e.target.value); setGuardadoBy(false); }}
              placeholder="https://bybusiness.es/slug-negocio"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-sm px-2 py-1 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 transition-colors placeholder:text-slate-700 min-w-0"
            />
            {byBusinessUrl && (
              <a href={byBusinessUrl} target="_blank" rel="noopener noreferrer"
                className="text-slate-600 hover:text-slate-400 shrink-0 transition-colors">
                <ExternalLink size={11} />
              </a>
            )}
            <button
              onClick={handleSaveByBusinessUrl}
              disabled={guardandoBy || byBusinessUrl === (cliente.bybusiness_url || '')}
              className={`text-[9px] font-mono px-2 py-1 rounded-sm border transition-colors shrink-0 ${
                guardadoBy
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 disabled:opacity-30'
              }`}
            >
              {guardadoBy ? '✓' : guardandoBy ? '…' : 'OK'}
            </button>
          </div>
          {errorBy && <p className="text-[10px] text-red-400 font-mono">{errorBy}</p>}
        </div>
      </div>

      {/* Localización */}
      <div className="px-5 py-3 border-b border-slate-800">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-2">Localización</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <FileText size={11} className="text-slate-700 shrink-0" />
            <span className="text-slate-600">Fiscal:</span>
            <span>{[cliente.localidad, cliente.provincia].filter(Boolean).join(', ') || '—'}</span>
          </div>
          {localidadComercialDiferente && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Building2 size={11} className="text-slate-500 shrink-0" />
              <span className="text-slate-500">Negocio:</span>
              <span className="text-slate-300">
                {[cliente.localidad_negocio, cliente.provincia_negocio].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {cliente.notas_internas && (
        <div className="px-5 py-3 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-1.5">Última interacción</p>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{cliente.notas_internas}</p>
        </div>
      )}

      {cliente.seo_ref && (
        <div className="px-5 py-3 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-1.5">SEO / Keywords</p>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">{cliente.seo_ref}</p>
        </div>
      )}

      {/* Próxima acción */}
      <div className="px-5 py-4 border-b border-slate-800">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
          <CalendarClock size={10} /> Próxima acción
        </p>
        <div className="flex flex-col gap-2">
          <DatePickerField
            selected={proximaFecha ? new Date(proximaFecha) : null}
            onChange={(date) => setProximaFecha(date ? format(date, 'yyyy-MM-dd') : '')}
            placeholderText="DD/MM/AAAA"
          />
          <textarea
            value={proximaNota}
            onChange={e => setProximaNota(e.target.value)}
            placeholder="Nota sobre la próxima acción…"
            rows={2}
            className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 resize-none placeholder:text-slate-600 w-full"
          />
          {errorProxima && (
            <p className="text-[10px] text-red-400 font-mono">{errorProxima}</p>
          )}
          <button
            onClick={handleSaveProxima}
            disabled={guardando}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border border-slate-700 rounded-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 w-full"
          >
            {guardado
              ? <><CheckCircle size={10} className="text-emerald-400" /> Guardado</>
              : guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
      {/* Zona de peligro — dar de baja */}
      <div className="px-5 py-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
          <AlertTriangle size={10} className="text-red-500/60" /> Zona de peligro
        </p>
        {!confirmBaja ? (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmBaja('baja')}
              className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest border border-amber-500/20 rounded-sm text-amber-500/60 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
            >
              Dar de baja
            </button>
            <button
              onClick={() => setConfirmBaja('eliminar')}
              className="flex-1 py-2 text-[10px] font-mono uppercase tracking-widest border border-red-500/20 rounded-sm text-red-500/60 hover:text-red-400 hover:border-red-500/40 transition-colors"
            >
              Eliminar empresa
            </button>
          </div>
        ) : (
          <div className="border border-red-500/30 rounded-sm p-3 bg-red-500/5 flex flex-col gap-2">
            <p className="text-[10px] text-red-400 font-mono leading-relaxed">
              {confirmBaja === 'eliminar'
                ? <>⚠️ Eliminar <strong>{cliente.nombre_comercial}</strong> de forma permanente. No se puede deshacer.</>
                : <>¿Dar de baja <strong>{cliente.nombre_comercial}</strong>? Quedará inactiva pero podrá reactivarse.</>
              }
            </p>
            {errorBaja && <p className="text-[10px] text-red-400 font-mono">{errorBaja}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDarDeBaja}
                disabled={dandoBaja}
                className="flex-1 py-1.5 text-[10px] font-mono uppercase tracking-widest bg-red-500/20 border border-red-500/40 rounded-sm text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-40"
              >
                {dandoBaja ? 'Procesando…' : 'Confirmar'}
              </button>
              <button
                onClick={() => { setConfirmBaja(null); setErrorBaja(null); }}
                className="px-3 py-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

TabFicha.propTypes = {
  cliente:         PropTypes.object.isRequired,
  n8nUrl:          PropTypes.string.isRequired,
  onGestorChanged: PropTypes.func,
  onClienteBaja:   PropTypes.func,
};

export default TabFicha;
