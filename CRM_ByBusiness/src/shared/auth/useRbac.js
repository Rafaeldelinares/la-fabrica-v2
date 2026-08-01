import { useMemo } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import { can, canAll, canAny, getPermissionsForUser } from './rbac';

/**
 * Hook que expone utilidades RBAC al componente actual.
 *
 * @returns {{
 *   can: (permission: string) => boolean,
 *   canAll: (...permissions: string[]) => boolean,
 *   canAny: (...permissions: string[]) => boolean,
 *   permisos: string[]
 * }}
 */
export const useRbac = () => {
  const { user } = useAuth();
  const permisos = useMemo(() => getPermissionsForUser(user), [user]);
  return {
    can: (permission) => can(user, permission),
    canAll: (...perms) => canAll(user, ...perms),
    canAny: (...perms) => canAny(user, ...perms),
    permisos,
    user,
  };
};

export default useRbac;
