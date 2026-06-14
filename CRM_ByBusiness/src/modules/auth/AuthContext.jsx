import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 60 Minutes

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // INSTANT AUTH: Initialize state directly from localStorage (Lazy Init)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('op_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      // localStorage corrupto o bloqueado (modo incognito, etc.) — empezar limpio
      localStorage.removeItem('op_user');
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return !!localStorage.getItem('op_user');
    } catch {
      return false;
    }
  });
  const [lastActivity, setLastActivity] = useState(() => Date.now());
  const [timeLeft, setTimeLeft] = useState(INACTIVITY_LIMIT_MS);

  // We no longer need the useEffect just for loading session
  // useEffect(() => { ... }, []); removed

  // Activity Listener
  const registerActivity = () => {
    setLastActivity(Date.now());
  };

  const login = (userData) => {
    const userObj = {
      id: userData.id,
      email: userData.email,
      role: userData.role || userData.rol || 'operador',
      nombre: userData.nombre || userData.email.split('@')[0],
      // No persistir totp_secret en localStorage: el secret es de setup, no de sesión
      // (después del setup, solo el backend lo necesita; el frontend no)
      totp_habilitado: userData.totp_habilitado,
      es_simulacion: userData.es_simulacion ?? false,
    };
    setUser(userObj);
    setIsAuthenticated(true);
    localStorage.setItem('op_user', JSON.stringify(userObj));
    setLastActivity(Date.now());
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('op_user');
    } catch {
      // localStorage no disponible — seguir con logout igual
    }
  };

  // Inactivity Timer Logic
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActivity;
      
      const remaining = Math.max(0, INACTIVITY_LIMIT_MS - diff);
      setTimeLeft(remaining);

      if (diff > INACTIVITY_LIMIT_MS) {
        logout(); // Auto-expulsion
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, registerActivity, timeLeft }}>
      {children}
    </AuthContext.Provider>
  );
};
