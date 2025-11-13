'use client'

import { useState } from 'react'
import type { AssessmentLevel } from '@/types/session'

interface FeedbackDisplayProps {
  assessment?: AssessmentLevel
  feedback: string
  attemptNumber: number
  modelAnswer?: string
  isStreaming?: boolean
}

export default function FeedbackDisplay({
  assessment,
  feedback,
  attemptNumber,
  modelAnswer,
  isStreaming = false,
}: FeedbackDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false) // Start expanded
  const getAssessmentStyles = () => {
    switch (assessment) {
      case 'strong':
        return {
          container: 'bg-green-50 border-green-300',
          icon: 'text-green-600',
          badge: 'bg-green-100 text-green-800',
          text: 'text-green-900',
        }
      case 'developing':
        return {
          container: 'bg-blue-50 border-blue-300',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800',
          text: 'text-blue-900',
        }
      case 'beginning':
        return {
          container: 'bg-yellow-50 border-yellow-300',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800',
          text: 'text-yellow-900',
        }
      case undefined:
        // Evaluating state during streaming
        return {
          container: 'bg-gray-50 border-gray-300',
          icon: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800',
          text: 'text-gray-900',
        }
      default:
        // Fallback for unknown states
        return {
          container: 'bg-gray-50 border-gray-300',
          icon: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800',
          text: 'text-gray-900',
        }
    }
  }

  const getAssessmentIcon = () => {
    switch (assessment) {
      case 'strong':
        return (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Success"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'developing':
        return (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Warning"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'beginning':
        return (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Information"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case undefined:
        return (
          <svg
            className="h-6 w-6 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Evaluating"
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
        )
      default:
        return (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Warning"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  const getAssessmentLabel = () => {
    switch (assessment) {
      case 'strong':
        return 'Strong'
      case 'developing':
        return 'Developing'
      case 'beginning':
        return 'Beginning'
      case undefined:
        return 'Evaluating...'
      default:
        return 'Unknown'
    }
  }

  const styles = getAssessmentStyles()

  return (
    <article
      className={`rounded-lg border ${styles.container} focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2`}
      role="article"
      aria-label={`Feedback for attempt ${attemptNumber}`}
    >
      {/* Collapsible header button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-opacity-80 focus:outline-none"
        aria-expanded={!isCollapsed}
        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} feedback for attempt ${attemptNumber}`}
      >
        <div className="flex items-start gap-3 flex-1" aria-hidden="true">
          <div className={styles.icon}>{getAssessmentIcon()}</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
              {getAssessmentLabel()}
            </span>
            <span className="text-xs text-gray-600">Attempt {attemptNumber}</span>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-gray-600 transition-transform flex-shrink-0 ml-2 ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <div
            className={`whitespace-pre-wrap text-sm leading-relaxed ${styles.text}`}
            role="status"
            aria-label="Feedback message"
            aria-live="assertive"
          >
            {feedback}
            {isStreaming && (
              <span
                className="inline-block ml-1 w-2 h-4 bg-current animate-pulse"
                aria-label="Generating feedback"
              />
            )}
          </div>

          {/* Model answer section */}
          {modelAnswer && (
            <div className="mt-4 rounded-lg border-l-4 border-primary-400 bg-white p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-900">
                <svg
                  className="h-5 w-5 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Model Answer
              </h4>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {modelAnswer}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
