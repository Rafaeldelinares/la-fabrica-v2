import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * AccessDenied — shown when the current user lacks the required RBAC permission.
 * Used as an early-return guard inside admin/operator components.
 *
 * @param {{ permission?: string }} props
 */
const AccessDenied = ({ permission }) => (
  <div className="flex items-center justify-center h-full p-8">
    <div className="text-center">
      <AlertTriangle size={32} className="mx-auto mb-3 text-slate-600" />
      <h2 className="text-lg font-bold text-white mb-2">Acceso restringido</h2>
      <p className="text-sm text-slate-400">
        No tienes permiso para acceder a este panel.
        {permission && (
          <span className="block mt-1 text-xs text-slate-600 font-mono">
            Permiso requerido: {permission}
          </span>
        )}
      </p>
    </div>
  </div>
);

export default AccessDenied;
