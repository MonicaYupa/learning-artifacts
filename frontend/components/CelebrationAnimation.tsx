'use client'

import { useEffect, useState } from 'react'

/**
 * CelebrationAnimation Component
 * Displays a CSS-based celebration animation for module completion
 * Respects user's motion preferences
 */
export default function CelebrationAnimation() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <div
      role="img"
      aria-label="Celebration animation for module completion"
      className={`relative mx-auto mb-6 h-32 w-32 sm:h-40 sm:w-40 ${
        prefersReducedMotion ? 'motion-reduce' : 'animate-celebration'
      }`}
    >
      {/* Celebration Icon - Trophy or Star */}
      <div className="relative flex h-full w-full items-center justify-center">
        {/* Outer glow ring */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-primary-400 via-yellow-400 to-primary-500 opacity-30 ${
            !prefersReducedMotion && 'animate-pulse'
          }`}
        ></div>

        {/* Middle ring */}
        <div
          className={`absolute inset-4 rounded-full bg-gradient-to-br from-yellow-300 to-primary-400 opacity-50 ${
            !prefersReducedMotion && 'animate-ping-slow'
          }`}
        ></div>

        {/* Center icon container */}
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg sm:h-24 sm:w-24">
          {/* Trophy/Star Icon */}
          <svg
            className="h-12 w-12 text-white drop-shadow-md sm:h-14 sm:w-14"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>

        {/* Confetti particles - only if motion is allowed */}
        {!prefersReducedMotion && (
          <>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="confetti-particle absolute h-2 w-2 rounded-full bg-yellow-400"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${i * 45}deg) translateX(0)`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes celebration-scale {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes confetti-burst {
          0% {
            transform: rotate(var(--rotation, 0deg)) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation, 0deg)) translateX(60px) scale(0);
            opacity: 0;
          }
        }

        @keyframes ping-slow {
          75%,
          100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }

        .animate-celebration {
          animation: celebration-scale 2s ease-in-out infinite;
        }

        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .confetti-particle {
          animation: confetti-burst 1.5s ease-out forwards;
        }

        .motion-reduce {
          animation: none !important;
        }

        .motion-reduce .confetti-particle {
          display: none;
        }
      `}</style>
    </div>
  )
}
