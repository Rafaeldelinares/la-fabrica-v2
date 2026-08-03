import { Component } from 'react';
import PropTypes from 'prop-types';
import { reportFrontendError } from '../reporting/reportFrontendError';

/**
 * ErrorBoundary — catches React rendering errors in a component sub-tree,
 * reports them to the n8n CRM_FRONTEND_ERROR_REPORT webhook, and renders
 * a Navy Industrial fallback UI.
 *
 * Must be a class component — React requires this exact API for error boundaries.
 *
 * @param {React.ReactNode} children
 * @param {React.ReactElement} [fallback] - Custom fallback element to render on error.
 * @param {string} [zoneId] - Optional zone identifier for segmented error tracking.
 */
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  /** @returns {{ hasError: boolean, error: Error|null }} */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportFrontendError({
      tipo: 'frontend_error',
      componente: 'ErrorBoundary',
      mensaje: error?.message ?? String(error),
      stack: error?.stack ?? null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      metadata: {
        componentStack: errorInfo?.componentStack ?? null,
        build: import.meta.env.VITE_APP_VERSION ?? 'unknown',
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

/**
 * @param {{ error: Error|null }} props
 */
function DefaultErrorFallback({ error }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200 p-6">
      <div className="max-w-md rounded-sm border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-[#D00000]">Algo salio mal</h2>
        <p className="mt-2 text-sm text-slate-400">
          El equipo fue notificado. Recarga la pagina o vuelve al inicio.
        </p>
        {import.meta.env.DEV && error && (
          <pre className="mt-4 w-full p-3 bg-slate-950 border border-slate-800 rounded-sm text-xs text-[#D00000] font-mono overflow-auto max-h-32">
            {error.toString()}
          </pre>
        )}
      </div>
    </div>
  );
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.element,
  zoneId: PropTypes.string,
};

export default ErrorBoundary;
