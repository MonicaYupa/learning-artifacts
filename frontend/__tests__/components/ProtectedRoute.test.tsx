import { render, screen, waitFor } from '@//lib/test-utils/test-utils'
import ProtectedRoute from '@//components/ProtectedRoute'
import { mockSupabaseClient } from '@//lib/test-utils/test-utils'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// Mock the Supabase client
jest.mock('@//lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock Next.js navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('ProtectedRoute', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    aud: 'authenticated',
    created_at: '2024-01-01',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockSupabaseClient.auth.getSession.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders children when user is authenticated', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'test-token',
          user: mockUser,
        },
      },
      error: null,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('redirects to login when user is not authenticated', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  it('handles session persistence on page refresh', async () => {
    // Simulate initial session
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'test-token',
          user: mockUser,
        },
      },
      error: null,
    })

    const { rerender } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    // Simulate page refresh - session should still be valid
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'test-token',
          user: mockUser,
        },
      },
      error: null,
    })

    rerender(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('subscribes to auth state changes', async () => {
    const mockUnsubscribe = jest.fn()
    const mockOnAuthStateChange = jest.fn(() => ({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    }))

    mockSupabaseClient.auth.onAuthStateChange = mockOnAuthStateChange
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'test-token',
          user: mockUser,
        },
      },
      error: null,
    })

    const { unmount } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })

    // Unmount and verify cleanup
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('redirects to login when session expires', async () => {
    const mockOnAuthStateChange = jest.fn(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        // Immediately trigger the callback with null session
        callback('SIGNED_OUT', null)
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      }
    )

    mockSupabaseClient.auth.onAuthStateChange = mockOnAuthStateChange as any
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'test-token',
          user: mockUser,
        },
      },
      error: null,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('handles auth state change to authenticated', async () => {
    const mockOnAuthStateChange = jest.fn(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        // Trigger callback with authenticated session
        callback('SIGNED_IN', {
          access_token: 'new-token',
          user: mockUser,
        } as Session)
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      }
    )

    mockSupabaseClient.auth.onAuthStateChange = mockOnAuthStateChange as any
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'test-token',
          user: mockUser,
        },
      },
      error: null,
    })

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('does not render content while loading', async () => {
    let resolveSession: any
    mockSupabaseClient.auth.getSession.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSession = resolve
      })
    )

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    // Content should not be visible while loading
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Resolve with authenticated session
    resolveSession({
      data: {
        session: {
          access_token: 'test-token',
          user: mockUser,
        },
      },
      error: null,
    })

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })
})
