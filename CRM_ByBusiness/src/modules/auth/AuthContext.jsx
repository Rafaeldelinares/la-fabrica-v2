import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 60 Minutes

export const AuthProvider = ({ children }) => {
  // INSTANT AUTH: Initialize state directly from localStorage (Lazy Init)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('op_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('op_user');
  });
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(INACTIVITY_LIMIT_MS);

  // We no longer need the useEffect just for loading session
  // useEffect(() => { ... }, []); removed

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
      totp_secret: userData.totp_secret,
      totp_habilitado: userData.totp_habilitado,
    };
    setUser(userObj);
    setIsAuthenticated(true);
    localStorage.setItem('op_user', JSON.stringify(userObj));
    setLastActivity(Date.now());
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('op_user');
    window.location.reload(); // Hard refresh to clear memory
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, registerActivity, timeLeft }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
