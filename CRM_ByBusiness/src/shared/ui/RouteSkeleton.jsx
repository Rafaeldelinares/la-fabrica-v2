import PropTypes from 'prop-types';

/**
 * Skeleton de carga para rutas lazy-loaded.
 * Mantiene el layout visual durante la carga sin usar spinners circulares.
 *
 * @param {object} props
 * @param {'admin' | 'operator'} props.variant - Variante de layout (admin vs operator)
 */
export default function RouteSkeleton({ variant = 'admin' }) {
  if (variant === 'operator') {
    return (
      <div className="flex flex-col gap-4 p-4 animate-pulse">
        <div className="h-8 bg-slate-800/60 rounded-sm w-32" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-800/40 rounded-sm" />
          <div className="h-24 bg-slate-800/40 rounded-sm" />
        </div>
        <div className="h-48 bg-slate-800/40 rounded-sm" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 animate-pulse">
      {/* Sidebar */}
      <div className="w-48 bg-slate-900/80 rounded-sm shrink-0" />
      {/* Main content */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="h-12 bg-slate-900/80 rounded-sm" />
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-slate-900/60 rounded-sm" />
          <div className="h-24 bg-slate-900/60 rounded-sm" />
          <div className="h-24 bg-slate-900/60 rounded-sm" />
        </div>
        {/* Main card */}
        <div className="h-64 bg-slate-900/60 rounded-sm" />
      </div>
    </div>
  );
}

RouteSkeleton.propTypes = {
  variant: PropTypes.oneOf(['admin', 'operator']),
};
