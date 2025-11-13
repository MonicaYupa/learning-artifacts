// Discriminated union for better type safety
export type ExerciseMessage =
  | {
      id: string
      type: 'hint'
      content: string
      timestamp: Date
    }
  | {
      id: string
      type: 'feedback'
      content: string
      timestamp: Date
      assessment?: 'strong' | 'developing' | 'beginning'
      attemptNumber: number
      isStreaming?: boolean
    }

export interface Exercise {
  id: string
  name: string
  type: 'analysis' | 'comparative' | 'framework'
  prompt: string
  material?: string
  options?: string[]
  scaffold?: { [key: string]: string }
  hints?: string[]
}

export interface ModuleProgress {
  completedExercises: number[]
  exerciseResponses: Record<number, string>
  exerciseHints: Record<number, number>
  exerciseHintMessages: Record<number, ExerciseMessage[]>
  exerciseFeedbackMessages?: Record<number, ExerciseMessage[]>
  exerciseAssessments: Record<number, 'strong' | 'developing' | 'beginning'>
}
