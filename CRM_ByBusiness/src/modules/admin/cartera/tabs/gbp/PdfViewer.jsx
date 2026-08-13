/**
 * PdfViewer.jsx - Visor de PDF usando pdfjs-dist.
 *
 * Soluciona el problema de Brave bloqueando iframes con PDFs.
 * Renderiza el PDF en un <canvas> en lugar de un <iframe>.
 * Soporta multiples paginas con navegacion.
 *
 * Props:
 *  - pdfUrl: string (URL del PDF, puede ser blob: o http://)
 *  - title: string (para accesibilidad)
 *
 * @since 2026-08-13 (Phase - Brave fix)
 */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
// Importar el worker como raw para crear blob URL con MIME type correcto
import pdfjsWorkerRaw from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';

// pdfjs-dist v6+ exporta como default
const pdfjs = pdfjsLib.default || pdfjsLib;

// Worker como blob URL con MIME type correcto (evita problema de "application/octet-stream")
const pdfjsWorkerBlob = new Blob([pdfjsWorkerRaw], { type: 'application/javascript' });
pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(pdfjsWorkerBlob);

const PdfViewer = ({ pdfUrl, title = 'PDF' }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga el PDF
  useEffect(() => {
    if (!pdfUrl) return;

    setIsLoading(true);
    setError(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setTotalPages(0);

    const loadTask = pdfjs.getDocument(pdfUrl);
    loadTask.promise
      .then((pdf) => {
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error cargando PDF');
        setIsLoading(false);
      });

    return () => {
      loadTask.destroy();
    };
  }, [pdfUrl]);

  // Renderiza la página actual
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        setError(err.message || 'Error renderizando pagina');
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-slate-950">
      {/* Toolbar de navegacion */}
      {pdfDoc && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentPage <= 1}
              className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={currentPage >= totalPages}
              className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Pagina siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={zoomOut}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Reducir"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Aumentar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto bg-slate-950 flex items-start justify-center p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-[10px] font-mono">Cargando PDF...</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400 px-6">
            <AlertCircle className="w-8 h-8" />
            <p className="text-[10px] font-mono text-center">{error}</p>
          </div>
        )}
        {!isLoading && !error && (
          <canvas
            ref={canvasRef}
            className="shadow-2xl"
            style={{ maxWidth: '100%', height: 'auto' }}
            aria-label={title}
          />
        )}
      </div>
    </div>
  );
};

PdfViewer.propTypes = {
  pdfUrl: PropTypes.string.isRequired,
  title: PropTypes.string,
};

export default PdfViewer;
