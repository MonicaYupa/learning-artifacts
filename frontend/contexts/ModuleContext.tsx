'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { Exercise, ExerciseMessage } from '@/types/exercise'
import type { HintResponse, SubmitResponse } from '@/types/session'

interface ModuleContextValue {
  // Module data
  sessionId: string | null
  exercises: Exercise[]
  currentExercise: Exercise | null
  currentExerciseIndex: number
  totalExercises: number

  // Exercise state
  hintsUsed: number
  maxHints: number
  exerciseMessages: ExerciseMessage[]
  collapsedHints: Set<string>
  showCelebration: boolean
  showContinueButton: boolean
  justUnlockedExercise: number | null
  activeTab: 'exercise' | 'editor'

  // Progress state
  completedExercises: Set<number>
  exerciseResponses: Map<number, string>
  exerciseAssessments: Map<number, 'strong' | 'developing' | 'beginning'>

  // Actions
  handleHintReceived: (response: HintResponse) => void
  handleSubmitSuccess: (response: SubmitResponse, submittedAnswer: string) => void
  handleStreamingUpdate: (
    feedback: string,
    isComplete: boolean,
    assessment?: 'strong' | 'developing' | 'beginning'
  ) => void
  toggleHintCollapse: (hintId: string) => void
  advanceToNextExercise: () => void
  handleCompleteModule: () => void
  navigateToExercise: (index: number) => void
  setActiveTab: (tab: 'exercise' | 'editor') => void
}

const ModuleContext = createContext<ModuleContextValue | null>(null)

export function useModuleContext() {
  const context = useContext(ModuleContext)
  if (!context) {
    throw new Error('useModuleContext must be used within ModuleProvider')
  }
  return context
}

export { ModuleContext }
export type { ModuleContextValue }
