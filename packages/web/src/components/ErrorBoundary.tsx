import React from 'react';
import { logger } from '@/utils/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Optional: isolate errors to a specific section */
  isolate?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log with component stack trace
    logger.error('[ErrorBoundary] Uncaught error:', error, {
      componentStack: errorInfo.componentStack,
    });

    // Sentry integration point — uncomment when @sentry/react is installed:
    // import * as Sentry from '@sentry/react';
    // Sentry.withScope((scope) => {
    //   scope.setTag('errorBoundary', this.props.isolate ? 'isolated' : 'root');
    //   scope.setExtra('componentStack', errorInfo.componentStack);
    //   Sentry.captureException(error);
    // });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
          <div className="text-center max-w-md">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-2 text-sm">
              {this.state.error?.message || 'Unknown error'}
            </p>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Component Stack (Dev)
                </summary>
                <pre className="mt-2 text-xs text-gray-500 bg-gray-50 p-3 rounded overflow-auto max-h-48">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Functional wrapper for route-level isolation */
export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary isolate>
      {children}
    </ErrorBoundary>
  );
}
