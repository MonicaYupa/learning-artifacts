import { render, screen, waitFor } from '@/lib/test-utils/test-utils'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HintSystem from '@/components/HintSystem'
import { mockHintResponse1, mockHintResponse2, mockHintResponse3 } from '@/lib/test-utils/fixtures'

// Mock the API service
jest.mock('@/lib/api/sessions', () => ({
  requestHint: jest.fn(),
}))

import { requestHint } from '@/lib/api/sessions'

describe('HintSystem', () => {
  const mockRequestHint = requestHint as jest.MockedFunction<typeof requestHint>
  const mockSessionId = 'session-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the hint button initially', () => {
      render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={0}
          maxHints={3}
          onHintReceived={jest.fn()}
        />
      )

      expect(screen.getByRole('button', { name: /request hint/i })).toBeInTheDocument()
    })

    it('shows hint level indicator when hints are available', () => {
      render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={1}
          maxHints={3}
          onHintReceived={jest.fn()}
        />
      )

      expect(screen.getByText(/1\/3/i)).toBeInTheDocument()
    })

    it('disables button when all hints are used', () => {
      render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={3}
          maxHints={3}
          onHintReceived={jest.fn()}
        />
      )

      const button = screen.getByRole('button', { name: /all hints used/i })
      expect(button).toBeDisabled()
      expect(screen.getByText(/all hints used/i)).toBeInTheDocument()
    })
  })

  describe('Hint Request Flow', () => {
    it('requests and displays first hint successfully', async () => {
      const user = userEvent.setup()
      const onHintReceived = jest.fn()

      // Add delay to mock to ensure loading state is visible
      mockRequestHint.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockHintResponse1), 100))
      )

      render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={0}
          maxHints={3}
          onHintReceived={onHintReceived}
        />
      )

      const button = screen.getByRole('button', { name: /request hint/i })
      await user.click(button)

      // Should have called the API and callback
      await waitFor(() => {
        expect(mockRequestHint).toHaveBeenCalledWith(mockSessionId, 1)
        expect(onHintReceived).toHaveBeenCalledWith(mockHintResponse1)
      })
    })

    it('requests and displays progressive hints', async () => {
      const user = userEvent.setup()
      const onHintReceived = jest.fn()

      mockRequestHint
        .mockResolvedValueOnce(mockHintResponse1)
        .mockResolvedValueOnce(mockHintResponse2)
        .mockResolvedValueOnce(mockHintResponse3)

      const { rerender } = render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={0}
          maxHints={3}
          onHintReceived={onHintReceived}
        />
      )

      // Request first hint
      await user.click(screen.getByRole('button', { name: /request hint/i }))
      await waitFor(() => expect(onHintReceived).toHaveBeenCalledTimes(1))

      // Update component with new hint level
      rerender(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={1}
          maxHints={3}
          onHintReceived={onHintReceived}
        />
      )

      expect(screen.getByText(/1\/3/i)).toBeInTheDocument()

      // Request second hint
      await user.click(screen.getByRole('button', { name: /request hint/i }))
      await waitFor(() => expect(onHintReceived).toHaveBeenCalledTimes(2))

      // Update component with new hint level
      rerender(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={2}
          maxHints={3}
          onHintReceived={onHintReceived}
        />
      )

      expect(screen.getByText(/2\/3/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={0}
          maxHints={3}
          onHintReceived={jest.fn()}
        />
      )

      const button = screen.getByRole('button', { name: /request hint/i })
      expect(button).toHaveAttribute('aria-label')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      mockRequestHint.mockResolvedValueOnce(mockHintResponse1)

      render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={0}
          maxHints={3}
          onHintReceived={jest.fn()}
        />
      )

      const button = screen.getByRole('button', { name: /request hint/i })

      // Tab to button
      button.focus()
      expect(button).toHaveFocus()

      // Press Enter to activate using userEvent
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(mockRequestHint).toHaveBeenCalled()
      })
    })

    it('has minimum touch target size for mobile', () => {
      render(
        <HintSystem
          sessionId={mockSessionId}
          currentHintLevel={0}
          maxHints={3}
          onHintReceived={jest.fn()}
        />
      )

      const button = screen.getByRole('button', { name: /request hint/i })
      const styles = window.getComputedStyle(button)

      // Button should have adequate padding/size (will be enforced via CSS)
      expect(button).toHaveClass(/py-/i) // Tailwind padding classes
    })
  })
})
