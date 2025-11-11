'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { logError } from '@/lib/utils/errorLogger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Log error to centralized error logger
    logError(error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Update state with error info
    this.setState({
      errorInfo,
    })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary when resetKeys change
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      this.reset()
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          reset={this.reset}
        />
      )
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  reset: () => void
}

/**
 * Default error fallback UI
 * Shows a user-friendly error message with option to retry
 */
function DefaultErrorFallback({ error, errorInfo }: DefaultErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 p-4">
      <div className="w-full max-w-2xl rounded-2xl border-2 border-red-200 bg-white p-6 shadow-xl sm:p-8">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="mb-3 text-center text-2xl font-bold text-neutral-900 sm:text-3xl">
          Something went wrong
        </h1>

        {/* Error Message */}
        <p className="mb-6 text-center text-base text-neutral-600">
          We encountered an unexpected error. Don't worry, your progress has been saved.
        </p>

        {/* Action Button */}
        <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full rounded-lg border-2 border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 sm:w-auto"
            aria-label="Go to home page"
          >
            Go Home
          </button>
        </div>

        {/* Development Error Details */}
        {isDevelopment && error && (
          <details className="rounded-lg border border-neutral-300 bg-neutral-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-700 hover:text-neutral-900">
              Error Details (Development Only)
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                  Error Message:
                </h3>
                <pre className="mt-1 overflow-x-auto rounded bg-red-50 p-2 text-xs text-red-800">
                  {error.message}
                </pre>
              </div>

              {error.stack && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                    Stack Trace:
                  </h3>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-neutral-100 p-2 text-xs text-neutral-800">
                    {error.stack}
                  </pre>
                </div>
              )}

              {errorInfo?.componentStack && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                    Component Stack:
                  </h3>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-neutral-100 p-2 text-xs text-neutral-800">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          If this problem persists, please contact monica.yupa@gmail.com or try refreshing the page.
        </p>
      </div>
    </div>
  )
}

export default ErrorBoundary
