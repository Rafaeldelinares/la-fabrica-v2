// Servicio de Webhooks de n8n - La Fábrica

const API_BASE = 'https://n8n.ia-bybusiness.online/webhook';
const IS_DEV = import.meta.env.DEV;

// IMPORTANTE: En n8n cloud o expuesto con traefik a internet los webhooks siempre están disponibles en la url del dominio,
// si usamos node del lado cliente, los webhooks que llamamos localhost causarán problemas si el cliente está en internet.
const BASE_URL = IS_DEV ? 'http://localhost:5678/webhook' : API_BASE;

export const webhookService = {
  /**
   * Envía los datos del formulario de Contacto al webhook de n8n
   * @param {Object} data Datos del formulario de contacto
   * @returns {Promise<Object>} Respuesta del servidor
   */
  async submitContactForm(data) {
    try {
      const response = await fetch(`${BASE_URL}/monitor-contacto-frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'monitor_reputacion',
          form: 'contacto',
          timestamp: new Date().toISOString(),
          ...data
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error enviando formulario de contacto:', error);
      throw error;
    }
  },

  /**
   * Envía los datos del formulario ATS al webhook de n8n
   * @param {Object} data Datos del formulario ATS
   * @returns {Promise<Object>} Respuesta del servidor
   */
  async submitATSForm(data) {
    try {
      const response = await fetch(`${BASE_URL}/monitor-ats-frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'monitor_reputacion',
          form: 'ats',
          timestamp: new Date().toISOString(),
          ...data
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error enviando formulario ATS:', error);
      throw error;
    }
  }
};
