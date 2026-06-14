import React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

/**
 * Error Boundary para OperatorDashboard
 * Captura errores de JavaScript en el árbol de componentes hijo
 * y muestra una UI de fallback en lugar de romper la aplicación
 */
class OperatorErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente render muestre la UI de fallback
    return { 
      hasError: true, 
      error,
      retryCount: 0
    }
  }

  componentDidCatch(error, errorInfo) {
    // Puedes registrar el error en un servicio de reporting
    console.error('OperatorDashboard Error Boundary capturó un error:', error)
    console.error('Error Info:', errorInfo)
    
    this.setState({
      errorInfo: errorInfo?.componentStack || null
    })
    
    // Opcional: enviar a servicio de monitoreo
    // this.logErrorToService(error, errorInfo)
  }

  handleRetry = () => {
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
      hasError: false,
      error: null,
      errorInfo: null
    }))
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleReload = () => {
    window.location.reload()
  }

  // Opcional: método para enviar errores a un servicio
  // logErrorToService = (error, errorInfo) => {
  //   // Implementar envío a Sentry, LogRocket, etc.
  // }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[600px] p-8 bg-slate-950 border border-[#D00000]/30 rounded-sm">
          <div className="text-center max-w-md">
            {/* Icono de error */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#D00000]/20 rounded-full border border-[#D00000]/30">
                <AlertCircle className="w-8 h-8 text-[#D00000]" />
              </div>
            </div>

            {/* Título */}
            <h2 className="text-xl font-bold text-white mb-2">
              Error en el Dashboard de Operador
            </h2>
            
            {/* Mensaje de error */}
            <p className="text-slate-400 mb-4">
              Algo salió mal al cargar el dashboard. Nuestro equipo ha sido notificado.
            </p>

            {/* Detalles del error (solo en desarrollo) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-sm text-left">
                <p className="text-sm font-mono text-[#D00000] mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-slate-500 overflow-auto max-h-32">
                    {this.state.errorInfo}
                  </pre>
                )}
              </div>
            )}

            {/* Contador de reintentos */}
            {this.state.retryCount > 0 && (
              <p className="text-sm text-slate-500 mb-4">
                Reintento {this.state.retryCount} de 3
              </p>
            )}

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#D00000] text-white rounded-sm hover:bg-[#b00000] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <RefreshCw className="w-4 h-4" />
                {this.state.retryCount >= 3 ? 'Máximo de reintentos' : 'Reintentar'}
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-sm hover:bg-slate-700 transition"
              >
                <Home className="w-4 h-4" />
                Ir al Inicio
              </button>

              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-sm hover:bg-slate-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Página
              </button>
            </div>

            {/* Información adicional */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                Si el problema persiste, contacta al soporte técnico.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Error ID: {Date.now().toString(36)}-{Math.random().toString(36).substr(2, 9)}
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Si no hay error, renderiza los children normalmente
    return this.props.children
  }
}

export default OperatorErrorBoundary