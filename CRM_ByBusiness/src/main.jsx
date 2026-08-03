import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { reportFrontendError } from './shared/reporting/reportFrontendError'

window.addEventListener('error', (event) => {
  reportFrontendError({
    tipo: 'frontend_error',
    componente: 'window.error',
    mensaje: event.message,
    stack: event.error?.stack ?? null,
    url: window.location.href,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  reportFrontendError({
    tipo: 'frontend_error',
    componente: 'unhandledrejection',
    mensaje: reason?.message ?? String(reason),
    stack: reason?.stack ?? null,
    url: window.location.href,
  });
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
