import React, { useState } from 'react';
import { Copy, Phone, Star, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import EmptyState from '../../../shared/ui/EmptyState';
import { fmtFechaHora } from '../../../utils/dates';

const RESULTADO_CONFIG = {
  venta:        { label: 'VENTA',        color: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' },
  callback:     { label: 'CALLBACK',     color: 'bg-blue-900/30 text-blue-400 border-blue-700/40' },
  responsable:  { label: 'RESPONSABLE',  color: 'bg-amber-900/30 text-amber-400 border-amber-700/40' },
  enviar_info:  { label: 'ENVIAR INFO',  color: 'bg-indigo-900/30 text-indigo-400 border-indigo-700/40' },
  no_interesa:  { label: 'NO INTERESA',  color: 'bg-orange-900/30 text-orange-400 border-orange-700/40' },
  no_contesta:  { label: 'NO CONTESTA',  color: 'bg-slate-800 text-slate-400 border-slate-700' },
  error:        { label: 'ERROR',        color: 'bg-red-900/30 text-[#D00000] border-red-800/40' },
};

const BOTONES_RESULTADO = [
  { id: 'venta',       label: 'VENTA',        cls: 'hover:bg-emerald-900/40 hover:text-emerald-300 hover:border-emerald-700' },
  { id: 'callback',    label: 'CALLBACK',     cls: 'hover:bg-blue-900/40 hover:text-blue-300 hover:border-blue-700' },
  { id: 'responsable', label: 'RESPONSABLE',  cls: 'hover:bg-amber-900/40 hover:text-amber-300 hover:border-amber-700' },
  { id: 'enviar_info', label: 'ENVIAR INFO',  cls: 'hover:bg-indigo-900/40 hover:text-indigo-300 hover:border-indigo-700' },
  { id: 'no_interesa', label: 'NO INTERESA',  cls: 'hover:bg-orange-900/40 hover:text-orange-300 hover:border-orange-700' },
  { id: 'no_contesta', label: 'NO CONTESTA',  cls: 'hover:bg-slate-700 hover:text-slate-300 hover:border-slate-600', directo: true },
  { id: 'error',       label: 'ERROR',        cls: 'hover:bg-red-900/40 hover:text-red-400 hover:border-red-700' },
];

const ACTIVO_CLS = {
  venta:       'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  callback:    'bg-blue-900/40 text-blue-300 border-blue-700',
  responsable: 'bg-amber-900/40 text-amber-300 border-amber-700',
  enviar_info: 'bg-indigo-900/40 text-indigo-300 border-indigo-700',
  no_interesa: 'bg-orange-900/40 text-orange-300 border-orange-700',
  no_contesta: 'bg-slate-700 text-slate-300 border-slate-600',
  error:       'bg-red-900/40 text-red-400 border-red-700',
};

const PopupBase = ({ titulo, onConfirm, onCancel, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-md mx-4 p-5 flex flex-col gap-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-300">{titulo}</p>
      {children}
      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 rounded-sm hover:bg-slate-700 hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#D00000] text-white rounded-sm hover:bg-red-700 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
);

const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono placeholder:text-slate-600";
const labelCls = "text-[10px] text-slate-500 uppercase tracking-widest font-black";

const PopupVenta = ({ lead, onConfirm, onCancel }) => {
  const [emailConf, setEmailConf] = useState(lead?.email_negocio || lead?.email || '');
  const [nombreContacto, setNombreContacto] = useState('');
  const [notas, setNotas] = useState('');
  return (
    <PopupBase titulo="Cerrar venta" onConfirm={() => onConfirm({ email_confirmacion: emailConf, nombre_contacto: nombreContacto, notas })} onCancel={onCancel}>
      <div className="flex flex-col gap-3">
        <div><p className={labelCls}>Email confirmación</p><input className={inputCls} value={emailConf} onChange={e => setEmailConf(e.target.value)} placeholder="email@negocio.com" /></div>
        <div><p className={labelCls}>Nombre contacto</p><input className={inputCls} value={nombreContacto} onChange={e => setNombreContacto(e.target.value)} placeholder="Nombre del responsable" /></div>
        <div><p className={labelCls}>Notas de cierre</p><textarea className={inputCls + ' resize-none'} rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Detalles del cierre..." /></div>
      </div>
    </PopupBase>
  );
};

const PopupCallback = ({ onConfirm, onCancel }) => {
  const [fecha, setFecha] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [notas, setNotas] = useState('');
  return (
    <PopupBase titulo="Programar callback" onConfirm={() => onConfirm({ fecha_programada: fecha, nombre_contacto: nombreContacto, notas })} onCancel={onCancel}>
      <div className="flex flex-col gap-3">
        <div><p className={labelCls}>Fecha y hora</p><input type="datetime-local" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div><p className={labelCls}>Nombre contacto</p><input className={inputCls} value={nombreContacto} onChange={e => setNombreContacto(e.target.value)} placeholder="¿Con quién llamamos?" /></div>
        <div><p className={labelCls}>Notas</p><textarea className={inputCls + ' resize-none'} rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Motivo del callback..." /></div>
      </div>
    </PopupBase>
  );
};

const PopupResponsable = ({ onConfirm, onCancel }) => {
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  return (
    <PopupBase titulo="Datos del responsable" onConfirm={() => onConfirm({ nombre_responsable: nombre, cargo, telefono_directo: telefono, email_directo: email })} onCancel={onCancel}>
      <div className="flex flex-col gap-3">
        <div><p className={labelCls}>Nombre</p><input className={inputCls} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" /></div>
        <div><p className={labelCls}>Cargo</p><input className={inputCls} value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Director, Gerente..." /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><p className={labelCls}>Teléfono directo</p><input className={inputCls} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+34 600..." /></div>
          <div><p className={labelCls}>Email directo</p><input className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@..." /></div>
        </div>
      </div>
    </PopupBase>
  );
};

const PopupEnviarInfo = ({ lead, onConfirm, onCancel }) => {
  const [emailDest, setEmailDest] = useState(lead?.email_negocio || lead?.email || '');
  const [tipo, setTipo] = useState('info_general');
  const [nota, setNota] = useState('');
  return (
    <PopupBase titulo="Enviar información" onConfirm={() => onConfirm({ email_destino: emailDest, tipo_info: tipo, nota })} onCancel={onCancel}>
      <div className="flex flex-col gap-3">
        <div><p className={labelCls}>Email destino</p><input className={inputCls} value={emailDest} onChange={e => setEmailDest(e.target.value)} placeholder="email@negocio.com" /></div>
        <div>
          <p className={labelCls}>Tipo de información</p>
          <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="info_general">Info general</option>
            <option value="propuesta">Propuesta comercial</option>
            <option value="catalogo">Catálogo servicios</option>
            <option value="caso_exito">Caso de éxito</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div><p className={labelCls}>Nota</p><textarea className={inputCls + ' resize-none'} rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Detalle adicional..." /></div>
      </div>
    </PopupBase>
  );
};

const PopupNoInteresa = ({ onConfirm, onCancel }) => {
  const [razon, setRazon] = useState('precio');
  const [diasFreeze, setDiasFreeze] = useState(30);
  return (
    <PopupBase titulo="No interesa" onConfirm={() => onConfirm({ razon, dias_freeze: diasFreeze })} onCancel={onCancel}>
      <div className="flex flex-col gap-3">
        <div>
          <p className={labelCls}>Razón</p>
          <select className={inputCls} value={razon} onChange={e => setRazon(e.target.value)}>
            <option value="precio">Precio</option>
            <option value="tiempo">Sin tiempo</option>
            <option value="ya_tiene">Ya tiene el servicio</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div><p className={labelCls}>Días sin contactar</p><input type="number" className={inputCls} value={diasFreeze} min={1} max={365} onChange={e => setDiasFreeze(Number(e.target.value))} /></div>
      </div>
    </PopupBase>
  );
};

const PopupError = ({ onConfirm, onCancel }) => {
  const [tipo, setTipo] = useState('numero_equivocado');
  return (
    <PopupBase titulo="Tipo de error" onConfirm={() => onConfirm({ tipo_error: tipo })} onCancel={onCancel}>
      <div>
        <p className={labelCls}>Tipo</p>
        <select className={inputCls} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="numero_equivocado">Número equivocado</option>
          <option value="no_existe">Número no existe</option>
          <option value="fuera_de_servicio">Fuera de servicio</option>
        </select>
      </div>
    </PopupBase>
  );
};

const HistorialLead = ({ historialLlamadas }) => {
  if (!historialLlamadas || historialLlamadas.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 bg-slate-900/50 border border-slate-800 rounded-sm">
        <Phone size={12} className="text-slate-600 shrink-0" />
        <p className="text-[11px] text-slate-600 italic">Primera vez que contactamos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {historialLlamadas.slice(0, 5).map((item, i) => {
        const cfg = RESULTADO_CONFIG[item.resultado] || RESULTADO_CONFIG['no_contesta'];
        return (
          <div key={i} className="flex items-start gap-2 py-2 px-3 bg-slate-900/50 border border-slate-800 rounded-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-slate-500">{fmtFechaHora(item.fecha_llamada || item.fecha_evento)}</span>
                {item.operador_nombre && <span className="text-[10px] text-slate-600 truncate">· {item.operador_nombre}</span>}
              </div>
              {item.notas && <p className="text-[11px] text-slate-400 truncate">{item.notas}</p>}
            </div>
            <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 border rounded-sm ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
        );
      })}
      {historialLlamadas.length > 5 && (
        <p className="text-[10px] text-slate-600 text-center pt-1">+{historialLlamadas.length - 5} contactos anteriores</p>
      )}
    </div>
  );
};

const ScoreStars = ({ score }) => {
  if (!score && score !== 0) return null;
  const normalized = Math.round(Math.min(Math.max(score, 0), 5));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={12}
          className={n <= normalized ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}
        />
      ))}
      <span className="text-[10px] font-mono text-slate-500 ml-1">{score}</span>
    </div>
  );
};

const Zone2Content = ({
  leadActivo,
  historialLlamadas = [],
  isTraining,
  notas,
  setNotas,
  elapsedString,
  onResultado,
  onEnviarInfo,
}) => {
  const lead = leadActivo;

  const [activeTab, setActiveTab] = useState('GUION');
  const [popupActivo, setPopupActivo] = useState(null);

  const [emailNegocio, setEmailNegocio] = useState(lead?.email_negocio || lead?.email || '');
  const [nombreContacto, setNombreContacto] = useState(lead?.contacto_nombre || '');
  const [emailContacto, setEmailContacto] = useState(lead?.contacto_email || '');

  const abrirPopup = (resultadoId) => {
    if (resultadoId === 'no_contesta') {
      onResultado('no_contesta', {});
      return;
    }
    setPopupActivo(resultadoId);
  };

  const confirmarPopup = (detalles) => {
    if (popupActivo === 'enviar_info') {
      onEnviarInfo(detalles.email_destino, detalles.tipo_info, detalles.nota);
    } else {
      onResultado(popupActivo, detalles);
    }
    setPopupActivo(null);
  };

  const renderPopup = () => {
    if (!popupActivo) return null;
    const cancel = () => setPopupActivo(null);
    switch (popupActivo) {
      case 'venta':       return <PopupVenta lead={lead} onConfirm={confirmarPopup} onCancel={cancel} />;
      case 'callback':    return <PopupCallback onConfirm={confirmarPopup} onCancel={cancel} />;
      case 'responsable': return <PopupResponsable onConfirm={confirmarPopup} onCancel={cancel} />;
      case 'enviar_info': return <PopupEnviarInfo lead={lead} onConfirm={confirmarPopup} onCancel={cancel} />;
      case 'no_interesa': return <PopupNoInteresa onConfirm={confirmarPopup} onCancel={cancel} />;
      case 'error':       return <PopupError onConfirm={confirmarPopup} onCancel={cancel} />;
      default: return null;
    }
  };

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          title={isTraining ? 'Pulsa "Siguiente cliente" para empezar' : 'Asigna un lead para empezar'}
          icon={Phone}
          description={isTraining ? 'Se asignará un cliente ficticio para practicar' : 'Tu próxima gestión aparecerá aquí'}
        />
      </div>
    );
  }

  return (
    <>
      {renderPopup()}

      <div className="flex-1 flex flex-row gap-4 min-w-0">

        {/* COLUMNA IZQUIERDA — Datos del lead */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* Nombre comercial */}
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-white leading-tight">
              {lead.nombre_comercial || 'Sin nombre'}
            </h2>
            {lead.scoring !== undefined && <ScoreStars score={lead.scoring} />}
          </div>

          {/* Teléfono */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono tracking-wider text-white">{lead.telefono || '—'}</span>
            <button
              onClick={() => navigator.clipboard.writeText(lead.telefono || '')}
              className="p-1.5 bg-slate-800 border border-slate-700 rounded-sm text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
              title="Copiar teléfono"
            >
              <Copy size={13} />
            </button>
          </div>

          {/* Localidad + Provincia + Sector */}
          <div className="flex flex-col gap-1">
            {(lead.localidad || lead.provincia) && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-black w-14 shrink-0">Localidad</span>
                <span className="text-xs font-mono text-slate-300">
                  {[lead.localidad, lead.provincia].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {(lead.sector || lead.categoria) && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-black w-14 shrink-0">Sector</span>
                <span className="text-xs font-mono text-slate-300">{lead.sector || lead.categoria}</span>
              </div>
            )}
          </div>

          {/* Email negocio (editable) */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={labelCls}>Email negocio</span>
              <span className="text-[9px] text-amber-500 border border-amber-800/40 bg-amber-900/20 px-1.5 py-0.5 rounded-sm font-black uppercase tracking-wider">
                sin verificar
              </span>
            </div>
            <input
              className={inputCls}
              value={emailNegocio}
              onChange={e => setEmailNegocio(e.target.value)}
              placeholder="email@negocio.com"
            />
          </div>

          {/* Nombre contacto real */}
          <div>
            <p className={labelCls + ' mb-1'}>Nombre contacto real</p>
            <input
              className={inputCls}
              value={nombreContacto}
              onChange={e => setNombreContacto(e.target.value)}
              placeholder="Responsable que atiende"
            />
          </div>

          {/* Email contacto real */}
          <div>
            <p className={labelCls + ' mb-1'}>Email contacto real</p>
            <input
              className={inputCls}
              value={emailContacto}
              onChange={e => setEmailContacto(e.target.value)}
              placeholder="contacto@personal.com"
            />
          </div>

          {/* Perfil training */}
          {isTraining && lead.perfil_cliente && (
            <div className="bg-slate-950 border border-[#D00000]/30 rounded-sm p-3">
              <p className="text-[9px] text-[#D00000] uppercase tracking-widest font-black mb-1">
                Perfil del cliente (solo tú lo ves)
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">{lead.perfil_cliente}</p>
              {lead.objeciones_tipo && (
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <p className="text-[9px] text-amber-400 uppercase tracking-widest font-black mb-1">Objeciones típicas</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{lead.objeciones_tipo}</p>
                </div>
              )}
            </div>
          )}

          {/* Historial de contactos previos */}
          <div>
            <p className={labelCls + ' mb-2'}>Historial contactos</p>
            <HistorialLead historialLlamadas={historialLlamadas} />
          </div>
        </div>

        {/* COLUMNA DERECHA — Acción */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Tabs GUIÓN | REPUTACIÓN */}
          <div className="flex border-b border-slate-800">
            {[['GUION', 'GUIÓN'], ['REPUTACION', 'REPUTACIÓN']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === id
                    ? 'text-white border-b-2 border-[#D00000]'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contenido tab */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'GUION' && (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-black mb-1">Apertura</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "Hola, ¿hablo con el responsable de <strong className="text-white">{lead.nombre_comercial}</strong>? Soy [NOMBRE] de ByBusiness. Le llamo porque analizamos negocios del sector <strong className="text-white">{lead.sector || lead.categoria || 'su sector'}</strong> en <strong className="text-white">{lead.localidad || 'su zona'}</strong>. ¿Tiene un momento?"
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-400 uppercase tracking-widest font-black mb-1">Propuesta de valor</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "Detectamos oportunidades de mejora en su presencia digital — Google Maps, reseñas, visibilidad local. ¿Le interesaría una evaluación gratuita sin compromiso?"
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#D00000] uppercase tracking-widest font-black mb-1">Cierre</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      "Perfecto. ¿Podemos agendar 15 minutos para revisar los resultados juntos? ¿Qué día le viene mejor esta semana?"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'REPUTACION' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Monitor de Reputación</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Próximamente</p>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>· Puntuación de reputación en tiempo real</li>
                    <li>· Análisis de reseñas de Google Maps</li>
                    <li>· Alertas de reputación crítica</li>
                    <li>· Comparativa con competencia</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 py-2 px-3 bg-slate-900 border border-slate-800 rounded-sm">
            <Clock size={12} className="text-slate-600" />
            <span className="text-xs font-mono text-slate-400">{elapsedString}</span>
          </div>

          {/* Notas */}
          <textarea
            placeholder="Notas de la llamada (opcional)"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono resize-none placeholder:text-slate-600"
          />

          {/* Botones de resultado */}
          <div className="grid grid-cols-4 gap-1.5">
            {BOTONES_RESULTADO.map(btn => (
              <button
                key={btn.id}
                onClick={() => abrirPopup(btn.id)}
                className={`px-2 py-2 text-[10px] font-black uppercase tracking-wider border rounded-sm transition-all text-slate-500 border-slate-800 bg-slate-950 ${btn.cls}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Zone2Content;
