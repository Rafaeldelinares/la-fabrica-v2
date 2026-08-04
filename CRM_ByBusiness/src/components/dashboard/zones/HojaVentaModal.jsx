import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, FileText, Send, AlertCircle } from 'lucide-react';
import { n8nGet } from '../../../shared/hooks/useN8n';

/**
 * Formato precio IVA incluido.
 * @param {number} v
 * @returns {string}
 */
const fmtEur = (v) => v != null ? `${parseFloat(v || 0).toFixed(2)} €` : '0.00 €';

/**
 * Auto-calcula precio con IVA (21%).
 * @param {number} sinIva
 * @returns {number}
 */
const conIva = (sinIva) => parseFloat(sinIva || 0) * 1.21;

/**
 * HojaVentaModal — formulario completo de hoja de venta (15 campos + acciones).
 *
 * Replica el folio de venta ByBusiness en papel. Operator completa los campos,
 * los datos se guardan en crm_bybusiness.hojas_venta y opcionalmente se envían
 * a un admin por email.
 *
 * @param {object}   lead          - datos del lead activo
 * @param {number}    operadorId    - id del operador logueado
 * @param {Function}  onConfirm     - called with (hojaData, sendToAdminId)
 * @param {Function}  onCancel      - called on cancel/close
 */
const HojaVentaModal = ({ lead, operadorId, onConfirm, onCancel }) => {
  const today = new Date().toISOString().split('T')[0];

  const [nombreComercial, setNombreComercial] = useState(
    lead?.nombre_comercial || lead?.nombre || ''
  );
  const [nombreContacto, setNombreContacto] = useState(lead?.contacto_nombre || '');
  const [fecha, setFecha] = useState(today);
  const [nombreFacturacion, setNombreFacturacion] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState(
    lead?.nombre_empresa || lead?.nombre || lead?.nombre_comercial || ''
  );
  const [dniCif, setDniCif] = useState('');
  const [direccion, setDireccion] = useState(lead?.direccion || '');
  const [ciudad, setCiudad] = useState(lead?.localidad || '');
  const [provincia, setProvincia] = useState(lead?.provincia || '');
  const [codigoPostal, setCodigoPostal] = useState(lead?.codigo_postal || '');
  const [telefono, setTelefono] = useState(lead?.telefono || '');
  const [email, setEmail] = useState(lead?.email_negocio || lead?.email || '');
  const [paginaWeb, setPaginaWeb] = useState(lead?.web || '');
  const [categorias, setCategorias] = useState(
    Array.isArray(lead?.categorias)
      ? lead.categorias.join(', ')
      : (lead?.categorias || '')
  );
  const [precioSinIva, setPrecioSinIva] = useState('');
  const [precioConIva, setPrecioConIva] = useState('');
  const [precioConIvaOverridden, setPrecioConIvaOverridden] = useState(false);
  const [notas, setNotas] = useState('');
  const [adminId, setAdminId] = useState('');
  const [enviarAdmin, setEnviarAdmin] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Cargar lista de admins — gestoramarisa7@gmail.com siempre primero (defensive client-side sort)
  useEffect(() => {
    n8nGet('crm-admins-lista')
      .then((d) => {
        if (d?.ok && Array.isArray(d.admins)) {
          // Reordenar: gestoramarisa7 primero, resto por nombre
          const sorted = [...d.admins].sort((a, b) => {
            const aIsPriority = a.email === 'gestoramarisa7@gmail.com';
            const bIsPriority = b.email === 'gestoramarisa7@gmail.com';
            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;
            return (a.nombre || '').localeCompare(b.nombre || '');
          });
          setAdmins(sorted);
          // Pre-seleccionar gestoramarisa7 si está
          const prioritized = sorted.find((a) => a.email === 'gestoramarisa7@gmail.com');
          if (prioritized) setAdminId(String(prioritized.id));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAdmins(false));
  }, []);

  // Computed display value — auto-calcula desde precioSinIva a menos que operator haga override
  const computedConIva = (conIva(precioSinIva)).toFixed(2);
  const displayConIva = precioConIvaOverridden ? precioConIva : computedConIva;

  const handleConIvaChange = (e) => {
    setPrecioConIva(e.target.value);
    setPrecioConIvaOverridden(true);
  };

  const categoriasTags = categorias
    ? categorias.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  const handleSubmit = () => {
    const hojaData = {
      lead_id: lead?.id,
      operador_id: operadorId,
      nombre_comercial: nombreComercial,
      nombre_contacto: nombreContacto,
      fecha: fecha,
      nombre_facturacion: nombreFacturacion,
      nombre_empresa: nombreEmpresa,
      dni_cif: dniCif,
      direccion: direccion,
      ciudad: ciudad,
      provincia: provincia,
      codigo_postal: codigoPostal,
      telefono: telefono,
      email: email,
      pagina_web: paginaWeb,
      categorias: categorias,
      precio_sin_iva: parseFloat(precioSinIva) || 0,
      precio_con_iva: parseFloat(precioConIva) || 0,
      notas: notas,
    };
    onConfirm(hojaData, enviarAdmin && adminId ? String(adminId) : null);
  };

  const inputCls = "w-full bg-slate-950 border border-slate-700 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono placeholder:text-slate-600";
  const labelCls = "text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1 block";
  const gridCls = "flex flex-col gap-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-sm shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-[#D00000]" />
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Hoja de Venta</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {lead?.nombre_comercial || lead?.nombre || '—'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* 2-column grid: fields 1-14 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">

            {/* 1. Nombre comercial */}
            <div className={gridCls}>
              <label className={labelCls}>1. Nombre comercial</label>
              <input className={inputCls} value={nombreComercial}
                onChange={e => setNombreComercial(e.target.value)}
                placeholder="Nombre del negocio" />
            </div>

            {/* 2. Nombre contacto */}
            <div className={gridCls}>
              <label className={labelCls}>2. Nombre contacto</label>
              <input className={inputCls} value={nombreContacto}
                onChange={e => setNombreContacto(e.target.value)}
                placeholder="Persona de contacto" />
            </div>

            {/* 3. Fecha */}
            <div className={gridCls}>
              <label className={labelCls}>3. Fecha</label>
              <input type="date" className={inputCls} value={fecha}
                onChange={e => setFecha(e.target.value)} />
            </div>

            {/* 4. Nombre facturación */}
            <div className={gridCls}>
              <label className={labelCls}>4. Nombre facturación</label>
              <input className={inputCls} value={nombreFacturacion}
                onChange={e => setNombreFacturacion(e.target.value)}
                placeholder="Nombre fiscal para factura" />
            </div>

            {/* 5. Nombre empresa */}
            <div className={gridCls}>
              <label className={labelCls}>5. Nombre empresa</label>
              <input className={inputCls} value={nombreEmpresa}
                onChange={e => setNombreEmpresa(e.target.value)}
                placeholder="Razón social" />
            </div>

            {/* 6. DNI/CIF */}
            <div className={gridCls}>
              <label className={labelCls}>6. DNI / CIF</label>
              <input className={inputCls} value={dniCif}
                onChange={e => setDniCif(e.target.value)}
                placeholder="Identificador fiscal" />
            </div>

            {/* 7. Dirección */}
            <div className={gridCls}>
              <label className={labelCls}>7. Dirección</label>
              <input className={inputCls} value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Calle, número" />
            </div>

            {/* 8. Ciudad */}
            <div className={gridCls}>
              <label className={labelCls}>8. Ciudad</label>
              <input className={inputCls} value={ciudad}
                onChange={e => setCiudad(e.target.value)}
                placeholder="Localidad" />
            </div>

            {/* 9. Provincia */}
            <div className={gridCls}>
              <label className={labelCls}>9. Provincia</label>
              <input className={inputCls} value={provincia}
                onChange={e => setProvincia(e.target.value)}
                placeholder="Provincia" />
            </div>

            {/* 10. Código postal */}
            <div className={gridCls}>
              <label className={labelCls}>10. Código postal</label>
              <input className={inputCls} value={codigoPostal}
                onChange={e => setCodigoPostal(e.target.value)}
                placeholder="CP" />
            </div>

            {/* 11. Teléfono */}
            <div className={gridCls}>
              <label className={labelCls}>11. Teléfono</label>
              <input className={inputCls} value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="+34 600 000 000" />
            </div>

            {/* 12. Email */}
            <div className={gridCls}>
              <label className={labelCls}>12. Email</label>
              <input type="email" className={inputCls} value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@negocio.com" />
            </div>

            {/* 13. Página web */}
            <div className={gridCls}>
              <label className={labelCls}>13. Página web</label>
              <input className={inputCls} value={paginaWeb}
                onChange={e => setPaginaWeb(e.target.value)}
                placeholder="https://..." />
            </div>

            {/* 14. Precio sin IVA */}
            <div className={gridCls}>
              <label className={labelCls}>14. Precio sin IVA</label>
              <input type="number" step="0.01" min="0" className={inputCls}
                value={precioSinIva}
                onChange={e => setPrecioSinIva(e.target.value)}
                placeholder="0.00" />
            </div>

          </div>

          {/* 15. Categorías — full width */}
          <div className="mt-4">
            <label className={labelCls}>Categorías</label>
            <input className={inputCls} value={categorias}
              onChange={e => setCategorias(e.target.value)}
              placeholder="Categorías separadas por coma" />
            {categoriasTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categoriasTags.map((tag, i) => (
                  <span key={i}
                    className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Precio con IVA — full width */}
          <div className="mt-4">
            <label className={labelCls}>15. Precio con IVA (21%)</label>
            <div className="flex items-center gap-3">
              <input type="number" step="0.01" min="0" className={inputCls + ' w-40 font-mono'}
                value={displayConIva}
                onChange={handleConIvaChange}
                placeholder="0.00" />
              <span className="text-xs font-mono text-slate-400">
                = {fmtEur(parseFloat(displayConIva) || 0)}
              </span>
              {precioConIvaOverridden && (
                <span className="text-[9px] text-amber-500 font-mono uppercase tracking-widest">
                  (override manual)
                </span>
              )}
            </div>
          </div>

          {/* Notas — full width */}
          <div className="mt-4">
            <label className={labelCls}>Notas libres</label>
            <textarea className={inputCls + ' resize-none'} rows={3}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones, acuerdos, detalles..." />
          </div>

          {/* Admin selector + enviar checkbox */}
          <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 gap-6 items-end">

            <div className={gridCls}>
              <label className={labelCls}>
                <span className="flex items-center gap-1.5">
                  <AlertCircle size={10} className="text-[#D00000]" />
                  Admin destino
                </span>
              </label>
              {loadingAdmins ? (
                <select className={inputCls} disabled>
                  <option>Cargando...</option>
                </select>
              ) : (
                <select className={inputCls} value={adminId}
                  onChange={e => setAdminId(e.target.value)}>
                  <option value="">— Sin admin —</option>
                  {admins.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.email === 'gestoramarisa7@gmail.com' ? '★ ' : ''}{a.email}
                      {a.nombre ? ` (${a.nombre})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative">
                  <input type="checkbox" checked={enviarAdmin}
                    onChange={e => setEnviarAdmin(e.target.checked)}
                    className="sr-only" />
                  <div
                    className={`w-10 h-5 rounded-sm transition-colors relative ${enviarAdmin ? 'bg-[#D00000]' : 'bg-slate-700'}`}>
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-sm transition-transform ${enviarAdmin ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                <span className="text-xs text-slate-300 uppercase tracking-widest font-bold flex items-center gap-1.5">
                  {enviarAdmin && <Send size={11} className="text-[#D00000]" />}
                  Enviar a admin
                </span>
              </label>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            {precioSinIva && (
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                <span className="text-slate-600">Base:</span> {fmtEur(parseFloat(precioSinIva) || 0)}
                {' '}<span className="text-slate-600 ml-2">IVA:</span> {fmtEur((conIva(precioSinIva) - parseFloat(precioSinIva) || 0))}
                {' '}<span className="text-slate-600 ml-2">Total:</span>
                <span className="text-white font-black ml-1">{fmtEur(parseFloat(precioConIva) || 0)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-sm transition-colors uppercase tracking-widest">
              Cancelar
            </button>
            <button onClick={handleSubmit}
              className="px-6 py-2 text-xs font-black text-white bg-[#D00000] hover:bg-red-700 rounded-sm transition-colors uppercase tracking-widest">
              Confirmar Venta
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

HojaVentaModal.propTypes = {
  /** Lead activo con todos sus campos */
  lead: PropTypes.object.isRequired,
  /** ID del operador logueado */
  operadorId: PropTypes.number.isRequired,
  /** Called with (hojaData, sendToAdminId) al confirmar. sendToAdminId es null si no se envía. */
  onConfirm: PropTypes.func.isRequired,
  /** Called al cancelar o cerrar */
  onCancel: PropTypes.func.isRequired,
};

export default HojaVentaModal;
