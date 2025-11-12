export interface ExerciseMessage {
  id: string
  type: 'hint' | 'feedback'
  content: string
  timestamp: Date
  assessment?: 'strong' | 'developing' | 'needs_support'
  attemptNumber?: number
  modelAnswer?: string
}

export interface Exercise {
  id: string
  name: string
  type: 'analysis' | 'comparative' | 'framework'
  prompt: string
  material?: string
  options?: string[]
  scaffold?: { [key: string]: string }
  hints: string[]
}

export interface ModuleProgress {
  completedExercises: number[]
  exerciseResponses: Record<number, string>
  exerciseHints: Record<number, number>
  exerciseHintMessages: Record<number, ExerciseMessage[]>
  exerciseFeedbackMessages?: Record<number, ExerciseMessage[]>
  exerciseAssessments: Record<number, 'strong' | 'developing' | 'needs_support'>
}
