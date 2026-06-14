import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/**
 * Hook para consumir el AuthContext.
 * Lanza un warning en dev si se usa fuera de un AuthProvider.
 */
export const useAuth = () => useContext(AuthContext);
