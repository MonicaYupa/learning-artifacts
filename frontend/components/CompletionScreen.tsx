'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import CelebrationAnimation from './CelebrationAnimation'
import ConfidenceRating from './ConfidenceRating'

interface Exercise {
  id: string
  name: string
  type: string
}

interface CompletionScreenProps {
  moduleId: string
  moduleTitle: string
  moduleTopic?: string
  moduleDomain?: string
  sessionId: string
  exercises: Exercise[]
  isOpen: boolean
  onClose?: () => void
}

/**
 * CompletionScreen Component (Modal Overlay)
 * Displays celebration, summary, confidence rating, and navigation after module completion
 */
export default function CompletionScreen({
  // moduleId, moduleTitle, exercises - reserved for future features
  moduleTopic,
  moduleDomain,
  sessionId,
  isOpen,
  onClose,
}: CompletionScreenProps) {
  const router = useRouter()
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap and Escape key handler
  useEffect(() => {
    if (!isOpen) return

    // Focus the modal content when it opens
    modalRef.current?.focus()

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    // Trap focus within modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const modal = modalRef.current
      if (!modal) return

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleTab)

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleContinue = () => {
    onClose?.()
    // Set flag to scroll to bottom when returning to chat
    sessionStorage.setItem('scrollToBottom', 'true')
    router.push('/')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          ref={modalRef}
          className="modal-content"
          style={{
            position: 'relative',
            maxHeight: '85vh',
            height: 'auto',
            width: '90vw',
            maxWidth: '48rem',
            overflowY: 'auto',
            borderRadius: '1rem',
            background: 'linear-gradient(to bottom right, #fdfcfb, #ffffff, #f7f6f4)',
            padding: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Content */}
          <div className="mx-auto max-w-2xl">
            {/* Celebration Animation */}
            <div className="animate-fadeIn scale-75 -mb-4">
              <CelebrationAnimation />
            </div>

            {/* Completion Header */}
            <div className="animate-fadeIn stagger-1 mb-5 text-center sm:mb-6">
              <h1
                id="completion-title"
                className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-4xl"
              >
                Module Complete!
              </h1>

              {/* Concepts Practiced Badges */}
              <div className="flex flex-wrap justify-center gap-2">
                {/* Show topic or domain badge */}
                {(moduleTopic || moduleDomain) && (
                  <div
                    className="animate-scaleIn inline-flex items-center gap-1.5 rounded-full border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100 px-3 py-1.5 transition-all hover:scale-105 sm:px-4 sm:py-2"
                    style={{
                      animationDelay: '0.2s',
                    }}
                  >
                    {/* Checkmark Icon */}
                    <svg
                      data-testid="checkmark-icon"
                      className="h-4 w-4 flex-shrink-0 text-primary-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>

                    {/* Topic or Domain Badge */}
                    <span className="text-sm font-extrabold uppercase tracking-wider text-primary-800 sm:text-base">
                      {(moduleTopic || moduleDomain)?.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Confidence Rating */}
            <section className="animate-fadeIn stagger-3 mb-3 rounded-2xl bg-white p-4 shadow-md sm:mb-4 sm:p-5">
              <ConfidenceRating sessionId={sessionId} />
            </section>

            {/* Navigation Button */}
            <div className="animate-fadeIn stagger-4 flex justify-center">
              <button
                onClick={handleContinue}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-3 text-base font-bold text-white shadow-lg transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-xl hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:py-4 sm:text-lg"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Continue
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scoped styles - using CSS classes */}
      <style jsx>{`
        .modal-backdrop {
          @apply fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity;
        }

        .modal-container {
          @apply fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6;
        }

        .modal-content {
          @apply relative max-h-[60vh] w-[90vw] max-w-lg overflow-y-auto rounded-2xl bg-gradient-to-br from-cream-50 via-white to-cream-100 p-4 shadow-2xl sm:max-h-[55vh] sm:w-auto sm:p-5 lg:p-6;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        .modal-content::-webkit-scrollbar {
          @apply w-2;
        }

        .modal-content::-webkit-scrollbar-track {
          @apply rounded bg-cream-200;
        }

        .modal-content::-webkit-scrollbar-thumb {
          @apply rounded bg-neutral-400 hover:bg-neutral-500;
        }

        .modal-close-button {
          @apply absolute right-4 top-4 rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:right-6 sm:top-6;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out forwards;
          opacity: 0;
        }

        .stagger-1 {
          animation-delay: 0.1s;
        }

        .stagger-2 {
          animation-delay: 0.2s;
        }

        .stagger-3 {
          animation-delay: 0.3s;
        }

        .stagger-4 {
          animation-delay: 0.4s;
        }

        .stagger-5 {
          animation-delay: 0.5s;
        }
      `}</style>
    </>
  )
}
