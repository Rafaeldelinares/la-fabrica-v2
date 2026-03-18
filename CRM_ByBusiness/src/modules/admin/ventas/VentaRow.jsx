import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Badge from '../../../shared/ui/Badge';
import { fmtFecha } from '../../../utils/dates';

const ESTADO_CLASSES = {
    activo:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pausado:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cancelado: 'bg-red-500/10 text-red-500 border-red-500/20',
};

/**
 * VentaRow — Fila de venta con cambio de estado inline.
 * @param {object} props.venta - Datos de la venta/cliente
 * @param {Function} props.onEstadoChange - Callback cuando se actualiza el estado
 */
const VentaRow = ({ venta, onEstadoChange }) => {
    const N8N = import.meta.env.VITE_N8N_URL;

    const [estado, setEstado]       = useState(venta.estado || 'activo');
    const [guardando, setGuardando] = useState(false);
    const [error, setError]         = useState('');

    const onChange = async (e) => {
        const nuevoEstado = e.target.value;
        setEstado(nuevoEstado);
        setGuardando(true);
        setError('');
        try {
            const res = await fetch(`${N8N}/crm-venta-actualizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venta_id: venta.id, estado: nuevoEstado }),
            });
            const data = await res.json();
            if (!data.ok) { setError('Error al guardar'); setEstado(venta.estado || 'activo'); }
            else if (onEstadoChange) onEstadoChange(venta.id, nuevoEstado);
        } catch {
            setError('Error de conexión');
            setEstado(venta.estado || 'activo');
        } finally {
            setGuardando(false);
        }
    };

    const selectCls = `bg-slate-900 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1
        outline-none focus:border-[#D00000] font-mono uppercase ${guardando ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <>
            <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-4 font-mono text-slate-500">{String(venta.id).padStart(4, '0')}</td>
                <td className="px-4 py-4">
                    <p className="font-bold text-slate-200 uppercase tracking-wide">{venta.nombre_comercial}</p>
                    {venta.email && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{venta.email}</p>}
                </td>
                <td className="px-4 py-4 font-mono text-slate-300">{venta.telefono || '—'}</td>
                <td className="px-4 py-4 uppercase text-slate-400">{venta.localidad || '—'}</td>
                <td className="px-4 py-4 uppercase text-slate-500">{venta.categoria || '—'}</td>
                <td className="px-4 py-4 font-bold text-slate-300">{venta.operador_nombre || '—'}</td>
                <td className="px-4 py-4 font-mono">
                    {venta.scoring
                        ? <><span className="text-white font-bold">{venta.scoring}</span><span className="text-slate-600">/100</span></>
                        : '—'}
                </td>
                <td className="px-4 py-4">
                    <select value={estado} onChange={onChange} disabled={guardando} className={selectCls}>
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </td>
                <td className="px-4 py-4 font-mono text-slate-500">{fmtFecha(venta.fecha_venta)}</td>
            </tr>
            {error && (
                <tr className="border-b border-slate-800/50">
                    <td colSpan={9} className="px-4 pb-1 pt-0">
                        <span className="text-[10px] text-red-400 font-mono">{error}</span>
                    </td>
                </tr>
            )}
        </>
    );
};

VentaRow.propTypes = {
    venta: PropTypes.shape({
        id:              PropTypes.number.isRequired,
        nombre_comercial: PropTypes.string,
        telefono:        PropTypes.string,
        email:           PropTypes.string,
        localidad:       PropTypes.string,
        categoria:       PropTypes.string,
        operador_nombre: PropTypes.string,
        scoring:         PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        estado:          PropTypes.string,
        fecha_venta:     PropTypes.string,
    }).isRequired,
    onEstadoChange: PropTypes.func,
};

VentaRow.defaultProps = {
    onEstadoChange: null,
};

export default VentaRow;
