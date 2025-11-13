import { memo } from 'react'
import { STORAGE_KEY_SCROLL_TO_BOTTOM } from '@/lib/constants/module'

interface ModuleHeaderProps {
  topic: string
  skillLevel: string
  domain?: string
  onBackClick: () => void
}

/**
 * Module header component with back button and topic/level badges
 */
function ModuleHeader({ topic, skillLevel, domain, onBackClick }: ModuleHeaderProps) {
  const handleBackClick = () => {
    // Set flag to scroll to bottom when returning to chat
    sessionStorage.setItem(STORAGE_KEY_SCROLL_TO_BOTTOM, 'true')
    onBackClick()
  }

  return (
    <div className="bg-dark border-b border-neutral-700 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-neutral-400 transition-all hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
          aria-label="Back to chat"
        >
          <span className="absolute inset-0 scale-0 rounded-xl bg-gradient-to-r from-neutral-700 to-neutral-600 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"></span>
          <svg
            className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="relative z-10 text-sm font-medium">Chat</span>
        </button>

        {/* Topic and Level Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-300">
            Module Level: {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}
          </span>
          {topic && (
            <span className="rounded-full border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-neutral-200">
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
                {topic.replace(/_/g, ' ')}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(ModuleHeader)
