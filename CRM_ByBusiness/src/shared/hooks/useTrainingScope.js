/**
 * useTrainingScope — centralizes training/real/admin mode detection.
 *
 * Derives the operational mode from auth context (`user.es_simulacion` and
 * `user.role`) and provides a single `getFilterValue()` helper used by all
 * API calls so that hardcoded `es_simulacion: true|false` literals are
 * eliminated from components.
 *
 * @returns {{
 *   mode: 'training' | 'real' | 'admin',
 *   isTraining: boolean,
 *   isReal: boolean,
 *   isAdmin: boolean,
 *   getFilterValue: () => 'both' | boolean,
 * }}
 */
import { useMemo } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';

const useTrainingScope = () => {
  const { user } = useAuth();

  return useMemo(() => {
    const rol = user?.role;
    const es_simulacion = user?.es_simulacion ?? false;

    let mode;
    if (rol === 'admin') {
      mode = 'admin';
    } else if (es_simulacion === true || rol === 'en_practicas') {
      mode = 'training';
      if (rol === 'en_practicas') {
         
        console.warn(
          '[useTrainingScope] "en_practicas" rol is deprecated — alias for training mode. ' +
          'DB migration to set es_simulacion=true on these users is pending.',
        );
      }
    } else {
      mode = 'real';
    }

    return {
      mode,
      isTraining: mode === 'training',
      isReal: mode === 'real',
      isAdmin: mode === 'admin',
      /**
       * Returns the filter value for API calls.
       *   admin    → 'both'  (no es_simulacion filter applied)
       *   training → true    (es_simulacion = true)
       *   real     → false   (es_simulacion = false)
       */
      getFilterValue: () => {
        if (mode === 'admin') return 'both';
        return mode === 'training';
      },
    };
  }, [user?.role, user?.es_simulacion]);
};

export default useTrainingScope;
export { useTrainingScope };