// Session and exercise interaction types

export type AssessmentLevel = 'strong' | 'developing' | 'needs_support'

export interface Hint {
  level: number
  content: string
  timestamp: string
}

export interface Attempt {
  attempt_number: number
  answer_text: string
  time_spent_seconds: number
  hints_used: number
  assessment: AssessmentLevel | null
  feedback: string | null
  submitted_at: string
}

export interface Session {
  id: string
  module_id: string
  user_id: string
  current_exercise_index: number
  current_attempt_number: number
  hints_requested: Hint[]
  attempts: Attempt[]
  status: 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface HintResponse {
  hint: string
  hint_level: number
  remaining_hints: number
  session: Session
}

export interface SubmitResponse {
  assessment: AssessmentLevel
  internal_score: number
  feedback: string
  attempt_number: number
  hint_available: boolean
  model_answer_available: boolean
  model_answer?: string
}

export interface ApiError {
  error: string
  message: string
  status_code: number
}
