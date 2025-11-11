import { render, screen, fireEvent, waitFor } from '@//lib/test-utils/test-utils'
import LoginPage from '@//app/auth/login/page'
import { mockSupabaseClient } from '@//lib/test-utils/test-utils'

// Mock the Supabase client
jest.mock('@//lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock Next.js navigation
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders login form', () => {
    render(<LoginPage />)

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('handles successful login', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: '123', email: 'test@example.com' },
    }

    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    })

    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockPush).toHaveBeenCalledWith('/module')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('displays error message on failed login', async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid credentials' },
    })

    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    mockSupabaseClient.auth.signInWithPassword.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  it('validates required fields', () => {
    render(<LoginPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')

    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })
})
