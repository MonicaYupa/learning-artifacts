'use client'

import { useState, useEffect, useRef } from 'react'
import { submitAnswer } from '@/lib/api/sessions'
import type { SubmitResponse } from '@/types/session'

interface AnswerSubmissionProps {
  sessionId: string
  hintsUsed: number
  onSubmitSuccess: (response: SubmitResponse) => void
  initialAnswer?: string
}

export default function AnswerSubmission({
  sessionId,
  hintsUsed,
  onSubmitSuccess,
  initialAnswer = '',
}: AnswerSubmissionProps) {
  const [answer, setAnswer] = useState(initialAnswer)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Reset start time when component mounts or session changes
  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [sessionId])

  // Update answer when initialAnswer changes
  useEffect(() => {
    setAnswer(initialAnswer)
  }, [initialAnswer])

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length
  const charCount = answer.length
  const isAnswerEmpty = answer.trim().length === 0

  const handleSubmit = async () => {
    if (isSubmitting || isAnswerEmpty) return

    setIsSubmitting(true)
    setError(null)

    // Calculate time spent in seconds
    const timeSpentSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)

    try {
      const response = await submitAnswer(sessionId, {
        answer_text: answer.trim(),
        time_spent_seconds: timeSpentSeconds,
        hints_used: hintsUsed,
      })

      // Clear answer after successful submission
      setAnswer('')

      // Reset timer for next attempt
      startTimeRef.current = Date.now()

      onSubmitSuccess(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Editor Area */}
      <div className="mb-3 flex-1 sm:mb-4">
        <label htmlFor="answer" className="mb-2 block text-sm font-medium text-gray-700">
          Your Response
        </label>
        <textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={isSubmitting}
          className="h-[calc(100%-28px)] w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:p-4"
          placeholder="Type your answer here..."
          aria-describedby="answer-stats"
        />
      </div>

      {/* Character and Word Count */}
      <div
        id="answer-stats"
        className="mb-3 flex items-center justify-between text-xs text-gray-500 sm:mb-4"
        aria-live="polite"
      >
        <span>
          {charCount} characters • {wordCount} words
        </span>
      </div>

      {/* Error display */}
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:mb-4"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || isAnswerEmpty}
        aria-label={`Submit answer ${isSubmitting ? '(submitting...)' : ''}`}
        className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-500 disabled:hover:shadow-sm sm:py-3"
      >
        <span className="flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Submit Answer</span>
            </>
          )}
        </span>
      </button>

      {/* Screen reader status announcement */}
      <div role="status" className="sr-only" aria-live="polite">
        {isSubmitting && 'Submitting your answer...'}
      </div>
    </div>
  )
}
