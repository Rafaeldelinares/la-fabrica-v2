import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../auth/AuthContext';
import { X, Plus, CheckCircle, Building2, Phone, MapPin, User, BadgeCheck } from 'lucide-react';

const PROVINCIAS = [
  'Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos',
  'Cáceres','Cádiz','Cantabria','Castellón','Ciudad Real','Córdoba','La Coruña','Cuenca',
  'Gerona','Granada','Guadalajara','Guipúzcoa','Huelva','Huesca','Islas Baleares',
  'Jaén','La Rioja','Las Palmas','León','Lérida','Lugo','Madrid','Málaga','Murcia',
  'Navarra','Orense','Palencia','Pontevedra','Salamanca','Santa Cruz de Tenerife',
  'Segovia','Sevilla','Soria','Tarragona','Teruel','Toledo','Valencia','Valladolid',
  'Vizcaya','Zamora','Zaragoza','Ceuta','Melilla',
];

const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">
      {label}{required && <span className="text-[#D00000] ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input
    {...props}
    className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full placeholder:text-slate-700 transition-colors"
  />
);

/**
 * NuevoClienteDrawer — Drawer de alta de nueva empresa en la cartera de clientes.
 * Recoge los datos comerciales, de contacto y ubicación, y los envía vía n8n.
 * @param {{ onClose: Function, onCreado: Function }} props
 */
const NuevoClienteDrawer = ({ onClose, onCreado }) => {
  const N8N = import.meta.env.VITE_N8N_URL;
  const creadoTimerRef = useRef(null);
  const { user } = useAuth();

  const [form, setForm] = useState({
    nombre_comercial: '',
    nombre_fiscal: '',
    cif: '',
    actividad: '',
    telefono: '',
    email: '',
    web: '',
    bybusiness_url: '',
    localidad: '',
    provincia: '',
    gestor_id: '',
    notas_internas: '',
    origen_cliente: '',
  });
  const [gestores, setGestores]   = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => () => { if (creadoTimerRef.current) clearTimeout(creadoTimerRef.current); }, []);

  useEffect(() => {
    fetch(`${N8N}/crm-usuarios-get`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setGestores(data.usuarios.filter(u => ['admin', 'operador'].includes(u.rol)));
        }
      })
      .catch(() => { setError('Error al cargar gestores — el selector estará vacío'); });
  }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre_comercial.trim()) {
      setError('El nombre comercial es obligatorio.');
      return;
    }
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const CIF_RE = /^[A-HJNP-SUVW]\d{7}[0-9A-J]$/i;
    const NIF_RE = /^\d{8}[A-Z]$/i;
    if (form.email && !EMAIL_RE.test(form.email.trim())) {
      setError('El email no tiene un formato válido.');
      return;
    }
    if (form.cif && !CIF_RE.test(form.cif.trim()) && !NIF_RE.test(form.cif.trim())) {
      setError('El CIF/NIF no tiene formato válido (ej: B12345678 o 12345678A).');
      return;
    }
    setError('');
    setGuardando(true);
    try {
      const r = await fetch(`${N8N}/crm-cliente-crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          gestor_id: form.gestor_id ? parseInt(form.gestor_id) : null,
          usuario_creador: user?.id || null,
          nombre_gestor: gestores.find(g => g.id === parseInt(form.gestor_id))?.nombre || '',
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setGuardado(true);
        creadoTimerRef.current = setTimeout(() => onCreado(d.cliente), 1200);
      } else {
        setError(d.error || 'Error al crear el cliente.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-sm bg-slate-600 shrink-0" />
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wide leading-tight">Nueva Empresa</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Alta de cliente en cartera</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors shrink-0 ml-2">
          <X size={16} />
        </button>
      </div>

      {/* Formulario */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* Empresa */}
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <Building2 size={10} /> Datos de la empresa
          </p>
          <div className="flex flex-col gap-3">
            <Field label="Nombre comercial" required>
              <Input placeholder="Ej: La Garduña Tattoo & Barber Shop" value={form.nombre_comercial} onChange={set('nombre_comercial')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre fiscal">
                <Input placeholder="Razón social" value={form.nombre_fiscal} onChange={set('nombre_fiscal')} />
              </Field>
              <Field label="CIF / NIF">
                <Input placeholder="B12345678" value={form.cif} onChange={set('cif')} />
              </Field>
            </div>
            <Field label="Actividad">
              <Input placeholder="Ej: Peluquería y estética" value={form.actividad} onChange={set('actividad')} />
            </Field>
          </div>
        </div>

        {/* Contacto */}
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <Phone size={10} /> Contacto
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono">
                <Input placeholder="+34 600 000 000" value={form.telefono} onChange={set('telefono')} />
              </Field>
              <Field label="Email">
                <Input type="email" placeholder="info@empresa.com" value={form.email} onChange={set('email')} />
              </Field>
            </div>
            <Field label="Web">
              <Input placeholder="www.empresa.com" value={form.web} onChange={set('web')} />
            </Field>
            <Field label="URL ByBusiness">
              <div className="flex items-center gap-2">
                <BadgeCheck size={12} className="text-[#D00000] shrink-0" />
                <Input placeholder="https://ia-bybusiness.com/..." value={form.bybusiness_url} onChange={set('bybusiness_url')} />
              </div>
            </Field>
          </div>
        </div>

        {/* Ubicación */}
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <MapPin size={10} /> Ubicación
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Localidad">
              <Input placeholder="Ej: Madrid" value={form.localidad} onChange={set('localidad')} />
            </Field>
            <Field label="Provincia">
              <select
                value={form.provincia}
                onChange={set('provincia')}
                className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full transition-colors"
              >
                <option value="">— Seleccionar —</option>
                {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Captación */}
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <BadgeCheck size={10} /> Captación
          </p>
          <Field label="Origen del cliente">
            <select
              value={form.origen_cliente}
              onChange={set('origen_cliente')}
              className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full transition-colors"
            >
              <option value="">— Seleccionar origen —</option>
              <option value="Referencia">Referencia</option>
              <option value="Web">Web</option>
              <option value="Llamada fría">Llamada fría</option>
              <option value="Visita presencial">Visita presencial</option>
              <option value="Feria / Evento">Feria / Evento</option>
              <option value="Redes sociales">Redes sociales</option>
              <option value="Otro">Otro</option>
            </select>
          </Field>
        </div>

        {/* Gestión */}
        <div className="px-5 py-4">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono mb-3 flex items-center gap-1.5">
            <User size={10} /> Gestión
          </p>
          <div className="flex flex-col gap-3">
            <Field label="Gestor responsable">
              <select
                value={form.gestor_id}
                onChange={set('gestor_id')}
                className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 w-full transition-colors"
              >
                <option value="">— Sin asignar —</option>
                {gestores.map(g => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Notas internas">
              <textarea
                value={form.notas_internas}
                onChange={set('notas_internas')}
                placeholder="Observaciones sobre el alta, origen del cliente…"
                rows={3}
                className="bg-slate-900 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-300 font-mono outline-none focus:border-slate-500 resize-none placeholder:text-slate-700 w-full transition-colors"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Footer — botón guardar */}
      <div className="px-5 py-3 border-t border-slate-800 shrink-0">
        {error && (
          <p className="text-[10px] text-red-400 font-mono mb-2">{error}</p>
        )}
        <button
          onClick={handleGuardar}
          disabled={guardando || guardado}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#D00000]/10 hover:bg-[#D00000]/20 border border-[#D00000]/30 hover:border-[#D00000]/60 text-[#D00000] text-xs font-mono uppercase tracking-widest rounded-sm transition-colors disabled:opacity-50"
        >
          {guardado ? (
            <><CheckCircle size={13} className="text-emerald-400" /><span className="text-emerald-400">Cliente creado</span></>
          ) : guardando ? 'Guardando…' : (
            <><Plus size={13} /> Dar de alta</>
          )}
        </button>
      </div>
    </div>
  );
};

NuevoClienteDrawer.propTypes = {
  /** Callback al cerrar el drawer */
  onClose:  PropTypes.func.isRequired,
  /** Callback invocado con el objeto cliente recién creado */
  onCreado: PropTypes.func.isRequired,
};

export default NuevoClienteDrawer;
