import type { Session, HintResponse, SubmitResponse, Attempt, Hint } from '@/types/session'

// Mock session data
export const mockSession: Session = {
  id: 'session-123',
  module_id: 'module-456',
  user_id: 'user-789',
  current_exercise_index: 0,
  current_attempt_number: 1,
  hints_requested: [],
  attempts: [],
  status: 'in_progress',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock hints
export const mockHints: Hint[] = [
  {
    level: 1,
    content: 'Think about the main argument being presented',
    timestamp: '2024-01-01T00:01:00Z',
  },
  {
    level: 2,
    content: 'Consider how the evidence supports the conclusion',
    timestamp: '2024-01-01T00:02:00Z',
  },
  {
    level: 3,
    content: 'Look for assumptions that might be questionable',
    timestamp: '2024-01-01T00:03:00Z',
  },
]

// Mock hint responses
export const mockHintResponse1: HintResponse = {
  hint_text: mockHints[0].content,
  hint_level: 1,
  hints_remaining: 2,
}

export const mockHintResponse2: HintResponse = {
  hint_text: mockHints[1].content,
  hint_level: 2,
  hints_remaining: 1,
}

export const mockHintResponse3: HintResponse = {
  hint_text: mockHints[2].content,
  hint_level: 3,
  hints_remaining: 0,
}

// Mock attempts
export const mockStrongAttempt: Attempt = {
  attempt_number: 1,
  answer_text: 'This is a strong answer with good analysis',
  time_spent_seconds: 300,
  hints_used: 0,
  assessment: 'strong',
  feedback: 'Excellent analysis! You correctly identified the key points.',
  submitted_at: '2024-01-01T00:05:00Z',
}

export const mockDevelopingAttempt: Attempt = {
  attempt_number: 1,
  answer_text: 'This is a developing answer',
  time_spent_seconds: 180,
  hints_used: 1,
  assessment: 'developing',
  feedback:
    'Good start! Consider expanding on the relationship between the evidence and conclusion.',
  submitted_at: '2024-01-01T00:05:00Z',
}

export const mockNeedsSupportAttempt: Attempt = {
  attempt_number: 1,
  answer_text: 'This is a weak answer',
  time_spent_seconds: 120,
  hints_used: 2,
  assessment: 'beginning',
  feedback: "Let's work through this together. Start by identifying the main claim.",
  submitted_at: '2024-01-01T00:05:00Z',
}

// Mock submit responses
export const mockSubmitResponseStrong: SubmitResponse = {
  assessment: 'strong',
  internal_score: 0.9,
  feedback: 'Excellent analysis! You correctly identified the key points.',
  attempt_number: 1,
  hint_available: false,
}

export const mockSubmitResponseDeveloping: SubmitResponse = {
  assessment: 'developing',
  internal_score: 0.6,
  feedback:
    'Good start! Consider expanding on the relationship between the evidence and conclusion.',
  attempt_number: 2,
  hint_available: true,
}

export const mockSubmitResponseNeedsSupport: SubmitResponse = {
  assessment: 'beginning',
  internal_score: 0.4,
  feedback: "Let's work through this together. Start by identifying the main claim.",
  attempt_number: 2,
  hint_available: true,
}

export const mockSubmitResponseThirdAttempt: SubmitResponse = {
  assessment: 'beginning',
  internal_score: 0.3,
  feedback: "Here's how an expert might approach this:",
  attempt_number: 3,
  hint_available: false,
}

// API error responses
export const mockApiError = {
  error: 'Bad Request',
  message: 'Invalid session ID',
  status_code: 400,
}

export const mockNetworkError = new Error('Network request failed')
