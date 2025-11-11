import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import * as errorLogger from '@/lib/utils/errorLogger'

// Mock the error logger
jest.mock('@/lib/utils/errorLogger', () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
}))

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Suppress console.error for cleaner test output
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ErrorBoundary', () => {
  describe('Normal Operation', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('does not render fallback UI when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('renders default fallback UI when an error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/i)).toBeInTheDocument()
    })

    it('logs error when an error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          errorInfo: expect.any(Object),
          componentStack: expect.any(String),
        })
      )
    })

    it('calls onError callback when provided', () => {
      const onError = jest.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })
  })

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Recovery', () => {
    it('shows Try Again button in default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('shows Go Home button in default fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Go to home page' })).toBeInTheDocument()
    })

    it('resets error state when Try Again is clicked', () => {
      let shouldThrow = true
      const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      )

      // Error state should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Fix the component
      shouldThrow = false

      // Click Try Again - this will reset the error boundary
      const tryAgainButton = screen.getByRole('button', { name: 'Try again' })
      fireEvent.click(tryAgainButton)

      // Should show content now (error boundary resets and re-renders children)
      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('Reset Keys', () => {
    it('resets error when resetKeys change', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['key1']}>
          <ThrowError />
        </ErrorBoundary>
      )

      // Error state should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Change reset key and provide working component
      rerender(
        <ErrorBoundary resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      // Should reset and show content
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('does not auto-reset when resetKeys stay the same', () => {
      // This test verifies that error boundaries don't automatically retry
      // rendering when just props change, unless resetKeys change

      const PropsChangingComponent = () => {
        return <ThrowError />
      }

      const { rerender } = render(
        <ErrorBoundary resetKeys={['key1']}>
          <PropsChangingComponent />
        </ErrorBoundary>
      )

      // Error state should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Rerender with same resetKeys
      rerender(
        <ErrorBoundary resetKeys={['key1']}>
          <PropsChangingComponent />
        </ErrorBoundary>
      )

      // Should still show error - error boundary doesn't retry automatically
      // This prevents infinite error loops if the component keeps failing
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('Development Mode', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      })
    })

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      })
    })

    it('shows error details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Error details should be in a <details> element
      const details = screen.getByText(/Error Details/i).closest('details')
      expect(details).toBeInTheDocument()
    })

    it('shows error message in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Error message is inside the details element
      const details = screen.getByText(/Error Details/i).closest('details')
      expect(details).toBeInTheDocument()
      expect(details?.textContent).toContain('Test error')
    })
  })

  describe('Production Mode', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      })
    })

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      })
    })

    it('does not show error details in production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Error details should not be visible
      expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Test error/i)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels on action buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to home page' })).toBeInTheDocument()
    })

    it('has descriptive error icon with aria-hidden', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const errorIcon = screen
        .getByText('Something went wrong')
        .closest('div')
        ?.querySelector('svg')

      expect(errorIcon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Multiple Error Boundaries', () => {
    it('isolates errors to the nearest boundary', () => {
      const OuterContent = () => <div>Outer content</div>
      const InnerContent = () => <ThrowError />

      render(
        <ErrorBoundary>
          <OuterContent />
          <ErrorBoundary fallback={<div>Inner error caught</div>}>
            <InnerContent />
          </ErrorBoundary>
        </ErrorBoundary>
      )

      // Inner error boundary should catch the error
      expect(screen.getByText('Inner error caught')).toBeInTheDocument()
      // Outer content should still be visible
      expect(screen.getByText('Outer content')).toBeInTheDocument()
      // Outer error boundary fallback should not be shown
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })
})
