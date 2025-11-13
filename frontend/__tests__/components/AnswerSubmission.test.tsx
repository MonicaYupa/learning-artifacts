import { render, screen, waitFor } from '@/lib/test-utils/test-utils'
import userEvent from '@testing-library/user-event'
import AnswerSubmission from '@/components/AnswerSubmission'
import { mockSubmitResponseStrong } from '@/lib/test-utils/fixtures'

// Mock the API service
jest.mock('@/lib/api/sessions', () => ({
  submitAnswerStream: jest.fn(),
}))

import { submitAnswerStream } from '@/lib/api/sessions'

describe('AnswerSubmission', () => {
  const mockSubmitAnswerStream = submitAnswerStream as jest.MockedFunction<
    typeof submitAnswerStream
  >
  const mockSessionId = 'session-123'
  const mockOnSubmitSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup
  })

  describe('Form Validation', () => {
    it('disables submit button when answer is empty', () => {
      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button when answer has content', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'This is my answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      expect(submitButton).toBeEnabled()
    })

    it('disables submit button with only whitespace', async () => {
      const user = userEvent.setup({ delay: null })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, '   ')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Submission Flow', () => {
    it('submits answer with correct data', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onComplete?.(mockSubmitResponseStrong)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={2}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'This is my comprehensive answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSubmitAnswerStream).toHaveBeenCalledWith(
          mockSessionId,
          expect.objectContaining({
            answer_text: 'This is my comprehensive answer',
            hints_used: 2,
            exercise_index: 0,
            time_spent_seconds: expect.any(Number),
          }),
          expect.any(Object)
        )
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup({ delay: null })
      let resolveSubmit: () => void
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve
      })
      mockSubmitAnswerStream.mockReturnValue(submitPromise)

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      // Should show loading state while promise is pending
      await waitFor(() => {
        expect(screen.getByText('Submitting...')).toBeInTheDocument()
      })
      expect(submitButton).toBeDisabled()

      // Resolve the promise to complete the test
      resolveSubmit!()

      // Wait for the finally block to execute and state to settle
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('calls onSubmitSuccess with response data', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onComplete?.(mockSubmitResponseStrong)
        // Small delay to ensure finally block executes
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith(mockSubmitResponseStrong, 'My answer')
      })

      // Wait for the finally block to complete and state to settle
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('keeps textarea content after successful submission', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onComplete?.(mockSubmitResponseStrong)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', {
        name: /workspace/i,
      }) as HTMLTextAreaElement
      await user.type(textarea, 'My answer')
      expect(textarea.value).toBe('My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalled()
        expect(submitButton).not.toBeDisabled()
      })

      // Answer should remain visible after submission
      expect(textarea.value).toBe('My answer')
    })
  })

  describe('Error Handling', () => {
    it('displays error message on API failure', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onError?.('Failed to submit answer')
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      await waitFor(
        () => {
          expect(screen.getByText(/failed to submit/i)).toBeInTheDocument()
          expect(mockOnSubmitSuccess).not.toHaveBeenCalled()
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })

    it('allows retry after error', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream
        .mockImplementationOnce(async (sessionId, submission, callbacks) => {
          callbacks.onError?.('Failed to submit answer')
          await new Promise((resolve) => setTimeout(resolve, 0))
        })
        .mockImplementationOnce(async (sessionId, submission, callbacks) => {
          callbacks.onComplete?.(mockSubmitResponseStrong)
          await new Promise((resolve) => setTimeout(resolve, 0))
        })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })

      // First attempt - fails
      await user.click(submitButton)
      await waitFor(
        () => {
          expect(screen.getByText(/failed to submit/i)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Second attempt - succeeds
      await user.click(submitButton)
      await waitFor(
        () => {
          expect(mockOnSubmitSuccess).toHaveBeenCalledWith(mockSubmitResponseStrong, 'My answer')
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })

    it('maintains answer text on error', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onError?.('Failed to submit answer')
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', {
        name: /workspace/i,
      }) as HTMLTextAreaElement
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      await waitFor(
        () => {
          expect(screen.getByText(/failed to submit/i)).toBeInTheDocument()
          expect(textarea.value).toBe('My answer')
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Time Tracking', () => {
    it('tracks time spent on exercise', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onComplete?.(mockSubmitResponseStrong)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSubmitAnswerStream).toHaveBeenCalledWith(
          mockSessionId,
          expect.objectContaining({
            time_spent_seconds: expect.any(Number),
            answer_text: 'My answer',
            hints_used: 0,
            exercise_index: 0,
          }),
          expect.any(Object)
        )

        const call = mockSubmitAnswerStream.mock.calls[0][1]
        expect(call.time_spent_seconds).toBeGreaterThanOrEqual(0)
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper labels for textarea', () => {
      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      expect(textarea).toHaveAttribute('id')
      expect(screen.getByLabelText(/workspace/i)).toBe(textarea)
    })

    it('announces submission status with aria-live', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onComplete?.(mockSubmitResponseStrong)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })
      await user.click(submitButton)

      // Should have status region for screen readers
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Wait for state to settle
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (sessionId, submission, callbacks) => {
        callbacks.onComplete?.(mockSubmitResponseStrong)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })

      // Type answer
      await user.type(textarea, 'My answer')

      // Tab to submit button
      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })

  describe('Prevent Double Submission', () => {
    it('prevents multiple simultaneous submissions', async () => {
      const user = userEvent.setup({ delay: null })
      mockSubmitAnswerStream.mockImplementation(async (_sessionId, _submission, callbacks) => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        callbacks.onComplete?.(mockSubmitResponseStrong)
      })

      render(
        <AnswerSubmission
          sessionId={mockSessionId}
          exerciseIndex={0}
          hintsUsed={0}
          onSubmitSuccess={mockOnSubmitSuccess}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /workspace/i })
      await user.type(textarea, 'My answer')

      const submitButton = screen.getByRole('button', {
        name: /submit answer/i,
      })

      // Click multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Wait for the async operations to settle
      await waitFor(
        () => {
          expect(mockOnSubmitSuccess).toHaveBeenCalled()
          expect(submitButton).not.toBeDisabled()
        },
        { timeout: 2000 }
      )

      // Should only submit once
      expect(mockSubmitAnswerStream).toHaveBeenCalledTimes(1)
    })
  })
})
