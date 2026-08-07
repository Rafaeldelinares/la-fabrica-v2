import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';

/**
 * Combobox — searchable dropdown con estilo Navy Industrial.
 *
 * Muestra una lista de opciones filtradas por texto mientras el usuario escribe.
 * "Todos" aparece siempre al inicio para permitir limpiar el filtro.
 *
 * @param {string}   value       - Valor actualmente seleccionado (string vacío = "Todos")
 * @param {function} onChange    - Callback(valor) al seleccionar una opción
 * @param {string[]} options     - Lista de opciones disponibles
 * @param {string}   placeholder - Texto placeholder
 * @param {string}   className   - Clases extra para el wrapper
 * @param {boolean}  disabled   - Deshabilitar el control
 */
const Combobox = ({ value, onChange, options, placeholder, className = '', disabled }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef(null);

  // Sincronizar valor seleccionado con lo que se muestra en el input
  useEffect(() => {
    if (!open) {
      const matched = options.find(o => o === value);
      setInputValue(matched || '');
    }
  }, [value, options, open]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        // Si se cerró sin selección válida, restaurar el valor actual
        const matched = options.find(o => o === value);
        setInputValue(matched || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange(opt);
    setInputValue(opt);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setInputValue('');
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setOpen(true);
  };

  const showDropdown = open && !disabled && filtered.length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { if (options.length > 0) setOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className={
            `bg-slate-900 border border-slate-700 rounded-sm text-xs text-slate-300 font-mono ` +
            `px-3 py-1.5 w-36 outline-none placeholder:text-slate-600 focus:border-slate-500 ` +
            `transition-colors appearance-none cursor-pointer pr-6 ` +
            (disabled ? 'opacity-50 cursor-not-allowed' : '')
          }
          style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
        />
        {/* Chevron indicator */}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
          <ChevronDown size={12} />
        </span>
      </div>

      {showDropdown && (
        <ul className="absolute z-50 top-full left-0 mt-1 w-full bg-slate-900 border border-slate-700 rounded-sm shadow-xl max-h-48 overflow-y-auto">
          {/* Opción "Todos" */}
          <li
            className="px-3 py-1.5 text-xs font-mono text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer border-b border-slate-800"
            onMouseDown={(e) => { e.preventDefault(); handleClear(); }}
          >
            Todos
          </li>
          {filtered.map((opt) => (
            <li
              key={opt}
              className="px-3 py-1.5 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

Combobox.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};

export default Combobox;
