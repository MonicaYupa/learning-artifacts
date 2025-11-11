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
import type { HintResponse, SubmitResponse } from '@/types/session'

interface Exercise {
  id: string
  name: string
  type: 'analysis' | 'comparative' | 'framework'
  prompt: string
  material?: string
  options?: string[]
  scaffold?: { [key: string]: string }
  hints: string[]
}

interface Module {
  id: string
  topic: string
  skill_level: string
  status: string
  created_at: string
  domain?: string
  exercises?: Exercise[]
}

interface ExerciseMessage {
  id: string
  type: 'hint' | 'feedback'
  content: string
  timestamp: Date
  assessment?: 'strong' | 'developing' | 'needs_support'
  attemptNumber?: number
  modelAnswer?: string
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
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const [activeTab, setActiveTab] = useState<'exercise' | 'editor'>('exercise')
  const [collapsedHints, setCollapsedHints] = useState<Set<string>>(new Set())
  const editorPanelRef = useRef<HTMLDivElement>(null)

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // Track exercise completion and saved responses
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set()) // Tracks truly completed exercises
  const [exerciseResponses, setExerciseResponses] = useState<Map<number, string>>(new Map())
  const [exerciseHints, setExerciseHints] = useState<Map<number, number>>(new Map()) // Track hints used per exercise
  const [exerciseHintMessages, setExerciseHintMessages] = useState<Map<number, ExerciseMessage[]>>(
    new Map()
  ) // Store hint messages per exercise
  const [isInitialLoad, setIsInitialLoad] = useState(true) // Track if we've loaded from localStorage yet

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  // Load persisted state from localStorage on mount
  useEffect(() => {
    if (params.id) {
      const storageKey = `module_${params.id}_progress`
      const saved = localStorage.getItem(storageKey)
      console.log('Loading progress for module', params.id, ':', saved)
      if (saved) {
        try {
          const {
            completedExercises: completed,
            exerciseResponses: responses,
            exerciseHints: hints,
            exerciseHintMessages: hintMessages,
          } = JSON.parse(saved)
          if (completed && Array.isArray(completed) && completed.length > 0) {
            const completedSet = new Set<number>(completed as number[])
            setCompletedExercises(completedSet)
            console.log('Restored completed exercises:', completed)
          }
          if (responses) {
            const responsesMap = new Map(
              Object.entries(responses).map(([k, v]) => [Number(k), v as string])
            )
            setExerciseResponses(responsesMap)
            console.log('Restored exercise responses:', responsesMap)
          }
          if (hints) {
            const hintsMap = new Map(
              Object.entries(hints).map(([k, v]) => [Number(k), v as number])
            )
            setExerciseHints(hintsMap)
            console.log('Restored exercise hints:', hintsMap)
          }
          if (hintMessages) {
            const hintMessagesMap = new Map(
              Object.entries(hintMessages).map(([k, v]) => [Number(k), v as ExerciseMessage[]])
            )
            setExerciseHintMessages(hintMessagesMap)
            console.log('Restored hint messages:', hintMessagesMap)
          }
        } catch (err) {
          console.error('Failed to load saved progress:', err)
        }
      }
      // Mark that we've completed the initial load
      setIsInitialLoad(false)
    }
  }, [params.id])

  // Persist state to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (params.id && !isInitialLoad) {
      const storageKey = `module_${params.id}_progress`
      const dataToSave = {
        completedExercises: Array.from(completedExercises),
        exerciseResponses: Object.fromEntries(exerciseResponses),
        exerciseHints: Object.fromEntries(exerciseHints),
        exerciseHintMessages: Object.fromEntries(exerciseHintMessages),
      }
      console.log('Persisting progress for module', params.id, ':', dataToSave)
      localStorage.setItem(storageKey, JSON.stringify(dataToSave))
    }
  }, [
    params.id,
    completedExercises,
    exerciseResponses,
    exerciseHints,
    exerciseHintMessages,
    isInitialLoad,
  ])

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
        console.log('All exercises completed, showing last exercise:', totalExercises - 1)
      } else {
        setCurrentExerciseIndex(nextExercise)
        console.log('Setting current exercise to next incomplete:', nextExercise)
      }
    }
  }, [module, completedExercises.size]) // Only run when module loads or completedExercises size changes

  // Restore hints and hint messages when current exercise changes
  useEffect(() => {
    const savedHints = exerciseHints.get(currentExerciseIndex) || 0
    setHintsUsed(savedHints)
    console.log('Restored hints for exercise', currentExerciseIndex, ':', savedHints)

    const savedHintMessages = exerciseHintMessages.get(currentExerciseIndex) || []
    // Only update exercise messages if they are currently empty or only contain hints
    // This prevents overwriting feedback messages when advancing to next exercise
    setExerciseMessages((prev) => {
      const hasFeedback = prev.some((msg) => msg.type === 'feedback')
      return hasFeedback ? prev : savedHintMessages
    })
    console.log(
      'Restored hint messages for exercise',
      currentExerciseIndex,
      ':',
      savedHintMessages.length,
      'messages'
    )
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
      setExerciseHints((prev) => {
        const newMap = new Map(prev)
        newMap.set(currentExerciseIndex, response.hint_level)
        console.log(
          'Saving hints used for exercise',
          currentExerciseIndex,
          ':',
          response.hint_level
        )
        return newMap
      })

      // Persist hint messages for this exercise
      setExerciseHintMessages((prev) => {
        const newMap = new Map(prev)
        const currentMessages = newMap.get(currentExerciseIndex) || []
        newMap.set(currentExerciseIndex, [...currentMessages, newMessage])
        console.log('Saving hint message for exercise', currentExerciseIndex)
        return newMap
      })

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
        setExerciseResponses((prev) => {
          const newMap = new Map(prev)
          newMap.set(currentExerciseIndex, submittedAnswer)
          console.log(
            'Saving answer for exercise',
            currentExerciseIndex,
            ':',
            submittedAnswer.substring(0, 50)
          )
          return newMap
        })
      }

      // Auto-advance logic
      if (response.should_advance) {
        if (response.assessment === 'strong') {
          // Auto-advance after showing success message
          setIsAutoAdvancing(true)
          setTimeout(() => {
            advanceToNextExercise()
          }, 2000)
        } else if (response.show_model_answer) {
          // After 3 attempts, show model answer and advance
          setIsAutoAdvancing(true)
          setTimeout(() => {
            advanceToNextExercise()
          }, 3000)
        }
      } else {
        // Increment attempt number for retry
        setCurrentAttemptNumber((prev) => prev + 1)

        // Switch to exercise tab on mobile to show feedback
        if (window.innerWidth < 640) {
          setActiveTab('exercise')
        }
      }
    },
    [currentAttemptNumber, currentExerciseIndex]
  )

  const advanceToNextExercise = () => {
    // Mark current exercise as completed before advancing
    setCompletedExercises((prev) => new Set([...prev, currentExerciseIndex]))

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
    console.log('Restored hints for exercise', targetExercise, ':', savedHints)

    // Restore hint messages for this exercise
    const savedHintMessages = exerciseHintMessages.get(targetExercise) || []
    setExerciseMessages(savedHintMessages)
    console.log(
      'Restored hint messages for exercise',
      targetExercise,
      ':',
      savedHintMessages.length,
      'messages'
    )

    setIsAutoAdvancing(false)
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
        {/* Exercise-specific content */}
        {exercise.type === 'analysis' && exercise.material && (
          <div className="animate-fadeInUp rounded-xl border-2 border-primary-500 bg-white p-6 sm:p-8">
            {/* Exercise Prompt (Instructions) */}
            <div className="mb-6">
              <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900 sm:text-lg">
                <span className="font-semibold">Your Task: </span>
                {exercise.prompt}
              </p>
            </div>

            {/* Material to Analyze */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                Material to Analyze
              </h4>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">
                {exercise.material}
              </div>
            </div>
          </div>
        )}

        {exercise.type === 'comparative' && exercise.options && (
          <div className="animate-fadeInUp rounded-xl border-2 border-primary-500 bg-white p-6 sm:p-8">
            {/* Exercise Prompt (Instructions) */}
            <div className="mb-6">
              <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900 sm:text-lg">
                <span className="font-semibold">Your Task: </span>
                {exercise.prompt}
              </p>
            </div>

            {/* Options to Compare */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                Options to Compare
              </h4>
              <ul className="space-y-3">
                {exercise.options.map((option, idx) => (
                  <li
                    key={idx}
                    className={`animate-slideInRight flex items-start gap-3 rounded-lg border border-cream-200 bg-cream-50 p-3.5 stagger-${Math.min(idx + 1, 5)}`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-xs font-bold text-white shadow-md ring-2 ring-primary-200">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium leading-relaxed text-neutral-900">
                      {option}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {exercise.type === 'framework' && (
          <div className="animate-fadeInUp rounded-xl border-2 border-primary-500 bg-white p-6 sm:p-8">
            {/* Exercise Prompt (Instructions) */}
            <div className="mb-6">
              <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900 sm:text-lg">
                <span className="font-semibold">Your Task: </span>
                {exercise.prompt}
              </p>
            </div>

            {/* Task Materials Section */}
            <div className="space-y-5">
              {exercise.scaffold && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                    Framework Structure
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(exercise.scaffold).map(([key, value], idx) => (
                      <div
                        key={key}
                        className={`animate-slideInRight group/item relative overflow-hidden rounded-lg border-l-4 border-primary-500 bg-cream-50 p-4 stagger-${Math.min(idx + 1, 5)}`}
                      >
                        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-50 text-xs font-bold text-primary-700">
                          {idx + 1}
                        </div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-800">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {key}
                        </div>
                        <div className="pr-10 text-sm leading-relaxed text-neutral-800">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {exercise.material && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                    Reference Material
                  </h4>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">
                    {exercise.material}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
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
                  {module?.exercises && module.exercises.length > 0 && (
                    <div className="flex-shrink-0 bg-gradient-to-b from-cream-100/60 to-cream-200/40 px-5 py-4 sm:px-6 sm:py-4 lg:px-8">
                      {/* Interactive Exercise Dots */}
                      <div
                        className="flex items-center justify-center gap-3"
                        role="navigation"
                        aria-label="Exercise navigation"
                      >
                        {module.exercises.map((exercise, index) => {
                          const isCompleted = completedExercises.has(index)
                          const isCurrent = index === currentExerciseIndex
                          // Unlock if completed, current, or if previous exercise is completed
                          const isPreviousCompleted = index > 0 && completedExercises.has(index - 1)
                          const isUnlocked = isCompleted || isCurrent || isPreviousCompleted

                          return (
                            <button
                              key={`${exercise.id}-${index}`}
                              onClick={() => navigateToExercise(index)}
                              disabled={!isUnlocked}
                              aria-label={`${isUnlocked ? 'Go to' : 'Locked'} exercise ${index + 1}${isCurrent ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
                              aria-current={isCurrent ? 'step' : undefined}
                              className={`group relative flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold text-xs transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-cream-100 ${
                                isCurrent
                                  ? 'border-primary-500 bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg scale-110 ring-2 ring-primary-300 ring-offset-2'
                                  : isCompleted
                                    ? 'border-primary-400 bg-gradient-to-br from-primary-100 to-primary-50 text-primary-700 hover:scale-105 hover:border-primary-500 hover:shadow-md cursor-pointer'
                                    : isUnlocked
                                      ? 'border-neutral-400 bg-gradient-to-br from-neutral-50 to-cream-100 text-neutral-700 hover:scale-105 hover:border-primary-400 hover:shadow-md cursor-pointer'
                                      : 'border-cream-300 bg-cream-200 text-neutral-400 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {isCompleted && !isCurrent ? (
                                // Checkmark for completed exercises
                                <svg
                                  className="h-5 w-5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                // Exercise number
                                <span>{index + 1}</span>
                              )}

                              {/* Tooltip on hover */}
                              {isUnlocked && (
                                <div className="pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
                                  Exercise {index + 1}: {exercise.name}
                                  {isCurrent && <span className="ml-1">(Current)</span>}
                                  {isCompleted && !isCurrent && <span className="ml-1">✓</span>}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900"></div>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
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
                    initialAnswer={(() => {
                      const savedAnswer = exerciseResponses.get(currentExerciseIndex) || ''
                      console.log(
                        'AnswerSubmission initialAnswer for exercise',
                        currentExerciseIndex,
                        ':',
                        savedAnswer.substring(0, 50)
                      )
                      return savedAnswer
                    })()}
                    renderFeedback={() => (
                      <>
                        {exerciseMessages.length > 0 && (
                          <div className="mb-4 space-y-3 sm:mb-6">
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
                              disabled={hintProps.disabled || isAutoAdvancing}
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

                        {/* Submit Button - Right */}
                        <button
                          onClick={submitProps.onClick}
                          disabled={submitProps.disabled || isAutoAdvancing}
                          aria-label={`Submit answer ${submitProps.isSubmitting ? '(submitting...)' : ''}`}
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
                                <span>Submit</span>
                              </>
                            )}
                          </span>
                        </button>
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

                {/* Auto-advance notification */}
                {isAutoAdvancing && (
                  <div
                    className="mb-3 rounded-lg border border-green-300 bg-green-50 p-3 text-center sm:mb-4"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm text-green-800">
                      {currentExerciseIndex < totalExercises - 1
                        ? 'Great job! Moving to next exercise...'
                        : 'Module complete! Returning to dashboard...'}
                    </p>
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
