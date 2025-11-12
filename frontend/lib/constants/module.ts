/**
 * Module page constants
 * Centralized configuration for timeouts, animations, and UI constants
 */

// Animation and timing constants
export const CELEBRATION_DURATION = 3000 // ms
export const UNLOCK_ANIMATION_DURATION = 2000 // ms
export const HINT_SCROLL_DELAY = 100 // ms
export const SCROLL_TO_BOTTOM_DELAY = 100 // ms

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 640 // px

// Session constants
export const SESSION_ID_PREFIX = 'session-'

// Storage keys
export const STORAGE_KEY_SCROLL_TO_BOTTOM = 'scrollToBottom'
export const STORAGE_KEY_CHAT_MESSAGES = 'chatMessages'
export const STORAGE_KEY_CHAT_MODULES = 'chatModules'

// UI messages
export const UI_MESSAGES = {
  loading: 'Loading module...',
  noExercises: 'Your personalized exercises will appear here shortly.',
  backToChat: 'Back to chat',
} as const

// Default values
export const DEFAULT_MAX_HINTS = 3
export const DEFAULT_ATTEMPT_NUMBER = 1
