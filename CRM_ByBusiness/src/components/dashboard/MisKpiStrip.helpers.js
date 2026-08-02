/**
 * Pure helper functions for MisKpiStrip.
 * @fileoverview KPI data extraction and value formatting.
 */

/**
 * Extracts KPI data from the n8n response array.
 * n8n returns: [{json: {calls_hoy, ventas_hoy, duracion_media, tasa_conversion, refreshed_at}}]
 *
 * @param {unknown} data - Raw n8n query response
 * @returns {{ calls_today: number, ventas_hoy: number, tasa_conversion: number, duracion_media: number, refreshed_at: string } | null}
 */
const extractKpis = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const kpis = data[0]?.json;
  if (!kpis) return null;
  return {
    calls_today: Number(kpis.calls_hoy ?? 0),
    ventas_hoy: Number(kpis.ventas_hoy ?? 0),
    tasa_conversion: Number(kpis.tasa_conversion ?? 0),
    duracion_media: Number(kpis.duracion_media ?? 0),
    refreshed_at: kpis.refreshed_at,
  };
};

/**
 * Formats a KPI value for display based on the KPI key.
 *
 * @param {{ key: string }} kpi - KPI descriptor with key field
 * @param {unknown} value - Raw value to format
 * @returns {string} Formatted display value
 */
const formatValue = (kpi, value) => {
  if (kpi.key === 'tasa_conversion') {
    return Number(value).toFixed(1);
  }
  if (kpi.key === 'duracion_media') {
    const mins = Math.floor(Number(value) / 60);
    const secs = Number(value) % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return Number(value).toLocaleString();
};

export { extractKpis, formatValue };
