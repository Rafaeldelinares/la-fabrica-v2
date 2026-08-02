import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, Info } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import AccessDenied from '../../../shared/ui/AccessDenied';
import { useRbac } from '../../../shared/auth/useRbac';
import { useScraperConfig } from './useScraperConfig';
import { PanelHeader } from './PanelHeader';
import { ConfigFieldsSection } from './ConfigFieldsSection';
import { ConfirmSaveDialog } from './ConfirmSaveDialog';

/**
 * ScraperConfigPanel — admin UI to view and update scraper operational parameters.
 * R7 fallback: if CRM_SCRAPER_CONFIG_GET returns { available: false },
 * panel shows "Configuración via variables de entorno" and disables all fields.
 */
const ScraperConfigPanel = () => {
  const rbac = useRbac();
  const {
    config,
    isLoading,
    isError,
    isApiUnavailable,
    displayDepth,
    displayFrequency,
    displayLocalities,
    displayExcluded,
    setLocalDepth,
    setLocalFrequency,
    setLocalLocalities,
    setLocalExcluded,
    hasChanges,
    isSaving,
    refetch,
    notification,
    confirmOpen,
    setConfirmOpen,
    openConfirm,
    handleSave,
  } = useScraperConfig();

  if (!rbac.can('admin.system.config')) {
    return <AccessDenied permission="admin.system.config" />;
  }

  if (!isLoading && isApiUnavailable) {
    return (
      <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CONFIGURACIÓN SCRAPERS</h2>
        </div>
        <Card className="!p-0">
          <div className="py-16 px-4">
            <EmptyState icon={Info}
              title="Configuración via variables de entorno"
              description="Los parámetros de los scrapers se configuran via variables de entorno en el contenedor Docker." />
          </div>
        </Card>
      </div>
    );
  }

  if (!isLoading && isError) {
    return (
      <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">CONFIGURACIÓN SCRAPERS</h2>
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white transition-colors font-mono uppercase px-3 py-2 bg-slate-900 border border-slate-800 rounded-sm">
            <AlertCircle size={11} /> Reintentar
          </button>
        </div>
        <Card className="!p-0">
          <div className="py-12">
            <EmptyState icon={AlertCircle} title="No se pudo cargar la configuración"
              description="Error al conectar con el servicio de configuración. Reintenta en breve." />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto bg-slate-950 font-sans">
      <PanelHeader config={config} refetch={refetch} openConfirm={openConfirm}
        hasChanges={hasChanges} isSaving={isSaving} />
      <Card className="!p-0 p-5">
        <ConfigFieldsSection
          config={config}
          isLoading={isLoading}
          isApiUnavailable={isApiUnavailable}
          displayDepth={displayDepth}
          displayFrequency={displayFrequency}
          displayLocalities={displayLocalities}
          displayExcluded={displayExcluded}
          setLocalDepth={setLocalDepth}
          setLocalFrequency={setLocalFrequency}
          setLocalLocalities={setLocalLocalities}
          setLocalExcluded={setLocalExcluded}
        />
      </Card>
      {notification && (
        <div className={`text-[11px] font-mono px-4 py-3 rounded-sm border ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {notification.message}
        </div>
      )}
      {confirmOpen && <ConfirmSaveDialog onConfirm={handleSave} onClose={() => setConfirmOpen(false)} />}
    </div>
  );
};

ScraperConfigPanel.propTypes = {
  /** Placeholder for future prop API — currently uses global tab routing */
};

export default ScraperConfigPanel;
