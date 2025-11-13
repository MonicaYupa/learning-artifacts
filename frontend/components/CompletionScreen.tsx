'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, memo } from 'react'
import ConfidenceRating from './ConfidenceRating'

interface CompletionScreenProps {
  moduleTopic?: string
  moduleDomain?: string
  sessionId: string | null
  isOpen: boolean
  onClose?: () => void
}

/**
 * CompletionScreen Component (Modal Overlay)
 * Displays confidence rating and navigation after module completion
 */
function CompletionScreen({
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
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
            background: '#ffffff',
            padding: '2.5rem 1.5rem 2rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Content */}
          <div className="mx-auto max-w-2xl">
            {/* Completion Header - Centered */}
            <div className="mb-8 text-center">
              <h1
                id="completion-title"
                className="mb-4 text-3xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl"
              >
                Practice Complete ✨
              </h1>

              {/* Concepts Practiced Badges */}
              <div className="flex flex-wrap justify-center gap-2">
                {/* Show topic or domain badge */}
                {(moduleTopic || moduleDomain) && (
                  <div className="animate-badge-glimmer inline-flex items-center overflow-hidden rounded-full border border-cream-300 bg-cream-100 px-3 py-1.5 shadow-sm sm:px-4 sm:py-2">
                    {/* Topic or Domain Badge */}
                    <span className="text-sm font-semibold tracking-wide text-neutral-800 sm:text-base">
                      {(moduleTopic || moduleDomain)
                        ?.replace(/_/g, ' ')
                        .split(' ')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Confidence Rating */}
            <section className="mb-5 rounded-2xl bg-white p-6 sm:p-8">
              <ConfidenceRating sessionId={sessionId} />
            </section>

            {/* Navigation Button */}
            <div className="flex justify-center">
              <button
                onClick={handleContinue}
                className="group relative rounded-xl bg-primary-500 px-8 py-3 text-base font-bold text-white transition-all hover:bg-primary-600 hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:py-4 sm:text-lg"
              >
                <span className="flex items-center gap-2">
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

        @keyframes badgeGlimmer {
          0% {
            opacity: 0;
            transform: translateY(5px);
          }
          40% {
            opacity: 1;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glimmerShine {
          0% {
            background-position: -200% center;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            background-position: 200% center;
            opacity: 0;
          }
        }

        .animate-badge-glimmer {
          animation: badgeGlimmer 0.6s ease-out forwards;
          opacity: 0;
          position: relative;
        }

        .animate-badge-glimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: glimmerShine 0.8s ease-in-out 0.5s forwards;
          opacity: 0;
        }
      `}</style>
    </>
  )
}

export default memo(CompletionScreen)
