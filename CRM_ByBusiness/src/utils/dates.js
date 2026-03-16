import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/** Parsea un valor de fecha (string ISO, Date, o null) a objeto Date. */
const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const d = parseISO(String(value));
  return isValid(d) ? d : null;
};

/** Formatea fecha: 16/03/2026 */
export const fmtFecha = (value) => {
  const d = toDate(value);
  return d ? format(d, 'dd/MM/yyyy') : '—';
};

/** Formatea fecha con hora: 16/03/2026 · 14:30 */
export const fmtFechaHora = (value) => {
  const d = toDate(value);
  return d ? format(d, "dd/MM/yyyy · HH:mm") : '—';
};

/** Formatea mes y año: mar. 2026 */
export const fmtMesAno = (value) => {
  const d = toDate(value);
  return d ? format(d, 'MMM yyyy', { locale: es }) : '—';
};

/** Formatea solo hora: 14:30 */
export const fmtHora = (value) => {
  const d = toDate(value);
  return d ? format(d, 'HH:mm') : '—';
};
