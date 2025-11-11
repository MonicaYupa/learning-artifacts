import { render, screen } from '@/lib/test-utils/test-utils'
import ProgressVisualization from '@/components/ProgressVisualization'

describe('ProgressVisualization', () => {
  const defaultProps = {
    exerciseCount: 3,
    completedCount: 3,
    aggregateScore: 85,
    hintsUsed: 4,
    totalTimeSeconds: 1200, // 20 minutes
  }

  describe('Rendering', () => {
    it('renders all completion metrics', () => {
      render(<ProgressVisualization {...defaultProps} />)

      expect(screen.getByText(/3\/3 exercises/i)).toBeInTheDocument()
      expect(screen.getByText(/85%/i)).toBeInTheDocument()
      expect(screen.getByText(/4 hints/i)).toBeInTheDocument()
      expect(screen.getByText(/20 minutes/i)).toBeInTheDocument()
    })

    it('displays exercise completion count', () => {
      render(<ProgressVisualization {...defaultProps} />)
      expect(screen.getByText('3/3 exercises completed')).toBeInTheDocument()
    })

    it('displays aggregate score as percentage', () => {
      render(<ProgressVisualization {...defaultProps} />)
      expect(screen.getByText('Score: 85%')).toBeInTheDocument()
    })

    it('displays hints used count', () => {
      render(<ProgressVisualization {...defaultProps} />)
      expect(screen.getByText('Hints used: 4')).toBeInTheDocument()
    })

    it('displays formatted total time', () => {
      render(<ProgressVisualization {...defaultProps} />)
      expect(screen.getByText('Time spent: 20 minutes')).toBeInTheDocument()
    })
  })

  describe('Score Visualization', () => {
    it('renders progress bar for score', () => {
      render(<ProgressVisualization {...defaultProps} />)
      const progressBar = screen.getByRole('progressbar', { name: /score/i })
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '85')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('applies correct width to progress bar', () => {
      render(<ProgressVisualization {...defaultProps} />)
      const progressBar = screen.getByRole('progressbar', { name: /score/i })
      const progressFill = progressBar.querySelector('[role="presentation"]')
      expect(progressFill).toHaveStyle({ width: '85%' })
    })

    it('shows different color for low scores', () => {
      render(<ProgressVisualization {...defaultProps} aggregateScore={45} />)
      const progressBar = screen.getByRole('progressbar', { name: /score/i })
      expect(progressBar.querySelector('.bg-yellow-500')).toBeInTheDocument()
    })

    it('shows green color for high scores', () => {
      render(<ProgressVisualization {...defaultProps} aggregateScore={90} />)
      const progressBar = screen.getByRole('progressbar', { name: /score/i })
      expect(progressBar.querySelector('.bg-green-500')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero values correctly', () => {
      render(
        <ProgressVisualization
          exerciseCount={3}
          completedCount={0}
          aggregateScore={0}
          hintsUsed={0}
          totalTimeSeconds={0}
        />
      )

      expect(screen.getByText('0/3 exercises completed')).toBeInTheDocument()
      expect(screen.getByText('Score: 0%')).toBeInTheDocument()
      expect(screen.getByText('Hints used: 0')).toBeInTheDocument()
      expect(screen.getByText('Time spent: 0 seconds')).toBeInTheDocument()
    })

    it('formats time correctly for hours', () => {
      render(<ProgressVisualization {...defaultProps} totalTimeSeconds={3665} />)
      expect(screen.getByText(/1 hour 1 minute/i)).toBeInTheDocument()
    })

    it('handles singular vs plural for hints', () => {
      render(<ProgressVisualization {...defaultProps} hintsUsed={1} />)
      expect(screen.getByText('Hints used: 1')).toBeInTheDocument()
    })

    it('handles 100% score', () => {
      render(<ProgressVisualization {...defaultProps} aggregateScore={100} />)
      expect(screen.getByText('Score: 100%')).toBeInTheDocument()
      const progressBar = screen.getByRole('progressbar', { name: /score/i })
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })
  })

  describe('Stat Cards', () => {
    it('renders stat card for each metric', () => {
      render(<ProgressVisualization {...defaultProps} />)

      // Should have 4 stat cards
      expect(screen.getByText(/exercises completed/i)).toBeInTheDocument()
      expect(screen.getByText(/score/i)).toBeInTheDocument()
      expect(screen.getByText(/hints used/i)).toBeInTheDocument()
      expect(screen.getByText(/time spent/i)).toBeInTheDocument()
    })

    it('renders icons for each stat', () => {
      const { container } = render(<ProgressVisualization {...defaultProps} />)
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThanOrEqual(4) // One for each stat
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive grid classes', () => {
      const { container } = render(<ProgressVisualization {...defaultProps} />)
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4')
    })
  })

  describe('Accessibility', () => {
    it('has appropriate heading for section', () => {
      render(<ProgressVisualization {...defaultProps} />)
      expect(screen.getByRole('heading', { name: /progress summary/i })).toBeInTheDocument()
    })

    it('uses semantic HTML for stats', () => {
      const { container } = render(<ProgressVisualization {...defaultProps} />)
      const statCards = container.querySelectorAll('[role="region"]')
      expect(statCards.length).toBeGreaterThan(0)
    })

    it('progress bar has accessible name', () => {
      render(<ProgressVisualization {...defaultProps} />)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAccessibleName()
    })
  })
})
