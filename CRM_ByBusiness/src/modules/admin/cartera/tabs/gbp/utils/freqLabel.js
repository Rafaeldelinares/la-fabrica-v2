/**
 * freqLabel — convierte days (7/14/21/28) a una etiqueta legible.
 *
 * Mantenido como helper separado para que GbpCompetitiveConfig y
 * GbpConfigActions no repitan la lógica.
 *
 * @since competitive-config-s1 (2026-08-09)
 */

const FREQ_OPTIONS = [
  { value: 7,  label: 'Cada 1 semana' },
  { value: 14, label: 'Cada 2 semanas' },
  { value: 21, label: 'Cada 3 semanas' },
  { value: 28, label: 'Cada 4 semanas' },
];

export const freqLabel = (days) => {
  const opt = FREQ_OPTIONS.find((o) => o.value === days);
  return opt ? opt.label : `Cada ${days} días`;
};

export { FREQ_OPTIONS };
