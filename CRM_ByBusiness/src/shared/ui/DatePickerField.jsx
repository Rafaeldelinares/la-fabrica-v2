import React from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import './datepicker-navy.css';

registerLocale('es', es);

/**
 * Campo date-picker con estilo Navy Industrial.
 * Acepta/devuelve objetos Date.
 * Props: selected, onChange, showTimeSelect, placeholderText, minDate, maxDate, disabled
 */
const DatePickerField = ({ selected, onChange, showTimeSelect = false, placeholderText, minDate, maxDate, disabled }) => (
  <ReactDatePicker
    selected={selected}
    onChange={onChange}
    locale="es"
    dateFormat={showTimeSelect ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'}
    timeFormat="HH:mm"
    showTimeSelect={showTimeSelect}
    timeIntervals={15}
    placeholderText={placeholderText || (showTimeSelect ? 'DD/MM/AAAA HH:MM' : 'DD/MM/AAAA')}
    minDate={minDate}
    maxDate={maxDate}
    disabled={disabled}
    autoComplete="off"
    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 text-xs text-slate-200 outline-none focus:border-[#D00000] font-mono"
    wrapperClassName="w-full"
    popperClassName="crm-datepicker-popper"
  />
);

export default DatePickerField;
