/**
 * Error Logger Utility
 *
 * Centralized error logging for the application.
 * In production, this should integrate with services like Sentry, LogRocket, or Datadog.
 */

export interface ErrorContext {
  userId?: string
  sessionId?: string
  moduleId?: string | number
  exerciseId?: string
  errorInfo?: any
  componentStack?: string | null
  timestamp?: string
  userAgent?: string
  url?: string
  [key: string]: any
}

export interface LoggedError {
  message: string
  stack?: string
  context: ErrorContext
  timestamp: string
  level: 'error' | 'warning' | 'info'
}

/**
 * Log an error with context
 *
 * @param error - The error object
 * @param context - Additional context about the error
 */
export function logError(error: Error, context: ErrorContext = {}): void {
  const timestamp = new Date().toISOString()

  const loggedError: LoggedError = {
    message: error.message,
    stack: error.stack,
    context: {
      ...context,
      timestamp,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    },
    timestamp,
    level: 'error',
  }

  // Console logging for development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Logged')
    console.error('Error:', error)
    console.log('Context:', loggedError.context)
    console.groupEnd()
  }

  // Store errors in sessionStorage for debugging (last 10 errors)
  try {
    if (typeof window !== 'undefined') {
      const errorLog = getErrorLog()
      errorLog.push(loggedError)

      // Keep only last 10 errors
      if (errorLog.length > 10) {
        errorLog.shift()
      }

      sessionStorage.setItem('errorLog', JSON.stringify(errorLog))
    }
  } catch (storageError) {
    // Fail silently if storage is full or unavailable
    console.warn('Failed to store error in sessionStorage:', storageError)
  }

  // Send to external error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    sendToErrorTrackingService(loggedError)
  }
}

/**
 * Log a warning (non-critical error)
 *
 * @param message - Warning message
 * @param context - Additional context
 */
export function logWarning(message: string, context: ErrorContext = {}): void {
  const timestamp = new Date().toISOString()

  const loggedWarning: LoggedError = {
    message,
    context: {
      ...context,
      timestamp,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    },
    timestamp,
    level: 'warning',
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Warning:', message, context)
  }

  // Send warnings to tracking service if configured
  if (process.env.NEXT_PUBLIC_TRACK_WARNINGS === 'true') {
    sendToErrorTrackingService(loggedWarning)
  }
}

/**
 * Get error log from sessionStorage
 */
export function getErrorLog(): LoggedError[] {
  try {
    if (typeof window !== 'undefined') {
      const log = sessionStorage.getItem('errorLog')
      return log ? JSON.parse(log) : []
    }
  } catch (error) {
    console.warn('Failed to retrieve error log:', error)
  }
  return []
}

/**
 * Clear error log from sessionStorage
 */
export function clearErrorLog(): void {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('errorLog')
    }
  } catch (error) {
    console.warn('Failed to clear error log:', error)
  }
}

/**
 * Send error to external error tracking service
 *
 * Replace this with your actual error tracking service integration:
 * - Sentry: Sentry.captureException(error)
 * - LogRocket: LogRocket.captureException(error)
 * - Datadog: datadogRum.addError(error)
 * - Custom API endpoint
 */
function sendToErrorTrackingService(loggedError: LoggedError): void {
  // TODO: Integrate with your error tracking service
  // Example for Sentry:
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(new Error(loggedError.message), {
  //     extra: loggedError.context,
  //     level: loggedError.level,
  //   })
  // }

  // Example for custom API endpoint:
  // fetch('/api/log-error', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(loggedError),
  // }).catch(console.error)

  // For now, just log to console in production
  if (process.env.NODE_ENV === 'production') {
    console.error('Production error:', {
      message: loggedError.message,
      timestamp: loggedError.timestamp,
      url: loggedError.context.url,
    })
  }
}

/**
 * Create a boundary-specific error logger
 * Useful for adding consistent context to errors from specific boundaries
 */
export function createBoundaryLogger(boundaryName: string) {
  return {
    logError: (error: Error, context: ErrorContext = {}) => {
      logError(error, {
        ...context,
        boundary: boundaryName,
      })
    },
    logWarning: (message: string, context: ErrorContext = {}) => {
      logWarning(message, {
        ...context,
        boundary: boundaryName,
      })
    },
  }
}
