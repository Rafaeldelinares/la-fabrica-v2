/**
 * GbpInformeCompetencia — Botón y modal para ver el informe competitivo PDF de un cliente.
 *
 * Muestra un botón "Ver informe competitivo" (admin-only) que abre un modal con:
 *  - iframe embebido mostrando el PDF
 *  - botón Descargar PDF
 *  - skeleton mientras carga
 *  - error state
 *
 * Si el backend devuelve status: needs_cid (no puede encontrar el CID
 * automaticamente), se muestra el modal ManualCIDModal para que el admin
 * ingrese el CID manualmente.
 *
 * Si VITE_N8N_WEBHOOK_INFORME_PDF no esta configurada, el boton aparece
 * deshabilitado con un mensaje explicativo.
 *
 * RBAC: requiere `admin.system.config` — operadores NO ven el botón.
 *
 * @param {{ clienteId: string|number, clienteNombre?: string }} props
 *
 * @since 2026-08-13 (Phase 3 — crm-informe-pdf)
 * @updated 2026-08-13 (Phase 8 — Manual CID + needsCid)
 */
import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FileText, Download, X, AlertCircle, Info } from 'lucide-react';
import { useRbac } from '../../../../../shared/auth/useRbac';
import { hasEnvVar } from '../../../../../shared/utils/envValidation';
import { useInformeCompetencia } from './useInformeCompetencia';
import PdfViewer from './PdfViewer';
import ManualCIDModal from './ManualCIDModal';

// Indica si el webhook esta configurado (para mostrar warning si no)
const WEBHOOK_CONFIGURED = hasEnvVar('VITE_N8N_WEBHOOK_INFORME_PDF');

/**
 * Skeleton que se muestra mientras carga el PDF.
 * Siempre muestra "Generando informe..." porque no podemos distinguir
 * entre "cargando PDF existente" (<1s) y "generando nuevo" (30-90s)
 * sin información del backend. El mensaje cubra ambos casos.
 *
 * @param {{ isGenerating?: boolean }} props
 */
const PdfSkeleton = ({ isGenerating = true }) => (
  <div className="flex flex-col items-center justify-center h-full gap-3">
    <div className="flex flex-col items-center gap-2">
      <div className="w-48 h-3 bg-slate-800/40 rounded-sm animate-pulse" />
      <div className="w-32 h-2 bg-slate-800/20 rounded-sm animate-pulse" />
    </div>
    <p className="text-[10px] font-mono text-slate-600">
      {isGenerating
        ? 'Generando informe por primera vez… (30-90s)'
        : 'Extrayendo datos de competidores…'}
    </p>
  </div>
);

/**
 * Estado de error con mensaje y retry.
 */
const PdfError = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
    <AlertCircle className="w-8 h-8 text-red-500" />
    <p className="text-[10px] font-mono text-red-400 text-center">
      {message || 'Error al generar informe'}
    </p>
    <button
      onClick={onRetry}
      className="text-[9px] font-mono text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-sm transition-colors"
    >
      Reintentar
    </button>
  </div>
);

/**
 * Empty state cuando no hay informe disponible.
 */
const PdfEmpty = ({ clienteNombre, onGenerate }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
    <FileText className="w-10 h-10 text-slate-700" />
    <div className="text-center">
      <p className="text-[11px] font-mono text-slate-400 mb-1">
        Sin informe para{' '}
        <span className="text-slate-200">{clienteNombre || 'este cliente'}</span>
      </p>
      <p className="text-[9px] font-mono text-slate-600">
        El informe se genera automáticamente cada 4 semanas o manualmente.
      </p>
    </div>
    {onGenerate && (
      <button
        onClick={onGenerate}
        className="text-[9px] font-mono text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-sm transition-colors"
      >
        Generar ahora
      </button>
    )}
  </div>
);

/**
 * Modal principal con iframe PDF.
 */
const PdfModal = ({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  pdfUrl,
  isLoading,
  error,
  onRetry,
  _onDownload,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const title = `Informe competitivo — ${clienteNombre || `Cliente ${clienteId}`}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-sm w-full max-w-4xl mx-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
            <h2 className="text-[11px] font-mono text-slate-200 font-semibold tracking-wide truncate">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-sm hover:bg-slate-800"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — iframe o estado */}
        <div className="flex-1 min-h-0 bg-slate-950 border-b border-slate-800">
          {isLoading && <PdfSkeleton />}
          {!isLoading && error && <PdfError message={error} onRetry={onRetry} />}
          {!isLoading && !error && !pdfUrl && (
            <PdfEmpty clienteNombre={clienteNombre} />
          )}
          {!isLoading && !error && pdfUrl && (
            <PdfViewer pdfUrl={pdfUrl} title={title} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <a
            href={pdfUrl || '#'}
            download={`informe_competitivo_${clienteId}.pdf`}
            onClick={pdfUrl ? undefined : (e) => e.preventDefault()}
            className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-sm border transition-colors ${
              pdfUrl
                ? 'border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 bg-slate-800 hover:bg-slate-700 cursor-pointer'
                : 'border-slate-800 text-slate-700 cursor-not-allowed pointer-events-none'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Descargar PDF
          </a>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-sm bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

PdfModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  clienteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  clienteNombre: PropTypes.string,
  pdfUrl: PropTypes.string,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

/**
 * Componente principal.
 *
 * Renderiza un botón admin-only que abre el modal del PDF.
 * Si el backend no puede encontrar el CID automaticamente,
 * muestra ManualCIDModal en lugar del PDF.
 */
const GbpInformeCompetencia = ({ clienteId, clienteNombre }) => {
  const rbac = useRbac();
  const [modalOpen, setModalOpen] = useState(false);
  const [manualCidModalOpen, setManualCidModalOpen] = useState(false);

  const { pdfUrl, isLoading, error, needsCid, submitCid, fetchInformePDF, descargarPDF } =
    useInformeCompetencia();

  // When needsCid is set by the hook, open the manual CID modal
  useEffect(() => {
    if (needsCid) {
      setModalOpen(false); // Close PDF modal if open
      setManualCidModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [needsCid]);

  const handleOpen = useCallback(async () => {
    setModalOpen(true);
    if (!pdfUrl && !isLoading) {
      try {
        await fetchInformePDF(clienteId);
      } catch (_unused) {
        // error state se maneja dentro del hook
      }
    }
  }, [clienteId, pdfUrl, isLoading, fetchInformePDF]);

  const handleClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleRetry = useCallback(async () => {
    try {
      await fetchInformePDF(clienteId);
    } catch (_unused) {
      // error state se maneja dentro del hook
    }
  }, [clienteId, fetchInformePDF]);

  const handleCloseManualCid = useCallback(() => {
    setManualCidModalOpen(false);
  }, []);

  const handleManualCidSubmit = useCallback(
    async (cid) => {
      await submitCid(needsCid.clienteId, cid);
      setManualCidModalOpen(false);
      // pdfUrl will be set by the hook — user can click button to view
    },
    [needsCid, submitCid]
  );

  // No renderizar nada si no es admin (early return DESPUES de todos los hooks)
  if (!rbac.can('admin.system.config')) {
    return null;
  }

  return (
    <>
      <div className="px-5 py-4 border-t border-slate-800/60">
        <p className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mb-3">
          Competencia
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpen}
            disabled={isLoading || !WEBHOOK_CONFIGURED}
            className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-2 rounded-sm bg-[#D00000]/90 hover:bg-[#D00000] text-white border border-[#D00000]/50 hover:border-[#D00000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              WEBHOOK_CONFIGURED
                ? 'Ver informe competitivo en PDF'
                : 'Webhook no configurado'
            }
          >
            <FileText className="w-3.5 h-3.5" />
            Ver informe competitivo
          </button>
          {!WEBHOOK_CONFIGURED && (
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-500/80">
              <Info className="w-3 h-3" />
              <span>Webhook no configurado</span>
            </div>
          )}
        </div>
      </div>

      <PdfModal
        isOpen={modalOpen && !needsCid}
        onClose={handleClose}
        clienteId={clienteId}
        clienteNombre={clienteNombre}
        pdfUrl={pdfUrl}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        onDownload={descargarPDF}
      />

      {needsCid && (
        <ManualCIDModal
          open={manualCidModalOpen}
          onClose={handleCloseManualCid}
          clienteId={needsCid.clienteId}
          clienteNombre={needsCid.clienteNombre}
          instructions={needsCid.instructions}
          onSubmit={handleManualCidSubmit}
        />
      )}
    </>
  );
};

GbpInformeCompetencia.propTypes = {
  clienteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  clienteNombre: PropTypes.string,
};

export default GbpInformeCompetencia;
