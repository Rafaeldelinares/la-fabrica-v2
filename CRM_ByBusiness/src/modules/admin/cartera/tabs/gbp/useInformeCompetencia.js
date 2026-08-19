/**
 * useInformeCompetencia — Hook para cargar el PDF del informe competitivo de un cliente.
 *
 * El PDF se sirve via n8n V8 (workflow crm-informe-pdf-v8):
 *   POST https://n8n.ia-bybusiness.online/webhook/crm-informe-pdf-v8
 *   Body: { "cliente_id": N }
 *   Response: application/pdf (binary) o status: needs_cid JSON
 *
 * On-demand generation: si no hay informe previo, el backend dispara el
 * scraping en Xiaomi (30-90s) antes de devolver el PDF. El fetch puede
 * tardar hasta 180s — el frontend debe mantener el loading state.
 *
 * Si el backend no puede encontrar el CID automaticamente, devuelve un
 * JSON con status: "needs_cid" — el hook captura esto y retorna needsCid
 * para que el componente muestre el modal de CID manual.
 *
 * @since 2026-08-13 (Phase 3 — crm-informe-pdf)
 * @updated 2026-08-13 (Phase 8 — Manual CID + needsCid state)
 */
import { useState, useCallback, useRef } from 'react';
import { getEnvVar } from '../../../../../shared/utils/envValidation';

const FETCH_TIMEOUT_MS = 180_000; // 180 seconds — covers Xiaomi scraping (30-90s)

/**
 * AbortController wrapper for fetch with timeout.
 * @param {number} ms
 * @returns {{ signal: AbortSignal, timeoutId: number }}
 */
const fetchWithTimeout = (ms) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, timeoutId };
};

// Optional env var — si no esta configurada, el boton aparece deshabilitado
const N8N_WEBHOOK_URL = getEnvVar('VITE_N8N_WEBHOOK_INFORME_PDF');

/**
 * @typedef {Object} NeedsCidData
 * @property {number} clienteId
 * @property {string} clienteNombre
 * @property {string[]} instructions
 */

/**
 * @typedef {Object} UseInformeCompetenciaReturn
 * @property {string|null} pdfUrl
 * @property {boolean} isLoading
 * @property {string|null} error
 * @property {NeedsCidData|null} needsCid
 * @property {(clienteId: string|number, googleCid: string) => Promise<string>} submitCid
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
  const [needsCid, setNeedsCid] = useState(null);
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
   * Process the response body as PDF and set the blob URL.
   * @param {Response} response
   * @returns {Promise<string>} blob URL
   */
  const processPdfResponse = useCallback(
    async (response) => {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      setPdfUrl(blobUrl);
      setIsLoading(false);
      return blobUrl;
    },
    []
  );

  /**
   * Fetch del PDF para un cliente y devuelve la blob URL.
   * POST con { "cliente_id": N }
   *
   * Si el backend devuelve status: needs_cid (cuando no puede encontrar
   * el CID automaticamente), esta funcion configura el estado needsCid
   * en lugar de devolver el PDF.
   *
   * @param {string|number} clienteId
   * @returns {Promise<string|null>} blob URL o null si needsCid
   */
  const fetchInformePDF = useCallback(
    async (clienteId) => {
      revokePdf();
      setIsLoading(true);
      setError(null);
      setNeedsCid(null);

      let response;
      try {
        const { signal, timeoutId } = fetchWithTimeout(FETCH_TIMEOUT_MS);
        response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cliente_id: Number(clienteId) }),
          signal,
        });
        clearTimeout(timeoutId);
      } catch (err) {
        const isTimeout =
          err.name === 'AbortError' || err.message.includes('abort');
        const msg = isTimeout
          ? 'La generación excedió el tiempo (180s). Puedes reintentar.'
          : `Error de red: ${err.message}`;
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      if (!response.ok) {
        let msg = `Error ${response.status}`;
        try {
          const body = await response.text();
          if (body) {
            try {
              const json = JSON.parse(body);
              msg += json?.detail ? `: ${json.detail.slice(0, 200)}` : `: ${body.slice(0, 200)}`;
            } catch (_) {
              msg += `: ${body.slice(0, 200)}`;
            }
          }
        } catch (_) { /* ignore */ }
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      const contentType = response.headers.get('Content-Type') || '';

      // Check if backend returned needs_cid JSON instead of PDF (check FIRST to avoid creating bad blob)
      if (
        !contentType.includes('pdf') &&
        !contentType.includes('octet-stream') &&
        !contentType.includes('application/octet')
      ) {
        let needsCidData;
        try {
          needsCidData = await response.json();
        } catch (_) {
          // Not JSON — treat as unexpected content type
          const msg = `Content-Type inesperado: ${contentType}`;
          setError(msg);
          setIsLoading(false);
          throw new Error(msg);
        }

        if (needsCidData?.status === 'needs_cid') {
          setNeedsCid({
            clienteId: needsCidData.cliente_id,
            clienteNombre: needsCidData.cliente_nombre || '',
            instructions: needsCidData.instructions || [],
          });
          setIsLoading(false);
          return null; // Signal: needs CID
        }

        // JSON response but not needs_cid — treat as error
        const msg =
          needsCidData?.message ||
          needsCidData?.error ||
          JSON.stringify(needsCidData).slice(0, 200);
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      // It's a PDF — process it
      return processPdfResponse(response);
    },
    [revokePdf, processPdfResponse]
  );

  /**
   * Submit manually-entered CID and trigger PDF generation.
   * POST with { "cliente_id": N, "google_cid": "0x...:0x..." }
   *
   * @param {string|number} clienteId
   * @param {string} googleCid
   * @returns {Promise<string>} blob URL
   */
  const submitCid = useCallback(
    async (clienteId, googleCid) => {
      revokePdf();
      setIsLoading(true);
      setError(null);
      setNeedsCid(null);

      let response;
      try {
        const { signal, timeoutId } = fetchWithTimeout(FETCH_TIMEOUT_MS);
        response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: Number(clienteId),
            google_cid: googleCid,
          }),
          signal,
        });
        clearTimeout(timeoutId);
      } catch (err) {
        const isTimeout =
          err.name === 'AbortError' || err.message.includes('abort');
        const msg = isTimeout
          ? 'La generación excedió el tiempo (180s). Puedes reintentar.'
          : `Error de red: ${err.message}`;
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      if (!response.ok) {
        let msg = `Error ${response.status}`;
        try {
          const body = await response.text();
          if (body) {
            try {
              const json = JSON.parse(body);
              msg += json?.detail ? `: ${json.detail.slice(0, 200)}` : `: ${body.slice(0, 200)}`;
            } catch (_) {
              msg += `: ${body.slice(0, 200)}`;
            }
          }
        } catch (_) { /* ignore */ }
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      const contentType = response.headers.get('Content-Type') || '';

      // Check if backend returned needs_cid (e.g., CID was invalid or scraping still failed)
      if (
        !contentType.includes('pdf') &&
        !contentType.includes('octet-stream') &&
        !contentType.includes('application/octet')
      ) {
        let needsCidData;
        try {
          needsCidData = await response.json();
        } catch (_) {
          const msg = `Content-Type inesperado: ${contentType}`;
          setError(msg);
          setIsLoading(false);
          throw new Error(msg);
        }

        if (needsCidData?.status === 'needs_cid') {
          // CID was rejected — show modal again
          setNeedsCid({
            clienteId: needsCidData.cliente_id,
            clienteNombre: needsCidData.cliente_nombre || '',
            instructions: needsCidData.instructions || [],
          });
          setIsLoading(false);
          throw new Error(needsCidData?.message || 'El CID ingresado no fue aceptado');
        }

        const msg =
          needsCidData?.message ||
          needsCidData?.error ||
          JSON.stringify(needsCidData).slice(0, 200);
        setError(msg);
        setIsLoading(false);
        throw new Error(msg);
      }

      return processPdfResponse(response);
    },
    [revokePdf, processPdfResponse]
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
    needsCid,
    submitCid,
    fetchInformePDF,
    descargarPDF,
  };
};
