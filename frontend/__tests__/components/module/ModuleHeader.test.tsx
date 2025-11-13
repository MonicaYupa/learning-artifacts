import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModuleHeader from '@/components/module/ModuleHeader'
import { STORAGE_KEY_SCROLL_TO_BOTTOM } from '@/lib/constants/module'

describe('ModuleHeader', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('renders topic and skill level', () => {
    render(
      <ModuleHeader topic="Machine Learning" skillLevel="intermediate" onBackClick={jest.fn()} />
    )

    expect(screen.getByText(/intermediate/i)).toBeInTheDocument()
    expect(screen.getByText(/machine learning/i)).toBeInTheDocument()
  })

  it('renders domain badge when provided', () => {
    render(
      <ModuleHeader
        topic="Data Science"
        skillLevel="advanced"
        domain="Computer Science"
        onBackClick={jest.fn()}
      />
    )

    expect(screen.getByText(/data science/i)).toBeInTheDocument()
  })

  it('calls onBackClick when back button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnBackClick = jest.fn()

    render(<ModuleHeader topic="Test Topic" skillLevel="beginner" onBackClick={mockOnBackClick} />)

    const backButton = screen.getByRole('button', { name: /back to chat/i })
    await user.click(backButton)

    expect(mockOnBackClick).toHaveBeenCalledTimes(1)
  })

  it('sets scroll to bottom flag in sessionStorage when back is clicked', async () => {
    const user = userEvent.setup()
    const mockOnBackClick = jest.fn()

    render(<ModuleHeader topic="Test Topic" skillLevel="beginner" onBackClick={mockOnBackClick} />)

    const backButton = screen.getByRole('button', { name: /back to chat/i })
    await user.click(backButton)

    expect(sessionStorage.getItem(STORAGE_KEY_SCROLL_TO_BOTTOM)).toBe('true')
  })

  it('capitalizes skill level correctly', () => {
    render(<ModuleHeader topic="Test Topic" skillLevel="advanced" onBackClick={jest.fn()} />)

    expect(screen.getByText(/Module Level: Advanced/i)).toBeInTheDocument()
  })

  it('replaces underscores with spaces in topic', () => {
    render(<ModuleHeader topic="machine_learning" skillLevel="beginner" onBackClick={jest.fn()} />)

    expect(screen.getByText('machine learning')).toBeInTheDocument()
  })
})
