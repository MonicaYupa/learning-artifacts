'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ProtectedRoute from '@/components/ProtectedRoute'
import HintSystem from '@/components/HintSystem'
import FeedbackDisplay from '@/components/FeedbackDisplay'
import AnswerSubmission from '@/components/AnswerSubmission'
import type { HintResponse, SubmitResponse } from '@/types/session'

interface Exercise {
  id: string
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

interface ChatMessage {
  id: string
  type: 'hint' | 'feedback'
  content: string
  timestamp: Date
  assessment?: 'strong' | 'developing' | 'needs_support'
  attemptNumber?: number
  modelAnswer?: string
}

const MAX_ATTEMPTS = 3

export default function ModulePage() {
  const [module, setModule] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(1)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [sessionId] = useState(`session-${Date.now()}`) // TODO: Get from backend
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const [activeTab, setActiveTab] = useState<'exercise' | 'editor'>('exercise')

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const fetchModule = async () => {
      try {
        // Demo mode - load sample exercises
        if (params.id === 'demo') {
          const { getMockModule } = await import('@/lib/mock-data/exercises')
          setModule(getMockModule())
          setLoading(false)
          return
        }

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

  const currentExercise = module?.exercises?.[currentExerciseIndex]
  const totalExercises = module?.exercises?.length || 0
  const maxHints = currentExercise?.hints?.length || 3

  // Handle hint received
  const handleHintReceived = useCallback((response: HintResponse) => {
    const newMessage: ChatMessage = {
      id: `hint-${Date.now()}`,
      type: 'hint',
      content: response.hint,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, newMessage])
    setHintsUsed(response.hint_level)

    // Switch to exercise tab on mobile to show hint
    if (window.innerWidth < 640) {
      setActiveTab('exercise')
    }
  }, [])

  // Handle submission success
  const handleSubmitSuccess = useCallback(
    (response: SubmitResponse) => {
      const newMessage: ChatMessage = {
        id: `feedback-${Date.now()}`,
        type: 'feedback',
        content: response.feedback,
        timestamp: new Date(),
        assessment: response.assessment,
        attemptNumber: currentAttemptNumber,
        modelAnswer: response.model_answer,
      }

      setChatMessages((prev) => [...prev, newMessage])

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
    [currentAttemptNumber]
  )

  const advanceToNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      // Move to next exercise
      setCurrentExerciseIndex((prev) => prev + 1)
      resetExerciseState()
    } else {
      // Module complete
      router.push('/module')
    }
  }

  const resetExerciseState = () => {
    setCurrentAttemptNumber(1)
    setHintsUsed(0)
    setChatMessages([])
    setIsAutoAdvancing(false)
  }

  const renderExercise = (exercise: Exercise) => {
    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Exercise Prompt */}
        <div className="rounded-lg bg-gradient-to-r from-primary-50 to-primary-100/50 p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary-500 px-2.5 py-0.5 text-xs font-semibold text-white">
              {exercise.type.charAt(0).toUpperCase() + exercise.type.slice(1)}
            </span>
            <span className="text-xs font-medium text-primary-700">Exercise</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {exercise.prompt}
          </p>
        </div>

        {/* Exercise-specific content */}
        {exercise.type === 'analysis' && exercise.material && (
          <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Material to Analyze
            </h4>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {exercise.material}
            </div>
          </div>
        )}

        {exercise.type === 'comparative' && exercise.options && (
          <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
              Options to Compare
            </h4>
            <ul className="space-y-2">
              {exercise.options.map((option, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-800">{option}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {exercise.type === 'framework' && (
          <div className="space-y-4">
            {exercise.scaffold && (
              <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Framework Structure
                </h4>
                <div className="space-y-3">
                  {Object.entries(exercise.scaffold).map(([key, value]) => (
                    <div key={key} className="rounded border-l-4 border-primary-400 bg-white p-3">
                      <div className="mb-1 text-xs font-semibold text-primary-700">{key}</div>
                      <div className="text-sm text-gray-600">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {exercise.material && (
              <div className="rounded-lg border border-cream-300 bg-cream-50 p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Reference Material
                </h4>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                  {exercise.material}
                </div>
              </div>
            )}
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
      <div className="min-h-screen bg-cream-100">
        <header className="border-b border-cream-300 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/module')}
                className="flex items-center space-x-1.5 py-2 text-primary-500 transition-colors hover:text-primary-600 active:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:space-x-2"
              >
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="text-sm font-medium sm:text-base">Back to Chat</span>
              </button>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Learning Module
                </h1>
              </div>
              <div className="w-16 sm:w-32"></div>
            </div>
          </div>
        </header>

        {/* Mobile Tab Navigation */}
        <nav
          className="border-b border-cream-300 bg-white sm:hidden"
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
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Your Response
            </button>
          </div>
        </nav>

        {/* Split-screen layout */}
        <main className="flex h-[calc(100vh-121px)] overflow-hidden sm:h-[calc(100vh-73px)]">
          {/* Left Panel - Chat UI (40%) */}
          <div
            id="exercise-panel"
            role="tabpanel"
            aria-labelledby="exercise-tab"
            className={`flex w-full flex-col overflow-y-auto border-r border-cream-300 bg-white sm:w-2/5 ${activeTab === 'exercise' ? 'block' : 'hidden sm:flex'}`}
          >
            <div className="flex-1 p-4 sm:p-8">
              {module && currentExercise && (
                <div className="space-y-6">
                  {/* Module Header */}
                  <div className="border-b border-cream-200 pb-4 sm:pb-5">
                    <h2 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl">
                      {module.topic}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700 sm:px-3">
                        {module.skill_level.charAt(0).toUpperCase() + module.skill_level.slice(1)}
                      </span>
                      {module.domain && (
                        <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold text-gray-700 sm:px-3">
                          {module.domain}
                        </span>
                      )}
                      {currentAttemptNumber > 1 && (
                        <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 sm:px-3">
                          Attempt {currentAttemptNumber}/{MAX_ATTEMPTS}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current Exercise */}
                  <div className="space-y-4">{renderExercise(currentExercise)}</div>

                  {/* Chat Messages (Hints & Feedback) */}
                  {chatMessages.length > 0 && (
                    <div className="space-y-4 border-t border-cream-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-700">Chat History</h3>
                      {chatMessages.map((message) => (
                        <div key={message.id}>
                          {message.type === 'hint' ? (
                            <div
                              className="rounded-lg border border-primary-300 bg-primary-50/50 p-4"
                              role="region"
                              aria-label="Hint message"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <svg
                                  className="h-5 w-5 text-primary-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                  />
                                </svg>
                                <span className="text-xs font-semibold text-primary-900">Hint</span>
                              </div>
                              <p className="text-sm leading-relaxed text-primary-800">
                                {message.content}
                              </p>
                            </div>
                          ) : (
                            <FeedbackDisplay
                              assessment={message.assessment!}
                              feedback={message.content}
                              attemptNumber={message.attemptNumber!}
                              modelAnswer={message.modelAnswer}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!currentExercise && (
                    <div className="rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30 p-6">
                      <div className="flex items-start space-x-3">
                        <svg
                          className="h-6 w-6 flex-shrink-0 text-primary-500"
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
                          <p className="text-sm font-medium text-primary-900">
                            Loading exercises...
                          </p>
                          <p className="mt-1 text-sm text-primary-700">
                            Your personalized exercises will appear here shortly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Editor (60%) */}
          <div
            id="editor-panel"
            role="tabpanel"
            aria-labelledby="editor-tab"
            className={`flex w-full flex-col bg-cream-50 sm:w-3/5 ${activeTab === 'editor' ? 'block' : 'hidden sm:flex'}`}
          >
            <div className="flex h-full flex-col p-4 sm:p-8">
              {/* Answer Submission */}
              <div className="mb-3 flex-1 sm:mb-4">
                <AnswerSubmission
                  sessionId={sessionId}
                  hintsUsed={hintsUsed}
                  onSubmitSuccess={handleSubmitSuccess}
                />
              </div>

              {/* Hint System */}
              <div className="mb-3 sm:mb-4">
                <HintSystem
                  sessionId={sessionId}
                  currentHintLevel={hintsUsed}
                  maxHints={maxHints}
                  onHintReceived={handleHintReceived}
                />
              </div>

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

              {/* Progress Tracker */}
              {module?.exercises && module.exercises.length > 0 && (
                <div className="rounded-lg border border-cream-300 bg-white p-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-gray-700">Progress</span>
                    <span className="text-gray-600">
                      Exercise {currentExerciseIndex + 1} of {module.exercises.length}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-200"
                    role="progressbar"
                    aria-valuenow={currentExerciseIndex + 1}
                    aria-valuemin={1}
                    aria-valuemax={module.exercises.length}
                    aria-label={`Exercise ${currentExerciseIndex + 1} of ${module.exercises.length}`}
                  >
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-300"
                      style={{
                        width: `${((currentExerciseIndex + 1) / module.exercises.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
