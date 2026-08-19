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
    // Reset state when no hay URL
    if (!pdfUrl || typeof pdfUrl !== 'string' || pdfUrl.trim() === '') {
      setIsLoading(false); // eslint-disable-line react-hooks/set-state-in-effect
      setError(null); // eslint-disable-line react-hooks/set-state-in-effect
      setPdfDoc(null); // eslint-disable-line react-hooks/set-state-in-effect
      setTotalPages(0); // eslint-disable-line react-hooks/set-state-in-effect
      setCurrentPage(1); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setTotalPages(0);

    // Si pdfUrl es blob URL, fetchear y pasar data directo (evita race con revoke)
    // Si es http URL, pasar url directo
    const isBlob = pdfUrl.startsWith('blob:');

    if (isBlob) {
      // Fetchear el blob y pasar data directo
      fetch(pdfUrl)
        .then((res) => {
          if (cancelled) return null;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          if (cancelled || !buffer) return null;
          return pdfjs.getDocument({ data: buffer }).promise;
        })
        .then((pdf) => {
          if (cancelled || !pdf) return;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setIsLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message || 'Error cargando PDF');
          setIsLoading(false);
        });
    } else {
      // URL normal
      try {
        const loadPromise = pdfjs.getDocument(pdfUrl).promise;
        loadPromise
          .then((pdf) => {
            if (cancelled) return;
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setIsLoading(false);
          })
          .catch((err) => {
            if (cancelled) return;
            setError(err.message || 'Error cargando PDF');
            setIsLoading(false);
          });
      } catch (err) {
        setError(err.message || 'URL invalida');
        setIsLoading(false);
      }
    }
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
          <div className="flex flex-col gap-2 px-5 py-6 w-full">
            <div className="h-3 w-24 bg-slate-800 rounded-sm animate-pulse" />
            <div className="h-3 w-32 bg-slate-800 rounded-sm animate-pulse" />
            <div className="h-3 w-20 bg-slate-800 rounded-sm animate-pulse" />
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
          className="shadow-2xl max-w-full h-auto"
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
