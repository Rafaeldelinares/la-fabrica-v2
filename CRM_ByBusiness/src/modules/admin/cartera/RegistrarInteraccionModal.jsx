import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

const TIPOS = [
  { value: 'llamada',  label: 'Llamada' },
  { value: 'email',    label: 'Email' },
  { value: 'reunion',  label: 'Reunión' },
  { value: 'nota',     label: 'Nota interna' },
  { value: 'acuerdo',  label: 'Acuerdo' },
];

const RegistrarInteraccionModal = ({ cliente, gestorId, onClose, onSaved }) => {
  const [tipo, setTipo]                   = useState('llamada');
  const [resumen, setResumen]             = useState('');
  const [acuerdo, setAcuerdo]             = useState('');
  const [proximaAccion, setProximaAccion] = useState('');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  const N8N = import.meta.env.VITE_N8N_URL || 'http://localhost:5678/webhook';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumen.trim()) { setError('El resumen es obligatorio'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${N8N}/crm-registrar-interaccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id:        cliente.id,
          gestor_id:         gestorId,
          tipo,
          resumen:           resumen.trim(),
          acuerdo_alcanzado: acuerdo.trim() || null,
          proxima_accion:    proximaAccion.trim() || null,
        }),
      });
      const d = await res.json();
      if (d.ok) { onSaved(d.interaccion); }
      else { setError('Error al guardar'); }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Registrar interacción</p>
            <p className="text-sm font-bold text-white uppercase tracking-wide mt-0.5">{cliente.nombre_comercial}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-wide border transition-colors ${
                    tipo === t.value
                      ? 'bg-[#D00000]/20 border-[#D00000] text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">
              Resumen <span className="text-[#D00000]">*</span>
            </label>
            <textarea
              value={resumen}
              onChange={e => setResumen(e.target.value)}
              rows={3}
              placeholder="¿Qué ocurrió en esta interacción?"
              className="w-full bg-slate-950 border border-slate-700 rounded-sm text-sm text-slate-200 px-3 py-2.5 outline-none focus:border-[#D00000] resize-none placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* Acuerdo */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">Acuerdo alcanzado</label>
            <input
              type="text"
              value={acuerdo}
              onChange={e => setAcuerdo(e.target.value)}
              placeholder="Opcional — p.ej. Renovación confirmada para Mayo"
              className="w-full bg-slate-950 border border-slate-700 rounded-sm text-sm text-slate-200 px-3 py-2.5 outline-none focus:border-[#D00000] placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* Próxima acción */}
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">Próxima acción</label>
            <input
              type="text"
              value={proximaAccion}
              onChange={e => setProximaAccion(e.target.value)}
              placeholder="Opcional — p.ej. Llamar el 20 Mar para confirmar"
              className="w-full bg-slate-950 border border-slate-700 rounded-sm text-sm text-slate-200 px-3 py-2.5 outline-none focus:border-[#D00000] placeholder:text-slate-600 font-mono"
            />
          </div>

          {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase text-slate-400 hover:text-white border border-slate-700 rounded-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-[#D00000] hover:bg-[#B00000] text-white text-xs font-mono uppercase tracking-widest rounded-sm transition-colors disabled:opacity-50">
              <Send size={14} />
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrarInteraccionModal;
