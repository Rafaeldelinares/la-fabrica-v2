/**
 * useInformeCompetencia — Hook para cargar el PDF del informe competitivo de un cliente.
 *
 * El PDF se sirve via n8n V8 (workflow crm-informe-pdf-v8):
 *   POST https://n8n.ia-bybusiness.online/webhook/crm-informe-pdf-v8
 *   Body: { "cliente_id": N }
 *   Response: application/pdf (binary)
 *
 * @since 2026-08-13 (Phase 3 — crm-informe-pdf)
 */
import { useState, useCallback, useRef } from 'react';
import { validateEnvVar } from '../../../../../shared/utils/envValidation';

const N8N_WEBHOOK_URL = validateEnvVar('VITE_N8N_WEBHOOK_INFORME_PDF');

/**
 * @typedef {Object} UseInformeCompetenciaReturn
 * @property {string|null} pdfUrl
 * @property {boolean} isLoading
 * @property {string|null} error
 * @property {(clienteId: string|number) => Promise<string>} fetchInformePDF
 * @property {() => void} descargarPDF
 */

/**
 * Hook principal.
 *
 * @returns {UseInformeCompetenciaReturn}
 */
export const useInformeCompetencia = () => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef(null);

  /** Libera la blob URL anterior para evitar memory leaks. */
  const revokePdf = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPdfUrl(null);
  }, []);

  /**
   * Fetch del PDF para un cliente y devuelve la blob URL.
   * POST con { "cliente_id": N }
   *
   * @param {string|number} clienteId
   * @returns {Promise<string>} blob URL del PDF
   */
  const fetchInformePDF = useCallback(
    async (clienteId) => {
      revokePdf();
      setIsLoading(true);
      setError(null);

      let response;
      try {
        response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cliente_id: Number(clienteId) }),
        });
      } catch (err) {
        const msg = `Error de red: ${err.message}`;
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      if (!response.ok) {
        let msg = `Error ${response.status}`;
        try {
          const body = await response.text();
          if (body) msg += `: ${body.slice(0, 200)}`;
        } catch (_) { /* ignore */ }
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
        let msg;
        try {
          const body = await response.json();
          msg = body?.message || body?.error || JSON.stringify(body).slice(0, 200);
        } catch (_) {
          msg = `Content-Type inesperado: ${contentType}`;
        }
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      blobUrlRef.current = blobUrl;
      setPdfUrl(blobUrl);
      setIsLoading(false);
      return blobUrl;
    },
    [revokePdf]
  );

  /**
   * Fuerza descarga del PDF actual usando la blob URL.
   */
  const descargarPDF = useCallback(() => {
    if (!blobUrlRef.current) return;
    const a = document.createElement('a');
    a.href = blobUrlRef.current;
    a.download = `informe_competitivo_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return {
    pdfUrl,
    isLoading,
    error,
    fetchInformePDF,
    descargarPDF,
  };
};
