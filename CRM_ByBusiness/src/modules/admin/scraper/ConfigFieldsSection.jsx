import React from 'react';
import Skeleton from '../../../shared/ui/Skeleton';

/**
 * ConfigFieldsSection — renders all 4 scraper config form fields,
 * or skeleton loaders when isLoading is true.
 *
 * @param {{ config: object, isLoading: boolean, isApiUnavailable: boolean, displayDepth: number|null, displayFrequency: number|null, displayLocalities: Array, displayExcluded: Array, setLocalDepth: Function, setLocalFrequency: Function, setLocalLocalities: Function, setLocalExcluded: Function }} props
 * @returns {JSX.Element}
 */
const ConfigFieldsSection = ({
  config, isLoading, isApiUnavailable,
  displayDepth, displayFrequency, displayLocalities, displayExcluded,
  setLocalDepth, setLocalFrequency, setLocalLocalities, setLocalExcluded,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonField />
        <SkeletonField />
        <SkeletonField tall />
        <SkeletonField tall />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <NumberField
        label="Profundidad (depth)"
        value={displayDepth}
        onChange={(v) => setLocalDepth(v)}
        disabled={isApiUnavailable}
        help={`Nivel de recursión (1–20). Valor actual: ${config?.depth ?? '—'}`}
      />
      <NumberField
        label="Frecuencia (minutos)"
        value={displayFrequency}
        onChange={(v) => setLocalFrequency(v)}
        disabled={isApiUnavailable}
        help={`Intervalo (5–1440). Valor actual: ${config?.frequency ?? config?.frequency_minutes ?? '—'}`}
      />
      <TextField
        label="Localidades"
        value={displayLocalities}
        onChange={setLocalLocalities}
        disabled={isApiUnavailable}
        placeholder="Madrid, Barcelona, Valencia"
        help={`Separadas por coma. Valor actual: ${displayLocalities.length > 0 ? displayLocalities.join(', ') : '—'}`}
      />
      <TextField
        label="Categorías excluidas"
        value={displayExcluded}
        onChange={setLocalExcluded}
        disabled={isApiUnavailable}
        placeholder="restaurantes, tiendas"
        help={`Separadas por coma. Valor actual: ${displayExcluded.length > 0 ? displayExcluded.join(', ') : '—'}`}
      />
    </div>
  );
};

/** Number input field with label and help text. */
const NumberField = ({ label, value, onChange, disabled, help }) => (
  <div className="flex flex-col gap-2">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      disabled={disabled}
      className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-sm font-mono text-white w-32 text-center outline-none focus:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
    />
    <p className="text-[9px] font-mono text-slate-700">{help}</p>
  </div>
);

/** Text input field with label and help text. */
const TextField = ({ label, value, onChange, disabled, placeholder, help }) => (
  <div className="flex flex-col gap-2">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <input
      type="text"
      value={value?.join(', ') ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? [] : e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
      disabled={disabled}
      placeholder={placeholder}
      className="bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-sm font-mono text-white w-full outline-none focus:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
    />
    <p className="text-[9px] font-mono text-slate-700">{help}</p>
  </div>
);

/** Skeleton placeholder for a form field. */
const SkeletonField = ({ tall }) => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-3 w-40" type="rect" />
    <Skeleton className={`${tall ? 'h-20' : 'h-9'} w-full`} type="rect" />
  </div>
);

export { ConfigFieldsSection };
