import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Error boundary that catches JavaScript errors in a component sub-tree,
 * reports them via reportError(), and renders a Navy Industrial fallback UI.
 *
 * @param {string} [zoneId] - Optional zone identifier for isolated error tracking.
 * @param {React.ReactNode} children
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { zoneId } = this.props;
    const componentStack = errorInfo?.componentStack || '';

    // Dynamically import reportError to avoid circular deps at module load time.
    import('./reportError').then(({ reportError }) => {
      reportError(error, { componentStack, zoneId });
    });

    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-slate-950 border border-slate-800 rounded-sm gap-4">
          <div className="text-center">
            <p className="text-sm font-bold text-white mb-1">Zone error detected</p>
            <p className="text-xs text-slate-500">
              This panel encountered an error. The rest of the dashboard remains active.
            </p>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <pre className="w-full p-3 bg-slate-900 border border-slate-800 rounded-sm text-xs text-[#D00000] font-mono overflow-auto max-h-32">
              {this.state.error.toString()}
            </pre>
          )}

          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-[#D00000] text-white text-xs font-bold uppercase tracking-widest rounded-sm hover:bg-[#b00000] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
