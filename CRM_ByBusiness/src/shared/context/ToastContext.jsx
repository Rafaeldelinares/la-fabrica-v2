/**
 * Sistema de notificaciones global (toasts).
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Guardado correctamente');
 *   toast.error('Error al conectar con el servidor');
 *   toast.info('Datos actualizados');
 *   toast.warning('Sin conexión con n8n');
 *
 * Los toasts se descartan automáticamente a los 4s.
 * Se muestran máximo 3 simultáneos (los más recientes).
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/** @type {React.Context<{success:Function,error:Function,info:Function,warning:Function}|null>} */
const ToastCtx = createContext(null);

let nextId = 1;

const DISMISS_MS = 4_000;

/** @type {Record<string, string>} */
const BORDER = {
  success: 'border-emerald-500',
  error:   'border-red-600',
  info:    'border-sky-500',
  warning: 'border-amber-500',
};

/** @type {Record<string, string>} */
const LABEL = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  info:    'text-sky-400',
  warning: 'text-amber-400',
};

/** @type {Record<string, string>} */
const ICON = {
  success: '✓',
  error:   '✕',
  info:    'i',
  warning: '!',
};

/**
 * @param {{ toast: {id:number, type:string, message:string}, onRemove: Function }} props
 */
function ToastItem({ toast, onRemove }) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 bg-slate-900 border border-slate-700 border-l-4 ${BORDER[toast.type]} px-4 py-3 rounded-sm shadow-2xl min-w-64 max-w-sm`}
    >
      <span className={`mt-0.5 font-mono text-xs font-bold w-4 text-center ${LABEL[toast.type]}`}>
        {ICON[toast.type]}
      </span>
      <p className="text-slate-200 text-sm leading-snug flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="text-slate-500 hover:text-slate-300 text-xs leading-none ml-1 mt-0.5"
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
}

ToastItem.propTypes = {
  toast: PropTypes.shape({
    id:      PropTypes.number.isRequired,
    type:    PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * Contenedor de toasts — esquina inferior derecha.
 * @param {{ toasts: Array, onRemove: Function }} props
 */
function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

ToastContainer.propTypes = {
  toasts:   PropTypes.array.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/**
 * Proveedor del sistema de toasts. Debe envolver la app o el árbol donde se usen.
 * @param {{ children: React.ReactNode }} props
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type, message) => {
    const id = nextId++;
    setToasts(prev => [...prev.slice(-2), { id, type, message }]);
    timers.current[id] = setTimeout(() => remove(id), DISMISS_MS);
  }, [remove]);

  const toast = {
    success: (msg) => add('success', msg),
    error:   (msg) => add('error',   msg),
    info:    (msg) => add('info',    msg),
    warning: (msg) => add('warning', msg),
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastCtx.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook para disparar notificaciones desde cualquier componente.
 * @returns {{ success: Function, error: Function, info: Function, warning: Function }}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
