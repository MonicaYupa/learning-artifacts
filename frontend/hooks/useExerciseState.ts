import { useState, useCallback } from 'react'
import { DEFAULT_ATTEMPT_NUMBER } from '@/lib/constants/module'
import type { ExerciseMessage } from '@/types/exercise'

/**
 * Custom hook to manage UI state for exercise interactions
 * Handles temporary UI state like hints used, messages, active tabs, etc.
 */
export function useExerciseState() {
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(DEFAULT_ATTEMPT_NUMBER)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [exerciseMessages, setExerciseMessages] = useState<ExerciseMessage[]>([])
  const [activeTab, setActiveTab] = useState<'exercise' | 'editor'>('exercise')
  const [collapsedHints, setCollapsedHints] = useState<Set<string>>(new Set())
  const [showContinueButton, setShowContinueButton] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [justUnlockedExercise, setJustUnlockedExercise] = useState<number | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const toggleHintCollapse = useCallback((hintId: string) => {
    setCollapsedHints((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(hintId)) {
        newSet.delete(hintId)
      } else {
        newSet.add(hintId)
      }
      return newSet
    })
  }, [])

  const resetExerciseUIState = useCallback(() => {
    setCurrentAttemptNumber(DEFAULT_ATTEMPT_NUMBER)
    setShowCelebration(false)
    setJustUnlockedExercise(null)
    setCollapsedHints(new Set())
  }, [])

  return {
    // State
    currentAttemptNumber,
    hintsUsed,
    exerciseMessages,
    activeTab,
    collapsedHints,
    showContinueButton,
    showCelebration,
    justUnlockedExercise,
    showCompletionModal,
    // Setters
    setCurrentAttemptNumber,
    setHintsUsed,
    setExerciseMessages,
    setActiveTab,
    setShowContinueButton,
    setShowCelebration,
    setJustUnlockedExercise,
    setShowCompletionModal,
    // Actions
    toggleHintCollapse,
    resetExerciseUIState,
  }
}
