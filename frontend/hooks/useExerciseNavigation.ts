import { useCallback } from 'react'
import type { ExerciseMessage } from '@/types/exercise'

interface UseExerciseNavigationProps {
  currentExerciseIndex: number
  totalExercises: number
  completedExercises: Set<number>
  exerciseHints: Map<number, number>
  exerciseHintMessages: Map<number, ExerciseMessage[]>
  exerciseFeedbackMessages: Map<number, ExerciseMessage[]>
  setCurrentExerciseIndex: (index: number) => void
  setHintsUsed: (hints: number) => void
  setExerciseMessages: (messages: ExerciseMessage[]) => void
  setShowContinueButton: (show: boolean) => void
  resetExerciseUIState: () => void
  setShowCompletionModal: (show: boolean) => void
  completeExercise: (index: number) => void
}

/**
 * Custom hook to manage exercise navigation and state resets
 * Handles moving between exercises and resetting state appropriately
 */
export function useExerciseNavigation({
  currentExerciseIndex,
  totalExercises,
  completedExercises,
  exerciseHints,
  exerciseHintMessages,
  exerciseFeedbackMessages,
  setCurrentExerciseIndex,
  setHintsUsed,
  setExerciseMessages,
  setShowContinueButton,
  resetExerciseUIState,
  setShowCompletionModal,
  completeExercise,
}: UseExerciseNavigationProps) {
  /**
   * Reset exercise state when navigating to a different exercise
   */
  const resetExerciseState = useCallback(
    (exerciseIndex?: number) => {
      const targetExercise = exerciseIndex !== undefined ? exerciseIndex : currentExerciseIndex

      // Restore hints used for this exercise from persisted data
      const savedHints = exerciseHints.get(targetExercise) || 0
      setHintsUsed(savedHints)

      // Restore hint messages and feedback messages for this exercise
      const savedHintMessages = exerciseHintMessages.get(targetExercise) || []
      const savedFeedbackMessages = exerciseFeedbackMessages.get(targetExercise) || []

      // Combine and sort messages by timestamp
      const allMessages = [...savedHintMessages, ...savedFeedbackMessages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      setExerciseMessages(allMessages)

      // Show continue button if there is saved feedback
      setShowContinueButton(savedFeedbackMessages.length > 0)

      // Reset UI state
      resetExerciseUIState()
    },
    [
      currentExerciseIndex,
      exerciseHints,
      exerciseHintMessages,
      exerciseFeedbackMessages,
      setHintsUsed,
      setExerciseMessages,
      setShowContinueButton,
      resetExerciseUIState,
    ]
  )

  /**
   * Advance to the next exercise or show completion modal
   */
  const advanceToNextExercise = useCallback(() => {
    // Mark current exercise as completed before advancing
    completeExercise(currentExerciseIndex)

    if (currentExerciseIndex < totalExercises - 1) {
      // Move to next exercise
      const nextExerciseIndex = currentExerciseIndex + 1
      setCurrentExerciseIndex(nextExerciseIndex)
      resetExerciseState(nextExerciseIndex)
    } else {
      // Module complete - show completion modal
      setShowCompletionModal(true)
    }
  }, [
    currentExerciseIndex,
    totalExercises,
    completeExercise,
    setCurrentExerciseIndex,
    resetExerciseState,
    setShowCompletionModal,
  ])

  /**
   * Navigate to a specific exercise (if unlocked)
   */
  const navigateToExercise = useCallback(
    (exerciseIndex: number) => {
      // Check if exercise is unlocked (completed, current, or next in sequence)
      const isCompleted = completedExercises.has(exerciseIndex)
      const isCurrent = exerciseIndex === currentExerciseIndex
      const isPreviousCompleted = exerciseIndex > 0 && completedExercises.has(exerciseIndex - 1)
      const isUnlocked = isCompleted || isCurrent || isPreviousCompleted

      if (!isUnlocked) {
        return // Exercise is locked
      }

      // Navigate to selected exercise
      setCurrentExerciseIndex(exerciseIndex)
      resetExerciseState(exerciseIndex)
    },
    [completedExercises, currentExerciseIndex, setCurrentExerciseIndex, resetExerciseState]
  )

  /**
   * Check if an exercise is unlocked
   */
  const isExerciseUnlocked = useCallback(
    (exerciseIndex: number) => {
      const isCompleted = completedExercises.has(exerciseIndex)
      const isCurrent = exerciseIndex === currentExerciseIndex
      const isPreviousCompleted = exerciseIndex > 0 && completedExercises.has(exerciseIndex - 1)
      return isCompleted || isCurrent || isPreviousCompleted
    },
    [completedExercises, currentExerciseIndex]
  )

  return {
    resetExerciseState,
    advanceToNextExercise,
    navigateToExercise,
    isExerciseUnlocked,
  }
}
