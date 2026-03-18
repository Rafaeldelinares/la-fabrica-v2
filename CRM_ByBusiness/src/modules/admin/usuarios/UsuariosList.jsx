import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Users, UserPlus, Edit2, Trash2, Save, X, RefreshCw, Eye, EyeOff,
  PauseCircle, PlayCircle, AlertTriangle, ShieldCheck, ShieldOff, UserX, ChevronRight, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';
import { fmtFecha } from '../../../utils/dates';
import { useAuth } from '../../auth/AuthContext';
import HorarioModal from './HorarioModal';

const N8N      = import.meta.env.VITE_N8N_URL;
const N8N_AUS  = import.meta.env.VITE_N8N_AUSENCIAS_URL;
const N8N_GEST = import.meta.env.VITE_N8N_GESTIONES_URL;

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

const ESTADO_DOT = {
  libre:    'bg-emerald-500',
  ocupado:  'bg-amber-500',
  ausente:  'bg-orange-500',
};

const emptyForm = { nombre: '', email: '', password: '', rol: 'operador' };

/**
 * Modal de 2 pasos para gestionar ausencia o baja definitiva de un usuario.
 * Paso 1: asignar cubridor a cada gestión activa (cliente/cita).
 * Paso 2 (solo baja): confirmación final irreversible.
 * @param {{ usuario: Object, modo: 'ausencia'|'baja', adminsActivos: Array, onConfirm: Function, onCancel: Function }} props
 */
const DelegacionModal = ({ usuario, modo, adminsActivos, onConfirm, onCancel }) => {
  const [gestiones, setGestiones]   = useState(null);
  const [asignaciones, setAsignaciones] = useState({});
  const [paso, setPaso]             = useState(1);
  const [cargando, setCargando]     = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    setCargando(true);
    setErrorCarga(null);
    fetch(`${N8N_GEST}?operador_id=${usuario.id}`)
      .then(res => res.json())
      .then(resData => {
        const gs = Array.isArray(resData.gestiones) ? resData.gestiones : [];
        setGestiones(gs);
        const init = {};
        gs.forEach((gestItem, gestIdx) => { init[gestIdx] = { cubridor_id: '', nuevas_al_cubridor: true }; });
        setAsignaciones(init);
      })
      .catch(() => { setGestiones([]); setErrorCarga('Error al cargar gestiones activas'); })
      .finally(() => setCargando(false));
  }, [usuario.id]);

  const todasAsignadas = gestiones?.length === 0 ||
    Object.values(asignaciones).every(a => a.cubridor_id !== '');

  const handleConfirm = () => {
    if (paso === 1 && modo === 'baja' && gestiones?.length > 0) { setPaso(2); return; }
    const delegaciones = (gestiones || []).map((gestion, gestionIdx) => ({
      tipo:              gestion.tipo,
      referencia_id:     gestion.referencia_id,
      cubridor_id:       parseInt(asignaciones[gestionIdx]?.cubridor_id) || null,
      nuevas_al_cubridor: asignaciones[gestionIdx]?.nuevas_al_cubridor ?? true,
    }));
    onConfirm(delegaciones);
  };

  const esBaja = modo === 'baja';
  const titulo = esBaja ? 'Baja definitiva' : 'Marcar ausente';
  const colorBorde = esBaja ? 'border-red-700/50' : 'border-orange-700/50';
  const colorTitulo = esBaja ? 'text-red-400' : 'text-orange-400';
  const colorBtn = esBaja ? 'bg-red-700 hover:bg-red-600' : 'bg-orange-700 hover:bg-orange-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`bg-slate-900 border ${colorBorde} rounded-sm w-full max-w-lg max-h-[85vh] flex flex-col`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className={colorTitulo} />
            <span className={`text-xs font-black uppercase tracking-widest ${colorTitulo}`}>
              {titulo} — {usuario.nombre}
            </span>
          </div>
          <button onClick={onCancel}><X size={14} className="text-slate-500 hover:text-white" /></button>
        </div>

        {/* Paso 2 — confirmación definitiva de baja */}
        {paso === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <UserX size={40} className="text-red-500" />
            <p className="text-sm font-bold text-white text-center">
              ¿Confirmar baja definitiva de <span className="text-red-400">{usuario.nombre}</span>?
            </p>
            <p className="text-[10px] text-slate-400 text-center">
              Esta acción es irreversible. El usuario perderá el acceso permanentemente.
              Sus gestiones han sido delegadas en el paso anterior.
            </p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setPaso(1)}
                className="text-xs px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-sm">
                Volver
              </button>
              <button onClick={() => onConfirm(Object.values(asignaciones).length > 0
                  ? (gestiones || []).map((gestion, gestionIdx) => ({
                      tipo: gestion.tipo, referencia_id: gestion.referencia_id,
                      cubridor_id: parseInt(asignaciones[gestionIdx]?.cubridor_id) || null,
                      nuevas_al_cubridor: asignaciones[gestionIdx]?.nuevas_al_cubridor ?? true,
                    }))
                  : [])}
                className="text-xs font-black px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-sm uppercase tracking-wider">
                CONFIRMAR BAJA DEFINITIVA
              </button>
            </div>
          </div>
        )}

        {/* Paso 1 — delegación de gestiones */}
        {paso === 1 && (
          <>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

              {/* Bloque automático */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-sm p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Automático</p>
                <p className="text-[10px] text-slate-400">
                  Leads pendientes y callbacks → liberados al pool automáticamente.
                </p>
              </div>

              {/* Bloque manual */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Asignación manual de gestiones
                </p>
                {cargando && (
                  <div className="flex flex-col gap-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-800/50 rounded-sm animate-pulse" />)}
                  </div>
                )}
                {!cargando && gestiones?.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">Sin gestiones activas en cartera ni citas pendientes.</p>
                )}
                {errorCarga && <p className="text-[10px] text-red-400 font-mono">{errorCarga}</p>}
                {!cargando && gestiones?.map((gestion, gestionIdx) => (
                  <div key={gestionIdx} className="flex items-center gap-2 py-2 border-b border-slate-800">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-black uppercase ${gestion.tipo === 'cliente' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'}`}>
                      {gestion.tipo}
                    </span>
                    <span className="text-[10px] text-slate-300 flex-1 truncate">{gestion.nombre}</span>
                    <select
                      value={asignaciones[gestionIdx]?.cubridor_id || ''}
                      onChange={e => setAsignaciones(prev => ({ ...prev, [gestionIdx]: { ...prev[gestionIdx], cubridor_id: e.target.value } }))}
                      className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-slate-500 min-w-[120px]"
                    >
                      <option value="">— Cubridor —</option>
                      {adminsActivos.filter(admin => admin.id !== usuario.id).map(admin => (
                        <option key={admin.id} value={admin.id}>{admin.nombre}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-[9px] text-slate-500 cursor-pointer">
                      <input type="checkbox"
                        checked={asignaciones[gestionIdx]?.nuevas_al_cubridor ?? true}
                        onChange={e => setAsignaciones(prev => ({ ...prev, [gestionIdx]: { ...prev[gestionIdx], nuevas_al_cubridor: e.target.checked } }))}
                        className="accent-blue-500"
                      />
                      Nuevas→cubridor
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
              {!todasAsignadas && gestiones?.length > 0 && (
                <span className="text-[9px] text-amber-400">Asigna cubridor a todas las gestiones</span>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={onCancel}
                  className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-sm">
                  Cancelar
                </button>
                <button onClick={handleConfirm} disabled={!todasAsignadas && gestiones?.length > 0}
                  className={`text-xs font-black px-4 py-1.5 ${colorBtn} text-white rounded-sm uppercase tracking-wider disabled:opacity-40 flex items-center gap-1`}>
                  {esBaja ? <><ChevronRight size={12} /> SIGUIENTE</> : 'CONFIRMAR AUSENCIA'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

DelegacionModal.propTypes = {
  usuario:       PropTypes.shape({ id: PropTypes.number.isRequired, nombre: PropTypes.string.isRequired }).isRequired,
  modo:          PropTypes.oneOf(['ausencia', 'baja']).isRequired,
  adminsActivos: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, nombre: PropTypes.string.isRequired })).isRequired,
  onConfirm:     PropTypes.func.isRequired,
  onCancel:      PropTypes.func.isRequired,
};

/**
 * Modal para resolver delegaciones activas al reactivar un usuario ausente.
 * El admin elige por cada gestión si se devuelve al titular o se consolida con el cubridor.
 * @param {{ usuario: Object, onConfirm: Function, onCancel: Function }} props
 */
const ReactivarModal = ({ usuario, onConfirm, onCancel }) => {
  const [delegaciones, setDelegaciones] = useState(null);
  const [resoluciones, setResoluciones] = useState({});
  const [cargando, setCargando]         = useState(true);
  const [errorCarga, setErrorCarga]     = useState(null);

  useEffect(() => {
    setCargando(true);
    setErrorCarga(null);
    fetch(`${N8N_GEST}?operador_id=${usuario.id}`)
      .then(res => res.json())
      .then(resData => {
        const gs = Array.isArray(resData.gestiones) ? resData.gestiones : [];
        setDelegaciones(gs);
        const init = {};
        gs.forEach((_, delegIdx) => { init[delegIdx] = 'devuelta'; });
        setResoluciones(init);
      })
      .catch(() => { setDelegaciones([]); setErrorCarga('Error al cargar delegaciones activas'); })
      .finally(() => setCargando(false));
  }, [usuario.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-emerald-700/50 rounded-sm w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <PlayCircle size={14} /> Reactivar — {usuario.nombre}
          </span>
          <button onClick={onCancel}><X size={14} className="text-slate-500 hover:text-white" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {cargando && <div className="h-10 bg-slate-800/50 rounded-sm animate-pulse" />}
          {errorCarga && <p className="text-[10px] text-red-400 font-mono">{errorCarga}</p>}
          {!cargando && delegaciones?.length === 0 && (
            <p className="text-[10px] text-slate-500 italic">Sin delegaciones activas. Se reactivará directamente.</p>
          )}
          {!cargando && delegaciones?.map((delegacion, delegIdx) => (
            <div key={delegIdx} className="flex items-center gap-2 py-2 border-b border-slate-800">
              <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-black uppercase ${delegacion.tipo === 'cliente' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'}`}>
                {delegacion.tipo}
              </span>
              <span className="text-[10px] text-slate-300 flex-1 truncate">{delegacion.nombre}</span>
              <select
                value={resoluciones[delegIdx] || 'devuelta'}
                onChange={e => setResoluciones(prev => ({ ...prev, [delegIdx]: e.target.value }))}
                className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-slate-500"
              >
                <option value="devuelta">Devolver al titular</option>
                <option value="consolidada">Mantener con cubridor</option>
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-slate-800">
          <button onClick={onCancel}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-sm">
            Cancelar
          </button>
          <button onClick={() => onConfirm(Object.entries(resoluciones).map(([i, estado]) => ({
              id: delegaciones[i]?.id || i,
              estado,
            })))}
            className="text-xs font-black px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-sm uppercase tracking-wider">
            REACTIVAR
          </button>
        </div>
      </div>
    </div>
  );
};

ReactivarModal.propTypes = {
  usuario:   PropTypes.shape({ id: PropTypes.number.isRequired, nombre: PropTypes.string.isRequired }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel:  PropTypes.func.isRequired,
};

/**
 * Modal de verificación TOTP para confirmar que el usuario escaneó el QR de 2FA.
 * Bloquea el cierre hasta que el código de 6 dígitos sea validado con éxito.
 * @param {{ qrModal: Object, onVerificado: Function, onError: Function }} props
 */
const Modal2FA = ({ qrModal, onVerificado, onError }) => {
  const [codigo, setCodigo]       = useState('');
  const [verificando, setVerificando] = useState(false);
  const [errorLocal, setErrorLocal]   = useState('');

  const verificar = async () => {
    if (codigo.length !== 6) return;
    setVerificando(true);
    setErrorLocal('');
    try {
      const response = await fetch(`${N8N}/crm-verificar-2fa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: qrModal.usuarioId, codigo }),
      });
      const data = await response.json();
      if (data.ok) { onVerificado(); }
      else { setErrorLocal('Código incorrecto, inténtalo de nuevo'); setCodigo(''); }
    } catch { setErrorLocal('Error de conexión'); }
    finally { setVerificando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-sm p-6 w-80 flex flex-col items-center gap-4">
        <div className="flex items-center w-full">
          <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-400" /> Activar 2FA — {qrModal.nombre}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          Escanea el QR con tu app autenticadora y después introduce el código de 6 dígitos para confirmar.
        </p>
        <div className="p-3 bg-white rounded-sm">
          <QRCodeSVG
            value={new OTPAuth.TOTP({ issuer: 'ByBusiness', label: qrModal.email, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(qrModal.secret) }).toString()}
            size={160} level="M"
          />
        </div>
        <p className="text-[9px] text-slate-600 font-mono text-center break-all">{qrModal.secret}</p>
        <input
          type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoFocus
          value={codigo}
          onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && verificar()}
          placeholder="000000"
          className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-sm font-mono text-white text-center tracking-[0.4em] outline-none focus:border-emerald-500 placeholder:text-slate-700 placeholder:tracking-normal"
        />
        {errorLocal && (
          <p className="text-[10px] text-red-400 font-mono text-center w-full">{errorLocal}</p>
        )}
        <button onClick={verificar} disabled={verificando || codigo.length !== 6}
          className="w-full text-xs font-bold bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white py-2 rounded-sm uppercase tracking-wider">
          {verificando ? 'Verificando...' : 'Verificar y activar'}
        </button>
        <button onClick={() => onError('2FA cancelado — el usuario no verificó el código')}
          className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
          Cancelar configuración
        </button>
      </div>
    </div>
  );
};

Modal2FA.propTypes = {
  qrModal:      PropTypes.shape({ usuarioId: PropTypes.number.isRequired, nombre: PropTypes.string.isRequired, email: PropTypes.string.isRequired, secret: PropTypes.string.isRequired }).isRequired,
  onVerificado: PropTypes.func.isRequired,
  onError:      PropTypes.func.isRequired,
};

/**
 * Panel de administración de usuarios del CRM.
 * Gestiona altas, ediciones, ausencias temporales, reactivaciones y bajas definitivas.
 * Incluye 2FA por usuario y delegación de gestiones en ausencias/bajas.
 */
const UsuariosList = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const errorTimerRef           = useRef(null);

  const [modo, setModo]         = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [showPwd, setShowPwd]   = useState(false);

  const [modalAusencia, setModalAusencia] = useState(null);
  const [modalBaja, setModalBaja]         = useState(null);
  const [modalReactivar, setModalReactivar] = useState(null);
  const [qrModal, setQrModal]             = useState(null);
  const [modalHorario, setModalHorario]   = useState(null);

  useEffect(() => () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); }, []);

  const cargar = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${N8N}/crm-usuarios-get`)
      .then(res => res.json())
      .then(resData => { if (resData.ok) setUsuarios(resData.usuarios); else setError('Error al cargar usuarios'); })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const mostrarInfo = (msg) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 5000);
  };

  const abrirCrear  = () => { setFormData(emptyForm); setShowPwd(false); setModo('crear'); };
  const abrirEditar = (usr) => { setFormData({ nombre: usr.nombre, email: usr.email, password: '', rol: usr.rol, id: usr.id }); setShowPwd(false); setModo('editar'); };
  const cerrar      = () => { setModo(null); setFormData(emptyForm); };

  const guardar = async () => {
    if (!formData.nombre || !formData.email || (modo === 'crear' && !formData.password)) return;
    setSaving(true);
    try {
      const url      = modo === 'crear' ? `${N8N}/crm-crear-usuario` : `${N8N}/crm-editar-usuario`;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data     = await response.json();
      if (modo === 'crear' && !data.ok) { setError('Email ya en uso'); return; }
      cargar(); cerrar();
    } catch { setError('Error al guardar'); }
    finally { setSaving(false); }
  };

  const confirmarAusencia = async (delegaciones) => {
    const operador = modalAusencia;
    setModalAusencia(null);
    const adminsEmails = usuarios.filter(usr => usr.rol === 'admin' && usr.estado === 'activo').map(usr => usr.email).join(',');
    try {
      await fetch(N8N_AUS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ausencia_crear', operador_id: operador.id, creado_por: user?.id, delegaciones, admins_emails: adminsEmails }),
      });
      cargar();
      mostrarInfo(`✓ ${operador.nombre} marcado como ausente. Delegaciones creadas.`);
    } catch { setError('Error al marcar ausencia'); }
  };

  const confirmarBaja = async (delegaciones) => {
    const operador = modalBaja;
    setModalBaja(null);
    const adminsEmails = usuarios.filter(usr => usr.rol === 'admin' && usr.estado === 'activo').map(usr => usr.email).join(',');
    try {
      await fetch(N8N_AUS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'baja', operador_id: operador.id, operador_nombre: operador.nombre, creado_por: user?.id, delegaciones, admins_emails: adminsEmails }),
      });
      cargar();
      mostrarInfo(`✓ ${operador.nombre} dado de baja definitivamente.`);
    } catch { setError('Error al dar de baja'); }
  };

  const confirmarReactivar = async (resoluciones) => {
    const operador = modalReactivar;
    setModalReactivar(null);
    try {
      await fetch(N8N_AUS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ausencia_reactivar', operador_id: operador.id, resoluciones }),
      });
      cargar();
      mostrarInfo(`✓ ${operador.nombre} reactivado.`);
    } catch { setError('Error al reactivar'); }
  };

  const suspender = async (id) => {
    try {
      await fetch(`${N8N}/crm-eliminar-usuario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      cargar();
    } catch { setError('Error al suspender'); }
  };

  const reactivarSuspendido = async (id) => {
    try {
      await fetch(`${N8N}/crm-reactivar-usuario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      cargar();
    } catch { setError('Error al reactivar'); }
  };

  const activar2fa = async (usuario) => {
    try {
      const response = await fetch(`${N8N}/crm-activar-2fa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: usuario.id }) });
      const data = await response.json();
      if (data.ok) { setQrModal({ usuarioId: usuario.id, nombre: usuario.nombre, email: usuario.email, secret: data.totp_secret, verificado: false }); }
    } catch { setError('Error al activar 2FA'); }
  };

  const desactivar2fa = async (id) => {
    try {
      await fetch(`${N8N}/crm-desactivar-2fa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      cargar();
    } catch { setError('Error al desactivar 2FA'); }
  };

  const activos     = usuarios.filter(usr => usr.estado === 'activo');
  const ausentes    = usuarios.filter(usr => usr.estado === 'activo' && usr.estado_llamada === 'ausente');
  const suspendidos = usuarios.filter(usr => usr.estado === 'suspendido');
  const bajas       = usuarios.filter(usr => usr.estado === 'baja');
  const adminsActivos = usuarios.filter(usr => usr.rol === 'admin' && usr.estado === 'activo' && usr.estado_llamada !== 'ausente');

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Modales */}
      {modalAusencia && (
        <DelegacionModal usuario={modalAusencia} modo="ausencia" adminsActivos={adminsActivos}
          onConfirm={confirmarAusencia} onCancel={() => setModalAusencia(null)} />
      )}
      {modalBaja && (
        <DelegacionModal usuario={modalBaja} modo="baja" adminsActivos={adminsActivos}
          onConfirm={confirmarBaja} onCancel={() => setModalBaja(null)} />
      )}
      {modalReactivar && (
        <ReactivarModal usuario={modalReactivar}
          onConfirm={confirmarReactivar} onCancel={() => setModalReactivar(null)} />
      )}
      {modalHorario && (
        <HorarioModal
          usuario={modalHorario}
          onClose={() => setModalHorario(null)}
          onGuardado={() => setModalHorario(null)}
        />
      )}
      {qrModal && <Modal2FA qrModal={qrModal} onVerificado={() => { setQrModal(null); cargar(); }} onError={(msg) => { setQrModal(null); setError(msg); }} />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <Users size={20} className="text-[#D00000]" /> Gestión de Usuarios
          </h2>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-widest">
            {activos.length} activos · {ausentes.length} ausentes · {suspendidos.length} suspendidos · {bajas.length} bajas
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
              {usuarios.filter(usr => usr.estado !== 'baja').map(usr => {
                const isBaja      = usr.estado === 'baja';
                const isSuspendido = usr.estado === 'suspendido';
                const isAusente   = usr.estado === 'activo' && usr.estado_llamada === 'ausente';
                const isInactivo  = isBaja || isSuspendido;

                return (
                  <tr key={usr.id} className={`group hover:bg-slate-800/30 transition-colors ${isInactivo ? 'opacity-35' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-7 h-7 rounded-sm bg-slate-800 flex items-center justify-center text-[#D00000] font-black text-xs">
                            {(usr.nombre || usr.email).charAt(0).toUpperCase()}
                          </div>
                          {!isInactivo && (
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-sm border border-slate-900 ${ESTADO_DOT[usr.estado_llamada] || 'bg-slate-600'}`} />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{usr.nombre}</span>
                          {isAusente && <span className="text-[8px] text-orange-400 uppercase font-black tracking-widest">Ausente</span>}
                          {isBaja    && <span className="text-[8px] text-red-500 uppercase font-black tracking-widest">Baja</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{usr.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm ${ROLE_COLORS[usr.rol] || 'bg-slate-800 text-slate-400'}`}>
                        {ROLES.find(role => role.value === usr.rol)?.label || usr.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono uppercase ${isBaja ? 'text-red-600' : isSuspendido ? 'text-red-400' : isAusente ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {isBaja ? 'Baja' : isSuspendido ? 'Suspendido' : isAusente ? 'Ausente' : 'Activo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-600 font-mono">{usr.created_at ? fmtFecha(usr.created_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">

                        {/* Editar — solo activos no ausentes */}
                        {!isInactivo && !isAusente && (
                          <button onClick={() => abrirEditar(usr)} title="Editar"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-blue-400 transition-colors">
                            <Edit2 size={13} />
                          </button>
                        )}

                        {/* Horario — activos (cualquier estado) */}
                        {!isInactivo && (
                          <button onClick={() => setModalHorario(usr)} title="Gestionar horario"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-cyan-400 transition-colors">
                            <Clock size={13} />
                          </button>
                        )}

                        {/* Marcar ausente — activos no ausentes */}
                        {!isInactivo && !isAusente && (
                          <button onClick={() => setModalAusencia(usr)} title="Marcar ausente"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-orange-400 transition-colors">
                            <PauseCircle size={13} />
                          </button>
                        )}

                        {/* Reactivar ausente */}
                        {isAusente && (
                          <button onClick={() => setModalReactivar(usr)} title="Reactivar"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-emerald-400 transition-colors">
                            <PlayCircle size={13} />
                          </button>
                        )}

                        {/* Reactivar suspendido */}
                        {isSuspendido && (
                          <button onClick={() => reactivarSuspendido(usr.id)} title="Reactivar"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-emerald-400 transition-colors">
                            <PlayCircle size={13} />
                          </button>
                        )}

                        {/* 2FA — solo activos */}
                        {!isInactivo && (
                          usr.totp_habilitado ? (
                            <button onClick={() => desactivar2fa(usr.id)} title="Desactivar 2FA"
                              className="p-1.5 hover:bg-slate-700 rounded-sm text-emerald-400 transition-colors">
                              <ShieldCheck size={13} />
                            </button>
                          ) : (
                            <button onClick={() => activar2fa(usr)} title="Activar 2FA"
                              className="p-1.5 hover:bg-slate-700 rounded-sm text-slate-500 hover:text-emerald-400 transition-colors">
                              <ShieldOff size={13} />
                            </button>
                          )
                        )}

                        {/* Suspender — activos no ausentes (hover only) */}
                        {!isInactivo && !isAusente && (
                          <button onClick={() => suspender(usr.id)} title="Suspender"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-amber-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={13} />
                          </button>
                        )}

                        {/* Dar de baja definitiva — activos o suspendidos (hover only) */}
                        {!isBaja && (
                          <button onClick={() => setModalBaja(usr)} title="Dar de baja definitiva"
                            className="p-1.5 hover:bg-slate-700 rounded-sm text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <UserX size={13} />
                          </button>
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

/** Panel autónomo — no recibe props externas */
UsuariosList.propTypes = {};

export default UsuariosList;
