import { render, screen, fireEvent, waitFor } from '@//lib/test-utils/test-utils'
import DashboardPage from '@//app/dashboard/page'
import { mockSupabaseClient, mockFetch } from '@//lib/test-utils/test-utils'

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

// Mock ProtectedRoute to just render children
jest.mock('@//components/ProtectedRoute', () => {
  return function ProtectedRoute({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }
})

describe('DashboardPage', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: '123', email: 'test@example.com' },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    })
  })

  it('renders dashboard with Learning Mode indicator', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Learning Mode')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Personalized AI-powered learning')).toBeInTheDocument()
  })

  it('renders topic input field', () => {
    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    expect(topicInput).toBeInTheDocument()
    expect(topicInput).toHaveAttribute('type', 'text')
    expect(topicInput).toBeRequired()
  })

  it('renders skill level selector with all levels', () => {
    render(<DashboardPage />)

    expect(screen.getByRole('button', { name: 'Beginner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Intermediate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Advanced' })).toBeInTheDocument()
  })

  it('allows skill level selection', () => {
    render(<DashboardPage />)

    const beginnerButton = screen.getByRole('button', { name: 'Beginner' })
    const intermediateButton = screen.getByRole('button', { name: 'Intermediate' })

    // Default is beginner (should have active classes)
    expect(beginnerButton).toHaveClass('border-primary-500')

    // Click intermediate
    fireEvent.click(intermediateButton)
    expect(intermediateButton).toHaveClass('border-primary-500')
  })

  it('handles successful module generation', async () => {
    const mockModuleResponse = {
      module_id: '456',
      topic: 'Python basics',
      skill_level: 'beginner',
    }

    mockFetch(mockModuleResponse, true)

    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })

    fireEvent.change(topicInput, { target: { value: 'Python basics' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/modules/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify({
            topic: 'Python basics',
            skill_level: 'beginner',
          }),
        })
      )
      expect(mockPush).toHaveBeenCalledWith('/module/456')
    })
  })

  it('sends JWT token in Authorization header', async () => {
    mockFetch({ module_id: '789' }, true)

    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })

    fireEvent.change(topicInput, { target: { value: 'Test topic' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })
  })

  it('displays error message on failed module generation', async () => {
    mockFetch({ detail: 'Failed to generate module' }, false)

    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })

    fireEvent.change(topicInput, { target: { value: 'Test topic' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to generate module/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during module generation', async () => {
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ module_id: '123' }),
              } as Response),
            100
          )
        )
    )

    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })

    fireEvent.change(topicInput, { target: { value: 'Test topic' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Generating Module...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  it('disables submit button when topic is empty', () => {
    render(<DashboardPage />)

    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })
    expect(submitButton).toBeDisabled()
  })

  it('handles sign out', async () => {
    mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null })

    render(<DashboardPage />)

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i })
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('handles unauthenticated state during module generation', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })

    fireEvent.change(topicInput, { target: { value: 'Test topic' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('allows topic submission with different inputs', async () => {
    mockFetch({ module_id: '123' }, true)

    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })

    // Test with various topics
    const topics = [
      'Python basics',
      'Machine Learning',
      'Web Development with React',
      'Data Structures and Algorithms',
    ]

    for (const topic of topics) {
      fireEvent.change(topicInput, { target: { value: topic } })
      expect(topicInput).toHaveValue(topic)
    }
  })

  it('submits with different skill levels', async () => {
    mockFetch({ module_id: '123' }, true)

    render(<DashboardPage />)

    const topicInput = screen.getByPlaceholderText(/e.g., Python basics/i)
    const advancedButton = screen.getByRole('button', { name: 'Advanced' })
    const submitButton = screen.getByRole('button', { name: /Generate Learning Module/i })

    fireEvent.change(topicInput, { target: { value: 'Advanced TypeScript' } })
    fireEvent.click(advancedButton)
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            topic: 'Advanced TypeScript',
            skill_level: 'advanced',
          }),
        })
      )
    })
  })
})
