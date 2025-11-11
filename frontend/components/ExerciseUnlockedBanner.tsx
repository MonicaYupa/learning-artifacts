'use client'

import { useEffect, useState } from 'react'

interface ExerciseUnlockedBannerProps {
  exerciseNumber: number
  exerciseName: string
  onDismiss: () => void
  onContinue: () => void
}

export default function ExerciseUnlockedBanner({
  exerciseNumber,
  exerciseName,
  onDismiss,
  onContinue,
}: ExerciseUnlockedBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Wait for animation to complete
  }

  const handleContinue = () => {
    setIsVisible(false)
    setTimeout(onContinue, 300) // Wait for animation to complete
  }

  return (
    <div
      className={`mb-3 overflow-hidden rounded-lg border-2 border-primary-400 bg-gradient-to-r from-primary-50 to-cream-50 shadow-lg transition-all duration-300 sm:mb-4 ${
        isVisible ? 'animate-slideInDown opacity-100' : 'opacity-0 -translate-y-4'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Unlock Icon */}
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-neutral-900 sm:text-base">
                  Progress Saved! Next Exercise Unlocked
                </h3>
                <p className="mt-1 text-xs text-neutral-700 sm:text-sm">
                  <span className="font-semibold">Exercise {exerciseNumber}:</span> {exerciseName}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 rounded-lg p-1 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Dismiss notification"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={handleContinue}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <span>Continue to Exercise {exerciseNumber}</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
              <button
                onClick={handleDismiss}
                className="text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-900 focus:outline-none focus:underline"
              >
                Keep working on this exercise
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
