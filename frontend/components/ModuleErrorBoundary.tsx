'use client'

import { useRouter } from 'next/navigation'
import ErrorBoundary from './ErrorBoundary'
import { createBoundaryLogger } from '@/lib/utils/errorLogger'

const logger = createBoundaryLogger('ModuleErrorBoundary')

interface ModuleErrorFallbackProps {
  error?: Error
  reset: () => void
}

/**
 * Custom error fallback for module pages
 * Provides module-specific error handling and recovery options
 */
function ModuleErrorFallback({ error, reset }: ModuleErrorFallbackProps) {
  const router = useRouter()

  const handleReturnToModules = () => {
    router.push('/module')
  }

  const handleReturnHome = () => {
    router.push('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark p-4">
      <div className="w-full max-w-2xl rounded-2xl border-2 border-red-500/30 bg-neutral-850 p-6 shadow-2xl sm:p-8">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-500/20 p-3">
            <svg
              className="h-10 w-10 text-red-400"
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
        <h1 className="mb-3 text-center text-2xl font-bold text-neutral-100 sm:text-3xl">
          Module Loading Error
        </h1>

        {/* Error Message */}
        <p className="mb-6 text-center text-base text-neutral-300">
          We encountered an error while loading this module. Your progress has been saved and you
          can try again or return to your modules.
        </p>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="w-full rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 sm:w-auto"
            aria-label="Try loading module again"
          >
            Try Again
          </button>

          <button
            onClick={handleReturnToModules}
            className="w-full rounded-lg border-2 border-neutral-600 bg-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 transition-all hover:border-neutral-500 hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-800 sm:w-auto"
            aria-label="Return to modules list"
          >
            Back to Modules
          </button>

          <button
            onClick={handleReturnHome}
            className="w-full rounded-lg border-2 border-neutral-700 bg-transparent px-6 py-3 text-sm font-semibold text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-800 sm:w-auto"
            aria-label="Go to home page"
          >
            Go Home
          </button>
        </div>

        {/* Development Error Details */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-300 hover:text-neutral-100">
              Error Details (Development Only)
            </summary>
            <div className="mt-3">
              <pre className="overflow-x-auto rounded bg-red-900/20 p-3 text-xs text-red-300">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          </details>
        )}

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-neutral-400">
          If this problem persists, please refresh the page or contact support.
        </p>
      </div>
    </div>
  )
}

interface ModuleErrorBoundaryProps {
  children: React.ReactNode
  moduleId?: string
}

/**
 * ErrorBoundary specifically for module pages
 * Provides module-specific error handling and context
 */
export default function ModuleErrorBoundary({ children, moduleId }: ModuleErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={<ModuleErrorFallback error={undefined} reset={() => window.location.reload()} />}
      onError={(error, errorInfo) => {
        logger.logError(error, {
          moduleId,
          componentStack: errorInfo.componentStack,
        })
      }}
      resetKeys={[moduleId]}
    >
      {children}
    </ErrorBoundary>
  )
}
