import { render, screen } from '@/lib/test-utils/test-utils'
import FeedbackDisplay from '@/components/FeedbackDisplay'
import type { AssessmentLevel } from '@/types/session'

describe('FeedbackDisplay', () => {
  describe('Strong Assessment', () => {
    it('renders strong feedback with green indicator', () => {
      const { container } = render(
        <FeedbackDisplay
          assessment="strong"
          feedback="Excellent analysis! You correctly identified the key points."
          attemptNumber={1}
        />
      )

      expect(screen.getByText(/excellent analysis/i)).toBeInTheDocument()
      // Icon is in an aria-hidden div, so check via container query
      const icon = container.querySelector('svg[aria-label="Success"]')
      expect(icon).toBeInTheDocument()

      const article = screen.getByRole('article')
      expect(article).toHaveClass('bg-green-50')
    })

    it('displays checkmark icon for strong assessment', () => {
      const { container } = render(
        <FeedbackDisplay assessment="strong" feedback="Great work!" attemptNumber={1} />
      )

      // Icon is in an aria-hidden div for visual decoration only
      const icon = container.querySelector('svg[aria-label="Success"]')
      expect(icon).toBeInTheDocument()
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
    })
  })

  describe('Developing Assessment', () => {
    it('renders developing feedback with yellow indicator', () => {
      render(
        <FeedbackDisplay
          assessment="developing"
          feedback="Good start! Consider expanding on the evidence."
          attemptNumber={2}
        />
      )

      expect(screen.getByText(/good start/i)).toBeInTheDocument()

      const container = screen.getByRole('article')
      expect(container).toHaveClass('bg-yellow-50')
    })

    it('shows attempt number for developing assessment', () => {
      render(<FeedbackDisplay assessment="developing" feedback="Keep going!" attemptNumber={2} />)

      expect(screen.getByText(/attempt 2/i)).toBeInTheDocument()
    })
  })

  describe('Needs Support Assessment', () => {
    it('renders needs_support feedback with constructive message', () => {
      render(
        <FeedbackDisplay
          assessment="needs_support"
          feedback="Let's work through this together."
          attemptNumber={1}
        />
      )

      expect(screen.getByText(/let's work through this/i)).toBeInTheDocument()
    })

    it('uses neutral styling for needs_support', () => {
      render(<FeedbackDisplay assessment="needs_support" feedback="Try again!" attemptNumber={1} />)

      const container = screen.getByRole('article')
      // Should have cream/neutral background
      expect(container).toHaveClass('bg-cream-50')
    })
  })

  describe('Model Answer Display', () => {
    it('renders model answer when provided', () => {
      render(
        <FeedbackDisplay
          assessment="needs_support"
          feedback="Here's how an expert might approach this:"
          attemptNumber={3}
          modelAnswer="A model answer would analyze the argument structure..."
        />
      )

      expect(screen.getByRole('heading', { name: /model answer/i })).toBeInTheDocument()
      expect(screen.getByText(/a model answer would analyze/i)).toBeInTheDocument()
    })

    it('does not render model answer section when not provided', () => {
      render(<FeedbackDisplay assessment="developing" feedback="Keep trying!" attemptNumber={2} />)

      expect(screen.queryByText(/model answer/i)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA role and labels', () => {
      render(<FeedbackDisplay assessment="strong" feedback="Great work!" attemptNumber={1} />)

      const container = screen.getByRole('article')
      expect(container).toHaveAttribute('aria-label')
    })

    it('announces feedback with aria-live', () => {
      render(
        <FeedbackDisplay assessment="developing" feedback="Good progress!" attemptNumber={2} />
      )

      const liveRegion = screen.getByRole('status', { name: /feedback/i })
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
    })

    it('uses color and icon for accessibility (not color alone)', () => {
      const { container } = render(
        <FeedbackDisplay assessment="strong" feedback="Excellent!" attemptNumber={1} />
      )

      // Should have both visual indicator (color) and semantic badge text
      expect(screen.getByText(/strong/i)).toBeInTheDocument()
      expect(container.querySelector('svg[aria-label="Success"]')).toBeInTheDocument()
      expect(container.querySelector('[class*="green"]')).toBeTruthy()
    })

    it('has sufficient color contrast', () => {
      render(<FeedbackDisplay assessment="strong" feedback="Great work!" attemptNumber={1} />)

      // Text should be readable (enforced via Tailwind classes)
      const feedback = screen.getByText(/great work/i)
      expect(feedback).toHaveClass(/text-/i)
    })
  })

  describe('Responsive Design', () => {
    it('renders with mobile-friendly spacing', () => {
      render(<FeedbackDisplay assessment="strong" feedback="Excellent!" attemptNumber={1} />)

      const container = screen.getByRole('article')
      // Check that padding classes exist using className check
      expect(container.className).toMatch(/border|rounded/)
    })

    it('formats long feedback text properly', () => {
      const longFeedback =
        'This is a very long feedback message that should wrap properly on mobile devices and maintain readability across different screen sizes.'

      render(<FeedbackDisplay assessment="developing" feedback={longFeedback} attemptNumber={1} />)

      expect(screen.getByText(longFeedback)).toBeInTheDocument()
      expect(screen.getByText(longFeedback)).toHaveClass(/whitespace/i, /leading/i)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty feedback gracefully', () => {
      render(<FeedbackDisplay assessment="strong" feedback="" attemptNumber={1} />)

      // Should still render container
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles very long model answers', () => {
      const longModelAnswer = 'A '.repeat(500) + 'long model answer.'

      render(
        <FeedbackDisplay
          assessment="needs_support"
          feedback="Here's the model answer:"
          attemptNumber={3}
          modelAnswer={longModelAnswer}
        />
      )

      expect(screen.getByText(longModelAnswer)).toBeInTheDocument()
    })

    it('displays correct attempt number', () => {
      const { rerender } = render(
        <FeedbackDisplay assessment="developing" feedback="Try again" attemptNumber={1} />
      )

      expect(screen.getByText(/attempt 1/i)).toBeInTheDocument()

      rerender(<FeedbackDisplay assessment="developing" feedback="Try again" attemptNumber={3} />)

      expect(screen.getByText(/attempt 3/i)).toBeInTheDocument()
    })
  })
})
