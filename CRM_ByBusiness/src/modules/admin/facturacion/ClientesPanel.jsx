import React, { useState, useEffect } from 'react';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import ProformaModal from './ProformaModal';
import { Users, ChevronDown, ChevronUp, CheckCircle, Clock, Plus, CreditCard, X, BadgeCheck, FileText } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';
import { useAuth } from '../../auth/AuthContext';

const fmtEur = (v) => v != null ? `${parseFloat(v).toFixed(2)} €` : '—';

const METODOS = ['transferencia', 'efectivo', 'tarjeta', 'bizum'];

/**
 * PagoChip — Pastilla de pago individual dentro de un plan de pagos de proforma.
 * Muestra el estado (cobrado / pendiente) y permite registrar el cobro inline
 * seleccionando método y referencia de pago.
 * @param {object}   pg         - Objeto de pago con id, importe, estado, fecha y fracción
 * @param {Function} onCobrado  - Callback invocado tras registrar el cobro con éxito
 */
const PagoChip = ({ pg, onCobrado }) => {
  const [cobrandoId, setCobrandoId] = useState(null); // pago_id activo
  const [metodo, setMetodo]         = useState('transferencia');
  const [referencia, setReferencia] = useState('');
  const [saving, setSaving]         = useState(false);
  const base = import.meta.env.VITE_N8N_URL;

  const cobrar = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${base}/crm-cobro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pago_id: pg.id, metodo, referencia, fecha: new Date().toISOString().slice(0,10) }),
      });
      const d = await r.json();
      if (d.ok) { setCobrandoId(null); onCobrado && onCobrado(); }
    } catch { /* error de red — finally restablece el estado */ } finally { setSaving(false); }
  };

  if (pg.estado === 'cobrado') {
    return (
      <div className="flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-800/30 rounded-sm px-2 py-1">
        <CheckCircle size={10} className="text-emerald-400" />
        <span className="text-[10px] font-mono text-slate-400">{pg.fraccion_num}/{pg.total_fracciones}</span>
        <span className="text-[10px] font-mono text-emerald-300 font-bold">{fmtEur(pg.importe)}</span>
        <span className="text-[10px] text-slate-600">{fmtFecha(pg.fecha)}</span>
      </div>
    );
  }

  if (cobrandoId === pg.id) {
    return (
      <div className="flex items-center gap-1.5 bg-slate-950 border border-[#D00000]/40 rounded-sm px-2 py-1.5 flex-wrap">
        <span className="text-[10px] font-mono text-white font-bold">{fmtEur(pg.importe)}</span>
        <select value={metodo} onChange={e => setMetodo(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-1.5 py-0.5 outline-none font-mono">
          {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={referencia} onChange={e => setReferencia(e.target.value)}
          placeholder="Ref." className="w-20 bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-1.5 py-0.5 outline-none font-mono" />
        <button onClick={cobrar} disabled={saving}
          className="text-[10px] font-black text-white bg-emerald-700 hover:bg-emerald-600 px-2 py-0.5 rounded-sm transition-colors disabled:opacity-50">
          {saving ? '…' : '✓ Cobrar'}
        </button>
        <button onClick={() => setCobrandoId(null)} className="text-slate-600 hover:text-white transition-colors"><X size={10} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-sm px-2 py-1 group">
      <Clock size={10} className="text-amber-400" />
      <span className="text-[10px] font-mono text-slate-400">{pg.fraccion_num}/{pg.total_fracciones}</span>
      <span className="text-[10px] font-mono text-white font-bold">{fmtEur(pg.importe)}</span>
      <span className="text-[10px] text-slate-600">{fmtFecha(pg.fecha)}</span>
      <button onClick={() => setCobrandoId(pg.id)}
        className="hidden group-hover:flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors ml-1">
        <CreditCard size={9} /> Cobrar
      </button>
    </div>
  );
};

/**
 * ProformaRow — Fila expandible para una proforma dentro de un ClienteRow.
 * Permite aceptar la proforma, generar la factura y visualizar el plan de pagos.
 * @param {object}   proforma   - Objeto proforma con líneas, pagos, estado y totales
 * @param {Function} onRefresh  - Callback para recargar la lista de proformas del cliente
 */
const ProformaRow = ({ proforma, onRefresh }) => {
  const [open, setOpen]           = useState(false);
  const [pagos, setPagos]         = useState(proforma.pagos || []);
  const [estado, setEstado]       = useState(proforma.estado);
  const [aceptando, setAceptando] = useState(false);
  const [facturando, setFacturando] = useState(false);
  const [facturaOk, setFacturaOk] = useState(false);
  const base = import.meta.env.VITE_N8N_URL;

  const aceptar = async (e) => {
    e.stopPropagation();
    setAceptando(true);
    try {
      const r = await fetch(`${base}/crm-proforma-aceptar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proforma_id: proforma.id }),
      });
      const d = await r.json();
      if (d.ok) { setEstado('aceptada'); onRefresh && onRefresh(); }
    } catch { /* error de red — finally restablece el estado */ } finally { setAceptando(false); }
  };

  const generarFactura = async (e) => {
    e.stopPropagation();
    setFacturando(true);
    try {
      const r = await fetch(`${base}/crm-factura-generar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proforma_id: proforma.id, tipo_iva: 21 }),
      });
      const d = await r.json();
      if (d.ok) { setFacturaOk(true); onRefresh && onRefresh(); }
    } catch { /* error de red — finally restablece el estado */ } finally { setFacturando(false); }
  };

  return (
    <div className="border border-slate-800 rounded-sm">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-500">{proforma.numero || `PRO-${String(proforma.id).padStart(4,'0')}`}</span>
          <span className="text-slate-300">{fmtFecha(proforma.fecha)}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
            estado === 'aceptada'
              ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>{estado}</span>
        </div>
        <div className="flex items-center gap-3">
          {estado === 'borrador' && (
            <button onClick={aceptar} disabled={aceptando}
              className="flex items-center gap-1 text-[10px] font-black text-emerald-500 hover:text-emerald-300 border border-emerald-800/50 hover:border-emerald-600 px-2 py-1 rounded-sm transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              <BadgeCheck size={11} /> {aceptando ? '…' : 'Aceptar'}
            </button>
          )}
          {estado === 'aceptada' && proforma.requiere_factura && !facturaOk && (
            <button onClick={generarFactura} disabled={facturando}
              className="flex items-center gap-1 text-[10px] font-black text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600 px-2 py-1 rounded-sm transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              <FileText size={11} /> {facturando ? '…' : 'Factura'}
            </button>
          )}
          {facturaOk && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono"><FileText size={10} /> Facturada</span>
          )}
          <span className="font-mono font-bold text-white">{fmtEur(proforma.total)}</span>
          {proforma.fraccionado && <span className="text-[10px] text-slate-500 font-mono">{proforma.num_fracciones} cuotas</span>}
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          {Array.isArray(proforma.lineas) && proforma.lineas.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">Productos</p>
              {proforma.lineas.map((l, i) => (
                <div key={i} className="flex justify-between text-[11px] py-1 border-b border-slate-800/50 last:border-0">
                  <span className="text-slate-300">{l.descripcion || l.producto_nombre}</span>
                  <span className="font-mono text-slate-400">{l.cantidad}× {fmtEur(l.precio_unitario)} = <span className="text-white">{fmtEur(l.subtotal)}</span></span>
                </div>
              ))}
            </div>
          )}
          {pagos.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">
                Plan de pagos
                <span className="ml-2 text-emerald-600">
                  {fmtEur(pagos.filter(p => p.estado === 'cobrado').reduce((s,p) => s + parseFloat(p.importe||0), 0))} cobrado
                </span>
                <span className="ml-2 text-amber-600">
                  {fmtEur(pagos.filter(p => p.estado === 'pendiente').reduce((s,p) => s + parseFloat(p.importe||0), 0))} pendiente
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {pagos.map((pg, i) => (
                  <PagoChip key={pg.id || i} pg={pg} onCobrado={onRefresh} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * ClienteRow — Fila expandible de cliente en el panel de facturación.
 * Muestra resumen económico (cobrado, pendiente, proformas) y carga las proformas
 * al expandirse. Incluye acceso rápido a crear nueva proforma.
 * @param {object}   cliente          - Objeto cliente con totales y datos básicos
 * @param {Function} onNuevaProforma  - Callback invocado con el cliente para abrir ProformaModal
 */
const ClienteRow = ({ cliente, onNuevaProforma }) => {
  const [open, setOpen] = useState(false);
  const [proformas, setProformas] = useState(null);
  const N8N_URL = import.meta.env.VITE_N8N_URL;

  const loadProformas = () => {
    fetch(`${N8N_URL}/crm-proformas?cliente_id=${cliente.id}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setProformas(d.proformas); })
      .catch(() => setProformas([]));
  };

  const toggle = () => {
    if (!open) loadProformas();
    setOpen(o => !o);
  };

  return (
    <div className="border-b border-slate-800/50 last:border-0">
      <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-800/20 transition-colors text-left">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <p className="font-bold text-slate-200 uppercase text-xs tracking-wide truncate">{cliente.nombre_comercial}</p>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">{cliente.localidad} · {cliente.operador_nombre || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Cobrado</p>
            <p className="text-xs font-mono font-bold text-emerald-400">{fmtEur(cliente.total_cobrado)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Pendiente</p>
            <p className="text-xs font-mono font-bold text-amber-400">{fmtEur(cliente.total_pendiente)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Proformas</p>
            <p className="text-xs font-mono text-slate-300">{cliente.num_proformas}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onNuevaProforma(cliente); }}
            className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-[#D00000] border border-slate-700 hover:border-[#D00000]/50 px-2 py-1 rounded-sm transition-colors uppercase tracking-widest"
          >
            <Plus size={10} /> Proforma
          </button>
          {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {proformas === null ? (
            <div className="animate-pulse h-10 bg-slate-800 rounded-sm" />
          ) : proformas.length === 0 ? (
            <p className="text-[10px] text-slate-700 italic font-mono uppercase tracking-widest py-2">Sin proformas</p>
          ) : proformas.map(p => <ProformaRow key={p.id} proforma={p} onRefresh={loadProformas} />)}
        </div>
      )}
    </div>
  );
};

/**
 * ClientesPanel — Panel de facturación que lista clientes con sus proformas y pagos.
 * Orquesta la carga de clientes vía n8n y abre el ProformaModal para crear nuevas proformas.
 */
const ClientesPanel = () => {
  const { user } = useAuth();
  const [clientes, setClientes] = useState(null);
  const [modalCliente, setModalCliente] = useState(null);
  const N8N_URL = import.meta.env.VITE_N8N_URL;

  const loadClientes = () => {
    fetch(`${N8N_URL}/crm-clientes`)
      .then(r => r.json())
      .then(d => { if (d.ok) setClientes(d.clientes); })
      .catch(() => setClientes([]));
  };

  useEffect(() => {
    loadClientes();
  // loadClientes cierra sobre N8N_URL que es constante de build, no reactiva
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Card className="flex flex-col bg-slate-900 border-slate-800 !p-0 overflow-hidden">
        {clientes === null ? (
          <div className="flex-1 flex items-center justify-center py-20 animate-pulse">
            <div className="flex flex-col gap-3 items-center">
              <div className="h-4 w-48 bg-slate-800 rounded-sm" />
              <div className="h-3 w-32 bg-slate-800 rounded-sm" />
            </div>
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <EmptyState title="Sin clientes" icon={Users} description="Los clientes aparecerán aquí cuando se cierren ventas" />
          </div>
        ) : (
          <div>{clientes.map(c => <ClienteRow key={c.id} cliente={c} onNuevaProforma={setModalCliente} />)}</div>
        )}
      </Card>

      {modalCliente && (
        <ProformaModal
          cliente={modalCliente}
          operadorId={user?.id}
          onClose={() => setModalCliente(null)}
          onCreated={loadClientes}
        />
      )}
    </>
  );
};

export default ClientesPanel;
