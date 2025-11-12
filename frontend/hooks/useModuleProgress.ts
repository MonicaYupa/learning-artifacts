import { useState, useEffect, useCallback } from 'react'
import { useDebouncedEffect } from '@/hooks/useDebounce'
import type { ExerciseMessage, ModuleProgress } from '@/types/exercise'

interface UseModuleProgressReturn {
  completedExercises: Set<number>
  exerciseResponses: Map<number, string>
  exerciseHints: Map<number, number>
  exerciseHintMessages: Map<number, ExerciseMessage[]>
  exerciseFeedbackMessages: Map<number, ExerciseMessage[]>
  exerciseAssessments: Map<number, 'strong' | 'developing' | 'needs_support'>
  isLoading: boolean
  completeExercise: (index: number) => void
  saveResponse: (index: number, response: string) => void
  saveHints: (index: number, hintsUsed: number) => void
  saveHintMessage: (index: number, message: ExerciseMessage) => void
  saveFeedbackMessage: (index: number, message: ExerciseMessage) => void
  saveAssessment: (index: number, assessment: 'strong' | 'developing' | 'needs_support') => void
}

/**
 * Custom hook to manage module progress with localStorage persistence
 * @param moduleId - The ID of the module to track progress for
 * @returns Object containing progress state and updater functions
 */
export function useModuleProgress(moduleId: string | string[]): UseModuleProgressReturn {
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  const [exerciseResponses, setExerciseResponses] = useState<Map<number, string>>(new Map())
  const [exerciseHints, setExerciseHints] = useState<Map<number, number>>(new Map())
  const [exerciseHintMessages, setExerciseHintMessages] = useState<Map<number, ExerciseMessage[]>>(
    new Map()
  )
  const [exerciseFeedbackMessages, setExerciseFeedbackMessages] = useState<
    Map<number, ExerciseMessage[]>
  >(new Map())
  const [exerciseAssessments, setExerciseAssessments] = useState<
    Map<number, 'strong' | 'developing' | 'needs_support'>
  >(new Map())
  const [isLoading, setIsLoading] = useState(true)

  // Convert moduleId to string if it's an array (from useParams)
  const storageKey = `module_${Array.isArray(moduleId) ? moduleId[0] : moduleId}_progress`

  // Load progress from localStorage on mount
  useEffect(() => {
    if (!moduleId) return

    const saved = localStorage.getItem(storageKey)

    if (saved) {
      try {
        const progress: ModuleProgress = JSON.parse(saved)

        if (progress.completedExercises && Array.isArray(progress.completedExercises)) {
          setCompletedExercises(new Set(progress.completedExercises))
        }

        if (progress.exerciseResponses) {
          setExerciseResponses(
            new Map(Object.entries(progress.exerciseResponses).map(([k, v]) => [Number(k), v]))
          )
        }

        if (progress.exerciseHints) {
          setExerciseHints(
            new Map(Object.entries(progress.exerciseHints).map(([k, v]) => [Number(k), v]))
          )
        }

        if (progress.exerciseHintMessages) {
          setExerciseHintMessages(
            new Map(
              Object.entries(progress.exerciseHintMessages).map(([k, v]) => [
                Number(k),
                v as ExerciseMessage[],
              ])
            )
          )
        }

        if (progress.exerciseFeedbackMessages) {
          setExerciseFeedbackMessages(
            new Map(
              Object.entries(progress.exerciseFeedbackMessages).map(([k, v]) => [
                Number(k),
                v as ExerciseMessage[],
              ])
            )
          )
        }

        if (progress.exerciseAssessments) {
          setExerciseAssessments(
            new Map(
              Object.entries(progress.exerciseAssessments).map(([k, v]) => [
                Number(k),
                v as 'strong' | 'developing' | 'needs_support',
              ])
            )
          )
        }
      } catch (err) {
        console.error('Failed to load saved progress:', err)
      }
    }

    setIsLoading(false)
  }, [moduleId, storageKey])

  // Save progress to localStorage whenever state changes (debounced to prevent excessive writes)
  // Using 500ms debounce to batch rapid state changes (e.g., multiple hints in quick succession)
  useDebouncedEffect(
    () => {
      if (isLoading || !moduleId) return

      const dataToSave: ModuleProgress = {
        completedExercises: Array.from(completedExercises),
        exerciseResponses: Object.fromEntries(exerciseResponses),
        exerciseHints: Object.fromEntries(exerciseHints),
        exerciseHintMessages: Object.fromEntries(exerciseHintMessages),
        exerciseFeedbackMessages: Object.fromEntries(exerciseFeedbackMessages),
        exerciseAssessments: Object.fromEntries(exerciseAssessments),
      }

      localStorage.setItem(storageKey, JSON.stringify(dataToSave))
    },
    500, // Debounce delay in milliseconds
    [
      moduleId,
      completedExercises,
      exerciseResponses,
      exerciseHints,
      exerciseHintMessages,
      exerciseFeedbackMessages,
      exerciseAssessments,
      isLoading,
      storageKey,
    ]
  )

  // Updater functions
  const completeExercise = useCallback((index: number) => {
    setCompletedExercises((prev) => new Set([...prev, index]))
  }, [])

  const saveResponse = useCallback((index: number, response: string) => {
    setExerciseResponses((prev) => {
      const newMap = new Map(prev)
      newMap.set(index, response)
      return newMap
    })
  }, [])

  const saveHints = useCallback((index: number, hintsUsed: number) => {
    setExerciseHints((prev) => {
      const newMap = new Map(prev)
      newMap.set(index, hintsUsed)
      return newMap
    })
  }, [])

  const saveHintMessage = useCallback((index: number, message: ExerciseMessage) => {
    setExerciseHintMessages((prev) => {
      const newMap = new Map(prev)
      const currentMessages = newMap.get(index) || []
      newMap.set(index, [...currentMessages, message])
      return newMap
    })
  }, [])

  const saveFeedbackMessage = useCallback((index: number, message: ExerciseMessage) => {
    setExerciseFeedbackMessages((prev) => {
      const newMap = new Map(prev)
      // Replace old feedback with new feedback (only keep the latest)
      newMap.set(index, [message])
      return newMap
    })
  }, [])

  const saveAssessment = useCallback(
    (index: number, assessment: 'strong' | 'developing' | 'needs_support') => {
      setExerciseAssessments((prev) => {
        const newMap = new Map(prev)
        newMap.set(index, assessment)
        return newMap
      })
    },
    []
  )

  return {
    completedExercises,
    exerciseResponses,
    exerciseHints,
    exerciseHintMessages,
    exerciseFeedbackMessages,
    exerciseAssessments,
    isLoading,
    completeExercise,
    saveResponse,
    saveHints,
    saveHintMessage,
    saveFeedbackMessage,
    saveAssessment,
  }
}
