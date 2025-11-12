'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'
import ModuleErrorBoundary from '@/components/ModuleErrorBoundary'
import HintSystem from '@/components/HintSystem'
import FeedbackDisplay from '@/components/FeedbackDisplay'
import AnswerSubmission from '@/components/AnswerSubmission'
import CompletionScreen from '@/components/CompletionScreen'
import AnalysisExercise from '@/components/exercises/AnalysisExercise'
import ComparativeExercise from '@/components/exercises/ComparativeExercise'
import FrameworkExercise from '@/components/exercises/FrameworkExercise'
import ExerciseProgressNavigator from '@/components/ExerciseProgressNavigator'
import CelebrationConfetti from '@/components/CelebrationConfetti'
import { useModuleProgress } from '@/hooks/useModuleProgress'
import type { HintResponse, SubmitResponse } from '@/types/session'
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
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(1)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [exerciseMessages, setExerciseMessages] = useState<ExerciseMessage[]>([])
  const [sessionId] = useState(`session-${Date.now()}`) // TODO: Get from backend
  const [activeTab, setActiveTab] = useState<'exercise' | 'editor'>('exercise')
  const [collapsedHints, setCollapsedHints] = useState<Set<string>>(new Set())
  const editorPanelRef = useRef<HTMLDivElement>(null)

  // Continue button and unlock notification state
  const [showContinueButton, setShowContinueButton] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [lastAssessment, setLastAssessment] = useState<
    'strong' | 'developing' | 'needs_support' | null
  >(null)
  const [justUnlockedExercise, setJustUnlockedExercise] = useState<number | null>(null)

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  // Use custom hook for progress management with localStorage persistence
  const {
    completedExercises,
    exerciseResponses,
    exerciseHints,
    exerciseHintMessages,
    exerciseAssessments,
    isLoading: isProgressLoading,
    completeExercise,
    saveResponse,
    saveHints,
    saveHintMessage,
    saveAssessment,
  } = useModuleProgress(params.id as string)

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
      if (nextExercise >= totalExercises) {
        setCurrentExerciseIndex(totalExercises - 1)
      } else {
        setCurrentExerciseIndex(nextExercise)
      }
    }
  }, [module, completedExercises.size]) // Only run when module loads or completedExercises size changes

  // Restore hints and hint messages when current exercise changes
  useEffect(() => {
    const savedHints = exerciseHints.get(currentExerciseIndex) || 0
    setHintsUsed(savedHints)

    const savedHintMessages = exerciseHintMessages.get(currentExerciseIndex) || []
    // Only update exercise messages if they are currently empty or only contain hints
    // This prevents overwriting feedback messages when advancing to next exercise
    setExerciseMessages((prev) => {
      const hasFeedback = prev.some((msg) => msg.type === 'feedback')
      return hasFeedback ? prev : savedHintMessages
    })
  }, [currentExerciseIndex, exerciseHints, exerciseHintMessages])

  const currentExercise = module?.exercises?.[currentExerciseIndex]
  const totalExercises = module?.exercises?.length || 0
  const maxHints = currentExercise?.hints?.length || 3

  // Handle hint received
  const handleHintReceived = useCallback(
    (response: HintResponse) => {
      const newMessage: ExerciseMessage = {
        id: `hint-${Date.now()}`,
        type: 'hint',
        content: response.hint,
        timestamp: new Date(),
      }

      setExerciseMessages((prev) => [...prev, newMessage])
      setHintsUsed(response.hint_level)

      // Persist hints used for this exercise
      saveHints(currentExerciseIndex, response.hint_level)

      // Persist hint messages for this exercise
      saveHintMessage(currentExerciseIndex, newMessage)

      // Switch to editor tab on mobile to show hint
      if (window.innerWidth < 640) {
        setActiveTab('editor')
      }

      // Scroll to the new hint after a short delay to ensure it's rendered
      setTimeout(() => {
        if (editorPanelRef.current) {
          editorPanelRef.current.scrollTo({
            top: editorPanelRef.current.scrollHeight,
            behavior: 'smooth',
          })
        }
      }, 100)
    },
    [currentExerciseIndex]
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
        modelAnswer: response.model_answer,
      }

      // Replace old feedback with new feedback (keep only hints)
      setExerciseMessages((prev) => [...prev.filter((msg) => msg.type === 'hint'), newMessage])

      // Save the submitted answer (for all submissions, not just successful ones)
      if (submittedAnswer.trim()) {
        saveResponse(currentExerciseIndex, submittedAnswer)
      }

      // Save the assessment quality for celebration UI
      setLastAssessment(response.assessment)

      // Save the assessment for this exercise
      saveAssessment(currentExerciseIndex, response.assessment)

      // Show Continue button after first submission
      setShowContinueButton(true)

      // Show celebration animation if next exercise should be unlocked
      if (response.should_advance && currentExerciseIndex < totalExercises - 1) {
        setShowCelebration(true)
        setJustUnlockedExercise(currentExerciseIndex + 1)

        // Hide celebration after 3 seconds
        setTimeout(() => {
          setShowCelebration(false)
        }, 3000)

        // Clear unlock animation after 2 seconds
        setTimeout(() => {
          setJustUnlockedExercise(null)
        }, 2000)
      }

      // If should advance but user doesn't click Continue, allow retry
      if (!response.should_advance) {
        // Increment attempt number for retry
        setCurrentAttemptNumber((prev) => prev + 1)
      }

      // Switch to exercise tab on mobile to show feedback
      if (window.innerWidth < 640) {
        setActiveTab('exercise')
      }
    },
    [currentAttemptNumber, currentExerciseIndex, totalExercises]
  )

  const advanceToNextExercise = () => {
    // Mark current exercise as completed before advancing
    completeExercise(currentExerciseIndex)

    if (currentExerciseIndex < totalExercises - 1) {
      // Move to next exercise
      setCurrentExerciseIndex((prev) => prev + 1)
      resetExerciseState()
    } else {
      // Module complete - show completion modal
      setShowCompletionModal(true)
    }
  }

  const navigateToExercise = (exerciseIndex: number) => {
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
  }

  const resetExerciseState = (exerciseIndex?: number) => {
    const targetExercise = exerciseIndex !== undefined ? exerciseIndex : currentExerciseIndex

    setCurrentAttemptNumber(1)

    // Restore hints used for this exercise from persisted data
    const savedHints = exerciseHints.get(targetExercise) || 0
    setHintsUsed(savedHints)

    // Restore hint messages for this exercise
    const savedHintMessages = exerciseHintMessages.get(targetExercise) || []
    setExerciseMessages(savedHintMessages)

    // Reset UI state
    setShowContinueButton(false)
    setShowCelebration(false)
    setLastAssessment(null)
    setJustUnlockedExercise(null)
    setCollapsedHints(new Set())
  }

  const toggleHintCollapse = (hintId: string) => {
    setCollapsedHints((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(hintId)) {
        newSet.delete(hintId)
      } else {
        newSet.add(hintId)
      }
      return newSet
    })
  }

  const renderExercise = (exercise: Exercise) => {
    return (
      <div className="space-y-4 sm:space-y-5">
        {exercise.type === 'analysis' && exercise.material && (
          <AnalysisExercise prompt={exercise.prompt} material={exercise.material} />
        )}

        {exercise.type === 'comparative' && exercise.options && (
          <ComparativeExercise prompt={exercise.prompt} options={exercise.options} />
        )}

        {exercise.type === 'framework' && (
          <FrameworkExercise
            prompt={exercise.prompt}
            scaffold={exercise.scaffold}
            material={exercise.material}
          />
        )}
      </div>
    )
  }

  if (loading || isProgressLoading) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-cream-100">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            <p className="mt-3 text-sm text-gray-600">Loading module...</p>
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

  return (
    <ProtectedRoute>
      <ModuleErrorBoundary moduleId={params.id as string}>
        {/* Completion Modal - rendered first so it overlays */}
        {showCompletionModal && module && module.exercises && (
          <CompletionScreen
            moduleId={module.id}
            moduleTitle={module.topic?.replace(/_/g, ' ') || 'Module'}
            moduleTopic={module.topic}
            moduleDomain={module.domain}
            sessionId={sessionId}
            exercises={module.exercises.map((ex) => ({
              id: ex.id,
              name: ex.name,
              type: ex.type,
            }))}
            isOpen={showCompletionModal}
            onClose={() => setShowCompletionModal(false)}
          />
        )}

        <div className="bg-dark min-h-screen">
          {/* Mobile Tab Navigation */}
          <nav
            className="border-b border-neutral-700 bg-neutral-850 sm:hidden"
            aria-label="Exercise navigation"
          >
            <div className="flex" role="tablist">
              <button
                onClick={() => setActiveTab('exercise')}
                role="tab"
                aria-selected={activeTab === 'exercise'}
                aria-controls="exercise-panel"
                className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'exercise'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Exercise
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                role="tab"
                aria-selected={activeTab === 'editor'}
                aria-controls="editor-panel"
                className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'editor'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Workspace
              </button>
            </div>
          </nav>

          {/* Header with Back Button and Badges */}
          <div className="bg-dark border-b border-neutral-700 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <button
                onClick={() => {
                  // Set flag to scroll to bottom when returning to chat
                  sessionStorage.setItem('scrollToBottom', 'true')
                  router.push('/')
                }}
                className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-3 py-2 text-neutral-400 transition-all hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
                aria-label="Back to chat"
              >
                <span className="absolute inset-0 scale-0 rounded-xl bg-gradient-to-r from-neutral-700 to-neutral-600 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"></span>
                <svg
                  className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="relative z-10 text-sm font-medium">Chat</span>
              </button>

              {/* Topic and Level Badges */}
              {module && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary-300 bg-gradient-to-r from-primary-100 to-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {module.skill_level.charAt(0).toUpperCase() + module.skill_level.slice(1)}
                    </span>
                  </span>
                  {module.topic && (
                    <span className="rounded-full border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-neutral-200">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                          <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                        </svg>
                        {module.topic.replace(/_/g, ' ')}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Split-screen layout */}
          <main className="flex h-[calc(100vh-60px)] overflow-hidden">
            {/* Left Panel - Exercise Card (40%) */}
            <div
              id="exercise-panel"
              role="tabpanel"
              aria-labelledby="exercise-tab"
              className={`bg-dark flex w-full flex-col p-4 sm:w-2/5 sm:p-6 lg:p-8 ${activeTab === 'exercise' ? 'block' : 'hidden sm:flex'}`}
            >
              {module && currentExercise && (
                <div className="animate-fadeInUp mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-cream-200/80 bg-cream-50 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35),0_15px_30px_-10px_rgba(0,0,0,0.25),0_0_0_1px_rgba(217,119,87,0.05)] transition-shadow duration-300 hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.4),0_20px_40px_-10px_rgba(0,0,0,0.3),0_0_0_1px_rgba(217,119,87,0.1)]">
                  {/* Card Header */}
                  <div className="frosted-glass flex-shrink-0 bg-gradient-to-b from-cream-100/70 via-cream-50/40 to-transparent px-5 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4 lg:px-8 lg:pt-8 lg:pb-4">
                    {/* Exercise Name */}
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl lg:text-3xl">
                        {currentExercise.name || `Exercise ${currentExerciseIndex + 1}`}
                      </h2>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="smooth-scroll relative flex-1 overflow-y-auto">
                    <div className="space-y-4 px-5 pt-3 pb-5 sm:space-y-5 sm:px-6 sm:pt-4 sm:pb-6 lg:px-8 lg:pt-4 lg:pb-8">
                      {/* Current Exercise */}
                      <div className="space-y-4">{renderExercise(currentExercise)}</div>

                      {!currentExercise && (
                        <div className="rounded-xl border-2 border-dashed border-cream-300 bg-cream-100 p-6">
                          <div className="flex items-start space-x-3">
                            <svg
                              className="h-6 w-6 flex-shrink-0 text-neutral-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-neutral-800">
                                Loading exercises...
                              </p>
                              <p className="mt-1 text-sm text-neutral-600">
                                Your personalized exercises will appear here shortly.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Progress Navigator - At bottom of card */}
                  <ExerciseProgressNavigator
                    exercises={module?.exercises || []}
                    currentExerciseIndex={currentExerciseIndex}
                    completedExercises={completedExercises}
                    exerciseAssessments={exerciseAssessments}
                    justUnlockedExercise={justUnlockedExercise}
                    onNavigate={navigateToExercise}
                  />
                </div>
              )}
            </div>

            {/* Right Panel - Editor (60%) */}
            <div
              id="editor-panel"
              role="tabpanel"
              aria-labelledby="editor-tab"
              className={`bg-dark flex w-full flex-col sm:w-3/5 ${activeTab === 'editor' ? 'block' : 'hidden sm:flex'}`}
            >
              <div ref={editorPanelRef} className="flex h-full flex-col overflow-y-auto p-4 sm:p-8">
                {/* Answer Submission */}
                <div className="mb-3 sm:mb-4">
                  <AnswerSubmission
                    key={`exercise-${currentExerciseIndex}`}
                    sessionId={sessionId}
                    hintsUsed={hintsUsed}
                    onSubmitSuccess={handleSubmitSuccess}
                    initialAnswer={exerciseResponses.get(currentExerciseIndex) || ''}
                    renderFeedback={() => (
                      <>
                        {exerciseMessages.length > 0 && (
                          <div className="relative mb-4 space-y-3 sm:mb-6">
                            {/* Celebration Animation Overlay - appears over feedback */}
                            <CelebrationConfetti show={showCelebration} />

                            {exerciseMessages.map((message, idx) => (
                              <div
                                key={message.id}
                                className={`animate-fadeInUp stagger-${Math.min(idx + 1, 5)}`}
                              >
                                {message.type === 'feedback' && (
                                  <div className="ring-2 ring-primary-400/20 rounded-lg">
                                    <FeedbackDisplay
                                      assessment={message.assessment!}
                                      feedback={message.content}
                                      attemptNumber={message.attemptNumber!}
                                      modelAnswer={message.modelAnswer}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    renderSubmitButton={(submitProps) => (
                      <div className="flex flex-col gap-3">
                        {/* Button Row */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          {/* Hint Button - Left */}
                          <HintSystem
                            sessionId={sessionId}
                            currentHintLevel={hintsUsed}
                            maxHints={maxHints}
                            onHintReceived={handleHintReceived}
                            renderHintButton={(hintProps) => (
                              <button
                                onClick={hintProps.onClick}
                                disabled={hintProps.disabled}
                                aria-label={
                                  hintProps.allHintsUsed
                                    ? 'All hints used'
                                    : `Request hint ${hintProps.currentHintLevel + 1} of ${hintProps.maxHints}`
                                }
                                className="w-full rounded-lg border-2 border-neutral-600 bg-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition-all hover:bg-neutral-600 active:bg-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-neutral-700 sm:w-auto sm:px-6"
                              >
                                <span className="flex items-center justify-center gap-2">
                                  {hintProps.isLoading ? (
                                    <>
                                      <svg
                                        className="h-4 w-4 animate-spin"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                      <span>Loading...</span>
                                    </>
                                  ) : hintProps.allHintsUsed ? (
                                    <>
                                      <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      <span>All Hints Used</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                        />
                                      </svg>
                                      <span>Hint</span>
                                      {hintProps.currentHintLevel > 0 && (
                                        <span className="text-xs">
                                          ({hintProps.currentHintLevel}/{hintProps.maxHints})
                                        </span>
                                      )}
                                    </>
                                  )}
                                </span>
                              </button>
                            )}
                          />

                          {/* Submit and Continue buttons grouped on the right */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
                            {/* Submit Button */}
                            <button
                              onClick={submitProps.onClick}
                              disabled={submitProps.disabled}
                              aria-label={`${showContinueButton ? 'Resubmit' : 'Submit'} answer ${submitProps.isSubmitting ? '(submitting...)' : ''}`}
                              className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 hover:shadow-md active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-500 disabled:hover:shadow-sm sm:w-auto sm:px-6"
                            >
                              <span className="flex items-center justify-center gap-2">
                                {submitProps.isSubmitting ? (
                                  <>
                                    <svg
                                      className="h-4 w-4 animate-spin"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    <span>Submitting...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="h-5 w-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                    <span>{showContinueButton ? 'Resubmit' : 'Submit'}</span>
                                  </>
                                )}
                              </span>
                            </button>

                            {/* Continue Button - Shows after first submission */}
                            {showContinueButton && (
                              <button
                                onClick={() => {
                                  if (currentExerciseIndex < totalExercises - 1) {
                                    advanceToNextExercise()
                                  } else {
                                    // Last exercise - show completion modal
                                    setShowCompletionModal(true)
                                  }
                                }}
                                className="animate-fadeInUp w-full rounded-lg border-2 border-primary-500 bg-primary-500/10 px-4 py-2.5 text-sm font-medium text-primary-400 shadow-sm transition-all hover:border-primary-500 hover:bg-primary-500 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-800 sm:w-auto sm:px-6"
                              >
                                <span className="flex items-center justify-center gap-2">
                                  {currentExerciseIndex < totalExercises - 1 ? (
                                    <>
                                      <span>Continue</span>
                                      <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        />
                                      </svg>
                                    </>
                                  ) : (
                                    <>
                                      <span>Complete</span>
                                      <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </>
                                  )}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Hints Display - Below answer submission */}
                {exerciseMessages.some((msg) => msg.type === 'hint') && (
                  <div className="mb-3 space-y-3 sm:mb-4">
                    {exerciseMessages.map(
                      (message, idx) =>
                        message.type === 'hint' && (
                          <div
                            key={message.id}
                            className={`animate-fadeInUp stagger-${Math.min(idx + 1, 5)}`}
                          >
                            <div
                              className="rounded-lg border border-primary-500/30 bg-neutral-800 focus-within:ring-2 focus-within:ring-primary-500/50"
                              role="region"
                              aria-label="Hint message"
                            >
                              <button
                                onClick={() => toggleHintCollapse(message.id)}
                                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-neutral-750 focus:outline-none"
                                aria-expanded={!collapsedHints.has(message.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="rounded-full bg-primary-500/20 p-1.5">
                                    <svg
                                      className="h-4 w-4 text-primary-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                      />
                                    </svg>
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-wide text-primary-400">
                                    Hint
                                  </span>
                                </div>
                                <svg
                                  className={`h-5 w-5 text-neutral-400 transition-transform ${collapsedHints.has(message.id) ? '' : 'rotate-180'}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                              {!collapsedHints.has(message.id) && (
                                <div className="px-4 pb-4">
                                  <p className="text-sm leading-relaxed text-neutral-200">
                                    {message.content}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </ModuleErrorBoundary>
    </ProtectedRoute>
  )
}
