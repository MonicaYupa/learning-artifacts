import { render, screen } from '@/lib/test-utils/test-utils'
import userEvent from '@testing-library/user-event'
import CompletionScreen from '@/components/CompletionScreen'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock child components
jest.mock('@/components/ConfidenceRating', () => {
  return function MockConfidenceRating() {
    return (
      <div>
        <button>Submit Mock Rating</button>
      </div>
    )
  }
})

describe('CompletionScreen', () => {
  const mockPush = jest.fn()
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }

  const defaultProps = {
    moduleTopic: 'JavaScript Fundamentals',
    moduleDomain: 'Programming',
    sessionId: 'session-456',
    isOpen: true,
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('Rendering', () => {
    it('renders completion message', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText(/practice complete/i)).toBeInTheDocument()
    })

    it('displays module topic', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<CompletionScreen {...defaultProps} isOpen={false} />)
      expect(screen.queryByText(/practice complete/i)).not.toBeInTheDocument()
    })
  })

  describe('Topic Badge', () => {
    it('displays topic badge with correct styling', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
    })

    it('displays domain when topic is not provided', () => {
      render(<CompletionScreen {...defaultProps} moduleTopic={undefined} />)
      expect(screen.getByText('Programming')).toBeInTheDocument()
    })

    it('does not display badge when neither topic nor domain provided', () => {
      render(
        <CompletionScreen {...defaultProps} moduleTopic={undefined} moduleDomain={undefined} />
      )
      expect(screen.queryByText('JavaScript Fundamentals')).not.toBeInTheDocument()
      expect(screen.queryByText('Programming')).not.toBeInTheDocument()
    })
  })

  describe('Confidence Rating Integration', () => {
    it('renders confidence rating component', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText(/submit mock rating/i)).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('renders Continue button', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })

    it('navigates to home when Continue is clicked', async () => {
      const user = userEvent.setup()
      render(<CompletionScreen {...defaultProps} />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('calls onClose when Continue is clicked', async () => {
      const mockOnClose = jest.fn()
      const user = userEvent.setup()
      render(<CompletionScreen {...defaultProps} onClose={mockOnClose} />)

      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Modal Behavior', () => {
    it('renders as a modal with backdrop', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      expect(container.querySelector('[role="dialog"]')).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', async () => {
      const mockOnClose = jest.fn()
      const user = userEvent.setup()
      const { container } = render(<CompletionScreen {...defaultProps} onClose={mockOnClose} />)

      const backdrop = container.querySelector('[aria-hidden="true"]')
      if (backdrop) {
        await user.click(backdrop)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })
  })

  describe('Accessibility', () => {
    it('has dialog role with aria-modal', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('has appropriate heading hierarchy', () => {
      render(<CompletionScreen {...defaultProps} />)
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent(/practice complete/i)
    })

    it('all buttons have accessible names', () => {
      render(<CompletionScreen {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles very long topic names', () => {
      const longTopic = 'A'.repeat(100)
      render(<CompletionScreen {...defaultProps} moduleTopic={longTopic} />)
      expect(screen.getByText(longTopic)).toBeInTheDocument()
    })

    it('handles topic names with underscores', () => {
      render(<CompletionScreen {...defaultProps} moduleTopic="python_programming" />)
      expect(screen.getByText('Python Programming')).toBeInTheDocument()
    })
  })
})
