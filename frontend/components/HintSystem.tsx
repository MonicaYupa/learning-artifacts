'use client'

import { useState } from 'react'
import { requestHint } from '@/lib/api/sessions'
import type { HintResponse } from '@/types/session'

interface HintSystemProps {
  sessionId: string
  currentHintLevel: number
  maxHints: number
  onHintReceived: (response: HintResponse) => void
  renderHintButton?: (props: {
    onClick: () => void
    disabled: boolean
    isLoading: boolean
    allHintsUsed: boolean
    currentHintLevel: number
    maxHints: number
  }) => React.ReactNode
}

export default function HintSystem({
  sessionId,
  currentHintLevel,
  maxHints,
  onHintReceived,
  renderHintButton,
}: HintSystemProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allHintsUsed = currentHintLevel >= maxHints
  const remainingHints = maxHints - currentHintLevel

  const handleRequestHint = async () => {
    if (isLoading || allHintsUsed) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await requestHint(sessionId)
      onHintReceived(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load hint'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Hint Button - render custom or default */}
      {renderHintButton ? (
        renderHintButton({
          onClick: handleRequestHint,
          disabled: isLoading || allHintsUsed,
          isLoading,
          allHintsUsed,
          currentHintLevel,
          maxHints,
        })
      ) : (
        <button
          onClick={handleRequestHint}
          disabled={isLoading || allHintsUsed}
          aria-label={
            allHintsUsed ? 'All hints used' : `Request hint ${currentHintLevel + 1} of ${maxHints}`
          }
          className="w-full rounded-lg border-2 border-primary-500 bg-white px-4 py-2.5 text-sm font-semibold text-primary-500 transition-all hover:bg-primary-50 active:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white sm:py-3"
        >
          <span className="flex items-center justify-center gap-2">
            {isLoading ? (
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
                <span>Loading...</span>
              </>
            ) : allHintsUsed ? (
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>All Hints Used</span>
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>Request Hint</span>
                {currentHintLevel > 0 && (
                  <span className="text-xs">
                    ({currentHintLevel}/{maxHints})
                  </span>
                )}
              </>
            )}
          </span>
        </button>
      )}

      {/* Error display */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {/* Screen reader status announcement */}
      {isLoading && (
        <div role="status" className="sr-only" aria-live="polite">
          Loading hint...
        </div>
      )}
    </div>
  )
}
