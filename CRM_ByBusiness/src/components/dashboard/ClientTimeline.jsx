
import React from 'react';
import { 
  Phone, 
  FileText, 
  DollarSign, 
  Clock, 
  Mail, 
  AlertCircle, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

const eventConfig = {
  'LLAMADA': { icon: <Phone size={14} />, color: 'bg-blue-500', label: 'Llamada' },
  'VENTA': { icon: <FileText size={14} />, color: 'bg-emerald-500', label: 'Venta/Contrato' },
  'COBRO': { icon: <DollarSign size={14} />, color: 'bg-amber-500', label: 'Pago' },
  'VENCIMIENTO': { icon: <Clock size={14} />, color: 'bg-rose-500', label: 'Vencimiento' },
  'EMAIL': { icon: <Mail size={14} />, color: 'bg-slate-500', label: 'Email' },
  'CITA': { icon: <Calendar size={14} />, color: 'bg-indigo-500', label: 'Cita' },
  'INCIDENCIA': { icon: <AlertCircle size={14} />, color: 'bg-orange-500', label: 'Incidencia' },
};

const TimelineItem = ({ event, isLast }) => {
  const config = eventConfig[event.tipo_evento] || eventConfig['LLAMADA'];
  const date = new Date(event.fecha_evento).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="relative pl-8 pb-8 last:pb-0 group">
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-800 group-hover:bg-slate-700 transition-colors"></div>
      )}
      
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-white shadow-lg z-10 transform group-hover:scale-110 transition-transform`}>
        {config.icon}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-all">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{config.label}</span>
          <span className="text-[10px] text-slate-600 font-mono">{date}</span>
        </div>
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-tight">{event.subtipo_resultado}</h4>
        {event.detalles?.nota && (
          <p className="text-[11px] text-slate-400 mt-2 italic leading-relaxed border-l-2 border-slate-800 pl-3">
            "{event.detalles.nota}"
          </p>
        )}
        {event.fecha_agendada && (
          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-400/80 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
            <Clock size={12} />
            AGENDADO PARA: {new Date(event.fecha_agendada).toLocaleDateString('es-ES')}
          </div>
        )}
      </div>
    </div>
  );
};

const ClientTimeline = ({ events = [] }) => {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-600 border-2 border-dashed border-slate-900 rounded-xl">
        <History size={48} className="mb-4 opacity-20" />
        <p className="text-xs font-bold uppercase tracking-widest">Sin actividad registrada</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-tighter mb-6 flex items-center">
        <CheckCircle2 size={14} className="mr-2 text-emerald-500" /> Historial de Trazabilidad
      </h3>
      <div className="relative">
        {events.map((event, index) => (
          <TimelineItem 
            key={event.id || index} 
            event={event} 
            isLast={index === events.length - 1} 
          />
        ))}
      </div>
    </div>
  );
};

export default ClientTimeline;
