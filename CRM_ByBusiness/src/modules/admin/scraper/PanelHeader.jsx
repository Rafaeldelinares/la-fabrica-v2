import React from 'react';
import { RefreshCw, Save, AlertCircle } from 'lucide-react';

/**
 * PanelHeader — title, refresh and save buttons for ScraperConfigPanel.
 *
 * @param {{ config: object, refetch: Function, openConfirm: Function, hasChanges: boolean, isSaving: boolean }} props
 * @returns {JSX.Element}
 */
const PanelHeader = ({ config, refetch, openConfirm, hasChanges, isSaving }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-black text-white uppercase tracking-widest">CONFIGURACIÓN SCRAPERS</h2>
      {config?.updated_at && (
        <span className="text-[10px] font-mono text-slate-500">
          ↻ {new Date(config.updated_at).toLocaleString('es-ES')}
        </span>
      )}
    </div>
    <div className="flex items-center gap-2">
      <button onClick={() => refetch()}
        className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
        <RefreshCw size={11} /> Refresh
      </button>
      <button onClick={openConfirm} disabled={!hasChanges || isSaving}
        className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono uppercase tracking-widest rounded-sm border transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#D00000]/10 border-[#D00000]/30 text-[#D00000] hover:bg-[#D00000]/20 hover:border-[#D00000]/60">
        {isSaving ? <><AlertCircle size={10} /> Guardando…</> : <><Save size={10} /> Guardar cambios</>}
      </button>
    </div>
  </div>
);

export { PanelHeader };
