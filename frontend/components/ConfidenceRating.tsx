'use client'

import { useState, useEffect } from 'react'

interface ConfidenceRatingProps {
  sessionId: string
  onRatingSubmitted?: (rating: number) => void
}

/**
 * ConfidenceRating Component
 * Interactive emoji-based rating system for comprehension assessment
 * Features: hover preview showing label, keyboard navigation, accessible
 */
export default function ConfidenceRating({ sessionId, onRatingSubmitted }: ConfidenceRatingProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)

  // Handle keyboard input (1-5 keys)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10)
      // Validate: must be a number between 1-5 (not NaN, not 0, not 6+)
      if (!isNaN(num) && num >= 1 && num <= 5) {
        setSelectedRating(num)
        onRatingSubmitted?.(num)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onRatingSubmitted])

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating)
    onRatingSubmitted?.(rating)
  }

  const displayRating = hoverRating || selectedRating

  const ratingOptions = [
    { value: 1, emoji: '🌱', label: 'Just starting' },
    { value: 2, emoji: '🌿', label: 'Making progress' },
    { value: 3, emoji: '🌻', label: 'Getting there' },
    { value: 4, emoji: '🌟', label: 'Got it down' },
    { value: 5, emoji: '🏆', label: 'Mastered it' },
  ]

  return (
    <div className="w-full">
      <h3 className="mb-4 text-center text-lg font-bold text-neutral-900">
        How well do you understand these concepts?
      </h3>

      {/* Horizontal Emoji Rating with Hover Text */}
      <div className="flex flex-col items-center gap-4">
        <div
          role="radiogroup"
          aria-label="Understanding rating from 1 to 5"
          className="flex justify-center gap-2 sm:gap-4"
          onMouseLeave={() => setHoverRating(0)}
        >
          {ratingOptions.map((option) => (
            <label
              key={option.value}
              className="group relative cursor-pointer"
              onMouseEnter={() => setHoverRating(option.value)}
            >
              <input
                type="radio"
                name="confidence-rating"
                value={option.value}
                checked={selectedRating === option.value}
                onChange={() => handleRatingSelect(option.value)}
                aria-label={option.label}
                aria-checked={selectedRating === option.value}
                className="sr-only"
              />
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-2xl p-3 transition-all sm:h-24 sm:w-24 sm:p-4 ${
                  selectedRating === option.value
                    ? 'scale-110 border-2 border-primary-500 bg-primary-50'
                    : hoverRating === option.value
                      ? 'scale-105 border-2 border-primary-400 bg-primary-50/50'
                      : 'border border-neutral-200 bg-white hover:border-primary-300'
                }`}
              >
                <span className="text-4xl sm:text-5xl" role="img" aria-label={option.label}>
                  {option.emoji}
                </span>
              </div>

              {/* Hover tooltip */}
              <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {option.label}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900"></div>
              </div>
            </label>
          ))}
        </div>

        {/* Display selected label */}
        {selectedRating > 0 && (
          <p className="text-center text-sm font-semibold text-primary-600">
            {ratingOptions[selectedRating - 1].label}
          </p>
        )}
      </div>
    </div>
  )
}
