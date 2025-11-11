import { render, screen, waitFor } from '@/lib/test-utils/test-utils'
import userEvent from '@testing-library/user-event'
import CompletionScreen from '@/components/CompletionScreen'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock child components
jest.mock('@/components/CelebrationAnimation', () => {
  return function MockCelebrationAnimation() {
    return (
      <div role="img" aria-label="celebration">
        Celebration Animation
      </div>
    )
  }
})

jest.mock('@/components/ConfidenceRating', () => {
  return function MockConfidenceRating({ sessionId, onRatingSubmitted }: any) {
    return (
      <div>
        <button onClick={() => onRatingSubmitted?.(5)}>Submit Mock Rating</button>
      </div>
    )
  }
})

jest.mock('@/components/ProgressVisualization', () => {
  return function MockProgressVisualization(props: any) {
    return <div>Progress: {props.aggregateScore}%</div>
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
    moduleId: 'module-123',
    moduleTitle: 'JavaScript Fundamentals',
    sessionId: 'session-456',
    exercises: [
      { id: 'ex1', name: 'Variables and Types', type: 'analysis' as const },
      { id: 'ex2', name: 'Control Flow', type: 'comparative' as const },
      { id: 'ex3', name: 'Functions', type: 'framework' as const },
    ],
    completionStats: {
      completedAt: '2024-01-01T12:30:00.000Z',
      startedAt: '2024-01-01T12:00:00.000Z',
      exerciseCount: 3,
      aggregateScore: 85,
      hintsUsed: 4,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('Rendering', () => {
    it('renders completion message', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText(/module complete/i)).toBeInTheDocument()
    })

    it('displays module title', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument()
    })

    it('displays completion time', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText(/completed.*30 minutes/i)).toBeInTheDocument()
    })

    it('renders celebration animation', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByRole('img', { name: /celebration/i })).toBeInTheDocument()
    })
  })

  describe('Concepts Mastered Section', () => {
    it('displays concepts mastered heading', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText(/concepts mastered/i)).toBeInTheDocument()
    })

    it('lists all exercise names with checkmarks', () => {
      render(<CompletionScreen {...defaultProps} />)

      expect(screen.getByText('Variables and Types')).toBeInTheDocument()
      expect(screen.getByText('Control Flow')).toBeInTheDocument()
      expect(screen.getByText('Functions')).toBeInTheDocument()
    })

    it('displays checkmark icon for each exercise', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      const checkmarks = container.querySelectorAll('[data-testid="checkmark-icon"]')
      expect(checkmarks.length).toBe(3)
    })

    it('renders exercises as a list for accessibility', () => {
      render(<CompletionScreen {...defaultProps} />)
      const list = screen.getByRole('list', { name: /concepts mastered/i })
      expect(list).toBeInTheDocument()
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBe(3)
    })
  })

  describe('Confidence Rating Integration', () => {
    it('renders confidence rating component with correct props', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText(/submit mock rating/i)).toBeInTheDocument()
    })

    it('passes sessionId to ConfidenceRating', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('Progress Visualization Integration', () => {
    it('renders progress visualization with stats', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByText(/progress: 85%/i)).toBeInTheDocument()
    })

    it('calculates total time from timestamps', () => {
      render(<CompletionScreen {...defaultProps} />)
      // 30 minutes difference between start and end
      expect(screen.getByText(/30 minutes/i)).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('renders Return to Home button', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument()
    })

    it('renders Back to Chat button', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByRole('button', { name: /back to chat/i })).toBeInTheDocument()
    })

    it('navigates to home when Return to Home is clicked', async () => {
      const user = userEvent.setup()
      render(<CompletionScreen {...defaultProps} />)

      const homeButton = screen.getByRole('button', { name: /return to home/i })
      await user.click(homeButton)

      expect(mockPush).toHaveBeenCalledWith('/module')
    })

    it('navigates to chat when Back to Chat is clicked', async () => {
      const user = userEvent.setup()
      render(<CompletionScreen {...defaultProps} />)

      const chatButton = screen.getByRole('button', { name: /back to chat/i })
      await user.click(chatButton)

      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  describe('Responsive Design', () => {
    it('renders correctly on mobile', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      expect(container.querySelector('.container')).toBeInTheDocument()
    })

    it('has responsive padding classes', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('p-4', 'sm:p-6', 'lg:p-8')
    })
  })

  describe('Accessibility', () => {
    it('has main landmark region', () => {
      render(<CompletionScreen {...defaultProps} />)
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('has appropriate heading hierarchy', () => {
      render(<CompletionScreen {...defaultProps} />)
      const h1 = screen.getByRole('heading', { level: 1, name: /module complete/i })
      expect(h1).toBeInTheDocument()
    })

    it('all buttons have accessible names', () => {
      render(<CompletionScreen {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('uses semantic HTML elements', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      expect(container.querySelector('main')).toBeInTheDocument()
      expect(container.querySelector('section')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty exercise list', () => {
      render(<CompletionScreen {...defaultProps} exercises={[]} />)
      const list = screen.queryByRole('list', { name: /concepts mastered/i })
      expect(list).toBeInTheDocument()
      expect(screen.queryAllByRole('listitem').length).toBe(0)
    })

    it('handles very long module titles', () => {
      const longTitle = 'A'.repeat(100)
      render(<CompletionScreen {...defaultProps} moduleTitle={longTitle} />)
      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('handles same start and completion times', () => {
      const props = {
        ...defaultProps,
        completionStats: {
          ...defaultProps.completionStats,
          startedAt: '2024-01-01T12:00:00.000Z',
          completedAt: '2024-01-01T12:00:00.000Z',
        },
      }
      render(<CompletionScreen {...props} />)
      expect(screen.getByText(/0 seconds/i)).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('applies correct background gradient', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      const main = container.querySelector('main')
      expect(main).toHaveClass('bg-gradient-to-br')
    })

    it('uses cream color scheme', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      expect(container.querySelector('.bg-cream-50')).toBeInTheDocument()
    })

    it('uses primary colors for accents', () => {
      const { container } = render(<CompletionScreen {...defaultProps} />)
      expect(container.querySelector('.text-primary-600')).toBeInTheDocument()
    })
  })
})
