import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Card from '../../../shared/ui/Card';
import Badge from '../../../shared/ui/Badge';
import EmptyState from '../../../shared/ui/EmptyState';
import { Users, ExternalLink } from 'lucide-react';
import { fmtFecha } from '../../../utils/dates';
import { n8nGet, n8nPost } from '../../../shared/hooks/useN8n';

const ESTADO_CLASSES = {
  nuevo:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  revisado:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  entrevista: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  aceptado:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  descartado: 'bg-slate-700/50 text-slate-500 border-slate-600',
};

const PROCESO_CLASSES = {
  pendiente:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  contactado: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  finalizado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const ORIGEN_CLASSES = {
  web:       'bg-slate-700 text-slate-300 border-slate-600',
  whatsapp:  'bg-emerald-900/40 text-emerald-400 border-emerald-800',
  referido:  'bg-purple-900/40 text-purple-400 border-purple-800',
};

/** Panel de gestión de candidatos RRHH con filtros por estado y origen y cambio de estado inline. */
const CandidatosPanel = () => {
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [candidatos, setCandidatos] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  /** Actualiza el estado de un candidato en el servidor y refleja el cambio en la UI. */
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const data = await n8nPost('crm-candidato-update', { id, estado: nuevoEstado });
      if (data.ok) {
        setCandidatos(prev => prev.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c));
      } else {
        setError(data.message || 'No se pudo actualizar el candidato');
      }
    } catch (err) {
      setError(err instanceof Error && err.message.startsWith('HTTP') ? 'Error de conexión al actualizar el candidato' : 'Error al actualizar el candidato');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroEstado) params.set('estado', filtroEstado);
    if (filtroOrigen) params.set('origen', filtroOrigen);
    n8nGet(`crm-candidatos-admin?${params}`)
      .then(data => {
        if (data.ok) { setCandidatos(data.candidatos); setTotal(data.total); setError(''); }
        else { setCandidatos([]); setError('Error al cargar candidatos — respuesta inesperada del servidor'); }
      })
      .catch(() => { setCandidatos([]); setError('Error al cargar candidatos — comprueba la conexión'); });
  }, [filtroEstado, filtroOrigen]);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">

      {/* Error banner */}
      {error && (
        <div className="px-3 py-2 bg-red-900/20 border border-red-900/30 rounded-sm text-[10px] text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* Barra superior */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CANDIDATOS RRHH</h2>
          <Badge className="bg-slate-800 text-slate-300 border-slate-700">
            {candidatos ? total : '—'} CANDIDATOS
          </Badge>
        </div>

        <div className="flex gap-3">
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
          >
            <option value="">Estado: Todos</option>
            <option value="nuevo">Nuevo</option>
            <option value="revisado">Revisado</option>
            <option value="entrevista">Entrevista</option>
            <option value="aceptado">Aceptado</option>
            <option value="descartado">Descartado</option>
          </select>

          <select
            value={filtroOrigen}
            onChange={e => setFiltroOrigen(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-sm text-xs text-slate-200 px-3 py-2 outline-none focus:border-[#D00000] font-mono uppercase"
          >
            <option value="">Origen: Todos</option>
            <option value="web">Web</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="referido">Referido</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <Card className="flex flex-col flex-1 bg-slate-900 border-slate-800 !p-0 overflow-hidden">
        {candidatos === null ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="flex flex-col gap-3 animate-pulse items-center">
              <div className="h-4 w-48 bg-slate-800 rounded-sm" />
              <div className="h-3 w-32 bg-slate-800 rounded-sm" />
            </div>
          </div>
        ) : candidatos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <EmptyState title="Sin candidatos" icon={Users} description="No hay candidatos con los filtros seleccionados" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-mono">ID</th>
                  <th className="px-4 py-3">NOMBRE</th>
                  <th className="px-4 py-3">CONTACTO</th>
                  <th className="px-4 py-3">LOCALIDAD</th>
                  <th className="px-4 py-3">ORIGEN</th>
                  <th className="px-4 py-3">ESTADO</th>
                  <th className="px-4 py-3">PROCESO</th>
                  <th className="px-4 py-3">CV</th>
                  <th className="px-4 py-3 font-mono">FECHA</th>
                  <th className="px-4 py-3">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map(c => (
                  <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-4 font-mono text-slate-500">{String(c.id).padStart(4, '0')}</td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-200 uppercase tracking-wider">{c.nombre}</p>
                      {c.email && <p className="text-[10px] text-slate-600 font-mono mt-0.5">{c.email}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-slate-300">{c.telefono || '—'}</p>
                      {c.empresa && <p className="text-[10px] text-slate-600 uppercase mt-0.5">{c.empresa}</p>}
                    </td>
                    <td className="px-4 py-4 uppercase text-slate-400">{c.localidad || '—'}</td>
                    <td className="px-4 py-4">
                      <Badge className={ORIGEN_CLASSES[c.origen] || 'bg-slate-700 text-slate-400 border-slate-600'}>
                        {c.origen || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={ESTADO_CLASSES[c.estado] || 'bg-slate-700 text-slate-400 border-slate-600'}>
                        {c.estado || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={PROCESO_CLASSES[c.estado_proceso] || 'bg-slate-700 text-slate-400 border-slate-600'}>
                        {c.estado_proceso || 'pendiente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      {c.cv_url ? (
                        <a href={c.cv_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                          <ExternalLink size={12} /> Ver CV
                        </a>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-500">{fmtFecha(c.fecha_entrada)}</td>
                    <td className="px-4 py-4">
                      <select value={c.estado} onChange={e => cambiarEstado(c.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-sm text-[10px] text-slate-200 px-2 py-1 outline-none font-mono">
                        <option value="nuevo">Nuevo</option>
                        <option value="revisado">Revisado</option>
                        <option value="entrevista">Entrevista</option>
                        <option value="aceptado">Aceptado</option>
                        <option value="descartado">Descartado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
};

/** Panel autónomo — no recibe props externas */
CandidatosPanel.propTypes = {};

export default CandidatosPanel;
