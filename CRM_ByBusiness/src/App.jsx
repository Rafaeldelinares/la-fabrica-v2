/**
 * Raíz de la aplicación CRM ByBusiness.
 *
 * Provee:
 *  - QueryClientProvider  → React Query
 *  - AuthProvider         → sesión de usuario
 *  - ToastProvider        → notificaciones globales
 *  - N8nStatusBanner      → banner persistente si n8n no responde
 */
import React, { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { ToastProvider } from './shared/context/ToastContext';
import { n8nHealthCheck } from './shared/hooks/useN8n';
import Dashboard from './Dashboard';
import Login from './modules/auth/Login';

const queryClient = new QueryClient();

/** Intervalo entre comprobaciones de estado de n8n (2 minutos). */
const HEARTBEAT_MS = 2 * 60 * 1_000;

/**
 * Banner que aparece en la parte superior cuando n8n no está disponible.
 * Se comprueba al montar y cada HEARTBEAT_MS.
 */
function N8nStatusBanner() {
  const [down, setDown]  = useState(false);
  const intervalRef      = useRef(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const ok = await n8nHealthCheck();
      if (mounted) setDown(!ok);
    };

    check();
    intervalRef.current = setInterval(check, HEARTBEAT_MS);

    return () => {
      mounted = false;
      clearInterval(intervalRef.current);
    };
  }, []);

  if (!down) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 bg-red-700/95 text-white text-center text-xs py-2 font-mono tracking-widest uppercase"
    >
      ⚠ Sistema n8n no disponible — Los datos pueden no actualizarse correctamente
    </div>
  );
}

/** Renderiza Dashboard o Login según autenticación. */
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Dashboard /> : <Login />;
};

/**
 * Componente raíz. Monta todos los providers y el heartbeat de n8n.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <N8nStatusBanner />
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
