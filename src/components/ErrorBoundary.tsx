import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку для мониторинга
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Здесь можно отправить ошибку в сервис мониторинга
    // например, Sentry, LogRocket и т.д.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dots flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-8 max-w-2xl w-full">
            <h1 className="text-4xl font-display text-black mb-4 uppercase">
              Oops! Something went wrong
            </h1>
            <p className="text-black/80 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-100 border-2 border-black">
                <summary className="cursor-pointer font-bold text-black mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs overflow-auto text-red-600">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="bg-black text-white px-6 py-3 font-bold uppercase border-2 border-black hover:bg-white hover:text-black transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#FFD700] text-black px-6 py-3 font-bold uppercase border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

