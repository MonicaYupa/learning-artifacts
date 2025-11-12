import { render, screen, fireEvent, waitFor } from '@//lib/test-utils/test-utils'
import SignupPage from '@//app/auth/signup/page'
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

describe('SignupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders signup form', () => {
    render(<SignupPage />)

    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Minimum 6 characters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Re-enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('handles successful signup with auto sign-in', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: '123', email: 'test@example.com' },
    }

    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    })

    render(<SignupPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Minimum 6 characters')
    const confirmPasswordInput = screen.getByPlaceholderText('Re-enter your password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'password123' },
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      })
      expect(mockPush).toHaveBeenCalledWith('/module')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows success message when email confirmation required', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: { session: null, user: { id: '123', email: 'test@example.com' } },
      error: null,
    })

    render(<SignupPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Minimum 6 characters')
    const confirmPasswordInput = screen.getByPlaceholderText('Re-enter your password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'password123' },
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Account created successfully/i)).toBeInTheDocument()
      expect(screen.getByText(/Please check your email/i)).toBeInTheDocument()
    })
  })

  it('validates password match', async () => {
    render(<SignupPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Minimum 6 characters')
    const confirmPasswordInput = screen.getByPlaceholderText('Re-enter your password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'different123' },
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    render(<SignupPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Minimum 6 characters')
    const confirmPasswordInput = screen.getByPlaceholderText('Re-enter your password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: '12345' } })
    fireEvent.change(confirmPasswordInput, { target: { value: '12345' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
  })

  it('displays error message on failed signup', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'User already exists' },
    })

    render(<SignupPage />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Minimum 6 characters')
    const confirmPasswordInput = screen.getByPlaceholderText('Re-enter your password')
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'password123' },
    })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('User already exists')).toBeInTheDocument()
    })
  })
})
