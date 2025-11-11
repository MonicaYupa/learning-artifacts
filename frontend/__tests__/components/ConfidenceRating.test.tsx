import { render, screen, waitFor } from '@/lib/test-utils/test-utils'
import userEvent from '@testing-library/user-event'
import ConfidenceRating from '@/components/ConfidenceRating'

// Mock fetch
global.fetch = jest.fn()

describe('ConfidenceRating', () => {
  const mockSessionId = 'test-session-123'
  const mockOnRatingSubmitted = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
  })

  describe('Rendering', () => {
    it('renders the confidence rating prompt', () => {
      render(<ConfidenceRating sessionId={mockSessionId} />)
      expect(screen.getByText(/how confident do you feel about this topic/i)).toBeInTheDocument()
    })

    it('renders 5 star buttons', () => {
      render(<ConfidenceRating sessionId={mockSessionId} />)
      const stars = screen.getAllByRole('radio')
      expect(stars).toHaveLength(5)
    })

    it('renders stars in a radiogroup', () => {
      render(<ConfidenceRating sessionId={mockSessionId} />)
      const radiogroup = screen.getByRole('radiogroup', { name: /confidence rating/i })
      expect(radiogroup).toBeInTheDocument()
    })
  })

  describe('Star Interaction', () => {
    it('highlights stars on hover', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.hover(stars[2]) // Hover over 3rd star

      // First 3 stars should be highlighted
      expect(stars[0]).toHaveClass('text-yellow-400')
      expect(stars[1]).toHaveClass('text-yellow-400')
      expect(stars[2]).toHaveClass('text-yellow-400')
      // Last 2 should not
      expect(stars[3]).not.toHaveClass('text-yellow-400')
      expect(stars[4]).not.toHaveClass('text-yellow-400')
    })

    it('selects rating on click', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.click(stars[3]) // Click 4th star (rating 4)

      expect(stars[3]).toBeChecked()
    })

    it('updates selected rating when clicking different star', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.click(stars[2]) // Click 3rd star
      expect(stars[2]).toBeChecked()

      await user.click(stars[4]) // Click 5th star
      expect(stars[4]).toBeChecked()
      expect(stars[2]).not.toBeChecked()
    })
  })

  describe('Rating Submission', () => {
    it('submits rating when star is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ConfidenceRating sessionId={mockSessionId} onRatingSubmitted={mockOnRatingSubmitted} />
      )

      const stars = screen.getAllByRole('radio')
      await user.click(stars[3]) // Rating 4

      const submitButton = screen.getByRole('button', { name: /submit rating/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/sessions/${mockSessionId}`),
          expect.objectContaining({
            method: 'PATCH',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ confidence_rating: 4 }),
          })
        )
      })
    })

    it('shows confirmation message after successful submission', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.click(stars[4]) // Rating 5

      const submitButton = screen.getByRole('button', { name: /submit rating/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/thank you for your feedback/i)).toBeInTheDocument()
      })
    })

    it('calls onRatingSubmitted callback with correct rating', async () => {
      const user = userEvent.setup()
      render(
        <ConfidenceRating sessionId={mockSessionId} onRatingSubmitted={mockOnRatingSubmitted} />
      )

      const stars = screen.getAllByRole('radio')
      await user.click(stars[2]) // Rating 3

      const submitButton = screen.getByRole('button', { name: /submit rating/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnRatingSubmitted).toHaveBeenCalledWith(3)
      })
    })

    it('disables stars after submission', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.click(stars[3])

      const submitButton = screen.getByRole('button', { name: /submit rating/i })
      await user.click(submitButton)

      await waitFor(() => {
        stars.forEach((star) => {
          expect(star).toBeDisabled()
        })
      })
    })

    it('shows error message when submission fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.click(stars[2])

      const submitButton = screen.getByRole('button', { name: /submit rating/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to submit rating/i)).toBeInTheDocument()
      })
    })

    it('prevents double submission', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.click(stars[2])

      const submitButton = screen.getByRole('button', { name: /submit rating/i })
      await user.click(submitButton)
      await user.click(submitButton) // Try to submit again

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports arrow key navigation', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      stars[0].focus()

      await user.keyboard('{ArrowRight}')
      expect(stars[1]).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(stars[2]).toHaveFocus()

      await user.keyboard('{ArrowLeft}')
      expect(stars[1]).toHaveFocus()
    })

    it('supports number key selection (1-5)', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      await user.keyboard('3')

      const stars = screen.getAllByRole('radio')
      expect(stars[2]).toBeChecked() // 3rd star (index 2) for rating 3
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for each star', () => {
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      stars.forEach((star, index) => {
        expect(star).toHaveAccessibleName(`${index + 1} star${index !== 0 ? 's' : ''}`)
      })
    })

    it('announces selection to screen readers', async () => {
      const user = userEvent.setup()
      render(<ConfidenceRating sessionId={mockSessionId} />)

      const stars = screen.getAllByRole('radio')
      await user.click(stars[3])

      expect(stars[3]).toHaveAttribute('aria-checked', 'true')
    })
  })
})
