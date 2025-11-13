'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'
import ModuleErrorBoundary from '@/components/ModuleErrorBoundary'
import CompletionScreen from '@/components/CompletionScreen'
import MobileTabNavigation from '@/components/module/MobileTabNavigation'
import ModuleHeader from '@/components/module/ModuleHeader'
import ExerciseCard from '@/components/module/ExerciseCard'
import WorkspacePanel from '@/components/module/WorkspacePanel'
import { ModuleContext } from '@/contexts/ModuleContext'
import { useModuleProgress } from '@/hooks/useModuleProgress'
import { useExerciseState } from '@/hooks/useExerciseState'
import { useExerciseNavigation } from '@/hooks/useExerciseNavigation'
import {
  CELEBRATION_DURATION,
  UNLOCK_ANIMATION_DURATION,
  MOBILE_BREAKPOINT,
  DEFAULT_MAX_HINTS,
  UI_MESSAGES,
} from '@/lib/constants/module'
import { createSession } from '@/lib/api/sessions'
import type { HintResponse, SubmitResponse, AssessmentLevel } from '@/types/session'
import type { Exercise, ExerciseMessage } from '@/types/exercise'

interface Module {
  id: string
  topic: string
  skill_level: string
  status: string
  created_at: string
  domain?: string
  exercises?: Exercise[]
}

export default function ModulePage() {
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const hasInitialSyncRef = useRef(false)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  // Use custom hooks for state management
  const {
    currentAttemptNumber,
    hintsUsed,
    exerciseMessages,
    activeTab,
    collapsedHints,
    showContinueButton,
    showCelebration,
    justUnlockedExercise,
    showCompletionModal,
    setCurrentAttemptNumber,
    setHintsUsed,
    setExerciseMessages,
    setActiveTab,
    setShowContinueButton,
    setShowCelebration,
    setJustUnlockedExercise,
    setShowCompletionModal,
    toggleHintCollapse,
    resetExerciseUIState,
  } = useExerciseState()

  // Use custom hook for progress management with localStorage persistence
  const {
    completedExercises,
    exerciseResponses,
    exerciseHints,
    exerciseHintMessages,
    exerciseFeedbackMessages,
    exerciseAssessments,
    isLoading: isProgressLoading,
    completeExercise,
    saveResponse,
    saveHints,
    saveHintMessage,
    saveFeedbackMessage,
    saveAssessment,
  } = useModuleProgress(params.id as string)

  // Use custom hook for navigation
  const { advanceToNextExercise, navigateToExercise } = useExerciseNavigation({
    sessionId,
    currentExerciseIndex,
    totalExercises: module?.exercises?.length || 0,
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
  })

  // Fetch module data
  useEffect(() => {
    const fetchModule = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/modules/${params.id}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch module')
        }

        const data = await response.json()
        setModule(data)

        // Create a backend session for this module
        try {
          const newSession = await createSession(params.id as string)
          setSessionId(newSession.id)
        } catch (sessionErr) {
          console.error('Failed to create session:', sessionErr)
          // Continue without failing - we can still show the module
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchModule()
  }, [params.id, router, supabase])

  // Set current exercise index after module is loaded, based on completed exercises
  useEffect(() => {
    if (module && module.exercises && completedExercises.size > 0) {
      const maxCompleted = Math.max(...Array.from(completedExercises))
      const nextExercise = maxCompleted + 1
      const totalExercises = module.exercises.length

      // If all exercises are completed, show the last one
      // Otherwise, show the next incomplete exercise
      const targetIndex = nextExercise >= totalExercises ? totalExercises - 1 : nextExercise
      setCurrentExerciseIndex(targetIndex)
    }
  }, [module, completedExercises.size])

  // Sync current exercise index with backend when session becomes available
  useEffect(() => {
    if (sessionId && module && !hasInitialSyncRef.current) {
      // Only sync if we're not on the first exercise (backend defaults to 0)
      if (currentExerciseIndex > 0) {
        hasInitialSyncRef.current = true
        import('@/lib/api/sessions').then(({ updateSessionExerciseIndex }) => {
          updateSessionExerciseIndex(sessionId, currentExerciseIndex).catch((error) => {
            console.error('Failed to sync exercise index on load:', error)
          })
        })
      } else {
        // Mark as synced even if we didn't need to update (already at 0)
        hasInitialSyncRef.current = true
      }
    }
  }, [sessionId, module, currentExerciseIndex])

  // Restore hints, hint messages, and feedback messages when current exercise changes
  useEffect(() => {
    const savedHints = exerciseHints.get(currentExerciseIndex) || 0
    setHintsUsed(savedHints)

    const savedHintMessages = exerciseHintMessages.get(currentExerciseIndex) || []
    const savedFeedbackMessages = exerciseFeedbackMessages.get(currentExerciseIndex) || []

    // Combine hint and feedback messages, sorted by timestamp
    const allMessages = [...savedHintMessages, ...savedFeedbackMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    setExerciseMessages(allMessages)
  }, [currentExerciseIndex, exerciseHints, exerciseHintMessages, exerciseFeedbackMessages])

  const currentExercise = module?.exercises?.[currentExerciseIndex]
  const totalExercises = module?.exercises?.length || 0
  const maxHints = currentExercise?.hints?.length || DEFAULT_MAX_HINTS

  // Handle hint received
  const handleHintReceived = useCallback(
    (response: HintResponse) => {
      const newMessage: ExerciseMessage = {
        id: `hint-${Date.now()}`,
        type: 'hint',
        content: response.hint_text,
        timestamp: new Date(),
      }

      setExerciseMessages((prev) => [...prev, newMessage])
      setHintsUsed(response.hint_level)

      // Persist hints used for this exercise
      saveHints(currentExerciseIndex, response.hint_level)

      // Persist hint messages for this exercise
      saveHintMessage(currentExerciseIndex, newMessage)

      // Switch to editor tab on mobile to show hint
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setActiveTab('editor')
      }
    },
    [
      currentExerciseIndex,
      saveHints,
      saveHintMessage,
      setExerciseMessages,
      setHintsUsed,
      setActiveTab,
    ]
  )

  // Handle submission success
  const handleSubmitSuccess = useCallback(
    (response: SubmitResponse, submittedAnswer: string) => {
      const newMessage: ExerciseMessage = {
        id: `feedback-${Date.now()}`,
        type: 'feedback',
        content: response.feedback,
        timestamp: new Date(),
        assessment: response.assessment,
        attemptNumber: currentAttemptNumber,
      }

      // Replace old feedback with new feedback (keep only hints)
      setExerciseMessages((prev) => [...prev.filter((msg) => msg.type === 'hint'), newMessage])

      // Save the submitted answer (for all submissions, not just successful ones)
      if (submittedAnswer.trim()) {
        saveResponse(currentExerciseIndex, submittedAnswer)
      }

      // Save the feedback message for this exercise
      saveFeedbackMessage(currentExerciseIndex, newMessage)

      // Save the assessment for this exercise
      saveAssessment(currentExerciseIndex, response.assessment)

      // Show Continue button after first submission
      setShowContinueButton(true)

      // Show celebration animation for strong performance
      if (response.assessment === 'strong' && currentExerciseIndex < totalExercises - 1) {
        setShowCelebration(true)
        setJustUnlockedExercise(currentExerciseIndex + 1)

        // Hide celebration after delay
        setTimeout(() => {
          setShowCelebration(false)
        }, CELEBRATION_DURATION)

        // Clear unlock animation after delay
        setTimeout(() => {
          setJustUnlockedExercise(null)
        }, UNLOCK_ANIMATION_DURATION)
      }

      // Increment attempt number to track all submissions
      // (resets when navigating to next exercise via resetExerciseUIState)
      setCurrentAttemptNumber((prev) => prev + 1)

      // Switch to exercise tab on mobile to show feedback
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setActiveTab('exercise')
      }
    },
    [
      currentAttemptNumber,
      currentExerciseIndex,
      totalExercises,
      saveResponse,
      saveFeedbackMessage,
      saveAssessment,
      setExerciseMessages,
      setShowContinueButton,
      setShowCelebration,
      setJustUnlockedExercise,
      setCurrentAttemptNumber,
      setActiveTab,
    ]
  )

  const handleCompleteModule = useCallback(() => {
    // Mark current exercise as completed before showing completion modal
    completeExercise(currentExerciseIndex)
    setShowCompletionModal(true)
  }, [currentExerciseIndex, completeExercise, setShowCompletionModal])

  const handleStreamingUpdate = useCallback(
    (feedback: string, isComplete: boolean, assessment?: AssessmentLevel) => {
      // Find or create a streaming feedback message
      setExerciseMessages((prev) => {
        const streamingId = `streaming-feedback-${currentExerciseIndex}`
        const existingStreamingIndex = prev.findIndex((msg) => msg.id === streamingId)

        if (!isComplete) {
          // Update or create streaming message
          const streamingMessage: ExerciseMessage = {
            id: streamingId,
            type: 'feedback',
            content: feedback,
            timestamp: new Date(),
            assessment: assessment, // undefined during streaming
            attemptNumber: currentAttemptNumber,
            isStreaming: true,
          }

          if (existingStreamingIndex >= 0) {
            // Update existing streaming message
            const newMessages = [...prev]
            newMessages[existingStreamingIndex] = streamingMessage
            return newMessages
          } else {
            // Create new streaming message (remove old feedback, keep hints)
            return [...prev.filter((msg) => msg.type === 'hint'), streamingMessage]
          }
        } else {
          // Streaming complete - replace streaming message with final one
          const finalMessage: ExerciseMessage = {
            id: `feedback-${Date.now()}`,
            type: 'feedback',
            content: feedback,
            timestamp: new Date(),
            assessment: assessment,
            attemptNumber: currentAttemptNumber,
            isStreaming: false,
          }

          return [
            ...prev.filter((msg) => msg.type === 'hint' || msg.id !== streamingId),
            finalMessage,
          ]
        }
      })
    },
    [currentExerciseIndex, currentAttemptNumber]
  )

  const handleCloseCompletionModal = useCallback(() => {
    setShowCompletionModal(false)
  }, [setShowCompletionModal])

  if (loading || isProgressLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-cream-100">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            <p className="mt-3 text-sm text-gray-600">{UI_MESSAGES.loading}</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-cream-100">
          <div className="text-center">
            <div className="rounded-lg bg-red-50 p-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => router.push('/module')}
              className="mt-6 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600"
            >
              Back to Module
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!module) {
    return null
  }

  const contextValue = {
    // Module data
    sessionId,
    exercises: module?.exercises || [],
    currentExercise: currentExercise || null,
    currentExerciseIndex,
    totalExercises,

    // Exercise state
    hintsUsed,
    maxHints,
    exerciseMessages,
    collapsedHints,
    showCelebration,
    showContinueButton,
    justUnlockedExercise,
    activeTab,

    // Progress state
    completedExercises,
    exerciseResponses,
    exerciseAssessments,

    // Actions
    handleHintReceived,
    handleSubmitSuccess,
    handleStreamingUpdate,
    toggleHintCollapse,
    advanceToNextExercise,
    handleCompleteModule,
    navigateToExercise,
    setActiveTab,
  }

  return (
    <ProtectedRoute>
      <ModuleErrorBoundary moduleId={params.id as string}>
        <ModuleContext.Provider value={contextValue}>
          {/* Completion Modal - rendered first so it overlays */}
          {showCompletionModal && (
            <CompletionScreen
              moduleTopic={module.topic}
              moduleDomain={module.domain}
              sessionId={sessionId}
              isOpen={showCompletionModal}
              onClose={handleCloseCompletionModal}
            />
          )}

          <div className="bg-dark min-h-screen">
            {/* Mobile Tab Navigation */}
            <MobileTabNavigation />

            {/* Header with Back Button and Badges */}
            <ModuleHeader
              topic={module.topic}
              skillLevel={module.skill_level}
              domain={module.domain}
              onBackClick={() => router.push('/')}
            />

            {/* Split-screen layout */}
            <main className="flex h-[calc(100vh-60px)] overflow-hidden">
              {/* Left Panel - Exercise Card (40%) */}
              <ExerciseCard />

              {/* Right Panel - Workspace (60%) */}
              <WorkspacePanel />
            </main>
          </div>
        </ModuleContext.Provider>
      </ModuleErrorBoundary>
    </ProtectedRoute>
  )
}
