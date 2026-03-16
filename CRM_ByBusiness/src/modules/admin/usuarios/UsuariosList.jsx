import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Edit2, Trash2, Save, X, RefreshCw, Eye, EyeOff, PauseCircle, PlayCircle, AlertTriangle, ShieldCheck, ShieldOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';

// Endpoint n8n — VITE_N8N_URL debe estar definida en producción
const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

const ROLES = [
  { value: 'admin',        label: 'Administrador' },
  { value: 'supervisor',   label: 'Supervisor' },
  { value: 'operador',     label: 'Operador' },
  { value: 'en_practicas', label: 'En Prácticas' },
];

const ROLE_COLORS = {
  admin:        'bg-red-900/30 text-red-400 border border-red-800/50',
  supervisor:   'bg-purple-900/30 text-purple-400 border border-purple-800/50',
  operador:     'bg-blue-900/30 text-blue-400 border border-blue-800/50',
  en_practicas: 'bg-amber-900/30 text-amber-400 border border-amber-800/50',
};

const ESTADO_LLAMADA_DOT = {
  libre:    'bg-emerald-500',
  ocupado:  'bg-amber-500',
  ausente:  'bg-orange-500',
};

const emptyForm = { nombre: '', email: '', password: '', rol: 'operador' };

/** Panel de gestión de usuarios del CRM: alta, edición, ausencia, baja y 2FA. */
const UsuariosList = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const errorTimerRef = useRef(null);

  const [modo, setModo] = useState(null); // 'crear' | 'editar'
  const [formData, setFormData] = useState(emptyForm);
  const [showPwd, setShowPwd] = useState(false);

  // Ausencia confirmation
  const [confirmAusencia, setConfirmAusencia] = useState(null); // { id, nombre }
  const [confirmBaja, setConfirmBaja] = useState(null);
  // 2FA
  const [qrModal, setQrModal] = useState(null); // { nombre, email, secret }

  useEffect(() => () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); }, []);

  /** Carga la lista de usuarios desde n8n. */
  const cargar = () => {
    setLoading(true);
    setError(null);
    fetch(`${N8N}/crm-usuarios-get`)
      .then(r => r.json())
      .then(d => { if (d.ok) setUsuarios(d.usuarios); else setError('Error al cargar usuarios'); })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  /** Abre el formulario en modo creación. */
  const abrirCrear = () => { setFormData(emptyForm); setShowPwd(false); setModo('crear'); setConfirmAusencia(null); setConfirmBaja(null); };
  const abrirEditar = (u) => { setFormData({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, id: u.id }); setShowPwd(false); setModo('editar'); setConfirmAusencia(null); setConfirmBaja(null); };
  const cerrar = () => { setModo(null); setFormData(emptyForm); };

  /** Guarda el usuario (crear o editar) vía n8n. */
  const guardar = async () => {
    if (!formData.nombre || !formData.email || (modo === 'crear' && !formData.password)) return;
    setSaving(true);
    try {
      const url = modo === 'crear' ? `${N8N}/crm-crear-usuario` : `${N8N}/crm-editar-usuario`;
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const d = await r.json();
      if (modo === 'crear' && !d.ok) { setError('Email ya en uso'); return; }
      cargar(); cerrar();
    } catch { setError('Error al guardar'); }
    finally { setSaving(false); }
  };

  /** Marca al usuario como ausente y libera sus leads/callbacks al pool. */
  const marcarAusente = async (id) => {
    try {
      const r = await fetch(`${N8N}/crm-marcar-ausente`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await r.json();
      setConfirmAusencia(null);
      cargar();
      if (d.leads_liberados > 0 || d.callbacks_liberados > 0) {
        setError(`✓ Ausencia marcada. ${d.leads_liberados || 0} leads y ${d.callbacks_liberados || 0} callbacks liberados al pool.`);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setError(null), 5000);
      }
    } catch { setError('Error al marcar ausencia'); }
  };

  /** Genera secreto TOTP para el usuario y muestra el QR de configuración. */
  const activar2fa = async (u) => {
    try {
      const r = await fetch(`${N8N}/crm-activar-2fa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id }),
      });
      const d = await r.json();
      if (d.ok) { setQrModal({ nombre: u.nombre, email: u.email, secret: d.totp_secret }); cargar(); }
    } catch { setError('Error al activar 2FA'); }
  };

  /** Desactiva el 2FA del usuario. */
  const desactivar2fa = async (id) => {
    try {
      await fetch(`${N8N}/crm-desactivar-2fa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      cargar();
    } catch { setError('Error al desactivar 2FA'); }
  };

  /** Reactiva un usuario suspendido o ausente. */
  const reactivar = async (id) => {
    try {
      await fetch(`${N8N}/crm-reactivar-usuario`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      cargar();
    } catch { setError('Error al reactivar usuario'); }
  };

  /** Da de baja (suspende) al usuario. */
  const darDeBaja = async (id) => {
    try {
      await fetch(`${N8N}/crm-eliminar-usuario`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setConfirmBaja(null);
      cargar();
    } catch { setError('Error al dar de baja'); }
  };

  const activos = usuarios.filter(u => u.estado === 'activo');
  const suspendidos = usuarios.filter(u => u.estado === 'suspendido');
  const ausentes = usuarios.filter(u => u.estado_llamada === 'ausente');

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <Users size={20} className="text-[#D00000]" /> Gestión de Usuarios
          </h2>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">
            {activos.length} activos · {ausentes.length} ausentes · {suspendidos.length} suspendidos
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-sm transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={abrirCrear}
            className="flex items-center gap-2 bg-[#D00000] hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-sm transition-colors">
            <UserPlus size={14} /> NUEVO USUARIO
          </button>
        </div>
      </div>

      {/* Mensaje informativo / error */}
      {error && (
        <div className={`text-xs rounded-sm px-3 py-2 flex justify-between items-center ${error.startsWith('✓') ? 'text-emerald-400 bg-emerald-900/20 border border-emerald-800/40' : 'text-red-400 bg-red-900/20 border border-red-800/40'}`}>
          {error}
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Formulario crear / editar */}
      {modo && (
        <div className="bg-slate-900 border border-slate-700 rounded-sm p-4">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <span className="text-xs font-black uppercase tracking-widest text-white">
              {modo === 'crear' ? 'Alta de nuevo usuario' : 'Editar usuario'}
            </span>
            <button onClick={cerrar}><X size={14} className="text-slate-500 hover:text-white" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Nombre completo *" value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-[#D00000] font-mono" />
            <input placeholder="Email corporativo *" type="email" value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-[#D00000] font-mono" />
            <select value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-[#D00000]">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <div className="relative">
              <input placeholder={modo === 'editar' ? 'Nueva contraseña (dejar vacío = no cambiar)' : 'Contraseña inicial *'}
                type={showPwd ? 'text' : 'password'} value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-xs text-white outline-none focus:border-[#D00000] font-mono pr-8" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPwd ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={cerrar}
              className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-sm border border-slate-700 hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-sm transition-colors">
              <Save size={12} /> {saving ? 'Guardando...' : 'GUARDAR'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmación ausencia */}
      {confirmAusencia && (
        <div className="bg-orange-950/30 border border-orange-700/50 rounded-sm p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-orange-300 mb-1">Marcar ausente: {confirmAusencia.nombre}</p>
              <p className="text-[10px] text-slate-400 mb-3">
                Sus leads asignados volverán al pool común y sus callbacks quedarán sin asignar hasta que otro operador los retome o vuelva a la actividad.
              </p>
              <div className="flex gap-2">
                <button onClick={() => marcarAusente(confirmAusencia.id)}
                  className="text-[10px] font-bold px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded-sm">
                  CONFIRMAR AUSENCIA
                </button>
                <button onClick={() => setConfirmAusencia(null)}
                  className="text-[10px] px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-sm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR 2FA */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-400" /> 2FA Activado
              </span>
              <button onClick={() => setQrModal(null)}><X size={14} className="text-slate-500 hover:text-white" /></button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Muestra este QR a <span className="text-white font-bold">{qrModal.nombre}</span> para que lo escanee con Google Authenticator.
            </p>
            <div className="p-3 bg-white rounded-sm">
              <QRCodeSVG
                value={new OTPAuth.TOTP({ issuer: 'ByBusiness', label: qrModal.email, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(qrModal.secret) }).toString()}
                size={160} level="M"
              />
            </div>
            <p className="text-[9px] text-slate-600 font-mono text-center break-all">{qrModal.secret}</p>
            <p className="text-[10px] text-amber-400 text-center">
              En el próximo login el usuario verá "Nuevo dispositivo → Vincular" para escanear su QR.
            </p>
            <button onClick={() => setQrModal(null)}
              className="w-full text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white py-2 rounded-sm">
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex-1 flex flex-col gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-800/50 rounded-sm animate-pulse" />)}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                {['Usuario', 'Email', 'Rol', 'Estado', 'Alta', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {usuarios.map(u => {
                const isSuspendido = u.estado === 'suspendido';
                const isAusente = u.estado_llamada === 'ausente';
                return (
                  <tr key={u.id} className={`group hover:bg-slate-800/30 transition-colors ${isSuspendido ? 'opacity-35' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-7 h-7 rounded-sm bg-slate-800 flex items-center justify-center text-[#D00000] font-black text-xs">
                            {(u.nombre || u.email).charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${ESTADO_LLAMADA_DOT[u.estado_llamada] || 'bg-slate-600'}`} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{u.nombre}</span>
                          {isAusente && <span className="text-[8px] text-orange-400 uppercase font-black tracking-widest">Ausente</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm ${ROLE_COLORS[u.rol] || 'bg-slate-800 text-slate-400'}`}>
                        {ROLES.find(r => r.value === u.rol)?.label || u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono uppercase ${isSuspendido ? 'text-red-500' : 'text-emerald-400'}`}>
                        {isSuspendido ? 'Suspendido' : 'Activo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-600 font-mono">{u.created_at || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!isSuspendido && (
                          <button onClick={() => abrirEditar(u)} title="Editar"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-blue-400 transition-colors">
                            <Edit2 size={13} />
                          </button>
                        )}
                        {!isSuspendido && !isAusente && (
                          <button onClick={() => setConfirmAusencia({ id: u.id, nombre: u.nombre })} title="Marcar ausente"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-orange-400 transition-colors">
                            <PauseCircle size={13} />
                          </button>
                        )}
                        {isAusente && (
                          <button onClick={() => reactivar(u.id)} title="Reactivar"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-emerald-400 transition-colors">
                            <PlayCircle size={13} />
                          </button>
                        )}
                        {!isSuspendido && (
                          u.totp_habilitado ? (
                            <button onClick={() => desactivar2fa(u.id)} title="Desactivar 2FA"
                              className="p-1.5 hover:bg-slate-700 rounded-sm text-emerald-400 transition-colors" >
                              <ShieldCheck size={13} />
                            </button>
                          ) : (
                            <button onClick={() => activar2fa(u)} title="Activar 2FA"
                              className="p-1.5 hover:bg-slate-700 rounded-sm text-slate-500 hover:text-emerald-400 transition-colors">
                              <ShieldOff size={13} />
                            </button>
                          )
                        )}
                        {!isSuspendido && (
                          confirmBaja === u.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-red-400">¿Dar de baja?</span>
                              <button onClick={() => darDeBaja(u.id)}
                                className="text-[9px] px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded-sm font-bold">Sí</button>
                              <button onClick={() => setConfirmBaja(null)}
                                className="text-[9px] px-2 py-1 bg-slate-700 text-white rounded-sm">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmBaja(u.id)} title="Dar de baja"
                              className="p-1.5 hover:bg-slate-700 rounded-sm text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsuariosList;
